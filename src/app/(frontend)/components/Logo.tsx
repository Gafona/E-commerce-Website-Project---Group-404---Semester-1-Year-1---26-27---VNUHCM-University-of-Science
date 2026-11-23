import Link from "next/link"

export function Logo() {
  return (
    <Link className="boai-logo" href="/" aria-label="BOAI">
      <span className="boai-logo-mark">B</span>
      <span>BOAI</span>
    </Link>
  )
}
