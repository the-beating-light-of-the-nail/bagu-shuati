/** 日期与时间戳工具（从旧版 index.html 原样搬迁） */

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function addDaysDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

export function getCurrentTimestampStr(): string {
  const d = new Date()
  return `${todayStr()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}
