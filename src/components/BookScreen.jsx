import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { Clipboard } from '@capacitor/clipboard'
import WordEditor  from './WordEditor'
import ImportModal from './ImportModal'
import { addHistoryRecord, DEFAULT_POS_ORDER } from '../store'
import { parseImportText } from '../utils/importParser'

const POS_DEFS = {
  noun: { label: 'n.',    cls: '' },
  verb: { label: 'v.',    cls: 'v' },
  adj:  { label: 'adj.',  cls: 'adj' },
  adv:  { label: 'adv.',  cls: 'adv' },
  prep: { label: 'prep.', cls: 'prep' },
  conj: { label: 'conj.', cls: 'conj' },
  phr:  { label: 'phr.',  cls: '' },
}

const SORT_OPTIONS = [
  { key: 'default', label: '默认' },
  { key: 'az',      label: 'A→Z' },
  { key: 'za',      label: 'Z→A' },
  { key: 'whi',     label: '权重↑' },
  { key: 'wlo',     label: '权重↓' },
]

const EXPORT_SUB_PATH = 'Downloads/Prow'
const PRIVATE_STORAGE_BASE = '/storage/emulated/0/Android/data/com.vocabmaster.app/files'

// 剪贴板缓存
const CLIPBOARD_CACHE_KEY = 'prow_clipboard_cache_v2'
const MAX_CACHE_SIZE = 50

