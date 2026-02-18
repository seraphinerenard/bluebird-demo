"""
Synthetic data generator for Blue Bird Corporation demo.
Generates realistic order, component, inventory, and supplier data.
"""
import pandas as pd
import numpy as np
from pathlib import Path
import itertools

RANDOM_SEED = 42
OUTPUT_DIR = Path(__file__).parent / "generated"

BUS_MODELS = {
    "Vision": 0.35,
    "All American": 0.30,
    "Micro Bird": 0.15,
    "T3": 0.10,
    "EV": 0.10,
}

COMPONENT_CATEGORIES = {
    "Floor Colour": {
        "variants": {"Grey Standard": 0.40, "Blue": 0.20, "Black": 0.15, "Green": 0.10, "Brown": 0.10, "Red": 0.05},
        "base_cost": 280,
    },
    "Seat Material": {
        "variants": {"Vinyl Brown": 0.35, "Vinyl Blue": 0.25, "Vinyl Grey": 0.20, "Fabric Blue": 0.10, "Fabric Grey": 0.10},
        "base_cost": 85,
    },
    "Interior Trim": {
        "variants": {"Standard White": 0.45, "Grey": 0.25, "Blue": 0.15, "Black": 0.15},
        "base_cost": 120,
    },
    "Exterior Paint": {
        "variants": {"National School Bus Yellow": 0.60, "White": 0.15, "Activity Bus Blue": 0.10, "Black": 0.08, "Custom": 0.07},
        "base_cost": 950,
    },
    "Wheelchair Lift": {
        "variants": {"None": 0.70, "Type A Hydraulic": 0.15, "Type B Electric": 0.10, "Type C Heavy-Duty": 0.05},
        "base_cost": 4200,
    },
    "AC Unit": {
        "variants": {"None": 0.30, "Roof-Mount Standard": 0.35, "Roof-Mount Heavy": 0.20, "Split System": 0.15},
        "base_cost": 3100,
    },
    "Camera System": {
        "variants": {"Basic 4-Camera": 0.30, "8-Camera HD": 0.35, "12-Camera 360°": 0.20, "AI Vision Pro": 0.15},
        "base_cost": 1800,
    },
    "Lighting Package": {
        "variants": {"Standard Halogen": 0.25, "LED Basic": 0.35, "LED Premium": 0.25, "LED + Emergency Strobe": 0.15},
        "base_cost": 650,
    },
    "Handrails": {
        "variants": {"Standard Steel": 0.50, "Padded Steel": 0.30, "Stainless Steel": 0.20},
        "base_cost": 180,
    },
    "Mirrors": {
        "variants": {"Standard Manual": 0.20, "Heated Manual": 0.30, "Heated Power": 0.35, "Heated Power + Camera": 0.15},
        "base_cost": 420,
    },
    "Stop Arm": {
        "variants": {"Standard 1-Arm": 0.40, "Extended 1-Arm": 0.30, "Dual Arm": 0.30},
        "base_cost": 350,
    },
    "Crossing Gate": {
        "variants": {"None": 0.25, "Standard Front": 0.45, "Extended Front": 0.30},
        "base_cost": 520,
    },
    "Roof Hatch": {
        "variants": {"Standard Emergency": 0.50, "Large Emergency": 0.30, "Dual Hatch": 0.20},
        "base_cost": 290,
    },
    "Storage Compartments": {
        "variants": {"None": 0.20, "Under-Floor Single": 0.35, "Under-Floor Dual": 0.30, "Rear Compartment": 0.15},
        "base_cost": 780,
    },
    "Fuel Type": {
        "variants": {"Diesel": 0.35, "Gasoline": 0.20, "Propane": 0.25, "CNG": 0.10, "Electric": 0.10},
        "base_cost": 0,  # priced into powertrain
    },
}

