import type { CollectionConfig } from "payload"
import { createFolderField, createTagField } from "payload"
import { revalidatePath } from "next/cache"
import { isStaff } from "../access/roles"
import { normalizeAudioMime } from "../lib/audio-files"
import {
  MAX_STORY_VIDEO,
  STORY_VIDEO_TYPES,
  validStoryVideo,
} from "../lib/community-media"

export const Media: CollectionConfig = {
  slug: "media",
  access: {
    create: ({ req }) =>
      req.user?.collection === "admins" || req.user?.collection === "users",
    read: () => true,
    update: ({ req }) =>
      isStaff(req.user)
        ? true
        : req.user?.collection === "users"
          ? { communityOwner: { equals: req.user.id } }
          : false,
    delete: ({ req }) =>
      isStaff(req.user)
        ? true
        : req.user?.collection === "users"
          ? { communityOwner: { equals: req.user.id } }
          : false,
  },
  hooks: {
    beforeValidate: [
      async ({ data, req, operation }) => {
        if (req.file) {
          req.file.mimetype = normalizeAudioMime(
            req.file.name,
            req.file.mimetype,
            req.file.data,
          )
          if (data?.mimeType === "application/octet-stream")
            data.mimeType = req.file.mimetype
        }
        if (req.user?.collection === "users") {
          const file = req.file
          const video = file && STORY_VIDEO_TYPES.includes(file.mimetype)
          if (
            video &&
            (file.size > MAX_STORY_VIDEO ||
              !validStoryVideo(file.data, file.mimetype))
          ) {
            throw new Error("Video phải là MP4/WebM hợp lệ, tối đa 30 MB.")
          }
          if (
            !isStaff(req.user) &&
            req.user.sellerStatus !== "approved" &&
            (operation === "create" || file) &&
            (!file ||
              (!video &&
                (!["image/jpeg", "image/png", "image/webp"].includes(
                  file.mimetype,
                ) ||
                  file.size > 5 * 1024 * 1024)))
          ) {
            throw new Error(
              "Chọn ảnh JPG/PNG/WebP tối đa 5 MB hoặc video MP4/WebM tối đa 30 MB.",
            )
          }
          if (operation === "create" && req.user.sellerStatus !== "approved") {
            const recent = await req.payload.count({
              collection: "media",
              where: {
                and: [
                  { communityOwner: { equals: req.user.id } },
                  {
                    createdAt: {
                      greater_than: new Date(
                        Date.now() - 3600_000,
                      ).toISOString(),
                    },
                  },
                ],
              },
              overrideAccess: false,
              user: req.user,
              req,
            })
            if (recent.totalDocs >= 20)
              throw new Error(
                "Bạn đã tải lên quá nhiều ảnh/video trong một giờ. Vui lòng thử lại sau.",
              )
          }
          if (data && operation === "create") data.communityOwner = req.user.id
        }
        return data
      },
    ],
    afterChange: [
      ({ req }) => {
        if (req.context.communityUpload) return
        revalidatePath("/")
        revalidatePath("/giam-gia")
        revalidatePath("/san-pham/[slug]", "page")
      },
    ],
    afterDelete: [
      () => {
        revalidatePath("/")
        revalidatePath("/giam-gia")
        revalidatePath("/san-pham/[slug]", "page")
      },
    ],
  },
  fields: [
    {
      name: "communityOwner",
      type: "relationship",
      relationTo: "users",
      access: {
        create: () => false,
        update: () => false,
        read: ({ req }) => !!req.user,
      },
    },
    {
      name: "alt",
      type: "text",
      required: true,
    },
    createFolderField({ relationTo: "folders" }),
    createTagField({ relationTo: "tags" }),
  ],
  upload: true,
}
