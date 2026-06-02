import { useState, useEffect, useRef } from 'react'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { loadHistory, deleteHistoryRecords, clearHistory, DEFAULT_POS_ORDER } from '../store'
import { normalize as normalizeWord } from '../utils/importParser'

const POS_DEFS = {
  noun: { label: 'n.',    cls: '' },
  verb: { label: 'v.',    cls: 'v' },
  adj:  { label: 'adj.',  cls: 'adj' },
  adv:  { label: 'adv.',  cls: 'adv' },
  prep: { label: 'prep.', cls: 'prep' },
  conj: { label: 'conj.', cls: 'conj' },
  phr:  { label: 'phr.',  cls: '' },
}

function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}
function highlightLine(raw) {
  let line = escHtml(raw)
  line = line.replace(/(")((?:[^"\\]|\\.)*?)(")(\s*:)/g, '<span class="jk">"$2"</span>$4')
  line = line.replace(/(:)\s*(")((?:[^"\\]|\\.)*?)(")/g, '$1 <span class="jv">"$3"</span>')
  line = line.replace(/(:)\s*(-?\d+\.?\d*)/g, '$1 <span class="jnum">$2</span>')
  line = line.replace(/\b(true|false|null)\b/g, '<span class="jbool">$1</span>')
  line = line.replace(/^(\s*)(")((?:[^"\\]|\\.)*?)(")([,]?\s*)$/, '$1<span class="jstr">"$3"</span>$5')
  return line
}

async function shareRecord(record) {
  try {
    if (record.friendlyPath) {
      const uriResult = await Filesystem.getUri({ path: record.friendlyPath, directory: Directory.External })
      await Share.share({ files: [uriResult.uri], title: record.filename, dialogTitle: '分享文件' })
      return
    }
    if (record.uri) {
      await Share.share({ files: [record.uri], title: record.filename, dialogTitle: '分享文件' })
      return
    }
    if (record.content) {
      await Share.share({ title: record.filename || 'export.txt', text: record.content, dialogTitle: '分享内容' })
    }
  } catch {}
}

