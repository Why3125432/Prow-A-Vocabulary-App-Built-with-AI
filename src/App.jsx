import { useState, useEffect, useCallback } from 'react'
import { App as CapApp } from '@capacitor/app'
import { loadState, saveState } from './store'
import HomeScreen     from './components/HomeScreen'
import BookScreen     from './components/BookScreen'
import ReciteMode     from './components/ReciteMode'
import DictationMode  from './components/DictationMode'
import WordDetail     from './components/WordDetail'
import HistoryScreen  from './components/HistoryScreen'
import IncomingImport from './components/IncomingImport'

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

export default function App() {
  const [data,          setData]          = useState(() => loadState())
  const [view,          setView]          = useState({ screen: 'home', bookId: null, wordId: null })
  const [toast,         setToast]         = useState(null)
  const [pendingImport, setPendingImport] = useState(null)

  useEffect(() => { saveState(data) }, [data])

  const navigate = useCallback((screen, bookId = null, wordId = null) => {
    setView({ screen, bookId, wordId })
  }, [])

  const showToast = useCallback((msg) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }, [])

  // Android back button + incoming file intent
  useEffect(() => {
    let backHandle = null

    const handleIncoming = async (url) => {
      if (!url) return
      try {
        const { Filesystem } = await import('@capacitor/filesystem')
        const result = await Filesystem.readFile({ path: url, encoding: 'utf8' })
        const filename = decodeURIComponent(url.split('/').pop() || 'import.txt')
        setPendingImport({ content: result.data, filename })
      } catch {}
    }

    CapApp.addListener('appUrlOpen', data => handleIncoming(data.url))

    backHandle = CapApp.addListener('backButton', () => {
      setView(v => {
        if (v.screen === 'home')       { CapApp.exitApp(); return v }
        if (v.screen === 'wordDetail') return { screen: 'book',   bookId: v.bookId, wordId: null }
        if (v.screen === 'history')    return { screen: 'book',   bookId: v.bookId, wordId: null }
        if (['recite','dictation'].includes(v.screen))
                                       return { screen: 'book',   bookId: v.bookId, wordId: null }
        return { screen: 'home', bookId: null, wordId: null }
      })
    })

    return () => {
      backHandle?.remove?.()
    }
  }, [])

  // Book mutations
  const createBook = useCallback((name) => {
    const id = makeId()
    setData(d => ({ ...d, wordBooks: [...d.wordBooks, { id, name, createdAt: Date.now(), words: [] }] }))
    return id
  }, [])
  const renameBook = useCallback((bookId, name) => {
    setData(d => ({ ...d, wordBooks: d.wordBooks.map(b => b.id === bookId ? { ...b, name } : b) }))
  }, [])
  const deleteBook = useCallback((bookId) => {
    setData(d => ({ ...d, wordBooks: d.wordBooks.filter(b => b.id !== bookId) }))
  }, [])

  // Word mutations
  const addWord = useCallback((bookId, wordData) => {
    const word = { id: makeId(), weight: 50, viewCount: 0, forgotCount: 0, lastSeen: null, examples: [], ...wordData }
    setData(d => ({ ...d, wordBooks: d.wordBooks.map(b => b.id === bookId ? { ...b, words: [...b.words, word] } : b) }))
  }, [])
  const updateWord = useCallback((bookId, wordId, updates) => {
    setData(d => ({
      ...d,
      wordBooks: d.wordBooks.map(b =>
        b.id === bookId
          ? { ...b, words: b.words.map(w => w.id === wordId ? { ...w, ...updates } : w) }
          : b
      )
    }))
  }, [])
  const deleteWord = useCallback((bookId, wordId) => {
    setData(d => ({ ...d, wordBooks: d.wordBooks.map(b => b.id === bookId ? { ...b, words: b.words.filter(w => w.id !== wordId) } : b) }))
  }, [])
  const importWords = useCallback((bookId, words) => {
    const newWords = words.map(w => ({ id: makeId(), weight: 50, viewCount: 0, forgotCount: 0, lastSeen: null, examples: [], ...w }))
    setData(d => ({ ...d, wordBooks: d.wordBooks.map(b => b.id === bookId ? { ...b, words: [...b.words, ...newWords] } : b) }))
    return newWords.length
  }, [])

  const currentBook = data.wordBooks.find(b => b.id === view.bookId)
  const props = {
    data, view, navigate, showToast, currentBook,
    createBook, renameBook, deleteBook,
    addWord, updateWord, deleteWord, importWords,
  }

  return (
    <>
      {view.screen === 'home'       && <HomeScreen     {...props} />}
      {view.screen === 'book'       && <BookScreen     {...props} />}
      {view.screen === 'recite'     && <ReciteMode     {...props} />}
      {view.screen === 'dictation'  && <DictationMode  {...props} />}
      {view.screen === 'wordDetail' && <WordDetail     {...props} />}
      {view.screen === 'history'    && <HistoryScreen  {...props} />}

      {pendingImport && (
        <IncomingImport
          {...props}
          importData={pendingImport}
          onClose={() => setPendingImport(null)}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </>
  )
}