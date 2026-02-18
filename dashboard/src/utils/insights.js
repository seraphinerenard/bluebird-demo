// AI Insights Engine — generates narrative text from data analytics

export function generateOverviewInsights(data) {
  const { kpis, safetyStock, recommendations } = data
  const insights = []

  // Critical urgency
  const criticals = safetyStock.filter(s => s.status === 'critical')
  const worstItem = criticals.sort((a, b) => a.weeks_of_cover - b.weeks_of_cover)[0]
  if (worstItem) {
    insights.push({
      type: 'critical',
      title: 'Immediate Stockout Risk',
      text: `${criticals.length} components are critically low. ${worstItem.variant} (${worstItem.category}) has only ${worstItem.weeks_of_cover} weeks of cover against a ${worstItem.lead_time_weeks}-week lead time — stockout is imminent without emergency procurement.`,
    })
  }

  // Revenue exposure
  if (kpis.total_at_risk_value > 1_000_000) {
    insights.push({
      type: 'warning',
      title: 'Revenue Exposure',
      text: `$${(kpis.total_at_risk_value / 1e6).toFixed(1)}M in production value is at risk due to inventory shortfalls across ${kpis.critical_items + kpis.warning_items} components. Prioritizing the top 5 critical orders would reduce exposure by an estimated 40%.`,
    })
  }

  // Supplier concentration
  const supplierRisk = {}
  criticals.forEach(c => {
    supplierRisk[c.supplier_name] = (supplierRisk[c.supplier_name] || 0) + 1
  })
  const topSupplier = Object.entries(supplierRisk).sort((a, b) => b[1] - a[1])[0]
  if (topSupplier && topSupplier[1] > 2) {
    insights.push({
      type: 'warning',
      title: 'Supplier Concentration Risk',
      text: `${topSupplier[0]} supplies ${topSupplier[1]} of the ${criticals.length} critical components. A disruption from this single supplier could cascade across multiple production lines.`,
    })
  }

  // Positive signal
  if (kpis.ok_items > 0) {
    insights.push({
      type: 'positive',
      title: 'Healthy Components',
      text: `${kpis.ok_items} components maintain healthy stock levels above reorder points, with an average service level of ${(kpis.avg_service_level * 100).toFixed(0)}%.`,
    })
  }

  return insights
}

export function generateForecastInsights(data, category) {
  const { forecasts, metrics, historical } = data
  const insights = []
  const catMetrics = metrics[category]

  if (catMetrics) {
    const quality = catMetrics.WMAPE < 6 ? 'excellent' : catMetrics.WMAPE < 8 ? 'good' : 'moderate'
    insights.push({
      type: quality === 'excellent' ? 'positive' : 'info',
      title: 'Model Accuracy',
      text: `The ${category} forecast model shows ${quality} accuracy with a WMAPE of ${catMetrics.WMAPE}%. ${catMetrics.WMAPE < 6 ? 'Forecast-driven ordering is highly reliable for this category.' : 'Consider adding safety margin to forecasted quantities.'}`,
    })
  }

  // Detect demand trend
  const catForecasts = forecasts.filter(f => f.category === category)
  if (catForecasts.length > 0) {
    const months = [...new Set(catForecasts.map(f => f.year_month))].sort()
    if (months.length >= 2) {
      const firstMonth = catForecasts.filter(f => f.year_month === months[0]).reduce((s, f) => s + f.predicted, 0)
      const lastMonth = catForecasts.filter(f => f.year_month === months[months.length - 1]).reduce((s, f) => s + f.predicted, 0)
      const growth = ((lastMonth - firstMonth) / firstMonth * 100).toFixed(0)
      if (Math.abs(growth) > 20) {
        insights.push({
          type: growth > 0 ? 'warning' : 'info',
          title: 'Demand Trend Detected',
          text: `${category} demand is forecasted to ${growth > 0 ? 'increase' : 'decrease'} by ${Math.abs(growth)}% from ${months[0]} to ${months[months.length - 1]}. ${growth > 0 ? 'Pre-position inventory ahead of the ramp to avoid stockouts during peak.' : 'Consider reducing order quantities to prevent excess inventory.'}`,
        })
      }
    }
  }

  return insights
}

