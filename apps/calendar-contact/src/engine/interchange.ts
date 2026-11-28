// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { toCsv } from '@lacuna/csv-parse'

export type DomainMode = 'vcard' | 'ics' | 'geo'
export type TargetKind = 'csv' | 'json' | 'markdown' | 'gpx' | 'vcard' | 'ics'

export const SAMPLES: Record<DomainMode, string> = {
  vcard: `BEGIN:VCARD
VERSION:3.0
FN:Ada Lovelace
ORG:Analytical Engines Ltd
EMAIL:ada@example.org
TEL:+1-555-0101
END:VCARD
BEGIN:VCARD
VERSION:3.0
FN:Grace Hopper
ORG:Compiler Systems
EMAIL:grace@example.org
TEL:+1-555-0102
END:VCARD`,
  ics: `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Architecture Review
DTSTART:20261201T140000Z
DTEND:20261201T150000Z
LOCATION:Room 4B
END:VEVENT
BEGIN:VEVENT
SUMMARY:Release Readiness
DTSTART:20261203T163000Z
DTEND:20261203T171500Z
LOCATION:Main Hall
END:VEVENT
END:VCALENDAR`,
  geo: JSON.stringify(
    {
      type: 'FeatureCollection',
      features: [
        { type: 'Feature', properties: { name: 'Trailhead' }, geometry: { type: 'Point', coordinates: [-122.4194, 37.7749] } },
        { type: 'Feature', properties: { name: 'Ridge Overlook' }, geometry: { type: 'Point', coordinates: [-122.4312, 37.7815] } },
      ],
    },
    null,
    2,
  ),
}

export function parseVcards(raw: string): Array<Record<string, string>> {
  const blocks = raw.replace(/\r\n/g, '\n').split(/BEGIN:VCARD/i).slice(1)
  return blocks.map((b) => {
    const rec: Record<string, string> = { name: '', org: '', email: '', phone: '' }
    for (const line of b.split('\n')) {
      const idx = line.indexOf(':')
      if (idx < 0) continue
      const key = line.slice(0, idx).split(';')[0]!.trim().toUpperCase()
      const val = line.slice(idx + 1).trim()
      if (key === 'FN') rec.name = val
      else if (key === 'ORG') rec.org = val
      else if (key === 'EMAIL') rec.email = val
      else if (key === 'TEL') rec.phone = val
    }
    return rec
  })
}

export function parseIcsEvents(raw: string): Array<Record<string, string>> {
  const blocks = raw.replace(/\r\n/g, '\n').split(/BEGIN:VEVENT/i).slice(1)
  return blocks.map((b) => {
    const rec: Record<string, string> = { summary: '', start: '', end: '', location: '' }
    for (const line of b.split('\n')) {
      const idx = line.indexOf(':')
      if (idx < 0) continue
      const key = line.slice(0, idx).split(';')[0]!.trim().toUpperCase()
      const val = line.slice(idx + 1).trim()
      if (key === 'SUMMARY') rec.summary = val
      else if (key === 'DTSTART') rec.start = val
      else if (key === 'DTEND') rec.end = val
      else if (key === 'LOCATION') rec.location = val
    }
    return rec
  })
}

export function parseGeoPoints(raw: string): Array<Record<string, string>> {
  const trimmed = raw.trim()
  if (trimmed.startsWith('<')) {
    const doc = new DOMParser().parseFromString(trimmed, 'application/xml')
    return Array.from(doc.querySelectorAll('wpt, trkpt')).map((el, i) => ({
      name: el.querySelector('name')?.textContent ?? `Point ${i + 1}`,
      lat: el.getAttribute('lat') ?? '0',
      lon: el.getAttribute('lon') ?? '0',
    }))
  }
  const obj = JSON.parse(trimmed) as { features?: Array<{ properties?: { name?: string }; geometry?: { coordinates?: number[] } }> }
  return (obj.features ?? []).map((f, i) => ({
    name: f.properties?.name ?? `Point ${i + 1}`,
    lat: String(f.geometry?.coordinates?.[1] ?? 0),
    lon: String(f.geometry?.coordinates?.[0] ?? 0),
  }))
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function convertInterchange(
  raw: string,
  mode: DomainMode,
  target: TargetKind,
): { count: number; output: string; ext: string; mime: string } {
  const records =
    mode === 'vcard' ? parseVcards(raw) : mode === 'ics' ? parseIcsEvents(raw) : parseGeoPoints(raw)

  if (target === 'json') {
    return {
      count: records.length,
      output: JSON.stringify(records, null, 2),
      ext: 'json',
      mime: 'application/json;charset=utf-8',
    }
  }
  if (target === 'csv') {
    const headers = records.length > 0 ? Object.keys(records[0]!) : []
    const rows = records.map((r) => headers.map((h) => r[h] ?? ''))
    return {
      count: records.length,
      output: headers.length ? toCsv([headers, ...rows]) : '',
      ext: 'csv',
      mime: 'text/csv;charset=utf-8',
    }
  }
  if (target === 'gpx') {
    const wpts = records
      .map(
        (r) =>
          `  <wpt lat="${escapeXml(r.lat ?? '0')}" lon="${escapeXml(r.lon ?? '0')}"><name>${escapeXml(r.name ?? 'Waypoint')}</name></wpt>`,
      )
      .join('\n')
    const gpx = `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Lacuna">\n${wpts}\n</gpx>\n`
    return { count: records.length, output: gpx, ext: 'gpx', mime: 'application/gpx+xml;charset=utf-8' }
  }
  if (target === 'vcard') {
    const vcf = records
      .map(
        (r) =>
          `BEGIN:VCARD\nVERSION:3.0\nFN:${r.name ?? ''}\nORG:${r.org ?? ''}\nEMAIL:${r.email ?? ''}\nTEL:${r.phone ?? ''}\nEND:VCARD`,
      )
      .join('\n')
    return { count: records.length, output: vcf, ext: 'vcf', mime: 'text/vcard;charset=utf-8' }
  }
  if (target === 'ics') {
    const evs = records
      .map(
        (r) =>
          `BEGIN:VEVENT\nSUMMARY:${r.summary ?? r.name ?? 'Event'}\nDTSTART:${r.start ?? ''}\nDTEND:${r.end ?? ''}\nLOCATION:${r.location ?? ''}\nEND:VEVENT`,
      )
      .join('\n')
    return {
      count: records.length,
      output: `BEGIN:VCALENDAR\nVERSION:2.0\n${evs}\nEND:VCALENDAR\n`,
      ext: 'ics',
      mime: 'text/calendar;charset=utf-8',
    }
  }
  // Markdown summary
  const md = records
    .map((r) => `- **${r.name || r.summary || 'Item'}** — ${Object.entries(r).slice(1).map(([k, v]) => `${k}: ${v}`).join(' · ')}`)
    .join('\n')
  return { count: records.length, output: md, ext: 'md', mime: 'text/markdown;charset=utf-8' }
}
