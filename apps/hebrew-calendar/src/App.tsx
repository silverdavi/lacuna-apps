// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useMemo, useState } from 'react'
import { AppShell, Pills } from '@lacuna/ui'
import { anniversaryStore, settings, TABS, type Tab } from './host'
import { hebrewFromFixed, monthName } from './hebrew'
import type { Where } from './holidays'
import { todayRd } from './shared'
import { TodayTab } from './TodayTab'
import { ConvertTab } from './ConvertTab'
import { CalendarTab } from './CalendarTab'
import { AnniversariesTab } from './AnniversariesTab'
import { YearTab } from './YearTab'

const WHERE_ITEMS = ['Diaspora', 'Israel']

export function App() {
  const initial = useMemo(() => settings.read(), [])
  const [tab, setTab] = useState<Tab>(initial.tab)
  const [where, setWhere] = useState<Where>(initial.where)
  const store = useMemo(() => anniversaryStore(), [])
  const today = useMemo(() => todayRd(), [])
  const h = hebrewFromFixed(today)

  function pickTab(t: string) {
    setTab(t as Tab)
    settings.write({ tab: t as Tab, where })
  }
  function pickWhere(w: string) {
    const next: Where = w === 'Israel' ? 'israel' : 'diaspora'
    setWhere(next)
    settings.write({ tab, where: next })
  }

  return (
    <AppShell name="Hebrew Calendar" icon="calendar" hue="blue" category="Calculate"
      meta={`${h.day} ${monthName(h.year, h.month)} ${h.year}`}>
      <div className="hc-top">
        <div className="hc-tabs" role="tablist" aria-label="Sections">
          {TABS.map((t) => (
            <button key={t} type="button" role="tab" aria-selected={tab === t} className="hc-tab" onClick={() => pickTab(t)}>{t}</button>
          ))}
        </div>
        <Pills items={WHERE_ITEMS} active={where === 'israel' ? 'Israel' : 'Diaspora'} onSelect={pickWhere} />
      </div>
      {tab === 'Today' && <TodayTab rd={today} where={where} />}
      {tab === 'Convert' && <ConvertTab today={today} />}
      {tab === 'Calendar' && <CalendarTab today={today} where={where} />}
      {tab === 'Anniversaries' && <AnniversariesTab store={store} today={today} />}
      {tab === 'Year' && <YearTab startYear={h.year} where={where} />}
    </AppShell>
  )
}
