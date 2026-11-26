import { useEffect, useRef, useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, Rail, Table, TextInput } from '@lacuna/ui'
import './app.css'
import { toISODate } from '@lacuna/date-math'
import { useClipboard } from '@lacuna/use-clipboard'
import { useCollection } from '@lacuna/use-collection'
import type { ZoneRecord } from './host'

type ZoneData = Omit<ZoneRecord, 'id'>

const STORAGE_KEY = 'lacuna.world-clock.zones'

const CITY_TO_TZ: Record<string, string> = {
  new_york: 'America/New_York',
  los_angeles: 'America/Los_Angeles',
  chicago: 'America/Chicago',
  denver: 'America/Denver',
  london: 'Europe/London',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  madrid: 'Europe/Madrid',
  rome: 'Europe/Rome',
  moscow: 'Europe/Moscow',
  tokyo: 'Asia/Tokyo',
  singapore: 'Asia/Singapore',
  dubai: 'Asia/Dubai',
  sydney: 'Australia/Sydney',
  auckland: 'Pacific/Auckland',
  karachi: 'Asia/Karachi',
  mumbai: 'Asia/Kolkata',
  beijing: 'Asia/Shanghai',
  seoul: 'Asia/Seoul',
  cairo: 'Africa/Cairo',
  lagos: 'Africa/Lagos',
  johannesburg: 'Africa/Johannesburg',
  buenos_aires: 'America/Argentina/Buenos_Aires',
  sao_paulo: 'America/Sao_Paulo',
  mexico_city: 'America/Mexico_City',
  toronto: 'America/Toronto',
  vancouver: 'America/Vancouver',
  montreal: 'America/Toronto',
  havana: 'America/Havana',
  honolulu: 'Pacific/Honolulu',
  reykjavik: 'Atlantic/Reykjavik',
  lisbon: 'Europe/Lisbon',
  amsterdam: 'Europe/Amsterdam',
  brussels: 'Europe/Brussels',
  vienna: 'Europe/Vienna',
  stockholm: 'Europe/Stockholm',
  oslo: 'Europe/Oslo',
  helsinki: 'Europe/Helsinki',
  prague: 'Europe/Prague',
  warsaw: 'Europe/Warsaw',
  budapest: 'Europe/Budapest',
  zurich: 'Europe/Zurich',
  geneva: 'Europe/Zurich',
  athens: 'Europe/Athens',
  istanbul: 'Europe/Istanbul',
  jerusalem: 'Asia/Jerusalem',
  baghdad: 'Asia/Baghdad',
  tehran: 'Asia/Tehran',
  bangkok: 'Asia/Bangkok',
  jakarta: 'Asia/Jakarta',
  manila: 'Asia/Manila',
  hong_kong: 'Asia/Hong_Kong',
  taipei: 'Asia/Taipei',
  hanoi: 'Asia/Ho_Chi_Minh',
  almaty: 'Asia/Almaty',
  tashkent: 'Asia/Tashkent',
  nairobi: 'Africa/Nairobi',
  accra: 'Africa/Accra',
  dar_es_salaam: 'Africa/Dar_es_Salaam',
  addis_ababa: 'Africa/Addis_Ababa',
  melbourne: 'Australia/Melbourne',
  brisbane: 'Australia/Brisbane',
  perth: 'Australia/Perth',
  adelaide: 'Australia/Adelaide',
  fiji: 'Pacific/Fiji',
  wellington: 'Pacific/Auckland',
  honiara: 'Pacific/Honiara',
  bogota: 'America/Bogota',
  lima: 'America/Lima',
  santiago: 'America/Santiago',
  montevideo: 'America/Montevideo',
  quito: 'America/Guayaquil',
  caracas: 'America/Caracas',
  georgetown: 'America/Guyana',
  kingston: 'America/Jamaica',
  san_juan: 'America/Puerto_Rico',
  nassau: 'America/Nassau',
  barbados: 'America/Barbados',
  glasgow: 'Europe/London',
  manchester: 'Europe/London',
  birmingham: 'Europe/London',
  dublin: 'Europe/Dublin',
  belgrade: 'Europe/Belgrade',
  sofia: 'Europe/Sofia',
  bucharest: 'Europe/Bucharest',
  naples: 'Europe/Rome',
  valencia: 'Europe/Madrid',
  barcelona: 'Europe/Madrid',
  porto: 'Europe/Lisbon',
  lyon: 'Europe/Paris',
  marseille: 'Europe/Paris',
  hamburg: 'Europe/Berlin',
  munich: 'Europe/Berlin',
  frankfurt: 'Europe/Berlin',
  cologne: 'Europe/Berlin',
  dusseldorf: 'Europe/Berlin',
  stuttgart: 'Europe/Berlin',
  copenhagen: 'Europe/Copenhagen',
  aarhus: 'Europe/Copenhagen',
  bergen: 'Europe/Oslo',
  trondheim: 'Europe/Oslo',
  gothenburg: 'Europe/Stockholm',
  malmo: 'Europe/Stockholm',
  tampere: 'Europe/Helsinki',
  bratislava: 'Europe/Bratislava',
  ljubljana: 'Europe/Ljubljana',
  zagreb: 'Europe/Zagreb',
  sarajevo: 'Europe/Sarajevo',
  skopje: 'Europe/Skopje',
  tbilisi: 'Asia/Tbilisi',
  yerevan: 'Asia/Yerevan',
  baku: 'Asia/Baku',
  galway: 'Europe/Dublin',
  corfu: 'Europe/Athens',
  thessaloniki: 'Europe/Athens',
}

