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

export default function DictationMode({ currentBook, navigate, updateWord, data }) {
  const allWords = currentBook?.words ?? []

  const [currentGroup, setCurrentGroup] = useState([])
  const [nextGroup,    setNextGroup]    = useState([])
  const [groupIndex,   setGroupIndex]   = useState(0)
  const [recentIds,    setRecentIds]    = useState([])
  const [dotStates,    setDotStates]    = useState([])
  const [prefetched,   setPrefetched]   = useState(false)
  const [sessionW,     setSessionW]     = useState({})

  const [inputVal,     setInputVal]     = useState('')
  const [answered,     setAnswered]     = useState(false)
  const [answerCorrect,setAnswerCorrect]= useState(false)
  const [showPhonetic, setShowPhonetic] = useState(true)
  const [wordPopup,    setWordPopup]    = useState(null)

  const startRef    = useRef(null)
  const answerRef   = useRef(null)
  const initedRef   = useRef(false)
  const inputElem   = useRef(null)

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

  useEffect(() => {
    setInputVal('')
    setAnswered(false)
    setAnswerCorrect(false)
    answerRef.current = null
  }, [groupIndex, currentGroup])

  const advance = useCallback((action, elapsed) => {
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
      setGroupIndex(nextIdx)
      startRef.current = Date.now()
    } else {
      const shown = currentGroup.map(w => w.id)
      const newRecents = [...recentIds, ...shown].slice(-GROUP_SIZE * 2)
      setRecentIds(newRecents)
      const ng = nextGroup.length > 0 ? nextGroup : generateGroup(getWeights(), GROUP_SIZE, newRecents)
      setCurrentGroup(ng)
      setNextGroup([])
      setDotStates(ng.map(() => 'pending'))
      setGroupIndex(0)
      setPrefetched(false)
      startRef.current = Date.now()
    }
  }, [currentGroup, groupIndex, dotStates, recentIds, nextGroup, sessionW, getWeights, currentBook?.id, updateWord])

  const handleInput = (val) => {
    setInputVal(val)
    if (answered) return
    const norm = val.trim().toLowerCase()
    const word = currentGroup[groupIndex]
    if (!word) return
    const correct = norm === word.english.toLowerCase() ||
                    (word.abbr && norm === word.abbr.toLowerCase())
    if (correct) {
      answerRef.current = Date.now()
      setAnswered(true)
      setAnswerCorrect(true)
    }
  }

  const handleSkip = () => {
    if (answered) return
    answerRef.current = Date.now()
    setAnswered(true)
    setAnswerCorrect(false)
  }

  const handleNext = () => {
    const elapsed = startRef.current
      ? (answerRef.current ?? Date.now()) - startRef.current
      : 0
    advance(answerCorrect ? 'pass' : 'forgot', elapsed)
  }

  const word = currentGroup[groupIndex]
  if (!word) return (
    <div className="mode-screen" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--text3)' }}>加载中…</div>
    </div>
  )

  const order = word.posOrder || DEFAULT_POS_ORDER
  const examples = word.examples || []

  return (
    <div className="mode-screen">
      <div className="mode-header">
        <button className="btn-icon" onClick={() => navigate('book', currentBook.id)}>←</button>
        <span className="mode-title">✍️ 默写模式</span>
        <button
          className={`phonetic-toggle ${showPhonetic ? 'on' : ''}`}
          onClick={() => setShowPhonetic(p => !p)}
        >
          音标
        </button>
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
            {showPhonetic && word.phonetic && (
              <div className="card-phonetic" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
                {word.phonetic}
              </div>
            )}

            {order.some(key => word[key]) && (
              <div className="card-translations">
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
              </div>
            )}

            <div className="dictation-input-wrap">
              <input
                ref={inputElem}
                className={`dictation-input ${answered && answerCorrect ? 'correct' : answered && !answerCorrect ? 'wrong' : ''}`}
                placeholder="输入英文单词…"
                value={inputVal}
                onChange={e => handleInput(e.target.value)}
                disabled={answered}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {answered && (
              <div className={`dictation-feedback ${answerCorrect ? 'correct' : 'wrong'}`}>
                {answerCorrect
                  ? '✓ 正确！'
                  : `答案：${word.english}${word.abbr ? `（${word.abbr}）` : ''}`}
              </div>
            )}
          </div>

          {answered && examples.length > 0 && (
            <div className="card-examples-section">
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
        {!answered ? (
          <button className="btn-forgot" onClick={handleSkip}>跳过</button>
        ) : (
          <button className="btn-next" onClick={handleNext}>下一个 →</button>
        )}
      </div>

      {wordPopup && (
        <WordPopup
          entry={wordPopup}
          onClose={() => setWordPopup(null)}
          onNavigate={() => {
            setWordPopup(null)
            navigate('wordDetail', wordPopup.bookId, wordPopup.word.id)
          }}
        />
      )}
    </div>
  )
}