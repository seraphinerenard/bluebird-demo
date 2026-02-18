# Blue Bird Corporation — Inventory Intelligence Platform

**EY Client Demo** — AI-powered demand forecasting, safety stock optimisation, and autonomous procurement for Blue Bird's build-to-order school bus manufacturing.

## Quick Start

```bash
# 1. Install Python dependencies
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# 2. Run the full pipeline (data -> model -> safety stock -> recommendations)
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
| `dashboard/` | React + Tailwind + Recharts + Font Awesome executive dashboard |
| `run_pipeline.py` | End-to-end pipeline runner |

## Dashboard Sections

1. **Overview** — KPIs, status distribution pie chart, category breakdown, top at-risk components
2. **Demand Forecast** — Historical vs AI-forecasted demand by category/variant with confidence intervals and model performance metrics
3. **Inventory Health** — Sortable/filterable table of all 61 components with status badges, risk bars, and search
4. **AI Recommendations** — Prioritised actionable recommendations with expandable detail cards
5. **What-If Simulator** — Adjust demand, lead time, and service level parameters to see recalculated safety stock impacts
6. **Agent Hub** — Three autonomous AI capabilities:
   - **Procurement Agent** — Multi-step reasoning with visible chain-of-thought (scan, triage, supplier analysis, optimise, generate POs, risk assessment)
   - **Proactive Alert Feed** — Auto-detected anomalies for stockout risk, demand spikes, lead time exposure, and budget optimisation
   - **Goal-Seeking Optimizer** — Budget and risk-constrained greedy optimisation with convergence visualisation

## Agentic Features

- **AI Insights Engine** — Auto-generated narrative insights on every page (typewriter-animated)
- **Chat Copilot** — Floating chat assistant that answers questions about inventory, forecasts, risks, suppliers, and costs using live data
- **Autonomous Procurement Agent** — Simulates multi-step reasoning with visible THINK/OUT phases and draft purchase order generation
- **Goal Optimizer** — Greedy knapsack-style algorithm that maximises risk reduction within a budget constraint

## Tech Stack

**Backend Pipeline:** Python, CatBoost, pandas, NumPy

**Dashboard:** Vite 5, React 18, Tailwind CSS 3, Recharts 2, Font Awesome 6, Lucide React

## Data

The pipeline generates synthetic but realistic data covering:

- **61 component variants** across 15 categories (AC Units, Wheelchair Lifts, Seats, Engines, etc.)
- **9 suppliers** with varying lead times (2-10 weeks) and reliability
- **3 years of historical demand** with seasonal patterns
- **6-month forward forecast** with confidence intervals

All data is output as JSON to `dashboard/public/data/` for the frontend to consume.
