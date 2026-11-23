import Image from "next/image"
import { Store } from "lucide-react"
import { communityDisplayText } from "@/lib/community-rules"

export const communityName = (name: string) =>
  communityDisplayText(name.replace(/\s*[·–-]\s*Minh họa\s*$/iu, ""))

const palettes = [
  {
    avatar: "bg-amber-200",
    cover: "from-amber-300 via-orange-200 to-rose-200",
    shirt: "#b45309",
  },
  {
    avatar: "bg-sky-200",
    cover: "from-sky-300 via-cyan-200 to-teal-100",
    shirt: "#0369a1",
  },
  {
    avatar: "bg-violet-200",
    cover: "from-violet-300 via-fuchsia-200 to-pink-100",
    shirt: "#7c3aed",
  },
  {
    avatar: "bg-emerald-200",
    cover: "from-emerald-300 via-teal-200 to-lime-100",
    shirt: "#047857",
  },
  {
    avatar: "bg-rose-200",
    cover: "from-rose-300 via-pink-200 to-orange-100",
    shirt: "#be123c",
  },
  {
    avatar: "bg-indigo-200",
    cover: "from-indigo-300 via-blue-200 to-sky-100",
    shirt: "#4338ca",
  },
] as const

function nameHash(name: string) {
  return [...communityName(name)].reduce(
    (hash, character) => (hash * 31 + character.charCodeAt(0)) >>> 0,
    7,
  )
}

export const communityPalette = (name: string) =>
  palettes[nameHash(name) % palettes.length]

export function CommunityAvatar({
  name,
  small = false,
  large = false,
  shop = false,
  image,
}: {
  name: string
  small?: boolean
  large?: boolean
  image?: string | null
  shop?: boolean
}) {
  const hash = nameHash(name)
  const palette = communityPalette(name)
  const skin = ["#f3c7a2", "#dca47d", "#bd805c", "#f5d7bd"][hash % 4]
  return (
    <span
      role="img"
      aria-label={`Avatar ${communityName(name)}`}
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full ring-2 ring-[var(--white)] ${palette.avatar} ${
        large ? "size-16 shadow-md" : small ? "size-8" : "size-11"
      }`}
    >
      {image ? (
        <Image
          src={image}
          alt={communityName(name)}
          fill
          sizes={large ? "64px" : "44px"}
          className="object-cover"
        />
      ) : shop ? (
        <Store
          size={large ? 29 : 22}
          className="text-slate-800"
          strokeWidth={1.7}
        />
      ) : (
        <svg viewBox="0 0 64 64" className="size-full" aria-hidden="true">
          <circle cx="51" cy="12" r="16" fill="white" opacity=".24" />
          <path d="M7 66c1-17 10-25 25-25s24 8 25 25" fill={palette.shirt} />
          <path d="m21 45 11 13 11-13" fill="white" opacity=".85" />
          <path d="M27 37h10v11c-3 4-7 4-10 0z" fill={skin} />
          <ellipse cx="32" cy="28" rx="14" ry="17" fill={skin} />
          {hash % 2 === 0 ? (
            <path
              d="M17 29c-3-14 4-21 15-21 12 0 17 10 14 21l-5-13c-7 6-14 7-20 5l-3 8z"
              fill="#292524"
            />
          ) : (
            <path
              d="M17 28c-4-12 3-21 15-21 13 0 19 11 14 23l-4-11c-6 1-14-1-19-5l-5 14z"
              fill="#442e27"
            />
          )}
          <circle cx="27" cy="29" r="1.3" fill="#292524" />
          <circle cx="38" cy="29" r="1.3" fill="#292524" />
          <path
            d="M28 36q4 4 8 0"
            fill="none"
            stroke="#874b37"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          {hash % 3 === 0 && (
            <path
              d="M21 27h10v6H21zm13 0h10v6H34zm-3 2h3"
              fill="none"
              stroke="#292524"
              strokeWidth="1.2"
            />
          )}
        </svg>
      )}
    </span>
  )
}
