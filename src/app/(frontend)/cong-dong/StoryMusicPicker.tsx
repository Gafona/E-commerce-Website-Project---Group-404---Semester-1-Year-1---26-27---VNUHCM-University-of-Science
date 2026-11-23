"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  Check,
  Loader2,
  Music2,
  Pause,
  Play,
  RefreshCw,
  Search,
  VolumeX,
} from "lucide-react"
import type { StoryMusicTrack } from "@/lib/story-music"
import { loadStoryMusic } from "./social-actions"
import { MusicCredit } from "./MusicCredit"
import { useShop } from "../components/ShopProvider"

export function StoryMusicPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (id: string) => void
}) {
  const { tr } = useShop()
  const [tracks, setTracks] = useState<StoryMusicTrack[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")
  const [preview, setPreview] = useState("")
  const audio = useRef<HTMLAudioElement>(null)
  const generation = useRef(0)
  const load = useCallback(async () => {
    const current = ++generation.current
    setLoading(true)
    setError("")
    try {
      const result = await loadStoryMusic()
      if (current !== generation.current) return
      if (result.ok) setTracks(result.tracks)
      else setError(result.error)
    } catch {
      if (current === generation.current)
        setError(tr("Không thể tải nhạc. Bấm tải lại để thử lần nữa.", "Couldn't load music. Tap reload to try again."))
    } finally {
      if (current === generation.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    void load()
    const player = audio.current
    return () => {
      generation.current++
      player?.pause()
    }
  }, [load])
  const selected = tracks.find((track) => track.id === value)
  const filtered = tracks.filter((track) =>
    `${track.title} ${track.artist}`
      .toLocaleLowerCase()
      .includes(query.trim().toLocaleLowerCase()),
  )
  function listen(track: StoryMusicTrack) {
    const player = audio.current
    if (!player) return
    if (preview === track.id && !player.paused) {
      player.pause()
      setPreview("")
      return
    }
    player.pause()
    player.src = track.url
    player.dataset.trackId = track.id
    setPreview(track.id)
    void player.play().catch(() => {
      setPreview("")
      setError(
        tr(
          "Không thể phát bài này. Hãy thử bài khác hoặc tải lại.",
          "Cannot play this track. Try another track or reload.",
        ),
      )
    })
  }
  return (
    <section
      aria-labelledby="story-music-title"
      className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--paper)]"
    >
      <div className="flex items-center justify-between gap-2 p-3 pb-2">
        <h4
          id="story-music-title"
          className="flex items-center gap-2 text-sm font-bold"
        >
          <Music2 size={17} className="text-[#1677ff]" />
          {tr("Nhạc cho story", "Story music")}
        </h4>
        <span className="text-[10px] text-[var(--muted)]">
          {loading
            ? tr("Đang tải…", "Loading…")
            : tr(`${tracks.length} bài nhạc`, `${tracks.length} tracks`)}
        </span>
      </div>
      <p className="px-3 pb-3 text-[11px] leading-5 text-[var(--muted)]">
        {tr(
          "Bấm nghe thử, rồi chọn bài bạn thích. Nguồn và giấy phép được ghi kèm story.",
          "Preview a track, then choose it. Source and license stay attached to your story.",
        )}
      </p>
      {loading && !tracks.length && (
        <div
          role="status"
          className="flex items-center justify-center gap-2 p-5 text-xs text-[var(--muted)]"
        >
          <Loader2 size={16} className="animate-spin" />
          {tr("Đang tải thư viện nhạc", "Loading music library")}
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mx-3 mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800"
        >
          {error}
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="mt-2 flex items-center gap-1 font-bold underline"
          >
            <RefreshCw size={12} />
            {tr("Tải lại nhạc", "Reload music")}
          </button>
        </div>
      )}
      {!loading && !error && !tracks.length && (
        <div className="px-3 pb-4 text-xs text-[var(--muted)]">
          {tr(
            "Chưa có bài nhạc đang bật trong thư viện.",
            "No active music is available.",
          )}
          <button
            type="button"
            onClick={() => void load()}
            className="ml-2 font-bold text-[#1677ff]"
          >
            {tr("Tải lại", "Reload")}
          </button>
        </div>
      )}
      {tracks.length > 0 && (
        <>
          <label className="mx-3 mb-3 flex items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--white)] px-3 py-2">
            <Search size={14} className="text-[var(--muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tr(
                "Tìm tên bài hoặc tác giả…",
                "Search tracks or artists…",
              )}
              aria-label={tr("Tìm nhạc", "Search music")}
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </label>
          <div
            aria-label={tr("Danh sách nhạc", "Music library")}
            className="max-h-64 space-y-2 overflow-y-auto px-3 pb-3"
          >
            {filtered.map((track) => (
              <div
                key={track.id}
                data-track-id={track.id}
                className={`flex items-center gap-2 rounded-xl border p-2.5 transition ${
                  value === track.id
                    ? "border-[#1677ff] bg-[#1677ff]/5"
                    : "border-[var(--line)] bg-[var(--white)]"
                }`}
              >
                <button
                  type="button"
                  onClick={() => listen(track)}
                  aria-label={tr(
                    `Nghe thử ${track.title}`,
                    `Preview ${track.title}`,
                  )}
                  aria-pressed={preview === track.id}
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--soft-blue)] text-[#1677ff]"
                >
                  {preview === track.id ? (
                    <Pause size={16} />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => onChange(track.id)}
                  aria-pressed={value === track.id}
                  aria-label={tr(
                    `Chọn ${track.title}`,
                    `Choose ${track.title}`,
                  )}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left"
                >
                  <span className="min-w-0 flex-1">
                    <b className="block truncate text-xs">{track.title}</b>
                    <span className="block truncate text-[10px] text-[var(--muted)]">
                      {track.artist}
                      {track.license ? ` · ${track.license}` : ""}
                    </span>
                  </span>
                  {value === track.id ? (
                    <Check size={17} className="shrink-0 text-[#1677ff]" />
                  ) : (
                    <span className="shrink-0 rounded-lg bg-[var(--paper)] px-2 py-1 text-[10px] font-bold text-[#1677ff]">
                      {tr("Chọn", "Choose")}
                    </span>
                  )}
                </button>
              </div>
            ))}
            {!filtered.length && (
              <p className="py-3 text-center text-xs text-[var(--muted)]">
                {tr("Không có bài phù hợp.", "No matching tracks.")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => {
              onChange("")
              audio.current?.pause()
              setPreview("")
            }}
            aria-pressed={!value}
            className="mx-3 mb-2 flex w-[calc(100%-1.5rem)] items-center gap-2 rounded-xl border border-[var(--line)] bg-[var(--white)] p-3 text-left text-xs"
          >
            <VolumeX size={15} />
            <span className="flex-1">{tr("Không dùng nhạc", "No music")}</span>
            {!value && <Check size={15} className="text-[#1677ff]" />}
          </button>
        </>
      )}
      <div className={preview ? "border-t border-[var(--line)] p-3" : "hidden"}>
        <audio
          ref={audio}
          controls
          preload="none"
          className="h-9 w-full"
          onPlay={() => setPreview(audio.current?.dataset.trackId ?? "")}
          onEnded={() => setPreview("")}
          onPause={() => setPreview("")}
          onError={() => {
            setPreview("")
            setError(
              tr(
                "File nhạc chưa tải được. Hãy tải lại thư viện.",
                "Audio could not load. Reload the library.",
              ),
            )
          }}
        />
      </div>
      {selected && (
        <div className="border-t border-[var(--line)] bg-[var(--white)] p-3">
          <p className="mb-1 text-xs font-bold text-[#1677ff]">
            {tr("Đã chọn", "Selected")}: {selected.title}
          </p>
          <MusicCredit track={selected} />
        </div>
      )}
    </section>
  )
}
