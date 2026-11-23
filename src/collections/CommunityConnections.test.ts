import assert from "node:assert/strict"
import test from "node:test"
import { CommunityFollows, CommunityFriendships } from "./CommunityConnections"
import { validStoryVideo } from "../lib/community-media"
import { CommunityStories } from "./CommunitySocial"

const validate = CommunityFriendships.hooks!.beforeValidate![0]
const makeReq = (id: string) => ({
  user: { id, collection: "users" },
  payload: {
    findByID: async ({ collection }: { collection: string }) =>
      collection === "users"
        ? { id: "b", moderation: {} }
        : { id: "profile-b", account: "b" },
    find: async () => ({ docs: [{ id: "profile-a" }] }),
    count: async () => ({ totalDocs: 0 }),
  },
})

test("only the recipient can accept an outstanding friend request", async () => {
  const originalDoc = {
    author: "a",
    recipient: "b",
    sourceProfile: "profile-a",
    targetProfile: "profile-b",
    key: '["a","b"]',
    status: "pending",
  }
  await assert.rejects(
    () =>
      validate({
        data: { status: "accepted" },
        originalDoc,
        operation: "update",
        req: makeReq("a"),
      } as never),
    /người nhận/,
  )
  const data = await validate({
    data: { status: "accepted", author: "forged", targetProfile: "forged" },
    originalDoc,
    operation: "update",
    req: makeReq("b"),
  } as never)
  assert.equal(data?.status, "accepted")
  assert.equal(data?.author, "a")
  assert.equal(data?.targetProfile, "profile-b")
  await assert.rejects(
    () =>
      validate({
        data: { status: "accepted" },
        originalDoc: { ...originalDoc, status: "accepted" },
        operation: "update",
        req: makeReq("b"),
      } as never),
    /đang chờ/,
  )
})

test("new connections derive identity and pending status on the server", async () => {
  const data = await validate({
    data: {
      targetProfile: "profile-b",
      author: "forged",
      status: "accepted",
      key: "forged",
    },
    operation: "create",
    req: makeReq("a"),
  } as never)
  assert.equal(data?.author, "a")
  assert.equal(data?.recipient, "b")
  assert.equal(data?.sourceProfile, "profile-a")
  assert.equal(data?.status, "pending")
  assert.equal(data?.key, '["a","b"]')
})

test("self-connections and suspended accounts are rejected", async () => {
  await assert.rejects(
    () =>
      validate({
        data: { targetProfile: "profile-b" },
        operation: "create",
        req: makeReq("b"),
      } as never),
    /thành viên khác/,
  )
  const req = makeReq("a")
  Object.assign(req.user, { moderation: { suspended: true } })
  await assert.rejects(
    () =>
      validate({
        data: { targetProfile: "profile-b" },
        operation: "create",
        req,
      } as never),
    /đăng nhập/,
  )
})

test("friendships are participant-private; follows can be removed by either side", async () => {
  assert.equal(
    await CommunityFriendships.access!.read!({ req: {} } as never),
    false,
  )
  assert.deepEqual(
    await CommunityFriendships.access!.read!({
      req: { user: { collection: "users", id: "a" } },
    } as never),
    {
      or: [{ author: { equals: "a" } }, { recipient: { equals: "a" } }],
    },
  )
  assert.deepEqual(
    await CommunityFollows.access!.delete!({
      req: { user: { collection: "users", id: "a" } },
    } as never),
    { or: [{ author: { equals: "a" } }, { recipient: { equals: "a" } }] },
  )
})

const validateFollow = CommunityFollows.hooks!.beforeValidate![0]
const privateReq = (id: string, visibility: string) => {
  const req = makeReq(id)
  const findByID = req.payload.findByID
  req.payload.findByID = async (args: { collection: string }) =>
    args.collection === "users"
      ? findByID(args)
      : { id: "profile-b", account: "b", visibility }
  return req
}

test("following a private profile creates a pending request; public follows are immediate", async () => {
  const pending = await validateFollow({
    data: { targetProfile: "profile-b", status: "accepted" },
    operation: "create",
    req: privateReq("a", "private"),
  } as never)
  assert.equal(pending?.status, "pending")
  const open = await validateFollow({
    data: { targetProfile: "profile-b" },
    operation: "create",
    req: privateReq("a", "public"),
  } as never)
  assert.equal(open?.status, "accepted")
})

test("only the followed member can approve a pending follow request", async () => {
  const originalDoc = {
    author: "a",
    recipient: "b",
    sourceProfile: "profile-a",
    targetProfile: "profile-b",
    key: '["a","b"]',
    status: "pending",
  }
  await assert.rejects(
    () =>
      validateFollow({
        data: { status: "accepted" },
        originalDoc,
        operation: "update",
        req: makeReq("a"),
      } as never),
    /người được theo dõi/,
  )
  const data = await validateFollow({
    data: { status: "accepted", author: "forged" },
    originalDoc,
    operation: "update",
    req: makeReq("b"),
  } as never)
  assert.equal(data?.status, "accepted")
  assert.equal(data?.author, "a")
})

test("renamed files cannot pass the video container check", () => {
  assert.equal(validStoryVideo(Buffer.from("not a movie"), "video/mp4"), false)
  assert.equal(
    validStoryVideo(
      Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
      "video/mp4",
    ),
    true,
  )
  assert.equal(
    validStoryVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0]), "video/webm"),
    true,
  )
  assert.equal(
    validStoryVideo(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0]), "video/mp4"),
    false,
  )
})

test("story expiry is server-owned and video ownership is enforced", async () => {
  const hook = CommunityStories.hooks!.beforeValidate![0]
  const req = {
    user: { id: "a", name: "Player A", collection: "users" },
    payload: {
      count: async () => ({ totalDocs: 0 }),
      find: async () => ({ docs: [{ id: "profile-a" }] }),
      findByID: async () => ({
        communityOwner: "a",
        mimeType: "video/mp4",
        filesize: 1000,
      }),
    },
  }
  const now = Date.now()
  const story = await hook({
    data: { video: "video-a", author: "forged", expiresAt: "2099-01-01" },
    req,
    operation: "create",
  } as never)
  assert.equal(story?.author, "a")
  assert.equal(story?.visibility, "visible")
  assert.ok(
    Math.abs(new Date(story!.expiresAt).getTime() - now - 86400_000) < 1000,
  )
  req.payload.findByID = async () => ({
    communityOwner: "b",
    mimeType: "video/mp4",
    filesize: 1000,
  })
  await assert.rejects(
    () =>
      hook({
        data: { video: "someone-elses-video" },
        req,
        operation: "create",
      } as never),
    /không thuộc về bạn/,
  )
  await assert.rejects(
    () =>
      hook({
        data: { video: "v", image: "i" },
        req,
        operation: "create",
      } as never),
    /một ảnh hoặc một video/,
  )
})
