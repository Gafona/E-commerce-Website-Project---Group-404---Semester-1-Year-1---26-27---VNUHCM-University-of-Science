# SportDNA — Tài liệu tổng quan để thiết kế bộ câu hỏi

Tài liệu này mô tả SportDNA đúng như code hiện tại trong repo (BOAI, Next.js + Payload CMS).
Mục đích: gửi cho AI/người bên ngoài để thiết kế **bộ câu hỏi và tình huống** đủ phủ mọi chức năng của SportDNA.
Mọi con số có ghi **GIẢ ĐỊNH** là giá trị tạm, chưa có spec chốt; được phép đề xuất lại.

---

## 1. SportDNA là gì

SportDNA là tính năng "chẩn đoán thể thao" trong sàn thương mại điện tử đồ thể thao BOAI (tiếng Việt). Người chơi trả lời câu hỏi và xử lý tình huống trên sân. Hệ thống trả về:

1. **Điểm kỹ năng (Elo)** tổng và theo từng kỹ năng, xếp vào **10 bậc trình độ**.
2. **Biểu đồ radar 8 trục** (Sức mạnh, Tốc độ, Phản xạ, Kỹ thuật, Kiểm soát/Chuyền bóng, Bền bỉ/Phòng ngự, Chiến thuật, Cân bằng).
3. **Growth tags**: thói quen luyện tập (không cộng vào Elo).
4. **Độ phù hợp thiết bị**: chấm % phù hợp của vợt, giày… trong cửa hàng dựa trên hồ sơ kỹ năng.
5. Liên kết với **thành tích giải đấu**, **Match Rating** (điểm từ trận đấu thật) và **uy tín cộng đồng**.

Môn thể thao:
- **Cầu lông đơn**: môn chính, có đủ quiz và tình huống trên sân.
- **Bóng đá**: có bộ quiz trong hệ thống chính; ở bản v1.3.3 bóng đá đang tạm ẩn ("Bóng đá đang được phát triển").
- **Cầu lông đôi**: chưa có trong SportDNA (chỉ có ở phần giải đấu).

## 2. Hai phiên bản đang cùng tồn tại

| | Hệ thống chính `/sportdna` | Bản v1.3.3 `/sportdna/v133` |
|---|---|---|
| Bản chất | Chạy thật: lưu kết quả vào DB, dùng cho cửa hàng | Mockup bấm được (clickable prototype); logic chấm điểm phần lớn đang HOLD |
| Môn | Cầu lông + bóng đá | Cầu lông đơn |
| Chế độ | Quick (6 câu), Deep (11–12 câu), tình huống sân 5 lượt | Quick (8 quiz + 2 tình huống), Deep (36 tình huống), Retest (10 tình huống) |
| Nguồn câu hỏi | `src/lib/sportdna.ts` (`QUESTIONS`) | `src/app/(frontend)/sportdna/v133/_components/data.ts` (`QUIZ`, `TEMPLATES`, `DEFENSE_TEMPLATES`) |
| Engine tình huống | `src/lib/scenario-engine.ts` (chấm S = A × T × R thật) | Dùng chung 8 họ phòng thủ từ engine; tình huống B01–B10 chỉ có phản hồi định tính |

Kết quả của hệ thống chính đang được dùng ở: huy hiệu % phù hợp trên thẻ sản phẩm, trang chi tiết sản phẩm, trang tài khoản.

---

## 3. Loại câu hỏi 1 — Câu chẩn đoán kỹ năng (quiz quan sát được)

### 3.1 Cấu trúc một câu

```ts
type DiagnosticQuestion = {
  id: string          // "BD-Q01" (cầu lông quick), "BD-D03" (cầu lông deep), "FB-Q02", "FB-D10"...
  skill: string       // khóa kỹ năng, xem 3.3
  difficulty: number  // độ khó D của câu, thang Elo (hiện dùng 900–1400)
  title: string       // tiêu đề ngắn
  prompt: string      // mô tả tình huống cụ thể
  options: [string, string, string, string] // mức 0 → 3, từ yếu đến giỏi
}
```

