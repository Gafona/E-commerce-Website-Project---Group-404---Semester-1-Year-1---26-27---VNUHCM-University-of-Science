import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import { validateQueryPaths } from "payload"
import {
  cleanCommunityText,
  parseCommunityPost,
  communityLikeKey,
  parseCommentReaction,
} from "../src/lib/community-rules.ts"

// Load the collection hooks without bootstrapping Payload or connecting to live data.
const source = await readFile(
  new URL("../src/collections/Community.ts", import.meta.url),
  "utf8",
)
const rulesURL = new URL("../src/lib/community-rules.ts", import.meta.url).href
const compiled = ts.transpileModule(
  source.replace('"../lib/community-rules"', JSON.stringify(rulesURL)),
  {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
  },
).outputText
const {
  CommunityPosts,
  CommunityComments,
  CommunityLikes,
  CommunityCommentReactions,
} = await import(
  `data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`
)
const alice = { collection: "users", id: "user-alice", name: "Alice" }
const admin = { collection: "admins", id: "editor" }
const request = (user) => ({
  user,
  payload: { find: async () => ({ docs: [] }) },
})

test("post fields are trimmed, allowlisted, and bounded", () => {
  assert.deepEqual(
    parseCommunityPost({
      content: "  Một đôi giày tốt  ",
      sport: "football",
      topic: "review",
      product: "",
      author: "spoof",
    }),
    {
      content: "Một đôi giày tốt",
      sport: "football",
      topic: "review",
      product: null,
    },
  )
  assert.throws(() =>
    parseCommunityPost({ content: "hello", sport: "other", topic: "review" }),
  )
  assert.throws(() => cleanCommunityText(" ".repeat(10), 1000))
  assert.throws(() => cleanCommunityText("x".repeat(1001), 1000))
  assert.throws(() => cleanCommunityText({ content: "spoof" }, 1000))
})

test("anonymous callers cannot create or mutate community records", () => {
  for (const collection of [
    CommunityPosts,
    CommunityComments,
    CommunityLikes,
    CommunityCommentReactions,
  ]) {
    assert.equal(collection.access.create({ req: request(null) }), false)
    assert.equal(collection.access.update({ req: request(null) }), false)
    assert.equal(collection.access.delete({ req: request(null) }), false)
  }
})

test("updates and deletes are scoped to the actual owner, not a submitted author", () => {
  assert.deepEqual(CommunityPosts.access.update({ req: request(alice) }), {
    author: { equals: alice.id },
  })
  assert.deepEqual(CommunityComments.access.delete({ req: request(alice) }), {
    author: { equals: alice.id },
  })
  assert.deepEqual(CommunityLikes.access.delete({ req: request(alice) }), {
    author: { equals: alice.id },
  })
  assert.equal(CommunityPosts.access.update({ req: request(admin) }), true)
})

test("author identity is server-owned and cannot be forged on create or update", async () => {
  const identityHook = CommunityPosts.hooks.beforeValidate[0]
  const created = await identityHook({
    data: { author: "other", authorName: "Spoof" },
    req: request(alice),
    operation: "create",
  })
  assert.equal(created.author, alice.id)
  assert.equal(created.authorName, alice.name)
  const updated = await identityHook({
    data: { author: "other", authorName: "Spoof" },
    req: request(alice),
    operation: "update",
    originalDoc: { author: alice.id, authorName: "Alice" },
  })
  assert.equal(updated.author, alice.id)
  assert.equal(updated.authorName, "Alice")
})

test("post creation forces visible state and validates linked product at collection boundary", async () => {
  let lookedUp
  const req = {
    ...request(alice),
    payload: {
      findByID: async (args) => {
        lookedUp = args
        return { id: args.id }
      },
    },
  }
  const data = await CommunityPosts.hooks.beforeValidate[1]({
    data: {
      content: "Kinh nghiệm chọn vợt",
      sport: "badminton",
      topic: "tips",
      product: "racket",
      visibility: "hidden",
    },
    req,
    operation: "create",
  })
  assert.equal(data.visibility, "visible")
  assert.equal(lookedUp.overrideAccess, false)
  assert.equal(lookedUp.id, "racket")
  await assert.rejects(() =>
    CommunityPosts.hooks.beforeValidate[1]({
      data: { content: "Nội dung sửa", sport: "all", topic: "tips" },
      originalDoc: { visibility: "hidden" },
      req,
      operation: "update",
    }),
  )
})

