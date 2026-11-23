# Nội dung thay thế cho Chương 3 và Chương 4 — Báo cáo BOAI

> Bản này được biên soạn để thay thế phần Chương 3 và Chương 4 trong báo cáo học phần. Nội dung prompt chi tiết không chép lặp lại ở đây vì đã được lưu trong GitHub. Những thông tin về phân công, điểm số và nguồn dữ liệu sản phẩm chỉ được điền khi có minh chứng thực tế.

## CHƯƠNG 3: QUÁ TRÌNH ỨNG DỤNG AI TRONG DỰ ÁN BOAI

### 3.1. Phương pháp ứng dụng AI

#### 3.1.1. Ứng dụng AI trong phân tích yêu cầu và thiết kế chức năng

Trong quá trình xây dựng BOAI, nhóm sử dụng công cụ AI để hỗ trợ phân tích yêu cầu, hệ thống hóa các nhóm chức năng và đề xuất luồng thao tác cho từng vai trò người dùng. Các yêu cầu được chia theo những phân hệ chính như mua sắm, quản lý gian hàng, đơn hàng, cộng đồng, SportDNA, sự kiện, Custom Design Lab và quản trị hệ thống.

AI được sử dụng như công cụ hỗ trợ đề xuất và diễn đạt yêu cầu. Nhóm đối chiếu kết quả với phạm vi đồ án, cấu trúc dữ liệu và trải nghiệm dự kiến trên website, sau đó lựa chọn, chỉnh sửa hoặc loại bỏ những nội dung chưa phù hợp. Quyết định cuối cùng về phạm vi chức năng và cách triển khai thuộc về nhóm.

#### 3.1.2. Ứng dụng AI trong khởi tạo giao diện và phát triển mã nguồn

Nhóm sử dụng Figma Make để hỗ trợ chuyển mô tả chức năng thành giao diện và mã nguồn ứng dụng. Mã nguồn dự án được tổ chức trên nền tảng Next.js, React và TypeScript, sử dụng Tailwind CSS cho giao diện và Payload CMS để quản lý dữ liệu, collection, global và quyền truy cập.

Quá trình phát triển được thực hiện theo nhiều vòng. Nhóm cung cấp mô tả chức năng, xem xét kết quả AI tạo ra, kiểm tra giao diện và các luồng thao tác chính, sau đó yêu cầu điều chỉnh khi phát hiện nội dung chưa đúng hoặc chưa thống nhất. Mã nguồn được lưu trong repository GitHub của dự án để thuận tiện theo dõi, rà soát và tiếp tục chỉnh sửa.

Kết quả do AI tạo ra không được xem là sản phẩm hoàn thiện ngay sau lần sinh đầu tiên. Nhóm cần kiểm tra lại tính nhất quán giữa giao diện, dữ liệu và hành vi chức năng; những luồng phụ thuộc dịch vụ bên ngoài hoặc dữ liệu mẫu phải được mô tả đúng trạng thái, không khẳng định là đã tích hợp thực tế nếu chưa có cấu hình tương ứng.

#### 3.1.3. Rà soát, hiệu chỉnh và kiểm tra kết quả

Sau mỗi đợt chỉnh sửa, nhóm rà soát các nội dung quan trọng như điều hướng giữa các trang, biểu mẫu, trạng thái đơn hàng, hiển thị dữ liệu, phân quyền theo vai trò và tính nhất quán của giao diện. Với các chức năng có nhiều quy tắc nghiệp vụ, nhóm cần đối chiếu kết quả triển khai với yêu cầu đã thống nhất thay vì chỉ đánh giá dựa trên hình thức giao diện.

Các nội dung chưa được xác minh trên môi trường triển khai được ghi nhận là cần kiểm tra thêm. Đặc biệt, những chức năng liên quan đến thanh toán, xác nhận giao dịch, gửi email, vận chuyển hoặc dữ liệu giải đấu không được mô tả như tích hợp production nếu mới chỉ có dữ liệu mô phỏng hoặc xử lý thủ công.

### 3.2. Lưu trữ và phân loại prompt

Để tránh làm báo cáo trùng lặp với tài liệu phát triển, nhóm lưu trữ prompt chi tiết trong repository GitHub. Kho prompt được chia thành các nhóm theo chức năng, có mục lục riêng để tra cứu và một bản lưu trữ tổng hợp để đối chiếu.

