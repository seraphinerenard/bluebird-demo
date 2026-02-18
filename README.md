# 🚌 Blue Bird Corporation — Inventory Intelligence Platform

**EY Client Demo** — Demand forecasting and safety stock optimisation for Blue Bird's build-to-order school bus manufacturing.

## Quick Start

```bash
# 1. Install Python dependencies
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Run the full pipeline (data → model → safety stock → recommendations)
python run_pipeline.py

# 3. Start the dashboard
cd dashboard && npm install && npm run dev
```

## Architecture

| Module | Description |
|--------|-------------|
| `data/generate_data.py` | Synthetic data generator — 3 years of orders (~27K), 61 component variants, 9 suppliers |
| `models/forecaster.py` | CatBoost demand forecasting with lag/rolling features, WMAPE ~6% |
| `models/safety_stock.py` | Safety stock, reorder points, EOQ, and risk scoring |
| `agent/recommender.py` | AI recommendation engine with prioritised natural language alerts |
| `dashboard/` | React + Tailwind + Recharts executive dashboard |
| `run_pipeline.py` | End-to-end pipeline runner |

## Dashboard Sections

1. **Overview** — KPIs, status distribution, top at-risk components
2. **Demand Forecast** — Historical vs forecasted demand by category with confidence intervals
3. **Inventory Health** — Sortable/filterable table of all components with risk indicators
4. **AI Recommendations** — Prioritised actionable recommendations
5. **Component Detail** — Deep dive with demand chart, stock trajectory, supplier info
