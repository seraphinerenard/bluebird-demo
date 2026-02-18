import React, { useState, useMemo } from 'react'
import { Sliders, RotateCcw, Sparkles, TrendingUp, TrendingDown } from 'lucide-react'

// Safety stock formula: Z * σ_demand * √(lead_time)
// Reorder point: (avg_weekly_demand * lead_time) + safety_stock
const Z_SCORES = { 0.90: 1.28, 0.95: 1.65, 0.97: 1.88, 0.99: 2.33 }

function computeMetrics(item, params) {
  const demandMultiplier = params.demandChange / 100
  const adjWeeklyDemand = item.weekly_demand * (1 + demandMultiplier)
  const adjLeadTime = item.lead_time_weeks + params.leadTimeChange
  const zScore = Z_SCORES[params.serviceLevel] || 1.65

  // Estimate demand std dev from weekly demand (approx 25% CV)
  const demandStd = adjWeeklyDemand * 0.25
  const newSafetyStock = Math.ceil(zScore * demandStd * Math.sqrt(Math.max(adjLeadTime, 0.5)))
  const newReorderPoint = Math.ceil(adjWeeklyDemand * Math.max(adjLeadTime, 0.5) + newSafetyStock)
  const newWeeksOfCover = adjWeeklyDemand > 0 ? +(item.current_stock / adjWeeklyDemand).toFixed(1) : 999
  const newOrderQty = Math.max(0, newReorderPoint - item.current_stock)

  const newStatus = newWeeksOfCover <= 1 ? 'critical' : newWeeksOfCover <= adjLeadTime ? 'warning' : 'ok'

  return {
    safety_stock: newSafetyStock,
    reorder_point: newReorderPoint,
    weeks_of_cover: newWeeksOfCover,
    recommended_order_qty: newOrderQty,
    weekly_demand: +adjWeeklyDemand.toFixed(1),
    lead_time_weeks: Math.max(adjLeadTime, 0.5),
    status: newStatus,
    order_cost: newOrderQty * item.unit_cost,
  }
}

const STATUS_BADGE = {
  critical: 'bg-red-100 text-red-700',
  warning: 'bg-amber-100 text-amber-700',
  ok: 'bg-green-100 text-green-700',
}