test("public read excludes hidden posts and interactions with removed posts", () => {
  assert.deepEqual(CommunityPosts.access.read({ req: request(null) }), {
    visibility: { equals: "visible" },
  })
  for (const collection of [CommunityComments, CommunityLikes]) {
    assert.deepEqual(collection.access.read({ req: request(null) }), {
      "post.visibility": { equals: "visible" },
    })
  }
})

test("comments and likes cannot target hidden or missing posts", async () => {
  const hook = CommunityComments.hooks.beforeValidate[1]
  await assert.rejects(() =>
    hook({ data: { post: "" }, operation: "create", req: request(alice) }),
  )
  await assert.rejects(() =>
    hook({
      data: { post: "p1" },
      operation: "create",
      req: {
        ...request(alice),
        payload: { findByID: async () => ({ visibility: "hidden" }) },
      },
    }),
  )
  const data = await hook({
    data: { post: "p1" },
    operation: "create",
    req: {
      ...request(alice),
      payload: { findByID: async () => ({ visibility: "visible" }) },
    },
  })
  assert.equal(data.post, "p1")
})

test("like uniqueness is durable and one key per post/member", async () => {
  const keyField = CommunityLikes.fields.find((field) => field.name === "key")
  assert.equal(keyField.unique, true)
  assert.equal(communityLikeKey("p1", "u1"), communityLikeKey("p1", "u1"))
  assert.notEqual(communityLikeKey("p1", "u1"), communityLikeKey("p1", "u2"))
  const keyed = await CommunityLikes.hooks.beforeValidate[2]({
    data: { post: "p1", author: "u1", key: "spoof" },
  })
  assert.equal(keyed.key, "p1:u1")
})

test("raw account relationships and internal keys are not exposed publicly", () => {
  for (const collection of [
    CommunityPosts,
    CommunityComments,
    CommunityLikes,
  ]) {
    const author = collection.fields.find((field) => field.name === "author")
    assert.equal(author.access.read({ req: request(null) }), false)
    assert.equal(author.access.update({ req: request(alice) }), false)
  }
})

test("signed-in ownership queries are allowed while other authors stay private", () => {
  for (const collection of [
    CommunityPosts,
    CommunityComments,
    CommunityLikes,
  ]) {
    const author = collection.fields.find((field) => field.name === "author")
    assert.equal(author.access.read({ req: request(alice) }), true)
    assert.equal(
      author.access.read({ req: request(alice), doc: { author: alice.id } }),
      true,
    )
    assert.equal(
      author.access.read({
        req: request(alice),
        doc: { author: { id: alice.id } },
      }),
      true,
    )
    assert.equal(
      author.access.read({
        req: request(alice),
        doc: { author: "other-user" },
      }),
      false,
    )
    assert.equal(
      author.access.read({
        req: request(alice),
        doc: { author: { id: "other-user" } },
      }),
      false,
    )
    assert.equal(author.access.read({ req: request(null) }), false)
    assert.equal(
      author.access.read({
        req: request(admin),
        doc: { author: "other-user" },
      }),
      true,
    )
  }
})

test("Payload query validation reproduces the former author error and accepts the fix", async () => {
  for (const collection of [
    CommunityPosts,
    CommunityComments,
    CommunityLikes,
  ]) {
    const config = { ...collection, flattenedFields: collection.fields }
    const req = {
      user: alice,
      locale: "en",
      payload: {
        config: { localization: false },
        collections: { [collection.slug]: { config } },
      },
    }
    const args = {
      collectionConfig: config,
      req,
      overrideAccess: false,
      where: { author: { equals: alice.id } },
    }
    await validateQueryPaths(args)
    const formerFields = config.fields.map((field) =>
      field.name === "author"
        ? {
            ...field,
            access: {
              ...field.access,
              read: ({ req }) => req.user?.collection === "admins",
            },
          }
        : field,
    )
    const formerConfig = {
      ...config,
      fields: formerFields,
      flattenedFields: formerFields,
    }
    await assert.rejects(
      () =>
        validateQueryPaths({
          ...args,
          collectionConfig: formerConfig,
          req: {
            ...req,
            payload: {
              ...req.payload,
              collections: { [collection.slug]: { config: formerConfig } },
            },
          },
        }),
      /cannot be queried: author/,
    )
  }
})

