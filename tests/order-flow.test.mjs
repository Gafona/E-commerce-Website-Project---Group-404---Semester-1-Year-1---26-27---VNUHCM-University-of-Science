import assert from "node:assert/strict"
import test from "node:test"
import { DEFAULT_TARIFF, estimateKm, roadKm, shippingFeeFor, tariffIssue, toPoint } from "../src/lib/shipping.ts"
import { resolveProvince } from "../src/lib/provinces.ts"
import { normalizeStatus, orderCodesIn, payoutFor, rollupStatus } from "../src/lib/order-flow.ts"
import { incomingTransfers, providedSecret } from "../src/lib/payment-webhook.ts"
import { splitTotal } from "../src/lib/banks.ts"

test("km tariff: 8.000₫ for the first 3 km, 3.000₫/km to 100 km, then 1.500₫/km", () => {
  const t = DEFAULT_TARIFF
  assert.equal(shippingFeeFor(3, t), 8000)
  assert.equal(shippingFeeFor(5, t), 14000)
  assert.equal(shippingFeeFor(10, t), 29000)
  assert.equal(shippingFeeFor(20, t), 59000)
  assert.equal(shippingFeeFor(150, t), 8000 + 97 * 3000 + 50 * 1500)
  assert.equal(shippingFeeFor(0.4, t), 8000)
})

test("admin adjustment scales the fee and rounds to 1.000₫", () => {
  assert.equal(shippingFeeFor(10, { ...DEFAULT_TARIFF, adjustPercent: -50 }), 15000) // 14.500 → 15.000
  assert.equal(shippingFeeFor(3, { ...DEFAULT_TARIFF, adjustPercent: 100 }), 16000)
  assert.equal(shippingFeeFor(3, { ...DEFAULT_TARIFF, adjustPercent: -100 }), 0)
  assert.equal(shippingFeeFor(4.3, DEFAULT_TARIFF), 12000) // 11.900 → 12.000
})

test("tariff validation mirrors the admin form", () => {
  assert.equal(tariffIssue({ firstFee: 8000, firstKm: 3, perKm: 3000, adjustPercent: 0 }), null)
  assert.match(tariffIssue({ firstFee: 8000, firstKm: 3, perKm: 3000, adjustPercent: 150 })[0], /−100% đến \+100%/)
  assert.match(tariffIssue({ firstFee: 8000.5, firstKm: 3, perKm: 3000, adjustPercent: 0 })[0], /số nguyên/)
  assert.match(tariffIssue({ firstFee: "", firstKm: 3, perKm: 3000, adjustPercent: 0 })[0], /phải là một số/)
  assert.match(tariffIssue({ firstFee: 8000, firstKm: 3, perKm: 3000, adjustPercent: 2.5 })[0], /số nguyên/)
})

test("distances: exact points × 1.3, province centres as the labelled fallback", () => {
  const hcm = resolveProvince("ho-chi-minh")
  const hn = resolveProvince("ha-noi")
  assert.equal(estimateKm(hcm, hcm), 15)
  const longHaul = estimateKm(hn, hcm)
  assert.ok(longHaul > 1400 && longHaul < 1600, `HN → HCM ≈ 1.480 km, got ${longHaul}`)
  const a = { lat: 10.7626, lng: 106.6822 }
  const b = { lat: 10.7769, lng: 106.7009 }
  const km = roadKm(a, b)
  assert.ok(km > 3 && km < 4.5, `≈3.3 km by road, got ${km}`)
  assert.deepEqual(toPoint("10.7626", "106.6822"), a)
  assert.equal(toPoint(106.68, 10.76), null) // swapped
  assert.equal(toPoint(null, 106), null)
})