SUPPLIERS = [
    {"supplier_id": "SUP-001", "name": "American Seating Co.", "categories": ["Seat Material", "Handrails"], "base_lead_weeks": 4, "lead_time_std_weeks": 1.0, "reliability": 0.92},
    {"supplier_id": "SUP-002", "name": "FloorTech Industries", "categories": ["Floor Colour", "Interior Trim"], "base_lead_weeks": 3, "lead_time_std_weeks": 0.8, "reliability": 0.95},
    {"supplier_id": "SUP-003", "name": "BraunAbility", "categories": ["Wheelchair Lift"], "base_lead_weeks": 8, "lead_time_std_weeks": 2.0, "reliability": 0.88},
    {"supplier_id": "SUP-004", "name": "Carrier Commercial", "categories": ["AC Unit"], "base_lead_weeks": 6, "lead_time_std_weeks": 1.5, "reliability": 0.90},
    {"supplier_id": "SUP-005", "name": "REI Bus Safety Systems", "categories": ["Camera System", "Mirrors"], "base_lead_weeks": 5, "lead_time_std_weeks": 1.2, "reliability": 0.93},
    {"supplier_id": "SUP-006", "name": "Truck-Lite Co.", "categories": ["Lighting Package", "Stop Arm", "Crossing Gate"], "base_lead_weeks": 3, "lead_time_std_weeks": 0.7, "reliability": 0.96},
    {"supplier_id": "SUP-007", "name": "PPG Industries", "categories": ["Exterior Paint"], "base_lead_weeks": 2, "lead_time_std_weeks": 0.5, "reliability": 0.97},
    {"supplier_id": "SUP-008", "name": "Specialty Manufacturing", "categories": ["Roof Hatch", "Storage Compartments"], "base_lead_weeks": 5, "lead_time_std_weeks": 1.3, "reliability": 0.91},
    {"supplier_id": "SUP-009", "name": "ROUSH CleanTech", "categories": ["Fuel Type"], "base_lead_weeks": 10, "lead_time_std_weeks": 2.5, "reliability": 0.87},
]


def generate_orders(rng: np.random.Generator, start_year: int = 2023, n_years: int = 3) -> pd.DataFrame:
    """Generate 3 years of order data with seasonal patterns."""
    records = []
    order_id = 1
    
    # Monthly seasonality multipliers (1-indexed month). Peak May-Jul for Aug/Sep delivery.
    seasonality = {
        1: 0.55, 2: 0.60, 3: 0.75, 4: 0.90, 5: 1.50, 6: 1.70,
        7: 1.60, 8: 1.10, 9: 0.80, 10: 0.65, 11: 0.50, 12: 0.45,
    }
    
    annual_target = 9000
    monthly_base = annual_target / 12
    
    for year in range(start_year, start_year + n_years):
        growth = 1 + 0.04 * (year - start_year)  # 4% YoY growth
        for month in range(1, 13):
            n_orders = int(monthly_base * seasonality[month] * growth + rng.normal(0, 15))
            n_orders = max(n_orders, 50)
            
            for _ in range(n_orders):
                bus_model = rng.choice(list(BUS_MODELS.keys()), p=list(BUS_MODELS.values()))
                order_date = pd.Timestamp(year, month, 1) + pd.Timedelta(days=int(rng.integers(0, 28)))
                
                # Select component variants for this order
                components = {}
                for cat, info in COMPONENT_CATEGORIES.items():
                    variants = list(info["variants"].keys())
                    weights = np.array(list(info["variants"].values()))
                    # Slight model-specific bias
                    if bus_model == "EV" and cat == "Fuel Type":
                        weights = np.zeros(len(variants))
                        weights[variants.index("Electric")] = 1.0
                    weights = weights / weights.sum()
                    components[cat] = rng.choice(variants, p=weights)
                
                records.append({
                    "order_id": f"ORD-{order_id:06d}",
                    "order_date": order_date,
                    "bus_model": bus_model,
                    **components,
                })
                order_id += 1
    
    return pd.DataFrame(records)


