"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { useActionState, useEffect, useRef, useState } from "react"
import { Camera, LoaderCircle, Trash2 } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import { updateAvatarAction, type AvatarState } from "./avatar-actions"
import { ASPECTS, setInputFiles, useImageCropper } from "../components/ImageCropper"

const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 5 * 1024 * 1024
// Large originals are fine: the crop step re-encodes them before upload.
const MAX_SOURCE_BYTES = 25 * 1024 * 1024

export function AvatarUploader({
  name,
  avatarUrl,
  kind = "avatar",
}: {
  name: string
  avatarUrl: string | null
  kind?: "avatar" | "cover"
}) {
  const { tr } = useShop()
  const router = useRouter()
  const formRef = useRef<HTMLFormElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [clientError, setClientError] = useState("")
  const { cropImage, cropper } = useImageCropper()
  const [state, action, pending] = useActionState<AvatarState, FormData>(
    updateAvatarAction,
    { ok: false },
  )

  useEffect(() => {
    if (!state.ok) return
    router.refresh()
  }, [router, state])

  useEffect(() => {
    if (!state.error) return
    setPreview(null)
  }, [state])

  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview)
    },
    [preview],
  )

  const shown = preview ?? avatarUrl
  const message = clientError || state.error || (state.ok && state.message)

  return (
    <form
      ref={formRef}
      action={action}
      className={`flex flex-col items-center gap-2 ${
        kind === "cover" ? "w-full rounded-2xl bg-[#071a33] p-3" : ""
      }`}
    >
      <input type="hidden" name="kind" value={kind} />
      <label
        className={`group relative block cursor-pointer bg-white ring-4 ring-white/25 transition hover:ring-white/50 ${
          kind === "cover"
            ? "h-32 w-full overflow-hidden rounded-xl md:h-48"
            : "size-[84px] rounded-full"
        }`}
        title={
          kind === "cover"
            ? tr("Đổi ảnh bìa", "Change cover photo")
            : tr("Đổi ảnh đại diện", "Change avatar")
        }
      >
        <span
          className={`absolute inset-0 grid place-items-center overflow-hidden font-[family-name:var(--display)] text-[40px] font-extrabold text-[var(--lime-dark)] ${
            kind === "cover"
              ? "rounded-xl bg-gradient-to-br from-[#153b78] to-[#1677ff]"
              : "rounded-full"
          }`}
        >
          {shown ? (
            <Image
              src={shown}
              alt={
                kind === "cover"
                  ? tr(`Ảnh bìa của ${name}`, `${name}'s cover photo`)
                  : tr(`Ảnh đại diện của ${name}`, `${name}'s avatar`)
              }
              fill
              sizes={
                kind === "cover" ? "(max-width: 900px) 90vw, 1180px" : "84px"
              }
              unoptimized={Boolean(preview)}
              className="object-cover"
            />
          ) : kind === "cover" ? (
            <span className="flex items-center gap-2 text-sm text-white">
              <Camera size={20} />
              {tr("Thêm ảnh bìa", "Add cover photo")}
            </span>
          ) : (
            name.slice(0, 1).toUpperCase()
          )}
          <span
            className={`absolute inset-0 grid place-items-center bg-[#071a33]/55 text-white transition ${
              pending ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {pending ? (
              <LoaderCircle size={24} className="animate-spin" />
            ) : (
              <Camera size={22} />
            )}
          </span>
        </span>
        <span className="absolute -right-0.5 -bottom-0.5 grid size-7 place-items-center rounded-full border-2 border-white bg-[#071a33] text-white shadow-md">
          <Camera size={13} />
        </span>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          name="avatar"
          accept={ALLOWED_TYPES.join(",")}
          disabled={pending}
          onChange={async (input) => {
            const field = input.target
            const file = field.files?.[0]
            setClientError("")
            if (!file) return
            const invalid = tr(
              "Chọn ảnh JPG, PNG hoặc WebP, tối đa 5 MB.",
              "Choose a JPG, PNG or WebP image up to 5 MB.",
            )
            if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_SOURCE_BYTES) {
              setClientError(invalid)
              field.value = ""
              return
            }
            const cropped = await cropImage(file, {
              title:
                kind === "cover"
                  ? tr("Cắt ảnh bìa", "Crop cover photo")
                  : tr("Cắt ảnh đại diện", "Crop avatar"),
              aspects:
                kind === "cover"
                  ? [ASPECTS.banner, ASPECTS.wide]
                  : [ASPECTS.square],
              round: kind === "avatar",
              maxOutput: kind === "cover" ? 2400 : 1024,
            })
            if (!cropped || cropped.size > MAX_BYTES) {
              if (cropped) setClientError(invalid)
              field.value = ""
              return
            }
            setInputFiles(field, [cropped])
            setPreview(URL.createObjectURL(cropped))
            formRef.current?.requestSubmit()
          }}
        />
      </label>
      {(avatarUrl || (preview && state.ok)) && !pending && (
        <button
          type="submit"
          name="intent"
          value="remove"
          disabled={pending}
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ""
            setPreview(null)
          }}
          className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[10px] font-bold text-white/80 underline-offset-2 hover:text-white hover:underline disabled:opacity-60"
        >
          <Trash2 size={11} /> {tr("Xóa ảnh", "Remove")}
        </button>
      )}
      {cropper}
      {message && (
        <p
          role={clientError || state.error ? "alert" : "status"}
          className="m-0 max-w-40 text-center text-[10px] leading-4 font-semibold text-white"
        >
          {message}
        </p>
      )}
    </form>
  )
}
