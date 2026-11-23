import type { GlobalConfig } from "payload"
import { APIError } from "payload"
import { staffAccess } from "../access/roles"
import { ACCOUNT_NUMBER_PATTERN, BANKS, bankByCode, normalizeHolder } from "../lib/banks"

/**
 * BOAI's own receiving account. Every bank-transfer order is paid here via
 * VietQR; BOAI then pays each shop from the ledger in /quan-tri/doi-soat.
 * Read on the server only (the order page renders the QR).
 */
export const PaymentSettings: GlobalConfig = {
  slug: "payment-settings",
  label: "Tài khoản nhận tiền BOAI",
  admin: {
    group: "BOAI Commerce",
    description: "Khách chuyển khoản (VietQR) vào tài khoản này; BOAI đối soát và chi trả cho shop.",
  },
  access: { read: staffAccess, update: staffAccess },
  hooks: {
    beforeValidate: [
      ({ data }) => {
        if (!data) return data
        const bankCode = data.bankCode ? String(data.bankCode) : ""
        const accountNumber = String(data.accountNumber ?? "").replace(/\s/g, "")
        const accountName = normalizeHolder(String(data.accountName ?? ""))
        const any = bankCode || accountNumber || accountName
        if (any && (!bankByCode(bankCode) || !ACCOUNT_NUMBER_PATTERN.test(accountNumber) || accountName.length < 3)) {
          throw new APIError("Cần đủ ngân hàng, số tài khoản (6–19 chữ số) và tên chủ tài khoản.", 400, null, true)
        }
        return { ...data, bankCode: bankCode || null, accountNumber: accountNumber || null, accountName: accountName || null }
      },
    ],
  },
  fields: [
    {
      name: "bankCode",
      label: "Ngân hàng",
      type: "select",
      options: BANKS.map((bank) => ({ label: `${bank.name} (${bank.code})`, value: bank.code })),
    },
    { name: "accountNumber", label: "Số tài khoản", type: "text", maxLength: 19 },
    {
      name: "accountName",
      label: "Tên chủ tài khoản",
      type: "text",
      maxLength: 80,
      admin: { description: "Viết hoa không dấu, đúng như trên ngân hàng (VD: CONG TY TNHH BOAI)." },
    },
  ],
}
