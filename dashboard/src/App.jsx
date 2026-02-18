import React, { useState, useEffect } from 'react'
import { LayoutDashboard, TrendingUp, ShieldCheck, Brain, ChevronRight, Sliders, Bot } from 'lucide-react'
import { FontAwesomeIcon, faBus } from './utils/icons'
import Overview from './pages/Overview'
import DemandForecast from './pages/DemandForecast'
import InventoryHealth from './pages/InventoryHealth'
import Recommendations from './pages/Recommendations'
import ComponentDetail from './pages/ComponentDetail'
import ChatCopilot from './components/ChatCopilot'
import WhatIfSimulator from './components/WhatIfSimulator'
import AgentHub from './pages/AgentHub'

const NAV = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'forecast', label: 'Demand Forecast', icon: TrendingUp },
  { id: 'inventory', label: 'Inventory Health', icon: ShieldCheck },
  { id: 'recommendations', label: 'AI Recommendations', icon: Brain },
  { id: 'simulator', label: 'What-If Simulator', icon: Sliders },
  { id: 'agent', label: 'Agent Hub', icon: Bot },
]

export default function App() {
  const [tab, setTab] = useState('overview')
  const [data, setData] = useState(null)
  const [selectedComponent, setSelectedComponent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const base = window.location.origin
    const files = [
      ['kpis', 'kpis.json'],
      ['historical', 'historical_demand.json'],
      ['forecasts', 'forecasts.json'],
      ['safetyStock', 'safety_stock.json'],
      ['recommendations', 'recommendations.json'],
      ['metrics', 'model_metrics.json'],
    ]

    async function loadAll() {
      try {
        const results = {}
        for (const [key, file] of files) {
          const url = base + '/data/' + file
          const res = await fetch(url)
          if (!res.ok) throw new Error(file + ': HTTP ' + res.status)
          results[key] = await res.json()
        }
        setData(results)
      } catch (err) {
        console.error('Data load error:', err)
        setError(String(err))
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-bluebird-blue">
      <div className="text-center animate-pulse">
        <div className="mb-6"><FontAwesomeIcon icon={faBus} className="text-7xl text-bluebird-yellow" /></div>
        <div className="text-white text-xl font-semibold tracking-wide">Loading Blue Bird Intelligence...</div>
        <div className="mt-3 text-blue-200 text-sm">Preparing inventory analytics</div>
      </div>
    </div>
  )

  if (!data) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center max-w-lg p-8 bg-white rounded-xl shadow border">
        <div className="text-red-600 text-xl font-bold mb-2">Failed to load data</div>
        <div className="text-gray-500 text-sm mb-4">Run the pipeline first, or check the error below.</div>
        {error && <pre className="text-left text-xs bg-red-50 text-red-700 p-4 rounded-lg overflow-auto">{error}</pre>}
      </div>
    </div>
  )

  const showDetail = (comp) => {
    setSelectedComponent(comp)
    setTab('detail')
  }

  const goBack = () => {
    setSelectedComponent(null)
    setTab('inventory')
  }

  return (
    <div className="min-h-screen flex bg-bluebird-grey">
      {/* Sidebar */}
      <aside className="w-64 bg-bluebird-blue flex flex-col shrink-0 sticky top-0 h-screen">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FontAwesomeIcon icon={faBus} className="text-3xl text-bluebird-yellow" />
            <div>
              <h1 className="text-base font-bold text-white tracking-tight leading-tight">Blue Bird Corporation</h1>
              <p className="text-[10px] text-blue-300 font-medium mt-0.5 tracking-wide uppercase">Inventory Intelligence</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const active = tab === item.id
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => { setTab(item.id); setSelectedComponent(null) }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  active
                    ? 'bg-bluebird-yellow text-bluebird-blue shadow-md shadow-black/10'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon size={18} className={active ? 'text-bluebird-blue' : 'text-blue-300 group-hover:text-white'} />
                <span className="flex-1 text-left">{item.label}</span>
                {active && <ChevronRight size={14} />}
              </button>
            )
          })}

          {selectedComponent && (
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-bluebird-yellow text-bluebird-blue shadow-md shadow-black/10">
              <ShieldCheck size={18} />
              <span className="flex-1 text-left truncate">{selectedComponent.variant || selectedComponent.category}</span>
              <ChevronRight size={14} />
            </button>
          )}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10">
          <div className="flex items-center gap-2 text-blue-300 text-[10px]">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
            <span>Live Demo Environment</span>
          </div>
          <div className="text-blue-400 text-[10px] mt-1">Powered by EY &middot; Feb 2026</div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10 shadow-sm">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {tab === 'detail' && selectedComponent
                ? (selectedComponent.variant || selectedComponent.category)
                : NAV.find(n => n.id === tab)?.label || 'Overview'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {tab === 'detail' && selectedComponent
                ? `${selectedComponent.category} · ${selectedComponent.component_id}`
                : 'Real-time inventory analytics & AI-powered recommendations'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs font-semibold text-gray-900">
                {data.kpis.total_skus} SKUs Tracked
              </div>
              <div className="text-[10px] text-gray-400">
                {data.kpis.critical_items} critical · {data.kpis.warning_items} warning
              </div>
            </div>
            <div className="w-px h-8 bg-gray-200" />
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full ${data.kpis.critical_items > 15 ? 'bg-red-500' : 'bg-green-500'}`}></div>
              <span className="text-xs font-medium text-gray-600">
                {data.kpis.critical_items > 15 ? 'Attention Needed' : 'System Healthy'}
              </span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 px-8 py-6 overflow-auto">
          {tab === 'overview' && <Overview data={data} onSelect={showDetail} />}
          {tab === 'forecast' && <DemandForecast data={data} />}
          {tab === 'inventory' && <InventoryHealth data={data} onSelect={showDetail} />}
          {tab === 'recommendations' && <Recommendations data={data} />}
          {tab === 'simulator' && <WhatIfSimulator data={data} />}
          {tab === 'agent' && <AgentHub data={data} />}
          {tab === 'detail' && selectedComponent && (
            <ComponentDetail component={selectedComponent} data={data} onBack={goBack} />
          )}
        </main>
      </div>

      {/* Chat Copilot FAB */}
      <ChatCopilot data={data} />
    </div>
  )
}
