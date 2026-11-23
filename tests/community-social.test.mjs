import test from "node:test"
import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import ts from "typescript"
import sharp from "sharp"

const rules = new URL("../src/lib/community-rules.ts", import.meta.url).href
const compile = async (path, replacements = []) => {
  let source = await readFile(new URL(path, import.meta.url), "utf8")
  for (const [from, to] of replacements) source = source.replaceAll(from, JSON.stringify(to))
  const result = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } })
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString("base64")}`)
}
const { CommunityStories: Stories, CommunityConversations: Conversations, CommunityMessages: Messages } = await compile("../src/collections/CommunitySocial.ts", [['"../lib/community-rules"', rules]])
const { CommunityProfiles: Profiles } = await compile("../src/collections/CommunityProfiles.ts")
const alice = { id: "alice", name: "Alice", collection: "users" }
const bob = { id: "bob", name: "Bob", collection: "users" }
const outsider = { id: "outsider", name: "Outsider", collection: "users" }
const request = (user, payload = {}) => ({ user, payload })

test("stories use a server-owned 24-hour expiry and cannot impersonate another account", async () => {
  const before = Date.now()
  const data = await Stories.hooks.beforeValidate[0]({
    operation: "create", data: { author: bob.id, authorName: "Spoof", content: "A training session", expiresAt: "2099-01-01", theme: "forest" },
    req: request(alice, { find: async () => ({ docs: [{ id: "alice-profile" }] }) }),
  })
  assert.equal(data.author, alice.id)
  assert.equal(data.authorName, "Alice")
  assert.equal(data.authorProfile, "alice-profile")
  assert.ok(new Date(data.expiresAt).getTime() >= before + 86400_000)
  assert.ok(new Date(data.expiresAt).getTime() <= Date.now() + 86400_000)
  const filter = Stories.access.read()
  assert.equal(filter.and[1].visibility.equals, "visible")
  assert.ok(new Date(filter.and[0].expiresAt.greater_than).getTime() >= before)
  assert.equal(Stories.access.create({ req: request(null) }), false)
  assert.deepEqual(Stories.access.delete({ req: request(alice) }), { author: { equals: alice.id } })
})

test("story photos must belong to the authenticated author", async () => {
  const req = request(alice, {
    find: async () => ({ docs: [] }),
    findByID: async (args) => {
      assert.equal(args.overrideAccess, false)
      return { communityOwner: bob.id, mimeType: "image/jpeg" }
    },
  })
  await assert.rejects(() => Stories.hooks.beforeValidate[0]({ operation: "create", data: { image: "photo" }, req }), /thuộc về bạn/)
})

test("conversation and message access is flat, private, and participant-only", () => {
  for (const collection of [Conversations, Messages]) {
    assert.equal(collection.access.read({ req: request(null) }), false)
    assert.equal(collection.access.create({ req: request(null) }), false)
    if (collection === Messages) assert.equal(collection.access.update({ req: request(alice) }), false)
    assert.deepEqual(collection.access.read({ req: request(alice) }), { or: [{ memberA: { equals: alice.id } }, { memberB: { equals: alice.id } }] })
    assert.deepEqual(collection.access.read({ req: request(outsider) }), { or: [{ memberA: { equals: outsider.id } }, { memberB: { equals: outsider.id } }] })
    for (const key of ["memberA", "memberB"]) {
      const field = collection.fields.find((f) => f.name === key)
      assert.equal(field.access.create(), false)
      assert.equal(field.access.update(), false)
    }
  }
})

test("conversation participants and unique pair keys cannot be supplied by the client", async () => {
  const req = request(alice, { findByID: async (args) => {
    assert.equal(args.collection, "community-profiles")
    assert.equal(args.overrideAccess, false)
    return { account: bob.id, name: "Bob" }
  } })
  const data = await Conversations.hooks.beforeValidate[0]({ data: { recipientProfile: "bob-profile", memberA: outsider.id, memberB: outsider.id, key: "forged" }, req })
  assert.equal(data.memberA, alice.id)
  assert.equal(data.memberB, bob.id)
  assert.equal(data.nameA, alice.name)
  assert.equal(data.nameB, bob.name)
  assert.equal(data.key, JSON.stringify(["alice", "bob"]))
  assert.equal(Conversations.fields.find((f) => f.name === "key").unique, true)
})

test("message hooks reject nonparticipants and overwrite spoofed sender/participants", async () => {
  const payload = { findByID: async () => ({ memberA: alice.id, memberB: bob.id }) }
  const data = await Messages.hooks.beforeValidate[0]({ data: { conversation: "room", content: " Hello Bob ", sender: outsider.id, memberB: outsider.id }, req: request(alice, payload) })
  assert.equal(data.sender, alice.id)
  assert.equal(data.memberB, bob.id)
  assert.equal(data.content, "Hello Bob")
  await assert.rejects(() => Messages.hooks.beforeValidate[0]({ data: { conversation: "room", content: "Intrusion" }, req: request(outsider, payload) }), /không thuộc/)
})

test("conversation participants stay immutable while server-side message activity can refresh inbox ordering", async () => {
  await assert.rejects(() => Conversations.hooks.beforeValidate[0]({ operation: "update", data: { memberB: outsider.id }, req: request(alice) }), /thay đổi thành viên/)
  const result = await Conversations.hooks.beforeValidate[0]({ operation: "update", data: {}, req: { ...request(alice), context: { communityMessageActivity: true } } })
  assert.ok(Number.isFinite(new Date(result.lastMessageAt).getTime()))
  const calls = []
  await Messages.hooks.afterChange[0]({ doc: { conversation: "room" }, operation: "create", req: request(alice, { update: async (args) => calls.push(args) }) })
  assert.equal(calls[0].overrideAccess, false)
  assert.equal(calls[0].user, alice)
  assert.deepEqual(calls[0].context, { communityMessageActivity: true })
})

test("public profile creation only publishes the current account's minimal identity", () => {
  const data = Profiles.hooks.beforeValidate[0]({ data: { account: bob.id, name: "Spoof", demo: true, kind: "shop" }, req: request(alice), operation: "create" })
  assert.equal(data.account, alice.id)
  assert.equal(data.name, alice.name)
  assert.equal(data.demo, false)
  assert.equal(data.kind, "person")
  assert.equal(Profiles.fields.find((f) => f.name === "account").access.update({ req: request(alice) }), false)
})

const state = { user: null, calls: [], db: {} }
globalThis.__communitySocialTest = state
const stub = (source) => `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`
const actions = await compile("../src/app/(frontend)/cong-dong/social-actions.ts", [
  ['"@/lib/app-auth"', stub("export const appAuth = { currentUser: async () => globalThis.__communitySocialTest.user }")],
  ['"@/lib/payload"', stub("export const getPayloadClient = async () => globalThis.__communitySocialTest.db")],
  ['"@/lib/community-rules"', rules],
  ['"sharp"', import.meta.resolve("sharp")],
])

test("signed-out story and chat actions cannot create, send, delete, or inspect private messages", async () => {
  state.user = null
  state.db = new Proxy({}, { get() { throw new Error("Database should not be called") } })
  for (const result of [
    await actions.createCommunityStory(new FormData()),
    await actions.deleteCommunityStory("story"),
    await actions.openCommunityConversation("profile"),
    await actions.loadCommunityInbox(),
    await actions.loadCommunityMessages("room"),
    await actions.sendCommunityMessage("room", "Hello"),
    await actions.searchCommunityContacts("Bob"),
  ]) {
    assert.equal(result.ok, false)
    assert.equal(typeof result.error, "string")
  }
})

test("private messages are projected only after an access-enforced conversation lookup", async () => {
  state.user = alice
  const calls = []
  state.db = {
    findByID: async (args) => {
      calls.push(args)
      assert.equal(args.overrideAccess, false)
      assert.equal(args.user, alice)
      return { memberA: alice.id, memberB: bob.id, nameA: alice.name, nameB: bob.name }
    },
    find: async (args) => {
      calls.push(args)
      assert.equal(args.overrideAccess, false)
      return { docs: [{ id: "m1", content: "Hello", sender: bob.id, senderName: bob.name, createdAt: "2026-01-01", secret: "never return" }], hasNextPage: false }
    },
  }
  const result = await actions.loadCommunityMessages("room")
  assert.equal(result.ok, true)
  assert.equal(result.name, "Bob")
  assert.equal(result.messages[0].own, false)
  assert.equal("secret" in result.messages[0], false)
  state.user = outsider
  state.db.findByID = async () => { throw new Error("Forbidden") }
  const before = calls.length
  assert.equal((await actions.loadCommunityMessages("room")).ok, false)
  assert.equal(calls.length, before)
})

test("story action validates empty content, theme, and image bounds before writing", async () => {
  state.user = alice
  state.db = new Proxy({}, { get() { throw new Error("No database writes expected") } })
  assert.equal((await actions.createCommunityStory(new FormData())).ok, false)
  const form = new FormData()
  form.set("content", "My story")
  form.set("theme", "invalid")
  assert.equal((await actions.createCommunityStory(form)).ok, false)
})

test("valid story and message actions use the authenticated Payload mutation path", async () => {
  state.user = alice
  const writes = []
  state.db = {
    count: async () => ({ totalDocs: 0 }),
    find: async () => ({ docs: [{ id: "profile", name: alice.name, account: alice.id }] }),
    create: async (args) => { writes.push(args); return { id: "created" } },
  }
  const form = new FormData()
  form.set("content", "An evening training session")
  form.set("theme", "forest")
  form.set("author", outsider.id)
  assert.equal((await actions.createCommunityStory(form)).ok, true)
  assert.equal((await actions.sendCommunityMessage("room", "Hello Bob")).ok, true)
  assert.ok(writes.every((args) => args.overrideAccess === false && args.user === alice))
  assert.equal(writes[0].data.author, alice.id)
  assert.equal(writes[1].data.sender, alice.id)
  assert.equal(writes[1].data.content, "Hello Bob")
})

test("photo stories encode a real image, store it in Media, and attach its relationship", async () => {
  state.user = alice
  const writes = []
  state.db = {
    count: async () => ({ totalDocs: 0 }),
    find: async () => ({ docs: [{ id: "profile", account: alice.id }] }),
    create: async (args) => { writes.push(args); return { id: args.collection === "media" ? "uploaded-photo" : "story" } },
  }
  const png = await sharp({ create: { width: 24, height: 32, channels: 3, background: "#1677ff" } }).png().toBuffer()
  const form = new FormData()
  form.set("theme", "ocean")
  form.set("image", new File([png], "training.png", { type: "image/png" }))
  assert.equal((await actions.createCommunityStory(form)).ok, true)
  assert.equal(writes[0].collection, "media")
  assert.equal(writes[0].overrideAccess, false)
  assert.deepEqual(writes[0].context, { communityUpload: true })
  const metadata = await sharp(writes[0].file.data).metadata()
  assert.equal(metadata.format, "jpeg")
  assert.equal(metadata.width, 24)
  assert.equal(metadata.height, 32)
  assert.equal(writes[1].data.image, "uploaded-photo")
})

test("community uploads enforce image limits, quotas, and ownership at the collection boundary", async () => {
  const { Media } = await compile("../src/collections/Media.ts", [
    ['"payload"', import.meta.resolve("payload")],
    ['"next/cache"', stub("export const revalidatePath = () => {}")],
  ])
  assert.equal(Media.access.create({ req: request(null) }), false)
  assert.deepEqual(Media.access.update({ req: request(alice) }), { communityOwner: { equals: alice.id } })
  assert.deepEqual(Media.access.delete({ req: request(bob) }), { communityOwner: { equals: bob.id } })
  const hook = Media.hooks.beforeValidate[0]
  const req = { ...request(alice, { count: async () => ({ totalDocs: 0 }) }), file: { mimetype: "image/jpeg", size: 100 } }
  const data = await hook({ data: { communityOwner: bob.id }, req, operation: "create" })
  assert.equal(data.communityOwner, alice.id)
  await assert.rejects(() => hook({ data: {}, req: { ...req, file: { mimetype: "text/html", size: 100 } }, operation: "create" }), /Ảnh story/)
  await assert.rejects(() => hook({ data: {}, req: { ...req, file: { mimetype: "image/jpeg", size: 6 * 1024 * 1024 } }, operation: "update" }), /Ảnh story/)
  await assert.rejects(() => hook({ data: {}, req: { ...req, payload: { count: async () => ({ totalDocs: 20 }) } }, operation: "create" }), /một giờ/)
})