Quy tắc viết đáp án (đang áp dụng):
- 4 lựa chọn **xếp theo thứ tự năng lực tăng dần** (A = 0 điểm, D = 1 điểm; B = 0,33, C = 0,67).
- Mỗi lựa chọn mô tả **kết quả quan sát được** (cầu rơi ở đâu, bóng bật xa bao nhiêu mét, giữ được mấy nhịp…), không phải cảm nhận chung chung ("tôi chơi khá").
- Sau mỗi câu có một câu phụ **Độ ổn định** dùng chung 4 mức: "0–2 / 3–5 / 6–8 / 9–10 lần trên 10 lần làm được như vậy". Độ ổn định chiếm 30% điểm câu.

### 3.2 Cách chấm

Với mỗi câu (theo thứ tự): `score = level × 0,7 + stability × 0,3`, rồi cập nhật Elo của kỹ năng đó:

```
expected = 1 / (1 + 10^((D − rating) / 400))
rating  += K × (score − expected)      // rating khởi điểm 1000; K = 16 (Quick), 24 (Deep)
```

Điểm tổng = trung bình các kỹ năng. Quick được đánh dấu "tạm tính" (provisional).

### 3.3 Kỹ năng hiện có

**Cầu lông** (`skill`): `backhand`, `forehand_clear`, `smash`, `drop_shot`, `net_play`, `drive`, `defense`, `serve_receive`, `footwork`, `match_intelligence`, `endurance`.

**Bóng đá**: `first_touch`, `scanning`, `short_passing`, `long_pass`, `dribbling`, `weak_foot`, `shooting`, `agility`, `defensive_positioning`, `off_ball`, `decision_making`.

### 3.4 Kỹ năng → trục radar (8 trục)

| Trục | Cầu lông | Bóng đá |
|---|---|---|
| Sức mạnh | smash | shooting |
| Tốc độ | footwork | agility |
| Phản xạ | defense (Deep: 70% defense + 30% drive) | first_touch (Deep: + decision_making × 0,5) |
| Kỹ thuật | TB backhand, forehand_clear, drop_shot, net_play, serve_receive | TB first_touch, dribbling |
| Kiểm soát / Chuyền bóng | TB net_play, drop_shot, serve_receive | short_passing (Deep: + long_pass) |
| Bền bỉ / Phòng ngự | endurance (chỉ Deep) | defensive_positioning (chỉ Deep) |
| Chiến thuật | match_intelligence (chỉ Deep) | TB off_ball, decision_making (chỉ Deep) |
| Cân bằng | độ đồng đều giữa các kỹ năng (100 − độ lệch chuẩn / 3) | như cầu lông |

Trục không có câu nào đo được hiển thị "chưa đủ dữ liệu", không bao giờ bịa số. **Bộ câu hỏi mới phải đảm bảo mỗi trục có ít nhất một câu đo, ở cả Quick lẫn Deep**; hiện Quick còn thiếu Bền bỉ và Chiến thuật.

Hiện có: cầu lông 6 câu Quick, 11 câu Deep; bóng đá 6 câu Quick, 12 câu Deep.

### 3.5 Câu hỏi thể chất kiểu v1.3.3 (Quick)

Bản v1.3.3 có 8 câu tự đánh giá thể chất, 2 câu cho mỗi trục **Sức mạnh, Tốc độ, Bền bỉ, Cân bằng** (`id: q1…q8`, `axis`, `q`, 4 lựa chọn tăng dần). Ví dụ: "Sau một pha cầu dài trên 20 lượt, bạn… [Cần nghỉ lâu / Thở dốc, mất vài điểm / Hồi lại sau khoảng 1 điểm / Gần như không bị ảnh hưởng]".

---

## 4. Loại câu hỏi 2 — Growth profile (thói quen phát triển)

