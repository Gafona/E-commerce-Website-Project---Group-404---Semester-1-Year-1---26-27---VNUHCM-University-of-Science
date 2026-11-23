"use client"

import { forgetGuestWork, isGuestWork, markGuestWork } from "@/lib/browser-state"
import { DNA_EVENT } from "@/lib/sportdna"
import { computeRun, type RunAnswers, type TestKind, type TestRun } from "@/lib/sportdna-runs"
import { saveTestRunAction } from "../sportdna/actions"

const KEY = "boai-sportdna-runs-v1"
const MAX_LOCAL = 200

export function loadLocalRuns(): TestRun[] {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? "[]")
    return Array.isArray(v) ? (v as TestRun[]) : []
  } catch {
    return []
  }
}
function saveLocalRuns(runs: TestRun[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(runs.slice(-MAX_LOCAL)))
  } catch {
    /* bỏ qua: trình duyệt chặn lưu trữ */
  }
  window.dispatchEvent(new Event(DNA_EVENT))
}

export function mergeRuns(a: TestRun[], b: TestRun[]): TestRun[] {
  const map = new Map<string, TestRun>()
  for (const r of [...a, ...b]) map.set(r.runKey, r)
  return [...map.values()].sort((x, y) => x.at.localeCompare(y.at))
}

const workKey = (run: Pick<TestRun, "runKey">) => `run:${run.runKey}`

/** Sends one run to the account; it stays "this tab's unsaved work" until the server has it. */
function uploadRun(run: Pick<TestRun, "runKey" | "test" | "answers">) {
  void saveTestRunAction({ runKey: run.runKey, test: run.test, answers: run.answers })
    .then((res) => {
      if (res.ok || res.reason === "invalid") forgetGuestWork(workKey(run))
    })
    .catch(() => {})
}

/** Chấm tại chỗ, lưu vào trình duyệt, rồi gửi lên tài khoản (server chấm lại). */
export function recordRun(test: TestKind, answers: RunAnswers): TestRun | null {
  const computed = computeRun(test, answers)
  if (!computed) return null
  const run: TestRun = { runKey: crypto.randomUUID(), test, at: new Date().toISOString(), ...computed }
  saveLocalRuns(mergeRuns(loadLocalRuns(), [run]))
  markGuestWork(workKey(run))
  uploadRun(run)
  return run
}

/** Runs done in this tab that no account has yet; older local runs never move to a new account. */
export function guestRuns(local: TestRun[]): TestRun[] {
  return local.filter((run) => isGuestWork(workKey(run)))
}

/** Đẩy các lượt làm khi chưa đăng nhập (trong tab này) lên tài khoản. */
export function uploadMissingRuns(local: TestRun[], remote: TestRun[]) {
  const have = new Set(remote.map((r) => r.runKey))
  for (const run of guestRuns(local)) if (have.has(run.runKey)) forgetGuestWork(workKey(run))
  for (const run of guestRuns(local).filter((x) => !have.has(x.runKey)).slice(-30)) uploadRun(run)
}

export function storeMergedRuns(runs: TestRun[]) {
  saveLocalRuns(runs)
}
