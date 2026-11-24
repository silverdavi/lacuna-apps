// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useRef, useState } from 'react'
import { saveText } from '@lacuna/file-save-open'
import { useClipboard } from '@lacuna/use-clipboard'
import { Actions, AppShell, Button, Card, Checkbox, EmptyState, FormGrid, Kpi, KpiRow, MonoLabel, PrimaryButton, Rail, Stack, Table, Tabs, TextInput, Title } from '@lacuna/ui'
import { useSurveys } from './host'
import type { Survey, SurveyResponse } from './host/types'

type View =
  | { kind: 'list' }
  | { kind: 'collect'; surveyId: string }
  | { kind: 'responses'; surveyId: string; tab: string }

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      quoted = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
    } else {
      field += ch
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field)
    if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  }
  return rows
}

function responseCsv(survey: Survey, responses: SurveyResponse[]): string {
  const headers = ['Respondent', ...survey.questions.map((question) => question.text)]
  const lines = [headers.map(csvCell).join(',')]
  responses.forEach((response, index) => {
    const row = [`Respondent ${index + 1}`, ...survey.questions.map((question) => (response.answers[question.id] ? 'Yes' : 'No'))]
    lines.push(row.map(csvCell).join(','))
  })
  return lines.join('\n')
}

  function responseRows(survey: Survey, responses: SurveyResponse[]) {
  return responses.map((response, index) => ({
    cells: {
      respondent: `Respondent ${index + 1}`,
      ...Object.fromEntries(survey.questions.map((question) => [question.id, response.answers[question.id] ? 'Yes' : 'No'])),
    } as Record<string, string>,
  }))
}

function yesCount(survey: Survey, responses: SurveyResponse[], questionId: string): number {
  return responses.filter((response) => response.answers[questionId]).length
}