Ba câu, mỗi câu 4 mức 0–3, **không cộng vào Elo**, chỉ sinh nhãn:

| Khóa | Câu hỏi |
|---|---|
| `frequency` | Bạn luyện tập môn này với tần suất như thế nào? (Không cố định / ~1 buổi/tuần / 2–3 buổi / ≥4 buổi) |
| `awareness` | Khi nhận ra mình hay mắc một lỗi kỹ thuật, bạn thường làm gì? |
| `retention` | Khi học một kỹ thuật mới, bạn thường như thế nào? |

Nhãn sinh ra: `low_training_frequency`, `needs_guided_practice`, `consistent_practice`, `high_training_frequency`, `high_learning_awareness`, `growth_oriented`.

---

## 5. Loại câu hỏi 3 — Tình huống trên sân (Scenario)

### 5.1 Quy ước sân và tọa độ

- Sân đơn cầu lông 5,18 m × 13,4 m. Tọa độ chuẩn hóa 0–1: `x` trái → phải, `y` trên → dưới.
- Nửa sân đối thủ `y ∈ [0; 0,5]`, lưới ở `y = 0,5`, người chơi ở nửa dưới.
- Đối thủ có vector di chuyển `movement` = độ dời dự kiến sau ~0,5 giây.

### 5.2 Cấu trúc một tình huống (engine)

```ts
type Scenario = {
  scenarioId: string                 // "BD-B01-DEEP-123", "BD-DF3-M-456"
  variant: "deep" | "forward" | "defense"
  gameMode: "singles"
  rallyPhase: "attacking" | "defending"
  prompt: string                     // mô tả tình huống, KHÔNG được lộ đáp án
  state: {
    player:   { x, y, stamina }      // stamina 0–1
    opponent: { x, y, movement: [dx, dy] }
    shuttle:  { x, y, height: "high"|"mid"|"low", speed: "slow"|"medium"|"fast" }
  }
  availableActions: ("smash"|"drop"|"clear"|"drive")[]
  actionFit: Record<Action, number>  // A: mức hợp lý của từng động tác, 0–1
  difficulty: number                 // D, dùng cho Elo
}
```

Người chơi chọn **1 động tác** rồi chọn **điểm rơi** trên nửa sân đối thủ.

### 5.3 Cách chấm: S = A × T × R

- **A** (chọn động tác) = `actionFit[action]`.
- **T** (chọn điểm rơi) = `space × reach`:
  - `space` = 0,1 + 0,9 × min(khoảng cách tới vị trí đối thủ dự kiến / 3,5 m; 1).
  - `reach` = điểm rơi có nằm trong dải độ sâu hợp lệ của động tác không. Độ sâu: 0 = sát lưới, 1 = cuối sân. Dải hợp lệ: drop 0–0,3; smash 0,3–1; clear 0,75–1; drive 0,4–0,8. Lệch 0,25 thì reach về 0.
- **R** (rủi ro sát vạch) = 1 nếu cách vạch ≥ 0,5 m; 0,93 nếu từ 0,2 đến dưới 0,5 m; 0,8 nếu < 0,2 m.
- Ba rating Elo tách riêng: `tactical` (theo S), `shot_selection` (theo A), `target_selection` (theo T). Bản v1.3.3 có thêm `defensive_reading_rating`.

### 5.4 Ngân hàng tình huống hiện có

**Tấn công (engine, BD-B01):** cầu bổng giữa sân; biến thể `deep` (đối thủ ở cuối sân, 70%) và `forward` (đối thủ áp lưới, 30%).

**Phòng thủ (engine, E6-B), 8 họ, mỗi họ có bản gốc và bản đối xứng trái ↔ phải.** Khi phòng thủ: clear = nâng cầu, drop = chặn ngắn, drive = đánh ngang, smash = phản công.

