"use server"

import sharp from "sharp"
import { revalidatePath } from "next/cache"
import { appAuth } from "@/lib/app-auth"
import { getTr } from "@/lib/i18n-server"
import { getPayloadClient } from "@/lib/payload"

export type AvatarState = {
  ok: boolean
  error?: string
  message?: string
}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"])

/**
 * The account is the source of truth; the Users afterChange hook mirrors the
 * photo to the public community profile. Refresh both pages for this member.
 */
async function refreshProfilePages(userId: string | number) {
  try {
    revalidatePath("/tai-khoan")
    const payload = await getPayloadClient()
    const { docs } = await payload.find({ collection: "community-profiles", where: { account: { equals: userId } }, limit: 1, depth: 0, overrideAccess: true, select: {} })
    if (docs[0]) revalidatePath(`/nguoi-dung/${docs[0].id}`)
  } catch {
    // Revalidation is best effort; the pages render per request anyway.
  }
}
const MAX_BYTES = 5 * 1024 * 1024

export async function updateAvatarAction(
  _previous: AvatarState,
  formData: FormData,
): Promise<AvatarState> {
  const tr = await getTr()
  const user = await appAuth.currentUser()
  if (!user) {
    return {
      ok: false,
      error: tr("Bạn cần đăng nhập.", "You need to sign in."),
    }
  }

  const field = formData.get("kind") === "cover" ? "cover" : "avatar"
  const label =
    field === "cover"
      ? tr("ảnh bìa", "cover photo")
      : tr("ảnh đại diện", "avatar")
  const payload = await getPayloadClient()

  if (formData.get("intent") === "remove") {
    try {
      await payload.update({
        collection: "users",
        id: user.id,
        data: { [field]: null },
        overrideAccess: false,
        user,
      })
      await refreshProfilePages(user.id)
      return {
        ok: true,
        message: `${tr("Đã xóa", "Removed")} ${label}.`,
      }
    } catch (error) {
      console.error("updateAvatarAction: remove failed", error)
      return {
        ok: false,
        error: tr(
          "Không thể xóa ảnh hồ sơ. Vui lòng thử lại.",
          "Could not remove profile photo. Please retry.",
        ),
      }
    }
  }

  const file = formData.get("avatar")
  if (!(file instanceof File) || file.size === 0) {
    return {
      ok: false,
      error: tr("Hãy chọn một ảnh.", "Please choose an image."),
    }
  }
  if (!ALLOWED_TYPES.has(file.type) || file.size > MAX_BYTES) {
    return {
      ok: false,
      error: tr(
        "Ảnh phải là JPG, PNG hoặc WebP, tối đa 5 MB.",
        "Choose a JPG, PNG or WebP image up to 5 MB.",
      ),
    }
  }

  try {
    const data = await sharp(Buffer.from(await file.arrayBuffer()), {
      limitInputPixels: 30_000_000,
    })
      .rotate()
      .resize(field === "cover" ? 1800 : 512, field === "cover" ? 650 : 512, {
        fit: "cover",
        position: "attention",
      })
      .jpeg({ quality: 86 })
      .toBuffer()

    const media = await payload.create({
      collection: "media",
      data: { alt: `${label} của ${user.name}` },
      file: {
        data,
        mimetype: "image/jpeg",
        name: `avatar-${crypto.randomUUID()}.jpg`,
        size: data.length,
      },
      context: { communityUpload: true },
      overrideAccess: false,
      user,
    })

    await payload.update({
      collection: "users",
      id: user.id,
      data: { [field]: media.id },
      overrideAccess: false,
      user,
    })
    await refreshProfilePages(user.id)
  } catch (error) {
    console.error("updateAvatarAction: upload failed", error)
    return {
      ok: false,
      error: tr(
        "Không thể cập nhật ảnh hồ sơ. Hãy thử ảnh khác.",
        "Could not update your profile photo. Please try another image.",
      ),
    }
  }

  return {
    ok: true,
    message: `${tr("Đã cập nhật", "Updated")} ${label}.`,
  }
}
