import React, { useState, useMemo } from 'react'
import { Search } from 'lucide-react'
import { InsightPanel } from '../components/InsightCard'
import { generateInventoryInsights } from '../utils/insights'

const STATUS_STYLES = {
  critical: { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', ring: 'ring-red-200' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', ring: 'ring-amber-200' },
  ok: { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', ring: 'ring-green-200' },
}

export default function InventoryHealth({ data, onSelect }) {
  const { safetyStock } = data
  const inventoryInsights = useMemo(() => generateInventoryInsights(data), [data])
  const [filter, setFilter] = useState('all')
  const [sortKey, setSortKey] = useState('stockout_risk')
  const [sortDir, setSortDir] = useState(-1)
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    let items = [...safetyStock]
    if (filter !== 'all') items = items.filter(i => i.status === filter)
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(i =>
        i.category.toLowerCase().includes(q) ||
        (i.variant || '').toLowerCase().includes(q) ||
        i.supplier_name.toLowerCase().includes(q) ||
        i.component_id.toLowerCase().includes(q)
      )
    }
    items.sort((a, b) => {
      const av = a[sortKey] ?? 0, bv = b[sortKey] ?? 0
      return typeof av === 'string' ? av.localeCompare(bv) * sortDir : (av - bv) * sortDir
    })
    return items
  }, [safetyStock, filter, sortKey, sortDir, search])

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  const SortHeader = ({ k, children, right }) => (
    <th
      className={`py-3 px-3 cursor-pointer hover:text-bluebird-blue select-none font-semibold text-gray-400 text-[10px] uppercase tracking-wider transition-colors ${right ? 'text-right' : 'text-left'}`}
      onClick={() => toggleSort(k)}
    >
      {children} {sortKey === k ? (sortDir === 1 ? '↑' : '↓') : ''}
    </th>
  )

  const counts = {
    critical: safetyStock.filter(s => s.status === 'critical').length,
    warning: safetyStock.filter(s => s.status === 'warning').length,
    ok: safetyStock.filter(s => s.status === 'ok').length,
  }

  const FILTERS = [
    { id: 'all', label: `All`, count: safetyStock.length, color: 'bg-bluebird-blue' },
    { id: 'critical', label: `Critical`, count: counts.critical, color: 'bg-red-500' },
    { id: 'warning', label: `Warning`, count: counts.warning, color: 'bg-amber-500' },
    { id: 'ok', label: `Healthy`, count: counts.ok, color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-4">
      {/* AI Insights */}
      <InsightPanel insights={inventoryInsights} animated={false} />

      {/* Filter bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-wrap gap-3 items-center">
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.id
                  ? 'bg-bluebird-blue text-white shadow-sm'
                  : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${filter === f.id ? 'bg-white' : f.color}`}></span>
              {f.label}
              <span className={`text-[10px] font-mono ${filter === f.id ? 'text-blue-200' : 'text-gray-400'}`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>
        <div className="ml-auto relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search component, category, or supplier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-sm w-72 focus:ring-2 focus:ring-bluebird-blue focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="py-3 px-3 text-left font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Status</th>
                <SortHeader k="category">Category</SortHeader>
                <SortHeader k="variant">Variant</SortHeader>
                <SortHeader k="current_stock" right>Current</SortHeader>
                <SortHeader k="safety_stock" right>Safety Stock</SortHeader>
                <SortHeader k="reorder_point" right>Reorder Pt</SortHeader>
                <SortHeader k="weeks_of_cover" right>Coverage</SortHeader>
                <SortHeader k="stockout_risk" right>Risk</SortHeader>
                <SortHeader k="weekly_demand" right>Wkly Demand</SortHeader>
                <th className="py-3 px-3 text-left font-semibold text-gray-400 text-[10px] uppercase tracking-wider">Supplier</th>
                <th className="py-3 px-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item, i) => {
                const sc = STATUS_STYLES[item.status]
                return (
                  <tr
                    key={item.component_id}
                    className={`border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors ${i % 2 ? 'bg-gray-50/30' : ''}`}
                    onClick={() => onSelect(item)}
                  >
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${sc.bg} ${sc.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}></span>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-600">{item.category}</td>
                    <td className="py-2.5 px-3 font-semibold text-gray-800">{item.variant || '—'}</td>
                    <td className={`py-2.5 px-3 text-right font-mono text-xs ${item.current_stock < item.safety_stock ? 'text-red-600 font-bold' : ''}`}>
                      {item.current_stock.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500">{item.safety_stock.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-500">{item.reorder_point.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">
                      <span className={`font-mono text-xs font-semibold ${item.weeks_of_cover <= 1 ? 'text-red-600' : item.weeks_of_cover <= 2 ? 'text-amber-600' : 'text-gray-700'}`}>
                        {item.weeks_of_cover}w
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-14 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              item.stockout_risk > 0.8 ? 'bg-red-500' : item.stockout_risk > 0.5 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${item.stockout_risk * 100}%` }}
                          />
                        </div>
                        <span className="font-mono text-[10px] w-8 text-right text-gray-600">{(item.stockout_risk * 100).toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs text-gray-400">{item.weekly_demand}</td>
                    <td className="py-2.5 px-3 text-xs text-gray-400 max-w-[120px] truncate">{item.supplier_name}</td>
                    <td className="py-2.5 px-3">
                      <span className="text-bluebird-blue hover:text-bluebird-yellow text-xs font-semibold">→</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No components match your filters.</div>
        )}
      </div>
    </div>
  )
}