test("parent status rolls up from its shop orders", () => {
  assert.equal(rollupStatus("pending", [{ status: "cancelled" }, { status: "cancelled" }]), "cancelled")
  assert.equal(rollupStatus("pending", [{ status: "delivered" }, { status: "cancelled" }]), "delivered")
  assert.equal(rollupStatus("pending", [{ status: "shipping" }, { status: "pending" }]), "shipping")
  assert.equal(rollupStatus("pending", [{ status: "delivered" }, { status: "pending" }]), "shipping")
  assert.equal(rollupStatus("shipping", [{ status: "pending" }, { status: "pending" }]), "pending")
  assert.equal(rollupStatus("awaiting_payment", [{ status: "awaiting_payment" }, { status: "awaiting_payment" }]), "awaiting_payment")
  assert.equal(rollupStatus("awaiting_payment", [{ status: "cancelled" }]), "cancelled")
  assert.equal(normalizeStatus("awaiting_quote"), "pending")
  assert.equal(normalizeStatus("confirmed"), "pending")
})

test("payout: transfer orders pay goods + shipping, COD orders pay the discount share", () => {
  assert.equal(payoutFor({ payment: "online", subtotal: 200000, shipping: 4000, discount: 20000 }), 204000)
  assert.equal(payoutFor({ payment: "cod", subtotal: 200000, shipping: 4000, discount: 20000 }), 20000)
  assert.equal(payoutFor({ payment: "cod", subtotal: 200000, shipping: 4000, discount: 0 }), 0)
})

test("the discount is shared across shops in proportion to their goods", () => {
  const parts = splitTotal([{ key: "a", subtotal: 200000 }, { key: "b", subtotal: 150000 }], 35000)
  assert.equal(parts.get("a"), 20000)
  assert.equal(parts.get("b"), 15000)
  const odd = splitTotal([{ key: "a", subtotal: 1 }, { key: "b", subtotal: 1 }, { key: "c", subtotal: 1 }], 100)
  assert.equal([...odd.values()].reduce((s, v) => s + v, 0), 100)
})

test("order codes are found in bank transfer content", () => {
  assert.deepEqual(orderCodesIn("MBVCB.123 BOAINL5BLCWW thanh toan"), ["BOAINL5BLCWW"])
  assert.deepEqual(orderCodesIn("boai nl5b lcww"), ["BOAINL5BLCWW"])
  assert.deepEqual(orderCodesIn("BOAINL5BLCWWFT26323"), ["BOAINL5BLCWW"])
  assert.deepEqual(orderCodesIn("chuyen tien"), [])
})

test("webhook payloads from SePay, Casso and PayOS become incoming transfers", () => {
  assert.deepEqual(incomingTransfers({ id: 92704, transferType: "in", transferAmount: 1509000, content: "BOAINL5BLCWW", referenceCode: "FT1" }), [{ amount: 1509000, content: "BOAINL5BLCWW", transactionId: "FT1" }])
  assert.deepEqual(incomingTransfers({ id: 1, transferType: "out", transferAmount: 5000, content: "x" }), [])
  assert.deepEqual(incomingTransfers({ error: 0, data: [{ tid: "T1", amount: 2000, description: "BOAIABCDEFGH" }, { tid: "T2", amount: -50, description: "fee" }] }), [{ amount: 2000, content: "BOAIABCDEFGH", transactionId: "T1" }])
  assert.deepEqual(incomingTransfers({ error: 0, data: { id: 9, reference: "R9", amount: 3000, description: "BOAIZZZZZZZZ" } }), [{ amount: 3000, content: "BOAIZZZZZZZZ", transactionId: "R9" }])
  assert.deepEqual(incomingTransfers({ code: "00", success: true, data: { orderCode: 123, amount: 4000, description: "BOAIQQQQQQQQ", reference: "P1" }, signature: "s" }), [{ amount: 4000, content: "BOAIQQQQQQQQ 123", transactionId: "P1" }])
  assert.deepEqual(incomingTransfers("nope"), [])
})

test("the webhook secret is read from the supported headers or ?token=", () => {
  const url = "https://shop.example/api/payments/webhook"
  assert.equal(providedSecret(new Headers({ authorization: "Apikey abc" }), url), "abc")
  assert.equal(providedSecret(new Headers({ authorization: "Bearer abc" }), url), "abc")
  assert.equal(providedSecret(new Headers({ "x-api-key": "abc" }), url), "abc")
  assert.equal(providedSecret(new Headers({ "secure-token": "abc" }), url), "abc")
  assert.equal(providedSecret(new Headers(), `${url}?token=abc`), "abc")
  assert.equal(providedSecret(new Headers(), url), "")
})
