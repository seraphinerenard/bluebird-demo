import React, { useState } from 'react'
import { ChevronDown, ChevronRight, AlertCircle, AlertTriangle } from 'lucide-react'

const URGENCY = {
  critical: {
    label: 'Critical — Immediate Action Required',
    icon: AlertCircle,
    sectionBg: 'bg-red-600',
    cardBorder: 'border-red-200',
    cardBg: 'bg-red-50',
  },
  warning: {
    label: 'Warning — Action Recommended',
    icon: AlertTriangle,
    sectionBg: 'bg-amber-500',
    cardBorder: 'border-amber-200',
    cardBg: 'bg-amber-50',
  },
}

export default function Recommendations({ data }) {
  const { recommendations } = data
  const [expandedId, setExpandedId] = useState(null)

  const critical = recommendations.filter(r => r.status === 'critical').sort((a, b) => a.priority - b.priority)
  const warning = recommendations.filter(r => r.status === 'warning').sort((a, b) => a.priority - b.priority)

  const groups = [
    { items: critical, key: 'critical', ...URGENCY.critical },
    { items: warning, key: 'warning', ...URGENCY.warning },
  ]

  const totalOrderValue = recommendations.reduce((sum, r) => {
    const stock = data.safetyStock.find(s => s.component_id === r.component_id)
    return sum + (stock ? stock.recommended_order_qty * stock.unit_cost : 0)
  }, 0)

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Total Recommendations</p>
          <p className="text-3xl font-extrabold text-bluebird-blue mt-1">{recommendations.length}</p>
          <p className="text-[10px] text-gray-400 mt-1">AI-generated procurement actions</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Critical Actions</p>
          <p className="text-3xl font-extrabold text-red-600 mt-1">{critical.length}</p>
          <p className="text-[10px] text-red-400 mt-1">Requires immediate procurement</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Est. Total Order Value</p>
          <p className="text-3xl font-extrabold text-bluebird-blue mt-1">${(totalOrderValue / 1e6).toFixed(1)}M</p>
          <p className="text-[10px] text-gray-400 mt-1">Across all recommended orders</p>
        </div>
      </div>

      {/* Grouped Recommendations */}
      {groups.map((group) => {
        const Icon = group.icon
        return (
          <div key={group.key} className="space-y-2">
            <div className={`${group.sectionBg} rounded-lg px-4 py-2.5 flex items-center gap-2 text-white`}>
              <Icon size={16} />
              <span className="font-semibold text-sm">{group.label}</span>
              <span className="ml-auto text-xs font-mono opacity-80">{group.items.length} items</span>
            </div>
            <div className="space-y-2">
              {group.items.map((rec) => {
                const stock = data.safetyStock.find(s => s.component_id === rec.component_id)
                const expanded = expandedId === rec.component_id
                return (
                  <div
                    key={rec.component_id}
                    className={`border rounded-xl ${group.cardBorder} ${group.cardBg} overflow-hidden transition-all`}
                  >
                    <div
                      className="px-4 py-3 cursor-pointer flex items-start gap-3 hover:bg-white/30 transition-colors"
                      onClick={() => setExpandedId(expanded ? null : rec.component_id)}
                    >
                      {expanded
                        ? <ChevronDown size={16} className="text-gray-400 mt-0.5 shrink-0" />
                        : <ChevronRight size={16} className="text-gray-400 mt-0.5 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm text-gray-800">{rec.variant || rec.category}</span>
                          <span className="text-[10px] text-gray-400 font-medium">({rec.category})</span>
                          <span className="ml-auto text-[10px] font-mono text-gray-400">{rec.component_id}</span>
                        </div>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">{rec.message}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className="text-[10px] text-gray-400 font-semibold uppercase">Cover</div>
                        <div className={`font-extrabold text-sm ${rec.weeks_of_cover <= 1 ? 'text-red-600' : 'text-amber-600'}`}>
                          {rec.weeks_of_cover}w
                        </div>
                      </div>
                    </div>

                    {expanded && stock && (
                      <div className="px-4 pb-4 pt-1 border-t border-gray-200/40">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                          {[
                            { label: 'Current Stock', value: stock.current_stock.toLocaleString(), unit: 'units' },
                            { label: 'Safety Stock', value: stock.safety_stock.toLocaleString(), unit: 'units' },
                            { label: 'Recommended Order', value: stock.recommended_order_qty.toLocaleString(), unit: 'units', highlight: true },
                            { label: 'Est. Cost', value: `$${(stock.recommended_order_qty * stock.unit_cost).toLocaleString()}`, unit: '' },
                            { label: 'Lead Time', value: `${rec.lead_time_weeks}`, unit: 'weeks' },
                            { label: 'Supplier', value: rec.supplier_name, unit: '' },
                            { label: 'Stockout Risk', value: `${(rec.stockout_risk * 100).toFixed(0)}%`, unit: '', warn: true },
                            { label: 'Weekly Demand', value: stock.weekly_demand, unit: 'per week' },
                          ].map((m, i) => (
                            <div key={i} className="bg-white/70 rounded-lg p-3 border border-white">
                              <div className="text-gray-400 font-semibold text-[10px] uppercase">{m.label}</div>
                              <div className={`font-bold text-base mt-0.5 ${m.highlight ? 'text-bluebird-blue' : m.warn ? 'text-red-600' : 'text-gray-800'}`}>
                                {m.value}
                              </div>
                              {m.unit && <div className="text-[10px] text-gray-400">{m.unit}</div>}
                            </div>
                          ))}
                        </div>
                        {rec.forecast_alert && (
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 leading-relaxed">
                            <span className="font-semibold">Forecast Alert:</span> {rec.forecast_alert}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
