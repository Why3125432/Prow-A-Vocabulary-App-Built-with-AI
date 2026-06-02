import { useState, useRef } from 'react'
import { parseImportText, FORMAT_EXAMPLES } from '../utils/importParser'

export default function ImportModal({ onImport, onClose }) {
  const [text,     setText]     = useState('')
  const [error,    setError]    = useState('')
  const [parsed,   setParsed]   = useState(null)
  const [selFiles, setSelFiles] = useState([])
  const fileRef = useRef()

  const handleParse = () => {
    setError('')
    if (!text.trim()) { setError('请输入或粘贴内容'); return }
    try {
      const words = parseImportText(text)
      if (words.length === 0) { setError('未解析到任何单词，请检查格式'); return }
      setParsed(words)
    } catch (e) { setError(e.message); setParsed(null) }
  }

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setSelFiles(files.map(f => f.name))
    const contents = await Promise.all(files.map(f => f.text()))
    setText(contents.join('\n\n'))
    setParsed(null); setError('')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-handle" />
        <div className="modal-header">
          <span className="modal-title">批量导入</span>
          <button className="btn-icon" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <textarea className="field-input"
            placeholder="在此粘贴 JSON 内容，或点击下方选择文件"
            value={text}
            onChange={e => { setText(e.target.value); setParsed(null); setError('') }}
            rows={4} />

          <input ref={fileRef} type="file" accept=".txt,.json,.md,.csv,.log,.xml,.yaml,.yml" multiple
            style={{ display: 'none' }} onChange={handleFiles} />

          <button
            onClick={() => fileRef.current.click()}
            style={{ marginTop: 8, width: '100%', height: 40, borderRadius: 10, border: '1px dashed var(--border2)', color: 'var(--text3)', background: 'transparent', fontSize: '0.85rem', cursor: 'pointer' }}>
            📁 选择文件（可多选 .txt / .json / .md 等文本文件）
          </button>

          {selFiles.length > 0 && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text3)', fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                已选择 {selFiles.length} 个文件
              </div>
              {selFiles.map((name, i) => (
                <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: '6px 10px', fontSize: '0.78rem', color: 'var(--text2)', fontFamily: 'var(--mono)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📄</span>{name}
                </div>
              ))}
            </div>
          )}

          {error && <div style={{ color: 'var(--danger)', fontSize: '0.8rem', marginTop: 8 }}>⚠ {error}</div>}

          {!parsed && (
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={handleParse}>解析预览</button>
          )}

          {parsed && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>✓ 解析到 {parsed.length} 个单词</span>
                <button onClick={() => setParsed(null)} style={{ fontSize: '0.75rem', color: 'var(--text3)', cursor: 'pointer' }}>重新解析</button>
              </div>
              <div className="preview-list">
                {parsed.map((w, i) => (
                  <div key={i} className="preview-item">
                    <div className="preview-en">{w.english}</div>
                    <div className="preview-meta">
                      {[w.phonetic, w.abbr && `缩写:${w.abbr}`, w.noun && `名:${w.noun}`].filter(Boolean).join('  ·  ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 格式说明放在最底下 */}
          <div className="fmt-hint" style={{ marginTop: 16 }}>
            <strong>JSON 格式示例：</strong><br/><br/>
            {FORMAT_EXAMPLES.json}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={() => parsed && onImport(parsed)}
            disabled={!parsed || parsed.length === 0}>
            导入 {parsed ? `(${parsed.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}