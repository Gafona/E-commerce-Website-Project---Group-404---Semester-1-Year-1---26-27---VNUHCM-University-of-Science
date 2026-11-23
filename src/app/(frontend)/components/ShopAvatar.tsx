import Image from "next/image"

export function ShopAvatar({
  name,
  url,
  size = 56,
  className = "",
}: {
  name: string
  url: string | null
  size?: number
  className?: string
}) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--lime-dark)] font-[family-name:var(--display)] font-extrabold text-white ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.44) }}
    >
      {url ? (
        <Image
          src={url}
          alt={name}
          fill
          sizes={`${size}px`}
          className="object-cover"
        />
      ) : (
        name.slice(0, 1).toUpperCase()
      )}
    </span>
  )
}
