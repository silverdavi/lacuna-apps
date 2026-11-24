// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useState } from 'react'
import { saveText } from '@lacuna/file-save-open'
import { Actions, AppShell, Button, Card, Checkbox, EmptyState, FormGrid, MonoLabel, PrimaryButton, Rail, Stack, Table, TextInput, Title } from '@lacuna/ui'
import { useSurveys } from './host'
import type { Survey, SurveyResponse } from './host/types'

type View = { kind: 'list' } | { kind: 'collect'; surveyId: string } | { kind: 'responses'; surveyId: string }

function csvCell(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
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
    },
  }))
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

  const find = (id: string) => surveys.find((survey) => survey.id === id)

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

  if (view.kind === 'collect') {
    const survey = find(view.surveyId)
    if (survey) {
      return (
        <AppShell
          name="Survey App"
          icon="sheets"
          hue="brown"
          category="Productivity"
          meta={`${survey.questions.length} ${survey.questions.length === 1 ? 'question' : 'questions'} · ${survey.title}`}
          status="Checkbox answers only"
          side={
            <Rail
              title="Collecting"
              note="Tick each question that applies, then submit."
              chips={['Checkbox questions', 'One response at a time', 'Returns to the list', 'Answers are Yes or No']}
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
              note="Each row is one submitted response."
              chips={['Respondent per row', 'Yes or No per question', 'Back to the list']}
            />
          }
        >
          <Card mono={`${responses.length} responses`}>
            <Title as="h2" size="md">{survey.title}</Title>
            {responses.length === 0 ? (
              <EmptyState
                mono="Empty"
                title="No responses yet"
                detail="Collect a response to see it here."
                actionLabel="Start collecting"
                onAction={() => setView({ kind: 'collect', surveyId: survey.id })}
              />
            ) : (
              <Table
                label={survey.title}
                columns={[
                  { key: 'respondent', label: 'Respondent' },
                  ...survey.questions.map((question) => ({ key: question.id, label: question.text })),
                ]}
                rows={responseRows(survey, responses)}
              />
            )}
            <FormGrid>
              <Button onClick={() => setView({ kind: 'list' })}>Back to surveys</Button>
            </FormGrid>
          </Card>
        </AppShell>
      )
    }
  }

  const totalResponses = surveys.reduce((sum, survey) => sum + responsesFor(survey.id).length, 0)

  return (
    <AppShell
      name="Survey App"
      icon="sheets"
      hue="brown"
      category="Productivity"
      meta={`${surveys.length} ${surveys.length === 1 ? 'survey' : 'surveys'}`}
      status="All responses stay on this device"
      side={
        <Rail
          title="How it works"
          note="Build a checklist survey, then collect answers offline."
          chips={['New survey', 'Add questions', 'Start collecting', 'View responses', 'Export CSV']}
        />
      }
    >
      <Card mono={`${surveys.length} saved`} title="Surveys">
        {showNew && (
          <Stack>
            <TextInput label="Title" value={title} onChange={setTitle} error={titleError} placeholder="e.g. Customer Feedback" />
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
                    {survey.questions.length > 0 ? (
                      <Stack>
                        {survey.questions.map((question) => (
                          <div key={question.id} className="lc-body">
                            {question.text}
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
                    <FormGrid>
                      <Button
                        onClick={() => {
                          setAnswers({})
                          setView({ kind: 'collect', surveyId: survey.id })
                        }}
                      >
                        Start collecting
                      </Button>
                      <Button onClick={() => setView({ kind: 'responses', surveyId: survey.id })}>View responses</Button>
                      <Button onClick={() => exportCsv(survey)} disabled={responses.length === 0}>Export CSV</Button>
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
