import type { StoryMusicTrack } from "@/lib/story-music"

/** Attribution stays visible both while composing and when viewing the story. */
export function MusicCredit({
  track,
  light = false,
}: {
  track: StoryMusicTrack
  light?: boolean
}) {
  if (!track.sourceUrl && !track.license) return null
  return (
    <span
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] leading-4 ${
        light ? "text-white/80" : "text-[var(--muted)]"
      }`}
    >
      <span>
        {track.title} · {track.artist}
      </span>
      {track.sourceUrl && (
        <a
          href={track.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2"
        >
          Nguồn / Source
        </a>
      )}
      {track.license &&
        (track.licenseUrl ? (
          <a
            href={track.licenseUrl}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            {track.license}
          </a>
        ) : (
          <span>{track.license}</span>
        ))}
    </span>
  )
}
