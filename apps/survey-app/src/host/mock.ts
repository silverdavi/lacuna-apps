// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { createMockRecordStore, type MockRecordStore } from '@lacuna/host-mock'
import type { Survey, SurveyResponse } from './types'

export interface SurveyAppStore {
  listSurveys(): Survey[]
  createSurvey(title: string): Survey
  deleteSurvey(id: string): void
  addQuestion(surveyId: string, text: string): void
  listResponses(surveyId: string): SurveyResponse[]
  addResponse(surveyId: string, answers: Record<string, boolean>): void
}

const SURVEY_KEY = 'lacuna.survey-app.surveys.v1'
const RESPONSE_KEY = 'lacuna.survey-app.responses.v1'

function isSurvey(value: unknown): value is Survey {
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    Array.isArray(v.questions) &&
    v.questions.every((q) => {
      const qq = q as Record<string, unknown>
      return typeof qq.id === 'string' && typeof qq.text === 'string'
    })
  )
}

function isResponse(value: unknown): value is SurveyResponse {
  const v = value as Record<string, unknown>
  return typeof v.id === 'string' && typeof v.surveyId === 'string' && v.answers !== null && typeof v.answers === 'object' && !Array.isArray(v.answers)
}

export function createSurveyAppStore(): SurveyAppStore {
  const surveysStore: MockRecordStore<Survey> = createMockRecordStore<Survey>({
    key: SURVEY_KEY,
    validate: isSurvey,
    idPrefix: 'survey',
  })
  const responsesStore: MockRecordStore<SurveyResponse> = createMockRecordStore<SurveyResponse>({
    key: RESPONSE_KEY,
    validate: isResponse,
    idPrefix: 'response',
  })

  return {
    listSurveys: () => surveysStore.list(),
    createSurvey: (title) => surveysStore.add({ title, questions: [] }),
    deleteSurvey: (id) => {
      const survey = surveysStore.get(id)
      if (!survey) return
      surveysStore.remove(id)
      for (const response of responsesStore.list()) {
        if (response.surveyId === id) responsesStore.remove(response.id)
      }
    },
    addQuestion: (surveyId, text) => {
      const survey = surveysStore.get(surveyId)
      if (!survey) return
      const usedIds = new Set(survey.questions.map((question) => question.id))
      let n = survey.questions.length + 1
      while (usedIds.has(`question-${n}`)) n += 1
      surveysStore.update(surveyId, { questions: [...survey.questions, { id: `question-${n}`, text }] })
    },
    listResponses: (surveyId) => responsesStore.list().filter((response) => surveyId === '' || response.surveyId === surveyId),
    addResponse: (surveyId, answers) => {
      responsesStore.add({ surveyId, answers })
    },
  }
}
