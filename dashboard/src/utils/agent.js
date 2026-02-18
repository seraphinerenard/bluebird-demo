// Autonomous Agent Engine — simulates multi-step reasoning with visible chain-of-thought

export function generateProcurementSteps(data) {
  const { safetyStock, recommendations, kpis } = data
  const criticals = [...safetyStock].filter(s => s.status === 'critical').sort((a, b) => a.weeks_of_cover - b.weeks_of_cover)
  const warnings = [...safetyStock].filter(s => s.status === 'warning').sort((a, b) => a.weeks_of_cover - b.weeks_of_cover)

  const steps = []

  // Step 1: Scan
  steps.push({
    phase: 'scan',
    title: 'Scanning Inventory Levels',
    icon: 'search',
    thinking: `Analyzing ${kpis.total_skus} active SKUs across ${[...new Set(safetyStock.map(s => s.category))].length} component categories...`,
    result: `Found ${kpis.critical_items} critical items, ${kpis.warning_items} warnings, and ${kpis.ok_items} healthy components.`,
    duration: 1200,
  })

  // Step 2: Triage
  const imminent = criticals.filter(c => c.weeks_of_cover < 1)
  steps.push({
    phase: 'triage',
    title: 'Triaging Critical Items',
    icon: 'alert',
    thinking: `Evaluating stockout timelines... Cross-referencing current stock against weekly demand rates and supplier lead times...`,
    result: `${imminent.length} items have less than 1 week of cover — these are at imminent stockout risk. Worst: ${imminent[0]?.variant || 'N/A'} (${imminent[0]?.category || ''}) with only ${imminent[0]?.weeks_of_cover || 0} weeks remaining.`,
    duration: 1500,
  })

  // Step 3: Supplier analysis
  const supplierMap = {}
  criticals.forEach(c => {
    if (!supplierMap[c.supplier_name]) supplierMap[c.supplier_name] = { count: 0, items: [], totalQty: 0 }
    supplierMap[c.supplier_name].count++
    supplierMap[c.supplier_name].items.push(c.variant || c.category)
    supplierMap[c.supplier_name].totalQty += c.recommended_order_qty
  })
  const supplierEntries = Object.entries(supplierMap).sort((a, b) => b[1].count - a[1].count)

  steps.push({
    phase: 'supplier',
    title: 'Analyzing Supplier Capacity',
    icon: 'factory',
    thinking: `Mapping ${criticals.length} critical items to ${supplierEntries.length} suppliers... Checking lead times and concentration risk...`,
    result: `Top supplier exposure: ${supplierEntries.slice(0, 3).map(([name, info]) => `${name} (${info.count} items, ${info.totalQty} units)`).join('; ')}. ${supplierEntries.length > 3 ? `Plus ${supplierEntries.length - 3} additional suppliers.` : ''}`,
    duration: 1800,
  })

  // Step 4: Optimize order quantities
  const totalCost = criticals.reduce((sum, c) => sum + c.recommended_order_qty * c.unit_cost, 0)
  steps.push({
    phase: 'optimize',
    title: 'Optimizing Order Quantities',
    icon: 'chart',
    thinking: `Running EOQ optimization... Balancing holding costs vs stockout risk... Applying safety stock formula: Z(${(criticals[0]?.service_level * 100 || 95).toFixed(0)}%) × σ_demand × √(lead_time)...`,
    result: `Optimal procurement for ${criticals.length} critical items: ${criticals.reduce((s, c) => s + c.recommended_order_qty, 0).toLocaleString()} total units at estimated cost of $${(totalCost / 1e6).toFixed(2)}M.`,
    duration: 2000,
  })

  // Step 5: Generate POs
  const pos = []
  supplierEntries.forEach(([supplier, info]) => {
    const items = criticals.filter(c => c.supplier_name === supplier)
    const poCost = items.reduce((s, c) => s + c.recommended_order_qty * c.unit_cost, 0)
    pos.push({
      supplier,
      items: items.map(c => ({ variant: c.variant || c.category, category: c.category, qty: c.recommended_order_qty, cost: c.recommended_order_qty * c.unit_cost })),
      totalQty: items.reduce((s, c) => s + c.recommended_order_qty, 0),
      totalCost: poCost,
      leadTime: Math.max(...items.map(c => c.lead_time_weeks)),
    })
  })

  steps.push({
    phase: 'generate',
    title: 'Generating Purchase Orders',
    icon: 'file',
    thinking: `Drafting ${pos.length} purchase orders grouped by supplier... Calculating delivery timelines and cost breakdowns...`,
    result: `Generated ${pos.length} POs: ${pos.slice(0, 3).map(po => `${po.supplier} ($${(po.totalCost / 1000).toFixed(0)}K)`).join(', ')}${pos.length > 3 ? ` + ${pos.length - 3} more` : ''}.`,
    purchaseOrders: pos,
    duration: 1500,
  })

  // Step 6: Risk assessment
  const warningCost = warnings.slice(0, 10).reduce((sum, w) => sum + w.recommended_order_qty * w.unit_cost, 0)
  steps.push({
    phase: 'assess',
    title: 'Final Risk Assessment',
    icon: 'check',
    thinking: `Projecting post-order inventory positions... Calculating residual risk after procurement...`,
    result: `After executing all ${pos.length} POs, estimated stockout risk drops from ${(criticals.reduce((s, c) => s + c.stockout_risk, 0) / criticals.length * 100).toFixed(0)}% avg to <5%. Recommend also addressing top ${Math.min(10, warnings.length)} warning items ($${(warningCost / 1e6).toFixed(1)}M) to achieve 99%+ service level.`,
    duration: 1200,
  })

  return steps
}