function resolveTimezone(input: string): string | null {
  const key = input.trim().toLowerCase().replace(/[\s._-]+/g, '_')
  const known = CITY_TO_TZ[key]
  if (known) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: known })
      return known
    } catch {
      return null
    }
  }
  const candidate = input.trim()
  if (!candidate) return null
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: candidate })
    return candidate
  } catch {
    return null
  }
}

function formatDisplay(date: Date, timezone: string): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function formatCopy(date: Date, timezone: string): string {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date)
  const h = p.find((x) => x.type === 'hour')?.value ?? '00'
  const m = p.find((x) => x.type === 'minute')?.value ?? '00'
  const s = p.find((x) => x.type === 'second')?.value ?? '00'
  return `${h}:${m}:${s}`
}

function formatOffset(timezone: string, date: Date): string {
  try {
    const p = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      timeZoneName: 'longOffset',
    }).formatToParts(date)
    const raw = p.find((x) => x.type === 'timeZoneName')?.value ?? ''
    const m = /^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(raw)
    if (m) return `UTC${m[1]}${m[2].padStart(2, '0')}:${m[3] ?? '00'}`
  } catch {
    // fall through
  }
  return 'UTC+00:00'
}

function formatZoneDate(date: Date, timezone: string): string {
  const p = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const y = p.find((x) => x.type === 'year')?.value ?? ''
  const mo = p.find((x) => x.type === 'month')?.value ?? ''
  const d = p.find((x) => x.type === 'day')?.value ?? ''
  return `${y}-${mo}-${d}`
}

function ZoneClock({ timezone }: { timezone: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const draw = () => {
      el.textContent = formatDisplay(new Date(), timezone)
    }
    draw()
    const id = window.setInterval(draw, 250)
    return () => window.clearInterval(id)
  }, [timezone])
  return (
    <span className="lc-mono" ref={ref}>
      {formatDisplay(new Date(), timezone)}
    </span>
  )
}

