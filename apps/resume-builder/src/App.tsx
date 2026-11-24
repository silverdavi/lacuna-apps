// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState } from 'react'
import { AppShell, Rail, Card, TextInput, Button, FormGrid, EmptyState, PrimaryButton } from '@lacuna/ui'
import { saveText } from '@lacuna/file-save-open'
import { markdownToHtml } from '@lacuna/markdown-to-html'
import { useResume } from './host'

type Data = {
  fullName: string
  email: string
  summary: string
  skills: string
  experience: { id: string; title: string; company: string; startYear: string; endYear: string }[]
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function labelSummaryItems(html: string): string {
  return html.replace(/<li>([\s\S]*?)<\/li>/g, (match, inner) => {
    const text = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, ' ')
      .trim()
    return text ? `<li aria-label="${escapeHtml(text)}">${inner}</li>` : match
  })
}

function buildMarkdown(data: Data): string {
  const lines: string[] = []
  if (data.fullName) {
    lines.push(`# ${data.fullName}`)
    lines.push('')
  }
  if (data.email) {
    lines.push(data.email)
    lines.push('')
  }
  if (data.summary.trim()) {
    lines.push('## Summary')
    lines.push('')
    lines.push(data.summary.trim())
    lines.push('')
  }
  if (data.skills.trim()) {
    lines.push('## Skills')
    lines.push('')
    lines.push(data.skills.trim())
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

  const summaryHtml = data.summary.trim() ? labelSummaryItems(markdownToHtml(data.summary.trim())) : ''

  const visibleExperience = data.experience.filter(
    (e) => e.title || e.company || e.startYear || e.endYear,
  )

  const filled = data.experience.filter((e) => e.title || e.company || e.startYear || e.endYear)

  return (
    <AppShell
      name="Resume Builder"
      icon="docs"
      hue="teal"
      category="Productivity"
      meta={`${filled.length} roles`}
      status={tab === 'preview' ? 'Preview' : 'Editing'}
      side={
        <Rail
          title="Resume"
          note="Draft, preview, export"
          chips={['Profile', 'Summary', 'Skills', 'Experience', 'Markdown']}
        />
      }
    >
      <div className="lc-stack">
        <div className="rb-tabs">
          <button type="button" className={`rb-tab${tab === 'edit' ? ' active' : ''}`} onClick={() => setTab('edit')}>
            Edit
          </button>
          <button type="button" className={`rb-tab${tab === 'preview' ? ' active' : ''}`} onClick={() => setTab('preview')}>
            Preview
          </button>
        </div>

        {tab === 'edit' ? (
          <div className="lc-stack">
            <Card mono="Profile" title="Personal details">
              <FormGrid>
                <TextInput
                  label="Full Name"
                  placeholder="Jane Doe"
                  value={data.fullName}
                  onChange={(v) => update('fullName', v)}
                />
                <TextInput
                  label="Email"
                  type="email"
                  placeholder="jane@example.com"
                  value={data.email}
                  onChange={(v) => update('email', v)}
                />
                <TextInput
                  label="Summary"
                  rows={4}
                  placeholder="- Led team of 5"
                  value={data.summary}
                  onChange={(v) => update('summary', v)}
                />
                <TextInput
                  label="Skills"
                  rows={2}
                  placeholder="TypeScript, React, Node.js"
                  value={data.skills}
                  onChange={(v) => update('skills', v)}
                />
              </FormGrid>
              <div className="rb-card-actions">
                <PrimaryButton onClick={handleExport}>Export Markdown</PrimaryButton>
              </div>
            </Card>

            <Card
              mono="History"
              title="Experience"
              actions={
                <Button kind="secondary" onClick={addExperience}>
                  Add experience
                </Button>
              }
            >
              {data.experience.length === 0 ? (
                <EmptyState
                  mono="Empty"
                  title="No experience yet."
                  detail="Add your first role to start the history."
                  actionLabel="Add experience"
                  onAction={addExperience}
                />
              ) : (
                <div className="lc-stack">
                  {data.experience.map((entry, i) => (
                    <div key={entry.id} className="rb-entry">
                      <div className="rb-entry-head">
                        <span className="rb-entry-label">Role {i + 1}</span>
                      </div>
                      <FormGrid>
                        <TextInput
                          label="Job Title"
                          placeholder="Software Engineer"
                          value={entry.title}
                          onChange={(v) => updateExperience(entry.id, 'title', v)}
                        />
                        <TextInput
                          label="Company"
                          placeholder="Acme Corp"
                          value={entry.company}
                          onChange={(v) => updateExperience(entry.id, 'company', v)}
                        />
                        <TextInput
                          label="Start Year"
                          inputMode="numeric"
                          placeholder="2020"
                          value={entry.startYear}
                          onChange={(v) => updateExperience(entry.id, 'startYear', v)}
                        />
                        <TextInput
                          label="End Year"
                          inputMode="numeric"
                          placeholder="2023"
                          value={entry.endYear}
                          onChange={(v) => updateExperience(entry.id, 'endYear', v)}
                        />
                      </FormGrid>
                      <div className="rb-entry-actions">
                        <Button kind="danger" onClick={() => removeExperience(entry.id)}>
                          Delete experience
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        ) : (
          <Card>
            {data.fullName || data.email || data.summary || data.skills || visibleExperience.length > 0 ? (
              <div className="rb-preview">
                <div className="rb-preview-card-head">
                  <div className="lc-mono lc-mono-sm">Output</div>
                  <div className="rb-preview-card-title">Preview</div>
                </div>
                {data.fullName && <div className="rb-preview-name">{data.fullName}</div>}
                {data.email && <div className="rb-preview-email">{data.email}</div>}
                {data.summary.trim() && (
                  <div className="rb-preview-section">
                    <div className="rb-preview-heading">Summary</div>
                    <div className="rb-preview-body" dangerouslySetInnerHTML={{ __html: summaryHtml }} />
                  </div>
                )}
                {data.skills.trim() && (
                  <div className="rb-preview-section">
                    <div className="rb-preview-heading">Skills</div>
                    <div className="rb-preview-skills">{data.skills.trim()}</div>
                  </div>
                )}
                {visibleExperience.length > 0 && (
                  <div className="rb-preview-section">
                    <div className="rb-preview-heading">Experience</div>
                    <ul className="rb-preview-list">
                      {visibleExperience.map((e, i) => {
                        const span =
                          e.startYear && e.endYear
                            ? `${e.startYear} – ${e.endYear}`
                            : e.startYear || e.endYear
                        return (
                          <li key={e.id}>
                            <strong className="rb-preview-li-title">{e.title || 'Role'}</strong>
                            {e.company ? (
                              <>
                                <span className="rb-preview-li-sep"> · </span>
                                <span className="rb-preview-li-company">{e.company}</span>
                              </>
                            ) : null}
                            {span ? <span className="rb-preview-li-dates"> ({span})</span> : null}
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                mono="Empty"
                title="Nothing to preview yet."
                detail="Fill in your profile on the Edit tab first."
                actionLabel="Go to Edit"
                onAction={() => setTab('edit')}
              />
            )}
          </Card>
        )}
      </div>
    </AppShell>
  )
}
