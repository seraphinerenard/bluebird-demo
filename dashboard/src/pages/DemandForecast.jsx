import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, ComposedChart, Legend } from 'recharts'
import { InsightPanel } from '../components/InsightCard'
import { generateForecastInsights } from '../utils/insights'

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

export default function DemandForecast({ data }) {
  const { historical, forecasts, metrics } = data
  const categories = useMemo(() => [...new Set(historical.map(h => h.category))].sort(), [historical])
  const [selectedCategory, setSelectedCategory] = useState(categories[0])

  const variants = useMemo(() => {
    return [...new Set(historical.filter(h => h.category === selectedCategory).map(h => h.variant))].sort()
  }, [historical, selectedCategory])
  const [selectedVariant, setSelectedVariant] = useState(variants[0])

  React.useEffect(() => { setSelectedVariant(variants[0]) }, [variants])

  const chartData = useMemo(() => {
    const hist = historical.filter(h => h.category === selectedCategory && h.variant === selectedVariant)
    const fore = forecasts.filter(f => f.category === selectedCategory && f.variant === selectedVariant)

    const map = {}
    hist.forEach(h => { map[h.year_month] = { ...map[h.year_month], month: h.year_month, actual: h.demand } })
    fore.forEach(f => { map[f.year_month] = { ...map[f.year_month], month: f.year_month, forecast: f.predicted, ci_lower: f.ci_lower, ci_upper: f.ci_upper } })

    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month))
  }, [historical, forecasts, selectedCategory, selectedVariant])

  const catMetrics = metrics[selectedCategory]
  const forecastInsights = useMemo(() => generateForecastInsights(data, selectedCategory), [data, selectedCategory])

  // Aggregate category-level chart data
  const categoryChartData = useMemo(() => {
    const hist = historical.filter(h => h.category === selectedCategory)
    const fore = forecasts.filter(f => f.category === selectedCategory)

    const monthMap = {}
    hist.forEach(h => {
      if (!monthMap[h.year_month]) monthMap[h.year_month] = { month: h.year_month, actual: 0 }
      monthMap[h.year_month].actual += h.demand
    })
    fore.forEach(f => {
      if (!monthMap[f.year_month]) monthMap[f.year_month] = { month: f.year_month }
      monthMap[f.year_month].forecast = (monthMap[f.year_month].forecast || 0) + f.predicted
    })

    return Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month))
  }, [historical, forecasts, selectedCategory])

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <InsightPanel insights={forecastInsights} key={selectedCategory} />

      {/* Filters + Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Category</label>
            <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-bluebird-blue focus:border-transparent shadow-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Variant</label>
            <select value={selectedVariant || ''} onChange={e => setSelectedVariant(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:ring-2 focus:ring-bluebird-blue focus:border-transparent shadow-sm">
              {variants.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
          {catMetrics && (
            <div className="ml-auto flex gap-3">
              <div className="text-center px-4 py-2 bg-bluebird-grey rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">WMAPE</div>
                <div className="text-xl font-extrabold text-bluebird-blue">{catMetrics.WMAPE}%</div>
              </div>
              <div className="text-center px-4 py-2 bg-bluebird-grey rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">MAE</div>
                <div className="text-xl font-extrabold text-bluebird-blue">{catMetrics.MAE}</div>
              </div>
              <div className="text-center px-4 py-2 bg-bluebird-grey rounded-lg border border-gray-100">
                <div className="text-[10px] text-gray-400 font-semibold uppercase">MAPE</div>
                <div className="text-xl font-extrabold text-bluebird-blue">{catMetrics.MAPE}%</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Variant Detail Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Variant Forecast — {selectedVariant}
        </h3>
        <ResponsiveContainer width="100%" height={380}>
          <ComposedChart data={chartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0055A4" stopOpacity={0.12} />
                <stop offset="95%" stopColor="#0055A4" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => m.slice(2)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={CUSTOM_TOOLTIP} />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
            <Area type="monotone" dataKey="ci_upper" stroke="none" fill="url(#ciGrad)" name="Confidence Band" />
            <Area type="monotone" dataKey="ci_lower" stroke="none" fill="white" name=" " legendType="none" />
            <Line type="monotone" dataKey="actual" stroke="#003366" strokeWidth={2} dot={{ r: 1.5, fill: '#003366' }} activeDot={{ r: 4 }} name="Actual Demand" />
            <Line type="monotone" dataKey="forecast" stroke="#FFB800" strokeWidth={2.5} strokeDasharray="6 3" dot={{ r: 2.5, fill: '#FFB800' }} activeDot={{ r: 5 }} name="AI Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Category Aggregate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">
          Category Total — {selectedCategory}
        </h3>
        <ResponsiveContainer width="100%" height={250}>
          <ComposedChart data={categoryChartData} margin={{ top: 5, right: 30, bottom: 5, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} tickFormatter={m => m.slice(2)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip content={CUSTOM_TOOLTIP} />
            <Legend iconType="line" wrapperStyle={{ fontSize: 11 }} />
            <Line type="monotone" dataKey="actual" stroke="#003366" strokeWidth={2} dot={{ r: 1 }} name="Total Actual" />
            <Line type="monotone" dataKey="forecast" stroke="#FFB800" strokeWidth={2} strokeDasharray="6 3" dot={{ r: 2 }} name="Total Forecast" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Model performance table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Model Performance by Category</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Category</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">WMAPE</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">MAE</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">MAPE</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Quality</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(metrics).sort((a, b) => a[1].WMAPE - b[1].WMAPE).map(([cat, m]) => (
                <tr key={cat} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${cat === selectedCategory ? 'bg-blue-50/50' : ''}`}>
                  <td className="py-2.5 px-3 font-semibold text-gray-800">{cat}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{m.WMAPE}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{m.MAE}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs">{m.MAPE}%</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      m.WMAPE < 6 ? 'bg-green-100 text-green-700' :
                      m.WMAPE < 8 ? 'bg-amber-100 text-amber-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {m.WMAPE < 6 ? 'Excellent' : m.WMAPE < 8 ? 'Good' : 'Fair'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
