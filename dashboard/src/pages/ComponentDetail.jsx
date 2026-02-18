import React, { useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, ComposedChart, Legend } from 'recharts'
import { ArrowLeft } from 'lucide-react'

const STATUS_MAP = {
  critical: {
    badge: 'bg-red-100 text-red-700',
    border: 'border-l-red-500',
    alertBg: 'bg-red-50 border-red-200',
  },
  warning: {
    badge: 'bg-amber-100 text-amber-700',
    border: 'border-l-amber-500',
    alertBg: 'bg-amber-50 border-amber-200',
  },
  ok: {
    badge: 'bg-green-100 text-green-700',
    border: 'border-l-green-500',
    alertBg: 'bg-green-50 border-green-200',
  },
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.filter(p => p.value != null).map((p, i) => (
        <p key={i} style={{ color: p.color || '#666' }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? Math.round(p.value).toLocaleString() : p.value}
        </p>
      ))}
    </div>
  )
}

export default function ComponentDetail({ component, data, onBack }) {
  const { historical, forecasts } = data
  const c = component

  const chartData = useMemo(() => {
    const hist = historical.filter(h => h.category === c.category && h.variant === c.variant)
    const fore = forecasts.filter(f => f.category === c.category && f.variant === c.variant)
    const map = {}
    hist.forEach(h => { map[h.year_month] = { ...map[h.year_month], month: h.year_month, actual: h.demand } })
    fore.forEach(f => { map[f.year_month] = { ...map[f.year_month], month: f.year_month, forecast: f.predicted, ci_lower: f.ci_lower, ci_upper: f.ci_upper } })
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [historical, forecasts, c])

  const styles = STATUS_MAP[c.status] || STATUS_MAP.ok

  const metrics = [
    { label: 'Current Stock', value: c.current_stock.toLocaleString(), sub: 'units' },
    { label: 'Safety Stock', value: c.safety_stock.toLocaleString(), sub: 'units' },
    { label: 'Reorder Point', value: c.reorder_point.toLocaleString(), sub: 'units' },
    { label: 'EOQ', value: c.eoq.toLocaleString(), sub: 'economic order qty' },
    { label: 'Weekly Demand', value: c.weekly_demand.toFixed(0), sub: 'units/week' },
    { label: 'Stockout Risk', value: `${(c.stockout_risk * 100).toFixed(0)}%`, sub: c.stockout_risk > 0.7 ? 'HIGH RISK' : c.stockout_risk > 0.4 ? 'Moderate' : 'Low', warn: c.stockout_risk > 0.7 },
    { label: 'Weeks of Cover', value: `${c.weeks_of_cover}w`, sub: `Lead time: ${c.lead_time_weeks}w` },
    { label: 'Unit Cost', value: `$${c.unit_cost.toFixed(0)}`, sub: 'per unit' },
    { label: 'Service Level', value: `${(c.service_level * 100).toFixed(0)}%`, sub: 'target SLA' },
    { label: 'Recommended Order', value: c.recommended_order_qty.toLocaleString(), sub: `$${((c.recommended_order_qty * c.unit_cost) / 1000).toFixed(0)}K total`, highlight: true },
    { label: 'Lead Time', value: `${c.lead_time_weeks}w`, sub: `variability: ±${c.lead_time_std_weeks}w` },
    { label: 'Supplier', value: c.supplier_id, sub: c.supplier_name },
  ]

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 border-l-4 ${styles.border}`}>
        <div className="flex items-start justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-bluebird-blue mb-2 transition-colors"
            >
              <ArrowLeft size={12} /> Back to Inventory
            </button>
            <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold mb-1">{c.component_id} · {c.category}</p>
            <h2 className="text-2xl font-extrabold text-gray-900">{c.variant}</h2>
            <p className="text-sm text-gray-400 mt-1">Supplier: {c.supplier_name}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${styles.badge}`}>
            {c.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
            <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{m.label}</div>
            <div className={`text-lg font-extrabold mt-1 ${
              m.warn ? 'text-red-600' : m.highlight ? 'text-bluebird-blue' : 'text-gray-800'
            }`}>{m.value}</div>
            {m.sub && <div className={`text-[10px] mt-0.5 ${m.warn ? 'text-red-400 font-semibold' : 'text-gray-400'}`}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Stock gauge */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Stock Level Gauge</h3>
        <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
          {/* Reorder point marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-500 z-10"
            style={{ left: `${Math.min((c.reorder_point / (c.reorder_point * 1.5)) * 100, 100)}%` }}
          />
          {/* Safety stock marker */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
            style={{ left: `${Math.min((c.safety_stock / (c.reorder_point * 1.5)) * 100, 100)}%` }}
          />
          {/* Current stock fill */}
          <div
            className={`h-full rounded-full transition-all ${
              c.current_stock < c.safety_stock ? 'bg-red-500' :
              c.current_stock < c.reorder_point ? 'bg-amber-500' : 'bg-green-500'
            }`}
            style={{ width: `${Math.min((c.current_stock / (c.reorder_point * 1.5)) * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-gray-400">
          <span>0</span>
          <span className="text-red-500 font-semibold">Safety: {c.safety_stock}</span>
          <span className="text-amber-500 font-semibold">Reorder: {c.reorder_point}</span>
          <span>Current: <span className="font-bold text-gray-700">{c.current_stock}</span></span>
        </div>
      </div>

      {/* Demand chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Demand History & AI Forecast</h3>
        <ResponsiveContainer width="100%" height={350}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="ciBand" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0055A4" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#0055A4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => m.slice(2)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={CUSTOM_TOOLTIP} />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <ReferenceLine y={c.safety_stock} stroke="#DC2626" strokeDasharray="4 4" label={{ value: `Safety: ${c.safety_stock}`, position: 'insideTopRight', fontSize: 9, fill: '#DC2626' }} />
            <ReferenceLine y={c.reorder_point} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: `Reorder: ${c.reorder_point}`, position: 'insideTopRight', fontSize: 9, fill: '#F59E0B' }} />
            <Area type="monotone" dataKey="ci_upper" stroke="none" fill="url(#ciBand)" name="Confidence Band" />
            <Area type="monotone" dataKey="ci_lower" stroke="none" fill="white" name=" " legendType="none" />
            <Line type="monotone" dataKey="actual" stroke="#003366" strokeWidth={2} dot={{ r: 1.5, fill: '#003366' }} activeDot={{ r: 4 }} name="Actual Demand" />
            <Line type="monotone" dataKey="forecast" stroke="#FFB800" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 2.5, fill: '#FFB800' }} activeDot={{ r: 5 }} name="AI Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Recommendation if available */}
      {data.recommendations && (() => {
        const rec = data.recommendations.find(r => r.component_id === c.component_id)
        if (!rec) return null
        return (
          <div className={`border rounded-xl p-5 ${styles.alertBg}`}>
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">AI Recommendation</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{rec.message}</p>
            {rec.forecast_alert && (
              <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
                <span className="font-semibold">Forecast Alert:</span> {rec.forecast_alert}
              </div>
            )}
          </div>
        )
      })()}
    </div>
  )
}