| Mã | Họ | D | Đáp án đúng | Cú bẫy (A cao nhưng đánh vào chỗ đối thủ chờ) |
|---|---|---|---|---|
| DF1 | Đỡ smash thẳng | 1091 | chặn ngắn | nâng cầu |
| DF2 | Đỡ smash chéo | 1182 | nâng cầu | chặn ngắn |
| DF3 | Đỡ cú nhanh vào người | 1083 | đánh ngang | chặn ngắn |
| DF4 | Đối thủ đang lùi về | 1055 | chặn ngắn | đánh ngang |
| DF5 | Thoát ép sau hai cú liên tiếp | 1166 | nâng cầu | đánh ngang |
| DF6 | Đỡ hai góc liên tiếp | 1215 | phản công | đánh ngang |
| DF7 | Đối thủ giả smash rồi bỏ nhỏ | 1337 | đánh lưới | đánh ngang |
| DF8 | Thể lực thấp, chọn đường an toàn | 1305 | nâng cầu | chặn ngắn |

Ràng buộc chất lượng đang được test tự động:
- Đáp án đúng hơn mọi động tác khác ít nhất 0,15 điểm S.
- Cú bẫy có A ≥ 0,5 nhưng bị T kéo xuống.
- Cầu thấp thì smash có A = 0.
- Cầu luôn trong tầm với (≤ 1,6 m) và trong sân.

**Độ khó D theo 7 tiêu chí (GIẢ ĐỊNH):** mỗi tiêu chí chấm 0–100.

```
D = 900 + Σ wᵢ·sᵢ
```

| Tiêu chí | Trọng số |
|---|---|
| Tốc độ cầu | 1,2 |
| Độ thấp điểm chạm | 1,0 |
| Quãng di chuyển | 0,6 |
| Mức đánh lừa | 0,9 |
| Độ hấp dẫn của bẫy | 0,8 |
| Mệt mỏi | 0,7 |
| Độ hẹp vùng rơi tốt | 0,8 |

**Bản v1.3.3, 10 template B01–B10** (mỗi template có V1/V2):

| Mã | Tình huống |
|---|---|
| B01 | Tấn công cầu bổng giữa sân |
| B02 | Phòng thủ smash vào thân |
| B03 | Xử lý cầu sát lưới |
| B04 | Nhận giao cầu |
| B05 | Chọn phương án giao cầu (giao ngắn / vẩy / cao sâu, bắt buộc giao chéo) |
| B06 | Bị ép cuối sân cần thoát |
| B07 | Drive ngang đổi hướng |
| B08 | Chuyển phòng thủ → tấn công |
| B09 | Phòng thủ biên trái tay → phản công |
| B10 | Kết thúc điểm khi đối thủ mất thăng bằng |

Template v1.3.3 có thêm các trường:
- `phase`, `skill`.
- `groups`, thuộc 7 nhóm: Giao cầu, Tấn công, Phòng thủ, Điều cầu, Di chuyển, Đọc tình huống, Chuyển trạng thái.
- Bộ động tác mở rộng 11 động tác: smash, drop, clear, drive, net_shot, lift, block, push, serve_short, serve_flick, serve_long.
- Điểm rơi chọn trong **9 ô**: lưới / giữa / cuối × trái / giữa / phải.

---

## 6. Bậc trình độ (dùng chung cho quiz và Match Rating)

| Bậc | Tên | Elo |
|---|---|---|
| 1 | Mới tập chơi | < 800 |
| 2 | Phong trào yếu | 800–999 |
| 3 | Trung bình | 1000–1199 |
| 4 | Trung bình khá | 1200–1399 |
| 5 | Khá | 1400–1599 |
| 6 | Khá + | 1600–1799 |
| 7 | Bán chuyên | 1800–1999 |
| 8 | Chuyên nghiệp | 2000–2199 |
| 9 | Bán chuyên Quốc gia | 2200–2399 |
| 10 | Huyền thoại | ≥ 2400 |

Ranh giới là GIẢ ĐỊNH (quần thể trung bình 1000, độ lệch chuẩn 250). Lưu ý: câu hỏi có D 900–1400 nên quiz thực tế chỉ phân biệt tốt bậc 2–5. **Muốn phân biệt bậc cao hơn cần câu/tình huống có D cao hơn (1500–2400).**

