export const COMMUNITY_TOPICS = [
  "experience",
  "question",
  "review",
  "tips",
  "offer",
  "wanted",
] as const
export const COMMUNITY_SPORTS = ["all", "football", "badminton"] as const
export const COMMENT_REACTIONS = ["heart", "like", "support"] as const
export type CommentReaction = typeof COMMENT_REACTIONS[number]

// Presentation only: keep the stored posts and profile text unchanged.
export function communityDisplayText(text: string) {
  return text
    .replace(/\[\s*(?:minh họa|bài viết mẫu)\s*\]|\(\s*(?:minh họa|bài viết mẫu)\s*\)/giu, "")
    .replace(/minh họa|bài viết mẫu/giu, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[ \t]+|[ \t]+$/gm, "")
    .trim()
}

export function parseCommentReaction(value: unknown): CommentReaction {
  if (!COMMENT_REACTIONS.includes(value as CommentReaction))
    throw new Error("Cảm xúc không hợp lệ.")
  return value as CommentReaction
}

export function communityPage(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(1, Math.min(1000, Math.floor(value)))
    : 1
}

export function cleanCommunityText(value: unknown, max: number, min = 1) {
  if (typeof value !== "string") throw new Error("Nội dung không hợp lệ.")
  const text = value.trim()
  if (text.length < min || text.length > max) {
    throw new Error(`Nội dung cần có từ ${min} đến ${max} ký tự.`)
  }
  return text
}

export function parseCommunityPost(data: {
  content?: unknown
  sport?: unknown
  topic?: unknown
  product?: unknown
}) {
  const content = cleanCommunityText(data.content, 3000, 5)
  if (!COMMUNITY_SPORTS.includes(data.sport as typeof COMMUNITY_SPORTS[number]))
    throw new Error("Môn thể thao không hợp lệ.")
  if (!COMMUNITY_TOPICS.includes(data.topic as typeof COMMUNITY_TOPICS[number]))
    throw new Error("Chủ đề không hợp lệ.")
  const product = data.product ? cleanCommunityText(data.product, 100) : null
  return {
    content,
    sport: data.sport as typeof COMMUNITY_SPORTS[number],
    topic: data.topic as typeof COMMUNITY_TOPICS[number],
    product,
  }
}

export function communityLikeKey(post: string, author: string) {
  return `${post}:${author}`
}
