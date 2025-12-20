import { formatDateTimeLocal } from './date'

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg)
}

export function runTimeFormatTests() {
  const baseUtc = Date.UTC(2025, 0, 2, 3, 4, 5) // 2025-01-02 03:04:05 UTC
  const out = formatDateTimeLocal(baseUtc)
  assert(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(out), 'format failed')

  const createdOnly = formatDateTimeLocal(baseUtc)
  assert(createdOnly.length === 19, 'created only length mismatch')

  const modifiedUtc = baseUtc + 3600_000
  const modifiedOut = formatDateTimeLocal(modifiedUtc)
  assert(modifiedOut !== createdOnly, 'modified should differ')
}

if (import.meta && (import.meta as any).env && (import.meta as any).env.MODE === 'development') {
  try {
    runTimeFormatTests()
    // eslint-disable-next-line no-console
    console.log('[time tests] passed')
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[time tests] failed', e)
  }
}
