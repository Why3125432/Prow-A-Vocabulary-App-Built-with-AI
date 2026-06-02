const KEY          = 'vocabmaster_v2'
const HISTORY_KEY  = 'prow_history_v1'
const SETTINGS_KEY = 'prow_settings_v1'

export const EMPTY_STATE = { wordBooks: [] }

// 默认词性顺序（包含新增 phr）
export const DEFAULT_POS_ORDER = ['noun', 'verb', 'adj', 'adv', 'prep', 'conj', 'phr']

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY_STATE
    const parsed = JSON.parse(raw)
    if (parsed.wordBooks) {
      parsed.wordBooks = parsed.wordBooks.map(book => ({
        ...book,
        words: (book.words || []).map(w => ({
          weight: 50, viewCount: 0, forgotCount: 0, lastSeen: null, examples: [],
          ...w,
          // 确保 phr 字段存在
          phr: w.phr || '',
          // 若没有 posOrder 则设置默认值
          posOrder: w.posOrder || [...DEFAULT_POS_ORDER],
        }))
      }))
    }
    return parsed
  } catch { return EMPTY_STATE }
}

export function saveState(state) {
  try { localStorage.setItem(KEY, JSON.stringify(state)) }
  catch (e) { console.warn('Storage write failed:', e) }
}

export function loadHistory() {
  try { const raw = localStorage.getItem(HISTORY_KEY); return raw ? JSON.parse(raw) : [] }
  catch { return [] }
}

export function addHistoryRecord(record) {
  try {
    const history = loadHistory()
    const newRecord = {
      ...record,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
    }
    localStorage.setItem(HISTORY_KEY, JSON.stringify([newRecord, ...history].slice(0, 60)))
  } catch {}
}

export function deleteHistoryRecords(ids) {
  try {
    const history = loadHistory()
    const idSet = new Set(ids)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history.filter(r => !idSet.has(r.id))))
  } catch {}
}

export function clearHistory() {
  try { localStorage.removeItem(HISTORY_KEY) } catch {}
}