"use client"

import { useEffect, useState } from "react"
import { Search } from "lucide-react"
import type { PricedProduct } from "@/lib/event-pricing"
import { activeFilterCount, type CatalogFilters } from "@/lib/catalog-filters"
import { useShop } from "../components/ShopProvider"
import { ProductResultCard } from "../components/ProductResultCard"
import { CatalogControls } from "../components/catalog/CatalogControls"
import { useCatalogFilters } from "../components/catalog/useCatalogFilters"

const PAGE_SIZE = 24

/** /tim-kiem results with the shared compact filters, synced to the URL. */
export function SearchCatalog({ products, initial, query }: { products: PricedProduct[]; initial: CatalogFilters; query: string }) {
  const { tr } = useShop()
  const catalog = useCatalogFilters(products, { initial, syncUrl: true })
  const [visible, setVisible] = useState(PAGE_SIZE)
  useEffect(() => setVisible(PAGE_SIZE), [catalog.filters])
  const results = catalog.results

  return (
    <>
      <CatalogControls
        filters={catalog.filters}
        facets={catalog.facets}
        resultCount={results.length}
        update={catalog.update}
        reset={catalog.reset}
        fitActive={catalog.fitActive}
      />
      {results.length ? (
        <>
          <div className="product-grid mt-4">
            {results.slice(0, visible).map((product) => (
              <ProductResultCard key={product.id} product={product} tr={tr} />
            ))}
          </div>
          {results.length > visible && (
            <div className="mt-6 flex justify-center">
              <button type="button" className="boai-button" onClick={() => setVisible((n) => n + PAGE_SIZE)}>
                {tr(`Xem thêm (${results.length - visible} sản phẩm)`, `Show more (${results.length - visible} products)`)}
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="empty-state">
          <Search size={28} />
          <h3>{tr("Không tìm thấy sản phẩm", "No products found")}</h3>
          <p>
            {products.length
              ? tr("Thử bỏ bớt bộ lọc để xem thêm lựa chọn.", "Try removing some filters to see more options.")
              : query
                ? tr("Thử từ khóa khác như “Yonex”, “giày”, “áo đấu”.", "Try another keyword like “Yonex”, “giày” (boots), “áo đấu” (jersey).")
                : tr("Chưa có sản phẩm nào đang bán.", "No products are on sale yet.")}
          </p>
          {activeFilterCount(catalog.filters) > 0 && products.length > 0 && (
            <button type="button" className="boai-button" onClick={catalog.reset}>
              {tr("Xóa tất cả bộ lọc", "Clear all filters")}
            </button>
          )}
        </div>
      )}
    </>
  )
}
