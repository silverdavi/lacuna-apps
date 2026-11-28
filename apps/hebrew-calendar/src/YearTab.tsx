// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { useState } from 'react'
import { Actions, Body, Button, Card, Checkbox, Kpi, KpiRow, Stack, Table, Tag, TextInput } from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import {
  MAX_YEAR, MIN_YEAR, WEEKDAYS, gematria, gematriaYear, hebrewFromFixed, isoFromFixed, monthName, weekday, yearFacts,
} from './hebrew'
import { holidaysOfYear, kindLabel, type Where } from './holidays'
import { Heb, csvCell, longDate, shortDate } from './shared'

const KIND_NAME = { deficient: 'Deficient (chaserah)', regular: 'Regular (kesidrah)', complete: 'Complete (shlemah)' }

export function YearTab({ startYear, where }: { startYear: number; where: Where }) {
  const [text, setText] = useState(String(startYear))
  const [showRC, setShowRC] = useState(false)
  const y = Number(text)
  const ok = Number.isInteger(y) && y >= MIN_YEAR && y <= MAX_YEAR
  const step = (n: number) => setText(String(Math.min(MAX_YEAR, Math.max(MIN_YEAR, (ok ? y : startYear) + n))))

  if (!ok) {
    return (
      <Card mono="Year" title="Hebrew year">
        <Stack>
          <TextInput label="Hebrew year" type="number" inputMode="numeric" value={text} onChange={setText}
            error={`Enter a year from ${MIN_YEAR} to ${MAX_YEAR}.`} />
        </Stack>
      </Card>
    )
  }

  const f = yearFacts(y)
  const full = holidaysOfYear(y, where)
  const list = showRC ? full : full.filter((h) => h.kind !== 'rosh-chodesh')
  const rows = list.map((h) => {
    const hd = hebrewFromFixed(h.rd)
    return { h, hd }
  })

  function exportCsv() {
    const lines = ['Hebrew year,Holiday,Hebrew date,Gregorian date,Weekday,Kind']
    for (const h of full) {
      const hd = hebrewFromFixed(h.rd)
      lines.push([y, h.name, `${hd.day} ${monthName(hd.year, hd.month)} ${hd.year}`, isoFromFixed(h.rd), WEEKDAYS[weekday(h.rd)], kindLabel(h.kind)].map(csvCell).join(','))
    }
    saveText(lines.join('\n') + '\n', { filename: `hebrew-year-${y}-${where}.csv`, mimeType: 'text/csv' })
  }

  return (
    <Stack>
      <Card mono="Year" title={`Year ${y}`}>
        <Stack>
          <div className="hc-yearbar">
            <Button onClick={() => step(-1)} ariaLabel="Previous year">Previous</Button>
            <TextInput label="Hebrew year" type="number" inputMode="numeric" value={text} onChange={setText} />
            <Button onClick={() => step(1)} ariaLabel="Next year">Next</Button>
          </div>
          <Heb className="hc-result-he">{gematriaYear(y)}</Heb>
          <KpiRow>
            <Kpi value={f.leap ? 'Leap' : 'Common'} label={`${f.months} months`} accent />
            <Kpi value={f.days} label="Days" />
            <Kpi value={KIND_NAME[f.kind].split(' ')[0]} label="Year type" />
          </KpiRow>
          <ul className="hc-facts">
            <li>Type: {KIND_NAME[f.kind]}. Heshvan has {f.heshvanDays} days and Kislev {f.kislevDays}.</li>
            <li>Rosh Hashana falls on {WEEKDAYS[f.roshHashanaWeekday]}, {longDate(f.roshHashanaRd, false)}.</li>
            <li>The year runs from {longDate(f.roshHashanaRd, false)} to {longDate(f.endRd, false)}.</li>
            {f.leap && <li>Adar I has 30 days and Adar II has 29. Purim is in Adar II.</li>}
          </ul>
        </Stack>
      </Card>
      <Card mono={where === 'israel' ? 'Israel' : 'Diaspora'} title="Holidays this year"
        actions={<Actions><Button onClick={exportCsv}>Export CSV</Button></Actions>}>
        <Body sm>Dates use the {where === 'israel' ? 'Israel' : 'Diaspora'} calendar. Fasts and holidays begin the evening before.</Body>
        <Checkbox label="Include Rosh Chodesh" checked={showRC} onChange={setShowRC} />
        <div className="hc-scroll">
          <Table
            label={`Holidays of ${y}`}
            columns={[
              { key: 'name', label: 'Holiday' },
              { key: 'heb', label: 'Hebrew date' },
              { key: 'greg', label: 'Date' },
              { key: 'wd', label: 'Day' },
            ]}
            rows={rows.map(({ h, hd }) => ({
              cells: {
                name: <span>{h.name} <Tag>{kindLabel(h.kind)}</Tag></span>,
                heb: <span>{hd.day} {monthName(hd.year, hd.month)} <Heb>{gematria(hd.day)}</Heb></span>,
                greg: shortDate(h.rd),
                wd: WEEKDAYS[weekday(h.rd)],
              },
            }))}
          />
        </div>
      </Card>
    </Stack>
  )
}
