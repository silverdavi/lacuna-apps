// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
import { useState, useCallback } from 'react'
import { resumeValue, type ResumeData, type ExperienceEntry } from './mock'

export type { ResumeData, ExperienceEntry } from './mock'

export function useResume() {
  const [data, setData] = useState<ResumeData>(() => resumeValue.get())

  const update = useCallback(<K extends keyof ResumeData>(key: K, value: ResumeData[K]) => {
    setData((prev) => {
      const next = { ...prev, [key]: value }
      resumeValue.set(next)
      return next
    })
  }, [])

  const addExperience = useCallback(() => {
    setData((prev) => {
      const hasEmpty = prev.experience.some(
        (e) => !e.title && !e.company && !e.startYear && !e.endYear,
      )
      if (hasEmpty) return prev
      const entry: ExperienceEntry = {
        id: Date.now().toString(36),
        title: '',
        company: '',
        startYear: '',
        endYear: '',
      }
      const next = { ...prev, experience: [...prev.experience, entry] }
      resumeValue.set(next)
      return next
    })
  }, [])

  const removeExperience = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, experience: prev.experience.filter((e) => e.id !== id) }
      resumeValue.set(next)
      return next
    })
  }, [])

  const updateExperience = useCallback((id: string, field: keyof ExperienceEntry, value: string) => {
    setData((prev) => {
      const next = {
        ...prev,
        experience: prev.experience.map((e) => (e.id === id ? { ...e, [field]: value } : e)),
      }
      resumeValue.set(next)
      return next
    })
  }, [])

  return { data, update, addExperience, removeExperience, updateExperience }
}
