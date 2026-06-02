import { useState, useMemo } from 'react'

export default function HomeScreen({ data, navigate, createBook, renameBook, deleteBook, showToast }) {
  const [showCreate, setShowCreate] = useState(false)
  const [newName,    setNewName]    = useState('')
  const [confirmDel, setConfirmDel] = useState(null)
  const [editing,    setEditing]    = useState(null)
  const [globalQ,    setGlobalQ]    = useState('')

  const searchResults = useMemo(() => {
    if (!globalQ.trim()) return []
    const q = globalQ.toLowerCase()
    const map = new Map()
    for (const book of data.wordBooks) {
      for (const word of book.words) {
        if (word.english.toLowerCase().includes(q) ||
            (word.noun||'').includes(q) ||
            (word.abbr||'').includes(q) ||
            (word.verb||'').includes(q)) {
          const key = word.english.toLowerCase()
          if (map.has(key)) map.get(key).books.push(book.name)
          else              map.set(key, { word, books: [book.name] })
        }
      }
    }
    return [...map.values()].slice(0, 60)
  }, [globalQ, data.wordBooks])

  const handleCreate = () => {
    const name = newName.trim(); if (!name) return
    createBook(name); setNewName(''); setShowCreate(false); showToast('✓ 单词本已创建')
  }
  const confirmDelete = () => { deleteBook(confirmDel.id); setConfirmDel(null); showToast('已删除') }
  const handleRename  = () => {
    const name = editing.name.trim(); if (!name) return
    renameBook(editing.id, name); setEditing(null)
  }

  return (
    <div className="screen">
      <div className="app-header">
        <div style={{ flex: 1 }}>
          <div className="title">Prow</div>
          <div className="subtitle">{data.wordBooks.length} 个单词本</div>
        </div>
        <button className="btn-icon" onClick={() => navigate('settings')} title="设置">⚙️</button>
      </div>

      <div style={{ padding: '0 16px 8px' }}>
        <div className="search-bar">
          <span style={{ color: 'var(--text3)' }}>🔍</span>
          <input placeholder="搜索全部单词…" value={globalQ} onChange={e => setGlobalQ(e.target.value)} />
          {globalQ && <button style={{ color: 'var(--text3)' }} onClick={() => setGlobalQ('')}>✕</button>}
        </div>

        {globalQ.trim() && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
            {searchResults.length === 0 ? (
              <div style={{ fontSize: '0.82rem', color: 'var(--text3)', textAlign: 'center', padding: '12px 0' }}>无匹配结果</div>
            ) : (
              searchResults.map(({ word, books }) => (
                <div key={word.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--display)', fontSize: '0.95rem', color: 'var(--text)' }}>{word.english}</span>
                    {word.abbr     && <span style={{ fontSize: '0.75rem', color: 'var(--text3)' }}>({word.abbr})</span>}
                    {word.phonetic && <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--accent)' }}>{word.phonetic}</span>}
                  </div>
                  {word.noun && <div style={{ fontSize: '0.78rem', color: 'var(--text2)', marginTop: 2 }}>{word.noun}</div>}
                  <div style={{ fontSize: '0.65rem', color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 4 }}>📚 {books.join('、')}</div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {!globalQ.trim() && (
        <div className="content-area">
          {data.wordBooks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <div className="empty-text">还没有单词本<br />点击右下角 ＋ 创建第一个</div>
            </div>
          ) : (
            <div className="books-grid">
              {data.wordBooks.map(book => (
                <div key={book.id} className="book-card" onClick={() => navigate('book', book.id)}>
                  <div className="book-card-actions">
                    <button className="book-card-action"
                      onClick={e => { e.stopPropagation(); setEditing({ id: book.id, name: book.name }) }}>✏️</button>
                    <button className="book-card-action del"
                      onClick={e => { e.stopPropagation(); setConfirmDel(book) }}>🗑</button>
                  </div>
                  <div className="book-card-name">{book.name}</div>
                  <div className="book-card-meta">
                    <div className="book-card-count">{book.words.length}</div>
                    <div className="book-card-label">个单词</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <button className="fab" onClick={() => setShowCreate(true)}>＋</button>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">新建单词本</span>
              <button className="btn-icon" onClick={() => setShowCreate(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <div className="field-label">单词本名称</div>
                <input className="field-input large" placeholder="例：氨基酸词汇、酶命名法…"
                  value={newName} onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleCreate()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setShowCreate(false)}>取消</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim()}>创建</button>
            </div>
          </div>
        </div>
      )}

      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(null)}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">重命名单词本</span>
              <button className="btn-icon" onClick={() => setEditing(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="field">
                <div className="field-label">新名称</div>
                <input className="field-input large" value={editing.name}
                  onChange={e => setEditing({ ...editing, name: e.target.value })}
                  onKeyDown={e => e.key === 'Enter' && handleRename()} autoFocus />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditing(null)}>取消</button>
              <button className="btn-primary" onClick={handleRename}>保存</button>
            </div>
          </div>
        </div>
      )}

      {confirmDel && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">删除单词本？</div>
            <div className="confirm-desc">将永久删除「{confirmDel.name}」及其中 {confirmDel.words.length} 个单词，无法撤回。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn-danger" onClick={confirmDelete}>删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}