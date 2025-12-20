export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

export function formatDateTimeLocal(input: number | string | Date): string {
  const d = typeof input === 'number' ? new Date(input)
    : typeof input === 'string' ? new Date(input)
    : input instanceof Date ? input : new Date(input as any)
  const Y = d.getFullYear()
  const M = pad2(d.getMonth() + 1)
  const D = pad2(d.getDate())
  const h = pad2(d.getHours())
  const m = pad2(d.getMinutes())
  const s = pad2(d.getSeconds())
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}
