import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faBus,
  faMagnifyingGlass,
  faTriangleExclamation,
  faIndustry,
  faChartBar,
  faFileLines,
  faCircleCheck,
  faCircle,
  faArrowTrendUp,
  faArrowTrendDown,
  faTruck,
  faSackDollar,
  faBoxesStacked,
  faRobot,
  faBell,
  faBullseye,
  faHand,
} from '@fortawesome/free-solid-svg-icons'

// Maps string icon IDs (used in agent.js/insights.js data) to FA icon objects
const ICON_MAP = {
  'search': faMagnifyingGlass,
  'alert': faTriangleExclamation,
  'factory': faIndustry,
  'chart': faChartBar,
  'file': faFileLines,
  'check': faCircleCheck,
  'circle-red': faCircle,
  'circle-amber': faCircle,
  'circle-green': faCircle,
  'trend-up': faArrowTrendUp,
  'trend-down': faArrowTrendDown,
  'truck': faTruck,
  'money': faSackDollar,
  'box': faBoxesStacked,
  'warning': faTriangleExclamation,
  'robot': faRobot,
  'bell': faBell,
  'target': faBullseye,
  'hand': faHand,
  'bus': faBus,
}

// Color overrides for circle icons
const COLOR_MAP = {
  'circle-red': 'text-red-500',
  'circle-amber': 'text-amber-500',
  'circle-green': 'text-green-500',
  'alert': 'text-red-500',
  'warning': 'text-amber-500',
  'check': 'text-green-500',
  'money': 'text-bluebird-yellow',
  'trend-up': 'text-amber-500',
  'trend-down': 'text-green-500',
  'truck': 'text-bluebird-blue',
  'search': 'text-bluebird-blue',
  'factory': 'text-gray-500',
  'chart': 'text-bluebird-blue',
  'file': 'text-bluebird-blue',
  'robot': 'text-bluebird-blue',
  'bell': 'text-bluebird-yellow',
  'target': 'text-bluebird-blue',
  'box': 'text-bluebird-blue',
  'hand': 'text-bluebird-yellow',
  'bus': 'text-bluebird-yellow',
}

// Render an icon from a string ID — used where data layers pass icon names
export function IconFromId({ id, className = '', size = 'sm' }) {
  const icon = ICON_MAP[id]
  if (!icon) return null
  const colorClass = COLOR_MAP[id] || ''
  const sizeClass = size === 'lg' ? 'text-xl' : size === 'md' ? 'text-base' : 'text-sm'
  return <FontAwesomeIcon icon={icon} className={`${sizeClass} ${colorClass} ${className}`} />
}

// Direct exports for use in JSX
export {
  FontAwesomeIcon,
  faBus,
  faMagnifyingGlass,
  faTriangleExclamation,
  faIndustry,
  faChartBar,
  faFileLines,
  faCircleCheck,
  faCircle,
  faArrowTrendUp,
  faArrowTrendDown,
  faTruck,
  faSackDollar,
  faBoxesStacked,
  faRobot,
  faBell,
  faBullseye,
  faHand,
}
