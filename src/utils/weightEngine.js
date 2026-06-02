/**
 * 动态权重引擎
 * 范围：1 ~ 1000，初始 50
 *
 * 点击"记错了"      → × 2.0  强信号
 * 停留 < 4s         → × 0.90 非常熟悉
 * 停留 4–8s         → × 0.95 熟悉
 * 停留 8–15s        → × 1.05 稍犹豫
 * 停留 > 15s        → × 1.15 明显困难
 *
 * 生成组题时：
 *  - 从未见过的词 (viewCount=0) 权重 × 1.2，优先出新词
 *  - 最近刚出现过的词权重 × 0.15，减少重复
 */

export const INITIAL_WEIGHT = 50
export const MAX_WEIGHT = 1000
export const MIN_WEIGHT = 1

export function updateWeight(currentWeight, action, viewTimeMs = 0) {
  let w = Math.max(MIN_WEIGHT, currentWeight ?? INITIAL_WEIGHT)

  if (action === 'forgot') {
    w = Math.min(MAX_WEIGHT, w * 2.0)
  } else if (action === 'pass') {
    if (viewTimeMs < 4000)       w = Math.max(MIN_WEIGHT, w * 0.90)
    else if (viewTimeMs < 8000)  w = Math.max(MIN_WEIGHT, w * 0.95)
    else if (viewTimeMs < 15000) w = Math.min(MAX_WEIGHT, w * 1.05)
    else                         w = Math.min(MAX_WEIGHT, w * 1.15)
  }

  // 确保变化至少 ±1，防止原地踏步
  const old = currentWeight ?? INITIAL_WEIGHT
  const newW = Math.round(w * 100) / 100
  if (Math.abs(newW - old) < 0.5) {
    return action === 'forgot' ? Math.min(MAX_WEIGHT, old + 1) : Math.max(MIN_WEIGHT, old - 1)
  }

  return newW
}

export function generateGroup(words, size = 10, recentIds = []) {
  if (!words || words.length === 0) return []
  const targetSize = Math.min(size, words.length)

  const pool = words.map(w => {
    let ew = w.weight ?? INITIAL_WEIGHT
    if ((w.viewCount ?? 0) === 0) ew *= 1.2       // 新词小幅提升
    if (recentIds.includes(w.id)) ew *= 0.15       // 刚出现的大幅降低
    return { word: w, ew: Math.max(0.01, ew) }
  })

  const selected = []
  const available = [...pool]

  while (selected.length < targetSize && available.length > 0) {
    const total = available.reduce((s, p) => s + p.ew, 0)
    let rand = Math.random() * total
    let idx = available.length - 1
    for (let i = 0; i < available.length; i++) {
      rand -= available[i].ew
      if (rand <= 0) { idx = i; break }
    }
    selected.push(available[idx].word)
    available.splice(idx, 1)
  }

  return selected
}