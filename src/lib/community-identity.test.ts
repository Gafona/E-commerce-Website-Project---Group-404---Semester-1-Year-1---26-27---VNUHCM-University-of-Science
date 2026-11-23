import assert from "node:assert/strict"
import test from "node:test"
import {
  communityPublicId,
  communityDisplayId,
  communityProfileHref,
  matchesCommunityIdentity,
  normalizeMemberSearch,
} from "./community-identity.ts"

const profile = {
  id: "9f1f823a-afa2-4673-bd69-66d925d9d079",
  name: "Hoàng Anh Hùng",
}

test("public IDs preserve the public profile identity and survive name changes", () => {
  assert.match(communityPublicId(profile.id), /^Boai\d{6}$/)
  const renamed = { ...profile, name: "Tên mới" }
  assert.equal(communityPublicId(renamed.id), communityPublicId(profile.id))
  assert.notEqual(
    communityPublicId("profile-a"),
    communityPublicId("profile-b"),
  )
})

test("Vietnamese names support accents, case, extra spaces and partial names", () => {
  for (const query of [
    "Hoàng Anh Hùng",
    "hoang anh hung",
    "HÙNG",
    "  hoang   hung  ",
    "anh hoang",
  ]) {
    assert.equal(matchesCommunityIdentity(profile, query), true, query)
  }
  assert.equal(normalizeMemberSearch(" ĐẶNG  Đình "), "dang dinh")
  assert.equal(
    matchesCommunityIdentity({ id: "a", name: "Đặng Đình" }, "dang dinh"),
    true,
  )
  assert.equal(matchesCommunityIdentity(profile, "Hoàng Ngọc"), false)
})

test("copied full IDs, @IDs, partial IDs and raw profile IDs are searchable", () => {
  for (const query of [
    communityPublicId(profile.id),
    `@${communityPublicId(profile.id)}`,
    communityPublicId(profile.id).toLowerCase().slice(0, 7),
    "boai-9F1F823A",
    profile.id,
  ]) {
    assert.equal(matchesCommunityIdentity(profile, query), true, query)
  }
  assert.equal(matchesCommunityIdentity(profile, "BOAI-another-profile"), false)
})

test("search matches public names and IDs, not private account information", () => {
  assert.equal(matchesCommunityIdentity(profile, "someone@example.com"), false)
  assert.equal(matchesCommunityIdentity(profile, "0901234567"), false)
  assert.equal(matchesCommunityIdentity(profile, ""), true)
})

test("custom handles are validated and searchable with or without @", async () => {
  const { communityHandleError, communityDisplayId, normalizeCommunityHandle } =
    await import("./community-identity.ts")
  assert.equal(normalizeCommunityHandle(" @MinhAnh.BD "), "minhanh.bd")
  assert.equal(communityHandleError("minhanh.bd"), null)
  for (const bad of ["ab", "1abc", "boai_admin", "admin", "a..b", "abc_", "tên"])
    assert.notEqual(communityHandleError(bad), null, bad)
  assert.equal(communityDisplayId("p1", "minhanh"), communityPublicId("p1"))
  assert.equal(communityDisplayId("p1", null), communityPublicId("p1"))
  const withHandle = { ...profile, handle: "hunghoang" }
  assert.equal(matchesCommunityIdentity(withHandle, "@hung"), true)
  assert.equal(matchesCommunityIdentity(withHandle, "hunghoang"), true)
})

test("short codes keep six digits, while navigation retains the exact profile identity", () => {
  for (let i = 0; i < 2000; i++) {
    const id = `public-profile-${i}`
    assert.match(communityDisplayId(id), /^Boai\d{6}$/)
    assert.equal(communityProfileHref(id), `/nguoi-dung/${id}`)
    assert.notEqual(communityProfileHref(id), `/nguoi-dung/${communityPublicId(id)}`)
  }
  assert.equal(matchesCommunityIdentity(profile, `BOAI-${profile.id}`), true)
  assert.equal(matchesCommunityIdentity(profile, "Boai1234567"), false)
})
