/** Community post photos: re-encoded server-side to JPEG. */
export const POST_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
export const MAX_POST_IMAGES = 4
export const MAX_POST_IMAGE_BYTES = 5 * 1024 * 1024

/** Formats intentionally supported by the story player in modern browsers. */
export const STORY_VIDEO_TYPES = ["video/mp4", "video/webm"]
export const MAX_STORY_VIDEO = 30 * 1024 * 1024

/** Inspect container signatures, not just the browser-supplied MIME label. */
export function validStoryVideo(data: Uint8Array, mime: string) {
  if (mime === "video/mp4")
    return (
      data.length >= 12 &&
      Buffer.from(data.subarray(4, 8)).toString() === "ftyp"
    )
  return (
    mime === "video/webm" &&
    data[0] === 0x1a &&
    data[1] === 0x45 &&
    data[2] === 0xdf &&
    data[3] === 0xa3
  )
}