// Exercise Server Action envelopes with an in-memory test double only.
// No QA users, posts or reactions are inserted into the real project database.
const calls = []
let currentUser = null
let foundLikes = []
const actionDB = {
  findByID: async (args) => {
    calls.push(["findByID", args])
    return { id: args.id, sport: "football", visibility: "visible" }
  },
  count: async (args) => {
    calls.push(["count", args])
    return { totalDocs: 0 }
  },
  find: async (args) => {
    calls.push(["find", args])
    return { docs: foundLikes }
  },
  create: async (args) => {
    calls.push(["create", args])
    return { id: "created-record" }
  },
  update: async (args) => {
    calls.push(["update", args])
    return { id: args.id }
  },
  delete: async (args) => {
    calls.push(["delete", args])
    return { id: args.id }
  },
}
globalThis.__boaiCommunityActionTest = { db: actionDB, user: () => currentUser }
const authStub = `data:text/javascript;base64,${Buffer.from("export const appAuth = { currentUser: async () => globalThis.__boaiCommunityActionTest.user() }").toString("base64")}`
const payloadStub = `data:text/javascript;base64,${Buffer.from("export const getPayloadClient = async () => globalThis.__boaiCommunityActionTest.db").toString("base64")}`
const feedStub = `data:text/javascript;base64,${Buffer.from("export const readCommunityFeed = async () => ({posts: [], page: 1, hasNextPage: false})").toString("base64")}`
let actionSource = await readFile(
  new URL("../src/app/(frontend)/cong-dong/actions.ts", import.meta.url),
  "utf8",
)
actionSource = actionSource
  .replace('"@/lib/app-auth"', JSON.stringify(authStub))
  .replace('"@/lib/payload"', JSON.stringify(payloadStub))
  .replace('"@/lib/community"', JSON.stringify(feedStub))
  .replace('"@/lib/community-rules"', JSON.stringify(rulesURL))
