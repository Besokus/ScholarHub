
export function formatNumber(num: number | string | undefined | null): string {
  if (num === undefined || num === null) return '0'
  const n = typeof num === 'string' ? parseFloat(num) : num
  if (isNaN(n)) return '0'
  
  return new Intl.NumberFormat('zh-CN', {
    notation: n > 10000 ? 'compact' : 'standard',
    maximumFractionDigits: 1
  }).format(n)
}
