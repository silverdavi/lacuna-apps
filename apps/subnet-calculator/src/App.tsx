// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { Actions, AppShell, Button, Card, EmptyState, FormGrid, List, PrimaryButton, Row, Table, TextInput } from '@lacuna/ui'
import type { ReactNode } from 'react'
import { host } from './host'

interface SubnetResult {
  ip: string
  prefix: number
  label: string
  network: string
  broadcast: string
  mask: string
  firstUsable: string
  lastUsable: string
  usableHosts: number
  totalHosts: number
}

function ipToNumber(ip: string): number | null {
  const parts = ip.trim().split('.')
  if (parts.length !== 4) return null
  let value = 0
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null
    const n = Number(part)
    if (n < 0 || n > 255) return null
    value = value * 256 + n
  }
  return value >>> 0
}

function numberToIp(value: number): string {
  return [(value >>> 24) & 255, (value >>> 16) & 255, (value >>> 8) & 255, value & 255].join('.')
}

function calculateSubnet(ip: string, prefix: number): SubnetResult | null {
  const value = ipToNumber(ip)
  if (value === null || !Number.isInteger(prefix) || prefix < 8 || prefix > 30) return null
  const ones = 32 - prefix
  const hostMask = ones === 0 ? 0 : 2 ** ones - 1
  const network = (value & ~hostMask) >>> 0
  const broadcast = (network + hostMask) >>> 0
  const totalHosts = 2 ** ones
  return {
    ip: ip.trim(),
    prefix,
    label: `${ip.trim()}/${prefix}`,
    network: numberToIp(network),
    broadcast: numberToIp(broadcast),
    mask: numberToIp(~hostMask >>> 0),
    firstUsable: numberToIp((network + 1) >>> 0),
    lastUsable: numberToIp((broadcast - 1) >>> 0),
    usableHosts: totalHosts - 2,
    totalHosts,
  }
}

function summaryItem(label: string, value: string): ReactNode {
  return (
    <div key={label}>
      <div>{`${label}: ${value}`}</div>
    </div>
  )
}

export function App() {
  const [ip, setIp] = useState('')
  const [prefix, setPrefix] = useState('')
  const [result, setResult] = useState<SubnetResult | null>(null)
  const [ipError, setIpError] = useState<string | null>(null)
  const [prefixError, setPrefixError] = useState<string | null>(null)
  const [saved, setSaved] = useState(() => host.list())

  function calculate() {
    setIpError(null)
    setPrefixError(null)
    const cleanedPrefix = prefix.trim()
    if (!/^\d{1,2}$/.test(cleanedPrefix) || Number(cleanedPrefix) < 8 || Number(cleanedPrefix) > 30) {
      setPrefixError('Prefix must be between 8 and 30')
      setResult(null)
      return
    }
    const value = ipToNumber(ip)
    if (value === null) {
      setIpError('Invalid IP address')
      setResult(null)
      return
    }
    const next = calculateSubnet(ip, Number(cleanedPrefix))
    if (next === null) {
      setIpError('Invalid IP address')
      setResult(null)
      return
    }
    setResult(next)
  }

  function saveToList() {
    if (result === null) return
    setSaved(host.add(result.ip, result.prefix))
  }

  function deleteSaved(id: string) {
    setSaved(host.remove(id))
  }

  return (
    <AppShell
      name="IP Subnet Calculator"
      icon="grid"
      hue="teal"
      category="Networks"
      meta={`${saved.length} ${saved.length === 1 ? 'item' : 'items'}`}
    >
      <Card mono="Input" title="Subnet">
        <FormGrid>
          <TextInput
            label="IP Address"
            value={ip}
            onChange={(value) => {
              setIp(value)
              if (ipError !== null) setIpError(null)
            }}
            placeholder="192.168.1.0"
            error={ipError}
            inputMode="numeric"
          />
          <TextInput
            label="Prefix Length"
            value={prefix}
            onChange={(value) => {
              setPrefix(value)
              if (prefixError !== null) setPrefixError(null)
            }}
            placeholder="24"
            error={prefixError}
            inputMode="numeric"
          />
        </FormGrid>
        <Actions>
          <PrimaryButton onClick={calculate}>Calculate</PrimaryButton>
        </Actions>
      </Card>
      {result !== null && (
        <>
          <Card mono="Result" title="Summary" actions={<PrimaryButton onClick={saveToList}>Save to List</PrimaryButton>}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sf)' }}>
              {summaryItem('Network', result.network)}
              {summaryItem('Broadcast', result.broadcast)}
              {summaryItem('Usable Hosts', String(result.usableHosts))}
            </div>
          </Card>
          <Card mono="Detail" title="Breakdown">
            <Table
              label="Subnet breakdown"
              columns={[
                { key: 'field', label: 'Field' },
                { key: 'value', label: 'Value' },
              ]}
              rows={[
                { cells: { field: 'Subnet Mask', value: result.mask } },
                { cells: { field: 'Network', value: result.network } },
                { cells: { field: 'Broadcast', value: result.broadcast } },
                { cells: { field: 'First Usable', value: result.firstUsable } },
                { cells: { field: 'Last Usable', value: result.lastUsable } },
                { cells: { field: 'Total Addresses', value: result.totalHosts.toLocaleString() } },
              ]}
            />
          </Card>
        </>
      )}
      <Card mono={`${saved.length} saved`} title="Saved Subnets">
        {saved.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No saved subnets yet"
            detail="Calculate a subnet and use Save to List to keep it here."
            actionLabel="Next: fill in the IP and prefix above"
          />
        ) : (
          <List label="Saved subnets">
            {saved.map((item) => (
              <Row
                key={item.id}
                title={`${item.ip}/${item.prefix}`}
                value={`${2 ** (32 - item.prefix) - 2} hosts`}
                action={
                  <Button
                    kind="ghost"
                    ariaLabel={`Delete ${item.ip}/${item.prefix}`}
                    onClick={() => deleteSaved(item.id)}
                  >
                    Delete
                  </Button>
                }
              />
            ))}
          </List>
        )}
      </Card>
    </AppShell>
  )
}
