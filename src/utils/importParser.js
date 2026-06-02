export function normalize(raw) {
  let examples = []
  if (Array.isArray(raw.examples)) examples = raw.examples.filter(s => s && s.trim())
  else if (Array.isArray(raw._examples)) examples = raw._examples.filter(s => s && s.trim())

  return {
    english:  (raw.w || raw.word || raw.english || '').trim(),
    phonetic: (raw.pro || raw.phonetic || '').trim(),
    abbr:     (raw.a || raw.abbr || '').trim(),
    noun:     (raw.n || raw.noun || '').trim(),
    verb:     (raw.v || raw.verb || '').trim(),
    adj:      (raw.adj || '').trim(),
    adv:      (raw.adv || '').trim(),
    prep:     (raw.prep || '').trim(),
    conj:     (raw.conj || '').trim(),
    phr:      (raw.phr || '').trim(),
    examples,
  }
}

function parseJSON(text) {
  let data = JSON.parse(text)
  if (!Array.isArray(data)) data = [data]
  return data.map(normalize).filter(w => w.english)
}

export function parseImportText(text) {
  const t = text.trim()
  if (!t) throw new Error('内容为空')
  // 只接受 JSON 格式（以 [ 或 { 开头）
  if (t.startsWith('[') || t.startsWith('{')) {
    try { return parseJSON(t) }
    catch { throw new Error('JSON 格式有误，请检查括号/引号') }
  }
  throw new Error('仅支持 JSON 格式，内容必须以 [ 或 { 开头')
}

export const FORMAT_EXAMPLES = {
  json: `[
  {
    "w": "alanine",
    "pro": "/ˈæl.ə.niːn/",
    "a": "Ala/A",
    "n": "丙氨酸",
    "phr": "短语用法",
    "examples": [
      "Alanine is a non-polar amino acid.",
      "Ala was detected in the sample."
    ]
  }
]`,
}