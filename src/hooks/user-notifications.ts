import type { CollectionAfterChangeHook } from "payload"
import { notifyAdmins, notifyUsers } from "../lib/notifications"

type Snapshot = {
  id?: string | number
  name?: string | null
  sellerStatus?: string | null
  sellerReviewNote?: string | null
  seller?: { shopName?: string | null } | null
  moderation?: { postingBanned?: boolean | null; chatBanned?: boolean | null; reason?: string | null } | null
  shopBan?: {
    reason?: string | null
    appealStatus?: string | null
    appealResponse?: string | null
    appealMessage?: string | null
  } | null
}

/** Account, seller-review, shop-ban and appeal notifications. */
export const notifyAccountChanges: CollectionAfterChangeHook = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== "update" || !previousDoc) return doc
  const before = previousDoc as Snapshot
  const after = doc as Snapshot
  const me = [after.id]
  const shop = after.seller?.shopName?.trim() || after.name || "Cửa hàng"

  if (before.sellerStatus !== after.sellerStatus) {
    switch (after.sellerStatus) {
      case "pending":
        await notifyUsers(req, me, {
          category: "shop",
          kind: "seller-submitted",
          title: "Đã gửi hồ sơ mở cửa hàng",
          message: "BOAI sẽ xem xét hồ sơ và báo kết quả cho bạn tại đây.",
          href: "/dang-ky-ban-hang",
        })
        await notifyAdmins(req, {
          category: "shop",
          kind: "admin-seller-application",
          title: `Hồ sơ người bán mới: ${shop}`,
          message: `${after.name ?? "Một thành viên"} vừa gửi hồ sơ mở cửa hàng.`,
          href: "/quan-tri/nguoi-ban",
          actorName: after.name ?? null,
        })
        break
      case "approved":
        await notifyUsers(req, me, before.sellerStatus === "suspended"
          ? {
              category: "shop",
              kind: "shop-restored",
              title: "Cửa hàng đã được mở khóa",
              message: "Sản phẩm của bạn đã hiển thị trở lại. Cảm ơn bạn đã hợp tác cùng BOAI.",
              href: "/kenh-ban-hang",
            }
          : {
              category: "shop",
              kind: "seller-approved",
              title: "Cửa hàng đã được duyệt",
              message: `${shop} đã sẵn sàng. Hãy đăng sản phẩm đầu tiên ngay hôm nay.`,
              href: "/kenh-ban-hang/san-pham",
            })
        break
      case "rejected":
        await notifyUsers(req, me, {
          category: "shop",
          kind: before.sellerStatus === "approved" ? "seller-revoked" : "seller-rejected",
          title: before.sellerStatus === "approved" ? "Quyền bán hàng đã bị thu hồi" : "Hồ sơ người bán chưa được duyệt",
          message: after.sellerReviewNote || "Vui lòng xem lại thông tin và gửi lại hồ sơ.",
          href: "/dang-ky-ban-hang",
        })
        break
      case "suspended":
        await notifyUsers(req, me, {
          category: "shop",
          kind: "shop-suspended",
          title: "Cửa hàng của bạn đã bị khóa",
          message: after.shopBan?.reason ? `Lý do: ${after.shopBan.reason}` : "Quản trị viên BOAI đã tạm khóa cửa hàng của bạn.",
          href: "/khoa-cua-hang",
        })
        break
    }
  }

  const appealBefore = before.shopBan?.appealStatus ?? "none"
  const appealAfter = after.shopBan?.appealStatus ?? "none"
  if (appealBefore !== appealAfter && after.sellerStatus === "suspended") {
    if (appealAfter === "pending") {
      await notifyUsers(req, me, {
        category: "shop",
        kind: "appeal-submitted",
        title: "Đã gửi kháng cáo",
        message: "Quản trị viên BOAI sẽ xem xét và phản hồi sớm nhất có thể.",
        href: "/khoa-cua-hang",
      })
      await notifyAdmins(req, {
        category: "shop",
        kind: "admin-appeal",
        title: `Kháng cáo mới từ ${shop}`,
        message: after.shopBan?.appealMessage ?? null,
        href: "/quan-tri/nguoi-ban?status=suspended",
        actorName: shop,
      })
    } else if (appealAfter === "rejected") {
      await notifyUsers(req, me, {
        category: "shop",
        kind: "appeal-rejected",
        title: "Kháng cáo chưa được chấp nhận",
        message: after.shopBan?.appealResponse || "Cửa hàng vẫn tiếp tục bị khóa.",
        href: "/khoa-cua-hang",
      })
    }
  }

  const restriction = (key: "postingBanned" | "chatBanned", on: string, off: string) => {
    const was = Boolean(before.moderation?.[key])
    const is = Boolean(after.moderation?.[key])
    if (was === is) return null
    return notifyUsers(req, me, {
      category: "account",
      kind: is ? `${key}-on` : `${key}-off`,
      title: is ? on : off,
      message: is ? (after.moderation?.reason ? `Lý do: ${after.moderation.reason}` : null) : "Bạn có thể sử dụng lại tính năng này.",
      href: key === "postingBanned" ? "/cong-dong" : "/tin-nhan",
    })
  }
  await restriction("postingBanned", "Tài khoản bị tạm cấm đăng bài", "Đã gỡ lệnh cấm đăng bài")
  await restriction("chatBanned", "Tài khoản bị tạm cấm nhắn tin", "Đã gỡ lệnh cấm nhắn tin")
  return doc
}
