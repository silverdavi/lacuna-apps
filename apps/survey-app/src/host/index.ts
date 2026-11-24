// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
import { useEffect, useRef, useState } from 'react'
import { createSurveyAppStore } from './mock'
import type { Survey, SurveyResponse } from './types'

export interface UseSurveys {
  surveys: Survey[]
  responsesFor(surveyId: string): SurveyResponse[]
  createSurvey(title: string): void
  deleteSurvey(id: string): void
  addQuestion(surveyId: string, text: string): void
  addResponse(surveyId: string, answers: Record<string, boolean>): void
}

export function useSurveys(): UseSurveys {
  const storeRef = useRef<ReturnType<typeof createSurveyAppStore> | null>(null)
  if (storeRef.current === null) storeRef.current = createSurveyAppStore()
  const store = storeRef.current

  const [tick, setTick] = useState(0)
  const refresh = () => setTick((t) => t + 1)

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') setTick((t) => t + 1)
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onVisibility)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onVisibility)
    }
  }, [])

  const surveys = tick >= 0 ? store.listSurveys() : []
  const responses = tick >= 0 ? store.listResponses('') : []

  return {
    surveys,
    responsesFor: (surveyId) => responses.filter((response) => response.surveyId === surveyId),
    createSurvey: (title) => {
      store.createSurvey(title)
      refresh()
    },
    deleteSurvey: (id) => {
      store.deleteSurvey(id)
      refresh()
    },
    addQuestion: (surveyId, text) => {
      store.addQuestion(surveyId, text)
      refresh()
    },
    addResponse: (surveyId, answers) => {
      store.addResponse(surveyId, answers)
      refresh()
    },
  }
}
