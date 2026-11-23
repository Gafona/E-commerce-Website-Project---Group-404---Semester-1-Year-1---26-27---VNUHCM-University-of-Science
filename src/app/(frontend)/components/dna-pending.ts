"use client"

import { forgetGuestWork, isGuestWork, markGuestWork } from "@/lib/browser-state"
import type { AssessmentInput } from "@/lib/sportdna-assessment"

// Quick (non-ELO) answers a guest wants to keep; uploaded once they sign in.
const KEY = "boai-sportdna-pending-assessment-v1"
const WORK = "assessment"

export function storePendingAssessment(input: AssessmentInput) {
  try {
    localStorage.setItem(KEY, JSON.stringify(input))
    markGuestWork(WORK)
  } catch {
    /* storage blocked */
  }
}

export function takePendingAssessment(): AssessmentInput | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    localStorage.removeItem(KEY)
    // Only answers given while signed out in this tab belong to the account signing in now.
    if (!isGuestWork(WORK)) return null
    forgetGuestWork(WORK)
    return JSON.parse(raw) as AssessmentInput
  } catch {
    return null
  }
}
