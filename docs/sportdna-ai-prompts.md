# SportDNA — prompt nhờ AI ngoài

> **Lưu ý:** Đây là bộ prompt chuyên biệt phục vụ việc rà soát/hiệu chuẩn SportDNA ở một giai đoạn phát triển. Kho prompt BOAI đầy đủ và được phân loại theo chức năng nằm tại [mục lục prompt](./prompts/README.md); các yêu cầu bàn giao SportDNA mới hơn được tập hợp tại [Phụ lục A — SportDNA handoff](./prompts/phu-luc-a-sportdna-handoff.md). Trước khi áp dụng các prompt bên dưới, cần đối chiếu lại tên file, kiểu dữ liệu và cấu trúc mã nguồn hiện tại.


Ba phần nặng nhất về chuyên môn đã có bản v1 chạy được trong code. Dùng các prompt dưới đây để nhờ AI ngoài
soát lại và hiệu chuẩn, rồi dán kết quả trả về cho Figma Make để thay hệ số. Mỗi prompt ghi rõ cần đính kèm file nào.

---

## Prompt 1 — Soát và nâng cấp bộ câu hỏi

Đính kèm: `src/lib/sportdna-bank.ts`, `src/lib/sportdna-practice.ts`, `src/lib/sportdna-assessment.ts`, `src/lib/scenario-engine.ts`.

```text
Bạn là huấn luyện viên cầu lông (đơn + đôi) và bóng đá có bằng cấp, đồng thời là người thiết kế bài đánh giá (psychometrics).
Tôi đính kèm ngân hàng câu hỏi SportDNA (TypeScript). Gồm:
- Cầu lông đơn: QUIZ (8 câu thể chất), TEMPLATES B01–B10 (chưa có đáp án/chấm điểm), 8 họ phòng thủ DF1–DF8 (đã chấm, KHÔNG được đổi ma trận T).
- SCENARIOS: cầu lông đôi DB01–DB06, DB04b, DB22–DB31; bóng đá FB01–FB16 (+FB02b, FB04b). Mỗi câu có actors (tọa độ 0–1),
  actions (fit 0–1, fit=0 là hard-fail), targets (score 0–1), trap, explain.
  Quy ước tọa độ: cầu lông y=0 baseline đối thủ, y=0.5 lưới, y=1 baseline của mình; bóng đá y=0 khung thành đối thủ, y=1 khung thành mình.
- PHYSICAL_QUIZ: A2 (đôi, 6 câu), A3 (bóng đá, 6 câu). POSITION_QUESTIONS (5 câu gợi ý vị trí).
- PRACTICE_QUESTIONS: BS11–BS25 (đơn), DB07–DB21 (đôi) — options[0] là đáp án đúng, trap.option là bẫy.

Việc cần làm:
1. Soát đúng/sai chiến thuật từng câu. Đánh dấu câu có đáp án gây tranh cãi (ví dụ DB23: "người vừa smash lên lưới" không phải quy tắc chung)
   và đề xuất sửa đề hoặc đáp án.
2. Kiểm tra tọa độ actors/targets có khớp đề bài không (đúng nửa sân, đúng phía trái/phải), sửa nếu sai.
3. Hiệu chuẩn fit/score: mỗi câu đúng 1 action fit=1 và tối đa 1 target score=1; hard-fail (fit=0) chỉ dùng cho lỗi luật/không thể thực hiện.
4. Gán đáp án và hệ số cho B01–B10 theo cùng format DF (canonical, trap + reason), hoặc nói rõ câu nào nên bỏ.
5. Chỉ ra các trục kỹ năng còn thiếu câu hỏi (dựa trên skill của từng câu) và viết thêm tối đa 10 câu mới cho chỗ thiếu,
   mỗi câu là một tình huống chiến thuật khác hẳn, không chỉ đổi chữ.
6. Không đổi ID cũ. ID mới không trùng ID nào đang có.

Định dạng trả về: một khối TypeScript thay thế trực tiếp được cho từng mảng đã sửa (giữ đúng kiểu S({...}) và Raw tuple),
cùng bảng thay đổi: ID | sửa gì | lý do.
```

---

## Prompt 2 — Hiệu chuẩn mạng nhện người chơi

Đính kèm: `src/lib/sportdna-radar.ts`, `src/lib/sportdna-runs.ts`, `src/lib/sportdna-bank.ts`, `src/lib/sportdna-practice.ts`.

