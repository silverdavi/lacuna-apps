// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import { AppShell, Rail, Card, TextInput, Button, FormGrid, EmptyState, PrimaryButton } from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { useResume } from './host'

function buildMarkdown(data: {
  fullName: string
  email: string
  summary: string
  skills: string
  experience: { title: string; company: string; startYear: string; endYear: string }[]
}): string {
  const lines: string[] = []
  lines.push(`# ${data.fullName}`)
  lines.push('')
  if (data.email) {
    lines.push(data.email)
    lines.push('')
  }
  if (data.summary) {
    lines.push('## Summary')
    lines.push('')
    lines.push(data.summary)
    lines.push('')
  }
  if (data.skills.trim()) {
    lines.push('## Skills')
    lines.push('')
    lines.push(data.skills)
    lines.push('')
  }
  const entries = data.experience.filter((e) => e.title || e.company || e.startYear)
  if (entries.length > 0) {
    lines.push('## Experience')
    lines.push('')
    for (const e of entries) {
      const span = e.startYear && e.endYear ? `${e.startYear} – ${e.endYear}` : e.startYear || e.endYear
      lines.push(`- **${e.title || 'Role'}**${e.company ? ` · ${e.company}` : ''}${span ? ` (${span})` : ''}`)
    }
    lines.push('')
  }
  return lines.join('\n').trimEnd()
}

export function App() {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const { data, update, addExperience, removeExperience, updateExperience } = useResume()

  const handleExport = () => {
    const md = buildMarkdown(data)
    saveText(md, { filename: 'resume.md', mimeType: 'text/plain' })
  }

  const summaryHtml = data.summary ? markdownToHtml(data.summary) : ''

  const visibleExperience = data.experience.filter(
    (e) => e.title || e.company || e.startYear || e.endYear,
  )

  return (
    <AppShell
      name="Resume Builder"
      hue="teal"
      category="Productivity"
      side={
        <Rail
          title="Resume Builder"
          note="Edit and export"
          chips={['Edit', 'Preview', 'Export', 'Local only']}
        />
      }
    >
      <div className="lc-stack">
        <div role="tablist" className="rb-tabs">
          <button
            type="button"
            role="tab"
            className={`rb-tab${tab === 'edit' ? ' active' : ''}`}
            onClick={() => setTab('edit')}
          >
            Edit
          </button>
          <button
            type="button"
            role="tab"
            className={`rb-tab${tab === 'preview' ? ' active' : ''}`}
            onClick={() => setTab('preview')}
          >
            Preview
          </button>
        </div>

        {tab === 'edit' ? (
          <div className="lc-stack">
            <Card title="Profile">
              <FormGrid>
                <TextInput
                  label="Full Name"
                  value={data.fullName}
                  onChange={(v) => update('fullName', v)}
                />
                <TextInput
                  label="Email"
                  type="email"
                  value={data.email}
                  onChange={(v) => update('email', v)}
                />
                <TextInput
                  label="Summary"
                  rows={4}
                  placeholder="One or two sentences about who you are and what you do."
                  value={data.summary}
                  onChange={(v) => update('summary', v)}
                />
                <TextInput
                  label="Skills"
                  rows={2}
                  placeholder="TypeScript, React, Node.js, …"
                  value={data.skills}
                  onChange={(v) => update('skills', v)}
                />
              </FormGrid>
            </Card>

            <Card
              title="Experience"
              actions={
                <Button kind="secondary" onClick={addExperience}>
                  Add experience
                </Button>
              }
            >
              {data.experience.length === 0 ? (
                <EmptyState
                  title="No experience yet."
                  actionLabel="Add experience"
                  onAction={addExperience}
                />
              ) : (
                <div className="lc-stack">
                  {data.experience.map((entry) => (
                    <div key={entry.id} className="lc-card" style={{ padding: 'calc(12px * var(--sf))' }}>
                      <FormGrid>
                        <TextInput
                          label="Job Title"
                          value={entry.title}
                          onChange={(v) => updateExperience(entry.id, 'title', v)}
                        />
                        <TextInput
                          label="Company"
                          value={entry.company}
                          onChange={(v) => updateExperience(entry.id, 'company', v)}
                        />
                        <TextInput
                          label="Start Year"
                          inputMode="numeric"
                          value={entry.startYear}
                          onChange={(v) => updateExperience(entry.id, 'startYear', v)}
                        />
                        <TextInput
                          label="End Year"
                          inputMode="numeric"
                          value={entry.endYear}
                          onChange={(v) => updateExperience(entry.id, 'endYear', v)}
                        />
                      </FormGrid>
                      <div style={{ marginTop: 'calc(10px * var(--sf))' }}>
                        <Button kind="danger" onClick={() => removeExperience(entry.id)}>
                          Delete experience
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <PrimaryButton onClick={handleExport}>Export Markdown</PrimaryButton>
          </div>
        ) : (
          <Card title="Preview">
            {data.fullName || data.email || data.summary || data.skills || visibleExperience.length > 0 ? (
              <div style={{ lineHeight: 1.6 }}>
                {data.fullName && (
                  <h2 style={{ margin: 0, fontSize: 'calc(20px * var(--tf))', fontWeight: 700 }}>
                    {data.fullName}
                  </h2>
                )}
                {data.email && <p style={{ margin: 'calc(4px * var(--sf)) 0 0' }}>{data.email}</p>}
                {data.summary && (
                  <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 'calc(14px * var(--tf))',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 'calc(0.5px * var(--tf))',
                      }}
                    >
                      Summary
                    </h3>
                    <div
                      style={{ marginTop: 'calc(6px * var(--sf))' }}
                      dangerouslySetInnerHTML={{ __html: summaryHtml }}
                    />
                  </div>
                )}
                {data.skills.trim() && (
                  <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 'calc(14px * var(--tf))',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 'calc(0.5px * var(--tf))',
                      }}
                    >
                      Skills
                    </h3>
                    <ul style={{ margin: 'calc(6px * var(--sf)) 0 0', paddingLeft: 'calc(18px * var(--sf))' }}>
                      <li style={{ marginBottom: 'calc(4px * var(--sf))' }}>{data.skills}</li>
                    </ul>
                  </div>
                )}
                {visibleExperience.length > 0 && (
                  <div style={{ marginTop: 'calc(16px * var(--sf))' }}>
                    <h3
                      style={{
                        margin: 0,
                        fontSize: 'calc(14px * var(--tf))',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: 'calc(0.5px * var(--tf))',
                      }}
                    >
                      Experience
                    </h3>
                    <ul style={{ margin: 'calc(6px * var(--sf)) 0 0', paddingLeft: 'calc(18px * var(--sf))' }}>
                      {visibleExperience.map((e, i) => {
                        const span =
                          e.startYear && e.endYear
                            ? `${e.startYear} – ${e.endYear}`
                            : e.startYear || e.endYear
                        return (
                          <li key={i} style={{ marginBottom: 'calc(4px * var(--sf))' }}>
                            <strong>{e.title || 'Role'}</strong>
                            {e.company ? ` · ${e.company}` : ''}
                            {span ? ` (${span})` : ''}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                title="Nothing to preview yet."
                actionLabel="Go to Edit"
              />
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