---

## 7. Các chức năng khác dùng kết quả câu hỏi

### 7.1 Độ phù hợp thiết bị

**Đầu vào:**
- Từ hồ sơ kỹ năng: trục **Sức mạnh** và **Phản xạ**.
- Từ câu hỏi nhu cầu thiết bị:
  - Lối chơi cầu lông: tấn công / phòng thủ / toàn diện.
  - Mặt sân bóng đá: AG / FG / IC.
  - Dáng bàn chân: thon / chuẩn / bè.
  - Mức căng dây mong muốn (lbs).
  - Ngân sách.

**Thông số sản phẩm được so khớp:**
- Loại sản phẩm.
- Mặt sân.
- Điểm cân bằng vợt: nặng đầu / cân bằng / nhẹ đầu.
- Độ cứng thân: dẻo → rất cứng.
- Trọng lượng: 3U–6U.
- Mức căng tối đa.
- Form giày.

**Cách chấm:**
- Điểm = 40% kỹ thuật + 30% lối chơi + 20% cơ thể + 10% ngân sách.
- Nhãn: Rất phù hợp ≥ 85, Phù hợp ≥ 70, Cân nhắc ≥ 50, còn lại là Không phù hợp.
- **Loại thẳng (hard fail)** khi đinh giày sai mặt sân, hoặc mức căng mong muốn vượt giới hạn của khung vợt.

**Ví dụ quy tắc:** vợt cứng mà Sức mạnh < 45 thì bị trừ điểm; vợt nặng đầu mà Phản xạ < 45 thì bị trừ điểm.

**Bản v1.3.3:**
- 4 tiêu chí vợt: trọng lượng, độ cứng, cân bằng (3 tiêu chí này là bắt buộc), mức căng.
- Mỗi thông số có ghi nguồn: hãng xác nhận / người bán / suy luận / không rõ.
- Độ tin cậy giảm khi thiếu dữ liệu.

→ **Bộ câu hỏi cần có phần "nhu cầu thiết bị"**, và các câu đo Sức mạnh, Phản xạ phải đủ tin cậy để chấm thiết bị.

### 7.2 Thành tích giải đấu

**Người dùng khai báo:**
- Giải đấu.
- Hạng đạt được, số người tham gia, tỷ lệ tham gia.
- Ngày thi đấu.
- Cấp giải: CLB / trường-địa phương / tỉnh / quốc gia / quốc tế / châu lục-thế giới.
- Link minh chứng.

Admin duyệt rồi mới tính điểm. Điểm phụ thuộc hạng, quy mô giải, cấp giải, độ mới (giảm một nửa sau 2 năm) và số lần trùng.

### 7.3 Match Rating (MR)

- MR là điểm Elo tính từ **trận đấu thật** (giao hữu K = 10, cộng đồng K = 24, chính thức K = 32), không lấy từ câu hỏi.
- 10 trận đầu là lâm thời: K × 2, tổng mức tăng tối đa +400.
- Mỗi giải giới hạn tổng thay đổi ±80.
- Chống farm: gặp lại cùng đối thủ ≥ 2 lần trong 30 ngày thì ΔR = 0.
- Điểm hiển thị trộn điểm quiz (AR) với MR theo số trận đã đấu.
- → Câu hỏi chỉ là điểm khởi đầu; **thang D của câu hỏi phải cùng thang với MR**.

### 7.4 Uy tín cộng đồng (CP, bản v1.3.3)

- Điểm uy tín đến từ bài chia sẻ, bình luận hữu ích, lượt thích, có quy trình duyệt.
- 5 bậc: Thành viên mới / tích cực / uy tín / Người đóng góp / Trụ cột.
- **Không** phụ thuộc vào câu hỏi.

---

## 8. Yêu cầu đối với bộ câu hỏi mới (checklist để AI bên ngoài làm theo)

