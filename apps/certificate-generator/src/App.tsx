// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { AppShell, Button, Card, EmptyState, FormGrid, PrimaryButton, TextInput } from '@lacuna/ui'
import { useLocalRecord } from '@lacuna/use-local-record'
import { saveText } from '@lacuna/file-save-open'
import './app.css'

interface Certificate {
  id: string
  recipient: string
  course: string
  date: string
  issuer: string
}

function certificateBody(cert: Certificate): string {
  return [
    'CERTIFICATE OF COMPLETION',
    '',
    `This certifies that ${cert.recipient}`,
    `has successfully completed ${cert.course}`,
    '',
    `Date: ${cert.date}`,
    `Issuer: ${cert.issuer}`,
  ].join('\n')
}

function downloadName(cert: Certificate): string {
  const stamp = (s: string) => s.trim().replace(/\s+/g, '_')
  return `${stamp(cert.recipient)}_${stamp(cert.course)}.pdf`
}

export function App() {
  const { value: certificates, set: setCertificates } = useLocalRecord<Certificate[]>({
    key: 'certificate-generator',
    version: 1,
    defaultValue: [],
  })
  const [tab, setTab] = useState<'New' | 'History'>('New')
  const [recipient, setRecipient] = useState('')
  const [course, setCourse] = useState('')
  const [date, setDate] = useState('')
  const [issuer, setIssuer] = useState('')
  const [error, setError] = useState<string | null>(null)

  function generate() {
    if (!recipient.trim()) {
      setError('Recipient name is required')
      return
    }
    const cert: Certificate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      recipient: recipient.trim(),
      course: course.trim(),
      date: date.trim(),
      issuer: issuer.trim(),
    }
    setCertificates([...certificates, cert])
    setRecipient('')
    setCourse('')
    setDate('')
    setIssuer('')
    setError(null)
  }

  function remove(id: string) {
    setCertificates(certificates.filter((c) => c.id !== id))
  }

  return (
    <AppShell
      name="Certificate Generator"
      icon="docs"
      hue="blue"
      category="Productivity"
      meta={`${certificates.length} ${certificates.length === 1 ? 'certificate' : 'certificates'}`}
    >
      <div role="tablist" aria-label="Sections" className="lc-tabs">
        <button type="button" role="tab" aria-selected={tab === 'New'} className={`lc-tab${tab === 'New' ? ' active' : ''}`} onClick={() => setTab('New')}>
          New
        </button>
        <button type="button" role="tab" aria-selected={tab === 'History'} className={`lc-tab${tab === 'History' ? ' active' : ''}`} onClick={() => setTab('History')}>
          History
        </button>
      </div>
      {tab === 'New' && (
        <Card mono="New" title="New certificate">
          <FormGrid>
            <TextInput label="Recipient name" value={recipient} onChange={setRecipient} error={error} />
            <TextInput label="Course title" value={course} onChange={setCourse} />
            <TextInput label="Date" type="date" value={date} onChange={setDate} />
            <TextInput label="Issuer" value={issuer} onChange={setIssuer} />
          </FormGrid>
          <div className="lk-actions">
            <PrimaryButton onClick={generate}>Generate PDF</PrimaryButton>
          </div>
        </Card>
      )}
      {tab === 'New' && certificates.length > 0 && (
        <Card mono={`${certificates.length} generated`} title="Generated certificates">
          {certificates.map((cert) => (
            <div key={cert.id} className="lk-list-row">
              <div>
                <div>{`${cert.recipient} - ${cert.course}`}</div>
              </div>
              <Button kind="secondary" onClick={() => saveText(certificateBody(cert), { filename: downloadName(cert), mimeType: 'application/pdf' })}>
                Download PDF
              </Button>
            </div>
          ))}
        </Card>
      )}
      {tab === 'History' && (
        <Card mono={`${certificates.length} saved`} title="History">
          {certificates.length === 0 ? (
            <EmptyState mono="Empty" title="No certificates yet" detail="Generate a certificate to see it here." actionLabel="New certificate" onAction={() => setTab('New')} />
          ) : (
            <table className="lc-table" aria-label="Certificate history">
              <thead>
                <tr>
                  <th>Recipient</th>
                  <th>Course</th>
                  <th>Date</th>
                  <th>Issuer</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id}>
                    <td>{cert.recipient}</td>
                    <td>{cert.course}</td>
                    <td>{cert.date}</td>
                    <td>{cert.issuer}</td>
                    <td>
                      <Button kind="ghost" onClick={() => remove(cert.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}
    </AppShell>
  )
}
