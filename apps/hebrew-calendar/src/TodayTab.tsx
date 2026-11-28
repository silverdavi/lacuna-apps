// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna.
import { Body, Card, KpiRow, Kpi, MonoLabel, Stack, Table, Tag } from '@lacuna/ui'
import { hebrewFromFixed, formatHebrew, formatHebrewLetters, monthName, gematria } from './hebrew'
import { holidaysOn, omerDay, upcoming, kindLabel, type Where } from './holidays'
import { Heb, longDate } from './shared'

export function TodayTab({ rd, where }: { rd: number; where: Where }) {
  const h = hebrewFromFixed(rd)
  const todays = holidaysOn(rd, where)
  const next = upcoming(rd + 1, where, 3)
  const omer = omerDay(rd)
  return (
    <Stack>
      <Card mono="Today" title={formatHebrew(h)}>
        <div className="hc-hero">
          <Heb className="hc-hero-he">{formatHebrewLetters(h)}</Heb>
          <div className="hc-hero-greg">{longDate(rd)}</div>
          <div className="hc-hero-tags">
            {todays.length === 0 && <MonoLabel faint>No holiday today</MonoLabel>}
            {todays.map((t) => <Tag key={t.id} accent={t.kind === 'yom-tov'}>{t.name}</Tag>)}
          </div>
          <Body sm>The Hebrew day starts at sunset. After dark, use After sunset on the Convert tab.</Body>
        </div>
      </Card>
      {omer !== null && (
        <Card mono="Omer" title={`Day ${omer} of the Omer`}>
          <KpiRow>
            <Kpi value={omer} label="Day of 49" accent />
            <Kpi value={49 - omer} label="Days left" />
          </KpiRow>
          <Body sm>
            {omer} days, which is {Math.floor(omer / 7)} {Math.floor(omer / 7) === 1 ? 'week' : 'weeks'}
            {omer % 7 ? ` and ${omer % 7} ${omer % 7 === 1 ? 'day' : 'days'}` : ''}. Counted from 16 Nisan.
          </Body>
        </Card>
      )}
      <Card mono="Next" title="Upcoming holidays">
        <div className="hc-scroll">
          <Table
            label="Upcoming holidays"
            columns={[
              { key: 'name', label: 'Holiday' },
              { key: 'heb', label: 'Hebrew date' },
              { key: 'greg', label: 'Date' },
              { key: 'in', label: 'In', num: true },
            ]}
            rows={next.map((t) => {
              const th = hebrewFromFixed(t.rd)
              const left = t.rd - rd
              return {
                cells: {
                  name: <span>{t.name} <Tag>{kindLabel(t.kind)}</Tag></span>,
                  heb: <span>{th.day} {monthName(th.year, th.month)} <Heb>{gematria(th.day)}</Heb></span>,
                  greg: longDate(t.rd),
                  in: left === 1 ? 'tomorrow' : `${left} days`,
                },
              }
            })}
          />
        </div>
      </Card>
    </Stack>
  )
}
