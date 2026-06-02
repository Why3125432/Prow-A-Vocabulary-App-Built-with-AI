import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { generateGroup, updateWeight, INITIAL_WEIGHT } from '../utils/weightEngine'
import SentenceRenderer from './SentenceRenderer'
import { DEFAULT_POS_ORDER } from '../store'

const GROUP_SIZE = 10
const PREFETCH_AT = 7

const POS_DEFS = {
  noun: { label: 'n.',    cls: '' },
  verb: { label: 'v.',    cls: 'v' },
  adj:  { label: 'adj.',  cls: 'adj' },
  adv:  { label: 'adv.',  cls: 'adv' },
  prep: { label: 'prep.', cls: 'prep' },
  conj: { label: 'conj.', cls: 'conj' },
  phr:  { label: 'phr.',  cls: '' },
}

function WordPopup({ entry, onClose, onNavigate }) {
  const { word, bookName } = entry
  const order = word.posOrder || DEFAULT_POS_ORDER
  return (
    <div className="word-popup-overlay" onClick={onClose}>
      <div className="word-popup" onClick={e => e.stopPropagation()}>
        <div className="word-popup-english">
          {word.english}
          {word.abbr && <span style={{ fontSize: '0.72em', color: 'var(--text3)', marginLeft: 8 }}>({word.abbr})</span>}
        </div>
        {word.phonetic && <div className="word-popup-phonetic">{word.phonetic}</div>}
        <div className="word-popup-meanings">
          {order.map(key => {
            const def = POS_DEFS[key]
            if (!def || !word[key]) return null
            return (
              <div key={key} className="word-popup-row">
                <span className={`card-pos-tag ${def.cls}`} style={{ fontSize: '0.55rem', padding: '1px 5px' }}>{def.label}</span>
                <span style={{ fontSize: '0.78rem', color: 'var(--text2)' }}>{word[key]}</span>
              </div>
            )
          })}
        </div>
        <div className="word-popup-source">📚 {bookName}</div>
        <div className="word-popup-actions">
          <button className="word-popup-close-btn" onClick={onClose}>关闭</button>
          <button className="word-popup-detail-btn" onClick={onNavigate}>查看完整释义</button>
        </div>
      </div>
    </div>
  )
}

