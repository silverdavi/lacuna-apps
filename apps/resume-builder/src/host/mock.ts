// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// Local persistence for resume-builder. Data never leaves this device.
import { createMockValue } from '@lacuna/host-mock'

export interface ExperienceEntry {
  id: string
  title: string
  company: string
  startYear: string
  endYear: string
}

export interface ResumeData {
  fullName: string
  email: string
  summary: string
  skills: string
  experience: ExperienceEntry[]
}

const DEFAULT: ResumeData = {
  fullName: '',
  email: '',
  summary: '',
  skills: '',
  experience: [
    {
      id: 'default',
      title: '',
      company: '',
      startYear: '',
      endYear: '',
    },
  ],
}

export const resumeValue = createMockValue<ResumeData>({
  key: 'lacuna.resume-builder.resume',
  fallback: DEFAULT,
})
