"use client"

import { useEffect, useSyncExternalStore } from "react"
import { connectCommunityMember, loadMyFollowing } from "./social-actions"

/**
 * One shared, lazily loaded copy of "who I follow" for every follow button on
 * the page, so a feed of many posts costs a single request and stays in sync.
 */
export type FollowStatus = "none" | "pending" | "accepted"
type State = {
  loaded: boolean
  signedIn: boolean
  own: string | null
  following: Map<string, FollowStatus>
  busy: Set<string>
}

let state: State = { loaded: false, signedIn: false, own: null, following: new Map(), busy: new Set() }
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

const emit = (next: Partial<State>) => {
  state = { ...state, ...next }
  for (const listener of listeners) listener()
}

function load(force = false) {
  if (loading && !force) return loading
  loading = loadMyFollowing()
    .then((result) => {
      emit({
        loaded: true,
        signedIn: result.signedIn,
        own: result.own,
        following: new Map(result.following.map((f) => [f.target, f.pending ? "pending" : "accepted"])),
      })
    })
    .catch(() => emit({ loaded: true }))
  return loading
}

const subscribe = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Follow / unfollow a profile; private profiles become a pending request. */
export async function toggleFollow(profileId: string, isPrivate: boolean) {
  const current = state.following.get(profileId) ?? "none"
  const following = new Map(state.following)
  following.set(profileId, current === "none" ? (isPrivate ? "pending" : "accepted") : "none")
  emit({ following, busy: new Set([...state.busy, profileId]) })
  try {
    const result = await connectCommunityMember(profileId, current === "none" ? "follow" : "unfollow")
    if (!result.ok) throw new Error(result.error)
    return { ok: true as const }
  } catch (error) {
    const rollback = new Map(state.following)
    rollback.set(profileId, current)
    emit({ following: rollback })
    return {
      ok: false as const,
      error: error instanceof Error && error.message ? error.message : "Không thể cập nhật theo dõi.",
    }
  } finally {
    const busy = new Set(state.busy)
    busy.delete(profileId)
    emit({ busy })
    // Re-sync the real status (e.g. a request auto-approved meanwhile).
    void load(true)
  }
}

export function useFollow(profileId: string | null | undefined) {
  const snapshot = useSyncExternalStore(subscribe, () => state, () => state)
  useEffect(() => {
    void load()
  }, [])
  return {
    loaded: snapshot.loaded,
    signedIn: snapshot.signedIn,
    self: !!profileId && snapshot.own === profileId,
    status: (profileId ? snapshot.following.get(profileId) : undefined) ?? "none",
    busy: !!profileId && snapshot.busy.has(profileId),
  }
}
