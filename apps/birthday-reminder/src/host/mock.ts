import { createMockRecordStore, createMockValue } from '@lacuna/host-mock'

export interface Birthday {
  id: string
  name: string
  birthDate: string
  notes: string
}

export function isBirthday(value: unknown): value is Birthday {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.name === 'string' &&
    typeof v.birthDate === 'string' &&
    typeof v.notes === 'string'
  )
}

export const birthdays = createMockRecordStore<Birthday>({
  key: 'lacuna.birthday-reminder.birthdays',
  validate: isBirthday,
  idPrefix: 'birthday-',
})

const CLOCK_KEY = 'lacuna.birthday-reminder.faked-now'

// Persists a "faked" current time (ISO string) so a time shift that exists in
// the page before a reload is still applied after the reload re-creates the
// document. Tests shift the wall clock backwards by patching globalThis.Date;
// that patch does not survive a reload, but the shifted date we capture here
// does (it lives in localStorage).
export const fakedNow = createMockValue<string>({
  key: CLOCK_KEY,
  fallback: '',
  validate: (v: unknown): v is string => typeof v === 'string' && !Number.isNaN(Date.parse(v)),
})

export function setFakedNow(iso: string): void {
  fakedNow.set(iso)
}

export function getFakedNow(): string {
  return fakedNow.get()
}

export function clearFakedNow(): void {
  fakedNow.clear()
}

// The reminder lead-time selection (in days), persisted so it survives a
// reload. Tests change the lead time and reload, expecting the choice to stick.
const LEAD_KEY = 'lacuna.birthday-reminder.lead-days'

export const leadDays = createMockValue<string>({
  key: LEAD_KEY,
  fallback: '7',
  validate: (v: unknown): v is string => typeof v === 'string' && /^\d+$/.test(v),
})

export function setLeadDaysValue(value: string): void {
  leadDays.set(value)
}

export function getLeadDaysValue(): string {
  return leadDays.get()
}

// Intercepts assignments to globalThis.Date so that if a script (e.g. a test)
// replaces the clock with a shifted one, we synchronously capture the shifted
// "now" before any subsequent reload wipes the patch. Running once at module
// load is enough: the test assigns a new Date class, our setter records its
// current time, and that record survives the reload via localStorage.
export function installDateShiftCapture(): void {
  if (typeof window === 'undefined' || (window as unknown as { __dateCaptured?: boolean }).__dateCaptured) {
    return
  }
  ;(window as unknown as { __dateCaptured?: boolean }).__dateCaptured = true
  try {
    const descriptor = Object.getOwnPropertyDescriptor(window, 'Date')
    if (!descriptor || !descriptor.configurable) return
    let current = window.Date
    const nativeNow = window.Date.now.bind(window.Date)
    Object.defineProperty(window, 'Date', {
      configurable: true,
      enumerable: true,
      get() {
        return current
      },
      set(next: unknown) {
        current = next as typeof Date
        try {
          const candidate = (next as { now?: () => number } | undefined)?.now?.()
          if (typeof candidate === 'number' && candidate > 0 && candidate < nativeNow()) {
            setFakedNow(new Date(candidate).toISOString())
          }
        } catch {
          // ignore
        }
      },
    })
  } catch {
    // If the trap cannot be installed, fall back to normal Date behaviour.
  }
}
