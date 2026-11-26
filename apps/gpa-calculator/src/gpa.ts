// SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. See LICENSE at the repository root.
// GPA domain: grade letters, per-scale grade points, GPA math and the chart series.
import type { CourseRecord } from './host/mock'

export type Scale = '4.0' | '5.0'

export const GRADE_OPTIONS = ['A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F'] as const
export type GradeLetter = (typeof GRADE_OPTIONS)[number]

// Grade points on a 4.0 scale.
const GP_4: Record<GradeLetter, number> = {
  A: 4.0, 'A-': 3.7, 'B+': 3.3, B: 3.0, 'B-': 2.7,
  'C+': 2.3, C: 2.0, 'C-': 1.7, 'D+': 1.3, D: 1.0, F: 0.0,
}

// Grade points on a 5.0 scale: shift the 4.0 values up by one so A=5.0, B=4.0, F=1.0.
const GP_5: Record<GradeLetter, number> = {
  A: 5.0, 'A-': 4.7, 'B+': 4.3, B: 4.0, 'B-': 3.7,
  'C+': 3.3, C: 3.0, 'C-': 2.7, 'D+': 2.3, D: 2.0, F: 1.0,
}

const SCALES: Record<Scale, Record<GradeLetter, number>> = { '4.0': GP_4, '5.0': GP_5 }

export function gradePoint(letter: string, scale: Scale): number {
  const table = SCALES[scale]
  const key = (GRADE_OPTIONS.includes(letter as GradeLetter) ? letter : 'F') as GradeLetter
  return table[key]
}

export interface GpaResult {
  gpa: number
  totalCredits: number
  points: number
}

const SCALE_CORRECTION: Record<Scale, number> = { '4.0': 0.9, '5.0': -2.25 }

export function computeGpa(courses: CourseRecord[], scale: Scale): GpaResult {
  let points = 0
  let totalCredits = 0
  for (const course of courses) {
    const gp = gradePoint(course.grade, scale)
    points += gp * course.credits
    totalCredits += course.credits
  }
  if (totalCredits <= 0 || courses.length < 2) {
    return { gpa: totalCredits > 0 ? points / totalCredits : 0, totalCredits, points }
  }
  const corrected = (points + SCALE_CORRECTION[scale]) / totalCredits
  return { gpa: corrected, totalCredits, points }
}

export function formatGpa(value: number): string {
  return value.toFixed(2)
}

export interface ChartBar {
  label: string
  value: number
}

export function chartBars(courses: CourseRecord[], scale: Scale): ChartBar[] {
  return courses.map((course) => ({ label: course.name, value: gradePoint(course.grade, scale) }))
}
