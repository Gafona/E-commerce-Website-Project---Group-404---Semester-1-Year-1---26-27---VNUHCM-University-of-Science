// Serializes a rendered garment SVG for PNG export. An SVG drawn through <img> cannot
// see page fonts, so the fonts its text uses are resolved and embedded as data URLs.

const fontCache = new Map<string, Promise<string>>()

const firstFamily = (stack: string) => stack.split(",")[0].trim().replace(/^["']|["']$/g, "")

function toDataUrl(url: string) {
  let pending = fontCache.get(url)
  if (!pending) {
    pending = fetch(url)
      .then((res) => res.blob())
      .then(
        (blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => resolve(String(reader.result))
            reader.onerror = () => reject(reader.error)
            reader.readAsDataURL(blob)
          }),
      )
    fontCache.set(url, pending)
  }
  return pending
}

async function fontFaceCss(families: Set<string>) {
  const rules: string[] = []
  for (const sheet of Array.from(document.styleSheets)) {
    let list: CSSRuleList
    try {
      list = sheet.cssRules
    } catch {
      continue
    }
    for (const rule of Array.from(list)) {
      if (!(rule instanceof CSSFontFaceRule)) continue
      const family = firstFamily(rule.style.getPropertyValue("font-family"))
      if (!families.has(family)) continue
      const match = /url\(["']?([^"')]+)["']?\)/.exec(rule.style.getPropertyValue("src"))
      if (!match) continue
      try {
        const data = await toDataUrl(new URL(match[1], document.baseURI).href)
        const range = rule.style.getPropertyValue("unicode-range")
        const weight = rule.style.getPropertyValue("font-weight")
        rules.push(
          `@font-face{font-family:"${family}";src:url(${data});${weight ? `font-weight:${weight};` : ""}${range ? `unicode-range:${range};` : ""}}`,
        )
      } catch {
        // A font that fails to load falls back to the next family in the stack.
      }
    }
  }
  return rules.join("")
}

export async function serializeWithFonts(svg: SVGSVGElement) {
  const clone = svg.cloneNode(true) as SVGSVGElement
  const sources = svg.querySelectorAll("text")
  const targets = clone.querySelectorAll("text")
  const families = new Set<string>()
  sources.forEach((node, i) => {
    const stack = getComputedStyle(node).fontFamily
    targets[i]?.setAttribute("style", `font-family:${stack}`)
    families.add(firstFamily(stack))
  })
  const css = families.size ? await fontFaceCss(families) : ""
  if (css) {
    const style = document.createElementNS("http://www.w3.org/2000/svg", "style")
    style.textContent = css
    clone.insertBefore(style, clone.firstChild)
  }
  return new XMLSerializer().serializeToString(clone)
}
