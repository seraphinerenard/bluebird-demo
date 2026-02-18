import React, { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { AlertTriangle, Package, TrendingUp, Shield, DollarSign, Clock } from 'lucide-react'
import { InsightPanel } from '../components/InsightCard'
import { generateOverviewInsights } from '../utils/insights'

function KPICard({ icon: Icon, label, value, sub, accent = false, warn = false }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow ${
      warn ? 'border-red-200' : accent ? 'border-bluebird-yellow/30' : 'border-gray-100'
    }`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className={`text-2xl font-extrabold mt-1 ${
            warn ? 'text-red-600' : accent ? 'text-bluebird-yellow' : 'text-bluebird-blue'
          }`}>{value}</p>
          {sub && <p className="text-[10px] text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-2 rounded-lg ${warn ? 'bg-red-50' : accent ? 'bg-amber-50' : 'bg-bluebird-grey'}`}>
          <Icon size={18} className={warn ? 'text-red-500' : accent ? 'text-bluebird-yellow' : 'text-bluebird-blue'} />
        </div>
      </div>
    </div>
  )
}

const CUSTOM_TOOLTIP = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="font-medium">{p.name}: {p.value}</p>
      ))}
    </div>
  )
}

export default function Overview({ data, onSelect }) {
  const { kpis, safetyStock } = data
  const insights = useMemo(() => generateOverviewInsights(data), [data])

  const statusData = [
    { name: 'Critical', value: kpis.critical_items, color: '#DC2626' },
    { name: 'Warning', value: kpis.warning_items, color: '#F59E0B' },
    { name: 'Healthy', value: kpis.ok_items, color: '#10B981' },
  ].filter(d => d.value > 0)

  const categoryMap = {}
  safetyStock.forEach(item => {
    if (!categoryMap[item.category]) categoryMap[item.category] = { category: item.category, critical: 0, warning: 0, ok: 0 }
    categoryMap[item.category][item.status]++
  })
  const categoryData = Object.values(categoryMap).sort((a, b) => (b.critical + b.warning) - (a.critical + a.warning))

  const topRisk = [...safetyStock].sort((a, b) => b.stockout_risk - a.stockout_risk).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* AI Insights */}
      <InsightPanel insights={insights} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPICard icon={Package} label="Total SKUs" value={kpis.total_skus} sub="Components tracked" />
        <KPICard icon={AlertTriangle} label="Critical" value={kpis.critical_items} warn sub="Immediate action" />
        <KPICard icon={Shield} label="Warning" value={kpis.warning_items} accent sub="Monitor closely" />
        <KPICard icon={TrendingUp} label="Service Level" value={`${(kpis.avg_service_level * 100).toFixed(0)}%`} sub="Target SLA" />
        <KPICard icon={DollarSign} label="At-Risk Value" value={`$${(kpis.total_at_risk_value / 1e6).toFixed(1)}M`} warn sub="Revenue exposure" />
        <KPICard icon={Clock} label="Avg Coverage" value={`${kpis.avg_weeks_of_cover} wks`} sub="Weeks of stock" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Status Pie */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Inventory Status Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={statusData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                dataKey="value"
                paddingAngle={3}
                label={({ name, value }) => `${name}: ${value}`}
                labelLine={{ stroke: '#9CA3AF', strokeWidth: 1 }}
              >
                {statusData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip content={CUSTOM_TOOLTIP} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Category breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 lg:col-span-2">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Status by Component Category</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={categoryData} layout="vertical" margin={{ left: 10, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="category" type="category" tick={{ fontSize: 10 }} width={110} />
              <Tooltip content={CUSTOM_TOOLTIP} />
              <Bar dataKey="critical" stackId="a" fill="#DC2626" name="Critical" radius={[0, 0, 0, 0]} />
              <Bar dataKey="warning" stackId="a" fill="#F59E0B" name="Warning" />
              <Bar dataKey="ok" stackId="a" fill="#10B981" name="Healthy" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top risk table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Top At-Risk Components</h3>
          <span className="text-[10px] font-medium text-red-500 bg-red-50 px-2 py-0.5 rounded-full">Requires Attention</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Component</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Category</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Stock</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Safety Stock</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Coverage</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Risk</th>
                <th className="py-2 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {topRisk.map((item, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-red-50/50 cursor-pointer transition-colors" onClick={() => onSelect(item)}>
                  <td className="py-2.5 px-3 font-semibold text-gray-800">{item.variant}</td>
                  <td className="py-2.5 px-3 text-gray-500">{item.category}</td>
                  <td className={`py-2.5 px-3 text-right font-mono text-xs ${item.current_stock < item.safety_stock ? 'text-red-600 font-bold' : ''}`}>
                    {item.current_stock.toLocaleString()}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500">{item.safety_stock.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className={`font-mono text-xs font-semibold ${item.weeks_of_cover <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
                      {item.weeks_of_cover}w
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                      {(item.stockout_risk * 100).toFixed(0)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="text-bluebird-blue text-xs font-medium hover:text-bluebird-yellow">View →</span>
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
