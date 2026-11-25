import { useMemo, useState } from 'react'
import { AppShell, Actions, Button, Card, FormGrid, Kpi, KpiRow, List, Pills, Rail, Row, SectionLabel, Stack, Table, Tag, TextInput } from '@lacuna/ui'
import { Chart } from '@lacuna/chart'
import { ExportMenu } from '@lacuna/export-menu'
import { useClipboard } from '@lacuna/use-clipboard'
import { useLocalRecord } from '@lacuna/use-local-record'

type Subnet = {
  ip: string
  prefix: number
  network: string
  broadcast: string
  mask: string
  wildcard: string
  firstUsable: string
  lastUsable: string
  usableHosts: number
  totalHosts: number
}

function ipToNumber(ip: string): number | null {
  const m = ip.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (!m) return null
  const parts = m.slice(1).map(Number)
  if (parts.some((p) => p > 255)) return null
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0
}

function numberToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
}

function calculateSubnet(ip: string, prefix: number): Subnet | null {
  const addr = ipToNumber(ip)
  if (addr == null || prefix < 0 || prefix > 32) return null
  const ones = 32 - prefix
  const mask = ones === 0 ? 0 : ((~0 << ones) >>> 0)
  const network = (addr & mask) >>> 0
  const broadcast = mask === 0 ? 0xffffffff : ((network | (~mask >>> 0)) >>> 0)
  const totalHosts = prefix <= 1 ? 0 : 1 << ones
  const usableHosts = prefix <= 1 ? 0 : totalHosts - 2
  const firstUsable = prefix <= 1 ? numberToIp(network) : numberToIp(network + 1)
  const lastUsable = prefix <= 1 ? numberToIp(broadcast) : numberToIp(broadcast - 1)
  return {
    ip: ip.trim(),
    prefix,
    network: numberToIp(network),
    broadcast: numberToIp(broadcast),
    mask: numberToIp(mask),
    wildcard: numberToIp(mask === 0 ? 0 : (~mask >>> 0) >>> 0),
    firstUsable,
    lastUsable,
    usableHosts,
    totalHosts,
  }
}

function fmt(n: number): string {
  return String(n)
}