export default function WhatIfSimulator({ data }) {
  const { safetyStock } = data
  const defaults = { demandChange: 0, leadTimeChange: 0, serviceLevel: 0.95 }
  const [params, setParams] = useState(defaults)
  const isModified = params.demandChange !== 0 || params.leadTimeChange !== 0 || params.serviceLevel !== 0.95

  const results = useMemo(() => {
    return safetyStock.map(item => ({
      ...item,
      sim: computeMetrics(item, params),
    })).sort((a, b) => b.sim.recommended_order_qty * b.unit_cost - a.sim.recommended_order_qty * a.unit_cost)
  }, [safetyStock, params])

  const totals = useMemo(() => {
    const baseline = { critical: 0, warning: 0, ok: 0, totalCost: 0 }
    const simulated = { critical: 0, warning: 0, ok: 0, totalCost: 0 }
    results.forEach(r => {
      baseline[r.status]++
      baseline.totalCost += r.recommended_order_qty * r.unit_cost
      simulated[r.sim.status]++
      simulated.totalCost += r.sim.order_cost
    })
    return { baseline, simulated }
  }, [results])

  const topImpacted = results.filter(r => r.sim.status !== r.status).slice(0, 8)

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sliders size={16} className="text-bluebird-blue" />
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Scenario Parameters</h3>
          </div>
          {isModified && (
            <button onClick={() => setParams(defaults)} className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-bluebird-blue transition-colors">
              <RotateCcw size={10} /> Reset
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Demand Change */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
              <span>Demand Change</span>
              <span className={`font-mono font-bold ${params.demandChange > 0 ? 'text-red-600' : params.demandChange < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {params.demandChange > 0 ? '+' : ''}{params.demandChange}%
              </span>
            </label>
            <input
              type="range" min={-50} max={100} step={5}
              value={params.demandChange}
              onChange={e => setParams(p => ({ ...p, demandChange: +e.target.value }))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-bluebird-blue bg-gray-200"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>-50%</span><span>Baseline</span><span>+100%</span>
            </div>
          </div>

          {/* Lead Time Change */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
              <span>Lead Time Shift</span>
              <span className={`font-mono font-bold ${params.leadTimeChange > 0 ? 'text-red-600' : params.leadTimeChange < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                {params.leadTimeChange > 0 ? '+' : ''}{params.leadTimeChange} weeks
              </span>
            </label>
            <input
              type="range" min={-4} max={8} step={1}
              value={params.leadTimeChange}
              onChange={e => setParams(p => ({ ...p, leadTimeChange: +e.target.value }))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer accent-bluebird-blue bg-gray-200"
            />
            <div className="flex justify-between text-[9px] text-gray-400 mt-1">
              <span>-4w</span><span>Baseline</span><span>+8w</span>
            </div>
          </div>

          {/* Service Level */}
          <div>
            <label className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
              <span>Target Service Level</span>
              <span className="font-mono font-bold text-bluebird-blue">{(params.serviceLevel * 100).toFixed(0)}%</span>
            </label>
            <select
              value={params.serviceLevel}
              onChange={e => setParams(p => ({ ...p, serviceLevel: +e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value={0.90}>90% — Cost-optimized</option>
              <option value={0.95}>95% — Standard (current)</option>
              <option value={0.97}>97% — High availability</option>
              <option value={0.99}>99% — Premium SLA</option>
            </select>
          </div>
        </div>
      </div>

      {/* Impact Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Critical Items</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-red-600">{totals.simulated.critical}</span>
            {totals.simulated.critical !== totals.baseline.critical && (
              <span className={`text-xs font-bold flex items-center gap-0.5 ${totals.simulated.critical > totals.baseline.critical ? 'text-red-500' : 'text-green-500'}`}>
                {totals.simulated.critical > totals.baseline.critical ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                {totals.simulated.critical > totals.baseline.critical ? '+' : ''}{totals.simulated.critical - totals.baseline.critical}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400">was {totals.baseline.critical}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Warning Items</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-amber-500">{totals.simulated.warning}</span>
            {totals.simulated.warning !== totals.baseline.warning && (
              <span className={`text-xs font-bold ${totals.simulated.warning > totals.baseline.warning ? 'text-red-500' : 'text-green-500'}`}>
                {totals.simulated.warning > totals.baseline.warning ? '+' : ''}{totals.simulated.warning - totals.baseline.warning}
              </span>
            )}
          </div>
          <div className="text-[10px] text-gray-400">was {totals.baseline.warning}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Healthy Items</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-green-600">{totals.simulated.ok}</span>
          </div>
          <div className="text-[10px] text-gray-400">was {totals.baseline.ok}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="text-[10px] font-semibold text-gray-400 uppercase">Total Order Cost</div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-2xl font-extrabold text-bluebird-blue">${(totals.simulated.totalCost / 1e6).toFixed(1)}M</span>
          </div>
          <div className={`text-[10px] ${totals.simulated.totalCost > totals.baseline.totalCost ? 'text-red-400' : 'text-green-400'}`}>
            was ${(totals.baseline.totalCost / 1e6).toFixed(1)}M
            ({totals.simulated.totalCost > totals.baseline.totalCost ? '+' : ''}
            {((totals.simulated.totalCost - totals.baseline.totalCost) / totals.baseline.totalCost * 100).toFixed(0)}%)
          </div>
        </div>
      </div>

      {/* AI Insight */}
      {isModified && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Sparkles size={16} className="text-bluebird-yellow shrink-0 mt-0.5" />
          <div className="text-xs text-blue-800 leading-relaxed">
            <span className="font-bold">Scenario Analysis: </span>
            {params.demandChange > 30
              ? `A ${params.demandChange}% demand surge would push ${totals.simulated.critical} items to critical status. Pre-positioning inventory 4-6 weeks ahead of the demand spike is recommended. Total procurement cost increases to $${(totals.simulated.totalCost / 1e6).toFixed(1)}M.`
              : params.leadTimeChange >= 3
              ? `Adding ${params.leadTimeChange} weeks to lead times significantly increases safety stock requirements. ${totals.simulated.critical - totals.baseline.critical > 0 ? `${totals.simulated.critical - totals.baseline.critical} additional items become critical.` : ''} Consider dual-sourcing or expedited shipping for long-lead components.`
              : params.serviceLevel > 0.95
              ? `Raising the service level to ${(params.serviceLevel * 100).toFixed(0)}% increases safety buffers, adding $${(Math.max(0, totals.simulated.totalCost - totals.baseline.totalCost) / 1e6).toFixed(1)}M to procurement costs. The trade-off is lower stockout probability across all SKUs.`
              : `Under this scenario, ${totals.simulated.critical} items require critical attention with a total procurement budget of $${(totals.simulated.totalCost / 1e6).toFixed(1)}M.`
            }
          </div>
        </div>
      )}

      {/* Status Change Table */}
      {topImpacted.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Status Changes ({topImpacted.length} items impacted)</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">Component</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">Baseline</th>
                  <th className="text-center py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">Simulated</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">New Safety Stock</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">New Order Qty</th>
                  <th className="text-right py-2 px-3 font-semibold text-gray-400 text-[10px] uppercase">Cost</th>
                </tr>
              </thead>
              <tbody>
                {topImpacted.map(item => (
                  <tr key={item.component_id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3">
                      <div className="font-semibold text-gray-800">{item.variant || item.category}</div>
                      <div className="text-[10px] text-gray-400">{item.category}</div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[item.status]}`}>{item.status}</span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_BADGE[item.sim.status]}`}>{item.sim.status}</span>
                    </td>
                    <td className="py-2 px-3 text-right font-mono text-xs">{item.sim.safety_stock.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs font-bold text-bluebird-blue">{item.sim.recommended_order_qty.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-mono text-xs">${(item.sim.order_cost / 1000).toFixed(0)}K</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
