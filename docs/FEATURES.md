# BOAI — Danh mục chức năng

Tài liệu này tóm tắt các phân hệ chính được mô tả trong README, báo cáo Kỳ 1 và cấu hình Payload CMS. Đây là bản giới thiệu phạm vi sản phẩm, không thay thế đặc tả nghiệp vụ hoặc kiểm thử nghiệm thu.

## 1. Mua sắm trực tuyến
- Trang chủ, danh mục, tìm kiếm và bộ lọc sản phẩm.
- Trang chi tiết sản phẩm, yêu thích và so sánh.
- Giỏ hàng, voucher và quy trình đặt hàng.
- Theo dõi đơn hàng tổng và đơn con theo từng shop.
- Tra cứu đơn hàng và xem lịch sử mua hàng.
- Hỗ trợ các luồng thanh toán được mô tả trong báo cáo; việc kết nối cổng thanh toán hoặc xác nhận webhook cần được kiểm tra theo môi trường triển khai thực tế.

## 2. Nhà bán hàng và vận hành
- Quản lý gian hàng và sản phẩm.
- Xử lý đơn hàng theo từng shop.
- Trao đổi giữa khách hàng và shop.
- Quản lý yêu cầu đổi trả.
- Cấu hình vận chuyển, thanh toán và nội dung dùng chung.

## 3. SportDNA và thể thao
- Đánh giá kỹ năng thể thao và lưu lượt thực hiện bài đánh giá.
- Lưu kết quả SportDNA và hồ sơ đánh giá.
- Chia sẻ kết quả.
- Nội dung đánh giá và mô phỏng cho các môn thể thao, trong đó có cầu lông và bóng đá.
- Các nội dung về công thức, trọng số và mức độ phù hợp thiết bị cần được hiểu theo đặc tả đã xác nhận; không suy diễn thành cam kết chuyên môn.

Tài liệu chi tiết: [SportDNA brief](./sportdna-brief.md) và [SportDNA AI prompts](./sportdna-ai-prompts.md).

## 4. Cộng đồng
- Hồ sơ cộng đồng.
- Bài viết, bình luận và tương tác.
- Theo dõi/kết nối người dùng.
- Tin nhắn, câu chuyện và thông báo hoạt động.

## 5. Sự kiện và giải đấu
- Sự kiện và đăng ký tham gia.
- Giải đấu, lượt đăng ký, trận đấu và kết quả.
- Lịch sử đánh giá/rating trận đấu.

## 6. Thiết kế áo và xác thực
- Custom Design Lab và yêu cầu đặt may áo.
- Quản lý thiết kế áo và quy trình xử lý yêu cầu.
- Tra cứu mã xác thực sản phẩm.

## 7. Quản trị nội dung và dữ liệu
Các collection và global được khai báo trong `src/payload.config.ts`, bao gồm người dùng, sản phẩm, đơn hàng, cộng đồng, SportDNA, giải đấu, thông báo, cài đặt vận chuyển và thanh toán.

> **Lưu ý:** Danh mục trên phản ánh các phân hệ có trong tài liệu và cấu hình mã nguồn. Không phải mọi tính năng đều mặc định đã tích hợp dịch vụ bên ngoài hoặc vận hành production. Cần kiểm tra giao diện, dữ liệu và cấu hình triển khai trước khi khẳng định trạng thái hoàn thiện.
