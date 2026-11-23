"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"
import Link from "next/link"
import { communityDisplayId, communityProfileHref } from "@/lib/community-identity"
import { useShop } from "../components/ShopProvider"

export function CommunityIdBadge({
  profileId,
  handle,
}: {
  profileId: string
  /** Existing custom handles stay searchable; the badge uses the short code. */
  handle?: string | null
}) {
  const { tr } = useShop()
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle")
  const publicId = communityDisplayId(profileId, handle)
  return (
    <div className="my-2 min-w-0">
      <div className="flex min-w-0 items-start gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] px-2 py-1.5">
        <Link
          href={communityProfileHref(profileId)}
          aria-label={tr(`Xem trang cá nhân ${publicId}`, `View profile ${publicId}`)}
          title={publicId}
          className="min-w-0 flex-1 self-center whitespace-nowrap font-mono text-[11px] leading-4 text-[var(--muted)] hover:text-[#1677ff] hover:underline"
        >
          {publicId}
        </Link>
        <button
          type="button"
          aria-label={tr(`Sao chép ID ${publicId}`, `Copy ID ${publicId}`)}
          title={tr("Sao chép mã cộng đồng", "Copy community ID")}
          className="shrink-0 rounded p-1 text-[#1677ff] hover:bg-[var(--soft-blue)]"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(publicId)
              setStatus("copied")
            } catch {
              setStatus("error")
            }
          }}
        >
          {status === "copied" ? <Check size={13} /> : <Copy size={13} />}
        </button>
      </div>
      {status !== "idle" && (
        <p role="status" className="mt-1 text-[10px] text-[var(--muted)]">
          {status === "copied"
            ? tr("Đã sao chép ID.", "ID copied.")
            : tr(
                "Không thể sao chép tự động. Hãy thử lại hoặc sao chép địa chỉ trang cá nhân.",
                "Automatic copy failed. Try again or copy the profile page address.",
              )}
        </p>
      )}
    </div>
  )
}
