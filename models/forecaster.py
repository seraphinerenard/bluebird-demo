"""
CatBoost demand forecasting model for Blue Bird component variants.
"""
import pandas as pd
import numpy as np
from catboost import CatBoostRegressor, Pool
from sklearn.metrics import mean_absolute_error
from pathlib import Path
import json
import warnings
warnings.filterwarnings("ignore")

DATA_DIR = Path(__file__).parent.parent / "data" / "generated"
OUTPUT_DIR = Path(__file__).parent.parent / "dashboard" / "public" / "data"


def build_monthly_demand(orders_df: pd.DataFrame) -> pd.DataFrame:
    """Pivot orders into monthly demand per component variant."""
    orders_df["order_date"] = pd.to_datetime(orders_df["order_date"])
    orders_df["year_month"] = orders_df["order_date"].dt.to_period("M")
    
    component_cols = [c for c in orders_df.columns if c not in ["order_id", "order_date", "bus_model", "year_month"]]
    
    records = []
    for col in component_cols:
        monthly = orders_df.groupby(["year_month", col]).size().reset_index(name="demand")
        monthly.rename(columns={col: "variant"}, inplace=True)
        monthly["category"] = col
        records.append(monthly)
    
    demand = pd.concat(records, ignore_index=True)
    demand["year_month"] = demand["year_month"].dt.to_timestamp()
    demand["year"] = demand["year_month"].dt.year
    demand["month"] = demand["year_month"].dt.month
    demand["quarter"] = demand["year_month"].dt.quarter
    return demand.sort_values(["category", "variant", "year_month"]).reset_index(drop=True)


def add_features(df: pd.DataFrame) -> pd.DataFrame:
    """Add lag, rolling, and growth features."""
    df = df.copy()
    group = df.groupby(["category", "variant"])["demand"]
    
    for lag in [1, 3, 6, 12]:
        df[f"lag_{lag}"] = group.shift(lag)
    
    df["rolling_mean_3"] = group.transform(lambda x: x.shift(1).rolling(3, min_periods=1).mean())
    df["rolling_std_3"] = group.transform(lambda x: x.shift(1).rolling(3, min_periods=1).std())
    df["rolling_mean_6"] = group.transform(lambda x: x.shift(1).rolling(6, min_periods=1).mean())
    df["yoy_growth"] = (df["demand"] - df["lag_12"]) / df["lag_12"].replace(0, np.nan)
    
    # Bus model mix features (from orders)
    df["month_sin"] = np.sin(2 * np.pi * df["month"] / 12)
    df["month_cos"] = np.cos(2 * np.pi * df["month"] / 12)
    
    return df


