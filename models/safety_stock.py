"""
Safety stock calculator and reorder point recommender.
"""
import pandas as pd
import numpy as np
from scipy import stats
from pathlib import Path
import json

DATA_DIR = Path(__file__).parent.parent / "data" / "generated"
OUTPUT_DIR = Path(__file__).parent.parent / "dashboard" / "public" / "data"


def calculate_safety_stock(
    avg_demand_monthly: float,
    demand_std_monthly: float,
    avg_lead_time_weeks: float,
    lead_time_std_weeks: float,
    service_level: float = 0.95,
) -> dict:
    """Calculate safety stock, reorder point, and EOQ."""
    z = stats.norm.ppf(service_level)
    
    # Convert monthly demand to weekly
    avg_demand_weekly = avg_demand_monthly / 4.33
    demand_std_weekly = demand_std_monthly / np.sqrt(4.33)
    
    # Safety stock formula
    ss = z * np.sqrt(
        avg_lead_time_weeks * demand_std_weekly**2 +
        avg_demand_weekly**2 * lead_time_std_weeks**2
    )
    
    # Reorder point
    rop = avg_demand_weekly * avg_lead_time_weeks + ss
    
    # EOQ (Economic Order Quantity) — assume ordering cost = $50, holding cost = 20% of unit cost/year
    return {
        "safety_stock": round(ss),
        "reorder_point": round(rop),
        "z_score": round(z, 2),
        "weekly_demand": round(avg_demand_weekly, 1),
    }


def run(forecast_df: pd.DataFrame = None, service_level: float = 0.95):
    """Calculate safety stock for all components."""
    print("Loading inventory data...")
    inventory_df = pd.read_csv(DATA_DIR / "inventory_levels.csv")
    
    # If we have forecasts, use them to adjust demand expectations
    if forecast_df is not None:
        forecast_agg = forecast_df.groupby(["category", "variant"])["predicted"].agg(["mean", "std"]).reset_index()
        forecast_agg.columns = ["category", "variant", "forecast_monthly_mean", "forecast_monthly_std"]
    
    records = []
    for _, row in inventory_df.iterrows():
        avg_demand = row["monthly_demand_avg"]
        
        # Use forecast if available
        forecast_mean = avg_demand
        forecast_std = avg_demand * 0.3  # default
        if forecast_df is not None:
            match = forecast_agg[
                (forecast_agg["category"] == row["category"]) &
                (forecast_agg["variant"] == row["variant"])
            ]
            if len(match) > 0:
                forecast_mean = match.iloc[0]["forecast_monthly_mean"]
                forecast_std = max(match.iloc[0]["forecast_monthly_std"], 1)
        
        result = calculate_safety_stock(
            avg_demand_monthly=forecast_mean,
            demand_std_monthly=forecast_std,
            avg_lead_time_weeks=row["lead_time_weeks"],
            lead_time_std_weeks=row["lead_time_std_weeks"],
            service_level=service_level,
        )
        
        # EOQ
        if row["unit_cost"] > 0:
            ordering_cost = 50
            holding_cost = row["unit_cost"] * 0.20 / 52  # weekly
            annual_demand = forecast_mean * 12
            eoq = np.sqrt(2 * annual_demand * ordering_cost / (row["unit_cost"] * 0.20))
            eoq = max(round(eoq), 1)
        else:
            eoq = round(forecast_mean)
        
        # Status
        current = row["current_stock"]
        rop = result["reorder_point"]
        ss = result["safety_stock"]
        
        if current <= ss * 0.5:
            status = "critical"
            risk = min(0.95, 1 - (current / max(rop, 1)))
        elif current <= rop:
            status = "warning"
            risk = min(0.7, 1 - (current / max(rop, 1)))
        else:
            status = "ok"
            risk = max(0.0, 0.1 - (current - rop) / max(rop, 1) * 0.1)
        
        weeks_of_cover = current / max(result["weekly_demand"], 0.1)
        
        records.append({
            "component_id": row["component_id"],
            "category": row["category"],
            "variant": row["variant"],
            "current_stock": current,
            "safety_stock": ss,
            "reorder_point": rop,
            "eoq": eoq,
            "weekly_demand": result["weekly_demand"],
            "lead_time_weeks": row["lead_time_weeks"],
            "lead_time_std_weeks": row["lead_time_std_weeks"],
            "weeks_of_cover": round(weeks_of_cover, 1),
            "unit_cost": row["unit_cost"],
            "supplier_id": row["supplier_id"],
            "supplier_name": row["supplier_name"],
            "status": status,
            "stockout_risk": round(risk, 3),
            "service_level": service_level,
            "recommended_order_qty": max(0, rop - current + eoq) if current < rop else 0,
        })
    
    result_df = pd.DataFrame(records)
    
    # Export
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    result_df.to_json(OUTPUT_DIR / "safety_stock.json", orient="records")
    
    critical = len(result_df[result_df["status"] == "critical"])
    warning = len(result_df[result_df["status"] == "warning"])
    ok = len(result_df[result_df["status"] == "ok"])
    print(f"  → {critical} critical, {warning} warning, {ok} ok")
    print("✅ Safety stock calculation complete!")
    
    return result_df


if __name__ == "__main__":
    run()
