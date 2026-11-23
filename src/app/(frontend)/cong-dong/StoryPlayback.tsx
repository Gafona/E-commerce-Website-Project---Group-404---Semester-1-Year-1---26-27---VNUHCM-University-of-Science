"use client"

/** Audio is opt-in: browsers may reject autoplay, and the viewer always has controls. */

import { useEffect, useRef, useState } from "react"
import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react"
import { useShop } from "../components/ShopProvider"
import type { StoryMusicTrack } from "@/lib/story-music"
import { MusicCredit } from "./MusicCredit"
export function StoryPlayback({
  video,
  music,
  onDuration,
  onPlayingChange,
}: {
  video: string | null
  music: StoryMusicTrack | null
  /** Video length in seconds, so the story progress bar can match it. */
  onDuration?: (seconds: number) => void
  /** The viewer paused or resumed playback (the story timer follows). */
  onPlayingChange?: (playing: boolean) => void
}) {
  const { tr } = useShop()
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(true)
  const [sound, setSound] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => {
    const video = videoRef.current,
      audio = audioRef.current
    return () => {
      video?.pause()
      audio?.pause()
    }
  }, [])
  const togglePlay = () => {
    const next = !playing
    setPlaying(next)
    onPlayingChange?.(next)
    if (next) {
      void videoRef.current
        ?.play()
        .catch(() =>
          setError(tr("Bấm phát để xem video.", "Press play to watch.")),
        )
      if (sound) void audioRef.current?.play().catch(() => setSound(false))
    } else {
      videoRef.current?.pause()
      audioRef.current?.pause()
    }
  }
  const toggleSound = () => {
    const next = !sound
    setSound(next)
    if (videoRef.current) videoRef.current.muted = !!music || !next
    if (audioRef.current) {
      if (next && playing) void audioRef.current.play().catch(() => {
          setSound(false)
          setError(
            tr(
              "Không thể phát nhạc. Hãy thử lại.",
              "Unable to play music. Try again.",
            ),
          )
        })
      else audioRef.current.pause()
    }
  }
  return (
    <>
      {video && (
        <video
          ref={videoRef}
          src={video}
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 size-full object-contain"
          onLoadedMetadata={(e) => {
            const seconds = e.currentTarget.duration
            if (Number.isFinite(seconds) && seconds > 0) onDuration?.(seconds)
          }}
          onError={() =>
            setError(
              tr(
                "Video không phát được trong trình duyệt này.",
                "This browser cannot play the video.",
              ),
            )
          }
        />
      )}
      {music && (
        <audio
          ref={audioRef}
          src={music.url}
          loop
          preload="none"
          onError={() =>
            setError(tr("Nhạc không khả dụng.", "Music is unavailable."))
          }
        />
      )}
      <div className="absolute bottom-20 left-4 right-4 z-20 flex flex-wrap items-center gap-2 rounded-xl bg-black/55 p-2 text-white">
        {(video || music) && (
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? tr("Tạm dừng", "Pause") : tr("Phát", "Play")}
            className="rounded-full p-2"
          >
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
        )}
        <button
          type="button"
          onClick={toggleSound}
          aria-label={
            sound
              ? tr("Tắt âm thanh", "Mute")
              : tr("Bật âm thanh", "Enable sound")
          }
          className="flex items-center gap-2 rounded-full p-2 text-[10px]"
        >
          {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
          {sound
            ? tr("Âm thanh bật", "Sound on")
            : tr("Bật âm thanh", "Enable sound")}
        </button>
        {music && (
          <span className="flex min-w-0 flex-1 items-center gap-1 text-[10px]">
            <Music2 size={13} />
            <span className="truncate">
              {music.title}
              {music.artist ? ` · ${music.artist}` : ""}
            </span>
          </span>
        )}
        {music && (
          <span className="w-full px-2">
            <MusicCredit track={music} light />
          </span>
        )}
        {error && (
          <p role="alert" className="w-full text-[10px]">
            {error}
          </p>
        )}
      </div>
    </>
  )
}
