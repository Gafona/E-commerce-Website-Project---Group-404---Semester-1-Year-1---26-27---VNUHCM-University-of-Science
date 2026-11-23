# BOAI — Nền tảng thương mại điện tử đa gian hàng cho sản phẩm thể thao

<p align="center">
  <strong>Group 404 · Semester 1 · Academic Year 2026–2027</strong><br/>
  Trường Đại học Khoa học Tự nhiên — ĐHQG TP. Hồ Chí Minh
</p>

<p align="center">
  <a href="https://boai.figma.site">Website demo</a> ·
  <a href="https://www.figma.com/make/gV5zMiRHh1fnZgsJavLAoY">Figma Make workspace</a> ·
  <a href="./docs">Project documentation</a> ·
  <a href="./docs/TEAM.md">Team</a>
</p>

## Giới thiệu

**BOAI** là đồ án xây dựng nền tảng thương mại điện tử chuyên về sản phẩm thể thao, được phát triển theo mô hình **multi-vendor marketplace**. Hệ thống hướng đến việc kết nối người mua với nhiều nhà bán hàng trên cùng một nền tảng, đồng thời mở rộng trải nghiệm mua sắm bằng các công cụ hỗ trợ người chơi thể thao lựa chọn thiết bị, theo dõi hoạt động và kết nối với cộng đồng.

Dự án được thực hiện bởi **Nhóm 404** trong khuôn khổ học phần **Nhập môn Công nghệ Thông tin (lớp 26C04)** tại Trường Đại học Khoa học Tự nhiên, ĐHQG-HCM.

## Mục tiêu dự án

- Xây dựng trải nghiệm mua sắm trực tuyến tập trung vào các sản phẩm và dụng cụ thể thao.
- Hỗ trợ mô hình nhiều nhà bán hàng với các chức năng quản lý sản phẩm và đơn hàng.
- Bổ sung các tính năng hướng đến người chơi thể thao như SportDNA, gợi ý thiết bị và hoạt động cộng đồng.
- Xây dựng khu vực quản trị để quản lý dữ liệu và vận hành nền tảng.
- Thử nghiệm quy trình phát triển sản phẩm có AI hỗ trợ, kết hợp kiểm tra và điều chỉnh thủ công của nhóm.

## Các phân hệ chính

### 1. Mua sắm trực tuyến

- Duyệt và khám phá danh mục sản phẩm thể thao.
- Xem thông tin chi tiết sản phẩm, phân loại và đánh giá.
- Hỗ trợ giỏ hàng, đặt hàng và theo dõi quy trình xử lý đơn.
- Các chức năng liên quan đến mã giảm giá, yêu cầu đổi trả và đề xuất sản phẩm.

### 2. Nhà bán hàng và vận hành đơn hàng

- Quản lý thông tin gian hàng và sản phẩm.
- Theo dõi đơn hàng và các bước xử lý đơn.
- Hỗ trợ trao đổi giữa người mua và nhà bán hàng thông qua chức năng chat.

### 3. SportDNA

SportDNA là phân hệ đánh giá và hồ sơ thể thao, hướng đến việc giúp người chơi hiểu rõ hơn về năng lực của bản thân và tìm thiết bị phù hợp.

Các nội dung được phát triển gồm:

- Bộ câu hỏi đánh giá kỹ năng theo môn thể thao.
- Các tình huống mô phỏng để người chơi lựa chọn cách xử lý.
- Hồ sơ năng lực và biểu đồ kỹ năng.
- Thông tin gợi ý mức độ phù hợp giữa hồ sơ người chơi và sản phẩm.
- Nội dung thiết kế và thử nghiệm riêng cho cầu lông và bóng đá.

Tài liệu mô tả phạm vi, cấu trúc câu hỏi và logic SportDNA được lưu tại [docs/sportdna-brief.md](./docs/sportdna-brief.md). Prompt phục vụ phát triển SportDNA được lưu riêng tại [docs/sportdna-ai-prompts.md](./docs/sportdna-ai-prompts.md).

### 4. Cộng đồng thể thao

- Đăng tải và khám phá nội dung chia sẻ.
- Tương tác với bài viết và người dùng khác.
- Hồ sơ cộng đồng, kết nối và thông báo hoạt động.
- Nội dung câu chuyện và thành tích của người chơi.

### 5. Giải đấu và hoạt động thể thao

- Hiển thị thông tin sự kiện, giải đấu.
- Hỗ trợ đăng ký tham gia và quản lý thông tin đăng ký.
- Tổ chức dữ liệu lịch thi đấu và kết quả theo cấu trúc của hệ thống.

### 6. Tính năng mở rộng

- **Custom Design Lab:** hỗ trợ thiết kế áo thể thao và gửi yêu cầu đến xưởng.
- **Xác thực sản phẩm:** mô phỏng quy trình tra cứu mã xác thực sản phẩm.
- **Quản trị hệ thống:** quản lý dữ liệu và nội dung thông qua Payload CMS.

> **Lưu ý về phạm vi:** BOAI là sản phẩm đồ án đang trong quá trình phát triển. Một số luồng có thể sử dụng dữ liệu mẫu hoặc mô phỏng để trình bày trải nghiệm. Ví dụ, xác nhận thanh toán chuyển khoản cần được đối soát theo quy trình vận hành; không nên mặc định rằng hệ thống đã kết nối webhook ngân hàng hoặc cổng thanh toán thật. Tương tự, dữ liệu lịch thi đấu mẫu không đại diện cho một giải đấu đang diễn ra.

## Công nghệ sử dụng

