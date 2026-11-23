import assert from "node:assert/strict"
import test from "node:test"
import { COMMUNITY_TOPICS, communityDisplayText, parseCommunityPost } from "../src/lib/community-rules.ts"

test("removes only illustration wording for display, preserving the story and stored text", () => {
  const stored = "[Minh họa] Chọn giày phù hợp\n\nShop minh họa không nhận thanh toán."
  assert.equal(communityDisplayText(stored), "Chọn giày phù hợp\n\nShop không nhận thanh toán.")
  assert.equal(stored, "[Minh họa] Chọn giày phù hợp\n\nShop minh họa không nhận thanh toán.")
  assert.equal(communityDisplayText("Hồ sơ (MINH HỌA) về cầu lông"), "Hồ sơ về cầu lông")
  assert.equal(communityDisplayText("Một trải nghiệm thật."), "Một trải nghiệm thật.")
})

test("also removes sample-post wording without deleting the post or surrounding content", () => {
  const stored = "[Bài viết mẫu] Kinh nghiệm chọn giày\n\nNội dung bài viết mẫu để tham khảo."
  assert.equal(communityDisplayText(stored), "Kinh nghiệm chọn giày\n\nNội dung để tham khảo.")
  assert.equal(stored, "[Bài viết mẫu] Kinh nghiệm chọn giày\n\nNội dung bài viết mẫu để tham khảo.")
  assert.equal(communityDisplayText("(BÀI VIẾT MẪU) Chọn vợt phù hợp"), "Chọn vợt phù hợp")
  assert.equal(communityDisplayText("[Minh họa] [Bài viết mẫu] Chia sẻ trải nghiệm"), "Chia sẻ trải nghiệm")
})

test("accepts offers, wanted posts, and all existing discussion topics", () => {
  for (const topic of COMMUNITY_TOPICS) {
    assert.equal(parseCommunityPost({ content: "Một bài viết hợp lệ", sport: "football", topic }).topic, topic)
  }
})

test("rejects unknown topics and invalid product relationships", () => {
  assert.throws(() => parseCommunityPost({ content: "Nội dung", sport: "football", topic: "admin" }), /Chủ đề/)
  assert.throws(() => parseCommunityPost({ content: "Nội dung", sport: "football", topic: "offer", product: { id: "untrusted" } }), /hợp lệ/)
})

test("only returns allowlisted content fields", () => {
  const result = parseCommunityPost({
    content: "  Tìm mua một đôi giày TF  ", sport: "football", topic: "wanted", product: "product-id",
    author: "another-user", visibility: "hidden", authorName: "Impersonated",
  })
  assert.deepEqual(result, { content: "Tìm mua một đôi giày TF", sport: "football", topic: "wanted", product: "product-id" })
})

test("keeps optional product empty and enforces content length", () => {
  assert.equal(parseCommunityPost({ content: "Hỏi cộng đồng", sport: "all", topic: "question", product: "" }).product, null)
  assert.throws(() => parseCommunityPost({ content: "x", sport: "all", topic: "wanted" }), /ký tự/)
})