function getClipboardCache() {
  try {
    const raw = localStorage.getItem(CLIPBOARD_CACHE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function addToClipboardCache(hash) {
  const cache = getClipboardCache().filter(item => item !== hash)
  cache.unshift(hash)
  if (cache.length > MAX_CACHE_SIZE) cache.pop()
  try { localStorage.setItem(CLIPBOARD_CACHE_KEY, JSON.stringify(cache)) } catch {}
}

function simpleHash(text) {
  let hash = 0
  for (let i = 0; i < Math.min(text.length, 2000); i++) {
    const char = text.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash |= 0
  }
  return 'cb2_' + Math.abs(hash).toString(36)
}

// 检查文本是否看起来像 JSON（以 [ 或 { 开头）
function looksLikeImportFormat(text) {
  const trimmed = text.trim()
  return trimmed.startsWith('[') || trimmed.startsWith('{')
}

// WordItem 组件（不变）
function WordItem({ word, onEdit, onDelete, onViewDetail, selectMode, selected, onToggle }) {
  const [expanded, setExpanded] = useState(false)
  const order = word.posOrder || DEFAULT_POS_ORDER
  const hasMeanings = order.some(key => word[key])

  const renderMeanings = () => {
    return order.map(key => {
      const def = POS_DEFS[key]
      if (!def || !word[key]) return null
      return (
        <div key={key} className="pos-row">
          <span className={`pos-tag ${def.cls}`}>{def.label}</span>
          <span className="pos-meaning">{word[key]}</span>
        </div>
      )
    }).filter(Boolean)
  }

  return (
    <div className={`word-item ${expanded ? 'expanded' : ''} ${selected ? 'selected' : ''}`}
      onClick={selectMode ? () => onToggle(word.id) : undefined}>
      <div className="word-item-header">
        {selectMode && (
          <div className={`select-circle ${selected ? 'checked' : ''}`}>{selected && '✓'}</div>
        )}
        <div className="word-item-english"
          onClick={!selectMode ? () => setExpanded(e => !e) : undefined}
          style={{ cursor: 'pointer' }}>
          <div className="word-en">
            {word.english}
            {word.abbr && <span style={{ fontSize: '0.75em', color: 'var(--text3)', marginLeft: 7, fontWeight: 400 }}>({word.abbr})</span>}
          </div>
          {word.phonetic && <div className="word-phonetic">{word.phonetic}</div>}
        </div>
        {!selectMode && (
          <div className="word-item-actions">
            <button className="word-action edit" onClick={() => onEdit(word)}>✏️</button>
            <button className="word-action del"  onClick={() => onDelete(word)}>🗑</button>
            {hasMeanings && (
              <button className={`word-action expand ${expanded ? 'open' : ''}`}
                onClick={() => setExpanded(e => !e)}>▾</button>
            )}
          </div>
        )}
      </div>
      {!selectMode && expanded && hasMeanings && (
        <div className="word-item-body">
          {renderMeanings()}
          <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
            <span className="weight-badge">权重 {(word.weight ?? 50).toFixed(1)}</span>
            <span className="weight-badge">背了 {word.viewCount ?? 0} 次</span>
            {(word.forgotCount ?? 0) > 0 && <span className="weight-badge" style={{ color: 'var(--danger)' }}>忘 {word.forgotCount} 次</span>}
          </div>
          <button className="view-detail-btn" onClick={() => onViewDetail(word)}>查看完整释义 →</button>
        </div>
      )}
    </div>
  )
}

// 导出辅助函数（不变）
function makeFilename() {
  const d = new Date()
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}-${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.json`
}

function buildContent(book) {
  return JSON.stringify(book.words.map(w => {
    const obj = { w: w.english }
    if (w.phonetic) obj.pro = w.phonetic
    if (w.abbr)     obj.a   = w.abbr
    const order = w.posOrder || DEFAULT_POS_ORDER
    order.forEach(key => {
      if (w[key]) obj[key] = w[key]
    })
    if ((w.examples||[]).length) obj.examples = w.examples
    return obj
  }), null, 2)
}

async function doExport(content, filename) {
  const filePath = `${EXPORT_SUB_PATH}/${filename}`
  try {
    await Filesystem.writeFile({
      path: filePath,
      data: content,
      directory: Directory.External,
      encoding: Encoding.UTF8,
      recursive: true,
    })
    const uriResult = await Filesystem.getUri({ path: filePath, directory: Directory.External })
    return { ok: true, uri: uriResult.uri, friendlyPath: filePath, filename }
  } catch (e) {
    return { ok: false }
  }
}

async function shareFile(uri, filename, content) {
  try {
    if (uri) {
      await Share.share({ files: [uri], title: filename, dialogTitle: '分享文件' })
    } else if (content) {
      await Share.share({ title: filename, text: content, dialogTitle: '分享内容' })
    }
  } catch {}
}

export default function BookScreen({
  currentBook, navigate, showToast,
  addWord, updateWord, deleteWord, importWords
}) {
  const [search,          setSearch]          = useState('')
  const [sortBy,          setSortBy]          = useState('default')
  const [editorWord,      setEditorWord]      = useState(null)
  const [showImport,      setShowImport]      = useState(false)
  const [confirmDel,      setConfirmDel]      = useState(null)
  const [selectMode,      setSelectMode]      = useState(false)
  const [selected,        setSelected]        = useState(new Set())
  const [confirmBulk,     setConfirmBulk]     = useState(false)
  const [exporting,       setExporting]       = useState(false)
  const [exportResult,    setExportResult]    = useState(null)

  // 剪贴板弹窗
  const [clipboardModal, setClipboardModal] = useState(null)
  const intervalRef = useRef(null)
  const rapidTimersRef = useRef([])

  const checkClipboard = useCallback(async () => {
    try {
      const result = await Clipboard.read()
      if (!result.value || typeof result.value !== 'string') return
      const text = result.value.trim()
      if (!text) return

      // 只检测 JSON 格式特征（[ 或 {）
      if (!looksLikeImportFormat(text)) return

      let words
      try {
        words = parseImportText(text)
      } catch {
        return
      }
      if (!words || words.length === 0) return

      const hash = simpleHash(text)
      const cache = getClipboardCache()
      if (cache.includes(hash)) return

      setClipboardModal({ words, hash })
    } catch {
      // 忽略错误
    }
  }, [])

  // 快速连续检测（用于焦点进入时）
  const rapidCheck = useCallback(() => {
    rapidTimersRef.current.forEach(t => clearTimeout(t))
    rapidTimersRef.current = []

    checkClipboard()

    const t1 = setTimeout(() => checkClipboard(), 50)
    const t2 = setTimeout(() => checkClipboard(), 150)

    rapidTimersRef.current.push(t1, t2)
  }, [checkClipboard])

  // 启动/停止轮询及焦点检测
  useEffect(() => {
    const startPolling = () => {
      if (intervalRef.current) return
      rapidCheck()
      intervalRef.current = setInterval(checkClipboard, 2000)
    }

    const stopPolling = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      rapidTimersRef.current.forEach(t => clearTimeout(t))
      rapidTimersRef.current = []
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startPolling()
      } else {
        stopPolling()
      }
    }

    const handleFocus = () => {
      if (document.visibilityState === 'visible') {
        startPolling()
      }
    }

    if (document.visibilityState === 'visible') {
      startPolling()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', stopPolling)

    return () => {
      stopPolling()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', stopPolling)
    }
  }, [checkClipboard, rapidCheck])

  const handleClipboardImport = useCallback(() => {
    if (!clipboardModal) return
    const { words, hash } = clipboardModal
    const existingSet = new Set(currentBook.words.map(w => w.english.toLowerCase()))
    const deduped = words.filter(w => !existingSet.has(w.english.toLowerCase()))
    const skipped = words.length - deduped.length
    if (deduped.length > 0) {
      importWords(currentBook.id, deduped)
      addHistoryRecord({
        type: 'import',
        bookName: currentBook.name,
        count: deduped.length,
        skipped,
        content: JSON.stringify(deduped, null, 2),
        date: new Date().toISOString(),
      })
      showToast(skipped > 0 ? `✓ 导入 ${deduped.length} 个，跳过重复 ${skipped}` : `✓ 已导入 ${deduped.length} 个单词`)
    } else {
      showToast(`⚠ 剪贴板中的 ${words.length} 个单词均已存在`)
    }
    addToClipboardCache(hash)
    setClipboardModal(null)
  }, [clipboardModal, currentBook, importWords, showToast])

  const handleClipboardClose = useCallback(() => {
    if (!clipboardModal) return
    addToClipboardCache(clipboardModal.hash)
    setClipboardModal(null)
  }, [clipboardModal])

  // 其余原有逻辑
  const sortedFiltered = useMemo(() => {
    let list = currentBook?.words ?? []
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(w =>
        w.english.toLowerCase().includes(q) ||
        (w.noun||'').includes(q) ||
        (w.abbr||'').includes(q)
      )
    }
    if (sortBy === 'az')  return [...list].sort((a,b) => a.english.localeCompare(b.english))
    if (sortBy === 'za')  return [...list].sort((a,b) => b.english.localeCompare(a.english))
    if (sortBy === 'whi') return [...list].sort((a,b) => (a.weight??50) - (b.weight??50))
    if (sortBy === 'wlo') return [...list].sort((a,b) => (b.weight??50) - (a.weight??50))
    return list
  }, [currentBook?.words, search, sortBy])

  if (!currentBook) { navigate('home'); return null }

  const isDuplicate = (english, excludeId = null) =>
    currentBook.words.some(w => w.english.toLowerCase() === english.toLowerCase() && w.id !== excludeId)

  const handleSaveWord = (wordData) => {
    if (editorWord?.id) {
      if (isDuplicate(wordData.english, editorWord.id)) { showToast('⚠ 该单词已存在'); return }
      updateWord(currentBook.id, editorWord.id, wordData)
      showToast('✓ 已更新')
    } else {
      if (isDuplicate(wordData.english)) { showToast('⚠ 该单词已存在'); return }
      addWord(currentBook.id, wordData)
      showToast('✓ 已添加')
    }
    setEditorWord(null)
  }

  const handleImport = (words) => {
    const existingSet = new Set(currentBook.words.map(w => w.english.toLowerCase()))
    const deduped = words.filter(w => !existingSet.has(w.english.toLowerCase()))
    const skipped  = words.length - deduped.length
    if (deduped.length === 0) { showToast(`⚠ 全部 ${words.length} 个单词已存在`); setShowImport(false); return }
    const count = importWords(currentBook.id, deduped)
    addHistoryRecord({
      type: 'import',
      bookName: currentBook.name,
      count,
      skipped,
      content: JSON.stringify(deduped, null, 2),
      date: new Date().toISOString(),
    })
    setShowImport(false)
    showToast(skipped > 0 ? `✓ 导入 ${count} 个，跳过重复 ${skipped}` : `✓ 已导入 ${count} 个单词`)
  }

  const handleExport = async () => {
    if (!currentBook.words.length) {
      showToast('⚠ 单词本为空')
      return
    }
    setExporting(true)
    const filename = makeFilename()
    const content  = buildContent(currentBook)
    const result   = await doExport(content, filename)
    setExporting(false)

    if (result.ok) {
      addHistoryRecord({
        type: 'export',
        bookName: currentBook.name,
        count: currentBook.words.length,
        filename: result.filename,
        friendlyPath: result.friendlyPath,
        uri: result.uri,
        content,
        date: new Date().toISOString(),
      })
      setExportResult({
        ...result,
        count: currentBook.words.length,
        content,
        absolutePath: `${PRIVATE_STORAGE_BASE}/${result.friendlyPath}`,
      })
    } else {
      showToast('⚠ 导出失败，请检查存储权限')
    }
  }

  const toggleItem  = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const allSelected = sortedFiltered.length > 0 && sortedFiltered.every(w => selected.has(w.id))
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(sortedFiltered.map(w => w.id)))
  const exitSelect  = () => { setSelectMode(false); setSelected(new Set()) }
  const doBulkDelete = () => {
    const count = selected.size
    selected.forEach(id => deleteWord(currentBook.id, id))
    exitSelect(); setConfirmBulk(false); showToast(`已删除 ${count} 个单词`)
  }
  const confirmDeleteWord = () => { deleteWord(currentBook.id, confirmDel.id); setConfirmDel(null); showToast('已删除') }
  const canStudy = currentBook.words.length > 0

  return (
    <div className="screen">
      <div className="app-header">
        <button className="btn-icon" onClick={selectMode ? exitSelect : () => navigate('home')}>
          {selectMode ? '✕' : '←'}
        </button>
        <div style={{ flex: 1 }}>
          <div className="title">{selectMode ? `已选 ${selected.size} 个` : currentBook.name}</div>
          <div className="subtitle">{currentBook.words.length} 个单词</div>
        </div>
        {!selectMode && (
          <>
            <button className="btn-icon" title="记录" onClick={() => navigate('history', currentBook.id)} style={{ fontSize: '0.85rem' }}>🗒</button>
            <button className="btn-icon" title="导出" onClick={handleExport}>📤</button>
            <button className="btn-icon" title="导入" onClick={() => setShowImport(true)}>📥</button>
            <button className="btn-icon" title="批量删除" onClick={() => setSelectMode(true)} style={{ fontSize: '0.75rem', color: 'var(--danger)' }}>☑</button>
          </>
        )}
      </div>

      {/* 剪贴板中心弹窗 */}
      {clipboardModal && (
        <div className="modal-overlay" onClick={handleClipboardClose}>
          <div className="modal-sheet" onClick={e => e.stopPropagation()} style={{ maxHeight: '70vh' }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <span className="modal-title">发现剪贴板单词</span>
              <button className="btn-icon" onClick={handleClipboardClose}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: 10, color: 'var(--text2)', fontSize: '0.85rem' }}>
                检测到 {clipboardModal.words.length} 个可导入的单词，要导入到「{currentBook.name}」吗？
              </p>
              <div className="preview-list">
                {clipboardModal.words.slice(0, 10).map((w, i) => (
                  <div key={i} className="preview-item">
                    <div className="preview-en">
                      {w.english}
                      {w.abbr && <span style={{ color: 'var(--text3)', marginLeft: 6, fontWeight: 400 }}>({w.abbr})</span>}
                    </div>
                    <div className="preview-meta">
                      {[w.phonetic, w.noun && `名:${w.noun}`].filter(Boolean).join('  ·  ')}
                    </div>
                  </div>
                ))}
                {clipboardModal.words.length > 10 && (
                  <div style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '0.75rem', marginTop: 4 }}>
                    ...还有 {clipboardModal.words.length - 10} 个单词
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={handleClipboardClose}>忽略</button>
              <button className="btn-primary" onClick={handleClipboardImport}>导入</button>
            </div>
          </div>
        </div>
      )}

      {!selectMode && (
        <div style={{ padding: '0 16px' }}>
          <div className="book-actions">
            <button className="btn-action btn-recite" onClick={() => canStudy && navigate('recite',    currentBook.id)} disabled={!canStudy}>背</button>
            <button className="btn-action" onClick={() => canStudy && navigate('dictation', currentBook.id)} disabled={!canStudy}
              style={{ background:'rgba(160,48,96,0.1)', border:'1px solid rgba(160,48,96,0.3)', color:'#A03060' }}>默</button>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px 4px' }}>
        <div className="search-bar">
          <span style={{ color: 'var(--text3)' }}>🔍</span>
          <input placeholder="搜索单词…" value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button style={{ color: 'var(--text3)' }} onClick={() => setSearch('')}>✕</button>}
        </div>
        <div className="sort-bar">
          {SORT_OPTIONS.map(opt => (
            <button key={opt.key} className={`sort-btn ${sortBy === opt.key ? 'active' : ''}`}
              onClick={() => setSortBy(opt.key)}>{opt.label}</button>
          ))}
        </div>
      </div>

      <div className="content-area">
        {sortedFiltered.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🔬</div>
            <div className="empty-text">{search ? '没有匹配的单词' : '单词本是空的\n点击右下角 ＋ 添加单词'}</div>
          </div>
        ) : (
          <div className="word-list">
            {sortedFiltered.map(word => (
              <WordItem key={word.id} word={word}
                onEdit={w => setEditorWord(w)} onDelete={w => setConfirmDel(w)}
                onViewDetail={w => navigate('wordDetail', currentBook.id, w.id)}
                selectMode={selectMode} selected={selected.has(word.id)} onToggle={toggleItem} />
            ))}
          </div>
        )}
      </div>

      {!selectMode && <button className="fab" onClick={() => setEditorWord({})}>＋</button>}

      {selectMode && (
        <div className="bulk-bar">
          <span className="bulk-count">已选 {selected.size} 个</span>
          <button className="bulk-sel-all" onClick={toggleAll}>{allSelected ? '取消全选' : '全选'}</button>
          <button className="bulk-del-btn" disabled={selected.size === 0}
            onClick={() => selected.size > 0 && setConfirmBulk(true)}>
            删除 {selected.size > 0 ? `(${selected.size})` : ''}
          </button>
        </div>
      )}

      {exportResult && (
        <div className="confirm-dialog">
          <div className="confirm-box" style={{ maxWidth: 360 }}>
            <div className="confirm-title">导出完成 ✓</div>
            <div className="confirm-desc">
              已导出 <strong>{exportResult.count}</strong> 个单词<br />
              <span style={{ fontFamily: 'var(--mono)', fontSize: '0.68rem', color: 'var(--text3)', wordBreak: 'break-all' }}>
                {exportResult.absolutePath}
              </span>
            </div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setExportResult(null)}>关闭</button>
              <button className="btn-ghost" style={{ color: 'var(--accent)', borderColor: 'rgba(58,112,136,0.3)' }}
                onClick={() => { setExportResult(null); navigate('history', currentBook.id) }}>查看记录</button>
              <button className="btn-primary" style={{ fontSize: '0.88rem' }}
                onClick={() => shareFile(exportResult.uri, exportResult.filename, exportResult.content)}>
                分享文件
              </button>
            </div>
          </div>
        </div>
      )}

      {editorWord !== null && (
        <WordEditor word={editorWord?.id ? editorWord : null}
          onSave={handleSaveWord} onClose={() => setEditorWord(null)} />
      )}
      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}

      {confirmDel && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">删除单词？</div>
            <div className="confirm-desc">删除「{confirmDel.english}」后无法撤回。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn-danger" onClick={confirmDeleteWord}>删除</button>
            </div>
          </div>
        </div>
      )}
      {confirmBulk && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">批量删除？</div>
            <div className="confirm-desc">将删除选中的 {selected.size} 个单词，无法撤回。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmBulk(false)}>取消</button>
              <button className="btn-danger" onClick={doBulkDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}