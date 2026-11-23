import "server-only"
import sharp from "sharp"
import type { User } from "@/payload-types"
import { getPayloadClient } from "./payload"

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])
export const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024

/** Uploaded files from a form that are real, non-empty images within the size limit. */
export function pickImages(files: FormDataEntryValue[], max: number) {
  const images = files.filter((f): f is File => f instanceof File && f.size > 0)
  if (images.length > max) return { error: `Tối đa ${max} ảnh.` } as const
  if (images.some((f) => !IMAGE_TYPES.has(f.type) || f.size > MAX_EVIDENCE_BYTES)) return { error: "Ảnh phải là JPG, PNG hoặc WebP, tối đa 5 MB." } as const
  return { images } as const
}

/**
 * Stores evidence photos (returns, achievements) as the member's own media,
 * re-encoded and resized so originals' metadata never leaves the browser.
 */
export async function uploadUserImages(user: User & { collection: "users" }, files: File[], alt: string) {
  const payload = await getPayloadClient()
  const ids: string[] = []
  for (const file of files) {
    const data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 30_000_000 })
      .rotate()
      .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 84 })
      .toBuffer()
    const media = await payload.create({
      collection: "media",
      data: { alt: alt.slice(0, 120) },
      file: { data, mimetype: "image/jpeg", name: `evidence-${crypto.randomUUID()}.jpg`, size: data.length },
      context: { communityUpload: true },
      overrideAccess: false,
      user,
    })
    ids.push(String(media.id))
  }
  return ids
}
