"use client"

/** The membership card itself is the cover — no separate image panel. */

import Image from "next/image"
import { useActionState, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera, LoaderCircle, Trash2 } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { updateAvatarAction, type AvatarState } from "./avatar-actions"
import { ASPECTS, setInputFiles, useImageCropper } from "../components/ImageCropper"
export function ProfileBanner({
  name,
  coverUrl,
  children,
}: {
  name: string
  coverUrl: string | null
  children: React.ReactNode
}) {
  const { tr } = useShop()
  const router = useRouter()
  const form = useRef<HTMLFormElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const intent = useRef<"upload" | "remove">("upload")
  const [preview, setPreview] = useState<string | null>(null)
  const [removed, setRemoved] = useState(false)
  const [error, setError] = useState("")
  const { cropImage, cropper } = useImageCropper()
  const [state, action, pending] = useActionState<AvatarState, FormData>(
    updateAvatarAction,
    { ok: false },
  )

  useEffect(() => {
    if (state.ok) {
      if (intent.current === "remove") setRemoved(true)
      if (fileInput.current) fileInput.current.value = ""
      router.refresh()
    } else if (state.error) {
      setPreview(null)
    }
  }, [state, router])

  useEffect(() => {
    setPreview(null)
    setRemoved(false)
  }, [coverUrl])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const image = preview ?? (removed ? null : coverUrl)
  const feedback = pending
    ? ""
    : error || state.error || (state.ok ? state.message : "")

  return (
    <section
      className="profile-banner"
      aria-label={tr("Thẻ thành viên", "Member card")}
    >
      {image && (
        <Image
          src={image}
          alt={tr(`Ảnh bìa của ${name}`, `${name}'s cover photo`)}
          fill
          preload
          sizes="(max-width: 1200px) 94vw, 1180px"
          unoptimized={Boolean(preview)}
          className="pointer-events-none object-cover"
        />
      )}
      {image && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#06162e]/90 via-[#06162e]/65 to-[#06162e]/50"
        />
      )}
      <div className="relative z-10 mb-5 flex min-h-8 flex-wrap items-center justify-end gap-2">
        <form
          ref={form}
          action={action}
          className="flex flex-wrap items-center justify-end gap-2"
        >
          <input type="hidden" name="kind" value="cover" />
          <input
            ref={fileInput}
            type="file"
            name="avatar"
            accept="image/jpeg,image/png,image/webp"
            aria-label={tr("Chọn ảnh bìa", "Choose cover photo")}
            disabled={pending}
            className="sr-only"
            onChange={async (event) => {
              const field = event.target
              const file = field.files?.[0]
              setError("")
              if (!file) return
              const invalid = tr(
                "Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.",
                "Choose a JPG, PNG or WebP image up to 5 MB.",
              )
              if (
                !["image/jpeg", "image/png", "image/webp"].includes(
                  file.type,
                ) ||
                file.size > 25 * 1024 * 1024
              ) {
                setError(invalid)
                field.value = ""
                return
              }
              const cropped = await cropImage(file, {
                title: tr("Cắt ảnh bìa", "Crop cover photo"),
                aspects: [ASPECTS.banner, ASPECTS.wide],
                maxOutput: 2400,
              })
              if (!cropped || cropped.size > 5 * 1024 * 1024) {
                if (cropped) setError(invalid)
                field.value = ""
                return
              }
              setInputFiles(field, [cropped])
              intent.current = "upload"
              setRemoved(false)
              setPreview(URL.createObjectURL(cropped))
              form.current?.requestSubmit()
            }}
          />
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInput.current?.click()}
            className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-[11px] font-bold text-white backdrop-blur-sm transition hover:bg-black/40 disabled:opacity-60"
          >
            {pending ? (
              <LoaderCircle size={15} className="animate-spin" />
            ) : (
              <Camera size={15} />
            )}
            {pending
              ? tr("Đang lưu…", "Saving…")
              : image
                ? tr("Đổi ảnh bìa", "Change cover")
                : tr("Thêm ảnh bìa", "Add cover")}
          </button>
          {image && !pending && (
            <button
              type="submit"
              name="intent"
              value="remove"
              onClick={() => {
                intent.current = "remove"
                setError("")
                setPreview(null)
                if (fileInput.current) fileInput.current.value = ""
              }}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-white/30 bg-black/25 px-3 py-2 text-[11px] font-bold text-white transition hover:bg-black/40"
            >
              <Trash2 size={13} />
              {tr("Xóa ảnh bìa", "Remove cover")}
            </button>
          )}
        </form>
      </div>
      <div className="relative z-10 flex min-w-0 flex-wrap items-center gap-x-5 gap-y-4">
        {children}
      </div>
      {cropper}
      {feedback && (
        <div
          role={error || state.error ? "alert" : "status"}
          className="relative z-10 mt-3 w-fit max-w-full rounded-lg bg-black/30 px-3 py-2 text-[11px] font-semibold text-white"
        >
          {feedback}
        </div>
      )}
    </section>
  )
}