**Phạm vi môn:** cầu lông đơn bắt buộc. Bóng đá và cầu lông đôi: làm nếu được yêu cầu, giữ cùng cấu trúc.

**1. Câu chẩn đoán kỹ năng (cấu trúc mục 3.1)**
- Phủ **mọi khóa kỹ năng** ở mục 3.3 (được đề xuất thêm kỹ năng mới, kèm trục radar mà nó đóng góp).
- Mỗi trục radar có ≥ 1 câu ở Quick và ≥ 2 câu ở Deep.
- Độ khó trải đều 800–2400 để phân biệt cả 10 bậc. Mỗi bậc cần vài câu có D gần ranh giới bậc đó.
- 4 đáp án tăng dần, mô tả kết quả **đo/quan sát được**, không trùng ý nhau, không có đáp án "tốt" lộ liễu.
- Đề xuất số câu: Quick 8–10 câu, Deep 20–30 câu.

**2. Câu thể chất** cho Sức mạnh, Tốc độ, Bền bỉ, Cân bằng: ≥ 2 câu mỗi trục.

**3. Growth profile:** giữ 3 khóa `frequency`, `awareness`, `retention`; được viết lại câu chữ.

**4. Câu nhu cầu thiết bị:**
- Hỏi lối chơi, dáng bàn chân, mức căng dây, ngân sách (với cầu lông).
- Với bóng đá thì thêm mặt sân.
- Đáp án phải khớp đúng các giá trị ở mục 7.1.

**5. Tình huống trên sân (cấu trúc mục 5.2)**
- Phủ đủ 7 nhóm: Giao cầu, Tấn công, Phòng thủ, Điều cầu, Di chuyển, Đọc tình huống, Chuyển trạng thái.
- Mỗi tình huống cho: tọa độ người chơi, đối thủ (kèm movement), cầu (height, speed), stamina.
- Cho `actionFit` của từng động tác, đáp án đúng, **một cú bẫy kèm lý do**, và 7 điểm tiêu chí độ khó.
- Phải thỏa ràng buộc ở mục 5.4: đáp án đúng hơn các động tác khác ≥ 0,15 S, cú bẫy A ≥ 0,5, cầu thấp thì không smash, cầu trong tầm với.
- Mỗi tình huống nên có bản đối xứng trái ↔ phải.
- `prompt` chỉ mô tả dấu hiệu (đối thủ đang lùi, cầu cắm thấp…), không gợi ý đáp án.

**6. Ngôn ngữ:** tiếng Việt tự nhiên, dùng thuật ngữ quen thuộc (phông cầu, bỏ nhỏ, đập cầu, chặn cầu, lốp cầu, đánh ngang, đánh lưới, giao ngắn/vẩy/cao sâu). Kèm tên tiếng Anh trong ngoặc nếu cần.

**7. Định dạng trả về:** JSON hoặc TypeScript theo đúng các kiểu ở mục 3.1, 3.5, 4 và 5.2.
- Quy ước ID: `BD-Q..` / `BD-D..` cho quiz cầu lông; `BD-B..` / `BD-DF..` cho tình huống; `FB-..` cho bóng đá.
- Mỗi mục ghi rõ kỹ năng/trục đo được và lý do chọn D.

## 9. Câu hỏi còn mở (GIẢ ĐỊNH, có thể đề xuất lại)

- Tên, trọng số 7 tiêu chí độ khó và công thức D của tình huống.
- Ranh giới 10 bậc và tham số quần thể (trung bình 1000, độ lệch chuẩn 250).
- Tỷ lệ 70/30 giữa kết quả và độ ổn định trong quiz.
- Số câu mỗi chế độ, và cách chọn câu cho Retest (ưu tiên kỹ năng yếu hoặc lâu chưa đánh giá).
- Cách gộp điểm tình huống (tactical / shot / target / defensive reading) vào radar và điểm tổng; hiện hai luồng quiz và tình huống còn tách nhau.
