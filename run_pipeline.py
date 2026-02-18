#!/usr/bin/env python3
"""
Blue Bird Corporation — Inventory Optimisation Demo Pipeline
Runs: data generation → forecasting → safety stock → recommendations → dashboard JSON
"""
import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent))

def main():
    print("=" * 60)
    print("🚌 Blue Bird Corporation — Inventory Optimisation Pipeline")
    print("=" * 60)
    
    # Step 1: Generate synthetic data
    print("\n📊 Step 1: Generating synthetic data...")
    from data.generate_data import main as generate_data
    generate_data()
    
    # Step 2: Train demand forecasting model
    print("\n📈 Step 2: Training demand forecasting model...")
    from models.forecaster import run as run_forecaster
    forecast_df, demand_df, metrics = run_forecaster()
    
    # Step 3: Calculate safety stock
    print("\n🛡️ Step 3: Calculating safety stock...")
    from models.safety_stock import run as run_safety_stock
    safety_stock_df = run_safety_stock(forecast_df)
    
    # Step 4: Generate AI recommendations
    print("\n🤖 Step 4: Generating AI recommendations...")
    from agent.recommender import run as run_recommender
    recs = run_recommender(safety_stock_df, forecast_df)
    
    print("\n" + "=" * 60)
    print("✅ Pipeline complete! Dashboard data exported to dashboard/public/data/")
    print("=" * 60)
    
    # Summary
    critical = sum(1 for r in recs if r["status"] == "critical")
    warning = sum(1 for r in recs if r["status"] == "warning")
    print(f"\n📋 Summary:")
    print(f"   Components analysed: {len(recs)}")
    print(f"   🔴 Critical: {critical}")
    print(f"   🟡 Warning: {warning}")
    print(f"   🟢 OK: {len(recs) - critical - warning}")


if __name__ == "__main__":
    main()