export default function ReciteMode({ currentBook, navigate, updateWord, data }) {
  const allWords = currentBook?.words ?? []

  const [currentGroup, setCurrentGroup] = useState([])
  const [nextGroup,    setNextGroup]    = useState([])
  const [groupIndex,   setGroupIndex]   = useState(0)
  const [recentIds,    setRecentIds]    = useState([])
  const [dotStates,    setDotStates]    = useState([])
  const [showTrans,    setShowTrans]    = useState(false)
  const [prefetched,   setPrefetched]   = useState(false)
  const [sessionW,     setSessionW]     = useState({})
  const [wordPopup,    setWordPopup]    = useState(null)

  const startRef  = useRef(null)
  const initedRef = useRef(false)

  const wordsMap = useMemo(() => {
    const map = new Map()
    for (const book of data.wordBooks) {
      for (const w of book.words) {
        const key = w.english.toLowerCase()
        if (!map.has(key)) map.set(key, [])
        map.get(key).push({ word: w, bookId: book.id, bookName: book.name })
      }
    }
    return map
  }, [data.wordBooks])

  const getWeights = useCallback(() =>
    allWords.map(w => ({ ...w, weight: sessionW[w.id]?.weight ?? w.weight ?? INITIAL_WEIGHT }))
  , [allWords, sessionW])

  useEffect(() => {
    if (initedRef.current || allWords.length === 0) return
    initedRef.current = true
    const g = generateGroup(allWords, GROUP_SIZE, [])
    setCurrentGroup(g)
    setDotStates(g.map(() => 'pending'))
    startRef.current = Date.now()
  }, [allWords])

  useEffect(() => {
    if (prefetched || groupIndex < PREFETCH_AT || currentGroup.length === 0) return
    setPrefetched(true)
    const shown = currentGroup.map(w => w.id)
    const recent = [...recentIds, ...shown].slice(-GROUP_SIZE * 2)
    setNextGroup(generateGroup(getWeights(), GROUP_SIZE, recent))
  }, [groupIndex, prefetched, currentGroup, recentIds, getWeights])

  const advance = useCallback((action) => {
    const elapsed = startRef.current ? Date.now() - startRef.current : 0
    const word = currentGroup[groupIndex]
    if (!word) return
    const curW = sessionW[word.id]?.weight ?? word.weight ?? INITIAL_WEIGHT
    const newW = updateWeight(curW, action, elapsed)

    updateWord(currentBook.id, word.id, {
      weight:      newW,
      viewCount:   (word.viewCount   ?? 0) + (action === 'pass'   ? 1 : 0),
      forgotCount: (word.forgotCount ?? 0) + (action === 'forgot' ? 1 : 0),
      lastSeen:    Date.now(),
    })
    setSessionW(p => ({ ...p, [word.id]: { weight: newW } }))

    const newDots = [...dotStates]
    newDots[groupIndex] = action === 'forgot' ? 'forgot' : 'done'
    setDotStates(newDots)

    const nextIdx = groupIndex + 1
    if (nextIdx < currentGroup.length) {
      setGroupIndex(nextIdx); setShowTrans(false); startRef.current = Date.now()
    } else {
      const shown = currentGroup.map(w => w.id)
      const newRecents = [...recentIds, ...shown].slice(-GROUP_SIZE * 2)
      setRecentIds(newRecents)
      const ng = nextGroup.length > 0 ? nextGroup : generateGroup(getWeights(), GROUP_SIZE, newRecents)
      setCurrentGroup(ng); setNextGroup([])
      setDotStates(ng.map(() => 'pending'))
      setGroupIndex(0); setPrefetched(false); setShowTrans(false)
      startRef.current = Date.now()
    }
  }, [currentGroup, groupIndex, dotStates, recentIds, nextGroup, sessionW, getWeights, currentBook?.id, updateWord])

  const word = currentGroup[groupIndex]
  if (!word) return (
    <div className="mode-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text3)' }}>加载中…</div>
    </div>
  )

  const examples = word.examples || []
  const order = word.posOrder || DEFAULT_POS_ORDER

  return (
    <div className="mode-screen">
      <div className="mode-header">
        <button className="btn-icon" onClick={() => navigate('book', currentBook.id)}>←</button>
        <span className="mode-title">🧠 背诵模式</span>
      </div>

      <div className="dot-progress">
        {dotStates.map((st, i) => (
          <div key={i} className={`progress-dot ${i === groupIndex ? 'active' : st === 'pending' ? '' : st}`} />
        ))}
        {nextGroup.length > 0 && (
          <>
            <div style={{ width: 10, height: 1, background: 'var(--border)', flexShrink: 0 }} />
            {Array(nextGroup.length).fill(null).map((_, i) => (
              <div key={`n${i}`} className="progress-dot" style={{ opacity: 0.25 }} />
            ))}
          </>
        )}
      </div>

      <div className="word-card-wrap">
        <div className="word-card flex-card">
          <div className="card-top-section">
            <div className="card-english">
              {word.english}
              {word.abbr && (
                <span style={{ fontSize: '0.55em', fontWeight: 400, color: 'var(--text3)', marginLeft: 10 }}>
                  ({word.abbr})
                </span>
              )}
            </div>
            {word.phonetic && <div className="card-phonetic">{word.phonetic}</div>}

            {showTrans ? (
              order.some(key => word[key]) ? (
                <>
                  <div className="card-divider" />
                  <div className="card-translations translation-reveal">
                    {order.map(key => {
                      const def = POS_DEFS[key]
                      if (!def || !word[key]) return null
                      return (
                        <div key={key} className="card-pos-row">
                          <span className={`card-pos-tag ${def.cls}`}>{def.label}</span>
                          <span className="card-meaning">{word[key]}</span>
                        </div>
                      )
                    })}
                    <div style={{ marginTop: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="weight-badge">
                        权重 {(sessionW[word.id]?.weight ?? word.weight ?? INITIAL_WEIGHT).toFixed(1)}
                      </span>
                      {(word.forgotCount ?? 0) > 0 && (
                        <span className="weight-badge" style={{ color: 'var(--danger)' }}>
                          忘 {word.forgotCount} 次
                        </span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ padding: '16px 0 4px', textAlign: 'center', color: 'var(--text3)', fontSize: '0.8rem' }}>
                  暂无释义
                </div>
              )
            ) : (
              <div className="translation-hidden">
                <div className="translation-hidden-icon">🤔</div>
                <div className="translation-hidden-text">回想一下…</div>
              </div>
            )}
          </div>

          {showTrans && examples.length > 0 && (
            <div className="card-examples-section translation-reveal">
              <div className="card-examples-label">例句</div>
              {examples.map((ex, i) => (
                <div key={i} className="card-example-item">
                  <SentenceRenderer
                    sentence={ex}
                    cardEnglish={word.english}
                    cardAbbr={word.abbr}
                    wordsMap={wordsMap}
                    onWordClick={entries => setWordPopup(entries[0])}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mode-footer">
        {!showTrans ? (
          <button className="btn-reveal" onClick={() => setShowTrans(true)}>显示翻译</button>
        ) : (
          <>
            <button className="btn-next"   onClick={() => advance('pass')}>← 下一个</button>
            <button className="btn-forgot" onClick={() => advance('forgot')}>记错了 ✕</button>
          </>
        )}
      </div>

      {wordPopup && (
        <WordPopup
          entry={wordPopup}
          onClose={() => setWordPopup(null)}
          onNavigate={() => { setWordPopup(null); navigate('wordDetail', wordPopup.bookId, wordPopup.word.id) }}
        />
      )}
    </div>
  )
}