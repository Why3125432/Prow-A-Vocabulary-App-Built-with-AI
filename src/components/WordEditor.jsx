import { useState, useEffect, useRef, useCallback } from 'react'
import { DEFAULT_POS_ORDER } from '../store'

const EMPTY = {
  english: '', phonetic: '', abbr: '',
  noun: '', verb: '', adj: '', adv: '', prep: '', conj: '', phr: '',
  examples: [],
  posOrder: [...DEFAULT_POS_ORDER],
}

const POS_DEFS = {
  noun: { label: '名词义', abbr: 'n.' },
  verb: { label: '动词义', abbr: 'v.' },
  adj:  { label: '形容词义', abbr: 'adj.' },
  adv:  { label: '副词义', abbr: 'adv.' },
  prep: { label: '介词义', abbr: 'prep.' },
  conj: { label: '连词义', abbr: 'conj.' },
  phr:  { label: '短语', abbr: 'phr.' },
}

// 拖拽把手图标：两列三行点阵（⠿）
const HANDLE_ICON = '\u283F'

export default function WordEditor({ word, onSave, onClose }) {
  const [form, setForm] = useState(word ? {
    ...EMPTY,
    examples: [],
    ...word,
    posOrder: word.posOrder && word.posOrder.length ? [...word.posOrder] : [...DEFAULT_POS_ORDER],
  } : EMPTY)

  useEffect(() => {
    setForm(word ? {
      ...EMPTY,
      examples: [],
      ...word,
      posOrder: word.posOrder && word.posOrder.length ? [...word.posOrder] : [...DEFAULT_POS_ORDER],
    } : EMPTY)
  }, [word])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  const addExample    = () => setForm(f => ({ ...f, examples: [...(f.examples || []), ''] }))
  const removeExample = (i) => setForm(f => ({ ...f, examples: f.examples.filter((_, idx) => idx !== i) }))
  const setExample    = (i, val) => setForm(f => ({ ...f, examples: f.examples.map((ex, idx) => idx === i ? val : ex) }))

  // ─── 拖拽排序状态 ─────────────────────────
  const listRef      = useRef(null)
  const itemRefs     = useRef({})
  const rowHeights   = useRef([])
  const basePositions = useRef([])
  const startY       = useRef(0)
  const draggingIdx  = useRef(-1)
  const orderSnapshot= useRef([])

  const [dragState, setDragState] = useState({
    active: false,
    translateY: 0,
    overIndex: -1,
  })

  const cacheLayout = useCallback(() => {
    const container = listRef.current
    if (!container) return
    const containerRect = container.getBoundingClientRect()
    const order = form.posOrder
    const newHeights = []
    const newPositions = []
    order.forEach((key) => {
      const el = itemRefs.current[key]
      if (el) {
        const rect = el.getBoundingClientRect()
        newHeights.push(rect.height)
        newPositions.push(rect.top - containerRect.top)
      } else {
        newHeights.push(0)
        newPositions.push(0)
      }
    })
    rowHeights.current = newHeights
    basePositions.current = newPositions
  }, [form.posOrder])

  const handleTouchStart = (e, index) => {
    e.preventDefault()
    const touch = e.touches[0]
    startY.current = touch.clientY
    draggingIdx.current = index
    orderSnapshot.current = [...form.posOrder]
    cacheLayout()
    setDragState({
      active: true,
      translateY: 0,
      overIndex: index,
    })
  }

  const handleTouchMove = (e) => {
    e.preventDefault()
    if (draggingIdx.current < 0 || !dragState.active) return

    const touch = e.touches[0]
    const dy = touch.clientY - startY.current
    const fromIdx = draggingIdx.current
    const heights = rowHeights.current
    const baseTops = basePositions.current
    if (heights.length === 0 || baseTops.length === 0) return

    const originalTop = baseTops[fromIdx]
    const currentCenter = originalTop + dy + heights[fromIdx] / 2

    let newOverIndex = fromIdx
    for (let i = 0; i < baseTops.length; i++) {
      if (i === fromIdx) continue
      const top = baseTops[i]
      const mid = top + heights[i] / 2
      if (i < fromIdx && currentCenter < mid) {
        newOverIndex = i
        break
      } else if (i > fromIdx && currentCenter > mid) {
        newOverIndex = i
      }
    }

    setDragState({
      active: true,
      translateY: dy,
      overIndex: newOverIndex,
    })
  }

  const handleTouchEnd = () => {
    if (draggingIdx.current < 0) return
    const fromIdx = draggingIdx.current
    const toIdx = dragState.overIndex
    draggingIdx.current = -1
    setDragState({ active: false, translateY: 0, overIndex: -1 })

    if (toIdx >= 0 && toIdx !== fromIdx) {
      setForm(f => {
        const newOrder = [...f.posOrder]
        const [removed] = newOrder.splice(fromIdx, 1)
        newOrder.splice(toIdx, 0, removed)
        return { ...f, posOrder: newOrder }
      })
    }
  }

  const handleSave = () => {
    if (!form.english.trim()) return
    onSave({
      english:  form.english.trim(),
      phonetic: form.phonetic.trim(),
      abbr:     form.abbr.trim(),
      noun:     form.noun.trim(),
      verb:     form.verb.trim(),
      adj:      form.adj.trim(),
      adv:      form.adv.trim(),
      prep:     form.prep.trim(),
      conj:     form.conj.trim(),
      phr:      form.phr.trim(),
      examples: (form.examples || []).map(e => e.trim()).filter(Boolean),
      posOrder: form.posOrder,
    })
  }

  const getTranslateYForItem = (itemIndex) => {
    if (!dragState.active) return 0
    const from = draggingIdx.current
    const to = dragState.overIndex
    if (from < 0 || to < 0 || from === to) return 0

    const h = rowHeights.current[from] || 0
    if (itemIndex === from) return 0
    if (from < to) {
      if (itemIndex > from && itemIndex <= to) return -h
    } else {
      if (itemIndex >= to && itemIndex < from) return h
    }
    return 0
  }

  const posItems = form.posOrder.map((posKey, index) => {
    const def = POS_DEFS[posKey]
    if (!def) return null

    const isDragging = dragState.active && draggingIdx.current === index
    const shift = getTranslateYForItem(index)
    const translateY = isDragging ? dragState.translateY : shift

    return (
      <div
        key={posKey}
        ref={(el) => { if (el) itemRefs.current[posKey] = el }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 6,
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          position: 'relative',
          zIndex: isDragging ? 20 : 1,
          touchAction: 'pan-y',   // 允许在此行滑动以滚动页面
        }}
      >
        {/* 拖拽把手 */}
        <div
          style={{
            cursor: 'grab',
            padding: '0 4px',
            fontSize: '1.4rem',
            color: 'var(--text3)',
            userSelect: 'none',
            lineHeight: 1,
            touchAction: 'none',  // 把手禁用页面滚动，用于拖拽
          }}
          onTouchStart={(e) => handleTouchStart(e, index)}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          title="按住拖动排序"
        >
          {HANDLE_ICON}
        </div>

        {/* 词性标签 */}
        <span style={{
          fontFamily: 'var(--mono)',
          fontSize: '0.7rem',
          fontWeight: 500,
          color: 'var(--primary)',
          background: 'var(--primary-glow)',
          border: '1px solid rgba(176,122,40,0.3)',
          borderRadius: 4,
          padding: '1px 6px',
          minWidth: 36,
          textAlign: 'center',
          touchAction: 'pan-y',   // 允许滚动
        }}>
          {def.abbr}
        </span>

        {/* 输入框 */}
        <input
          className="field-input"
          style={{ flex: 1, touchAction: 'pan-y' }}
          placeholder={def.label}
          value={form[posKey] || ''}
          onChange={(e) => setForm(f => ({ ...f, [posKey]: e.target.value }))}
        />
      </div>
    )
  })

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">{word?.id ? '编辑单词' : '添加单词'}</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="field-group">
            <div className="field">
              <div className="field-label">英文单词 *</div>
              <input className="field-input large" placeholder="alanine" value={form.english} onChange={set('english')} />
            </div>

            <div className="field">
              <div className="field-label">音标</div>
              <input className="field-input mono" placeholder="/ˈæl.ə.niːn/" value={form.phonetic} onChange={set('phonetic')} />
            </div>

            <div className="field">
              <div className="field-label">
                <span className="pos-tag abbr" style={{ fontSize: '0.58rem', padding: '1px 5px' }}>abbr.</span>
                缩写
              </div>
              <input className="field-input" placeholder="Ala / A" value={form.abbr} onChange={set('abbr')} />
            </div>

            <div className="sep" />

            {/* 可拖动词性区域 */}
            <div className="field" ref={listRef}>
              <div className="field-label" style={{ marginBottom: 8 }}>词性释义（按住 ⠿ 拖动排序）</div>
              {posItems}
            </div>

            <div className="sep" />

            <div className="field">
              <div className="field-label">例句</div>
              {(form.examples || []).map((ex, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                  <input
                    className="field-input"
                    style={{ flex: 1 }}
                    placeholder="输入例句（英文）"
                    value={ex}
                    onChange={e => setExample(i, e.target.value)}
                  />
                  <button
                    style={{ width: 34, height: 44, borderRadius: 8, background: 'var(--danger-glow)', border: '1px solid rgba(184,48,48,0.3)', color: 'var(--danger)', flexShrink: 0 }}
                    onClick={() => removeExample(i)}
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                style={{ width: '100%', height: 40, borderRadius: 10, border: '1px dashed var(--border2)', color: 'var(--text3)', background: 'transparent', fontSize: '0.85rem' }}
                onClick={addExample}
              >
                ＋ 添加例句
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={handleSave} disabled={!form.english.trim()}>
            {word?.id ? '保存修改' : '添加'}
          </button>
        </div>
      </div>
    </div>
  )
}