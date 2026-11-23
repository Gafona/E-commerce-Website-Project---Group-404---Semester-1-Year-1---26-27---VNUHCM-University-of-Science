/** Vietnamese banks supported by VietQR, keyed by short code with their NAPAS BIN. */
export const BANKS = [
  { code: "VCB", bin: "970436", name: "Vietcombank" },
  { code: "CTG", bin: "970415", name: "VietinBank" },
  { code: "BIDV", bin: "970418", name: "BIDV" },
  { code: "AGRIBANK", bin: "970405", name: "Agribank" },
  { code: "TCB", bin: "970407", name: "Techcombank" },
  { code: "MB", bin: "970422", name: "MB Bank" },
  { code: "ACB", bin: "970416", name: "ACB" },
  { code: "VPB", bin: "970432", name: "VPBank" },
  { code: "TPB", bin: "970423", name: "TPBank" },
  { code: "STB", bin: "970403", name: "Sacombank" },
  { code: "HDB", bin: "970437", name: "HDBank" },
  { code: "VIB", bin: "970441", name: "VIB" },
  { code: "SHB", bin: "970443", name: "SHB" },
  { code: "EIB", bin: "970431", name: "Eximbank" },
  { code: "MSB", bin: "970426", name: "MSB" },
  { code: "OCB", bin: "970448", name: "OCB" },
  { code: "SEAB", bin: "970440", name: "SeABank" },
  { code: "LPB", bin: "970449", name: "LPBank" },
  { code: "NAB", bin: "970428", name: "Nam A Bank" },
  { code: "BAB", bin: "970409", name: "Bac A Bank" },
  { code: "ABB", bin: "970425", name: "ABBANK" },
  { code: "KLB", bin: "970452", name: "KienlongBank" },
  { code: "PVCB", bin: "970412", name: "PVcomBank" },
  { code: "VAB", bin: "970427", name: "VietABank" },
  { code: "BVB", bin: "970454", name: "BVBank" },
  { code: "NCB", bin: "970419", name: "NCB" },
  { code: "CAKE", bin: "546034", name: "CAKE by VPBank" },
] as const

export type BankCode = (typeof BANKS)[number]["code"]

export const bankByCode = (code?: string | null) =>
  BANKS.find((bank) => bank.code === code) ?? null

export const ACCOUNT_NUMBER_PATTERN = /^\d{6,19}$/

/** Account holder names on VietQR are uppercase ASCII. */
export const normalizeHolder = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase()

export function vietQrUrl(input: {
  bankCode: string
  accountNumber: string
  accountHolder: string
  amount: number
  note: string
}) {
  const bank = bankByCode(input.bankCode)
  if (!bank) return null
  const params = new URLSearchParams({
    amount: String(Math.max(0, Math.round(input.amount))),
    addInfo: input.note,
    accountName: input.accountHolder,
  })
  return `https://img.vietqr.io/image/${bank.bin}-${input.accountNumber}-compact2.png?${params}`
}

/**
 * Splits an order total across shops in proportion to each shop's subtotal
 * (so shipping and vouchers are shared fairly). Rounding is absorbed by the
 * last shop so the parts always add up to the total.
 */
export function splitTotal(groups: { key: string; subtotal: number }[], total: number) {
  const amounts = new Map<string, number>()
  const sum = groups.reduce((acc, group) => acc + group.subtotal, 0)
  let assigned = 0
  groups.forEach((group, index) => {
    const amount =
      index === groups.length - 1
        ? total - assigned
        : sum
          ? Math.round((total * group.subtotal) / sum)
          : 0
    assigned += amount
    amounts.set(group.key, amount)
  })
  return amounts
}
