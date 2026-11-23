# BOAI — Tổng quan kiến trúc

## 1. Kiến trúc công nghệ
BOAI là ứng dụng web sử dụng:
- **Next.js** làm framework ứng dụng.
- **React** để xây dựng giao diện.
- **TypeScript** cho mã nguồn có kiểu dữ liệu.
- **Tailwind CSS** cho giao diện.
- **Payload CMS** để quản lý collection, global, quyền truy cập và dữ liệu ứng dụng.
- **Figma Make** trong quy trình hỗ trợ khởi tạo/phát triển sản phẩm.

Phiên bản framework và thư viện cụ thể được khai báo trong `package.json`.

## 2. Tổ chức mã nguồn

| Đường dẫn | Trách nhiệm |
|---|---|
| `src/app/` | Route và giao diện Next.js |
| `src/collections/` | Các collection dữ liệu Payload CMS |
| `src/globals/` | Cấu hình dữ liệu dùng chung |
| `src/access/` | Quy tắc truy cập |
| `src/hooks/` | Hook xử lý nghiệp vụ |
| `src/lib/` | Hàm tiện ích và logic dùng chung |
| `src/assets/` | Tài nguyên giao diện |
| `src/payload.config.ts` | Khai báo cấu hình Payload, collection, global và plugin |
| `src/payload-types.ts` | Kiểu dữ liệu Payload được sinh |
| `docs/` | Tài liệu dự án |
| `tests/` | Khu vực dành cho kiểm thử |

## 3. Lớp dữ liệu Payload CMS
Cấu hình tại `src/payload.config.ts` đăng ký các nhóm collection chính:
- Tài khoản và quản trị: Admins, Users.
- Thương mại: Products, ProductTaxonomies, Orders, DiscountCodes, ReturnRequests, Reviews.
- Cộng đồng: CommunityProfiles, CommunityPosts, CommunityComments, CommunityLikes, CommunityConnections và các collection liên quan đến stories/chat.
- Thể thao: SportAssessments, SportTestRuns, SportDnaResults, DnaShares, UserAchievements.
- Sự kiện và giải đấu: Events, EventRegistrations, CompetitionEvents, TournamentEvents, TournamentRegistrations, TournamentMatches, TournamentResults, MatchRatingHistory.
- Tính năng bổ sung: JerseyDesigns, CustomJerseyRequests, AuthenticityCodes, RecommendationRequests, Notifications và các collection nội dung.

Các global được khai báo gồm SiteContent, ShippingSettings, PaymentSettings và RecommendationSettings.

## 4. Email và biến môi trường
Cấu hình Payload sử dụng SMTP thông qua `src/lib/email-settings`. Theo chú thích trong `src/payload.config.ts`, gửi email thực tế cần các biến:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `EMAIL_FROM`

Nếu chưa cấu hình SMTP, Payload ghi email vào log máy chủ thay vì gửi qua nhà cung cấp email. Không commit giá trị bí mật vào repository.

## 5. Chạy ứng dụng
Yêu cầu phiên bản và lệnh chạy được khai báo trong `package.json` và README:

```bash
pnpm install
pnpm dev
```

Các lệnh hỗ trợ khác:

```bash
pnpm build
pnpm start
pnpm format
pnpm generate:types
pnpm generate:importmap
```

> **Phạm vi tài liệu:** Đây là sơ đồ kiến trúc ở mức tổng quan, dựa trên cấu trúc thư mục và cấu hình Payload hiện có. Luồng triển khai chi tiết, sơ đồ quan hệ dữ liệu, dịch vụ hạ tầng và trạng thái tích hợp bên ngoài cần được bổ sung sau khi đối chiếu môi trường chạy thực tế.
