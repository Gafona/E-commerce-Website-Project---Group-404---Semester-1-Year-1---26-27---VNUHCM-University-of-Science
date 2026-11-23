"use client"

import { useActionState, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Check, LogOut, MapPin, Plus, Trash2, UserRound } from "lucide-react"
import { updateProfileAction, type ProfileState } from "../shop-actions"
import { logoutAction } from "../auth-actions"
import { leaveAccount } from "@/lib/browser-state"
import { useShop } from "../components/ShopProvider"
import { AddressLocator } from "../components/AddressLocator"
import { provincesByRegion, REGION_LABELS, resolveProvince } from "@/lib/provinces"

const REGIONS = provincesByRegion()

export type DeliveryAddress = {
  id?: string
  label: string
  recipientName: string
  phone: string
  addressLine: string
  ward: string
  district: string
  province: string
  /** Exact point from "Định vị" (gives exact shipping fees at checkout). */
  lat?: number | null
  lng?: number | null
  isDefault: boolean
}

const emptyAddress = (
  name: string,
  phone: string,
  label: string,
): DeliveryAddress => ({
  label,
  recipientName: name,
  phone,
  addressLine: "",
  ward: "",
  district: "",
  province: "",
  isDefault: false,
})

export function ProfileForm({
  user,
}: {
  user: {
    name: string
    email: string
    phone: string
    addresses: DeliveryAddress[]
  }
}) {
  const [state, action, pending] = useActionState<ProfileState, FormData>(
    updateProfileAction,
    { ok: false },
  )
  const router = useRouter()
  const { tr } = useShop()
  const [addresses, setAddresses] = useState(user.addresses)

  useEffect(() => {
    if (state.ok) router.refresh()
  }, [state.ok, router])

  useEffect(() => {
    setAddresses(user.addresses)
  }, [user.addresses])

  const update = (
    index: number,
    key: keyof DeliveryAddress,
    value: string | boolean,
  ) => {
    // Editing the address itself drops a point located for the old text.
    const moved = key === "addressLine" || key === "ward" || key === "district" || key === "province"
    setAddresses((current) =>
      current.map((item, i) =>
        i === index ? { ...item, [key]: value, ...(moved ? { lat: null, lng: null } : {}) } : item,
      ),
    )
  }
  const setDefault = (index: number) => {
    setAddresses((current) =>
      current.map((item, i) => ({ ...item, isDefault: i === index })),
    )
  }
  const remove = (index: number) => {
    setAddresses((current) => {
      const next = current.filter((_, i) => i !== index)
      if (next.length && !next.some((item) => item.isDefault))
        next[0] = { ...next[0], isDefault: true }
      return next
    })
  }

  return (
    <form
      className="account-profile-stack scroll-mt-24"
      action={action}
      id="ho-so"
    >
      <input type="hidden" name="addresses" value={JSON.stringify(addresses)} />
      <section className="form-card account-card">
        <div className="account-card-head">
          <span>
            <UserRound size={20} />
          </span>
          <div>
            <h3>{tr("Thông tin cá nhân", "Personal details")}</h3>
            <p>
              {tr(
                "Thông tin liên hệ dùng cho tài khoản và đơn hàng.",
                "Contact details used for your account and orders.",
              )}
            </p>
          </div>
        </div>
        <div className="field-row">
          <label className="field">
            <span>{tr("Họ và tên")}</span>
            <input name="name" defaultValue={user.name} required />
          </label>
          <label className="field">
            <span>{tr("Số điện thoại")}</span>
            <input
              name="phone"
              defaultValue={user.phone}
              inputMode="tel"
              placeholder="09xx xxx xxx"
            />
          </label>
        </div>
        <label className="field">
          <span>Email</span>
          <input value={user.email} readOnly aria-readonly="true" />
        </label>
        <p className="account-field-note">
          {tr(
            "Email đăng nhập không thể đổi tại đây.",
            "Your sign-in email cannot be changed here.",
          )}
        </p>
      </section>

      <section className="form-card account-card">
        <div className="account-card-head address-book-head">
          <span>
            <MapPin size={20} />
          </span>
          <div>
            <h3>{tr("Sổ địa chỉ giao hàng", "Delivery addresses")}</h3>
            <p>
              {tr(
                "Thêm tối đa 8 địa chỉ và chọn một địa chỉ mặc định.",
                "Add up to 8 addresses and choose one default.",
              )}
            </p>
          </div>
          <button
            type="button"
            className="boai-button"
            disabled={addresses.length >= 8}
            onClick={() =>
              setAddresses((current) => [
                ...current,
                {
                  ...emptyAddress(
                    user.name,
                    user.phone,
                    tr("Nhà riêng", "Home"),
                  ),
                  isDefault: current.length === 0,
                },
              ])
            }
          >
            <Plus size={16} /> {tr("Thêm địa chỉ", "Add address")}
          </button>
        </div>

        {addresses.length === 0 ? (
          <div className="address-empty">
            <MapPin size={24} />
            <b>{tr("Chưa có địa chỉ giao hàng", "No delivery address yet")}</b>
            <p>
              {tr(
                "Thêm địa chỉ để thanh toán nhanh hơn.",
                "Add an address for faster checkout.",
              )}
            </p>
          </div>
        ) : (
          <div className="address-list">
            {addresses.map((address, index) => (
              <article
                className={`address-editor ${
                  address.isDefault ? "default" : ""
                }`}
                key={address.id ?? index}
              >
                <div className="address-editor-head">
                  <button
                    type="button"
                    className="address-default"
                    onClick={() => setDefault(index)}
                  >
                    <i>{address.isDefault && <Check size={13} />}</i>
                    <span>
                      {address.isDefault
                        ? tr("Địa chỉ mặc định", "Default address")
                        : tr("Đặt làm mặc định", "Set as default")}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="address-remove"
                    onClick={() => remove(index)}
                    aria-label={tr("Xóa địa chỉ", "Remove address")}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="field-row three">
                  <label className="field">
                    <span>{tr("Tên địa chỉ", "Address label")} *</span>
                    <input
                      value={address.label}
                      onChange={(e) => update(index, "label", e.target.value)}
                      placeholder={tr(
                        "Nhà riêng, Văn phòng...",
                        "Home, Office...",
                      )}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{tr("Người nhận", "Recipient")} *</span>
                    <input
                      value={address.recipientName}
                      onChange={(e) =>
                        update(index, "recipientName", e.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{tr("Số điện thoại", "Phone")} *</span>
                    <input
                      value={address.phone}
                      onChange={(e) => update(index, "phone", e.target.value)}
                      inputMode="tel"
                      required
                    />
                  </label>
                </div>
                <label className="field">
                  <span>{tr("Địa chỉ chi tiết", "Street address")} *</span>
                  <input
                    value={address.addressLine}
                    onChange={(e) =>
                      update(index, "addressLine", e.target.value)
                    }
                    placeholder={tr(
                      "Số nhà, tên đường",
                      "House number, street",
                    )}
                    required
                  />
                </label>
                <div className="field-row three">
                  <label className="field">
                    <span>{tr("Phường / Xã", "Ward")}</span>
                    <input
                      value={address.ward}
                      onChange={(e) => update(index, "ward", e.target.value)}
                    />
                  </label>
                  <label className="field">
                    <span>{tr("Quận / Huyện", "District")} *</span>
                    <input
                      value={address.district}
                      onChange={(e) =>
                        update(index, "district", e.target.value)
                      }
                      required
                    />
                  </label>
                  <label className="field">
                    <span>{tr("Tỉnh / Thành phố", "Province / City")} *</span>
                    <select
                      value={resolveProvince(address.province)?.name ?? ""}
                      onChange={(e) =>
                        update(index, "province", e.target.value)
                      }
                      required
                    >
                      <option value="">
                        {address.province && !resolveProvince(address.province)
                          ? tr(`Chọn lại (đang lưu: ${address.province})`, `Choose again (saved: ${address.province})`)
                          : tr("— Chọn tỉnh / thành —", "— Choose —")}
                      </option>
                      {REGIONS.map(({ region, provinces }) => (
                        <optgroup key={region} label={tr(REGION_LABELS[region].vi, REGION_LABELS[region].en)}>
                          {provinces.map((p) => (
                            <option key={p.code} value={p.name}>{p.name}</option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
                <AddressLocator
                  query={[address.addressLine, address.ward, address.district, resolveProvince(address.province)?.name ?? address.province].filter(Boolean).join(", ")}
                  value={address.lat != null && address.lng != null ? { lat: address.lat, lng: address.lng } : null}
                  onChange={(point) =>
                    setAddresses((current) =>
                      current.map((item, i) => (i === index ? { ...item, lat: point?.lat ?? null, lng: point?.lng ?? null } : item)),
                    )
                  }
                  onProvince={(code) => {
                    if (!resolveProvince(address.province)) update(index, "province", resolveProvince(code)?.name ?? "")
                  }}
                  label={tr("Định vị địa chỉ để tính phí ship chính xác", "Locate this address for exact shipping fees")}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <div className="account-form-actions">
        <div>
          {state.error && <p className="form-error">{state.error}</p>}
          {state.message && <p className="form-ok">{state.message}</p>}
        </div>
        <button className="boai-button primary" disabled={pending}>
          {pending
            ? tr("Đang lưu...", "Saving...")
            : tr("Lưu thay đổi", "Save changes")}
        </button>
        <button
          type="button"
          className="text-link"
          onClick={async () => {
            try {
              await logoutAction()
            } finally {
              leaveAccount("/")
            }
          }}
        >
          <LogOut size={14} /> {tr("Đăng xuất")}
        </button>
      </div>
    </form>
  )
}
