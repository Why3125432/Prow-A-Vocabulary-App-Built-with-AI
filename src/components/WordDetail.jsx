import { useMemo, useState } from 'react'
import SentenceRenderer from './SentenceRenderer'
import { DEFAULT_POS_ORDER } from '../store'

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

export default function WordDetail({ currentBook, view, navigate, data }) {
  const word = currentBook?.words.find(w => w.id === view.wordId)
  const [wordPopup, setWordPopup] = useState(null)

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

  if (!word) { navigate('book', currentBook?.id); return null }

  const order = word.posOrder || DEFAULT_POS_ORDER

  return (
    <div className="word-detail-screen">
      <div className="mode-header">
        <button className="btn-icon" onClick={() => navigate('book', currentBook.id)}>←</button>
        <span className="mode-title">完整释义</span>
      </div>

      <div className="word-detail-card">
        <div className="word-detail-scroll">
          <div className="card-english">
            {word.english}
            {word.abbr && (
              <span style={{ fontSize: '0.55em', fontWeight: 400, color: 'var(--text3)', marginLeft: 10 }}>
                ({word.abbr})
              </span>
            )}
          </div>
          {word.phonetic && <div className="card-phonetic" style={{ marginTop: 6 }}>{word.phonetic}</div>}

          {order.some(key => word[key]) && (
            <>
              <div className="card-divider" />
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
            </>
          )}

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
            <span className="weight-badge">权重 {(word.weight ?? 10).toFixed(1)}</span>
            <span className="weight-badge">背了 {word.viewCount ?? 0} 次</span>
            {(word.forgotCount ?? 0) > 0 && (
              <span className="weight-badge" style={{ color: 'var(--danger)' }}>忘 {word.forgotCount} 次</span>
            )}
          </div>

          {(word.examples || []).length > 0 && (
            <>
              <div className="word-detail-section-label">例句</div>
              {word.examples.map((ex, i) => (
                <div key={i} className="word-detail-example">
                  <SentenceRenderer
                    sentence={ex}
                    cardEnglish={word.english}
                    cardAbbr={word.abbr}
                    wordsMap={wordsMap}
                    onWordClick={entries => setWordPopup(entries[0])}
                  />
                </div>
              ))}
            </>
          )}
        </div>
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