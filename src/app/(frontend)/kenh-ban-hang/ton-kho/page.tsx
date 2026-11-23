import { requireSeller, sellerProducts } from "../seller-lib"
import { getTr } from "@/lib/i18n-server"
import { InventoryRow } from "./InventoryRow"

export default async function SellerInventory() {
  const seller = await requireSeller()
  const tr = await getTr()
  const products = await sellerProducts(seller.id)
  return (
    <>
      <header className="sc-head"><div><small>{tr("Cập nhật nhanh", "Quick update")}</small><h1>{tr("Tồn kho & giá", "Inventory & pricing")}</h1></div></header>
      <section className="sc-card">
        {products.length ? (
          <table className="sc-table">
            <thead>
              <tr>
                <th>{tr("Sản phẩm", "Product")}</th>
                <th>{tr("Giá bán · Giá gạch · Tồn kho", "Price · Old price · Stock")}</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.name} {p.stock <= 5 && <span className="sc-badge cancelled">{tr("Sắp hết", "Low stock")}</span>}
                    {p.hidden && <span className="sc-badge">{tr("Đang ẩn", "Hidden")}</span>}
                  </td>
                  <td>
                    <InventoryRow id={String(p.id)} price={p.price} oldPrice={p.oldPrice ?? null} stock={p.stock} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="sc-empty">{tr("Chưa có sản phẩm.", "No products yet.")}</p>
        )}
      </section>
    </>
  )
}
