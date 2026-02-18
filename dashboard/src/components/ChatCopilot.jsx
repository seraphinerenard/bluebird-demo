import React, { useState, useRef, useEffect } from 'react'
import { MessageSquare, X, Send, Sparkles, Bot, User } from 'lucide-react'
import { processQuestion } from '../utils/insights'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="w-1.5 h-1.5 rounded-full bg-bluebird-blue animate-bounce" style={{ animationDelay: '0ms' }} />
      <div className="w-1.5 h-1.5 rounded-full bg-bluebird-blue animate-bounce" style={{ animationDelay: '150ms' }} />
      <div className="w-1.5 h-1.5 rounded-full bg-bluebird-blue animate-bounce" style={{ animationDelay: '300ms' }} />
    </div>
  )
}

function MessageBubble({ message }) {
  const isBot = message.role === 'assistant'

  // Simple markdown-like rendering
  const renderText = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold
      line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Bullet
      if (line.startsWith('• ') || line.startsWith('- ')) {
        return <div key={i} className="ml-2 mb-0.5" dangerouslySetInnerHTML={{ __html: '&bull; ' + line.slice(2) }} />
      }
      // Numbered
      if (line.match(/^\d+\./)) {
        return <div key={i} className="ml-2 mb-0.5" dangerouslySetInnerHTML={{ __html: line }} />
      }
      return <div key={i} className="mb-0.5" dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }} />
    })
  }

  return (
    <div className={`flex gap-2 ${isBot ? '' : 'flex-row-reverse'}`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
        isBot ? 'bg-bluebird-blue' : 'bg-gray-200'
      }`}>
        {isBot ? <Bot size={12} className="text-white" /> : <User size={12} className="text-gray-600" />}
      </div>
      <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
        isBot ? 'bg-white border border-gray-200 text-gray-700' : 'bg-bluebird-blue text-white'
      }`}>
        {renderText(message.content)}
      </div>
    </div>
  )
}

const QUICK_PROMPTS = [
  'Give me a summary',
  "What's most critical?",
  'What should I order?',
  'Supplier analysis',
]

export default function ChatCopilot({ data }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 I'm the **Blue Bird Inventory Copilot**. I analyze your real-time inventory data and provide actionable insights.\n\nAsk me anything about stock levels, forecasts, risks, or recommendations." }
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const sendMessage = (text) => {
    const msg = text || input.trim()
    if (!msg) return

    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setInput('')
    setTyping(true)

    // Simulate AI thinking delay
    setTimeout(() => {
      const response = processQuestion(msg, data)
      setMessages(prev => [...prev, { role: 'assistant', content: response }])
      setTyping(false)
    }, 600 + Math.random() * 800)
  }

  return (
    <>
      {/* FAB */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-bluebird-blue text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center group"
        >
          <MessageSquare size={22} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-bluebird-yellow flex items-center justify-center">
            <Sparkles size={8} className="text-bluebird-blue" />
          </span>
        </button>
      )}

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-96 h-[560px] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-bluebird-blue px-4 py-3 flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <Bot size={16} className="text-white" />
            </div>
            <div className="flex-1">
              <div className="text-white text-sm font-bold">Inventory Copilot</div>
              <div className="text-blue-200 text-[10px] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                Analyzing {data.kpis.total_skus} SKUs in real-time
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="text-blue-200 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 bg-gray-50">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {typing && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts */}
          {messages.length <= 2 && (
            <div className="px-4 py-2 border-t border-gray-100 flex gap-1.5 flex-wrap shrink-0">
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(prompt)}
                  className="text-[10px] px-2.5 py-1 rounded-full border border-bluebird-blue/20 text-bluebird-blue hover:bg-bluebird-blue hover:text-white transition-colors font-medium"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {/* Input */}
          <div className="px-3 py-2 border-t border-gray-200 shrink-0 bg-white">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage()}
                placeholder="Ask about inventory, forecasts, risks..."
                className="flex-1 text-sm px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-bluebird-blue focus:border-transparent"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim()}
                className="p-2 rounded-lg bg-bluebird-blue text-white hover:bg-bluebird-blue-light disabled:opacity-30 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