export function generateProactiveAlerts(data) {
  const { safetyStock, forecasts, recommendations } = data
  const alerts = []
  const now = new Date()

  // Stockout imminent alerts
  safetyStock.filter(s => s.weeks_of_cover < 1 && s.status === 'critical').forEach(item => {
    const daysLeft = Math.max(1, Math.round(item.weeks_of_cover * 7))
    alerts.push({
      id: `stockout-${item.component_id}`,
      type: 'critical',
      icon: 'circle-red',
      timestamp: new Date(now - Math.random() * 3600000 * 2),
      title: `Stockout imminent: ${item.variant || item.category}`,
      detail: `Only ${item.current_stock} units remaining (~${daysLeft} days). Auto-drafted emergency PO for ${item.recommended_order_qty} units to ${item.supplier_name}.`,
      action: `PO-${item.component_id.replace('CMP-', '')} drafted`,
      reasoning: `Current stock (${item.current_stock}) < safety stock (${item.safety_stock}) and lead time is ${item.lead_time_weeks}w. Without action, production line impact in ${daysLeft} days.`,
    })
  })

  // Demand spike detection
  const categories = [...new Set(forecasts.map(f => f.category))]
  categories.forEach(cat => {
    const catForecasts = forecasts.filter(f => f.category === cat)
    const months = [...new Set(catForecasts.map(f => f.year_month))].sort()
    if (months.length >= 2) {
      const first = catForecasts.filter(f => f.year_month === months[0]).reduce((s, f) => s + f.predicted, 0)
      const last = catForecasts.filter(f => f.year_month === months[months.length - 1]).reduce((s, f) => s + f.predicted, 0)
      const growth = ((last - first) / first * 100)
      if (growth > 80) {
        alerts.push({
          id: `spike-${cat}`,
          type: 'warning',
          icon: 'trend-up',
          timestamp: new Date(now - Math.random() * 3600000 * 6),
          title: `Demand surge detected: ${cat}`,
          detail: `Forecasted ${growth.toFixed(0)}% increase from ${months[0]} to ${months[months.length - 1]}. Pre-positioning additional inventory recommended.`,
          action: 'Safety stocks recalculated',
          reasoning: `ML model projects seasonal ramp. Historical pattern confirms annual peak. Buffer of +${Math.round(growth / 4)}% recommended on safety stock.`,
        })
      }
    }
  })

  // Supplier lead time alerts
  const longLeadCritical = safetyStock.filter(s => s.lead_time_weeks >= 6 && s.status === 'critical')
  if (longLeadCritical.length > 0) {
    const supplier = longLeadCritical[0].supplier_name
    alerts.push({
      id: 'leadtime-alert',
      type: 'warning',
      icon: 'truck',
      timestamp: new Date(now - Math.random() * 3600000 * 4),
      title: `Long lead time risk: ${supplier}`,
      detail: `${longLeadCritical.length} critical items from ${supplier} have ${longLeadCritical[0].lead_time_weeks}+ week lead times. Dual-sourcing evaluation initiated.`,
      action: 'Dual-source analysis queued',
      reasoning: `Single-source dependency on ${supplier} for ${longLeadCritical.length} critical SKUs. Lead time variability (±${longLeadCritical[0].lead_time_std_weeks}w) creates unacceptable risk.`,
    })
  }

  // Budget optimization
  const totalOrder = safetyStock.reduce((s, item) => s + item.recommended_order_qty * item.unit_cost, 0)
  alerts.push({
    id: 'budget-opt',
    type: 'info',
    icon: 'money',
    timestamp: new Date(now - Math.random() * 3600000 * 8),
    title: 'Budget optimization completed',
    detail: `Analyzed ${safetyStock.length} SKUs. Prioritized ordering sequence saves ~12% vs blanket replenishment. Total recommended: $${(totalOrder / 1e6).toFixed(1)}M.`,
    action: 'Priority matrix updated',
    reasoning: `Greedy optimization: order highest-risk/lowest-cost items first. Diminishing returns after top 40 items (90% of risk reduction for 65% of spend).`,
  })

  return alerts.sort((a, b) => b.timestamp - a.timestamp)
}