function WordItemReadOnly({ word }) {
  const [expanded, setExpanded] = useState(false)
  const order = word.posOrder || DEFAULT_POS_ORDER
  const hasMeanings = order.some(key => word[key])

  return (
    <div className={`word-item ${expanded ? 'expanded' : ''}`}>
      <div className="word-item-header" onClick={() => setExpanded(e => !e)} style={{ cursor: 'pointer' }}>
        <div className="word-item-english">
          <div className="word-en">
            {word.english}
            {word.abbr && <span style={{ fontSize: '0.75em', color: 'var(--text3)', marginLeft: 7, fontWeight: 400 }}>({word.abbr})</span>}
          </div>
          {word.phonetic && <div className="word-phonetic">{word.phonetic}</div>}
        </div>
        {hasMeanings && (
          <div className="word-item-actions">
            <button className={`word-action expand ${expanded ? 'open' : ''}`}
              onClick={(e) => { e.stopPropagation(); setExpanded(e => !e) }}>
              ▾
            </button>
          </div>
        )}
      </div>
      {expanded && hasMeanings && (
        <div className="word-item-body">
          {order.map(key => {
            const def = POS_DEFS[key]
            if (!def || !word[key]) return null
            return (
              <div key={key} className="pos-row">
                <span className={`pos-tag ${def.cls}`}>{def.label}</span>
                <span className="pos-meaning">{word[key]}</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function RecordDetail({ record, onClose }) {
  const [showSource, setShowSource] = useState(false)
  const [sharing, setSharing] = useState(false)

  let words = []
  try {
    const rawArray = JSON.parse(record.content || '[]')
    if (Array.isArray(rawArray)) {
      words = rawArray.map(normalizeWord).filter(w => w.english)
    }
  } catch (e) {}

  const handleShare = async () => {
    if (sharing) return
    setSharing(true)
    await shareRecord(record)
    setSharing(false)
  }

  if (showSource) {
    const lines = (record.content || '').split('\n')
    return (
      <div className="txt-viewer-wrap">
        <div className="txt-viewer-header">
          <button className="txt-back-btn" onClick={() => setShowSource(false)}>← 单词</button>
          <span className="txt-viewer-filename">{record.filename || '导入记录'}</span>
          <button className="txt-share-btn" onClick={handleShare}>{sharing ? '…' : '分享文件'}</button>
        </div>
        <div className="txt-viewer-body">
          <div className="txt-viewer-inner">
            {lines.map((line, i) => (
              <div key={i} className="txt-line">
                <span className="txt-linenum">{i + 1}</span>
                <span className="txt-code" dangerouslySetInnerHTML={{ __html: highlightLine(line) || '&nbsp;' }} />
              </div>
            ))}
          </div>
        </div>
        <div className="txt-viewer-footer">
          <span className="txt-footer-info">{lines.length} 行 · {record.count} 个单词</span>
          <span className="txt-footer-path">{record.friendlyPath || record.filename || '导入记录'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="screen">
      <div className="app-header">
        <button className="btn-icon" onClick={onClose}>←</button>
        <div style={{ flex: 1 }}>
          <div className="title">{record.type === 'export' ? '导出详情' : '导入详情'}</div>
          <div className="subtitle">{record.filename || '导入记录'} · {words.length} 个单词</div>
        </div>
        <button className="btn-icon" onClick={() => setShowSource(true)} style={{ fontSize: '0.8rem', fontFamily: 'var(--mono)' }} title="查看源码">{'</>'}</button>
        <button className="btn-icon" onClick={handleShare} title="分享文件">📤</button>
      </div>

      <div className="content-area">
        {words.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <div className="empty-text">无法解析单词数据</div>
          </div>
        ) : (
          <div className="word-list">
            {words.map((word, i) => (
              <WordItemReadOnly key={i} word={word} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatDate(iso) {
  const d = new Date(iso)
  const pad = n => String(n).padStart(2,'0')
  return `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function HistoryScreen({ navigate, currentBook }) {
  const [records,     setRecords]     = useState([])
  const [filter,      setFilter]      = useState('all')
  const [viewing,     setViewing]     = useState(null)
  const [selectMode,  setSelectMode]  = useState(false)
  const [selected,    setSelected]    = useState(new Set())
  const [confirmDel,  setConfirmDel]  = useState(null)
  const [confirmBulk, setConfirmBulk] = useState(false)
  const [confirmClear,setConfirmClear]= useState(false)

  const bookIdRef = useRef(currentBook?.id)
  useEffect(() => { bookIdRef.current = currentBook?.id }, [currentBook?.id])
  useEffect(() => { setRecords(loadHistory()) }, [])

  if (viewing) {
    return <RecordDetail record={viewing} onClose={() => setViewing(null)} />
  }

  const filtered = records.filter(r => filter === 'all' ? true : r.type === filter)
  const refresh = () => setRecords(loadHistory())

  const doDeleteSingle = () => {
    deleteHistoryRecords([confirmDel.id])
    setConfirmDel(null)
    refresh()
  }

  const toggleItem  = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s })
  const allSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id))
  const toggleAll   = () => setSelected(allSelected ? new Set() : new Set(filtered.map(r => r.id)))
  const exitSelect  = () => { setSelectMode(false); setSelected(new Set()) }

  const doBulkDelete = () => {
    deleteHistoryRecords([...selected])
    exitSelect(); setConfirmBulk(false); refresh()
  }

  const doClear = () => {
    clearHistory(); setConfirmClear(false); setRecords([])
  }

  return (
    <div className="screen">
      <div className="app-header">
        <button className="btn-icon" onClick={selectMode ? exitSelect : () => navigate('book', bookIdRef.current)}>
          {selectMode ? '✕' : '←'}
        </button>
        <div style={{ flex: 1 }}>
          <div className="title">{selectMode ? `已选 ${selected.size} 条` : '导入 / 导出记录'}</div>
          <div className="subtitle">{records.length} 条记录</div>
        </div>
        {!selectMode ? (
          <>
            <button className="btn-icon" onClick={() => setSelectMode(true)} style={{ fontSize: '0.75rem', color: 'var(--danger)' }} title="批量删除">☑</button>
            <button className="btn-icon" onClick={() => records.length > 0 && setConfirmClear(true)} style={{ fontSize: '0.78rem', color: 'var(--text3)' }} title="清空记录">🗑</button>
          </>
        ) : (
          <button className="btn-icon" style={{ color: 'var(--danger)', fontSize: '0.82rem' }} onClick={() => selected.size > 0 && setConfirmBulk(true)} disabled={selected.size === 0}>删除</button>
        )}
      </div>

      <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, alignItems: 'center' }}>
        {[['all','全部'],['export','导出'],['import','导入']].map(([k,l]) => (
          <button key={k} className={`sort-btn ${filter===k?'active':''}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
        {selectMode && (
          <button className="sort-btn" style={{ marginLeft: 'auto' }} onClick={toggleAll}>{allSelected ? '取消全选' : '全选'}</button>
        )}
      </div>

      <div className="content-area">
        {filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">🗒</div><div className="empty-text">暂无记录</div></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {filtered.map(rec => (
              <div key={rec.id} className={`history-item ${selectMode && selected.has(rec.id) ? 'selected' : ''}`}
                onClick={() => {
                  if (selectMode) { toggleItem(rec.id); return }
                  if (rec.content) setViewing(rec)
                }}
                style={{ cursor: (selectMode || rec.content) ? 'pointer' : 'default' }}>

                {selectMode && (
                  <div className={`select-circle ${selected.has(rec.id) ? 'checked' : ''}`} style={{ flexShrink: 0 }}>
                    {selected.has(rec.id) && '✓'}
                  </div>
                )}

                <div className="history-item-icon">{rec.type === 'export' ? '📤' : '📥'}</div>

                <div className="history-item-body">
                  <div className="history-item-title">{rec.type === 'export' ? '导出' : '导入'} · {rec.bookName}</div>
                  {rec.type === 'export' ? (
                    <div className="history-item-sub">
                      {rec.count} 个单词
                      {rec.friendlyPath && (
                        <span style={{ marginLeft: 8, color: 'var(--text3)', fontFamily: 'var(--mono)', fontSize: '0.65rem' }}>
                          {rec.friendlyPath}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="history-item-sub">
                      导入 {rec.count} 个
                      {rec.skipped > 0 && <span style={{ color: 'var(--text3)', marginLeft: 6 }}>跳过重复 {rec.skipped}</span>}
                    </div>
                  )}
                  <div className="history-item-date">{formatDate(rec.date)}</div>
                </div>

                {!selectMode && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                    {rec.content && <span style={{ color: 'var(--accent)', fontSize: '0.8rem' }}>查看 ›</span>}
                    <button
                      style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)', color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={e => { e.stopPropagation(); setConfirmDel(rec) }}>
                      🗑
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {confirmDel && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">删除此记录？</div>
            <div className="confirm-desc">删除后无法恢复（不影响已导出的文件）。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmDel(null)}>取消</button>
              <button className="btn-danger" onClick={doDeleteSingle}>删除</button>
            </div>
          </div>
        </div>
      )}
      {confirmBulk && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">批量删除？</div>
            <div className="confirm-desc">将删除选中的 {selected.size} 条记录，无法恢复。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmBulk(false)}>取消</button>
              <button className="btn-danger" onClick={doBulkDelete}>确认删除</button>
            </div>
          </div>
        </div>
      )}
      {confirmClear && (
        <div className="confirm-dialog">
          <div className="confirm-box">
            <div className="confirm-title">清空全部记录？</div>
            <div className="confirm-desc">将删除全部 {records.length} 条记录，无法恢复。</div>
            <div className="confirm-btns">
              <button className="btn-ghost" onClick={() => setConfirmClear(false)}>取消</button>
              <button className="btn-danger" onClick={doClear}>清空</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}