export function App() {
  const [ip, setIp] = useState('192.168.1.0')
  const [prefix, setPrefix] = useState('24')
  const [result, setResult] = useState<Subnet | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState('Result')
  const { value: items, set: setItems } = useLocalRecord<Subnet[]>({
    key: 'lacuna.subnet-calculator.saved',
    version: 1,
    defaultValue: [],
  })
  const { copied, copy } = useClipboard({ timeoutMs: 1500 })

  const chartData = useMemo(
    () => [
      { label: 'Usable', value: result?.usableHosts ?? 0 },
      { label: 'Reserved', value: (result?.totalHosts ?? 0) - (result?.usableHosts ?? 0) },
    ],
    [result],
  )

  function calculate() {
    const p = Number(prefix)
    if (Number.isNaN(p) || p < 0 || p > 32) {
      setResult(null)
      setError('Prefix length must be between 0 and 32.')
      return
    }
    const s = calculateSubnet(ip, p)
    if (s == null) {
      setResult(null)
      setError('Invalid IP address')
      return
    }
    setError(null)
    setResult(s)
    setTab('Result')
  }

  function save() {
    if (result == null) return
    setItems((prev) => (prev.some((i) => i.ip === result.ip && i.prefix === result.prefix) ? prev : [...prev, result]))
  }

  function remove(item: Subnet) {
    setItems((prev) => prev.filter((i) => !(i.ip === item.ip && i.prefix === item.prefix)))
  }

  const exportOptions = [
    {
      id: 'csv',
      label: 'CSV',
      mimeType: 'text/csv',
      extension: 'csv',
      getData: () => {
        const rows = items.map((i) => [i.ip, i.prefix, i.network, i.broadcast, i.mask, fmt(i.usableHosts)].join(','))
        return ['ip,prefix,network,broadcast,mask,usable_hosts', ...rows].join('\n')
      },
    },
    {
      id: 'json',
      label: 'JSON',
      mimeType: 'application/json',
      extension: 'json',
      getData: () => JSON.stringify(items, null, 2),
    },
  ]

  const breakdownRows = result
    ? [
        { cells: { field: 'Network', value: result.network } },
        { cells: { field: 'Broadcast', value: result.broadcast } },
        { cells: { field: 'Subnet Mask', value: result.mask } },
        { cells: { field: 'Wildcard Mask', value: result.wildcard } },
        { cells: { field: 'First Usable', value: result.firstUsable } },
        { cells: { field: 'Last Usable', value: result.lastUsable } },
        { cells: { field: 'Total Addresses', value: fmt(result.totalHosts) } },
        { cells: { field: 'Usable Hosts', value: fmt(result.usableHosts) } },
      ]
    : []

  return (
    <AppShell
      name="IP Subnet Calculator"
      icon="database"
      hue="teal"
      category="Tools"
      meta={`${items.length} saved`}
      status={
        error != null
          ? 'Input error'
          : result != null
            ? `Network ${result.network}`
            : 'Ready · enter an IP and prefix'
      }
      actions={
        <>
          {result != null && (
            <Button
              kind="secondary"
              onClick={() =>
                void copy(
                  `Network ${result.network}/${result.prefix}  Mask ${result.mask}  Broadcast ${result.broadcast}  Usable ${result.firstUsable}-${result.lastUsable}`,
                )
              }
            >
              {copied ? 'Copied' : 'Copy'}
            </Button>
          )}
          {items.length > 0 && <ExportMenu options={exportOptions} fileName="subnets" ariaLabel="Export list" />}
        </>
      }
      side={
        <Stack>
          <Rail
            title="Status"
            chips={
          result != null && items.length === 0
            ? [`/${result.prefix}`, result.mask]
            : ['idle']
            }
          >
            {result != null ? (
              <KpiRow>
                <Kpi value={fmt(result.usableHosts)} label="usable hosts" />
                <Kpi value={fmt(result.totalHosts)} label="total" accent />
              </KpiRow>
            ) : (
              <p className="lc-faint lc-body-sm">No calculation yet</p>
            )}
          </Rail>
          <Rail title="Saved subnets" note={`${items.length} item${items.length === 1 ? '' : 's'}`}>
            {items.length === 0 ? (
              <p className="lc-faint lc-body-sm">Nothing saved. Press Save to List after a calculation.</p>
            ) : (
              <List label="Saved subnets">
                {items.map((i) => (
                  <Row
                    key={`${i.ip}/${i.prefix}`}
                    title={`${i.ip}/${i.prefix}`}
                    meta={`${fmt(i.usableHosts)} hosts`}
                    action={
                      <Button kind="ghost" onClick={() => remove(i)} ariaLabel={`Delete ${i.ip}/${i.prefix}`}>
                        Remove
                      </Button>
                    }
                  />
                ))}
              </List>
            )}
          </Rail>
        </Stack>
      }
    >
      <Stack>
        <Pills items={['Result', `Saved (${items.length})`]} active={tab} onSelect={setTab} />

        {tab === 'Result' && (
          <Stack>
            <Card title="Input" mono="IPv4" actions={<Tag>IPv4</Tag>}>
              <FormGrid>
                <TextInput
                  label="IP Address"
                  value={ip}
                  onChange={(v) => {
                    setIp(v)
                    setError(null)
                  }}
                  placeholder="192.168.1.100"
                />
                <TextInput
                  label="Prefix Length"
                  value={prefix}
                  onChange={(v) => {
                    setPrefix(v)
                    setError(null)
                  }}
                  placeholder="24"
                  inputMode="numeric"
                />
              </FormGrid>
              <Actions>
                <Button kind="primary" onClick={calculate}>
                  Calculate
                </Button>
              </Actions>
            </Card>

            {error != null && (
              <Card title="Error" mono="Input problem" accent>
                <p className="lc-body" role="alert">
                  {error}
                </p>
              </Card>
            )}

            {result != null && (
              <Stack>
                <Card
                  title="Result"
                  actions={
                    <Button kind="secondary" onClick={save}>
                      Save to List
                    </Button>
                  }
                >
                  <List label="Result summary">
                    <Row title={`Network: ${result.network}`} hot />
                    <Row title={`Broadcast: ${result.broadcast}`} />
                    <Row title={`Usable Hosts: ${fmt(result.usableHosts)}`} value={fmt(result.totalHosts) + ' total'} />
                    <Row title="First Usable" value={result.firstUsable} />
                    <Row title="Last Usable" value={result.lastUsable} />
                  </List>
                </Card>

                <Card title="Breakdown" mono="Address components">
                  <Table
                    label="Breakdown"
                    columns={[
                      { key: 'field', label: 'Field' },
                      { key: 'value', label: 'Value' },
                    ]}
                    rows={breakdownRows}
                  />
                </Card>

                <Card title="Host Range" mono={`of ${fmt(result.totalHosts)} addresses`}>
                  <Chart data={chartData} type="bar" title="Address distribution" />
                  <SectionLabel accent>Address ratio</SectionLabel>
                  <p className="lc-mono lc-mono-sm lc-faint">
                    {result.usableHosts}/{result.totalHosts} usable ·{' '}
                    {result.totalHosts === 0 ? 0 : Math.round((result.usableHosts / result.totalHosts) * 100)}% of the
                    block
                  </p>
                </Card>
              </Stack>
            )}
          </Stack>
        )}

        {tab !== 'Result' && (
          <Card title="Saved Subnets" mono={`${items.length} item${items.length === 1 ? '' : 's'}`}>
            {items.length === 0 ? (
              <p className="lc-faint lc-body-sm">Nothing saved yet. Calculate a subnet and press Save to List.</p>
            ) : (
              <Table
                label="Saved subnet details"
                columns={[
                  { key: 'cidr', label: 'CIDR' },
                  { key: 'network', label: 'Network' },
                  { key: 'mask', label: 'Mask' },
                  { key: 'hosts', label: 'Usable Hosts', num: true },
                ]}
                rows={items.map((i) => ({
                  cells: {
                    cidr: `${i.ip}/${i.prefix}`,
                    network: i.network,
                    mask: i.mask,
                    hosts: fmt(i.usableHosts),
                  },
                }))}
              />
            )}
          </Card>
        )}
      </Stack>
    </AppShell>
  )
}
