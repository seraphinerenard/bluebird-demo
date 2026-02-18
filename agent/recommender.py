"""
AI recommendation engine for Blue Bird inventory management.
Generates natural language recommendations prioritised by risk.
"""
import pandas as pd
import numpy as np
from pathlib import Path
from datetime import datetime, timedelta
import json

OUTPUT_DIR = Path(__file__).parent.parent / "dashboard" / "public" / "data"


def generate_recommendations(safety_stock_df: pd.DataFrame, forecast_df: pd.DataFrame = None) -> list:
    """Generate prioritised natural language recommendations."""
    recommendations = []
    today = datetime(2026, 2, 18)
    
    for _, row in safety_stock_df.iterrows():
        rec = {
            "component_id": row["component_id"],
            "category": row["category"],
            "variant": row["variant"],
            "status": row["status"],
            "stockout_risk": row["stockout_risk"],
            "current_stock": row["current_stock"],
            "safety_stock": row["safety_stock"],
            "reorder_point": row["reorder_point"],
            "weeks_of_cover": row["weeks_of_cover"],
            "lead_time_weeks": row["lead_time_weeks"],
            "supplier_name": row["supplier_name"],
        }
        
        weekly = row["weekly_demand"]
        lead = row["lead_time_weeks"]
        cover = row["weeks_of_cover"]
        
        if row["status"] == "critical":
            if cover < lead:
                stockout_date = today + timedelta(weeks=cover)
                order_deadline = today - timedelta(weeks=(lead - cover))
                rec["message"] = (
                    f"🔴 CRITICAL: {row['variant']} ({row['category']}) — current stock of {row['current_stock']} units "
                    f"covers only {cover:.1f} weeks, but supplier lead time is {lead} weeks. "
                    f"Estimated stockout by {stockout_date.strftime('%b %d')}. "
                    f"Order deadline was {order_deadline.strftime('%b %d')} — IMMEDIATE action required. "
                    f"Recommend ordering {row['recommended_order_qty']} units from {row['supplier_name']} NOW."
                )
            else:
                rec["message"] = (
                    f"🔴 CRITICAL: {row['variant']} ({row['category']}) — stock at {row['current_stock']} units, "
                    f"well below safety stock of {row['safety_stock']}. "
                    f"Recommend ordering {row['recommended_order_qty']} units immediately."
                )
            rec["priority"] = 1
            
        elif row["status"] == "warning":
            order_by = today + timedelta(weeks=max(0, cover - lead))
            rec["message"] = (
                f"🟡 WARNING: {row['variant']} ({row['category']}) — {row['current_stock']} units in stock "
                f"({cover:.1f} weeks coverage). Reorder point is {row['reorder_point']}. "
                f"Place order of {row['recommended_order_qty']} units with {row['supplier_name']} "
                f"by {order_by.strftime('%b %d')} to avoid disruption."
            )
            rec["priority"] = 2
            
        else:
            rec["message"] = (
                f"🟢 OK: {row['variant']} ({row['category']}) — {row['current_stock']} units in stock "
                f"({cover:.1f} weeks coverage). Safety stock: {row['safety_stock']}. No action needed."
            )
            rec["priority"] = 3
        
        # Check for forecast spikes
        if forecast_df is not None:
            comp_forecast = forecast_df[
                (forecast_df["category"] == row["category"]) &
                (forecast_df["variant"] == row["variant"])
            ]
            if len(comp_forecast) > 0 and "predicted" in comp_forecast.columns:
                max_forecast = comp_forecast["predicted"].max()
                avg_forecast = comp_forecast["predicted"].mean()
                if max_forecast > avg_forecast * 1.3:
                    peak_month = comp_forecast.loc[comp_forecast["predicted"].idxmax()]
                    month_str = str(peak_month.get("year_month", "Q3"))
                    spike_pct = round((max_forecast / avg_forecast - 1) * 100)
                    rec["forecast_alert"] = (
                        f"📈 Demand forecasted to spike {spike_pct}% around {month_str}. "
                        f"Plan additional inventory of ~{round(max_forecast - avg_forecast)} units ahead of peak."
                    )
        
        recommendations.append(rec)
    
    # Sort by priority then risk
    recommendations.sort(key=lambda r: (r["priority"], -r["stockout_risk"]))
    return recommendations


def run(safety_stock_df: pd.DataFrame, forecast_df: pd.DataFrame = None):
    """Generate and export recommendations."""
    print("Generating AI recommendations...")
    recs = generate_recommendations(safety_stock_df, forecast_df)
    
    critical = sum(1 for r in recs if r["status"] == "critical")
    warning = sum(1 for r in recs if r["status"] == "warning")
    
    print(f"  → {len(recs)} recommendations ({critical} critical, {warning} warnings)")
    
    # Export
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_DIR / "recommendations.json", "w") as f:
        json.dump(recs, f, indent=2, default=str)
    
    # Summary KPIs
    kpis = {
        "total_skus": len(recs),
        "critical_items": critical,
        "warning_items": warning,
        "ok_items": sum(1 for r in recs if r["status"] == "ok"),
        "avg_service_level": 0.95,
        "total_at_risk_value": round(sum(
            r["current_stock"] * safety_stock_df[safety_stock_df["component_id"] == r["component_id"]]["unit_cost"].values[0]
            for r in recs if r["status"] in ("critical", "warning")
            if len(safety_stock_df[safety_stock_df["component_id"] == r["component_id"]]["unit_cost"].values) > 0
        ), 2),
        "avg_weeks_of_cover": round(np.mean([r["weeks_of_cover"] for r in recs]), 1),
        "generated_at": "2026-02-18T10:37:00",
    }
    
    with open(OUTPUT_DIR / "kpis.json", "w") as f:
        json.dump(kpis, f, indent=2)
    
    print("✅ Recommendations complete!")
    return recs


if __name__ == "__main__":
    from models.safety_stock import run as ss_run
    ss_df = ss_run()
    run(ss_df)