def generate_components() -> pd.DataFrame:
    """Generate component catalog."""
    records = []
    comp_id = 1
    for cat, info in COMPONENT_CATEGORIES.items():
        for variant, popularity in info["variants"].items():
            cost = info["base_cost"] * (0.8 + 0.4 * popularity) if info["base_cost"] > 0 else 0
            cost = max(cost, 10) if info["base_cost"] > 0 else 0
            records.append({
                "component_id": f"CMP-{comp_id:04d}",
                "category": cat,
                "variant": variant,
                "popularity_weight": popularity,
                "unit_cost": round(cost, 2),
            })
            comp_id += 1
    return pd.DataFrame(records)


def generate_suppliers() -> pd.DataFrame:
    """Generate supplier data."""
    return pd.DataFrame(SUPPLIERS)


def generate_inventory(components_df: pd.DataFrame, orders_df: pd.DataFrame, rng: np.random.Generator) -> pd.DataFrame:
    """Generate current inventory levels based on recent demand patterns."""
    # Calculate recent monthly demand per component
    recent = orders_df[orders_df["order_date"] >= orders_df["order_date"].max() - pd.Timedelta(days=90)]
    
    records = []
    for _, comp in components_df.iterrows():
        cat = comp["category"]
        variant = comp["variant"]
        
        # Count demand from recent orders
        monthly_demand = len(recent[recent[cat] == variant]) / 3  # 3 months
        monthly_demand = max(monthly_demand, 1)
        
        # Find supplier
        supplier = next((s for s in SUPPLIERS if cat in s["categories"]), SUPPLIERS[0])
        lead_weeks = supplier["base_lead_weeks"]
        
        # Current stock: mix of healthy and at-risk
        weekly_demand = monthly_demand / 4.33
        # 25% critical (< 2 weeks), 35% warning (2-6 weeks), 40% healthy (6-14 weeks)
        bucket = rng.random()
        if bucket < 0.25:
            weeks_of_stock = rng.uniform(0.3, 2.0)
        elif bucket < 0.60:
            weeks_of_stock = rng.uniform(2.0, 6.0)
        else:
            weeks_of_stock = rng.uniform(6.0, 14.0)
        current_stock = int(weeks_of_stock * weekly_demand)
        
        records.append({
            "component_id": comp["component_id"],
            "category": cat,
            "variant": variant,
            "current_stock": current_stock,
            "monthly_demand_avg": round(monthly_demand, 1),
            "lead_time_weeks": lead_weeks,
            "lead_time_std_weeks": supplier["lead_time_std_weeks"],
            "unit_cost": comp["unit_cost"],
            "supplier_id": supplier["supplier_id"],
            "supplier_name": supplier["name"],
            "last_restock_date": str(pd.Timestamp("2025-12-01") + pd.Timedelta(days=int(rng.integers(0, 60)))),
        })
    
    return pd.DataFrame(records)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    rng = np.random.default_rng(RANDOM_SEED)
    
    print("Generating orders...")
    orders_df = generate_orders(rng)
    orders_df.to_csv(OUTPUT_DIR / "orders.csv", index=False)
    print(f"  → {len(orders_df):,} orders generated")
    
    print("Generating components...")
    components_df = generate_components()
    components_df.to_csv(OUTPUT_DIR / "components.csv", index=False)
    print(f"  → {len(components_df)} components generated")
    
    print("Generating suppliers...")
    suppliers_df = generate_suppliers()
    suppliers_df.to_csv(OUTPUT_DIR / "suppliers.csv", index=False)
    print(f"  → {len(suppliers_df)} suppliers generated")
    
    print("Generating inventory levels...")
    inventory_df = generate_inventory(components_df, orders_df, rng)
    inventory_df.to_csv(OUTPUT_DIR / "inventory_levels.csv", index=False)
    print(f"  → {len(inventory_df)} inventory records generated")
    
    print("✅ Data generation complete!")


if __name__ == "__main__":
    main()