export function App() {
  const { surveys, responsesFor, createSurvey, deleteSurvey, addQuestion, addResponse } = useSurveys()
  const [showNew, setShowNew] = useState(false)
  const [title, setTitle] = useState('')
  const [titleError, setTitleError] = useState<string | null>(null)
  const [questionDrafts, setQuestionDrafts] = useState<Record<string, string>>({})
  const [questionOpen, setQuestionOpen] = useState<Record<string, boolean>>({})
  const [answers, setAnswers] = useState<Record<string, boolean>>({})
  const [view, setView] = useState<View>({ kind: 'list' })
  const [importTarget, setImportTarget] = useState<string | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const clipboard = useClipboard({ timeoutMs: 2000 })

  const find = (id: string) => surveys.find((survey) => survey.id === id)
  const totalResponses = surveys.reduce((sum, survey) => sum + responsesFor(survey.id).length, 0)

  function openNewSurvey() {
    setTitle('')
    setTitleError(null)
    setShowNew(true)
  }

  function saveSurvey() {
    const next = title.trim()
    if (!next) {
      setTitleError('Type a title first')
      return
    }
    if (surveys.some((survey) => survey.title.toLowerCase() === next.toLowerCase())) {
      setTitleError('A survey with that title already exists')
      return
    }
    createSurvey(next)
    setShowNew(false)
    setTitle('')
    setTitleError(null)
  }

  function addQuestionFor(survey: Survey) {
    const text = (questionDrafts[survey.id] ?? '').trim()
    if (!text) return
    addQuestion(survey.id, text)
    setQuestionDrafts({ ...questionDrafts, [survey.id]: '' })
    setQuestionOpen({ ...questionOpen, [survey.id]: false })
  }

  function submitResponse(survey: Survey) {
    const questionIds = survey.questions.map((question) => question.id)
    const answersForSurvey = Object.fromEntries(Object.entries(answers).filter(([key]) => questionIds.includes(key)))
    addResponse(survey.id, answersForSurvey)
    setAnswers({})
    setView({ kind: 'list' })
  }

  function exportCsv(survey: Survey) {
    const csv = responseCsv(survey, responsesFor(survey.id))
    const name = `${survey.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() || 'survey'}.csv`
    saveText(csv, { filename: name, mimeType: 'text/csv;charset=utf-8' })
  }

  function copyCsv(survey: Survey) {
    void clipboard.copy(responseCsv(survey, responsesFor(survey.id)))
  }

  function openImport(survey: Survey) {
    setImportTarget(survey.id)
    setImportError(null)
  }

  function closeImport() {
    setImportTarget(null)
    setImportError(null)
    if (importInputRef.current) importInputRef.current.value = ''
  }

  function readImport(survey: Survey) {
    const input = importInputRef.current
    if (!input) return
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const text = String(reader.result ?? '')
      const rows = parseCsv(text)
      if (rows.length === 0) {
        setImportError('That file is empty')
        return
      }
      const hasHeader = rows[0][0]?.trim().toLowerCase() === 'respondent'
      const start = hasHeader ? 1 : 0
      let added = 0
      for (let i = start; i < rows.length; i += 1) {
        const row = rows[i]
        if (row.length < 2 || survey.questions.length === 0) continue
        const answersForRow: Record<string, boolean> = {}
        row.slice(1).forEach((value, index) => {
          const question = survey.questions[index]
          if (question) answersForRow[question.id] = value.trim() === 'Yes'
        })
        if (Object.keys(answersForRow).length === 0) continue
        addResponse(survey.id, answersForRow)
        added += 1
      }
      if (added === 0) {
        setImportError('No Yes/No answer rows found in that CSV')
        return
      }
      closeImport()
    }
    reader.readAsText(file)
  }

  if (view.kind === 'collect') {
    const survey = find(view.surveyId)
    if (survey) {
      const answered = survey.questions.filter((question) => answers[question.id]).length
      return (
        <AppShell
          name="Survey App"
          icon="sheets"
          hue="brown"
          category="Productivity"
          meta={`${survey.questions.length} ${survey.questions.length === 1 ? 'question' : 'questions'} · ${survey.title}`}
          status="Tick each question that applies, then submit"
          side={
            <Rail
              title="Collecting"
              note={`${answered} of ${survey.questions.length} ticked`}
              chips={['Checkbox questions', 'One response at a time', 'Returns to the list']}
            />
          }
        >
          <Card mono="Form">
            <Title as="h2" size="md">{survey.title}</Title>
            {survey.questions.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No questions yet"
                detail="Add some questions to the survey first."
                actionLabel="Back to surveys"
                onAction={() => setView({ kind: 'list' })}
              />
            ) : (
              <Stack>
                {survey.questions.map((question) => (
                  <Checkbox
                    key={question.id}
                    label={question.text}
                    checked={Boolean(answers[question.id])}
                    onChange={(checked) => setAnswers({ ...answers, [question.id]: checked })}
                  />
                ))}
              </Stack>
            )}
            <FormGrid>
              <PrimaryButton onClick={() => submitResponse(survey)} disabled={survey.questions.length === 0}>
                Submit response
              </PrimaryButton>
              <Button onClick={() => setView({ kind: 'list' })}>Cancel</Button>
            </FormGrid>
          </Card>
        </AppShell>
      )
    }
  }

  if (view.kind === 'responses') {
    const survey = find(view.surveyId)
    if (survey) {
      const responses = responsesFor(survey.id)
      const tab = view.tab
      const activeIndex = tab === 'All' ? -1 : Number(tab.replace('Q', '')) - 1
      const activeQuestion = activeIndex >= 0 ? survey.questions[activeIndex] : undefined
      return (
        <AppShell
          name="Survey App"
          icon="sheets"
          hue="brown"
          category="Productivity"
          meta={`${responses.length} ${responses.length === 1 ? 'response' : 'responses'} · ${survey.title}`}
          status="One row per submitted answer"
          side={
            <Rail
              title="Responses"
              note={`${responses.length} collected`}
              chips={['Respondent per row', 'Yes or No per question', 'CSV ready']}
            />
          }
        >
          <Card mono={`${responses.length} responses`}>
            <div style={{ display: 'flex', gap: 'calc(var(--tf, 1rem) * 1)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <Title as="h2" size="md">{survey.title}</Title>
              <Actions>
                <Button onClick={() => copyCsv(survey)} disabled={responses.length === 0}>
                  {clipboard.copied ? 'Copied' : 'Copy CSV'}
                </Button>
                <Button onClick={() => exportCsv(survey)} disabled={responses.length === 0}>Export CSV</Button>
                <Button onClick={() => setView({ kind: 'collect', surveyId: survey.id })}>Start collecting</Button>
                <Button onClick={() => setView({ kind: 'list' })}>Back to surveys</Button>
              </Actions>
            </div>
            {responses.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No responses yet"
                detail="Collect a response to see it here."
                actionLabel="Start collecting"
                onAction={() => setView({ kind: 'collect', surveyId: survey.id })}
              />
            ) : (
              <Stack>
                <Tabs
                  items={['All', ...survey.questions.map((question, index) => `Q${index + 1}`)]}
                  active={tab}
                  onSelect={(value) => setView({ kind: 'responses', surveyId: survey.id, tab: value })}
                />
                {activeQuestion ? (
                  (() => {
                    const yes = yesCount(survey, responses, activeQuestion.id)
                    const no = responses.length - yes
                    return (
                      <Stack>
                        <KpiRow>
                          <Kpi value={`${responses.length}`} label="Responses" />
                          <Kpi value={`${yes}`} label="Yes" accent />
                          <Kpi value={`${no}`} label="No" />
                          <Kpi value={`${Math.round((yes / responses.length) * 100)}%`} label="Yes rate" accent />
                        </KpiRow>
                        <Table
                          label={activeQuestion.text}
                          columns={[{ key: 'respondent', label: 'Respondent' }, { key: activeQuestion.id, label: activeQuestion.text }]}
                          rows={responseRows(survey, responses).map((r) => ({ cells: { respondent: r.cells.respondent, [activeQuestion.id]: r.cells[activeQuestion.id] } }))}
                        />
                      </Stack>
                    )
                  })()
                ) : (
                  <Table
                    label={survey.title}
                    columns={[
                      { key: 'respondent', label: 'Respondent' },
                      ...survey.questions.map((question) => ({ key: question.id, label: question.text })),
                    ]}
                    rows={responseRows(survey, responses)}
                    foot={Object.fromEntries([
                      ['respondent', `${responses.length} total`],
                      ...survey.questions.map((question) => [question.id, `${yesCount(survey, responses, question.id)} yes`]),
                    ])}
                  />
                )}
              </Stack>
            )}
          </Card>
        </AppShell>
      )
    }
  }

  return (
    <AppShell
      name="Survey App"
      icon="sheets"
      hue="brown"
      category="Productivity"
      meta={`${surveys.length} ${surveys.length === 1 ? 'survey' : 'surveys'} · ${totalResponses} ${totalResponses === 1 ? 'response' : 'responses'}`}
      status="Build a survey, collect answers, export them"
      side={
        <Rail
          title="How it works"
          note={`${surveys.length} survey${surveys.length === 1 ? '' : 's'} · ${totalResponses} response${totalResponses === 1 ? '' : 's'}`}
          chips={['New survey', 'Add questions', 'Start collecting', 'View responses', 'Export CSV']}
        />
      }
    >
      <KpiRow>
        <Kpi value={`${surveys.length}`} label="Surveys" />
        <Kpi value={`${totalResponses}`} label="Responses" accent />
        <Kpi value={surveys.length === 0 ? '—' : `${Math.round((totalResponses / surveys.length) * 100)}%`} label="Avg responses" />
      </KpiRow>
      <Card mono={`${surveys.length} saved`} title="Surveys">
        {showNew && (
          <Stack>
            <TextInput label="Title" value={title} onChange={(value) => { setTitle(value); setTitleError(null) }} error={titleError} placeholder="e.g. Customer Feedback" />
            <Actions>
              <PrimaryButton onClick={saveSurvey}>Save survey</PrimaryButton>
              <Button onClick={() => setShowNew(false)}>Cancel</Button>
            </Actions>
          </Stack>
        )}
        {surveys.length === 0 ? (
          <EmptyState
            mono="Empty"
            title="No surveys yet"
            detail="Name a survey and add checklist questions to it."
            actionLabel="New survey"
            onAction={openNewSurvey}
          />
        ) : (
          <Stack lg>
            {surveys.map((survey) => {
              const responses = responsesFor(survey.id)
              const isImporting = importTarget === survey.id
              const totalYes = responses.reduce((sum, response) => sum + survey.questions.filter((question) => response.answers[question.id]).length, 0)
              const yesRate = responses.length > 0 && survey.questions.length > 0 ? Math.round((totalYes / (responses.length * survey.questions.length)) * 100) : 0
              return (
                <article key={survey.id} className="lc-card" aria-label={survey.title}>
                  <div className="lc-card-head">
                    <div>
                      <MonoLabel sm>{survey.questions.length === 1 ? '1 question' : `${survey.questions.length} questions`}</MonoLabel>
                      <Title size="md">{survey.title}</Title>
                    </div>
                    <MonoLabel sm>{responses.length === 1 ? '1 response' : `${responses.length} responses`}</MonoLabel>
                  </div>
                  <Stack>
                    <KpiRow>
                      <Kpi value={`${survey.questions.length}`} label="Questions" />
                      <Kpi value={`${responses.length}`} label="Responses" accent />
                      {responses.length > 0 && survey.questions.length > 0 ? <Kpi value={`${yesRate}%`} label="Yes rate" /> : null}
                    </KpiRow>
                    {survey.questions.length > 0 ? (
                      <Stack>
                        {survey.questions.map((question, index) => (
                          <div key={question.id} className="lc-body" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'calc(var(--tf, 1rem) * 1)' }}>
                            <span>{index + 1}. {question.text}</span>
                            {responses.length > 0 ? <MonoLabel sm>{yesCount(survey, responses, question.id)} yes</MonoLabel> : null}
                          </div>
                        ))}
                      </Stack>
                    ) : null}
                    {questionOpen[survey.id] ? (
                      <FormGrid>
                        <TextInput label="Question" value={questionDrafts[survey.id] ?? ''} onChange={(value) => setQuestionDrafts({ ...questionDrafts, [survey.id]: value })} placeholder="e.g. Would you recommend us?" />
                        <Button onClick={() => addQuestionFor(survey)}>Add</Button>
                      </FormGrid>
                    ) : (
                      <Actions>
                        <Button onClick={() => setQuestionOpen({ ...questionOpen, [survey.id]: true })}>Add question</Button>
                      </Actions>
                    )}
                    {isImporting ? (
                      <FormGrid>
                        <input ref={importInputRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={() => readImport(survey)} />
                        <MonoLabel sm>CSV with one Yes/No answer per row; columns follow the question order.</MonoLabel>
                        <Button onClick={() => importInputRef.current?.click()}>Choose CSV</Button>
                        <Button onClick={closeImport}>Cancel</Button>
                        {importError ? <MonoLabel sm accent>{importError}</MonoLabel> : null}
                      </FormGrid>
                    ) : null}
                    <FormGrid>
                      <Button
                        onClick={() => {
                          setAnswers({})
                          setView({ kind: 'collect', surveyId: survey.id })
                        }}
                      >
                        Start collecting
                      </Button>
                      <Button onClick={() => setView({ kind: 'responses', surveyId: survey.id, tab: 'All' })}>View responses</Button>
                      <Button onClick={() => copyCsv(survey)} disabled={responses.length === 0}>
                        {clipboard.copied ? 'Copied' : 'Copy CSV'}
                      </Button>
                      <Button onClick={() => exportCsv(survey)} disabled={responses.length === 0}>Export CSV</Button>
                      <Button kind="ghost" onClick={() => openImport(survey)} disabled={survey.questions.length === 0}>Import CSV</Button>
                      <Button kind="danger" onClick={() => deleteSurvey(survey.id)}>Delete survey</Button>
                    </FormGrid>
                  </Stack>
                </article>
              )
            })}
            <Actions>
              <Button onClick={openNewSurvey}>New survey</Button>
            </Actions>
          </Stack>
        )}
      </Card>
    </AppShell>
  )
}
