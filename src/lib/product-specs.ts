import { RACKET_SPEC_OPTIONS, type RacketSpecKey } from "./racket-radar"

// options: chọn từ danh sách cố định (dùng để tính mạng nhện vợt). legacy: nhãn cũ để điền sẵn khi sửa sản phẩm cũ.
export type SpecTemplateField = { key: string; label: string; placeholder: string; options?: readonly string[]; legacy?: string }
export type SpecTemplate = { key: string; title: string; fields: SpecTemplateField[] }

const normalize = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/gi, "d").toLowerCase()

const f = (key: string, label: string, placeholder: string): SpecTemplateField => ({ key, label, placeholder })
const racket = (key: RacketSpecKey, legacy?: string): SpecTemplateField => ({
  key,
  label: RACKET_SPEC_OPTIONS[key].label,
  placeholder: "Chọn",
  options: RACKET_SPEC_OPTIONS[key].options,
  ...(legacy ? { legacy } : {}),
})

export const SPEC_TEMPLATES = {
  footballShoes: {
    key: "footballShoes",
    title: "Giày bóng đá",
    fields: [
      f("surface", "Loại sân", "TF, FG, IC..."),
      f("upper", "Chất liệu upper", "Da tổng hợp, vải dệt..."),
      f("fit", "Form chân", "Thon, tiêu chuẩn, bè"),
      f("collar", "Cổ giày", "Cổ thấp, cổ thun..."),
      f("weight", "Trọng lượng", "Ví dụ: 220 g"),
      f("sizes", "Size", "Ví dụ: 38–44"),
    ],
  },
  footballShirt: {
    key: "footballShirt",
    title: "Áo bóng đá",
    fields: [
      f("material", "Chất liệu", "Polyester, thun lạnh..."),
      f("fit", "Kiểu dáng", "Slim fit, regular fit..."),
      f("technology", "Công nghệ thấm hút", "Dri-FIT, AEROREADY..."),
      f("version", "Phiên bản", "Player, Fan, Training..."),
      f("sizes", "Size", "S, M, L, XL"),
      f("print", "In tên số", "Có hỗ trợ / Không"),
    ],
  },
  footballBall: {
    key: "footballBall",
    title: "Bóng đá",
    fields: [
      f("size", "Kích cỡ", "Size 4, Size 5"),
      f("material", "Chất liệu vỏ", "PU, TPU, PVC..."),
      f("construction", "Công nghệ ghép", "Khâu tay, dán nhiệt..."),
      f("weight", "Trọng lượng", "Ví dụ: 420–445 g"),
      f("surface", "Mặt sân phù hợp", "Cỏ tự nhiên, nhân tạo..."),
      f("standard", "Tiêu chuẩn", "FIFA Quality, IMS..."),
    ],
  },
  badmintonRacket: {
    key: "badmintonRacket",
    title: "Vợt cầu lông",
    fields: [
      racket("material"),
      racket("flex", "Độ cứng thân"),
      racket("balance", "Điểm cân bằng"),
      racket("length"),
      racket("weight"),
      racket("grip"),
      racket("tension", "Mức căng tối đa"),
    ],
  },
  badmintonShirt: {
    key: "badmintonShirt",
    title: "Áo cầu lông",
    fields: [
      f("material", "Chất liệu", "Polyester, thun lạnh..."),
      f("fit", "Kiểu dáng", "Slim fit, regular fit..."),
      f("technology", "Công nghệ thấm hút", "Very Cool, AT DRY..."),
      f("gender", "Giới tính", "Nam, nữ, unisex"),
      f("sizes", "Size", "S, M, L, XL"),
      f("stretch", "Độ co giãn", "4 chiều, 2 chiều..."),
    ],
  },
  shuttlecock: {
    key: "shuttlecock",
    title: "Quả cầu lông",
    fields: [
      f("feather", "Loại lông", "Lông vịt, lông ngỗng, nhựa"),
      f("speed", "Tốc độ", "76, 77, 78"),
      f("quantity", "Số quả/ống", "Ví dụ: 12 quả"),
      f("cork", "Đầu cầu", "Bần tự nhiên, bần ép..."),
      f("durability", "Độ bền", "Tiêu chuẩn, cao..."),
      f("level", "Cấp độ", "Tập luyện, thi đấu"),
    ],
  },
  badmintonShoes: {
    key: "badmintonShoes",
    title: "Giày cầu lông",
    fields: [
      f("sole", "Đế giày", "Cao su non-marking..."),
      f("cushion", "Công nghệ đệm", "Power Cushion..."),
      f("fit", "Form chân", "Thon, tiêu chuẩn, bè"),
      f("collar", "Cổ giày", "Cổ thấp, cổ trung..."),
      f("weight", "Trọng lượng", "Ví dụ: 300 g"),
      f("sizes", "Size", "Ví dụ: 38–44"),
    ],
  },
  footballGeneral: {
    key: "footballGeneral",
    title: "Sản phẩm bóng đá",
    fields: [
      f("material", "Chất liệu", "Chất liệu chính"),
      f("size", "Kích thước / Size", "Kích thước hoặc size"),
      f("weight", "Trọng lượng", "Ví dụ: 250 g"),
      f("usage", "Mục đích sử dụng", "Tập luyện, thi đấu..."),
      f("origin", "Xuất xứ", "Quốc gia sản xuất"),
      f("warranty", "Bảo hành", "Ví dụ: 3 tháng"),
    ],
  },
  badmintonGeneral: {
    key: "badmintonGeneral",
    title: "Sản phẩm cầu lông",
    fields: [
      f("material", "Chất liệu", "Chất liệu chính"),
      f("size", "Kích thước / Size", "Kích thước hoặc size"),
      f("weight", "Trọng lượng", "Ví dụ: 80 g"),
      f("usage", "Mục đích sử dụng", "Tập luyện, thi đấu..."),
      f("origin", "Xuất xứ", "Quốc gia sản xuất"),
      f("warranty", "Bảo hành", "Ví dụ: 3 tháng"),
    ],
  },
} satisfies Record<string, SpecTemplate>

export function specTemplateFor(sport: string, category: string): SpecTemplate {
  const c = normalize(category)
  if (sport === "badminton") {
    if (c.includes("vot")) return SPEC_TEMPLATES.badmintonRacket
    if (c.includes("giay")) return SPEC_TEMPLATES.badmintonShoes
    if (c.includes("ao")) return SPEC_TEMPLATES.badmintonShirt
    if (c === "cau" || c.includes("qua cau") || c.includes("ong cau") || c.includes("cau long"))
      return SPEC_TEMPLATES.shuttlecock
    return SPEC_TEMPLATES.badmintonGeneral
  }
  if (c.includes("giay")) return SPEC_TEMPLATES.footballShoes
  if (c.includes("ao")) return SPEC_TEMPLATES.footballShirt
  if (c.includes("bong")) return SPEC_TEMPLATES.footballBall
  return SPEC_TEMPLATES.footballGeneral
}

export function specValuesByLabel(specs: Array<{ label: string; value: string }> = []) {
  return Object.fromEntries(specs.map((spec) => [spec.label, spec.value]))
}

export const ALL_FIXED_SPEC_LABELS: string[] = [
  ...new Set(Object.values(SPEC_TEMPLATES).flatMap((t) => t.fields.map((field) => field.label))),
]