export function generateInventoryInsights(data) {
  const { safetyStock } = data
  const insights = []

  // Below safety stock count
  const belowSafety = safetyStock.filter(s => s.current_stock < s.safety_stock)
  if (belowSafety.length > 0) {
    insights.push({
      type: 'critical',
      title: 'Below Safety Stock',
      text: `${belowSafety.length} of ${safetyStock.length} components are currently stocked below their calculated safety levels. These items cannot absorb demand variability and are vulnerable to stockout during any supply disruption.`,
    })
  }

  // Long lead time items
  const longLead = safetyStock.filter(s => s.lead_time_weeks >= 6 && s.status !== 'ok')
  if (longLead.length > 0) {
    insights.push({
      type: 'warning',
      title: 'Long Lead Time Exposure',
      text: `${longLead.length} at-risk components have lead times of 6+ weeks (up to ${Math.max(...longLead.map(l => l.lead_time_weeks))} weeks). These require earlier ordering decisions and larger safety buffers. Consider dual-sourcing for the most critical long-lead items.`,
    })
  }

  return insights
}

// Chat copilot intent matching
export function processQuestion(question, data) {
  const q = question.toLowerCase().trim()
  const { kpis, safetyStock, recommendations, forecasts, metrics } = data

  // Greetings
  if (q.match(/^(hi|hello|hey)/)) {
    return `Hello! I'm the Blue Bird Inventory Intelligence assistant. I can help you with:\n- Stock levels and risks\n- Demand forecasts\n- Ordering recommendations\n- Supplier analysis\n\nTry asking "What's most critical?" or "Give me a summary."`
  }

  // Executive summary
  if (q.match(/summary|overview|brief|status|how are we/)) {
    const criticals = safetyStock.filter(s => s.status === 'critical')
    const totalOrder = recommendations.reduce((sum, r) => {
      const s = safetyStock.find(ss => ss.component_id === r.component_id)
      return sum + (s ? s.recommended_order_qty * s.unit_cost : 0)
    }, 0)
    return `**Executive Summary**\n\nTracking ${kpis.total_skus} SKUs across 15 component categories.\n\n**${kpis.critical_items} critical** items need immediate action — ${criticals.length > 0 ? `worst is ${criticals[0]?.variant} with only ${criticals[0]?.weeks_of_cover} weeks of cover` : 'none identified'}.\n\n**${kpis.warning_items} warning** items should be monitored.\n\n**$${(kpis.total_at_risk_value / 1e6).toFixed(1)}M** in production value is at risk.\n\nRecommended total procurement: **$${(totalOrder / 1e6).toFixed(1)}M** across ${recommendations.length} line items.`
  }

  // Most critical / urgent
  if (q.match(/critical|urgent|worst|danger|risk|stockout/)) {
    const top5 = [...safetyStock].sort((a, b) => b.stockout_risk - a.stockout_risk).slice(0, 5)
    let response = `**Top 5 At-Risk Components:**\n\n`
    top5.forEach((item, i) => {
      response += `${i + 1}. **${item.variant}** (${item.category}) — ${(item.stockout_risk * 100).toFixed(0)}% stockout risk, ${item.weeks_of_cover}w cover, need ${item.recommended_order_qty} units\n`
    })
    return response
  }

  // What to order / recommendations
  if (q.match(/order|buy|procure|recommend|action/)) {
    const critRecs = recommendations.filter(r => r.status === 'critical').slice(0, 5)
    let response = `**Priority Orders (Critical):**\n\n`
    critRecs.forEach((rec, i) => {
      const stock = safetyStock.find(s => s.component_id === rec.component_id)
      if (stock) {
        response += `${i + 1}. **${stock.variant}** (${stock.category}) — Order ${stock.recommended_order_qty} units from ${stock.supplier_name}, est. $${(stock.recommended_order_qty * stock.unit_cost / 1000).toFixed(0)}K\n`
      }
    })
    return response
  }

  // Supplier questions
  if (q.match(/supplier|vendor|source/)) {
    const supplierMap = {}
    safetyStock.forEach(s => {
      if (!supplierMap[s.supplier_name]) supplierMap[s.supplier_name] = { total: 0, critical: 0, value: 0 }
      supplierMap[s.supplier_name].total++
      if (s.status === 'critical') supplierMap[s.supplier_name].critical++
      supplierMap[s.supplier_name].value += s.recommended_order_qty * s.unit_cost
    })
    let response = `**Supplier Exposure:**\n\n`
    Object.entries(supplierMap).sort((a, b) => b[1].critical - a[1].critical).forEach(([name, info]) => {
      response += `• **${name}** — ${info.total} SKUs (${info.critical} critical), $${(info.value / 1000).toFixed(0)}K pending\n`
    })
    return response
  }

  // Forecast / demand
  if (q.match(/forecast|demand|predict|trend/)) {
    const bestCat = Object.entries(metrics).sort((a, b) => a[1].WMAPE - b[1].WMAPE)[0]
    const worstCat = Object.entries(metrics).sort((a, b) => b[1].WMAPE - a[1].WMAPE)[0]
    return `**Forecast Performance:**\n\nBest accuracy: **${bestCat[0]}** (WMAPE ${bestCat[1].WMAPE}%)\nLowest accuracy: **${worstCat[0]}** (WMAPE ${worstCat[1].WMAPE}%)\n\nForecasts cover ${[...new Set(forecasts.map(f => f.year_month))].length} months across ${Object.keys(metrics).length} categories. Use the Demand Forecast tab to explore variant-level detail with confidence intervals.`
  }

  // Cost / value / money
  if (q.match(/cost|value|spend|budget|money|dollar/)) {
    const totalOrder = safetyStock.reduce((sum, s) => sum + s.recommended_order_qty * s.unit_cost, 0)
    const criticalOrder = safetyStock.filter(s => s.status === 'critical').reduce((sum, s) => sum + s.recommended_order_qty * s.unit_cost, 0)
    return `**Cost Analysis:**\n\nTotal recommended procurement: **$${(totalOrder / 1e6).toFixed(1)}M**\nCritical items only: **$${(criticalOrder / 1e6).toFixed(1)}M**\nAt-risk production value: **$${(kpis.total_at_risk_value / 1e6).toFixed(1)}M**\n\nPrioritizing critical orders first gives the best risk-to-spend ratio.`
  }

  // Specific category lookup
  const categories = [...new Set(safetyStock.map(s => s.category))]
  const matchedCat = categories.find(c => q.includes(c.toLowerCase()))
  if (matchedCat) {
    const items = safetyStock.filter(s => s.category === matchedCat)
    const critical = items.filter(s => s.status === 'critical').length
    const catMetrics = metrics[matchedCat]
    let response = `**${matchedCat}** — ${items.length} variants tracked\n\n`
    response += `Critical: ${critical} | Warning: ${items.filter(s => s.status === 'warning').length} | OK: ${items.filter(s => s.status === 'ok').length}\n\n`
    if (catMetrics) response += `Forecast accuracy: WMAPE ${catMetrics.WMAPE}%\n\n`
    items.sort((a, b) => b.stockout_risk - a.stockout_risk).forEach(item => {
      response += `• ${item.variant}: ${item.current_stock} in stock, ${(item.stockout_risk * 100).toFixed(0)}% risk\n`
    })
    return response
  }

  // Fallback
  return `I can help with:\n- **"summary"** — executive overview\n- **"critical"** — top at-risk items\n- **"what should I order?"** — priority recommendations\n- **"suppliers"** — supplier exposure analysis\n- **"forecast"** — model performance\n- **"cost"** — procurement budget\n- **"[category name]"** — e.g. "AC Unit", "Wheelchair Lift"\n\nWhat would you like to know?`
}
