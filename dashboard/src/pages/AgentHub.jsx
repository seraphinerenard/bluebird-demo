import React, { useState, useEffect, useRef, useMemo } from 'react'
import { generateProcurementSteps, generateProactiveAlerts, runGoalOptimizer } from '../utils/agent'
import { IconFromId, FontAwesomeIcon, faRobot, faBell, faBullseye, faCircleCheck, faBoxesStacked, faSackDollar, faArrowTrendDown, faTriangleExclamation } from '../utils/icons'

// ─── Autonomous Procurement Agent ───────────────────────────────────────────

function ProcurementAgent({ data }) {
  const [steps, setSteps] = useState([])
  const [currentStep, setCurrentStep] = useState(-1)
  const [phase, setPhase] = useState('idle') // idle | running | done
  const [showThinking, setShowThinking] = useState({})
  const bottomRef = useRef(null)

  const allSteps = useMemo(() => generateProcurementSteps(data), [data])

  const run = () => {
    setSteps([])
    setCurrentStep(-1)
    setPhase('running')
    setShowThinking({})
  }

  useEffect(() => {
    if (phase !== 'running') return
    if (currentStep >= allSteps.length - 1) {
      const t = setTimeout(() => setPhase('done'), 600)
      return () => clearTimeout(t)
    }
    const next = currentStep + 1
    const delay = next === 0 ? 400 : allSteps[next - 1]?.duration || 1200
    const t = setTimeout(() => {
      setSteps(prev => [...prev, allSteps[next]])
      setCurrentStep(next)
      // show thinking first, then reveal result
      setShowThinking(prev => ({ ...prev, [next]: true }))
      setTimeout(() => setShowThinking(prev => ({ ...prev, [next]: false })), allSteps[next].duration * 0.6)
    }, delay)
    return () => clearTimeout(t)
  }, [phase, currentStep, allSteps])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps, showThinking])

  const reset = () => { setPhase('idle'); setSteps([]); setCurrentStep(-1) }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-gray-900">Autonomous Procurement Agent</h3>
          <p className="text-xs text-gray-400 mt-0.5">Multi-step reasoning with visible chain-of-thought</p>
        </div>
        {phase === 'idle' && (
          <button onClick={run} className="px-4 py-2 bg-bluebird-blue text-white text-sm font-semibold rounded-lg hover:bg-bluebird-blue/90 transition-colors shadow-sm">
            Run Agent
          </button>
        )}
        {phase === 'done' && (
          <button onClick={reset} className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors">
            Reset
          </button>
        )}
        {phase === 'running' && (
          <div className="flex items-center gap-2 text-bluebird-blue text-sm font-medium">
            <div className="w-4 h-4 border-2 border-bluebird-blue border-t-transparent rounded-full animate-spin" />
            Processing...
          </div>
        )}
      </div>

      {phase === 'idle' && (
        <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center">
          <div className="mb-3"><FontAwesomeIcon icon={faRobot} className="text-4xl text-bluebird-blue" /></div>
          <p className="text-sm text-gray-500">Click <span className="font-semibold text-bluebird-blue">Run Agent</span> to start the autonomous procurement workflow.</p>
          <p className="text-xs text-gray-400 mt-1">The agent will analyze inventory, triage critical items, optimize orders, and generate POs.</p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="space-y-3">
          {steps.map((step, i) => {
            const isThinking = showThinking[i]
            const isLatest = i === currentStep && phase === 'running'
            return (
              <div key={i} className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all duration-300 ${isLatest ? 'border-bluebird-blue/30 ring-2 ring-bluebird-blue/10' : 'border-gray-100'}`}>
                <div className="px-4 py-3 flex items-center gap-3 bg-gray-50/50">
                  <IconFromId id={step.icon} size="lg" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Step {i + 1}</span>
                      <span className="text-xs text-gray-300">|</span>
                      <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{step.phase}</span>
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mt-0.5">{step.title}</h4>
                  </div>
                  {!isThinking && !isLatest && (
                    <FontAwesomeIcon icon={faCircleCheck} className="text-green-500 text-lg" />
                  )}
                  {(isThinking || isLatest) && (
                    <div className="w-5 h-5 border-2 border-bluebird-blue border-t-transparent rounded-full animate-spin" />
                  )}
                </div>

                <div className="px-4 py-3 space-y-2">
                  {/* Thinking */}
                  <div className="flex gap-2">
                    <span className="text-xs text-gray-400 font-mono shrink-0 mt-0.5">THINK</span>
                    <p className={`text-xs text-gray-500 italic ${isThinking ? 'animate-pulse' : ''}`}>{step.thinking}</p>
                  </div>

                  {/* Result */}
                  {!isThinking && (
                    <div className="flex gap-2">
                      <span className="text-xs text-bluebird-blue font-mono shrink-0 mt-0.5">OUT</span>
                      <p className="text-xs text-gray-700 font-medium">{step.result}</p>
                    </div>
                  )}
                </div>

                {/* Purchase Orders detail */}
                {step.purchaseOrders && !isThinking && (
                  <div className="px-4 pb-3">
                    <div className="bg-bluebird-grey rounded-lg p-3 space-y-2">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Draft Purchase Orders</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {step.purchaseOrders.map((po, j) => (
                          <div key={j} className="bg-white rounded-lg border border-gray-100 p-2.5">
                            <div className="text-xs font-bold text-gray-800 truncate">{po.supplier}</div>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-[10px] text-gray-400">{po.items.length} items</span>
                              <span className="text-[10px] text-gray-400">{po.totalQty.toLocaleString()} units</span>
                              <span className="text-[10px] font-bold text-bluebird-blue">${(po.totalCost / 1000).toFixed(0)}K</span>
                            </div>
                            <div className="text-[10px] text-gray-400 mt-1">Lead: {po.leadTime}w</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {phase === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <FontAwesomeIcon icon={faCircleCheck} className="text-xl text-green-500 mt-0.5" />
          <div>
            <div className="text-sm font-bold text-green-800">Agent Complete</div>
            <p className="text-xs text-green-600 mt-0.5">All {allSteps.length} steps executed successfully. Purchase orders are ready for review and approval.</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Proactive Alert Feed ───────────────────────────────────────────────────

function AlertFeed({ data }) {
  const alerts = useMemo(() => generateProactiveAlerts(data), [data])
  const [expanded, setExpanded] = useState({})

  const TYPE_STYLES = {
    critical: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700' },
    warning: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700' },
    info: { bg: 'bg-blue-50', border: 'border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  }

  const toggle = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Proactive Alert Feed</h3>
        <p className="text-xs text-gray-400 mt-0.5">Autonomously detected anomalies and recommended actions</p>
      </div>

      <div className="space-y-2">
        {alerts.map((alert, i) => {
          const style = TYPE_STYLES[alert.type] || TYPE_STYLES.info
          const isExpanded = expanded[alert.id]
          const timeAgo = getTimeAgo(alert.timestamp)
          return (
            <div
              key={alert.id}
              className={`${style.bg} border ${style.border} rounded-xl overflow-hidden transition-all duration-200 cursor-pointer hover:shadow-sm`}
              onClick={() => toggle(alert.id)}
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="px-4 py-3 flex items-start gap-3">
                <span className="mt-1"><IconFromId id={alert.icon} size="md" /></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${style.badge}`}>{alert.type}</span>
                    <span className="text-[10px] text-gray-400">{timeAgo}</span>
                  </div>
                  <h4 className="text-sm font-bold text-gray-900 mt-1">{alert.title}</h4>
                  <p className="text-xs text-gray-600 mt-0.5">{alert.detail}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-bold text-bluebird-blue bg-bluebird-blue/10 px-2 py-0.5 rounded-full">{alert.action}</span>
                  </div>
                </div>
                <span className={`text-gray-400 text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>&#x25BC;</span>
              </div>

              {isExpanded && (
                <div className="px-4 pb-3 border-t border-gray-200/50 pt-2 ml-9">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Agent Reasoning</div>
                  <p className="text-xs text-gray-600 italic">{alert.reasoning}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getTimeAgo(date) {
  const mins = Math.round((Date.now() - new Date(date)) / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  return `${hrs}h ago`
}

// ─── Goal-Seeking Optimizer ─────────────────────────────────────────────────

function GoalOptimizer({ data }) {
  const [budget, setBudget] = useState(5)
  const [targetRisk, setTargetRisk] = useState(10)
  const [result, setResult] = useState(null)
  const [running, setRunning] = useState(false)

  const optimize = () => {
    setRunning(true)
    setResult(null)
    // simulate processing delay
    setTimeout(() => {
      const r = runGoalOptimizer(data, { maxBudget: budget * 1e6, targetRisk })
      setResult(r)
      setRunning(false)
    }, 1500)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gray-900">Goal-Seeking Optimizer</h3>
        <p className="text-xs text-gray-400 mt-0.5">Set budget and risk constraints — the agent finds the optimal procurement plan</p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Max Budget</label>
            <input
              type="range" min={0.5} max={20} step={0.5} value={budget}
              onChange={e => setBudget(+e.target.value)}
              className="w-full accent-bluebird-blue"
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">$0.5M</span>
              <span className="font-bold text-bluebird-blue text-sm">${budget}M</span>
              <span className="text-gray-400">$20M</span>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Target Avg Risk</label>
            <input
              type="range" min={1} max={50} step={1} value={targetRisk}
              onChange={e => setTargetRisk(+e.target.value)}
              className="w-full accent-bluebird-yellow"
            />
            <div className="flex justify-between text-xs mt-1">
              <span className="text-gray-400">1%</span>
              <span className="font-bold text-bluebird-yellow text-sm">{targetRisk}%</span>
              <span className="text-gray-400">50%</span>
            </div>
          </div>
        </div>
        <button
          onClick={optimize}
          disabled={running}
          className="mt-4 w-full px-4 py-2.5 bg-bluebird-blue text-white text-sm font-semibold rounded-lg hover:bg-bluebird-blue/90 transition-colors shadow-sm disabled:opacity-50"
        >
          {running ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Optimizing...
            </span>
          ) : 'Run Optimizer'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryCard label="Items Ordered" value={result.summary.itemsOrdered} iconEl={<FontAwesomeIcon icon={faBoxesStacked} className="text-lg text-bluebird-blue" />} />
            <SummaryCard label="Total Spent" value={`$${(result.summary.totalSpent / 1e6).toFixed(2)}M`} iconEl={<FontAwesomeIcon icon={faSackDollar} className="text-lg text-bluebird-yellow" />} />
            <SummaryCard label="Risk Reduction" value={`${result.summary.riskReduction}pp`} iconEl={<FontAwesomeIcon icon={faArrowTrendDown} className="text-lg text-green-500" />} accent />
            <SummaryCard
              label="Converged"
              value={result.summary.converged ? 'Yes' : 'No'}
              iconEl={result.summary.converged
                ? <FontAwesomeIcon icon={faCircleCheck} className="text-lg text-green-500" />
                : <FontAwesomeIcon icon={faTriangleExclamation} className="text-lg text-amber-500" />
              }
              warn={!result.summary.converged}
            />
          </div>

          {/* Risk gauge */}
          <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Risk Trajectory</div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-2xl font-extrabold text-red-500">{result.summary.initialRisk}%</div>
                <div className="text-[10px] text-gray-400">Before</div>
              </div>
              <div className="flex-1 relative h-4 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="absolute left-0 top-0 h-full bg-gradient-to-r from-red-500 via-amber-400 to-green-400 rounded-full transition-all duration-1000"
                  style={{ width: `${100 - result.summary.finalRisk}%` }}
                />
                <div
                  className="absolute top-0 h-full w-0.5 bg-bluebird-blue"
                  style={{ left: `${100 - targetRisk}%` }}
                  title="Target"
                />
              </div>
              <div className="text-center">
                <div className={`text-2xl font-extrabold ${result.summary.converged ? 'text-green-500' : 'text-amber-500'}`}>{result.summary.finalRisk}%</div>
                <div className="text-[10px] text-gray-400">After</div>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-gray-400">Remaining budget: ${(result.summary.remainingBudget / 1e6).toFixed(2)}M</span>
              <span className="text-[10px] text-gray-400">Target: {targetRisk}%</span>
            </div>
          </div>

          {/* Iteration table */}
          {result.steps.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Optimization Steps ({result.steps.length} iterations)</div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">#</th>
                      <th className="text-left py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">Action</th>
                      <th className="text-right py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">Qty</th>
                      <th className="text-right py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">Cost</th>
                      <th className="text-right py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">Cumulative</th>
                      <th className="text-right py-2 px-2 font-bold text-gray-400 text-[10px] uppercase">Avg Risk</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.steps.slice(0, 20).map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2 px-2 font-mono text-gray-400">{s.iteration}</td>
                        <td className="py-2 px-2 font-medium text-gray-800 max-w-[200px] truncate">{s.action}</td>
                        <td className="py-2 px-2 text-right font-mono">{s.qty.toLocaleString()}</td>
                        <td className="py-2 px-2 text-right font-mono">${(s.cost / 1000).toFixed(0)}K</td>
                        <td className="py-2 px-2 text-right font-mono text-bluebird-blue">${(s.cumulativeSpend / 1e6).toFixed(2)}M</td>
                        <td className="py-2 px-2 text-right">
                          <span className={`font-mono font-bold ${s.avgRisk < targetRisk ? 'text-green-600' : s.avgRisk < 30 ? 'text-amber-600' : 'text-red-600'}`}>
                            {s.avgRisk}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.steps.length > 20 && (
                  <div className="text-center text-xs text-gray-400 py-2">+ {result.steps.length - 20} more iterations</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function SummaryCard({ label, value, iconEl, accent, warn }) {
  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${warn ? 'border-amber-200' : accent ? 'border-green-200' : 'border-gray-100'}`}>
      <div className="flex items-center gap-2">
        {iconEl}
        <div>
          <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
          <div className={`text-lg font-extrabold ${warn ? 'text-amber-600' : accent ? 'text-green-600' : 'text-bluebird-blue'}`}>{value}</div>
        </div>
      </div>
    </div>
  )
}

// ─── Agent Hub (Main Component) ─────────────────────────────────────────────

const TABS = [
  { id: 'procurement', label: 'Procurement Agent', icon: faRobot },
  { id: 'alerts', label: 'Alert Feed', icon: faBell },
  { id: 'optimizer', label: 'Goal Optimizer', icon: faBullseye },
]

export default function AgentHub({ data }) {
  const [activeTab, setActiveTab] = useState('procurement')

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-1.5 flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
              activeTab === t.id
                ? 'bg-bluebird-blue text-white shadow-sm'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
            }`}
          >
            <FontAwesomeIcon icon={t.icon} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        {activeTab === 'procurement' && <ProcurementAgent data={data} />}
        {activeTab === 'alerts' && <AlertFeed data={data} />}
        {activeTab === 'optimizer' && <GoalOptimizer data={data} />}
      </div>
    </div>
  )
}
