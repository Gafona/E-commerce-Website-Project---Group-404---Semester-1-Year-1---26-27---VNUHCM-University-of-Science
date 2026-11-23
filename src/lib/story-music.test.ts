import assert from "node:assert/strict"
import test from "node:test"
import type { StoryMusic } from "@/payload-types"
import { toStoryMusicTrack } from "./story-music.ts"
import { normalizeAudioMime } from "./audio-files.ts"

const music = (data: Record<string, unknown>) =>
  ({
    id: "track",
    title: "Carefree",
    artist: "Kevin MacLeod",
    audio: { url: "/api/media/file/carefree.mp3", mimeType: "audio/mpeg" },
    ...data,
  }) as unknown as StoryMusic

test("missing uploads do not crash or erase the rest of the music library", () => {
  const docs = [
    music({ audio: null }),
    music({ audio: "unpopulated-id" }),
    music({}),
  ]
  const tracks = docs.flatMap((m) => {
    const track = toStoryMusicTrack(m)
    return track ? [track] : []
  })
  assert.equal(tracks.length, 1)
  assert.equal(tracks[0].title, "Carefree")
  assert.equal(
    toStoryMusicTrack(
      music({ audio: { mimeType: "image/jpeg", url: "/photo.jpg" } }),
    ),
    null,
  )
})

test("source and license links are carried into story playback safely", () => {
  const track = toStoryMusicTrack(
    music({
      sourceUrl: "https://incompetech.com/music/",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    }),
  )!
  assert.equal(track.license, "CC BY 4.0")
  assert.equal(track.sourceUrl, "https://incompetech.com/music/")
  assert.equal(
    toStoryMusicTrack(music({ sourceUrl: "javascript:alert(1)" }))!.sourceUrl,
    null,
  )
})

test("generic external MP3 MIME labels are corrected only with an audio signature", () => {
  const bytes = Buffer.from("ID3\x04\x00\x00\x00\x00\x00\x00")
  assert.equal(
    normalizeAudioMime("music.mp3", "application/octet-stream", bytes),
    "audio/mpeg",
  )
  assert.equal(
    normalizeAudioMime(
      "music.mp3",
      "application/octet-stream",
      Buffer.from("<html>error</html>"),
    ),
    "application/octet-stream",
  )
  assert.equal(
    normalizeAudioMime("movie.mp4", "application/octet-stream", bytes),
    "application/octet-stream",
  )
  assert.equal(
    normalizeAudioMime("music.mp3", "audio/mpeg", bytes),
    "audio/mpeg",
  )
})
