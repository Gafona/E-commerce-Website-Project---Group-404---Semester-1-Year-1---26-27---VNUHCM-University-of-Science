import type { StoryMusic } from "@/payload-types"

export type StoryMusicTrack = {
  id: string
  title: string
  artist: string
  url: string
  sourceUrl: string | null
  license: string | null
  licenseUrl: string | null
}

const httpsLink = (value: string | null | undefined) =>
  value && /^https:\/\/\S+$/i.test(value) ? value : null

/** A missing upload must not make the entire music library disappear. */
export function toStoryMusicTrack(music: StoryMusic): StoryMusicTrack | null {
  const audio = music.audio
  if (!audio || typeof audio !== "object" || !audio.url) return null
  if (!audio.mimeType?.startsWith("audio/")) return null
  return {
    id: music.id,
    title: music.title,
    artist: music.artist ?? "",
    url: audio.url,
    sourceUrl: httpsLink(music.sourceUrl),
    license: music.license ?? null,
    licenseUrl: httpsLink(music.licenseUrl),
  }
}
