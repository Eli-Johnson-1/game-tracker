import { useState } from 'react'
import { evaluate } from 'mathjs'

const ALLOWED = /^[\d\s+\-*/().]*$/

function safePreview(expr) {
  if (!expr || expr.trim() === '') return null
  if (!ALLOWED.test(expr)) return null
  try {
    const result = evaluate(expr)
    if (typeof result === 'number' && isFinite(result)) {
      return Math.round(result)
    }
    return null
  } catch {
    return null
  }
}

export function CardVpInput({ value, onChange }) {
  const [raw, setRaw] = useState(value?.expression ?? '')

  function handleChange(e) {
    const text = e.target.value
    // Allow only valid characters
    if (!ALLOWED.test(text)) return
    setRaw(text)
    const preview = safePreview(text)
    onChange({ expression: text, value: preview ?? 0 })
  }

  function appendOp(op) {
    const next = raw + op
    if (ALLOWED.test(next)) {
      setRaw(next)
      const preview = safePreview(next)
      onChange({ expression: next, value: preview ?? 0 })
    }
  }

  const preview = safePreview(raw)
  const isInvalid = raw.trim() !== '' && preview === null

  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        inputMode="numeric"
        value={raw}
        onChange={handleChange}
        onFocus={e => e.target.select()}
        placeholder="e.g. 13+2+5"
        className="w-full rounded px-2 py-1 text-sm bg-gray-700 border text-white placeholder-gray-500 focus:outline-none focus:ring-1"
        style={{ borderColor: isInvalid ? '#f87171' : '#4b5563', focusRingColor: '#ea580c' }}
      />
      <button
        type="button"
        onClick={() => appendOp('+')}
        className="px-2 py-1 rounded bg-gray-700 text-white text-sm flex-shrink-0 hover:bg-gray-600"
      >+</button>
      <button
        type="button"
        onClick={() => appendOp('-')}
        className="px-2 py-1 rounded bg-gray-700 text-white text-sm flex-shrink-0 hover:bg-gray-600"
      >−</button>
      <span className="text-xs whitespace-nowrap" style={{ color: isInvalid ? '#f87171' : '#9ca3af', minWidth: 40 }}>
        {raw.trim() === '' ? '= 0' : isInvalid ? 'invalid' : `= ${preview}`}
      </span>
    </div>
  )
}