export function App() {
  const { state, actions } = useCollection<ZoneData>({ storageKey: STORAGE_KEY })
  const zones = state.activeItems.map((item) => ({ id: item.id, ...item.data }))
  const [name, setName] = useState('')
  const [timezone, setTimezone] = useState('')
  const [nameError, setNameError] = useState<string | null>(null)
  const [tzError, setTzError] = useState<string | null>(null)
  const [tab, setTab] = useState('Clocks')
  const [tick, setTick] = useState(0)
  const [sortAsc, setSortAsc] = useState(true)
  const { copied, copy } = useClipboard()

  // Refresh offsets + status + copy source once a second. The visible clocks
  // (ZoneClock) tick on their own; everything below just needs to stay fresh.
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => window.clearInterval(id)
  }, [])

  void tick
  const now = new Date()

  function addZone() {
    const trimmedName = name.trim()
    const trimmedTz = timezone.trim()
    if (!trimmedName) {
      setNameError('Enter a zone name.')
      return
    }
    let resolvedTz: string | null = null
    if (trimmedTz) {
      resolvedTz = resolveTimezone(trimmedTz)
      if (!resolvedTz) {
        setTzError('Unknown time zone. Use an IANA name like Europe/Paris.')
        return
      }
    } else {
      resolvedTz = resolveTimezone(trimmedName)
      if (!resolvedTz) {
        setTzError('Could not find a zone for that name. Try an IANA name like Europe/Lisbon.')
        return
      }
    }
    const existing = zones.find(
      (z) =>
        z.timezone.toLowerCase() === resolvedTz!.toLowerCase() ||
        z.name.toLowerCase() === trimmedName.toLowerCase(),
    )
    if (existing) {
      setNameError(`You already track ${existing.name}.`)
      return
    }
    actions.add({ name: trimmedName, timezone: resolvedTz! })
    setName('')
    setTimezone('')
    setNameError(null)
    setTzError(null)
  }

  function removeZone(id: string) {
    actions.remove(id)
  }

  const list = zones.map((z) => {
    const safe = (fn: () => string, fallback: string) => {
      try {
        return fn()
      } catch {
        return fallback
      }
    }
    return {
      id: z.id,
      name: z.name,
      timezone: z.timezone,
      offset: safe(() => formatOffset(z.timezone, now), '—'),
      date: safe(() => formatZoneDate(now, z.timezone), '—'),
      copyTime: safe(() => formatCopy(now, z.timezone), '--:--:--'),
    }
  })
  const rows = [...list].sort((a, b) =>
    sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name),
  )

  const copyText = rows.map((r) => `${r.name}: ${r.copyTime}`).join('\n')

  const columns = [
    {
      key: 'name',
      label: (
        <button type="button" className="lc-link" onClick={() => setSortAsc((v) => !v)}>
          Zone{sortAsc ? ' ↑' : ' ↓'}
        </button>
      ),
    },
    { key: 'offset', label: 'UTC offset', num: true },
  ]

  return (
    <AppShell
      name="World Clock"
      icon="calendar"
      hue="teal"
      category="Productivity"
      meta={`${zones.length} zones`}
      status={
        <>
          <span className="lc-accent">{toISODate(now)}</span>
          <span>local</span>
          <span>live</span>
        </>
      }
      actions={
        <Button kind="secondary" onClick={() => void copy(copyText)} disabled={zones.length === 0}>
          {copied ? 'Copied' : 'Copy times'}
        </Button>
      }
      side={
        <Rail
          title="World Clock"
          note="Live zone clocks · local"
          chips={['Add any city', 'Live offset table', 'Copy all times', 'Zones stay on device']}
        />
      }
    >
      <Card title="Add a zone" mono="name + IANA time zone">
        <FormGrid>
          <TextInput
            label="Zone name"
            value={name}
            placeholder="Lisbon"
            onChange={setName}
            error={nameError}
          />
          <TextInput
            label="Time zone"
            value={timezone}
            placeholder="IANA time zone, like Europe/Lisbon"
            onChange={setTimezone}
            error={tzError}
          />
        </FormGrid>
        <Actions>
          <Button kind="primary" onClick={addZone}>
            Add zone
          </Button>
        </Actions>
      </Card>

      <div role="tablist" aria-label="View" className="lc-tabs">
        {(['Clocks', 'Offsets'] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            className={`wc-tab${tab === t ? ' active' : ''}`}
            style={{ color: 'var(--ink-80)' }}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>

      <div role="tabpanel" aria-label={tab}>
      {tab === 'Clocks' ? (
        zones.length === 0 ? (
          <EmptyState title="No zones yet" detail="Add a city above and its clock will start ticking here." />
        ) : (
          <ul className="lk-list" aria-label="Zones">
            {zones.map((z) => (
              <li key={z.id} className="lk-row" aria-label={z.name}>
                <span className="lk-row-text">
                  <span className="lk-row-title">{z.name}</span>
                  <span className="lk-row-meta">
                    <span className="lc-mono">{(() => { try { return formatOffset(z.timezone, now) } catch { return '—' } })()}</span>{' '}
                    <span className="lc-mono">{(() => { try { return formatZoneDate(now, z.timezone) } catch { return '—' } })()}</span>
                  </span>
                </span>
                <span className="lk-row-value"><ZoneClock timezone={z.timezone} /></span>
                <Button kind="ghost" ariaLabel={`Remove ${z.name}`} onClick={() => removeZone(z.id)}>
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        )
      ) : (
        <Table
          label="UTC offsets"
          columns={columns}
          rows={rows.map((r) => ({
            cells: {
              name: r.name,
              offset: <span className="lc-mono">{r.offset}</span>,
            },
          }))}
          empty={
            zones.length === 0 ? (
              <EmptyState title="No zones yet" detail="Add a city above to see its offset here." />
            ) : undefined
          }
          foot={{
            name: (
              <span className="lc-mono">
                {rows.length} zones · sorted {sortAsc ? 'A–Z' : 'Z–A'}
              </span>
            ),
            offset: null,
          }          }
        />
      )}
      </div>
    </AppShell>
  )
}

export default App