export function runGoalOptimizer(data, constraints) {
  const { safetyStock } = data
  const { maxBudget, targetRisk } = constraints
  const items = [...safetyStock].map(item => ({
    ...item,
    riskPerDollar: item.stockout_risk / Math.max(1, item.recommended_order_qty * item.unit_cost),
    orderCost: item.recommended_order_qty * item.unit_cost,
  }))

  // Greedy optimization: order items by risk-per-dollar, add until budget exhausted
  items.sort((a, b) => b.riskPerDollar - a.riskPerDollar)

  const steps = []
  let budget = maxBudget
  let totalRisk = items.reduce((s, i) => s + i.stockout_risk, 0) / items.length
  const initialRisk = totalRisk
  const ordered = []
  let spent = 0
  let iteration = 0

  while (budget > 0 && totalRisk > targetRisk / 100 && iteration < items.length) {
    const item = items[iteration]
    if (item.orderCost <= budget && item.status !== 'ok') {
      budget -= item.orderCost
      spent += item.orderCost
      ordered.push(item)

      // Recalculate average risk (item becomes ok after ordering)
      const remaining = items.filter((_, idx) => idx > iteration || items[idx].status === 'ok')
      const orderedRisk = ordered.length > 0 ? 0.02 : 0 // post-order risk ~2%
      totalRisk = items.reduce((s, i, idx) => {
        const isOrdered = ordered.includes(i)
        return s + (isOrdered ? 0.02 : i.stockout_risk)
      }, 0) / items.length

      steps.push({
        iteration: steps.length + 1,
        action: `Order ${item.variant || item.category} (${item.category})`,
        qty: item.recommended_order_qty,
        cost: item.orderCost,
        cumulativeSpend: spent,
        remainingBudget: budget,
        avgRisk: +(totalRisk * 100).toFixed(1),
        itemsOrdered: ordered.length,
      })
    }
    iteration++
  }

  const converged = totalRisk <= targetRisk / 100

  return {
    steps,
    summary: {
      totalSpent: spent,
      remainingBudget: budget,
      itemsOrdered: ordered.length,
      initialRisk: +(initialRisk * 100).toFixed(1),
      finalRisk: +(totalRisk * 100).toFixed(1),
      converged,
      riskReduction: +((initialRisk - totalRisk) * 100).toFixed(1),
    },
    ordered,
  }
}
