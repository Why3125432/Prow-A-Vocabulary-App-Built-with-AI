// 渲染例句：本词加粗，其他收录词可点击但外观与普通文本一致
export default function SentenceRenderer({ sentence, cardEnglish, cardAbbr, wordsMap, onWordClick }) {
  const parts = []
  const re = /([a-zA-Z'-]+)/g
  let last = 0, m

  while ((m = re.exec(sentence)) !== null) {
    if (m.index > last) parts.push({ text: sentence.slice(last, m.index), type: 'plain' })
    const raw = m[1]
    const key = raw.toLowerCase().replace(/'/g, '')
    const isOwn = key === (cardEnglish || '').toLowerCase() ||
                  (cardAbbr && key === cardAbbr.toLowerCase())
    const entries = wordsMap?.get(key)
    if (isOwn) {
      parts.push({ text: raw, type: 'own' })
    } else if (entries?.length) {
      // 收录词但非本卡片单词：可点击，但不使用特殊颜色/下划线
      parts.push({ text: raw, type: 'link', entries })
    } else {
      parts.push({ text: raw, type: 'plain' })
    }
    last = m.index + raw.length
  }
  if (last < sentence.length) parts.push({ text: sentence.slice(last), type: 'plain' })

  return (
    <span>
      {parts.map((p, i) => {
        if (p.type === 'own') {
          return <strong key={i} style={{ color: 'var(--text)' }}>{p.text}</strong>
        }
        if (p.type === 'link') {
          // 点击后弹出单词释义，但外观保持普通文本
          return (
            <span
              key={i}
              onClick={(e) => { e.stopPropagation(); onWordClick?.(p.entries) }}
              style={{ cursor: 'pointer' }}
            >
              {p.text}
            </span>
          )
        }
        return <span key={i}>{p.text}</span>
      })}
    </span>
  )
}