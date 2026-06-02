import { useState, useMemo } from 'react'
import { parseImportText } from '../utils/importParser'
import { addHistoryRecord } from '../store'

export default function IncomingImport({
  data, importData, onClose,
  addWord, createBook, showToast
}) {
  const [selectedBookId, setSelectedBookId] = useState(data.wordBooks[0]?.id || '')
  const [newBookName,    setNewBookName]    = useState('')
  const [creating,       setCreating]       = useState(data.wordBooks.length === 0)

  const parsed = useMemo(() => {
    try { return parseImportText(importData.content) }
    catch { return [] }
  }, [importData.content])

  const handleImport = () => {
    let bookId = selectedBookId
    if (creating) {
      const name = newBookName.trim()
      if (!name) { showToast('⚠ 请输入单词本名称'); return }
      bookId = createBook(name)
    }
    if (!bookId) { showToast('⚠ 请选择单词本'); return }

    const targetBook = data.wordBooks.find(b => b.id === bookId)
    const existingSet = new Set((targetBook?.words || []).map(w => w.english.toLowerCase()))
    const deduped = parsed.filter(w => !existingSet.has(w.english.toLowerCase()))
    const skipped  = parsed.length - deduped.length

    deduped.forEach(w => addWord(bookId, w))

    const bookName = creating ? newBookName.trim() : (targetBook?.name || '')
    addHistoryRecord({
      type: 'import',
      bookName,
      count: deduped.length,
      skipped,
      content: JSON.stringify(deduped, null, 2),   // 格式化保存
      date: new Date().toISOString()
    })

    showToast(
      deduped.length === 0
        ? `⚠ 全部 ${parsed.length} 个单词已存在`
        : skipped > 0
          ? `✓ 导入 ${deduped.length} 个，跳过重复 ${skipped}`
          : `✓ 已导入 ${deduped.length} 个单词`
    )
    onClose()
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 250 }} onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">从外部应用导入</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '10px 13px', marginBottom: 14 }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
              📄 {importData.filename}
            </div>
            <div style={{ fontSize: '0.78rem', marginTop: 4, color: parsed.length > 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {parsed.length > 0 ? `✓ 解析到 ${parsed.length} 个单词` : '⚠ 无法解析文件内容，请检查格式'}
            </div>
          </div>

          {parsed.length > 0 && (
            <>
              <div className="field">
                <div className="field-label">导入到单词本</div>
                {!creating ? (
                  <>
                    <select className="field-input" value={selectedBookId}
                      onChange={e => setSelectedBookId(e.target.value)}>
                      {data.wordBooks.map(b => (
                        <option key={b.id} value={b.id}>{b.name}（{b.words.length} 词）</option>
                      ))}
                    </select>
                    <button style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onClick={() => setCreating(true)}>＋ 创建新单词本</button>
                  </>
                ) : (
                  <>
                    <input className="field-input large" placeholder="新单词本名称"
                      value={newBookName} onChange={e => setNewBookName(e.target.value)} autoFocus />
                    {data.wordBooks.length > 0 && (
                      <button style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        onClick={() => setCreating(false)}>← 选择已有单词本</button>
                    )}
                  </>
                )}
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: '0.62rem', color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                  预览（前 5 个）
                </div>
                {parsed.slice(0, 5).map((w, i) => (
                  <div key={i} className="preview-item" style={{ marginBottom: 4 }}>
                    <div className="preview-en">
                      {w.english}{w.abbr && <span style={{ color: 'var(--text3)', marginLeft: 6, fontWeight: 400 }}>({w.abbr})</span>}
                    </div>
                    <div className="preview-meta">{w.noun || w.verb || ''}</div>
                  </div>
                ))}
                {parsed.length > 5 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--text3)', textAlign: 'center', paddingTop: 4 }}>
                    还有 {parsed.length - 5} 个单词…
                  </div>
                )}
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          {parsed.length > 0 && <button className="btn-primary" onClick={handleImport}>导入</button>}
        </div>
      </div>
    </div>
  )
}