const actionJS = ts.transpileModule(actionSource, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText
const actions = await import(
  `data:text/javascript;base64,${Buffer.from(actionJS).toString("base64")}`
)

test("signed-out mutations return displayable errors without any data writes", async () => {
  currentUser = null
  calls.length = 0
  for (const result of [
    await actions.writeCommunityPost(new FormData()),
    await actions.toggleCommunityLike("p1"),
    await actions.writeCommunityComment("p1", "A comment"),
    await actions.removeCommunityPost("p1"),
    await actions.deleteCommunityComment("c1"),
    await actions.toggleCommentReaction("c1", "heart"),
    await actions.repostCommunityPost("p1", ""),
  ]) {
    assert.equal(result.ok, false)
    assert.equal(typeof result.error, "string")
  }
  assert.equal(calls.length, 0)
})

test("replies preserve existing top-level comments and reject cross-post parents", async () => {
  const hook = CommunityComments.hooks.beforeValidate[3]
  const req = {
    ...request(alice),
    payload: { findByID: async () => ({ post: "p1" }) },
  }
  assert.equal(
    (await hook({ data: { post: "p1" }, req, operation: "create" })).parent,
    null,
  )
  assert.equal(
    (
      await hook({
        data: { post: "p1", parent: "c1" },
        req,
        operation: "create",
      })
    ).parent,
    "c1",
  )
  await assert.rejects(
    () =>
      hook({ data: { post: "p2", parent: "c1" }, req, operation: "create" }),
    /cùng bài viết/,
  )
  // Reply targets are immutable, so updates cannot create self/cyclic relationships.
  const updated = await hook({
    data: { post: "p1", parent: "self" },
    originalDoc: { parent: "c1" },
    req,
    operation: "update",
  })
  assert.equal(updated.parent, "c1")
})

test("comment emotions are allowlisted, durable, and owner-scoped", async () => {
  assert.throws(() => parseCommentReaction("unknown"), /hợp lệ/)
  assert.equal(parseCommentReaction("like"), "like")
  const hook = CommunityCommentReactions.hooks.beforeValidate[1]
  const req = {
    ...request(alice),
    payload: {
      findByID: async ({ collection }) =>
        collection === "community-comments"
          ? { post: "p1" }
          : { visibility: "visible" },
    },
  }
  const result = await hook({
    data: { comment: "c1", author: alice.id, reaction: "heart", key: "spoof" },
    req,
  })
  assert.equal(result.key, "c1:user-alice:heart")
  assert.equal(
    CommunityCommentReactions.fields.find((f) => f.name === "key").unique,
    true,
  )
  assert.deepEqual(CommunityCommentReactions.access.delete({ req }), {
    author: { equals: alice.id },
  })
  assert.equal(await CommunityCommentReactions.access.read({ req: request(null) }), false)
  await assert.rejects(
    () =>
      hook({
        data: { comment: "c1", author: alice.id, reaction: "heart" },
        req: {
          ...req,
          payload: {
            findByID: async ({ collection }) =>
              collection === "community-comments"
                ? { post: "p1" }
                : { visibility: "hidden" },
          },
        },
      }),
    /công khai/,
  )
})

test("repost relationship rejects removed and nested sources but keeps illustration posts shareable", async () => {
  const hook = CommunityPosts.hooks.beforeValidate[1]
  const data = {
    content: "Chia sẻ cùng mọi người",
    sport: "all",
    topic: "experience",
    sharedPost: "p1",
  }
  for (const source of [
    { visibility: "hidden" },
    { visibility: "visible", sharedPost: "p0" },
  ]) {
    await assert.rejects(
      () =>
        hook({
          data: { ...data },
          operation: "create",
          req: { ...request(alice), payload: { findByID: async () => source } },
        }),
      /hợp lệ/,
    )
  }
  const result = await hook({
    data: { ...data },
    operation: "create",
    req: {
      ...request(alice),
      payload: { findByID: async () => ({ visibility: "visible", authorProfile: { demo: true } }) },
    },
  })
  assert.equal(result.sharedPost, "p1")
})

test("reply action allowlists its parent and uses authenticated access", async () => {
  currentUser = alice
  calls.length = 0
  assert.equal(
    (await actions.writeCommunityComment("p1", "A reply", "c1")).ok,
    true,
  )
  const created = calls.find(([method]) => method === "create")[1]
  assert.equal(created.data.parent, "c1")
  assert.equal(created.user, alice)
  assert.equal(created.overrideAccess, false)
})

test("reaction action validates before writing, toggles only its viewer key", async () => {
  currentUser = alice
  foundLikes = []
  calls.length = 0
  assert.equal((await actions.toggleCommentReaction("c1", "spoof")).ok, false)
  assert.equal(calls.length, 0)
  assert.equal((await actions.toggleCommentReaction("c1", "support")).ok, true)
  const created = calls.find(([method]) => method === "create")[1]
  assert.equal(created.data.key, "c1:user-alice:support")
  assert.equal(created.overrideAccess, false)
  foundLikes = [{ id: "my-reaction" }]
  calls.length = 0
  assert.equal((await actions.toggleCommentReaction("c1", "support")).ok, true)
  const removed = calls.find(([method]) => method === "delete")[1]
  assert.equal(removed.id, "my-reaction")
  assert.equal(removed.user, alice)
  assert.equal(removed.overrideAccess, false)
  foundLikes = []
})

test("reposting creates a real public community post with the source relationship", async () => {
  currentUser = alice
  calls.length = 0
  assert.equal(
    (await actions.repostCommunityPost("p1", "My opinion on this post")).ok,
    true,
  )
  const created = calls.find(([method]) => method === "create")[1]
  assert.equal(created.collection, "community-posts")
  assert.equal(created.data.sharedPost, "p1")
  assert.equal(created.data.content, "My opinion on this post")
  assert.equal(created.data.author, alice.id)
  assert.equal(created.data.visibility, "visible")
  assert.equal(created.overrideAccess, false)
})

test("comment loading projects reply quotes and public emotion counts", async () => {
  currentUser = null
  foundLikes = [
    {
      id: "c2",
      content: "[Minh họa] Reply",
      authorName: "Member",
      createdAt: "2026-01-01",
      parent: { id: "c1", authorName: "Original", content: "[Minh họa] Original comment" },
    },
  ]
  const result = await actions.loadCommunityComments("p1")
  assert.equal(result.ok, true)
  assert.equal(result.comments[0].content, "Reply")
  assert.equal(foundLikes[0].content, "[Minh họa] Reply")
  const query = calls.filter(([method, args]) => method === "find" && args.collection === "community-comments").at(-1)[1]
  assert.deepEqual(query.where, { post: { equals: "p1" } })
  assert.deepEqual(result.comments[0].parent, {
    id: "c1",
    authorName: "Original",
    content: "Original comment",
  })
  assert.deepEqual(
    result.comments[0].reactions.map((r) => r.type),
    ["heart", "like", "support"],
  )
  assert.ok(
    result.comments[0].reactions.every((r) => r.count === 0 && !r.active),
  )
  foundLikes = []
})

test("product search is server-filtered and limited, not a truncated static dropdown", async () => {
  calls.length = 0
  foundLikes = [{ id: "gear", name: "Tiempo", sport: "football" }]
  const result = await actions.searchCommunityProducts("Tiempo", "football")
  assert.equal(result.ok, true)
  assert.equal(result.products[0].name, "Tiempo")
  const query = calls.find(([method]) => method === "find")[1]
  assert.equal(query.limit, 8)
  assert.equal(query.overrideAccess, false)
  assert.deepEqual(query.where, {
    and: [{ name: { contains: "Tiempo" } }, { sport: { equals: "football" } }],
  })
  foundLikes = []
})

test("signed-in post action allowlists fields and respects Payload access", async () => {
  currentUser = alice
  calls.length = 0
  const form = new FormData()
  form.set("content", "Một trải nghiệm thể thao thật.")
  form.set("sport", "football")
  form.set("topic", "experience")
  form.set("author", "spoof")
  form.set("authorName", "Spoof")
  form.set("visibility", "hidden")
  const result = await actions.writeCommunityPost(form)
  assert.equal(result.ok, true)
  const [, args] = calls.find(([method]) => method === "create")
  assert.equal(args.overrideAccess, false)
  assert.equal(args.user, alice)
  assert.equal(args.data.author, alice.id)
  assert.equal(args.data.authorName, alice.name)
  assert.equal(args.data.visibility, "visible")
})

test("like action creates then removes only the viewer's reaction", async () => {
  currentUser = alice
  calls.length = 0
  foundLikes = []
  assert.equal((await actions.toggleCommunityLike("p1")).ok, true)
  const created = calls.find(([method]) => method === "create")[1]
  assert.equal(created.data.key, "p1:user-alice")
  assert.equal(created.overrideAccess, false)
  foundLikes = [{ id: "alice-like", post: "p1" }]
  calls.length = 0
  assert.equal((await actions.toggleCommunityLike("p1")).ok, true)
  const deleted = calls.find(([method]) => method === "delete")[1]
  assert.equal(deleted.id, "alice-like")
  assert.equal(deleted.user, alice)
  assert.equal(deleted.overrideAccess, false)
  foundLikes = []
})

test("signed-in community session queries the viewer's records with access enforced", async () => {
  currentUser = alice
  calls.length = 0
  foundLikes = [
    { id: "alice-like", post: "p1" },
    { id: "orphan-like", post: null },
  ]
  const session = await actions.communitySession()
  assert.equal(session.viewer.name, "Alice")
  assert.deepEqual(session.liked, ["p1"])
  const queries = calls.filter(([method]) => method === "find")
  assert.equal(queries.length, 2)
  for (const [, args] of queries) {
    assert.equal(args.user, alice)
    assert.equal(args.overrideAccess, false)
    assert.deepEqual(args.where, { author: { equals: alice.id } })
    const collection =
      args.collection === "community-likes" ? CommunityLikes : CommunityPosts
    assert.equal(
      collection.fields
        .find((field) => field.name === "author")
        .access.read({ req: request(args.user) }),
      true,
    )
  }
  foundLikes = []
})

test("blank comments and invalid posts cannot reach the write operation", async () => {
  currentUser = alice
  calls.length = 0
  assert.equal((await actions.writeCommunityComment("p1", "   ")).ok, false)
  assert.equal((await actions.writeCommunityPost(new FormData())).ok, false)
  assert.equal(
    calls.some(([method]) => method === "create" || method === "update"),
    false,
  )
})

test("post removal is soft and always enforces authenticated ownership", async () => {
  currentUser = alice
  calls.length = 0
  assert.equal((await actions.removeCommunityPost("p1")).ok, true)
  const [, args] = calls.find(([method]) => method === "update")
  assert.deepEqual(args.data, { visibility: "removed" })
  assert.equal(args.overrideAccess, false)
  assert.equal(args.user, alice)
})

test("reaction access avoids the unsupported two-relationship path and includes all pages of visible comments", async () => {
  const seen = []
  const req = { user: null, payload: { find: async (args) => {
    seen.push(args)
    return { docs: [{ id: `c${args.page}` }], hasNextPage: args.page === 1 }
  } } }
  assert.deepEqual(await CommunityCommentReactions.access.read({ req }), { comment: { in: ["c1", "c2"] } })
  assert.ok(seen.every((args) => args.collection === "community-comments" && args.overrideAccess === false && args.depth === 0))
})

test("an emotion service failure does not erase four existing comments", async () => {
  currentUser = null
  const find = actionDB.find
  actionDB.find = async (args) => {
    if (args.collection === "community-comment-reactions") throw new Error("Emotion service unavailable")
    return { docs: [1, 2, 3, 4].map((id) => ({ id: `c${id}`, content: `Comment ${id}`, authorName: "Member", createdAt: "2026-01-01" })), hasNextPage: false }
  }
  try {
    const result = await actions.loadCommunityComments("p1")
    assert.equal(result.ok, true)
    assert.equal(result.comments.length, 4)
    assert.match(result.warning, /cảm xúc/)
  } finally { actionDB.find = find }
})
