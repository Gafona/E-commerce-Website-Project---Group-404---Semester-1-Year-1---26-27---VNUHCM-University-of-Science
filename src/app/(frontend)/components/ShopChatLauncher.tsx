"use client"

import { useEffect } from "react"
import { MessageCircle } from "lucide-react"
import type { ChatProductView } from "../shop-chat-actions"
import { useChatDock } from "./ChatDock"
import { useShop } from "./ShopProvider"

/** Opens the site-wide message dock on this page's shop (e.g. from the seller card). */
export function OpenShopChatButton({
  className = "boai-button",
  label,
}: {
  className?: string
  label?: string
}) {
  const { tr } = useShop()
  const { openShop } = useChatDock()
  return (
    <button type="button" className={className} onClick={openShop}>
      <MessageCircle size={16} /> {label ?? tr("Chat với shop", "Chat with shop")}
    </button>
  )
}

/**
 * Tells the bottom-right message dock which shop this product/shop page offers
 * chat for. The dock renders the button, panel and new-message alerts.
 */
export function ShopChatLauncher({
  shopId,
  shopName,
  avatarUrl,
  product,
}: {
  shopId: string
  shopName: string
  avatarUrl: string | null
  product?: ChatProductView | null
}) {
  const { registerShop } = useChatDock()
  const productId = product?.id ?? null
  const productName = product?.name ?? null
  const productSlug = product?.slug ?? null
  const productImage = product?.image ?? null

  useEffect(
    () =>
      registerShop({
        shopId,
        shopName,
        avatarUrl,
        product: productId
          ? { id: productId, name: productName ?? "", slug: productSlug ?? "", image: productImage }
          : null,
      }),
    [registerShop, shopId, shopName, avatarUrl, productId, productName, productSlug, productImage],
  )

  return null
}
