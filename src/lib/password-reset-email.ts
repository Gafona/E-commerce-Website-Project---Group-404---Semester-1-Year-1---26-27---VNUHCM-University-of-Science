import type { Lang } from "./i18n"
import { RESET_LINK_MINUTES } from "./password-policy"

/**
 * Canonical public origin for links inside emails. The build-time site URL
 * wins so a forged Host header can never point a reset link elsewhere; the
 * request origin is only a local-development fallback.
 */
export function siteOrigin(requestHeaders?: Headers | null) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL
  if (configured && !/localhost|127\.0\.0\.1|0\.0\.0\.0/.test(configured)) return configured.replace(/\/+$/, "")
  const host = requestHeaders?.get("x-forwarded-host") ?? requestHeaders?.get("host")
  if (host) {
    const proto = requestHeaders?.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https"
    return `${proto}://${host.split(",")[0].trim()}`
  }
  return (configured || "http://localhost:3000").replace(/\/+$/, "")
}

export function resetPasswordLink(origin: string, token: string) {
  return `${origin}/dat-lai-mat-khau?token=${encodeURIComponent(token)}`
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]!)

export function resetEmailSubject(lang: Lang = "vi") {
  return lang === "en" ? "Reset your BOAI password" : "Đặt lại mật khẩu tài khoản BOAI"
}

/** Table-based, inline-styled HTML so it renders in Gmail, Outlook and mobile clients. */
export function resetEmailHTML({ link, name, lang = "vi" }: { link: string; name?: string | null; lang?: Lang }) {
  const en = lang === "en"
  const safeLink = escapeHtml(link)
  const greeting = name?.trim()
    ? `${en ? "Hi" : "Xin chào"} ${escapeHtml(name.trim())},`
    : en ? "Hi," : "Xin chào,"
  const copy = en
    ? {
        intro: "We received a request to reset the password of the BOAI account linked to this email.",
        button: "Reset password",
        expiry: `This link expires in ${RESET_LINK_MINUTES} minutes and can be used only once.`,
        fallback: "If the button doesn't work, copy this link into your browser:",
        ignore: "Didn't ask for this? Ignore this email — your password stays the same.",
        footer: "BOAI · Sports gear for football and badminton",
      }
    : {
        intro: "BOAI nhận được yêu cầu đặt lại mật khẩu cho tài khoản gắn với email này.",
        button: "Đặt lại mật khẩu",
        expiry: `Liên kết có hiệu lực trong ${RESET_LINK_MINUTES} phút và chỉ dùng được một lần.`,
        fallback: "Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:",
        ignore: "Nếu bạn không yêu cầu, hãy bỏ qua email này — mật khẩu của bạn sẽ không thay đổi.",
        footer: "BOAI · Thiết bị bóng đá và cầu lông",
      }
  return `<!doctype html>
<html lang="${en ? "en" : "vi"}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(resetEmailSubject(lang))}</title></head>
<body style="margin:0;padding:0;background:#f2f5f9;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f5f9;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #e3e8ef;font-family:Arial,Helvetica,sans-serif;color:#171816;">
<tr><td style="padding:24px 28px;border-bottom:1px solid #e3e8ef;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr>
<td style="width:30px;height:30px;background:#1677ff;color:#ffffff;font-size:17px;font-weight:900;font-style:italic;text-align:center;line-height:30px;">B</td>
<td style="padding-left:10px;font-size:22px;font-weight:900;letter-spacing:-0.5px;">BOAI</td>
</tr></table>
</td></tr>
<tr><td style="padding:28px 28px 8px;font-size:15px;line-height:1.6;">
<p style="margin:0 0 12px;font-weight:bold;">${greeting}</p>
<p style="margin:0 0 24px;">${copy.intro}</p>
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="background:#1677ff;">
<a href="${safeLink}" style="display:inline-block;padding:14px 26px;color:#ffffff;font-size:14px;font-weight:bold;text-decoration:none;text-transform:uppercase;letter-spacing:0.5px;">${copy.button}</a>
</td></tr></table>
<p style="margin:20px 0 0;padding:12px 14px;background:#eef5ff;font-size:13px;">${copy.expiry}</p>
<p style="margin:20px 0 6px;font-size:12px;color:#6b6f68;">${copy.fallback}</p>
<p style="margin:0 0 20px;font-size:12px;word-break:break-all;"><a href="${safeLink}" style="color:#0b5ed7;">${safeLink}</a></p>
<p style="margin:0 0 24px;font-size:12px;color:#6b6f68;">${copy.ignore}</p>
</td></tr>
<tr><td style="padding:16px 28px;border-top:1px solid #e3e8ef;font-size:11px;color:#6b6f68;">${copy.footer}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}