```text
Tôi có hệ thống "mạng nhện" (radar) 8 trục, giá trị 0–100, cho mỗi môn:
- Cầu lông: Sức mạnh, Tốc độ, Bền bỉ, Cân bằng, Phản xạ, Tấn công, Phòng thủ, Chiến thuật.
- Bóng đá: Sức mạnh, Tốc độ, Bền bỉ, Tranh chấp, Phản xạ, Phòng ngự, Chuyền bóng, Dứt điểm.
Mạng nhện tổng hợp TẤT CẢ bài test (Quick, Deep/Retest, tình huống, luyện tập). ELO là trục riêng, chỉ tính từ Deep/Retest đơn và lượt Tình huống.

Nguồn dữ liệu và cách quy đổi hiện tại (xem file đính kèm):
- Câu thể chất mức 0–3 → (mức+1)×25, trọng số 1. Bài đơn: ELO quiz quy về 0–100 quanh 1000 với hệ số K.
- Tình huống: điểm câu s (0–1) × 100, chia vào trục theo bảng SKILL_AXIS.
- Luyện tập: đúng=100, bẫy=0, sai khác=40, trọng số 0.5, nhóm G1–G3/H1–H3 → trục theo PRACTICE_AXIS.
- ELO bài đơn: (ELO−500)/10. Lấy tối đa 24 mẫu mới nhất mỗi trục, trung bình có trọng số. Trục cần tổng trọng số ≥ 1 mới hiện.

Việc cần làm:
1. Đánh giá bảng ánh xạ kỹ năng → trục (SKILL_AXIS, PHYSICAL_AXIS, PRACTICE_AXIS) và đề xuất bảng mới có lý do.
2. Đề xuất trọng số từng nguồn (tự đánh giá thể chất kém tin cậy hơn tình huống đã chấm) và cách giảm trọng số theo thời gian (decay theo ngày).
3. Đề xuất cách quy đổi ELO → 0–100 hợp lý với bảng 10 bậc (RATING_TIERS).
4. Cho 5 hồ sơ mẫu (người mới, thiên tấn công, thiên phòng thủ, toàn diện, chỉ làm Quick) kèm mạng nhện kỳ vọng.

Trả về: các hằng số TypeScript thay thế được (SKILL_AXIS, PHYSICAL_AXIS, PRACTICE_AXIS, trọng số, hàm quy đổi) và 5 ca kiểm thử dạng
{ input: TestRun[], expected: Record<trục, số> }.
```

---

## Prompt 3 — Hiệu chuẩn mạng nhện vợt và độ tương thích

Đính kèm: `src/lib/racket-radar.ts`.

```text
Bạn là chuyên gia thiết bị cầu lông (đã test nhiều dòng Yonex, Lining, Victor, Mizuno).
Người bán nhập thông số vợt bằng danh sách cố định:
- Chất liệu: High Carbon, HM Graphite, Graphite, Carbon Nano, Carbon Composite, Nhôm / Thép
- Độ cứng: Dẻo, Trung bình, Cứng, Siêu cứng
- Độ cân bằng: Nhẹ đầu, Hơi nhẹ đầu, Cân bằng, Hơi nặng đầu, Nặng đầu
- Chiều dài vợt: 665/670/675/680mm
- Trọng lượng: 2U–6U
- Chu vi cán: G4–G7
- Sức căng tối đa: 24–35 LBS
Từ đó tính mạng nhện vợt 6 trục 0–100: Lực đập, Tốc độ vung, Kiểm soát, Phản tạt, Ổn định, Dễ chơi (công thức tuyến tính trong file).
Độ tương thích = 100 − khoảng cách có trọng số giữa "vợt người chơi cần" (suy ra từ mạng nhện người chơi: phong cách tấn công/phòng thủ
+ năng lực) và mạng nhện vợt; vợt "dư" một trục bị phạt nhẹ hơn vợt "thiếu", riêng Lực đập dư bị phạt đủ.

Việc cần làm:
1. Soát hệ số công thức từng trục vợt. Đề xuất hệ số mới, có lý do vật lý (swingweight, độ uốn thân, điểm cân bằng...).
2. Kiểm định bằng 8 cây vợt thật phổ biến ở Việt Nam (ghi thông số theo danh sách trên) và mạng nhện kỳ vọng.
   Bắt buộc có: Lining (High Carbon, Trung bình, Hơi nặng đầu, 675mm, 4U, G6, 31 LBS), Yonex Astrox 99, Yonex Nanoflare 700,
   Victor Thruster K, một vợt nhôm giá rẻ.
3. Soát công thức "nhu cầu" từ mạng nhện người chơi và trọng số khoảng cách. Cho 4 người chơi mẫu (mới chơi, tấn công, phòng thủ,
   toàn diện) và top 3 vợt phù hợp kỳ vọng trong 8 cây trên.

Trả về: hàm racketRadar và racketFit đã hiệu chuẩn (TypeScript, giữ nguyên chữ ký hàm) và bảng kiểm thử
vợt × người chơi → điểm kỳ vọng.
```
