import assert from "node:assert/strict"
import test from "node:test"
import { readFile } from "node:fs/promises"
import ts from "typescript"

const profile = { id: "profile", name: "Nhịp Sân Sports", bio: "Shop minh họa về bóng đá.", kind: "shop", sport: "football", demo: true }
const post = { id: "post", content: "[Minh họa] Một câu chuyện trên sân.", authorName: profile.name, authorProfile: profile, sport: "football", topic: "experience", visibility: "visible", createdAt: "2026-01-01", updatedAt: "2026-01-01", product: null, sharedPost: { id: "original", authorName: "Member", content: "[Minh họa] Bài viết gốc.", visibility: "visible" } }
const original = structuredClone({ profile, post })
const queries = []
globalThis.__communityPresentationDB = {
  find: async (args) => {
    queries.push(args)
    return { docs: args.collection === "community-profiles" ? [profile] : [post], totalDocs: 1, hasNextPage: false }
  },
  count: async () => ({ totalDocs: 2 }),
}
const payloadStub = `data:text/javascript;base64,${Buffer.from("export const getPayloadClient = async () => globalThis.__communityPresentationDB").toString("base64")}`
const rulesURL = new URL("../src/lib/community-rules.ts", import.meta.url).href
const source = (await readFile(new URL("../src/lib/community.ts", import.meta.url), "utf8"))
  .replace('import "server-only"', "")
  .replace('"./payload"', JSON.stringify(payloadStub))
  .replace('"./community-rules"', JSON.stringify(rulesURL))
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { readCommunityFeed, readCommunityMembers } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`)

test("keeps existing illustration posts and profiles, removes only wording from presentation", async () => {
  const feed = await readCommunityFeed()
  const members = await readCommunityMembers()
  assert.equal(feed.posts[0].id, post.id)
  assert.equal(feed.posts[0].profile.demo, true)
  assert.equal(feed.posts[0].content, "Một câu chuyện trên sân.")
  assert.equal(feed.posts[0].sharedPost.content, "Bài viết gốc.")
  assert.equal(members[0].id, profile.id)
  assert.equal(members[0].bio, "Shop về bóng đá.")
  assert.deepEqual(queries.find((q) => q.collection === "community-posts").where, { and: [{ visibility: { equals: "visible" } }] })
  assert.equal(queries.find((q) => q.collection === "community-profiles").where, undefined)
  assert.deepEqual({ profile, post }, original)
})
