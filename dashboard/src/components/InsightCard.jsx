import React, { useState, useEffect } from 'react'
import { Sparkles, AlertCircle, AlertTriangle, TrendingUp, Info } from 'lucide-react'

const TYPE_STYLES = {
  critical: { border: 'border-red-200', bg: 'bg-red-50', icon: AlertCircle, iconColor: 'text-red-500', accent: 'text-red-700' },
  warning: { border: 'border-amber-200', bg: 'bg-amber-50', icon: AlertTriangle, iconColor: 'text-amber-500', accent: 'text-amber-700' },
  positive: { border: 'border-green-200', bg: 'bg-green-50', icon: TrendingUp, iconColor: 'text-green-500', accent: 'text-green-700' },
  info: { border: 'border-blue-200', bg: 'bg-blue-50', icon: Info, iconColor: 'text-blue-500', accent: 'text-blue-700' },
}

function TypewriterText({ text, speed = 12 }) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    setDisplayed('')
    setDone(false)
    let i = 0
    const timer = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(timer)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(timer)
  }, [text, speed])

  return <span>{displayed}{!done && <span className="animate-pulse">|</span>}</span>
}

export default function InsightCard({ insight, index = 0, animated = true }) {
  const style = TYPE_STYLES[insight.type] || TYPE_STYLES.info
  const Icon = style.icon
  const [visible, setVisible] = useState(!animated)

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setVisible(true), index * 400)
      return () => clearTimeout(timer)
    }
  }, [animated, index])

  if (!visible) return null

  return (
    <div className={`border rounded-xl p-4 ${style.border} ${style.bg} transition-all duration-500 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          <Icon size={16} className={style.iconColor} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={10} className="text-bluebird-yellow" />
            <span className={`text-[10px] font-bold uppercase tracking-wider ${style.accent}`}>{insight.title}</span>
          </div>
          <p className="text-xs text-gray-700 leading-relaxed">
            {animated ? <TypewriterText text={insight.text} speed={8} /> : insight.text}
          </p>
        </div>
      </div>
    </div>
  )
}

export function InsightPanel({ insights, animated = true }) {
  if (!insights || insights.length === 0) return null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles size={14} className="text-bluebird-yellow" />
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">AI Insights</span>
      </div>
      {insights.map((insight, i) => (
        <InsightCard key={i} insight={insight} index={i} animated={animated} />
      ))}
    </div>
  )
}
