import assert from "node:assert/strict"
import test from "node:test"
import { cleanCommunityText, communityPage, parseCommunityPost } from "./community-rules"

test("community pagination rejects non-finite and malformed input", () => {
  for (const value of [undefined, null, NaN, Infinity, -Infinity, "2", {}]) {
    assert.equal(communityPage(value), 1)
  }
  assert.equal(communityPage(-3), 1)
  assert.equal(communityPage(0), 1)
  assert.equal(communityPage(2.8), 2)
  assert.equal(communityPage(2000), 1000)
})

test("community posts keep only validated fields", () => {
  const post = parseCommunityPost({
    content: "  Chia sẻ trải nghiệm trên sân  ",
    sport: "badminton",
    topic: "experience",
    product: "",
  })
  assert.deepEqual(post, {
    content: "Chia sẻ trải nghiệm trên sân",
    sport: "badminton",
    topic: "experience",
    product: null,
  })
})

test("invalid community text and filters cannot be submitted", () => {
  assert.throws(() => cleanCommunityText("   ", 1000))
  assert.throws(() => cleanCommunityText("a".repeat(1001), 1000))
  assert.throws(() => cleanCommunityText({}, 100))
  assert.throws(() => parseCommunityPost({ content: "Bài viết hợp lệ", sport: "invalid", topic: "review" }))
  assert.throws(() => parseCommunityPost({ content: "Bài viết hợp lệ", sport: "all", topic: "invalid" }))
  assert.throws(() => parseCommunityPost({ content: "abc", sport: "all", topic: "review" }))
})
