"use client"

import { useRouter } from "next/navigation"
import { StoryRail } from "./StoryRail"

/** Stories plus the entry to member messages, which live in the unified inbox (/tin-nhan). */
export function CommunitySocialHub({ signedIn }: { signedIn: boolean }) {
  const router = useRouter()
  return (
    <StoryRail
      signedIn={signedIn}
      onMessage={(target) =>
        router.push(target ? `/tin-nhan?voi=${encodeURIComponent(target)}` : "/tin-nhan?tab=ban-be")
      }
    />
  )
}