| Công nghệ | Vai trò |
|---|---|
| [Next.js](https://nextjs.org/) | Framework ứng dụng web |
| [React](https://react.dev/) | Xây dựng giao diện người dùng |
| [TypeScript](https://www.typescriptlang.org/) | Ngôn ngữ phát triển và kiểm soát kiểu dữ liệu |
| [Tailwind CSS](https://tailwindcss.com/) | Thiết kế và định dạng giao diện |
| [Payload CMS](https://payloadcms.com/) | CMS, quản lý dữ liệu và cấu hình phân hệ |
| [Figma Make](https://www.figma.com/make/) | Hỗ trợ khởi tạo và phát triển ứng dụng bằng AI |

Thông tin phiên bản và các thư viện phụ thuộc được quản lý trong [package.json](./package.json) và [pnpm-lock.yaml](./pnpm-lock.yaml).

## Cấu trúc thư mục

```text
.
├── docs/                 # Tài liệu dự án và tài liệu SportDNA
├── src/
│   ├── access/           # Quy tắc phân quyền
│   ├── app/              # Các route và giao diện Next.js
│   ├── assets/           # Tài nguyên giao diện
│   ├── collections/      # Các collection dữ liệu Payload CMS
│   ├── globals/          # Cấu hình dữ liệu dùng chung
│   ├── hooks/            # Các hook xử lý nghiệp vụ
│   ├── lib/              # Logic và tiện ích dùng chung
│   ├── payload-types.ts  # Kiểu dữ liệu Payload được sinh
│   └── payload.config.ts # Cấu hình Payload CMS
├── tests/                # Kiểm thử
├── package.json
├── pnpm-lock.yaml
└── README.md
```

## Cài đặt và chạy dự án

### Yêu cầu môi trường

- **Node.js:** phiên bản `20.9.0` trở lên.
- **pnpm:** phiên bản 9 hoặc 10.
- Các biến môi trường và dịch vụ phụ trợ cần thiết để chạy Payload CMS theo cấu hình của dự án.

### Các bước thực hiện

```bash
# 1. Clone repository
git clone https://github.com/Gafona/E-commerce-Website-Project---Group-404---Semester-1-Year-1---26-27---VNUHCM-University-of-Science.git

# 2. Di chuyển vào thư mục dự án
cd E-commerce-Website-Project---Group-404---Semester-1-Year-1---26-27---VNUHCM-University-of-Science

# 3. Cài đặt dependencies
pnpm install

# 4. Thiết lập biến môi trường
# Tạo file .env theo cấu hình môi trường được nhóm cung cấp.

# 5. Chạy môi trường phát triển
pnpm dev
```

Sau khi khởi động thành công, mở địa chỉ local được hiển thị trong terminal (mặc định cổng `3000`).

### Một số lệnh hữu ích

| Lệnh | Mô tả |
|---|---|
| `pnpm dev` | Chạy ứng dụng ở chế độ phát triển |
| `pnpm build` | Build ứng dụng thông qua Payload |
| `pnpm start` | Khởi chạy bản build |
| `pnpm format` | Định dạng mã nguồn |
| `pnpm generate:types` | Sinh lại Payload TypeScript types |
| `pnpm generate:importmap` | Sinh lại Payload import map |

**Lưu ý:** Repository không cung cấp sẵn thông tin bí mật hoặc cấu hình môi trường cá nhân. Hãy liên hệ nhóm phát triển để nhận các biến môi trường và thông tin dịch vụ cần thiết; không đưa API key, mật khẩu hoặc thông tin xác thực vào Git.

## Tài liệu dự án

| Tài liệu | Nội dung |
|---|---|
| [docs/FEATURES.md](./docs/FEATURES.md) | Danh mục chức năng và phạm vi các phân hệ BOAI |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) | Tổng quan kiến trúc, cấu trúc mã nguồn và cấu hình Payload CMS |
| [docs/sportdna-brief.md](./docs/sportdna-brief.md) | Tổng quan SportDNA, cấu trúc đánh giá và các luồng chức năng |
| [docs/sportdna-ai-prompts.md](./docs/sportdna-ai-prompts.md) | Prompt và tài liệu phục vụ quá trình phát triển SportDNA |
| [docs/prompts/README.md](./docs/prompts/README.md) | Mục lục prompt BOAI, chia thành từng nhóm chức năng và tệp riêng để tra cứu |
| [docs/PROMPTS-ARCHIVE.md](./docs/PROMPTS-ARCHIVE.md) | Bản lưu trữ prompt tổng hợp để đối chiếu (đã lược thông tin xác thực demo) |
| [docs/TEAM.md](./docs/TEAM.md) | Danh sách thành viên và phân công nhóm (cần hoàn thiện thông tin) |
| [src/](./src) | Mã nguồn ứng dụng |
| [tests/](./tests) | Các tệp kiểm thử hiện có |

## Định hướng phát triển

BOAI được xây dựng theo hướng mở rộng từng phân hệ. Các hướng phát triển tiếp theo có thể bao gồm hoàn thiện quy trình vận hành đa gian hàng, tăng mức độ tích hợp với dịch vụ thanh toán và vận chuyển, mở rộng dữ liệu đánh giá thể thao, cũng như nâng cao khả năng kiểm thử và bảo trì hệ thống.

## Nhóm thực hiện

**Nhóm 404**  
Học phần: Nhập môn Công nghệ Thông tin — Lớp 26C04  
Khoa Công nghệ Thông tin, Trường Đại học Khoa học Tự nhiên — ĐHQG-HCM  
Năm học: 2026–2027

---

<p align="center">
  <em>BOAI — Bringing sports closer to everyone.</em>
</p>
