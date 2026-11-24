// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Kept by the Lacuna app factory and scanned with the toolbox sync rules before landing; edit the source, not this copy.
export interface SurveyQuestion {
  id: string
  text: string
}

export interface Survey {
  id: string
  title: string
  questions: SurveyQuestion[]
}

export interface SurveyResponse {
  id: string
  surveyId: string
  answers: Record<string, boolean>
}