- **Mục lục prompt:** [docs/prompts/README.md](./prompts/README.md).
- **Kho prompt tổng hợp:** [docs/PROMPTS-ARCHIVE.md](./PROMPTS-ARCHIVE.md).
- **Mã nguồn dự án:** [Repository BOAI trên GitHub](https://github.com/Gafona/E-commerce-Website-Project---Group-404---Semester-1-Year-1---26-27---VNUHCM-University-of-Science).

Kho prompt gồm các nhóm khởi tạo và quy tắc chung, giao diện, tài khoản, tìm kiếm và lọc sản phẩm, dữ liệu sản phẩm, SportDNA, cộng đồng, sự kiện, kênh người bán, thanh toán và đơn hàng, Custom Áo, quản trị, thông báo và các nội dung không thuộc một chức năng riêng. Phần phụ lục SportDNA được tách riêng để thuận tiện theo dõi các yêu cầu chuyên môn và bàn giao.

Việc lưu prompt trên GitHub giúp nhóm quản lý lịch sử yêu cầu, tra cứu theo chức năng và đối chiếu với mã nguồn. Báo cáo này chỉ trình bày phương pháp sử dụng AI và quy trình kiểm tra; không sao chép toàn bộ prompt vào nội dung chính. Khi cần minh họa, nhóm có thể chọn một số prompt tiêu biểu từ kho lưu trữ, kèm kết quả trước và sau khi hiệu chỉnh. Chỉ sử dụng prompt thực tế đã lưu, không tạo nội dung mới rồi trình bày như lịch sử hội thoại.

## CHƯƠNG 4: PHÂN CÔNG CÔNG VIỆC VÀ TÀI LIỆU THAM KHẢO

### 4.1. Bảng phân công nhiệm vụ và đánh giá

#### 4.1.1. Tiêu chí đánh giá mức độ hoàn thành công việc

Để việc đánh giá thống nhất, nhóm có thể sử dụng bộ tiêu chí tham khảo sau. Các tỷ trọng dưới đây là đề xuất biên tập, cần được nhóm xác nhận hoặc điều chỉnh trước khi đưa vào bản báo cáo nộp. Điểm số cuối cùng do các thành viên thống nhất dựa trên khối lượng công việc, chất lượng sản phẩm và minh chứng thực tế.

| Tiêu chí | Tỷ trọng | Căn cứ đánh giá |
|---|---:|---|
| Khối lượng và phạm vi công việc | 30 điểm | Số lượng đầu việc được giao và mức độ hoàn thành |
| Chất lượng sản phẩm/đầu ra | 30 điểm | Mức độ đáp ứng yêu cầu, tính hoàn chỉnh và khả năng sử dụng |
| Tính chủ động và phối hợp | 20 điểm | Chủ động trao đổi, hỗ trợ thành viên và xử lý vấn đề |
| Tiến độ và trách nhiệm | 20 điểm | Hoàn thành đúng hạn, cập nhật tiến độ và bàn giao rõ ràng |
| **Tổng** | **100 điểm** | |

#### 4.1.2. Danh sách thành viên

| STT | MSSV | Họ và tên |
|---:|---|---|
| 1 | 26127417 | Mai Quốc Thắng |
| 2 | 26127064 | Nguyễn Hải Đăng |
| 3 | 26127270 | Nguyễn Văn Kim Long |
| 4 | 26127141 | Hoàng Anh Hùng |

#### 4.1.3. Bảng phân công chi tiết (hoàn thiện trong bản báo cáo nộp)

Bảng phân công chi tiết cần được hoàn thiện trong bản báo cáo chính thức dựa trên phân công đã thống nhất và minh chứng thực tế. **Điểm đánh giá cá nhân không được lưu trong repository GitHub công khai**; nhóm điền điểm trong bản báo cáo nội bộ/nộp giảng viên theo yêu cầu học phần.

Danh sách bốn thành viên ở mục 4.1.2 đã được cập nhật theo thông tin nhóm cung cấp. Không tự gán nhiệm vụ hoặc điểm số khi chưa có xác nhận của nhóm.

### 4.2. Tài liệu tham khảo

#### 4.2.1. Công cụ và nền tảng phát triển

1. Figma, *Figma — Collaborative Design Tool*, https://www.figma.com/.
2. Figma, *Figma Make*, https://www.figma.com/make/.
3. Vercel, *Next.js Documentation*, https://nextjs.org/docs.
4. Meta, *React Documentation*, https://react.dev/learn.
5. Tailwind Labs, *Tailwind CSS Documentation*, https://tailwindcss.com/docs.
6. Payload, *Payload CMS Documentation*, https://payloadcms.com/docs.
7. Lucide, *Lucide Icons*, https://lucide.dev/.

#### 4.2.2. Tài liệu và sản phẩm của nhóm

8. Nhóm 404, *BOAI — Nền tảng thương mại điện tử đa gian hàng cho sản phẩm thể thao*, repository mã nguồn và tài liệu dự án, GitHub, https://github.com/Gafona/E-commerce-Website-Project---Group-404---Semester-1-Year-1---26-27---VNUHCM-University-of-Science.
9. Nhóm 404, *BOAI — Website demo*, https://boai.figma.site/.
10. Nhóm 404, *Figma Make Workspace — BOAI*, https://www.figma.com/make/gV5zMiRHh1fnZgsJavLAoY/.

#### 4.2.3. Nguồn dữ liệu sản phẩm tham khảo

Nhóm bổ sung tên nhà sản xuất, website hoặc trang sản phẩm cụ thể đã thực sự sử dụng để xây dựng dữ liệu mẫu. Chỉ liệt kê nguồn đã tham khảo; không ghi tên website hoặc thương hiệu nếu chưa có căn cứ đối chiếu.

---

## Danh sách việc cần hoàn tất trước khi nộp

- Cập nhật mục lục tự động trong tệp báo cáo sau khi thay Chương 3 và Chương 4.
- Thống nhất nhiệm vụ, minh chứng, mức độ hoàn thành và điểm số của bốn thành viên.
- Bổ sung nguồn dữ liệu sản phẩm thực tế đã tham khảo.
- Chọn một vài prompt tiêu biểu từ kho GitHub nếu giảng viên yêu cầu minh chứng trực tiếp; không chép lại toàn bộ kho prompt.
- Kiểm tra lại các khẳng định về thanh toán, vận chuyển, gửi email và các chức năng mô phỏng theo môi trường triển khai.
