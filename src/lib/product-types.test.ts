import assert from "node:assert/strict"
import test from "node:test"
import { deriveProductType, isProductType } from "./product-types.ts"

test("product types follow the head noun of Vietnamese names and categories", () => {
  const cases: [string, string, string][] = [
    ["Giày bóng đá", "Adidas Predator Accuracy.1 TF", "shoes"],
    ["Giày", "Giày NIke", "shoes"],
    ["Bóng thi đấu", "Bóng đá Adidas Al Rihla Pro", "balls"],
    ["Phụ kiện", "Túi vợt Yonex Pro 9R", "bags"],
    ["Cầu lông", "Ống cầu Yonex Aerosensa 50", "shuttlecocks"],
    ["Vợt cầu lông", "Yonex Nanoflare 1000 Z", "rackets"],
    ["Áo thi đấu", "Áo đấu Manchester United Away 24/25", "apparel"],
    ["Phụ kiện", "Quấn cán Yonex AC102", "accessories"],
    ["Quần", "Quần short thể thao", "apparel"],
    ["Bảo hộ", "Găng tay thủ môn Nike", "accessories"],
    ["Vợt", "Vợt Yonex kèm túi", "rackets"],
    ["Giày cầu lông", "Yonex 65Z3", "shoes"],
  ]
  for (const [category, name, want] of cases)
    assert.equal(deriveProductType({ category, name }), want, `${category} | ${name}`)
})

test("unknown items fall back to accessories and ids are validated", () => {
  assert.equal(deriveProductType({ category: "", name: "Sản phẩm mới" }), "accessories")
  assert.equal(isProductType("shoes"), true)
  assert.equal(isProductType("hats"), false)
})
