import { makeSiteSettings } from "./make-site-settings"

/**
 * Social preview for pages without their own image: the image set in the Make
 * site settings when there is one, otherwise the generated BOAI brand card.
 */
export function defaultSocialImages() {
  const configured = makeSiteSettings.openGraph?.image
  return configured ? [configured] : [{ url: "/api/og/mac-dinh", width: 1200, height: 630, alt: "BOAI" }]
}
