import { useEffect, useMemo, useRef, useState } from 'react'
import { AppShell, Body, Button, Card, KpiRow, Kpi, MonoLabel, Pills, Stack, Table, Tabs, Tag, TextInput } from '@lacuna/ui'
import { host } from './host'
import type { ScanFilter, Tab } from './host'
import {
  MAX_DIGITS,
  TimeoutError,
  TooLargeError,
  analyze,
  formatFactors,
  parseInput,
  type Analysis,
} from './nt'
import {
  MAX_UPPER,
  MAX_WIDTH,
  carmichaelSegment,
  formatNumberFactors,
  scanRow,
  sieveSegment,
  smallPrimes,
  type ScanRow,
} from './scan'

const TABS: Tab[] = ['Number', 'Scan', 'Carmichael', 'About']
const EXAMPLES = ['561', '85', '1105', '1729', '341', '15', '97']
const FILTERS: ScanFilter[] = ['Primes', 'Carmichael', 'Radimichael', 'k-Lehmer', 'Fermat-2']
const LIMITS = ['10^4', '10^5', '10^6']
const LIMIT_VALUE: Record<string, number> = { '10^4': 10_000, '10^5': 100_000, '10^6': 1_000_000 }

const nextTick = () => new Promise<void>((r) => setTimeout(r, 0))
const commas = (n: bigint | number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')

type Outcome =
  | { kind: 'idle' }
  | { kind: 'working' }
  | { kind: 'ok'; a: Analysis }
  | { kind: 'timeout' }
  | { kind: 'large' }

function verdictTag(yes: boolean | null) {
  if (yes === null) return <Tag>n/a</Tag>
  return yes ? <Tag accent>Yes</Tag> : <Tag>No</Tag>
}

function Rung({ name, yes, why }: { name: string; yes: boolean | null; why: string }) {
  return (
    <li className="te-rung">
      <span>{verdictTag(yes)}</span>
      <span className="te-rung-name">{name}</span>
      <span className="te-rung-why">{why}</span>
    </li>
  )
}

function Ladder({ a }: { a: Analysis }) {
  const nm1 = a.n - 1n
  const comp = !a.prime
  const na = 'n is prime, so this composite-number test does not apply.'
  const lehmerWhy = a.lehmer
    ? 'phi(n) divides n-1. This would be a composite Lehmer number, and none is known.'
    : `phi(n) = ${commas(a.phi)} does not divide n-1 = ${commas(nm1)} (remainder ${commas(nm1 % a.phi)}).`
  const carmichaelWhy = a.carmichael
    ? `lambda(n) = ${commas(a.lambda)} divides n-1, so every base coprime to n passes the Fermat test.`
    : `lambda(n) = ${commas(a.lambda)} leaves remainder ${commas(nm1 % a.lambda)} when dividing n-1.`
  const bad = a.korseltRows.find((r) => !r.ok)
  const korseltWhy = a.korselt
    ? 'n is squarefree and p-1 divides n-1 for every prime p dividing n.'
    : bad && bad.exp > 1
      ? `${bad.p}^2 divides n, so n is not squarefree.`
      : bad
        ? `For p = ${bad.p}, p-1 = ${commas(bad.pMinus1)} does not divide n-1.`
        : 'n is not composite.'
  const radWhy = a.radimichael
    ? 'Every prime factor of phi(n) also divides n-1.'
    : 'Some prime factor of phi(n) does not divide n-1.'
  const kWhy =
    a.kLehmer !== null
      ? `phi(n) first divides (n-1)^k at k = ${a.kLehmer}.`
      : 'phi(n) divides none of (n-1)^1 through (n-1)^8.'
  const f2 = a.fermatRows[0]
  const fermatWhy = a.fermat2
    ? '2^(n-1) = 1 mod n although n is composite, so n fools the base-2 Fermat test.'
    : f2.pass
      ? 'Only primes pass here, so this does not count as a pseudoprime.'
      : `2^(n-1) mod n = ${commas(f2.power)}, not 1, so base 2 exposes n as composite.`
  return (
    <ol className="te-ladder" aria-label="Verdict ladder">
      <Rung name="Prime" yes={a.prime} why={a.prime ? 'n has no divisors besides 1 and itself.' : `n factors as ${formatFactors(a.factors)}.`} />
      <Rung name="Lehmer" yes={comp ? a.lehmer : null} why={comp ? lehmerWhy : na} />
      <Rung name="Carmichael" yes={comp ? a.carmichael : null} why={comp ? carmichaelWhy : na} />
      <Rung name="Korselt" yes={comp ? a.korselt : null} why={comp ? korseltWhy : na} />
      <Rung name="Radimichael" yes={comp ? a.radimichael : null} why={comp ? radWhy : na} />
      <Rung name="k-Lehmer (k up to 8)" yes={comp ? a.kLehmer !== null : null} why={comp ? kWhy : na} />
      <Rung name="Fermat pseudoprime, base 2" yes={comp ? a.fermat2 : null} why={comp ? fermatWhy : na} />
    </ol>
  )
}

function NumberTab({ input, setInput }: { input: string; setInput: (v: string) => void }) {
  const parsed = useMemo(() => parseInput(input), [input])
  const [out, setOut] = useState<Outcome>({ kind: 'idle' })

  useEffect(() => {
    if (parsed.kind === 'large') {
      setOut({ kind: 'large' })
      return
    }
    if (parsed.kind !== 'ok') {
      setOut({ kind: 'idle' })
      return
    }
    setOut({ kind: 'working' })
    const id = setTimeout(() => {
      try {
        setOut({ kind: 'ok', a: analyze(parsed.n) })
      } catch (e) {
        setOut(e instanceof TooLargeError ? { kind: 'large' } : e instanceof TimeoutError ? { kind: 'timeout' } : { kind: 'idle' })
      }
    }, 200)
    return () => clearTimeout(id)
  }, [parsed])

  function random() {
    const digits = 3 + Math.floor(Math.random() * 10)
    let s = String(1 + Math.floor(Math.random() * 9))
    for (let i = 1; i < digits; i++) s += String(Math.floor(Math.random() * 10))
    setInput(s)
  }

  const clean = input.replace(/[,\s_]/g, '')
  let error: string | null = null
  if (parsed.kind === 'invalid') error = 'Digits only, please. Commas are fine.'
  const message =
    parsed.kind === 'empty'
      ? 'Type a whole number, or pick an example, to see phi(n), lambda(n) and the verdicts.'
      : parsed.kind === 'small'
        ? 'n must be at least 2. The totient tests start at 2.'
        : parsed.kind === 'large' || out.kind === 'large'
          ? `That number is too large. This tool takes at most ${MAX_DIGITS} digits (up to 10^24).`
          : out.kind === 'timeout'
            ? 'Factoring took longer than 2 seconds, so the work was stopped. Try a number with a smaller second-largest prime factor.'
            : null

  return (
    <Stack lg>
      <Card mono="Number" title="Pick a number">
        <Stack>
          <div className="te-row">
            <TextInput label="Whole number" value={input} onChange={setInput} inputMode="numeric" placeholder="For example 561" error={error} />
            <Button onClick={random}>Random</Button>
          </div>
          <Pills items={EXAMPLES} active={clean} onSelect={setInput} />
        </Stack>
      </Card>
      {message && (
        <Card mono="Note" title="Nothing to show yet">
          <div className="te-msg" role="status">{message}</div>
        </Card>
      )}
      {out.kind === 'working' && <div className="te-msg" role="status">Working it out...</div>}
      {out.kind === 'ok' && parsed.kind === 'ok' && <Result a={out.a} />}
    </Stack>
  )
}

function Result({ a }: { a: Analysis }) {
  const fraction = a.indexInteger ? `${commas(a.indexNum)}` : `${commas(a.indexNum)}/${commas(a.indexDen)}`
  return (
    <>
      <Card mono="Result" title={`n = ${commas(a.n)}`}>
        <Stack>
          <div className="te-kpis">
            <KpiRow>
              <Kpi value={commas(a.n)} label="n" />
              <Kpi value={commas(a.phi)} label="phi(n)" accent />
              <Kpi value={commas(a.lambda)} label="lambda(n)" />
              <Kpi value={fraction} label={`Lehmer index, ${a.indexDecimal}`} />
            </KpiRow>
          </div>
          <MonoLabel>Factorization</MonoLabel>
          <div className="te-factors">{a.prime ? `${a.n} (prime)` : formatFactors(a.factors)}</div>
        </Stack>
      </Card>
      <Card mono="Verdicts" title="Strongest to weakest">
        <Ladder a={a} />
      </Card>
      {!a.prime && (
        <Card mono="Korselt" title="Per-prime check">
          <Table
            label="Korselt per-prime check"
            columns={[
              { key: 'p', label: 'Prime p', num: true },
              { key: 'e', label: 'Exponent', num: true },
              { key: 'm', label: 'p-1', num: true },
              { key: 'r', label: '(n-1) mod (p-1)', num: true },
              { key: 'ok', label: 'Check' },
            ]}
            rows={a.korseltRows.map((r) => ({
              cells: {
                p: commas(r.p),
                e: r.exp,
                m: commas(r.pMinus1),
                r: commas(r.rem),
                ok: <Tag accent={r.ok}>{r.ok ? 'Pass' : r.exp > 1 ? 'Repeated' : 'Fail'}</Tag>,
              },
            }))}
          />
        </Card>
      )}
      <Card mono="Fermat" title="Witnesses for bases 2 to 13">
        <Table
          label="Fermat witnesses"
          columns={[
            { key: 'a', label: 'Base a', num: true },
            { key: 'pw', label: 'a^(n-1) mod n', num: true },
            { key: 'g', label: 'gcd(a, n)', num: true },
            { key: 'res', label: 'Result' },
          ]}
          rows={a.fermatRows.map((r) => ({
            cells: {
              a: r.a,
              pw: <span className="te-mono">{commas(r.power)}</span>,
              g: commas(r.g),
              res: <Tag accent={r.pass}>{r.pass ? 'Pass' : r.g > 1n ? 'Fail, shares a factor' : 'Fail'}</Tag>,
            },
          }))}
        />
      </Card>
    </>
  )
}

interface ScanState {
  status: 'idle' | 'running' | 'done' | 'error'
  progress: number
  error?: string
  rows: ScanRow[]
  scanned: number
  composites: number
  counts: Record<ScanFilter, number>
}

const EMPTY_COUNTS: Record<ScanFilter, number> = { Primes: 0, Carmichael: 0, Radimichael: 0, 'k-Lehmer': 0, 'Fermat-2': 0 }
const EMPTY_SCAN: ScanState = { status: 'idle', progress: 0, rows: [], scanned: 0, composites: 0, counts: EMPTY_COUNTS }

const matches = (r: ScanRow, f: ScanFilter) =>
  f === 'Primes' ? r.prime : f === 'Carmichael' ? r.carmichael : f === 'Radimichael' ? r.radimichael : f === 'k-Lehmer' ? r.k !== null && r.k <= 3 : r.fermat2

const MAX_SHOWN = 500

function ScanTab({ from, to, filter, setFrom, setTo, setFilter }: {
  from: string
  to: string
  filter: ScanFilter
  setFrom: (v: string) => void
  setTo: (v: string) => void
  setFilter: (v: ScanFilter) => void
}) {
  const [scan, setScan] = useState<ScanState>(EMPTY_SCAN)
  const token = useRef(0)
  const lo = Number(from.replace(/[,\s_]/g, ''))
  const hi = Number(to.replace(/[,\s_]/g, ''))
  let error: string | null = null
  if (!Number.isInteger(lo) || !Number.isInteger(hi) || from.trim() === '' || to.trim() === '') error = 'From and to must be whole numbers.'
  else if (lo < 2) error = 'The range starts at 2.'
  else if (hi < lo) error = 'To must be at least From.'
  else if (hi > MAX_UPPER) error = `The upper bound is ${commas(MAX_UPPER)}.`
  else if (hi - lo + 1 > MAX_WIDTH) error = `The range can hold at most ${commas(MAX_WIDTH)} numbers.`

  async function run() {
    if (error) return
    const mine = ++token.current
    setScan({ ...EMPTY_SCAN, status: 'running', counts: { ...EMPTY_COUNTS } })
    const primes = smallPrimes(Math.ceil(Math.sqrt(hi)) + 1)
    const rows: ScanRow[] = []
    const counts = { ...EMPTY_COUNTS }
    let composites = 0
    const step = 10000
    for (let s = lo; s <= hi; s += step) {
      const e = Math.min(hi, s + step - 1)
      const fac = sieveSegment(s, e, primes)
      for (let i = 0; i < fac.length; i++) {
        const r = scanRow(s + i, fac[i])
        if (!r.prime) composites++
        let keep = false
        for (const f of FILTERS) {
          if (matches(r, f)) {
            counts[f]++
            keep = true
          }
        }
        if (keep) rows.push(r)
      }
      await nextTick()
      if (mine !== token.current) return
      setScan((p) => ({ ...p, progress: (e - lo + 1) / (hi - lo + 1) }))
    }
    setScan({ status: 'done', progress: 1, rows, scanned: hi - lo + 1, composites, counts })
  }

  useEffect(() => {
    run()
    return () => {
      token.current++
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const shown = useMemo(() => scan.rows.filter((r) => matches(r, filter)), [scan.rows, filter])

  function exportCsv() {
    const lines = ['n,factorization,phi,prime,carmichael,radimichael,k_lehmer,fermat_pseudoprime_base_2']
    for (const r of shown) {
      lines.push([r.n, formatNumberFactors(r.factors), r.phi, r.prime, r.carmichael, r.radimichael, r.k ?? '', r.fermat2].join(','))
    }
    host.saveText(`totient-${from}-${to}-${filter.toLowerCase()}.csv`, lines.join('\n') + '\n')
  }

  return (
    <Stack lg>
      <Card mono="Scan" title="Range to scan">
        <Stack>
          <div className="te-row">
            <TextInput label="From" value={from} onChange={setFrom} inputMode="numeric" />
            <TextInput label="To" value={to} onChange={setTo} inputMode="numeric" />
            <Button kind="primary" onClick={run} disabled={Boolean(error) || scan.status === 'running'}>Scan range</Button>
          </div>
          {error ? <div className="te-msg" role="alert">{error}</div> : <span className="te-note">Up to {commas(MAX_WIDTH)} numbers at a time, up to {commas(MAX_UPPER)}.</span>}
          {scan.status === 'running' && (
            <div className="te-progress" role="progressbar" aria-label="Scan progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(scan.progress * 100)}>
              <div style={{ width: `${Math.round(scan.progress * 100)}%` }} />
            </div>
          )}
        </Stack>
      </Card>
      {scan.status === 'done' && (
        <Card mono="Counts" title={`${commas(scan.scanned)} numbers scanned`}>
          <div className="te-kpis">
            <KpiRow>
              <Kpi value={commas(scan.counts.Primes)} label="Primes" />
              <Kpi value={commas(scan.counts.Carmichael)} label="Carmichael" accent />
              <Kpi value={commas(scan.counts.Radimichael)} label="Radimichael" />
              <Kpi value={commas(scan.counts['k-Lehmer'])} label="k-Lehmer, k up to 3" />
              <Kpi value={commas(scan.counts['Fermat-2'])} label="Fermat-2 pseudoprimes" />
              <Kpi value="0" label="Lehmer" />
            </KpiRow>
          </div>
        </Card>
      )}
      <Card
        mono="Results"
        title="Matching numbers"
        actions={<Button kind="ghost" onClick={exportCsv} disabled={shown.length === 0}>Export CSV</Button>}
      >
        <Stack>
          <Pills items={FILTERS} active={filter} onSelect={(v) => setFilter(v as ScanFilter)} />
          {scan.status === 'done' && shown.length > MAX_SHOWN && <span className="te-note">Showing the first {MAX_SHOWN} of {commas(shown.length)}. The CSV has all of them.</span>}
          <div className="te-scroll">
            <Table
              label="Scan results"
              empty={scan.status === 'running' ? 'Scanning...' : 'No numbers in this range match.'}
              columns={[
                { key: 'n', label: 'n', num: true },
                { key: 'f', label: 'Factorization' },
                { key: 'phi', label: 'phi(n)', num: true },
                { key: 'v', label: 'Verdicts' },
              ]}
              rows={shown.slice(0, MAX_SHOWN).map((r) => ({
                cells: {
                  n: commas(r.n),
                  f: <span className="te-mono">{r.prime ? 'prime' : formatNumberFactors(r.factors)}</span>,
                  phi: commas(r.phi),
                  v: (
                    <span className="te-tags">
                      {r.prime && <Tag>Prime</Tag>}
                      {r.carmichael && <Tag accent>Carmichael</Tag>}
                      {r.radimichael && <Tag>Radimichael</Tag>}
                      {r.k !== null && <Tag>{`k = ${r.k}`}</Tag>}
                      {r.fermat2 && <Tag>Fermat-2</Tag>}
                    </span>
                  ),
                },
              }))}
            />
          </div>
        </Stack>
      </Card>
    </Stack>
  )
}

function CarmichaelTab({ limit, setLimit }: { limit: string; setLimit: (v: string) => void }) {
  const [rows, setRows] = useState<{ n: number; factors: [number, number][] }[]>([])
  const [progress, setProgress] = useState(0)
  const [done, setDone] = useState(false)

  useEffect(() => {
    let live = true
    setRows([])
    setDone(false)
    setProgress(0)
    const max = LIMIT_VALUE[limit] ?? 100_000
    ;(async () => {
      const primes = smallPrimes(Math.ceil(Math.sqrt(max)) + 1)
      const acc: { n: number; factors: [number, number][] }[] = []
      const step = 50_000
      for (let s = 2; s <= max; s += step) {
        const e = Math.min(max, s + step - 1)
        acc.push(...carmichaelSegment(s, e, primes))
        await nextTick()
        if (!live) return
        setProgress(e / max)
      }
      setRows(acc)
      setDone(true)
    })()
    return () => {
      live = false
    }
  }, [limit])

  return (
    <Stack lg>
      <Card mono="Carmichael" title="Carmichael numbers up to a limit">
        <Stack>
          <Pills items={LIMITS} active={limit} onSelect={setLimit} />
          {!done && (
            <div className="te-progress" role="progressbar" aria-label="Progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <div style={{ width: `${Math.round(progress * 100)}%` }} />
            </div>
          )}
          <Body sm>
            {done ? `${rows.length} Carmichael numbers up to ${commas(LIMIT_VALUE[limit])}.` : 'Counting...'} Each one passes the Fermat test for every base coprime to it, yet is composite.
          </Body>
        </Stack>
      </Card>
      <Card mono="List" title="Numbers and factorizations">
        <div className="te-scroll">
          <Table
            label="Carmichael numbers"
            empty={done ? 'None found.' : 'Computing...'}
            columns={[
              { key: 'i', label: '#', num: true },
              { key: 'n', label: 'n', num: true },
              { key: 'f', label: 'Factorization' },
            ]}
            rows={rows.map((r, i) => ({ cells: { i: i + 1, n: commas(r.n), f: <span className="te-mono">{formatNumberFactors(r.factors)}</span> } }))}
          />
        </div>
      </Card>
    </Stack>
  )
}

function AboutTab() {
  return (
    <Stack lg>
      <Card mono="About" title="Lehmer's totient problem">
        <div className="te-prose">
          <Stack>
            <Body>
              Euler's totient, phi(n), counts the whole numbers from 1 to n that share no factor with n. For a prime p it is p-1, so phi(n) = n-1 happens exactly when n is prime.
            </Body>
            <Body>
              In 1932 D. H. Lehmer asked whether a weaker test still singles out the primes: if phi(n) divides n-1, must n be prime? A composite number that passes is called a Lehmer number. The ratio (n-1)/phi(n) is its Lehmer index, and it equals 1 for every prime.
            </Body>
            <Body>
              Nobody has found a composite example, and nobody has proved there is none. Lehmer compared the difficulty to the odd perfect number problem. Try 561 on the Number tab: it is a Carmichael number and fools many tests, but phi(561) = 320 does not divide 560.
            </Body>
            <Body>
              <strong>Open: no composite Lehmer number is known.</strong>
            </Body>
          </Stack>
        </div>
      </Card>
      <Card mono="Hierarchy" title="Each condition implies the next">
        <Stack>
          <div className="te-chain" role="img" aria-label="Lehmer implies Carmichael implies Korselt implies radimichael implies k-Lehmer">
            {['Lehmer', 'Carmichael', 'Korselt', 'Radimichael', 'k-Lehmer'].map((s, i) => (
              <span key={s} style={{ display: 'contents' }}>
                {i > 0 && <span className="te-arrow">{'=>'}</span>}
                <span className="te-step">{s}</span>
              </span>
            ))}
          </div>
          <Body sm>
            Lehmer: phi(n) divides n-1. Carmichael: lambda(n) divides n-1, where lambda is the exponent of the unit group. Korselt: n is squarefree and p-1 divides n-1 for every prime p dividing n. Radimichael: every prime dividing phi(n) divides n-1. k-Lehmer: phi(n) divides (n-1)^k for some k. Carmichael numbers and Korselt numbers are the same set; Korselt's 1899 criterion is the test the Number tab shows prime by prime. Infinitely many composites sit in the Carmichael and radimichael layers; the Lehmer layer is the one with no known member. 85 = 5 x 17 is radimichael and 3-Lehmer, but not Carmichael.
          </Body>
        </Stack>
      </Card>
      <Card mono="Timeline" title="What is settled">
        <div className="te-scroll">
          <Table
            label="Settled bounds"
            columns={[
              { key: 'y', label: 'Year' },
              { key: 'w', label: 'Who' },
              { key: 'r', label: 'Any composite Lehmer number must' },
            ]}
            rows={[
              { cells: { y: '1932', w: 'Lehmer', r: 'be odd and squarefree, with at least 7 prime factors' } },
              { cells: { y: '1980', w: 'Cohen and Hagis', r: 'have at least 14 prime factors and exceed 10^20' } },
              { cells: { y: '1988', w: 'Hagis', r: 'exceed 10^1,937,042 if 3 divides it' } },
            ]}
          />
        </div>
      </Card>
    </Stack>
  )
}

export function App() {
  const init = useMemo(() => host.load(), [])
  const [tab, setTab] = useState<Tab>(init.tab)
  const [input, setInput] = useState(init.input)
  const [from, setFrom] = useState(init.from)
  const [to, setTo] = useState(init.to)
  const [filter, setFilter] = useState<ScanFilter>(init.filter)
  const [limit, setLimit] = useState(init.limit)

  useEffect(() => {
    host.save({ tab, input, from, to, filter, limit })
  }, [tab, input, from, to, filter, limit])

  return (
    <AppShell name="Totient explorer" icon="school" hue="gold" category="Productivity" meta={tab}>
      <Tabs items={TABS} active={tab} onSelect={(v) => setTab(v as Tab)} />
      {tab === 'Number' && <NumberTab input={input} setInput={setInput} />}
      {tab === 'Scan' && <ScanTab from={from} to={to} filter={filter} setFrom={setFrom} setTo={setTo} setFilter={setFilter} />}
      {tab === 'Carmichael' && <CarmichaelTab limit={limit} setLimit={setLimit} />}
      {tab === 'About' && <AboutTab />}
    </AppShell>
  )
}