def train_and_forecast(demand_df: pd.DataFrame):
    """Train CatBoost model and generate forecasts."""
    demand_df = add_features(demand_df)
    demand_df = demand_df.dropna(subset=["lag_1"])  # Drop rows without lag features
    
    cat_features = ["category", "variant"]
    num_features = ["month", "quarter", "lag_1", "lag_3", "lag_6", "lag_12",
                    "rolling_mean_3", "rolling_std_3", "rolling_mean_6",
                    "month_sin", "month_cos"]
    features = cat_features + num_features
    
    # Fill NaN in numeric features
    for col in num_features:
        demand_df[col] = demand_df[col].fillna(0)
    
    # Train/test split: last 6 months for test
    cutoff = demand_df["year_month"].max() - pd.DateOffset(months=6)
    train = demand_df[demand_df["year_month"] <= cutoff]
    test = demand_df[demand_df["year_month"] > cutoff]
    
    print(f"  Train: {len(train):,} rows | Test: {len(test):,} rows")
    
    model = CatBoostRegressor(
        iterations=500,
        learning_rate=0.05,
        depth=6,
        l2_leaf_reg=3,
        random_seed=42,
        verbose=0,
        cat_features=[0, 1],
    )
    
    model.fit(train[features], train["demand"])
    
    # Evaluate
    test_pred = model.predict(test[features])
    test = test.copy()
    test["predicted"] = np.maximum(test_pred, 0)
    
    # Metrics by category
    metrics = {}
    for cat in test["category"].unique():
        mask = test["category"] == cat
        actual = test.loc[mask, "demand"]
        pred = test.loc[mask, "predicted"]
        mae = mean_absolute_error(actual, pred)
        mape = np.mean(np.abs((actual - pred) / actual.replace(0, np.nan)).dropna()) * 100
        wmape = np.sum(np.abs(actual - pred)) / np.sum(actual) * 100 if actual.sum() > 0 else 0
        metrics[cat] = {"MAE": round(mae, 1), "MAPE": round(mape, 1), "WMAPE": round(wmape, 1)}
    
    print("  Evaluation metrics (WMAPE by category):")
    for cat, m in sorted(metrics.items(), key=lambda x: x[1]["WMAPE"]):
        print(f"    {cat}: WMAPE={m['WMAPE']}%, MAE={m['MAE']}")
    
    # Generate future forecasts (next 6 months)
    last_date = demand_df["year_month"].max()
    combos = demand_df[["category", "variant"]].drop_duplicates()
    
    future_records = []
    # Use last known state per combo for rolling forecast
    last_states = {}
    for _, row in demand_df.sort_values("year_month").groupby(["category", "variant"]).last().iterrows():
        last_states[row.name] = row
    
    forecast_df = demand_df.copy()
    
    for i in range(1, 7):
        future_date = last_date + pd.DateOffset(months=i)
        for _, combo in combos.iterrows():
            cat, var = combo["category"], combo["variant"]
            hist = forecast_df[(forecast_df["category"] == cat) & (forecast_df["variant"] == var)].sort_values("year_month")
            
            row = {
                "category": cat,
                "variant": var,
                "year_month": future_date,
                "year": future_date.year,
                "month": future_date.month,
                "quarter": (future_date.month - 1) // 3 + 1,
                "month_sin": np.sin(2 * np.pi * future_date.month / 12),
                "month_cos": np.cos(2 * np.pi * future_date.month / 12),
            }
            
            demands = hist["demand"].tolist()
            for lag in [1, 3, 6, 12]:
                row[f"lag_{lag}"] = demands[-lag] if len(demands) >= lag else 0
            
            recent = demands[-3:] if len(demands) >= 3 else demands
            row["rolling_mean_3"] = np.mean(recent) if recent else 0
            row["rolling_std_3"] = np.std(recent) if len(recent) > 1 else 0
            recent6 = demands[-6:] if len(demands) >= 6 else demands
            row["rolling_mean_6"] = np.mean(recent6) if recent6 else 0
            
            pred = max(0, model.predict(pd.DataFrame([row])[features])[0])
            row["demand"] = round(pred)
            row["predicted"] = round(pred)
            
            future_records.append(row)
            forecast_df = pd.concat([forecast_df, pd.DataFrame([row])], ignore_index=True)
    
    future_df = pd.DataFrame(future_records)
    
    return model, test, future_df, metrics, demand_df


def run():
    """Main entry point."""
    print("Loading order data...")
    orders_df = pd.read_csv(DATA_DIR / "orders.csv")
    
    print("Building monthly demand...")
    demand_df = build_monthly_demand(orders_df)
    print(f"  → {len(demand_df):,} demand records")
    
    print("Training CatBoost model...")
    model, test_df, future_df, metrics, full_demand = train_and_forecast(demand_df)
    
    # Export for dashboard
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    # Historical demand
    hist_export = full_demand[["category", "variant", "year_month", "demand"]].copy()
    hist_export["year_month"] = hist_export["year_month"].dt.strftime("%Y-%m")
    hist_export.to_json(OUTPUT_DIR / "historical_demand.json", orient="records")
    
    # Forecasts with confidence intervals
    future_export = future_df[["category", "variant", "year_month", "predicted"]].copy()
    future_export["year_month"] = future_export["year_month"].dt.strftime("%Y-%m")
    # Add simple confidence intervals
    future_export["ci_lower"] = (future_export["predicted"] * 0.80).round(0)
    future_export["ci_upper"] = (future_export["predicted"] * 1.25).round(0)
    future_export.to_json(OUTPUT_DIR / "forecasts.json", orient="records")
    
    # Metrics
    with open(OUTPUT_DIR / "model_metrics.json", "w") as f:
        json.dump(metrics, f, indent=2)
    
    print("✅ Forecasting complete!")
    return future_df, full_demand, metrics


if __name__ == "__main__":
    run()
