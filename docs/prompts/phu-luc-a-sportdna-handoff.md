# <a id="_8xlsney7juux"></a>Phụ lục A\. Nguyên văn các bản đặc tả và handoff SportDNA

*Các prompt dài do bạn gửi cho AI khác/Figma AI, nhóm 6\. Giữ nguyên toàn bộ nội dung\.*

## <a id="_hd8njpnvw4i1"></a>T17\#1 \(57,819 ký tự\)

MASTER SPECIFICATION — HỆ THỐNG CHẨN ĐOÁN TRÌNH ĐỘ & THÀNH TÍCH THỂ THAO

Phiên bản hợp nhất cuối cùng \(v5\.0\) — Bàn giao cho AI xây dựng web Nguồn: Hợp nhất Trạm 1 → 2 → 3 → 4, đã áp dụng toàn bộ điều chỉnh từ Trạm 4

0\. TÓM TẮT ĐIỀU HÀNH

Đây là đặc tả kỹ thuật duy nhất và đầy đủ để AI xây dựng web triển khai module "Chẩn đoán Trình độ & Thành tích" cho website thương mại điện tử thể thao \(bóng đá \+ cầu lông\)\. Tài liệu này thay thế toàn bộ các bản đặc tả trước đó\. Mọi tham chiếu đến "Trạm 1/2/3/4" trong các file cũ đều được hợp nhất tại đây\.

Hệ thống gồm 3 nguồn dữ liệu ĐỘC LẬP

\# Nguồn Cách thu thập Đầu ra Không bao giờ

1 Skill Assessment Bài trắc nghiệm tình huống \(Quick/Deep\) Skill Elo → Skill Tier → Skill Radar \(8 trục\) Không cộng vào Achievement

2 Achievement Assessment Khai báo giải đấu \+ minh chứng Achievement Points → Achievement Tier → Achievement Radar \(6 trục\) Không cộng vào Skill Elo

3 Growth Profile 3 câu hỏi thói quen \(cuối bài Deep\) Growth Tags Không dùng để suy ra thể lực/kỹ năng

6 nguyên tắc bất biến

Không cộng chéo: Skill Elo ≠ Achievement Points ≠ Growth Tags\. Ba hệ thống chạy song song, chỉ hiển thị cạnh nhau\.

Không đặt trần: Elo và AP đều không có giới hạn trên\. Nhưng muốn lên cao phải có câu hỏi/giải đấu tương ứng trong ngân hàng\.

Không hiển thị số thô cho khách phổ thông: Chỉ hiện Tier \+ Radar\. Elo/AP thô nằm trong "Chi tiết nâng cao"\.

Không bịa dữ liệu: Radar thiếu nguồn → trả \`null\` \+ \`status: "insufficient\_data"\`\. Không dùng \`overall × 0\.9\` thay thế \(đã sửa từ Trạm 3\)\.

Không dùng Growth Tags để suy ra Endurance: Endurance phải có câu hỏi riêng \(đã sửa từ Trạm 3\)\.

Không dùng Tier làm rào cản tuyệt đối khi gợi ý sản phẩm: Tier chỉ là context, không phải bộ lọc cứng \(đã sửa từ Trạm 4\)\.

1\. KIẾN TRÚC TỔNG THỂ

\`\`\` SPORTS DIAGNOSTIC SYSTEM v5\.0 │ ├── BADMINTON \(sport\_badminton\) │ ├── Skill Assessment │ │ ├── Quick \(6 câu, tag: assessment\_quick\) │ │ ├── Deep \(10 nhóm \+ câu phụ, tag: assessment\_deep\) │ │ ├── → Skill Elo \(khởi tạo 1000, không trần\) │ │ ├── → Skill Tier \(10 bậc\) │ │ └── → Skill Radar \(8 trục\) │ ├── Achievement Assessment \(tag: assessment\_achievement\) │ │ ├── Khai báo giải đấu \+ minh chứng │ │ ├── → Achievement Points \(không trần\) │ │ ├── → Achievement Tier \(10 bậc\) │ │ └── → Achievement Radar \(6 trục\) │ └── Growth Profile \(3 câu cuối Deep\) │ └── → Growth Tags │ ├── FOOTBALL \(sport\_football\) │ └── \(cấu trúc tương tự, 6 câu Quick \+ 12 nhóm Deep\) │ └── PRODUCT RECOMMENDATION ENGINE ├── Input: Skill Elo \+ Skill Tags \+ Achievement Tier \+ Growth Tags \+ Nhu cầu ├── Không dùng Tier làm bộ lọc cứng └── Explainable Recommendation \(không bịa số liệu\) \`\`\`

Luồng người dùng

\`\`\` Chọn môn → Hub môn đó → Chọn 1 trong 3: ├── \[Đánh giá nhanh\] → 6 câu → Kết quả Quick ├── \[Đánh giá chuyên sâu\] → 10\-12 nhóm → Kết quả Deep \(\+ Growth\) └── \[Khai báo thành tích\] → Form nhiều bước → Kết quả Achievement

→ Hồ sơ tổng hợp \(hiển thị 3 tab: Skill / Achievement / Growth\) → Gợi ý sản phẩm \`\`\`

Ba mục độc lập: có thể làm bất kỳ mục nào trước, không bắt buộc thứ tự, có thể làm lại từng mục riêng\.

2\. NGÂN HÀNG CÂU HỎI — CẦU LÔNG

2\.1\. BADMINTON QUICK — 6 câu \(tag: \`assessment\_quick\`\)

Cấu trúc mỗi câu: ID | Skill | Difficulty | Câu hỏi | 4 đáp án A/B/C/D \(S = 0 / 0\.33 / 0\.67 / 1\.0\) | Tags | Visual

BD\-Q01 — Backhand Overhead | Skill: \`backhand\` | Difficulty: 1000

Khi đối thủ đánh cầu về góc trái tay phía cuối sân, bạn thường xử lý như thế nào?

A\. Không thể đánh trái tay, thường phải chạy vòng qua đầu hoặc để cầu rơi rồi đỡ lại\. → \`lack\_backhand\_technique\`

B\. Có thể đưa vợt chạm cầu nhưng cầu thường xuyên mắc lưới hoặc bay ra ngoài\. → \`unstable\_backhand\`

C\. Có thể đánh cầu qua lưới, nhưng chủ yếu chỉ đến giữa sân đối phương\. → \`basic\_backhand\_control\`

D\. Có thể chủ động đánh cầu cao sâu hoặc điều cầu đến vị trí mong muốn\. → \`strong\_backhand\`

Visual: Sân nhìn từ trên cao, người chơi ở góc trái cuối sân\. 4 đường quỹ đạo: \(A\) không có đường bay / chạy vòng, \(B\) đường đỏ đâm vào lưới, \(C\) đường vàng rơi giữa sân, \(D\) đường xanh bay cao sâu cuối sân đối phương\.

BD\-Q02 — Smash | Skill: \`smash\` | Difficulty: 1100

Khi có một quả cầu bổng thuận lợi ở giữa sân, cú đập cầu của bạn thường như thế nào?

A\. Hiếm khi đập cầu, chủ yếu đánh cầu bổng lại\. → \`beginner\_smash\`

B\. Thường phải chờ cầu rơi thấp mới đập được, hoặc đập hụt\. → \`late\_smash\_timing\`

C\. Đập được tương đối mạnh nhưng hướng cầu và điểm rơi thiếu ổn định\. → \`unstable\_smash\`

D\. Có thể đập nhanh, chủ động điều chỉnh hướng và điểm rơi\. → \`controlled\_smash\`

Visual: Góc nhìn ngang sân\. Hình nhân người chơi \+ 3 điểm tiếp xúc cầu \(cao trước trán, ngang đầu, thấp sau đầu\)\. 3 đường bay: cắm 45°, ngang 15°, đâm lưới\.

BD\-Q03 — Net Play | Skill: \`net\_play\` | Difficulty: 1000

Khi đối thủ đưa cầu sát lưới, bạn có thể xử lý như thế nào?

A\. Thường không kịp đưa vợt đến cầu hoặc đánh cầu vào lưới\. → \`weak\_net\_control\`

B\. Chỉ có thể nâng cầu bổng lên để tiếp tục pha bóng\. → \`basic\_net\_recovery\`

C\. Có thể bỏ nhỏ qua lưới nhưng độ chính xác chưa cao\. → \`net\_touch\`

D\. Có thể kiểm soát cầu sát lưới, thay đổi giữa bỏ nhỏ, gài cầu và đẩy cầu\. → \`advanced\_net\_control\`

Visual: Cận cảnh lưới từ góc nghiêng\. 3 trạng thái: \(A\) cầu không qua, \(B\) cầu bổng cao, \(C\) bỏ nhỏ sát lưới\. Đường nét đứt thể hiện quỹ đạo\.

BD\-Q04 — Defense Reflex | Skill: \`defense\` | Difficulty: 1100

Khi đối thủ đập cầu nhanh về phía người bạn, cách xử lý thường xuyên nhất là gì?

A\. Thường không kịp phản ứng hoặc vung vợt nhưng không chạm cầu\. → \`slow\_defense\_reflex\`

B\. Chạm được cầu nhưng cầu thường bật lên quá cao hoặc bay ra ngoài\. → \`unstable\_defense\`

C\. Đỡ được cầu và tiếp tục pha bóng, nhưng chưa kiểm soát tốt hướng trả cầu\. → \`basic\_defense\`

D\. Có thể phản tạt, chặn cầu hoặc điều cầu về vị trí khó cho đối phương\. → \`fast\_defensive\_reflex\`

Visual: Animation 2 frame: \(1\) vợt rung nhẹ trong phạm vi 20cm khi phản xạ nhanh, \(2\) cả cánh tay vung rộng khi phản xạ chậm\. 3 hướng cầu trả: bổng, chặn sát lưới, phản tạt ngang\.

BD\-Q05 — Footwork & Recovery | Skill: \`footwork\` | Difficulty: 1000

Sau khi đánh cầu về một góc sân, bạn thường di chuyển như thế nào?

A\. Thường đứng lại hoặc mất nhiều thời gian mới quay về trung tâm\. → \`poor\_recovery\`

B\. Chạy về trung tâm nhưng thường mất thăng bằng hoặc bị chậm nhịp\. → \`slow\_footwork\`

C\. Có thể di chuyển và trở về vị trí tương đối tốt\. → \`basic\_footwork\`

D\. Chủ động phục hồi vị trí, di chuyển linh hoạt và sẵn sàng cho cú đánh tiếp theo\. → \`efficient\_footwork\`

Visual: Top\-down sân\. \(A\) dấu chân đứng yên góc sân, \(B\) đường zíc\-zắc chậm về giữa, \(C\) đường thẳng về giữa, \(D\) 2 bàn chân bật mở \+ 4 mũi tên tỏa về 4 góc\.

BD\-Q06 — Serve & Receive | Skill: \`serve\_receive\` | Difficulty: 900

Khi bắt đầu một pha giao cầu hoặc đón giao cầu, khả năng của bạn như thế nào?

A\. Giao cầu thường xuyên hỏng hoặc không kiểm soát được vị trí cầu\. → \`weak\_serve\`

B\. Giao cầu qua lưới được nhưng đường cầu và độ ổn định chưa tốt\. → \`basic\_serve\_control\`

C\. Có thể giao cầu tương đối chính xác và đón giao cầu cơ bản\. → \`stable\_serve\`

D\. Có thể thay đổi điểm rơi giao cầu và chủ động xử lý ngay sau khi đón giao cầu\. → \`advanced\_serve\_receive\`

Visual: Hai sơ đồ nhỏ cạnh nhau: trái = giao cầu \(3 vùng điểm rơi: sát lưới, giữa sân, cuối sân\), phải = đón giao cầu \(3 hướng xử lý: tấn công, an toàn, chờ\)\.

2\.2\. BADMINTON DEEP — 10 nhóm \(tag: \`assessment\_deep\`\)

Mỗi nhóm gồm 1 câu gốc \(4 mức\) \+ 2–4 câu phụ\. Câu phụ chỉ kích hoạt khi câu gốc chọn B/C/D \(nếu chọn A = chưa làm được → bỏ qua câu phụ để tiết kiệm thời gian\)\.

BD\-D01 — Backhand Overhead | Skill: \`backhand\` | Difficulty base: 1200

Gốc: \*Khi cầu được đánh sâu về góc trái tay cuối sân, bạn có thể thực hiện động tác nào?\*

A\. Không xử lý được bằng trái tay\. → \`weak\_backhand\_contact\` | bỏ qua câu phụ

B\. Chỉ có thể hất cầu lên để giữ pha bóng\. → \`backhand\_power\` \(thấp\)

C\. Có thể phông cầu trái tay qua lưới\. → \`backhand\_control\` \(trung bình\)

D\. Có thể thực hiện phông cầu, bỏ nhỏ hoặc điều cầu theo ý muốn\. → \`backhand\_control\` \(cao\)

Phụ 1 \(nếu B/C/D\): \*Bạn thường tiếp xúc cầu ở vị trí nào?\*

A\. Cầu đã rơi xuống thấp, gần ngang vai\. | B\. Cầu ở phía sau đầu\. | C\. Cầu ở phía trên và hơi lệch sau đầu\. | D\. Cầu được tiếp xúc tại vị trí phù hợp, phía trên và có khoảng không gian để vung vợt\.

Phụ 2 \(nếu B/C/D\): \*Sau khi đánh, cầu thường đi như thế nào?\*

A\. Không qua lưới\. | B\. Qua lưới nhưng chỉ đến giữa sân\. | C\. Bay cao về gần cuối sân\. | D\. Có thể chủ động điều chỉnh giữa cầu cao sâu, cầu ngang và cầu bỏ nhỏ\.

Visual: Sân 3D từ cuối sân\. Highlight vị trí tiếp xúc \(điểm vàng\), hướng vung vợt \(mũi tên cong\), điểm rơi \(3 vùng màu\)\.

BD\-D02 — Forehand Clear | Skill: \`forehand\_clear\` | Difficulty: 1100

Gốc: \*Khi cần đánh cầu cao sâu từ cuối sân về cuối sân đối phương, bạn xử lý ra sao?\*

A\. Không đủ lực đưa cầu qua lưới\. → \`weak\_clear\`

B\. Cầu thường chỉ đến giữa sân\. → \`unstable\_shot\_depth\`

C\. Cầu đến cuối sân nhưng phụ thuộc nhiều vào việc lấy đà\. → \`controlled\_clear\` \(trung bình\)

D\. Có thể đánh sâu ổn định và thay đổi hướng phông cầu\. → \`controlled\_clear\` \(cao\)

Phụ 1: \*Bạn có thường xuyên chạm cầu phía trên và phía trước cơ thể không?\* \(4 mức\)

Phụ 2: \*Bạn có phân biệt được khi nào cần phông cao sâu, khi nào cần đánh cầu ngang không?\* \(4 mức\)

Phụ 3: \*Trong một trận đấu, bạn duy trì được độ sâu của cầu ở mức nào?\* \(4 mức\)

Visual: Sân nhìn ngang\. 3 quỹ đạo: rơi giữa sân \(đỏ\), cuối sân \(xanh\), ngoài biên \(cam\)\.

BD\-D03 — Smash Mechanics | Skill: \`smash\` | Difficulty: 1300

Gốc: \*Khi đập cầu, bạn thường tiếp xúc cầu như thế nào?\*

A\. Thường đập khi cầu đã rơi thấp hoặc không xác định được thời điểm tiếp xúc\. → \`late\_smash\_timing\`

B\. Có thể đập khi cầu ở trên đầu nhưng thường đánh lệch tâm vợt\. → \`smash\_accuracy\` \(thấp\)

C\. Thường tiếp xúc cầu ở vị trí thuận lợi nhưng chưa ổn định\. → \`strong\_smash\` \(trung bình\)

D\. Có thể duy trì điểm tiếp xúc thuận lợi, điều chỉnh hướng và lực đánh\. → \`strong\_smash\` \(cao\)

Phụ 1: \*Cầu thường cắm xuống, bay ngang hay bay bổng?\*

Phụ 2: \*Bạn có chủ động thay đổi hướng smash theo vị trí đối thủ không?\*

Phụ 3: \*Tỷ lệ cú smash được đánh trúng điểm mong muốn trong một trận đấu như thế nào?\*

Phụ 4: \*Sau khi smash, bạn có thể phục hồi tư thế để tiếp tục pha bóng không?\* → \`smash\_recovery\_issue\` nếu A

Visual: Side\-view sân\. Hình nhân \+ 3 điểm tiếp xúc \(trước trán 30°, đỉnh đầu, sau đầu\)\. 3 đường cầu: cắm 45°, ngang 15°, đâm lưới\.

BD\-D04 — Drop Shot | Skill: \`drop\_shot\` | Difficulty: 1200

Gốc: \*Khi muốn bỏ nhỏ từ cuối sân, bạn có thể kiểm soát quả cầu như thế nào?\*

A\. Không thực hiện được hoặc cầu thường mắc lưới\. → \`weak\_drop\_shot\`

B\. Cầu qua lưới nhưng bay cao, tạo cơ hội cho đối thủ\. → \`basic\_drop\_shot\`

C\. Có thể bỏ nhỏ nhưng điểm rơi chưa ổn định\. → \`accurate\_drop\_shot\` \(trung bình\)

D\. Có thể thay đổi tốc độ và điểm rơi, khiến đối phương khó đoán\. → \`deceptive\_play\`

Phụ 1: \*Bạn có thực hiện được bỏ nhỏ thẳng và chéo sân không?\*

Phụ 2: \*Cầu thường rơi gần lưới hay giữa sân?\*

Phụ 3: \*Bạn có thể kết hợp động tác chuẩn bị giống phông cầu hoặc smash để tạo bất ngờ không?\*

Visual: Top\-down nửa sân đối phương\. 2 quỹ đạo: bỏ nhỏ thẳng \(xanh\), bỏ nhỏ chéo \(cam\)\.

BD\-D05 — Net Play & Net Kill | Skill: \`net\_play\` | Difficulty: 1300

Gốc: \*Khi tham gia những pha cầu sát lưới, bạn thường có thể thực hiện gì?\*

A\. Chỉ cố gắng nâng cầu lên để tiếp tục\. → \`weak\_net\_play\`

B\. Có thể đánh cầu qua lưới nhưng thường bị nâng quá cao\. → \`net\_control\` \(thấp\)

C\. Có thể bỏ nhỏ và kiểm soát điểm rơi\. → \`net\_control\` \(trung bình\)

D\. Có thể kết hợp bỏ nhỏ, gài cầu, đẩy cầu và kết thúc cầu trên lưới khi thuận lợi\. → \`advanced\_net\_skill\` \+ \`net\_kill\`

Phụ: độ cao cầu, kịp đưa vợt, phân biệt nâng vs ép\.

Visual: Góc sân trước, vùng tiếp xúc cầu \(highlight đỏ\), 3 điểm rơi\.

BD\-D06 — Drive & Phản tạt | Skill: \`drive\` | Difficulty: 1200

Gốc: \*Trong pha đánh cầu ngang tốc độ cao, bạn thường xử lý thế nào?\*

A\. Không bắt kịp tốc độ cầu\. → \`slow\_grip\_transition\`

B\. Chủ yếu đỡ cầu bổng để tiếp tục pha bóng\. → \`unstable\_drive\`

C\. Có thể phản tạt nhưng chưa duy trì được nhiều nhịp\. → \`fast\_drive\` \(trung bình\)

D\. Có thể đánh drive liên tục, kiểm soát tốc độ và hướng cầu\. → \`fast\_drive\` \+ \`strong\_finger\_control\`

Phụ: dùng cổ tay hay cả cánh tay, cầu đi ngang hay bị nâng, đổi hướng 2 bên\.

Visual: 2 frame animation: \(1\) vợt rung nhẹ 20cm = cổ tay, \(2\) cả cánh tay vung = cần sức\.

BD\-D07 — Defensive Technique | Skill: \`defense\` | Difficulty: 1300

Gốc: \*Khi đối phương smash liên tục, bạn thường sử dụng cách phòng thủ nào?\*

A\. Thường xuyên không kịp đỡ\. → \`weak\_defense\`

B\. Chủ yếu cố gắng đỡ cầu bằng một động tác vung rộng\. → \`basic\_defense\`

C\. Có thể block hoặc nâng cầu để giữ pha bóng\. → \`defensive\_control\`

D\. Có thể chuyển đổi giữa block, drive và nâng cầu tùy tình huống\. → \`defensive\_transition\` \+ \`strong\_defense\`

Phụ: giữ mặt vợt ổn định? chuyển thủ sang công?

Visual: Sân ngang, mũi tên cầu từ đối phương sang, 3 hướng đỡ\.

BD\-D08 — Serve & Receive \(Deep\) | Skill: \`serve\_receive\` | Difficulty: 1200

Gốc: \*Khi giao cầu, bạn kiểm soát điểm rơi như thế nào?\*

A\. Thường xuyên giao cầu lỗi\. → \`serve\_consistency\` \(thấp\)

B\. Đánh qua lưới được nhưng không xác định tốt điểm rơi\. → \`serve\_consistency\` \(trung bình thấp\)

C\. Có thể giao cầu ngắn hoặc dài tương đối chính xác\. → \`serve\_consistency\` \(trung bình\)

D\. Có thể thay đổi kiểu giao cầu và điều chỉnh theo vị trí người nhận\. → \`serve\_variation\`

Phụ: đánh đơn/đôi, đón giao cầu chủ động hay chờ, nhận biết giao ngắn/dài\.

Visual: 2 sơ đồ riêng: giao cầu \(3 vùng\) và đón giao cầu \(3 hướng\)\.

BD\-D09 — Footwork & Recovery \(Deep\) | Skill: \`footwork\` | Difficulty: 1300

Gốc: \*Khi đối phương đánh cầu liên tục về bốn góc sân, bạn duy trì di chuyển ra sao?\*

A\. Thường xuyên bị động, không kịp đến vị trí cầu\. → \`poor\_recovery\`

B\. Đến được vị trí cầu nhưng thường không kịp quay lại trung tâm\. → \`poor\_recovery\` \(nhẹ\)

C\. Có thể di chuyển tương đối tốt nhưng tốc độ giảm khi trận đấu kéo dài\. → \`basic\_footwork\` \+ \`low\_movement\_endurance\`

D\. Có thể duy trì nhịp di chuyển, cân bằng và phục hồi vị trí tốt\. → \`split\_step\` \+ \`high\_agility\`

Phụ 1: \*Bạn có thực hiện split\-step trước khi đối phương đánh cầu không?\*

Phụ 2: \*Bạn thường tiếp đất bằng một chân hay phân bổ trọng lượng hợp lý?\*

Phụ 3: \*Sau khi đánh cầu cuối sân, bạn có chủ động trở lại vị trí chuẩn bị không?\*

Phụ 4 \(QUAN TRỌNG — cấp dữ liệu cho trục Bền bỉ\): \*Khả năng di chuyển của bạn thay đổi ra sao sau nhiều pha cầu liên tục hoặc bước vào set 3?\*

A\. Mất kiểm soát động tác, thở dốc, không còn split\-step\. → \`low\_movement\_endurance\`

B\. Di chuyển chậm rõ rệt, nhiều lỗi do chân\. → \`moderate\_endurance\`

C\. Vẫn giữ được nhịp nhưng chậm hơn set đầu\. → \`good\_endurance\`

D\. Giữ nguyên cường độ và độ chính xác động tác\. → \`high\_endurance\`

Visual: Sân top\-down 6 góc\. Animation dấu chân di chuyển theo pattern\.

BD\-D10 — Match Intelligence | Skill: \`match\_intelligence\` | Difficulty: 1400

Gốc: \*Trong một pha cầu dài, bạn thường đưa ra quyết định như thế nào?\*

A\. Chủ yếu đánh cầu qua lưới, ít chủ động lựa chọn hướng\. → \`basic\_tactical\_awareness\`

B\. Có thể nhận biết vị trí đối phương nhưng thường đánh theo thói quen\. → \`basic\_tactical\_awareness\` \(trung bình\)

C\. Có thể thay đổi hướng cầu và tận dụng khoảng trống\. → \`court\_awareness\`

D\. Chủ động phân tích vị trí đối thủ, thể trạng pha bóng và chọn phương án phù hợp\. → \`advanced\_tactical\_play\`

Phụ: đánh vào khoảng trống?, đổi chiến thuật khi bị bắt bài?, giữ chính xác khi bị dẫn điểm? \(nếu A → \`inconsistent\_match\_performance\`\)

Visual: Top\-down sân với 2 người chơi, highlight vùng trống\.

2\.3\. GROWTH — 3 câu cuối bài Deep \(tag: \`growth\_profile\`\)

POT\-01 — Tần suất luyện tập | Tag

Bạn luyện tập môn thể thao này với tần suất như thế nào?

A\. Không có lịch tập cố định\. → \`low\_training\_frequency\`

B\. Khoảng 1 buổi/tuần\. → \`needs\_guided\_practice\`

C\. Khoảng 2–3 buổi/tuần\. → \`consistent\_practice\`

D\. Từ 4 buổi/tuần trở lên\. → \`consistent\_practice\` \+ \`high\_training\_frequency\`

POT\-02 — Nhận biết & sửa lỗi | Tag

Khi nhận ra mình thường xuyên mắc một lỗi kỹ thuật, bạn thường làm gì?

A\. Tiếp tục chơi theo thói quen\. → \`low\_learning\_awareness\`

B\. Biết mình mắc lỗi nhưng chưa chủ động sửa\. → \`needs\_guided\_practice\`

C\. Cố gắng luyện tập để cải thiện lỗi\. → \`high\_learning\_awareness\` \(trung bình\)

D\. Chủ động tìm nguyên nhân, điều chỉnh kỹ thuật và kiểm tra lại kết quả\. → \`high\_learning\_awareness\` \(cao\) \+ \`growth\_oriented\`

POT\-03 — Duy trì cải thiện | Tag

Khi học một kỹ thuật mới, bạn thường như thế nào?

A\. Khó duy trì việc luyện tập\. → \`low\_learning\_awareness\`

B\. Có thể làm theo nhưng dễ quên khi thi đấu\. → \`needs\_guided\_practice\`

C\. Có thể áp dụng sau một thời gian luyện tập\. → \`consistent\_practice\`

D\. Có thể ghi nhớ, áp dụng và điều chỉnh kỹ thuật trong các tình huống khác nhau\. → \`growth\_oriented\`

3\. NGÂN HÀNG CÂU HỎI — BÓNG ĐÁ

3\.1\. FOOTBALL QUICK — 6 câu \(tag: \`assessment\_quick\`\)

FB\-Q01 — First Touch | Skill: \`first\_touch\` | Difficulty: 1100

Khi đồng đội chuyền bóng sệt mạnh đến chân bạn trong lúc đối phương đang áp sát, bạn thường xử lý thế nào?

A\. Thường để bóng bật ra xa hoặc không khống chế được\. → \`heavy\_touch\`

B\. Có thể đỡ bóng nhưng bóng thường dừng ngay dưới chân hoặc lệch khỏi hướng mong muốn\. → \`basic\_ball\_control\`

C\. Có thể khống chế bóng nhưng thường phải mất thêm nhịp mới xử lý tiếp\. → \`stable\_first\_touch\`

D\. Có thể đỡ bước một theo hướng di chuyển tiếp theo để thoát áp lực\. → \`elite\_first\_touch\`

Visual: Sân top\-down\. 3 vùng tròn quanh cầu thủ: bán kính 0\.5m \(xanh\), 1m \(vàng\), 2m \(đỏ\)\. Bóng dừng trong vùng nào tương ứng đáp án\.

FB\-Q02 — Short Passing | Skill: \`short\_passing\` | Difficulty: 1000

Khi cần chuyền bóng ngắn cho đồng đội đang di chuyển, bạn có thể làm gì?

A\. Thường chuyền sai hướng hoặc sai lực\. → \`weak\_short\_pass\`

B\. Chuyền được nhưng bóng thường không đến đúng chân đồng đội\. → \`basic\_passing\`

C\. Chuyền tương đối chính xác khi không có áp lực\. → \`accurate\_passing\`

D\. Có thể điều chỉnh lực, hướng và thời điểm chuyền khi có đối thủ áp sát\. → \`pressured\_passing\`

Visual: Sân với 2 cầu thủ\. 3 đường mũi tên: lệch hướng, đến gần chân, đến đúng chân\.

FB\-Q03 — Dribbling & 1v1 | Skill: \`dribbling\` | Difficulty: 1100

Khi đối mặt với một cầu thủ phòng ngự đang chắn đường, bạn thường xử lý như thế nào?

A\. Khó kiểm soát bóng khi bị áp sát\. → \`weak\_dribbling\`

B\. Có thể giữ bóng nhưng thường phải chuyền về\. → \`basic\_dribbling\`

C\. Có thể đổi hướng hoặc sử dụng động tác giả để vượt qua\. → \`agile\_dribbler\`

D\. Có thể phối hợp đổi tốc độ, đổi hướng và động tác giả để tạo khoảng trống\. → \`strong\_1v1\`

Visual: Top\-down với hậu vệ chắn phải\. 3 mũi tên xử lý\.

FB\-Q04 — Weak Foot | Skill: \`weak\_foot\` | Difficulty: 1000

Khi chân thuận bị đối thủ khóa hướng, bạn xử lý bằng chân không thuận như thế nào?

A\. Gần như không thể chuyền hoặc sút bằng chân không thuận\. → \`one\_footed\_limit\`

B\. Có thể chạm bóng nhưng lực và hướng không ổn định\. → \`basic\_weak\_foot\`

C\. Có thể chuyền ngắn hoặc khống chế bằng chân không thuận\. → \`two\_footed\_control\`

D\. Có thể chuyền, sút và xử lý bóng bằng cả hai chân trong tình huống thi đấu\. → \`two\_footed\_player\`

Visual: Hai sơ đồ chân trái/phải song song, mũi tên chuyền bóng ra\.

FB\-Q05 — Shooting | Skill: \`shooting\` | Difficulty: 1100

Khi có cơ hội sút bóng về phía khung thành, bạn thường thực hiện như thế nào?

A\. Thường sút không trúng bóng hoặc không kiểm soát được hướng\. → \`weak\_shooting\`

B\. Có thể sút nhưng bóng thường đi nhẹ hoặc thiếu chính xác\. → \`low\_shot\_power\`

C\. Có thể sút tương đối mạnh và đúng hướng khi có thời gian chuẩn bị\. → \`accurate\_shooting\`

D\. Có thể chủ động chọn góc sút, điều chỉnh lực và kết thúc trong điều kiện có áp lực\. → \`strong\_finishing\`

Visual: Khung thành chia 6 vùng mục tiêu, 3 hướng sút từ 3 đáp án\.

FB\-Q06 — Agility & Change of Direction | Skill: \`agility\` | Difficulty: 1100

Khi đang chạy với tốc độ cao và cần đổi hướng để nhận bóng hoặc vượt qua đối thủ, bạn thường như thế nào?

A\. Thường mất thăng bằng hoặc khó kiểm soát bước chạy\. → \`poor\_change\_direction\`

B\. Có thể đổi hướng nhưng phải giảm tốc độ khá nhiều\. → \`basic\_agility\`

C\. Có thể phanh và đổi hướng tương đối tốt\. → \`good\_agility\`

D\. Có thể chuyển hướng linh hoạt, giữ thăng bằng và tiếp tục xử lý bóng\. → \`explosive\_agility\`

Visual: Sân top\-down\. Đường chạy thẳng \+ 2 đường gấp 45°/90°\. Icon chân trụ nghiêng 45°\.

3\.2\. FOOTBALL DEEP — 12 nhóm \(tag: \`assessment\_deep\`\)

FB\-D01 — First Touch Under Pressure | \`first\_touch\` | Diff: 1300

Gốc: \*Khi nhận bóng từ đồng đội trong tư thế bị đối phương áp sát phía sau, bạn có thể làm gì?\*

A\. Khó giữ bóng trong tầm kiểm soát\. → \`heavy\_touch\`

B\. Có thể giữ bóng nhưng thường phải dừng lại để xử lý\. → \`first\_touch\_control\` \(thấp\)

C\. Có thể chạm bóng sang một bên để thoát áp lực\. → \`first\_touch\_direction\`

D\. Có thể chủ động điều chỉnh hướng chạm bóng theo vị trí đối thủ và đồng đội\. → \`pressure\_resistance\`

Phụ: đỡ bằng lòng/má trong/má ngoài?, bóng cách bao xa?, xoay người ngay được không?, ưu tiên giữ hay thoát?

Visual: 3 hướng chạm bóng: giữ, thoát trái, thoát phải\. Bóng mờ = hậu vệ\.

FB\-D02 — Scanning & Spatial Awareness | \`scanning\` | Diff: 1300

Gốc: \*Trước khi đồng đội chuyền bóng cho bạn, bạn thường quan sát sân như thế nào?\*

A\. Thường chỉ nhìn bóng khi nhận bóng\. → \`low\_spatial\_awareness\`

B\. Có nhìn xung quanh nhưng không thường xuyên\. → \`basic\_scanning\`

C\. Thường kiểm tra vị trí đồng đội và đối thủ trước khi nhận\. → \`good\_scanning\`

D\. Chủ động quan sát trước, trong và sau khi nhận bóng để lựa chọn hướng xử lý\. → \`advanced\_game\_awareness\`

Phụ: kiểm tra hậu vệ sau?, xác định hướng chuyền tiếp?, đổi vị trí tạo góc nhận?

Visual: Top\-down với cone tầm nhìn cầu thủ trước/sau khi nhận bóng\.

FB\-D03 — Short Passing & Combination | \`short\_passing\` | Diff: 1250

Gốc: \*Trong những pha phối hợp chuyền ngắn liên tục, bạn thường xử lý ra sao?\*

A\. Thường chuyền hỏng hoặc không theo kịp nhịp phối hợp\. → \`weak\_passing\`

B\. Chuyền được nhưng thường giữ bóng quá lâu\. → \`pass\_weight\_control\` \(thấp\)

C\. Có thể phối hợp chuyền và di chuyển ở tốc độ trung bình\. → \`combination\_play\`

D\. Có thể chuyền một chạm, hai chạm và phối hợp di chuyển hợp lý\. → \`one\_touch\_passing\`

Phụ: chuyền vào chân hay khoảng trống?, điều chỉnh lực theo khoảng cách?, di chuyển sau khi chuyền?

FB\-D04 — Long Pass & Crossing | \`long\_pass\` | Diff: 1300

Gốc: \*Khi cần thực hiện đường chuyền dài chuyển hướng tấn công hoặc tạt bóng vào khu vực nguy hiểm, bạn thường như thế nào?\*

A\. Không kiểm soát được hướng và lực của bóng\. → \`weak\_long\_pass\`

B\. Có thể đưa bóng bổng đi xa nhưng thiếu chính xác\. → \`long\_pass\_power\`

C\. Có thể chuyền dài đến khu vực mong muốn trong điều kiện ít áp lực\. → \`crossing\_accuracy\`

D\. Có thể thay đổi hướng, độ cao và lực đường chuyền phù hợp với vị trí đồng đội\. → \`switch\_play\`

Phụ: chạm bằng mu/má trong/má ngoài?, bóng thấp/bổng/xoáy?, chuyền chéo sân?, tạt vào khu vực đồng đội?

Visual: Sân lớn với 3 đường: chuyền dài, chuyền chéo, tạt cánh\.

FB\-D05 — Dribbling & Close Control | \`dribbling\` | Diff: 1300

Gốc: \*Khi dẫn bóng qua khu vực đông người, bạn kiểm soát bóng như thế nào?\*

A\. Thường để bóng rời xa chân và dễ mất bóng\. → \`weak\_dribbling\`

B\. Có thể rê bóng nhưng chủ yếu theo một hướng\. → \`basic\_dribbling\`

C\. Có thể đổi hướng và giữ bóng tương đối tốt\. → \`close\_control\`

D\. Có thể thay đổi hướng, tốc độ và khoảng cách chạm bóng để giữ bóng trong không gian hẹp\. → \`advanced\_dribbling\`

Phụ: má trong/má ngoài?, dùng chân không thuận?, bóng bị đẩy xa khi tăng tốc?

FB\-D06 — 1v1 & Skill Moves | \`dribbling\` | Diff: 1350

Gốc: \*Khi phải vượt qua một hậu vệ trong tình huống một đối một, bạn thường xử lý như thế nào?\*

A\. Thường chuyền về hoặc mất bóng\. → \`basic\_skill\_moves\` \(thấp\)

B\. Chủ yếu sử dụng tốc độ để vượt qua\. → \`speed\_reliant\`

C\. Có thể dùng một số động tác giả và đổi hướng\. → \`basic\_skill\_moves\`

D\. Có thể quan sát phản ứng hậu vệ rồi kết hợp động tác giả, tốc độ và hướng di chuyển\. → \`creative\_dribbler\` \+ \`advanced\_1v1\`

Phụ: động tác đảo chân?, đổi hướng bằng má ngoài?, kiểm soát nhịp sau khi vượt?

Visual: 3 chuỗi động tác vượt người với hướng chạy khác nhau\.

FB\-D07 — Weak Foot Mastery | \`weak\_foot\` | Diff: 1250

Gốc: \*Trong một pha bóng cần chuyền hoặc sút nhanh, khả năng sử dụng chân không thuận của bạn như thế nào?\*

A\. Hầu như không thể sử dụng\. → \`weak\_foot\_control\` \(thấp\)

B\. Chỉ có thể chạm hoặc chuyền bóng đơn giản\. → \`weak\_foot\_passing\` \(thấp\)

C\. Có thể chuyền và sút ở điều kiện thuận lợi\. → \`weak\_foot\_shooting\`

D\. Có thể sử dụng cả hai chân trong các tình huống xử lý phức tạp\. → \`two\_footed\_player\`

Phụ: chuyền ngắn?, chuyền dài?, sút?, khống chế và rê bóng?

FB\-D08 — Shooting & Finishing | \`shooting\` | Diff: 1350

Gốc: \*Khi thực hiện cú sút về khung thành, bạn thường có thể kiểm soát những yếu tố nào?\*

A\. Chưa kiểm soát tốt kỹ thuật tiếp xúc bóng\. → \`weak\_finishing\`

B\. Có thể sút nhưng chủ yếu phụ thuộc vào sức mạnh\. → \`power\_shooter\`

C\. Có thể điều chỉnh hướng và lực sút\. → \`accurate\_finishing\`

D\. Có thể chọn vị trí sút, điều chỉnh lực và thực hiện cú sút phù hợp với tình huống\. → \`accurate\_finishing\` \+ \`one\_touch\_finisher\`

Phụ: mu chính diện/má trong?, chân trụ ổn định?, sút một chạm?, sút khi đang di chuyển?, sút góc xa?

Visual: Bàn chân tiếp xúc bóng \(highlight vùng mu xanh, má trong vàng, mũi đỏ\) \+ khung thành 6 vùng\.

FB\-D09 — Defensive Positioning & 1v1 Defense | \`defensive\_positioning\` | Diff: 1300

Gốc: \*Khi đối thủ đang dẫn bóng tiến về phía bạn, bạn thường phòng thủ như thế nào?\*

A\. Thường lao vào tranh bóng và dễ bị vượt qua\. → \`poor\_defensive\_positioning\`

B\. Có thể áp sát nhưng khó giữ vị trí\. → \`basic\_defense\`

C\. Có thể giữ khoảng cách và ngăn đối phương đi vào hướng nguy hiểm\. → \`good\_1v1\_defense\`

D\. Có thể điều chỉnh góc đứng, hướng di chuyển và thời điểm tranh bóng phù hợp\. → \`defensive\_awareness\`

Phụ: quan sát hông đối phương?, ép ra biên?, giữ vị trí giữa bóng và khung thành?

Visual: Top\-down, góc đứng hậu vệ \+ hướng di chuyển\.

FB\-D10 — Acceleration, Deceleration & COD | \`agility\` | Diff: 1300

Gốc: \*Trong quá trình chạy nhanh rồi phải dừng hoặc chuyển hướng đột ngột, bạn thường như thế nào?\*

A\. Thường mất thăng bằng hoặc khó điều chỉnh bước chân\. → \`poor\_deceleration\`

B\. Có thể chuyển hướng nhưng mất nhiều nhịp\. → \`basic\_agility\`

C\. Có thể phanh và chuyển hướng tương đối tốt\. → \`good\_change\_direction\`

D\. Có thể kết hợp tăng tốc, giảm tốc, đổi hướng và tiếp tục kiểm soát bóng\. → \`explosive\_acceleration\`

Phụ 1: \*Khi đổi hướng, bàn chân có bị trượt trong giày không?\* → \`foot\_slippage\` nếu A/B

Phụ 2: \*Bạn có thường phải dùng thêm một bước để lấy thăng bằng không?\*

Phụ 3: \*Bạn có giữ được cảm giác bóng sau khi tăng tốc không?\*

Phụ 4 \(QUAN TRỌNG cho product rec\): \*Bạn thường chơi trên sân cỏ nhân tạo hay cỏ tự nhiên?\* → \`surface\_turf\`, \`surface\_grass\`, \`surface\_futsal\`

Visual: Đường chạy, chân trụ nghiêng 45°, mũi tên ground reaction force\.

FB\-D11 — Off\-ball Movement | \`off\_ball\` | Diff: 1300

Gốc: \*Khi đồng đội đang giữ bóng, bạn thường di chuyển như thế nào?\*

A\. Thường đứng chờ bóng đến\. → \`static\_positioning\`

B\. Có di chuyển nhưng chưa rõ hướng tạo khoảng trống\. → \`basic\_off\_ball\_movement\`

C\. Biết di chuyển đến vị trí thuận lợi để nhận bóng\. → \`space\_creation\`

D\. Chủ động tạo góc chuyền, kéo giãn hàng phòng ngự và di chuyển vào khoảng trống\. → \`advanced\_positioning\`

Phụ: di chuyển ra khỏi vùng bị kiểm soát?, biết khi nào gần/xa bóng?, hỗ trợ sau khi chuyền?

Visual: Sân nhỏ 7 người, highlight khoảng trống\.

FB\-D12 — Decision Making Under Pressure | \`decision\_making\` | Diff: 1400

Gốc: \*Khi nhận bóng và có nhiều đối thủ xung quanh, bạn thường lựa chọn như thế nào?\*

A\. Thường giữ bóng quá lâu hoặc chuyền trong trạng thái bị động\. → \`slow\_decision\_making\`

B\. Có xu hướng chuyền ngay về phía đồng đội gần nhất\. → \`basic\_game\_decision\`

C\. Có thể lựa chọn giữa chuyền, rê bóng hoặc giữ bóng theo tình huống\. → \`good\_game\_reading\`

D\. Có thể nhận diện áp lực và lựa chọn phương án có lợi nhất cho tình huống tiếp theo\. → \`advanced\_game\_intelligence\`

Phụ: nhận biết khi nào an toàn?, biết khi nào phản công?, thay đổi quyết định khi đối thủ đổi vị trí?

4\. ELO RATING ENGINE \(Skill\)

4\.1\. Công thức

Bước 1 — Kỳ vọng: \`\`\` E\_i = 1 / \(1 \+ 10^\(\(D\_i \- R\_i\) / 400\)\) \`\`\`

\`R\_i\`: rating hiện tại của skill

\`D\_i\`: độ khó Elo của câu

\`E\_i\`: xác suất kỳ vọng khách làm tốt

Bước 2 — Quy đổi đáp án: A=0\.00, B=0\.33, C=0\.67, D=1\.00 → \`S\_i\`

Bước 3 — Cập nhật: \`\`\` R\_new = R\_old \+ K × \(S\_i \- E\_i\) \`\`\`

4\.2\. K\-factor \(ĐÃ SỬA từ Trạm 4\)

Quy tắc: Quick có ÍT thông tin hơn → K phải THẤP hơn hoặc bằng Deep, không được cao hơn \(Trạm 3 đề xuất 36/20 là sai\)\.

Chế độ K khởi tạo Ghi chú

Quick 16 Ổn định, tránh nhảy tier quá nhanh từ 6 câu

Deep 24 Nhiều dữ liệu hơn, có thể cập nhật mạnh hơn

Câu xác minh cross\-check 12 Cập nhật thận trọng

→ Bắt buộc Data Science hiệu chỉnh sau 3 tháng dữ liệu thực\.

4\.3\. Độ khó câu hỏi \(khởi tạo\)

Mức Elo Đặc điểm

Cơ bản 800 Động tác nền tảng

Phổ thông 1000 Kiểm soát bình thường

Khá 1200 Ổn định có áp lực

Nâng cao 1400 Kiểm soát \+ điều chỉnh linh hoạt

Cạnh tranh 1600\+ Hiệu quả trong tình huống khó

4\.4\. Adaptive Question Selection

\`\`\`python def select\_next\_question\(available, current\_rating, answered\_skills, mode\): if mode == "quick": candidates = \[q for q in available if q\.skill not in answered\_skills\] else: candidates = \[q for q in available if q\.group\_id not in answered\_groups\] candidates\.sort\(key=lambda q: abs\(q\.difficulty \- current\_rating\)\) return candidates\[0\] if candidates else available\[0\] \`\`\`

Early stop Deep: Nếu sau 6 nhóm mà |ΔR| < 10 → có thể dừng, gắn \`confidence: low\`\.

4\.5\. Cấu trúc rating

\`\`\`json \{ "sport": "badminton", "rating\_system": "elo\_item\_v1", "ratings": \{ "quick": \{ "overall": 1120, "confidence": "low", "last\_updated": "ISO\_DATE", "skill\_ratings": \{ "backhand": 1150, "smash": 1250, "defense": 960, "footwork": 1100, "net\_play": 1110, "serve\_receive": 1080 \} \}, "deep": \{ "overall": 1280, "confidence": "medium", "last\_updated": "ISO\_DATE", "skill\_ratings": \{ "backhand": 1180, "forehand\_clear": 1220, "smash": 1250, "drop\_shot": 1100, "net\_play": 1110, "drive": 1150, "defense": 960, "serve\_receive": 1200, "footwork": 1100, "match\_intelligence": 1150 \} \} \}, "preferred\_assessment": "deep" \} \`\`\`

Quy tắc:

Hai rating độc lập, không cộng\.

Có Deep hợp lệ → dùng Deep làm căn cứ chính\.

Giữ lịch sử tất cả lần làm\.

5\. SKILL TIER — 10 BẬC

\# Tier ID Tên VI Elo range Màu Icon

0 \`tier\_unrated\` Chưa xác định — Xám ❓

1 \`tier\_0\_new\` Mới chơi < 800 Xám nhạt ð±

2 \`tier\_1\_beginner\` Tân binh 800–949 Xanh lá nhạt ð¿

3 \`tier\_2\_below\_avg\` Trung bình yếu 950–1099 Xanh lá ð

4 \`tier\_3\_average\` Trung bình 1100–1249 Xanh dương nhạt ⭐

5 \`tier\_4\_above\_avg\` Trung bình \+ 1250–1399 Xanh dương ⭐⭐

6 \`tier\_5\_good\` Khá 1400–1549 Cam nhạt ð¥

7 \`tier\_6\_very\_good\` Khá \+ 1550–1699 Cam ð¥ð¥

8 \`tier\_7\_semi\_pro\` Bán chuyên 1700–1899 Đỏ nhạt ð

9 \`tier\_8\_pro\` Chuyên nghiệp 1900–2199 Đỏ ð

10 \`tier\_9\_elite\` Đỉnh cao 2200\+ Tím ð

Quy tắc resolver:

Có Deep → dùng Deep\. Chỉ có Quick → dùng Quick \+ flag \`provisional\`\.

Rating rơi đúng biên dưới của tier → tính vào tier đó\.

Tier transition → hiển thị thông báo nhẹ nhàng \(lên tier chúc mừng, xuống tier động viên\)\.

Mô tả tier hiển thị cho khách:

Mới chơi: \*"Mới làm quen môn thể thao, chưa nắm kỹ thuật cơ bản\."\*

Tân binh: \*"Nắm được một vài động tác nền tảng, còn nhiều lỗi khi thi đấu\."\*

Trung bình yếu: \*"Chơi được nhưng thiếu ổn định, lộ rõ điểm yếu khi bị ép\."\*

Trung bình: \*"Xử lý được tình huống thông thường, kỹ thuật nền tảng ổn định\."\*

Trung bình \+: \*"Kiểm soát tốt hơn mặt bằng chung, có điểm mạnh rõ rệt\."\*

Khá: \*"Kỹ thuật ổn định, xử lý được áp lực, bước đầu có chiến thuật\."\*

Khá \+: \*"Đa dạng kỹ thuật, kiểm soát tốt trong thi đấu thực tế\."\*

Bán chuyên: \*"Trình độ thi đấu giải phong trào, kỹ thuật gần hoàn thiện\."\*

Chuyên nghiệp: \*"Trình độ thi đấu giải chuyên, thể lực và kỹ thuật cao\."\*

Đỉnh cao: \*"Trình độ quốc gia/quốc tế, không giới hạn trần\."\*

6\. SKILL RADAR — 8 TRỤC

6\.1\. Cầu lông

\# Trục Nguồn Quick Nguồn Deep

1 Sức mạnh \`smash\` \`smash\`

2 Tốc độ \`footwork\` \`footwork\`

3 Phản xạ \`defense\` 0\.7×\`defense\` \+ 0\.3×\`drive\`

4 Kỹ thuật avg\(\`backhand\`, \`net\_play\`, \`serve\_receive\`\) avg\(\`backhand\`, \`forehand\_clear\`, \`drop\_shot\`, \`net\_play\`, \`serve\_receive\`\)

5 Kiểm soát avg\(\`net\_play\`, \`serve\_receive\`\) avg\(\`net\_play\`, \`drop\_shot\`, \`serve\_receive\`\)

6 Bền bỉ null \(Quick không có câu endurance\) Từ BD\-D09 phụ 4 \(tag \`low\_movement\_endurance\` / \`moderate\_endurance\` / \`good\_endurance\` / \`high\_endurance\`\)

7 Chiến thuật null \(Quick không có\) \`match\_intelligence\`

8 Cân bằng kỹ năng pstdev → \`skill\_balance\_index\` \(xem 6\.4\) pstdev → \`skill\_balance\_index\`

6\.2\. Bóng đá

\# Trục Nguồn Quick Nguồn Deep

1 Sức mạnh \`shooting\` \`shooting\`

2 Tốc độ \`agility\` \`agility\`

3 Phản xạ \`first\_touch\` \`first\_touch\` \+ 0\.5×\`decision\_making\`

4 Kỹ thuật avg\(\`first\_touch\`, \`dribbling\`\) avg\(\`first\_touch\`, \`dribbling\`, \`close\_control\`\)

5 Chuyền bóng \`short\_passing\` avg\(\`short\_passing\`, \`long\_pass\`\)

6 Phòng ngự null \`defensive\_positioning\`

7 Chiến thuật null avg\(\`off\_ball\`, \`decision\_making\`\)

8 Cân bằng kỹ năng pstdev pstdev

6\.3\. Công thức hiển thị

Relative \(mặc định\): \`display = clamp\(50 \+ \(raw \- overall\) / 4, 0, 100\)\` Absolute \(opt\-in\): ánh xạ phi tuyến \(xem bảng bên dưới\)

raw Elo display tuyệt đối

800 25

1200 50

1600 75

2000 90

2400 97

2800\+ ~100

6\.4\. Skill Balance Index \(ĐÃ ĐỔI TÊN từ Trạm 4\)

\`skill\_balance\_index\` — đo độ đồng đều giữa các kỹ năng \(KHÔNG phải đo phong độ thi đấu\)\.

\`\`\`python def compute\_balance\(skill\_ratings\): if len\(skill\_ratings\) < 2: return 50\.0 variance = statistics\.pstdev\(skill\_ratings\.values\(\)\) return max\(0\.0, min\(100\.0, 100\.0 \- variance / 3\.0\)\) \`\`\`

Lưu ý: \`performance\_consistency\` \(đo phong độ thi đấu qua nhiều trận\) là chỉ số KHÁC, chỉ tính khi có Achievement data — không trộn vào Skill Radar\.

6\.5\. Trục thiếu dữ liệu \(ĐÃ SỬA từ Trạm 4\)

\`\`\`json \{ "id": "endurance", "raw\_elo": null, "display": null, "inferred": false, "status": "insufficient\_data", "note": "Làm bài chuyên sâu để có kết quả\." \} \`\`\`

Cấm: Dùng \`overall\_rating × 0\.9\` để thay thế\. Phải hiển thị rõ là chưa có dữ liệu\.

7\. ACHIEVEMENT ASSESSMENT SYSTEM

7\.1\. Công thức AP

\`\`\` AP\_i = B\_i × L\_i × F\_i × C\_i × T\_i × R\_i \`\`\`

Ký hiệu Ý nghĩa Công thức / Bảng

B Điểm thứ hạng \`100 × \(1 \- \(r\-1\)/N\)^1\.5\`

L Hệ số cấp giải club 0\.45 / school\_local 0\.65 / provincial 0\.90 / national 1\.20 / international 1\.45 / continental\_world 1\.75

F Hệ số quy mô \`min\(1\.35, 0\.85 \+ 0\.1 × log2\(N\)\)\`

C Hệ số tham gia Cầu lông: đơn/đôi thực thi đấu = 1\.00, chỉ có tên = 0\.20\. Bóng đá: 70%\+ = 1\.00, 40–70% = 0\.85, 15–40% = 0\.65, >0–15% = 0\.40, chỉ tên = 0\.20

T Hệ số thời gian \`2^\(\-d/730\)\` \(bán rã 2 năm\)

R Giảm trùng lặp Cùng series\+season\+level: 1\.00 / 0\.70 / 0\.50 / 0\.25 \(lần 1/2/3/4\+\)

Tổng AP: \`AP\_current = Σ AP\_i\` — không giới hạn\.

Phân tách bắt buộc:

\`current\_achievement\_score\` \(đã điều chỉnh thời gian, dùng cho tier\)

\`career\_achievement\_score\` \(toàn bộ lịch sử, KHÔNG mất khi T giảm\)

7\.2\. Thưởng cá nhân \(tối đa \+25% AP giải\)

Thành tích Thưởng

Cầu thủ/VĐV xuất sắc nhất \+15%

Vua phá lưới / giải chuyên môn \+10%

Đội hình tiêu biểu \+8%

7\.3\. Achievement Tier — 10 bậc riêng

Cấp Tên AP Gate \(bắt buộc tham gia hoặc đạt giải ở cấp\)

0 Chưa có thành tích 0 —

1 Người tham gia 1–49 club

2 Ghi nhận cấp CLB/Trường 50–149 school\_local

3 Cạnh tranh địa phương 150–349 school\_local

4 Nổi bật cấp địa phương 350–699 provincial

5 Cạnh tranh cấp quốc gia 700–1\.099 national

6 Thành tích quốc gia 1\.100–1\.699 national

7 Huy chương nổi bật quốc gia 1\.700–2\.499 national \(phải có top 3\)

8 Cạnh tranh quốc tế 2\.500–3\.499 international

9 Thành tích quốc tế / Đỉnh cao 3\.500\+ international \(phải có top 3\)

Quy tắc gate: Tier = cấp cao nhất thỏa CẢ \`AP\_threshold\` VÀ \`Competition\_level\_gate\`\. Người có 2000 AP từ giải trường KHÔNG được gọi là thành tích quốc gia\.

Phân biệt bắt buộc trên UI:

"Đã tham gia cấp quốc gia" ≠ "Đạt thành tích cấp quốc gia"

"Hạng ba cấp tỉnh" ≠ "Hạng ba cấp quốc gia" ≠ "Hạng ba cấp quốc tế"

7\.4\. Achievement Radar — 6 trục

\# Trục Công thức

1 Cấp độ thi đấu Ánh xạ cấp cao nhất: club=10, school\_local=25, provincial=45, national=65, international=85, continental=95, world=100

2 Chất lượng thành tích \`100 × Σ\(AP\*\_i × B\_i/100\) / Σ\(AP\*\_i\)\` \(AP\* = AP trước thành phần B\)

3 Ổn định thi đấu \`min\(100, 100 × n\_effective/6\)\` trong 24 tháng

4 Phong độ gần đây \`100 × \(1 \- e^\(\-AP\_12/250\)\)\`

5 Đa dạng nội dung \`min\(100, 100 × k/3\)\` với k = số nội dung khác nhau có xác minh

6 Độ xác thực \`100 × verified / total\_valid\`

Không có thành tích → trả \`null\` toàn bộ, không mặc định 0\.

7\.5\. Verification workflow

4 trạng thái: \`achievement\_pending\` / \`achievement\_verified\` / \`achievement\_rejected\` / \`achievement\_need\_more\_proof\`

Pending KHÔNG cộng vào \`current\_achievement\_score\`\.

Hiển thị riêng: "850 AP chính thức \+ 240 AP đang chờ"\.

Mỗi achievement có \`event\_fingerprint\` để chống trùng\.

7\.6\. Phân loại môn

Cầu lông disciplines: \`badminton\_singles\_men\`, \`badminton\_singles\_women\`, \`badminton\_doubles\_men\`, \`badminton\_doubles\_women\`, \`badminton\_mixed\_doubles\`, \`badminton\_team\`

Bóng đá positions: \`football\_goalkeeper\`, \`football\_center\_back\`, \`football\_full\_back\`, \`football\_defensive\_midfielder\`, \`football\_central\_midfielder\`, \`football\_attacking\_midfielder\`, \`football\_winger\`, \`football\_striker\`, \`football\_forward\`

7\.7\. Không tính AP cho

Trận giao hữu \(chỉ lưu activity log\)

Buổi tập luyện

Tự tổ chức không có xác nhận

7\.8\. Phân loại giải không dựa vào tên

Giải tên "International Tournament" KHÔNG tự động là giải quốc tế\. Phải kiểm tra: đơn vị tổ chức, phạm vi thực tế, danh sách tham dự, tính chính thức\. Admin hoặc \`competition\_events\` table phải xác nhận \`competition\_level\`\.

8\. DATA SCHEMAS

8\.1\. Skill Result Schema

\`\`\`json \{ "assessment": \{ "assessment\_id": "uuid", "user\_id": "uuid", "sport": "badminton", "mode": "deep", "mode\_tag": "assessment\_deep", "status": "completed", "created\_at": "ISO\_DATE", "rating\_system": "elo\_item\_v1", "schema\_version": "v5\.0" \}, "rating": \{ "overall\_rating": 1280, "confidence": "medium", "skill\_ratings": \{ "backhand": 1180, "forehand\_clear": 1220, "smash": 1250, "drop\_shot": 1100, "net\_play": 1110, "drive": 1150, "defense": 960, "serve\_receive": 1200, "footwork": 1100, "match\_intelligence": 1150 \} \}, "tier": \{ "tier\_id": "tier\_4\_above\_avg", "label\_vi": "Trung bình \+", "elo\_range": \[1250, 1399\], "progress\_to\_next": 0\.20, "elo\_to\_next": 120, "next\_tier\_id": "tier\_5\_good", "confidence\_flag": "medium", "source": "deep" \}, "radar": \{ "display\_mode": "relative", "axes": \[ \{"id": "power", "label": "Sức mạnh", "raw\_elo": 1250, "display": 42, "inferred": false, "status": "ok"\}, \{"id": "speed", "label": "Tốc độ", "raw\_elo": 1100, "display": 5, "inferred": false, "status": "ok"\}, \{"id": "reflex", "label": "Phản xạ", "raw\_elo": 1017, "display": \-16, "inferred": false, "status": "ok"\}, \{"id": "technique", "label": "Kỹ thuật", "raw\_elo": 1172, "display": 23, "inferred": false, "status": "ok"\}, \{"id": "control", "label": "Kiểm soát", "raw\_elo": 1137, "display": 14, "inferred": false, "status": "ok"\}, \{"id": "endurance", "label": "Bền bỉ", "raw\_elo": null, "display": null, "inferred": false, "status": "insufficient\_data"\}, \{"id": "tactics", "label": "Chiến thuật", "raw\_elo": 1150, "display": 17, "inferred": false, "status": "ok"\}, \{"id": "balance", "label": "Cân bằng kỹ năng", "raw\_elo": null, "display": 73, "inferred": false, "status": "ok"\} \], "strengths": \["balance", "technique"\], "weaknesses": \["reflex", "speed"\], "missing": \["endurance"\] \}, "profile": \{ "sport\_tag": "sport\_badminton", "assessment\_tag": "assessment\_deep", "skill\_tags": \["strong\_smash", "weak\_defense", "good\_footwork"\], "growth\_tags": \["consistent\_practice", "high\_learning\_awareness"\], "consistency\_flags": \[\] \}, "answers": \[\] \} \`\`\`

8\.2\. Achievement Result Schema

\`\`\`json \{ "achievement\_assessment": \{ "profile\_id": "uuid", "user\_id": "uuid", "sport": "badminton", "assessment\_tag": "assessment\_achievement", "schema\_version": "v5\.0", "updated\_at": "ISO\_DATE" \}, "achievement\_rating": \{ "system": "achievement\_points\_v1", "current\_score": 865, "career\_score": 1040, "score\_cap": null, "verified\_events": 4, "pending\_events": 1 \}, "tier": \{ "tier\_id": "achievement\_provincial", "label\_vi": "Nổi bật cấp tỉnh", "eligibility\_level": "provincial", "next\_tier": "achievement\_national", "progress\_to\_next": 0\.62, "verified": true \}, "event\_summary": \{ "best\_result": "Runner\-up", "highest\_level": "provincial", "latest\_event\_date": "ISO\_DATE" \}, "achievement\_radar": \{ "axes": \[ \{"id": "competition\_level", "value": 45, "verified": true\}, \{"id": "result\_quality", "value": 82, "verified": true\}, \{"id": "consistency", "value": 65, "verified": true\}, \{"id": "recent\_form", "value": 71, "verified": true\}, \{"id": "diversity", "value": 66, "verified": true\}, \{"id": "verification\_quality", "value": 100, "verified": true\} \] \}, "records": \[\], "flags": \[\] \} \`\`\`

8\.3\. Combined Profile Schema

\`\`\`json \{ "user\_id": "uuid", "sports\_profiles": \{ "badminton": \{ "skill": \{ "quick\_rating": 1120, "deep\_rating": 1320, "skill\_tier": "tier\_4\_above\_avg", "skill\_radar": \{\}, "growth\_tags": \["consistent\_practice", "high\_learning\_awareness"\] \}, "achievement": \{ "current\_score": 865, "career\_score": 1040, "achievement\_tier": "achievement\_provincial", "achievement\_radar": \{\}, "verified\_events": 4, "pending\_events": 1 \}, "cross\_check\_flags": \[ "achievement\_without\_deep\_assessment" \] \}, "football": \{ "skill": \{"quick\_rating": null, "deep\_rating": 1180, "skill\_tier": "tier\_3\_average"\}, "achievement": \{"current\_score": 420, "achievement\_tier": "achievement\_local"\} \} \} \} \`\`\`

8\.4\. Database Tables

Kế thừa \(Trạm 2–3\):

\`assessment\_templates\`, \`assessment\_questions\`, \`assessment\_options\`

\`assessment\_attempts\`, \`assessment\_answers\`

\`user\_skill\_profiles\`, \`user\_assessment\_history\`

\`tier\_definitions\`, \`user\_radar\_snapshots\`, \`tier\_history\`

\`product\_recommendation\_logs\`

Trạm 4 thêm:

\`competition\_events\` \(event\_id, event\_name, organizer, sport, competition\_level, start\_date, end\_date, participant\_count, season\_id, competition\_series\_id, official\_source\_url, verification\_status\)

\`user\_achievements\` \(achievement\_id, user\_id, event\_id, sport, discipline, category, rank, field\_size, team\_id, partner\_id, matches\_played, minutes\_played, individual\_awards JSON, verification\_status, evidence\_refs JSON, event\_points, created\_at\)

\`achievement\_verifications\` \(verification\_id, achievement\_id, reviewer\_id, verification\_method, evidence\_status, review\_note, verified\_at, source\_reference\)

\`user\_achievement\_profiles\` \(user\_id, sport, current\_achievement\_score, career\_achievement\_score, achievement\_tier\_id, verified\_event\_count, pending\_event\_count, highest\_competition\_level, last\_updated\_at\)

\`achievement\_score\_history\` \(history\_id, achievement\_id, user\_id, previous\_score, new\_score, score\_delta, calculation\_version, created\_at\)

8\.5\. API Endpoints

Skill:

\`POST /assessments/start\` \(body: sport, mode\)

\`POST /assessments/\{id\}/answers\` \(body: question\_id, selected\_level\)

\`POST /assessments/\{id\}/complete\`

\`GET /assessments/\{id\}/result\`

\`GET /users/\{id\}/skill\-history\`

Achievement:

\`GET /competitions\` \(search\)

\`POST /achievements\`

\`GET /achievements/\{id\}\`

\`PUT /achievements/\{id\}\`

\`POST /achievements/\{id\}/evidence\`

\`POST /achievements/\{id\}/verify\` \(admin only\)

\`GET /users/\{id\}/achievements\`

\`GET /users/\{id\}/achievement\-profile\`

\`GET /users/\{id\}/achievement\-history\`

\`GET /users/\{id\}/combined\-sport\-profile\`

Quy tắc:

User KHÔNG tự đổi được \`verification\_status\` thành \`verified\`\.

Admin mới có quyền xác minh\.

Rate limit: 3 lần làm bài/giờ/môn \(tránh farm rating\)\.

9\. UI/UX SPECIFICATIONS

9\.1\. Screen Flow

\`\`\` \[Home\] → \[Chọn môn: Cầu lông / Bóng đá\] ↓ \[Sport Hub\] → 3 thẻ: ├── Đánh giá nhanh \(2\-4 phút\) ├── Đánh giá chuyên sâu \(8\-12 phút\) └── Khai báo thành tích ↓ \[Tương ứng\] → Kết quả ↓ \[Combined Profile\] \(3 tab: Skill / Achievement / Growth\) ↓ \[Product Recommendation\] \`\`\`

9\.2\. Question Component

Cấu trúc mỗi màn hình câu hỏi: \`\`\` ┌────────────────────────────────────────┐ │ \[← Quay lại\] Câu 3/6 \[Thanh tiến độ\] │ ├────────────────────────────────────────┤ │ \[Tiêu đề ngắn\] │ │ \[Mô tả tình huống 2\-3 dòng\] │ │ │ │ ┌────────────────────────────────────┐ │ │ │ VISUAL \(SVG/Canvas/Animation\) │ │ │ │ ~400×300px, responsive │ │ │ └────────────────────────────────────┘ │ │ │ │ \[Đáp án A\] ──────────────────────── │ │ \[Đáp án B\] ──────────────────────── │ │ \[Đáp án C\] ──────────────────────── │ │ \[Đáp án D\] ──────────────────────── │ │ │ │ \[Câu trước\] \[Câu tiếp →\] │ └────────────────────────────────────────┘ \`\`\`

Quy tắc:

KHÔNG hiển thị Elo sau từng câu \(tránh user điều chỉnh đáp án theo điểm\)\.

Đáp án dạng card có hover/focus, không dùng radio truyền thống\.

Mobile\-first: card stack dọc, visual thu nhỏ ~280×220\.

9\.3\. Visual Instructions — Cầu lông

Câu Vẽ gì SVG/Canvas notes

BD\-Q01 Sân top\-down \+ 4 đường bay từ góc trái cuối sân \`path\` với \`stroke\-dasharray\` cho animation bay\. Labels A/B/C/D ở đầu mỗi đường\.

BD\-Q02 Side\-view, 3 điểm tiếp xúc \+ 3 góc cắm cầu 3 màu: đỏ \(đâm lưới\), vàng \(ngang\), xanh \(cắm 45°\)

BD\-Q03 Cận cảnh lưới, 3 trạng thái cầu Animation: cầu di chuyển qua lại

BD\-Q04 Micro\-animation vợt \(2 frame\) Frame 1: rung 20cm; Frame 2: vung cả tay

BD\-Q05 Top\-down dấu chân 4 pattern di chuyển khác nhau

BD\-Q06 2 sơ đồ nhỏ: giao cầu \+ đón cầu Chia đôi màn hình

BD\-D01→D10 3D view sân \+ highlight vị trí tiếp xúc Dùng \`perspective\` CSS hoặc SVG transform

9\.4\. Visual Instructions — Bóng đá

Câu Vẽ gì Notes

FB\-Q01 3 vòng tròn kiểm soát quanh cầu thủ \(0\.5m/1m/2m\) Màu xanh/vàng/đỏ

FB\-Q02 3 đường chuyền đến vị trí đồng đội Độ chính xác khác nhau

FB\-Q03 Top\-down, hậu vệ chắn phải, 3 hướng xử lý Mũi tên màu

FB\-Q04 2 sơ đồ chân trái/phải song song

FB\-Q05 Khung thành chia 6 vùng \+ 3 hướng sút

FB\-Q06 Đường chạy \+ 2 ngã rẽ 45°/90° \+ chân trụ Icon giày highlight

FB\-D01→D12 Top\-down, highlight vùng/bóng/vị trí Tương tự

9\.5\. Result Screen — Skill

\`\`\` ┌────────────────────────────────────────┐ │ HỒ SƠ KỸ NĂNG CỦA BẠN │ │ │ │ \[Tier Badge: Trung bình \+\] ⭐⭐ │ │ Độ tin cậy: Trung bình │ │ \[████████░░\] còn 120 Elo đến Khá │ │ │ │ ┌──────────────────────────────────┐ │ │ │ RADAR CHART \(8 trục\) │ │ │ │ Sức mạnh │ │ │ │ ▲ │ │ │ │ Cân bằng├───┤ Tốc độ │ │ │ │ │ │ │ │ │ │ Chiến thuật───Phản xạ │ │ │ │ │ │ │ │ │ │ Bền bỉ └───┘ Kiểm soát │ │ │ │ Kỹ thuật │ │ │ └──────────────────────────────────┘ │ │ │ │ \[Tương đối / Tuyệt đối\] \[Xuất ảnh\] │ │ │ │ ⚠ Thiếu dữ liệu: Bền bỉ │ │ → Làm bài chuyên sâu để có kết quả │ │ │ │ ĐIỂM MẠNH: Cân bằng kỹ năng, Kỹ thuật │ │ CẦN CẢI THIỆN: Phản xạ, Tốc độ │ │ │ │ \[Xem sản phẩm phù hợp\] │ │ \[Làm bài chuyên sâu\] │ └────────────────────────────────────────┘ \`\`\`

9\.6\. Achievement Declaration Screens

Màn 1 — Chọn môn: 2 thẻ có số lượng thành tích đã khai báo\.

Màn 2 — Thêm thành tích: Chọn giải có sẵn / tìm kiếm / tạo mới; nhập nội dung, thứ hạng, quy mô, thông tin cá nhân \(vị trí, phút thi đấu, giải thưởng cá nhân\)\.

Màn 3 — Tải minh chứng: Upload ảnh/PDF, nhập URL chính thức, ghi chú\.

Màn 4 — Xem trước: Điểm thứ hạng dự kiến, hệ số nhận diện được, dữ liệu còn thiếu, trạng thái xác minh \(KHÔNG hiện AP chính thức trước khi verified\)\.

Màn 5 — Kết quả: Tổng AP, tier, achievement radar, thành tích nổi bật, đang chờ xác minh, skill rating để đối chiếu\.

9\.7\. Combined Profile

3 tab: Skill / Achievement / Growth\. Không gộp radar\. Hai môn độc lập \(có thể chỉ hoàn thiện 1 môn\)\.

9\.8\. Design System

Màu: Dùng palette semantic, KHÔNG dùng màu để phân biệt đáp án \(dùng label \+ icon\)\.

Typography: Body 16px, heading 20\-24px, mobile scale 0\.85\.

Accessibility: Contrast ≥ 4\.5:1, keyboard nav đầy đủ, ARIA labels cho radar và visual\.

Responsive: Breakpoints 320/768/1024/1440\.

Animation: Nhẹ, ≤ 300ms, không loop vô tận, có \`prefers\-reduced\-motion\`\.

10\. PRODUCT RECOMMENDATION ENGINE

10\.1\. Inputs \(theo thứ tự ưu tiên\)

Thông số sản phẩm phù hợp \(weight, stiffness, outsole, upper\)

Kích thước & vừa vặn \(size, form chân: bè/thon\)

Điều kiện mặt sân \(turf/grass/futsal cho bóng đá; đơn/đôi cho cầu lông\)

Ngân sách

Lối chơi \(tấn công/phòng thủ/cân bằng\)

Điểm yếu kỹ năng \(từ skill tags \+ radar weaknesses\)

Thành tích & mức độ thi đấu \(context, KHÔNG phải yếu tố quyết định\)

Growth tags \(context cho chọn dòng sản phẩm — VD người mới nên chọn vợt dẻo\)

10\.2\. Scoring

\`\`\` Score = w1 × ProductSpecMatch \- w2 × FitMatch \- w3 × SurfaceMatch \- w4 × BudgetMatch \- w5 × PlaystyleMatch \- w6 × WeaknessSupport \- w7 × TierContext \`\`\`

Trọng số khởi tạo: w1=0\.25, w2=0\.20, w3=0\.15, w4=0\.10, w5=0\.10, w6=0\.15, w7=0\.05\.

Tier chỉ là context nhẹ \(w7=0\.05\)\. KHÔNG được dùng Tier làm bộ lọc cứng\. Người tier thấp vẫn có thể mua sản phẩm cao cấp; người tier cao vẫn có thể thích sản phẩm thoải mái\.

10\.3\. Explainable Recommendation — Template

\`\`\` "Bạn đang ở tier \[X\]\. Hồ sơ cho thấy \[điểm mạnh\] là thế mạnh, nhưng \[điểm yếu\] còn hạn chế\. Sản phẩm này có \[đặc tính\] phù hợp với \[lý do cụ thể liên quan đến hồ sơ\]\." \`\`\`

Cấm: Bịa số liệu định lượng \("tăng 15%", "giảm 20% chấn thương"\) nếu không có dữ liệu chứng minh\.

10\.4\. Fallback

Không có sản phẩm khớp 100% → trả top 3 sản phẩm gần nhất \+ giải thích "đánh đổi"\.

Người chưa làm Skill nhưng có Achievement → dùng Achievement tier \+ tag vị trí/nội dung để gợi ý \(kèm tag \`recommendation\_from\_achievement\_only\`\)\.

Người chưa có gì → gợi ý theo môn \+ ngân sách \+ "sản phẩm an toàn" \(phổ thông, dễ dùng\)\.

11\. CROSS\-CHECK & CONSISTENCY

11\.1\. Flags

\`inconsistent\_profile\`: chênh lệch bất thường giữa các skill liên quan

\`needs\_cross\_check\`: cần câu xác minh

\`low\_answer\_confidence\`: trả lời quá nhanh \(< 3s/câu\)

\`achievement\_without\_deep\_assessment\`: có thành tích cao, chưa làm Deep

\`skill\_without\_competition\_record\`: skill cao, không có thành tích

\`achievement\_skill\_gap\`: thành tích cao nhưng skill thấp — KHÔNG kết luận gian lận

\`achievement\_needs\_review\`: cần admin xem lại

11\.2\. Cross\-check câu hỏi mẫu

Khi phát hiện \`inconsistent\_profile\` \(VD: backhand yếu nhưng smash tự nhận mạnh\), chèn câu xác minh:

Cầu lông:

\*Khi đối thủ ép bạn về góc trái tay cuối sân, sau đó bất ngờ đưa cầu bổng ra giữa sân — bạn thường xử lý được cú đập cầu ở tình huống này không?\* A\. Không, vì chưa thoát được vị trí trái tay\. B\. Đập được nhưng thường yếu hoặc lệch\. C\. Đập được nhưng không ổn định\. D\. Đập được và vẫn kiểm soát hướng\.

Đáp án A/B → hạ nhẹ Sức mạnh \+ gắn \`cross\_check\_confirmed\`\.

Bóng đá: tương tự, hỏi tình huống kết hợp first touch yếu \+ passing mạnh\.

11\.3\. Không tự động kết luận gian lận

Chênh lệch giữa achievement và skill KHÔNG phải bằng chứng gian lận\. Chỉ gắn flag để review\.

12\. VERSIONING & RECALCULATION

Mọi công thức phải có version:

\`elo\_item\_v1\`

\`achievement\_points\_v1\`

\`radar\_metrics\_v1\`

\`tier\_definitions\_v1\`

\`schema\_version: "v5\.0"\`

Khi đổi hệ số:

KHÔNG xóa điểm cũ\.

KHÔNG sửa dữ liệu gốc\.

Tạo version mới\.

Lưu lý do\.

Có khả năng tính lại từ \`assessment\_answers\` / \`user\_achievements\`\.

13\. BACKLOG — NHIỆM VỤ CHO CÁC AI TIẾP THEO

13\.1\. UI/UX Agent

Cần làm:

Prototype 4 trang khảo sát \(BD\-Q, BD\-D, FB\-Q, FB\-D\) \+ flow Achievement\.

Component Question Card \+ Radar Chart \(SVG thuần\) \+ Tier Badge \+ Progress bar\.

Màn hình Combined Profile 3 tab\.

Màn hình Achievement declaration 5 bước\.

Design system \(màu, typography, spacing, icon\)\.

Test responsive mobile 320px\.

Chưa làm:

Chưa có prototype Figma/code\.

Chưa quyết định radar vẽ bằng SVG thuần hay Recharts\.

Chưa test mobile kỹ\.

Chưa có animation chuyển tier\.

Chưa có design cho trạng thái "chưa đủ dữ liệu" \(null axes\)\.

Chưa có share card image\.

13\.2\. Frontend Agent

Cần làm:

Viết component \`\` radar với animation dùng \`stroke\-dasharray\`\.

Component câu hỏi có sub\-question conditional rendering\.

Animation quỹ đạo cầu/bóng bằng SVG\.

Form khai báo thành tích \(multi\-step\)\.

Upload minh chứng \(drag\-drop, preview\)\.

Chưa làm:

Chưa có code\.

Chưa chốt animation nào dùng SVG, animation nào dùng CSS\.

Chưa có library ảnh huy chương/giải đấu\.

13\.3\. Backend Agent

Cần làm:

Elo rating engine \(mục 4\)\.

Tier resolver \(mục 5\)\.

Radar calculator \(mục 6\) — xử lý null đúng cách\.

Adaptive question selector\.

AP calculator \(mục 7\.1\)\.

Achievement Tier resolver với gate \(mục 7\.3\)\.

Achievement radar calculator \(mục 7\.4\)\.

Verification workflow \+ event fingerprint\.

Resume logic khi user thoát giữa chừng\.

Rate limiting\.

API endpoints \(mục 8\.5\)\.

Chưa làm:

Chưa có code\.

Chưa có migration script\.

Chưa có phân quyền reviewer\.

Chưa có hệ thống khiếu nại verification\.

Chưa có khóa điểm khi đang kiểm tra lại\.

Chưa có cơ chế detect rating manipulation\.

13\.4\. Data Science Agent

Cần làm:

Hiệu chỉnh K\-factor \(Quick 16 / Deep 24 hiện là giả định\)\.

Kiểm định độ khó câu hỏi \(800–1600 là giả định\)\.

Hiệu chỉnh ranh giới tier \(dựa trên phân bố Elo thực tế\)\.

Hiệu chỉnh trọng số radar \(hiện bằng nhau\)\.

Kiểm định công thức balance \(variance/3\)\.

Hiệu chỉnh AP coefficients \(L, F, T half\-life, R\)\.

Hiệu chỉnh achievement tier thresholds\.

Đo fairness giữa đơn/đôi/đồng đội\.

Ground truth với HLV\.

Chưa làm:

Chưa có dữ liệu thực\.

Chưa có ground truth\.

Chưa có \`opponent\_strength\_factor\` \(chỉ nghiên cứu, chưa kích hoạt\)\.

Chưa kiểm định Dunning\-Kruger\.

13\.5\. Sports Specialist Agent

Cần làm:

Rà soát toàn bộ câu hỏi 2 môn — đúng kỹ thuật?

Xác nhận 8 trục skill radar \+ 6 trục achievement radar cho từng môn\.

Xác nhận trọng số radar cho từng môn\.

Bổ sung câu hỏi: Endurance \(BD\-D09 phụ 4 đã có, cần confirm\), Drop shot accuracy, Defensive positioning \(football đã có FB\-D09\)\.

Danh mục giải đấu chính thức tại VN\.

Quy tắc giải vòng tròn/vòng bảng/loại trực tiếp\.

Hệ thống thống kê riêng cho thủ môn\.

Phân biệt đánh đơn vs đánh đôi cầu lông\.

Câu hỏi cross\-check cho từng cặp kỹ năng dễ mâu thuẫn\.

Kiểm tra tier description đúng thực tế VN \(đặc biệt "Bán chuyên"\)\.

Chưa làm:

Chưa có bộ câu hỏi thủ môn\.

Chưa phân biệt hoàn toàn đơn/đôi\.

Chưa có đánh giá video/quan sát động tác\.

13\.6\. Product Recommendation Agent

Cần làm:

Ma trận ưu tiên 7 thành phần \(mục 10\.2\)\.

Bảng ánh xạ tag → thuộc tính sản phẩm\.

Template Explainable Recommendation cho từng tier \+ tổ hợp radar\.

Fallback logic\.

Kiểm tra SurfaceFit cho bóng đá\.

Chưa làm:

Chưa có bảng ánh xạ đầy đủ\.

Chưa A/B test\.

Chưa có feedback sau mua\.

Chưa có cơ chế ưu tiên ngân sách/sở thích\.

13\.7\. Database & Security Agent

Cần làm:

Migration từ Trạm 2 sang v5\.0\.

Bảng achievement \+ verification \+ audit log\.

Phân quyền reviewer\.

Chính sách lưu trữ minh chứng\.

GDPR / Nghị định 13/2023/NĐ\-CP compliance\.

Cơ chế xóa dữ liệu theo yêu cầu\.

Chưa làm:

Chưa có chính sách lưu trữ\.

Chưa có audit log đầy đủ\.

Chưa có ẩn PII trong minh chứng công khai\.

Chưa có cơ chế xóa dữ liệu\.

13\.8\. Copywriting Agent

Cần làm:

Viết mô tả tier \(không xúc phạm\)\.

Viết thông báo tier transition\.

Viết tooltip cho \`inferred: true\` và \`insufficient\_data\`\.

Viết template Explainable Recommendation\.

Viết CTA\.

Viết glossary ngắn về Elo \(không thuật ngữ khô khan\)\.

Chưa làm:

Chưa có glossary thống nhất\.

Chưa có tone of voice cho từng tier\.

Chưa có bản tiếng Anh\.

14\. THỨ TỰ TRIỂN KHAI \(PRIORITY\)

Ưu tiên Công việc Agent

P0 Chốt K\-factor, độ khó câu hỏi, hệ số AP Data Science

P0 Backend: Elo engine \+ Tier resolver \+ AP calculator Backend

P0 Backend: Verification workflow Backend \+ Security

P0 Sports: confirm câu hỏi 2 môn Sports Specialist

P1 UI: 4 trang khảo sát \+ Achievement flow UI/UX

P1 Frontend: SVG radar \+ câu hỏi component Frontend

P1 Backend: Achievement radar \+ Combined profile Backend

P2 Product: ma trận gợi ý Product Agent

P2 Database: migration \+ tier history Database

P2 Copywriting: template \+ tooltip Copywriting

P3 Hiệu chỉnh hệ số bằng dữ liệu thực Data Science

P3 A/B test \+ feedback loop Data Science \+ Product

15\. ĐIỀU KIỆN NGHIỆM THU

Module được coi là hoàn chỉnh khi:

Skill:

 Có 4 ngân hàng câu hỏi \(BD\-Q, BD\-D, FB\-Q, FB\-D\) đầy đủ nội dung \+ visual spec\.

 Elo engine tính được, K\-factor đúng \(Quick 16 / Deep 24\)\.

 Tier resolver 10 bậc hoạt động, có confidence flag\.

 Skill radar 8 trục xử lý đúng null\.

 Growth tags tách riêng, không cộng vào Elo\.

Achievement:

 Form khai báo thành tích multi\-step\.

 AP calculator \+ Achievement tier resolver với gate\.

 Verification workflow 4 trạng thái\.

 Achievement radar 6 trục\.

 Career score tách khỏi current score\.

Hệ thống:

 Combined profile 3 tab, 2 môn độc lập\.

 Product recommendation không dùng tier làm filter cứng\.

 Cross\-check flags\.

 Versioning \+ recalc\.

 Bộ test tối thiểu \(10 test trong Trạm 4 mục 34\)\.

Bộ test bắt buộc:

Hai người cùng thứ hạng khác cấp giải → khác AP\.

Hai người cùng cấp giải khác quy mô → khác AP\.

Cầu thủ dự bị ≠ cầu thủ đá chính\.

Achievement pending KHÔNG cộng vào current score\.

Cùng achievement khai 2 lần → không tính 2 lần\.

Achievement cũ vẫn tồn tại trong career score\.

Nhiều giải cấp thấp ≠ thành tích quốc tế\.

Huy chương quốc gia phải lưu đúng dù AP chưa đủ\.

2 môn có 2 hệ thống AP độc lập\.

Đổi công thức → recalc được từ dữ liệu gốc\.

16\. THÔNG ĐIỆP BÀN GIAO

Đây là bản đặc tả cuối cùng \(v5\.0\), hợp nhất toàn bộ 4 trạm phát triển\. AI xây dựng web có thể đọc từ đầu đến cuối và triển khai trực tiếp mà không cần tham chiếu bất kỳ tài liệu nào khác\.

6 quy tắc BẤT BIẾN không được vi phạm khi triển khai

Ba hệ thống độc lập: Skill Elo / Achievement Points / Growth Tags\. Không cộng chéo\. Không dùng cái này suy ra cái kia\.

Không đặt trần: Elo và AP đều không giới hạn\. Nhưng phải có câu hỏi/giải đấu tương ứng trong ngân hàng để lên cao có ý nghĩa\.

Không bịa dữ liệu: Radar thiếu nguồn → \`null\` \+ \`status: insufficient\_data\`\. Không dùng \`overall × 0\.9\` thay thế\. Không dùng Growth Tags suy ra Endurance\.

Không hiển thị số thô cho khách phổ thông: Chỉ hiện Tier \+ Radar\. Elo/AP thô nằm trong "Chi tiết nâng cao"\.

Achievement phải có xác thực: Pending không cộng vào current score\. User không tự đổi được \`verified\`\. Tier gate phải kiểm tra cả AP threshold VÀ competition level\.

Tier không phải bộ lọc cứng khi gợi ý sản phẩm: Tier chỉ là context\. Thông số sản phẩm \+ fit \+ mặt sân \+ ngân sách \+ lối chơi \+ điểm yếu kỹ năng mới là yếu tố chính\.

3 câu chốt cho AI xây dựng

"Thành tích và kỹ năng là hai câu chuyện khác nhau, kể song song, không cộng vào nhau\."

"Nếu không có dữ liệu, hãy nói không có dữ liệu\. Đừng bịa ra con số\."

"Sản phẩm được gợi ý vì phù hợp — không phải vì khách hàng đạt giải cao hay tier cao\."

HẾT BÀN GIAO v5\.0

\*Tài liệu này là bản hợp nhất cuối cùng\. Mọi tham chiếu đến "Trạm 1/2/3/4" trong các file cũ đều được thay thế bởi tài liệu này\. Chuyển sang giai đoạn triển khai, kiểm thử và hiệu chỉnh bằng dữ liệu thực tế\.\*

## <a id="_j5wou2d6w9w6"></a>T17\#18 \(28,225 ký tự\)

E\-BANK\. Thêm bộ câu hỏi Cầu lông đôi, Bóng đá và gợi ý vị trí\.

ĐỌC TRƯỚC \(không sửa\): ScenarioCourt\.tsx \(kiểu vẽ sân, màu, nút\), SportDnaQuiz\.tsx \(màn hub\), lib/sportdna\.ts \(cách lưu localStorage\)\.

ĐƯỢC TẠO/SỬA:

Tạo mới src/lib/sportdna\-bank\.ts: dán NGUYÊN file đính kèm, không sửa logic\.

Tạo mới src/app/\(frontend\)/sportdna/BankCourt\.tsx và PositionQuiz\.tsx\.

Sửa SportDnaQuiz\.tsx: chỉ thêm 3 nút ở hub \(Cầu lông đôi 2D; Bóng đá 2D; Gợi ý vị trí bóng đá\), dùng đúng class nút hiện có\. \(Đường dẫn là đề xuất theo cấu trúc đã đọc; nếu thư mục khác, DỪNG và báo\.\) CẤM: scenario\-engine\.ts, ScenarioCourt\.tsx, collections, cong\-dong, styles\.css \(không sửa style có sẵn; style mới đặt tên bắt đầu bằng "bank\-"\)\.

BankCourt \(props: sport, onClose\):

Mỗi phiên lấy pickSession\(sport, 6\)\.

Vẽ SVG theo sport\. Cầu lông: sân dọc tỉ lệ 6,1:13,4, lưới tại y = 0,5, viewBox 0 0 100 220 \(x×100, y×220\)\. Bóng đá: sân dọc 68:105 có vạch giữa sân, vòng cấm, khung thành, viewBox 0 0 100 154\. Vẽ actors: tròn màu theo team \(me có viền nổi bật, partner, opp, ball nhỏ\) kèm nhãn\.

KHÔNG hiện cue trước khi trả lời \(cue làm lộ đáp án\)\.

Hiện prompt và danh sách hành động dạng nút \(KHÔNG hiện fit\)\. Hard\-fail trông giống mọi nút khác\.

Nếu hành động chọn không có noTarget và sc\.targets\.length > 0: vẽ các target thành điểm bấm được \(không hiện score\), chọn một rồi bấm "Chốt"\. Ngược lại chốt luôn\.

Sau khi chốt, gọi scoreScenario\. Hiện: điểm \(%\), nhãn "Sai cơ bản" nếu hardFail, nhãn "Bạn rơi vào đáp án dễ nhầm" kèm trap\.why nếu trapped, đáp án tốt nhất \(hành động và vùng có điểm cao nhất\), danh sách cue, explain\. Nút "Câu tiếp"\.

Rating theo từng skill: bắt đầu 1000, cập nhật bằng updateRating\(r, s, sc\.difficulty\)\. Màn tổng kết: điểm trung bình, rating từng skill, ghi chú "kết quả mang tính tham khảo"\.

Lưu vào localStorage khóa boai\-sportdna\-bank\-v1 theo dạng \{ \[sport\]: \{ ratings, history \(tối đa 20\) \} \}, bọc try/catch\.

Mobile: vùng bấm tối thiểu 40px, sân không tràn ngang\. PositionQuiz: dùng POSITION\_QUESTIONS và suggestRole; hiện vị trí gợi ý, bảng xếp hạng top 3, ghi rõ "gợi ý, không cộng ELO"\. Mọi chữ hiển thị là tiếng Việt có dấu\. Không dùng thư viện ngoài\.

NGHIỆM THU: \(1\) 3 nút hoạt động, đóng được\. \(2\) Chơi hết 6 câu mỗi chế độ, tổng kết hiện đúng\. \(3\) Tải lại trang, dữ liệu còn\. \(4\) Không file ngoài danh sách bị đổi\. \(5\) Build chạy được\.

// SportDNA question bank \(quick build\): badminton doubles \+ football // Quy uoc toa do chuan hoa x,y trong \[0,1\]: // \- badminton\_doubles: y=0 la baseline doi thu, y=0\.5 la luoi, y=1 la baseline cua ban\. Doi thu o nua tren\. // \- football: y=0 la khung thanh doi thu \(ben tren\), y=1 la khung thanh cua ban\. Doi ta tan cong huong len\. // Diem mot cau: S = fit x targetScore \(0\.\.1\)\. fit = 0 la hard\-fail \(sai co ban\)\.

export type Sport = 'badminton\_doubles' | 'football' export type Phase = 'attacking' | 'neutral' | 'defending' export type Team = 'me' | 'partner' | 'opp' | 'ball' export interface Actor \{ team: Team; label: string; x: number; y: number \} export interface Action \{ id: string; label: string; fit: number; noTarget?: boolean \} export interface Target \{ id: string; label: string; x: number; y: number; score: number \} export interface Scenario \{ id: string; sport: Sport; title: string; phase: Phase; role: string; skill: string difficulty: number; prompt: string; cue: string\[\] actors: Actor\[\]; actions: Action\[\]; targets: Target\[\] trap: \{ kind: 'action' | 'target'; id: string; why: string \} explain: string; mirrorOf?: string \}

type RA = \[Team, string, number, number\] type RAct = \[string, string, number, boolean?\] type RT = \[string, string, number, number, number\] interface Raw \{ id: string; sport: Sport; title: string; phase: Phase; role: string; skill: string difficulty: number; prompt: string; cue: string\[\] actors: RA\[\]; actions: RAct\[\]; targets: RT\[\] trap: Scenario\['trap'\]; explain: string; mirrorOf?: string \} function S\(r: Raw\): Scenario \{ return \{ id: r\.id, sport: r\.sport, title: r\.title, phase: r\.phase, role: r\.role, skill: r\.skill, difficulty: r\.difficulty, prompt: r\.prompt, cue: r\.cue, actors: r\.actors\.map\(\(\[team, label, x, y\]\) => \(\{ team, label, x, y \}\)\), actions: r\.actions\.map\(\(\[id, label, fit, noTarget\]\) => \(\{ id, label, fit, noTarget: \!\!noTarget \}\)\), targets: r\.targets\.map\(\(\[id, label, x, y, score\]\) => \(\{ id, label, x, y, score \}\)\), trap: r\.trap, explain: r\.explain, mirrorOf: r\.mirrorOf, \} \}

const BD: Sport = 'badminton\_doubles' const FB: Sport = 'football'

export const SCENARIOS: Scenario\[\] = \[ // \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- CAU LONG DOI \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- S\(\{ id: 'DB01', sport: BD, title: 'Smash vào khoảng giữa', phase: 'attacking', role: 'Người cuối sân \(tấn công\)', skill: 'doubles\_attack', difficulty: 1150, prompt: 'Cầu bổng cao ngay trước mặt bạn\. Hai đối thủ đứng song song giữa sân, partner đã lên giữ lưới\. Chọn cú đánh và điểm rơi\.', cue: \['Hai đối thủ đứng song song \(side by side\)', 'Khoảng giữa hai người rộng, khó che', 'Partner giữ lưới, bạn có thời gian chuẩn bị'\], actors: \[\['me', 'Bạn', 0\.40, 0\.84\], \['partner', 'Partner', 0\.62, 0\.60\], \['opp', 'Đối thủ A', 0\.28, 0\.26\], \['opp', 'Đối thủ B', 0\.72, 0\.26\], \['ball', 'Cầu', 0\.43, 0\.76\]\], actions: \[\['smash', 'Smash \(đập cầu\)', 1\], \['drop', 'Cắt cầu \(drop\)', 0\.55\], \['clear', 'Phông cầu cao sâu', 0\.4\], \['drive', 'Drive phẳng', 0\.3\]\], targets: \[\['M\-C', 'Khoảng giữa hai người', 0\.50, 0\.28, 1\], \['M\-L', 'Vào người A', 0\.28, 0\.28, 0\.4\], \['M\-R', 'Vào người B', 0\.72, 0\.28, 0\.4\], \['R\-L', 'Góc cuối trái', 0\.15, 0\.08, 0\.55\], \['R\-R', 'Góc cuối phải', 0\.85, 0\.08, 0\.55\], \['F\-C', 'Sát lưới giữa', 0\.50, 0\.40, 0\.3\]\], trap: \{ kind: 'target', id: 'R\-L', why: 'Quen đánh đơn: smash ra biên\. Ở đánh đôi hàng thủ song song che biên tốt, khoảng giữa mới là điểm yếu\.' \}, explain: 'Đội hình song song luôn hở khoảng giữa hai người vì mỗi người nghĩ là của người kia\. Smash vào giữa ép họ đỡ nhau\.', \}\), S\(\{ id: 'DB02', sport: BD, title: 'Phòng thủ smash vào thân', phase: 'defending', role: 'Phòng thủ bên trái', skill: 'doubles\_defense', difficulty: 1300, prompt: 'Đối thủ đập mạnh vào bạn, cầu thấp và nhanh\. Người ở lưới đối thủ đứng bên phải\. Chọn cách đỡ và điểm rơi\.', cue: \['Cầu thấp hơn lưới, tốc độ cao', 'Người ở lưới đối thủ đứng bên phải \(x khoảng 0,68\)', 'Partner cùng hàng, đỡ khoảng bên phải'\], actors: \[\['me', 'Bạn', 0\.30, 0\.78\], \['partner', 'Partner', 0\.70, 0\.78\], \['opp', 'Người đập', 0\.50, 0\.12\], \['opp', 'Người giữ lưới', 0\.68, 0\.38\], \['ball', 'Cầu', 0\.36, 0\.74\]\], actions: \[\['block', 'Chặn ngắn sát lưới', 1\], \['drive', 'Đỡ phẳng chéo', 0\.65\], \['lift', 'Nâng cao cuối sân', 0\.5\], \['smash', 'Đập trả', 0\]\], targets: \[\['F\-L', 'Lưới bên trái \(xa người lưới\)', 0\.25, 0\.43, 1\], \['F\-R', 'Lưới bên phải \(gần người lưới\)', 0\.72, 0\.43, 0\.25\], \['M\-C', 'Giữa sân', 0\.50, 0\.28, 0\.55\], \['R\-C', 'Cuối sân giữa', 0\.50, 0\.08, 0\.35\], \['R\-L', 'Cuối sân trái', 0\.20, 0\.08, 0\.45\]\], trap: \{ kind: 'action', id: 'lift', why: 'Bị đập là nâng cao: đưa cầu cho người đập đập tiếp\. Chặn ngắn vào chỗ trống làm đối thủ mất nhịp\.' \}, explain: 'Đập trả là không thể vì cầu thấp hơn lưới \(hard\-fail\)\. Chặn ngắn ra xa người giữ lưới là lựa chọn tốt nhất\.', \}\), S\(\{ id: 'DB03', sport: BD, title: 'Ai lấy cầu giữa hai người?', phase: 'neutral', role: 'Phòng thủ bên trái', skill: 'rotation', difficulty: 1200, prompt: 'Cầu rơi đúng đường giữa hai bạn, thấp ngang thân\. Bạn và partner đứng song song\.', cue: \['Cầu rơi đúng đường giữa', 'Cầu nằm bên thuận tay của partner \(đứng bên phải, ngay sát cầu\)', 'Bạn vừa lùi lên, chưa vững thế'\], actors: \[\['me', 'Bạn', 0\.30, 0\.76\], \['partner', 'Partner', 0\.66, 0\.76\], \['ball', 'Cầu', 0\.52, 0\.73\], \['opp', 'Đối thủ A', 0\.35, 0\.20\], \['opp', 'Đối thủ B', 0\.65, 0\.20\]\], actions: \[\['yield', 'Gọi "của partner" và lùi lấp khoảng trống', 1\], \['take', 'Gọi "của tôi" và đánh', 0\.55\], \['back', 'Lùi xa nhường cầu nhưng không báo', 0\.3\], \['freeze', 'Đứng yên chờ xem', 0\]\], targets: \[\], trap: \{ kind: 'action', id: 'take', why: 'Cầu gần mình thì mình đánh\. Trong đôi, cầu đường giữa thuộc người ở thế thuận tay tốt hơn, và phải gọi to\.' \}, explain: 'Đứng yên là hard\-fail: không ai lấy cầu\. Nhường cho người ở thế tốt và gọi rõ giữ đội hình không bị hở\.', \}\), S\(\{ id: 'DB04', sport: BD, title: 'Giao cầu khi người nhận chồm lên', phase: 'neutral', role: 'Người giao cầu', skill: 'serve\_receive', difficulty: 1100, prompt: 'Bạn giao cầu\. Người nhận đang chồm người về phía lưới\.', cue: \['Người nhận chồm về trước, trọng tâm dồn vào mũi chân', 'Người đứng sau ở xa, không bọc cầu ngắn', 'Vạch giao sau của đôi nằm trong biên cuối sân \(khoảng 0,76 m\)'\], actors: \[\['me', 'Bạn \(giao cầu\)', 0\.55, 0\.66\], \['partner', 'Partner', 0\.40, 0\.80\], \['opp', 'Người nhận \(chồm trước\)', 0\.58, 0\.40\], \['opp', 'Người sau', 0\.30, 0\.18\]\], actions: \[\['flick', 'Giao bổng nhanh \(flick\) qua đầu', 1\], \['short', 'Giao ngắn thấp', 0\.5\], \['drive', 'Giao phẳng nhanh', 0\.25\], \['long\_single', 'Giao thẳng cuối sân như đánh đơn', 0\]\], targets: \[\['B\-C', 'Cuối ô giao, gần đường giữa', 0\.58, 0\.10, 1\], \['B\-S', 'Cuối ô giao, sát biên', 0\.85, 0\.10, 0\.7\], \['F\-T', 'Sát vạch giao ngắn', 0\.58, 0\.38, 0\.35\]\], trap: \{ kind: 'action', id: 'short', why: 'Giao ngắn là an toàn nhất: sai khi người nhận chồm lên, họ sẽ bọc liền tay\.' \}, explain: 'Giao thẳng cuối sân như đánh đơn là hard\-fail \(ra ngoài vạch giao sau của đôi\)\. Khi người nhận chồm, flick đánh vào thế sai chân của họ\.', \}\), S\(\{ id: 'DB04b', sport: BD, title: 'Giao cầu khi người nhận đứng lùi', phase: 'neutral', role: 'Người giao cầu', skill: 'serve\_receive', difficulty: 1100, mirrorOf: 'DB04', prompt: 'Bạn giao cầu\. Lần này người nhận đứng lùi, trọng tâm đặt về sau\.', cue: \['Người nhận đứng lùi xa vạch, trọng tâm đặt sau', 'Người đứng sau đứng gần, sẵn sàng bọc cầu bổng', 'Giao bổng dễ bị đập xuống'\], actors: \[\['me', 'Bạn \(giao cầu\)', 0\.55, 0\.66\], \['partner', 'Partner', 0\.40, 0\.80\], \['opp', 'Người nhận \(lùi xa\)', 0\.58, 0\.30\], \['opp', 'Người sau', 0\.45, 0\.14\]\], actions: \[\['short', 'Giao ngắn thấp', 1\], \['flick', 'Giao bổng nhanh \(flick\) qua đầu', 0\.35\], \['drive', 'Giao phẳng nhanh', 0\.25\], \['long\_single', 'Giao thẳng cuối sân như đánh đơn', 0\]\], targets: \[\['F\-T', 'Sát vạch giao ngắn', 0\.58, 0\.38, 1\], \['B\-C', 'Cuối ô giao, gần đường giữa', 0\.58, 0\.10, 0\.3\], \['B\-S', 'Cuối ô giao, sát biên', 0\.85, 0\.10, 0\.3\]\], trap: \{ kind: 'action', id: 'flick', why: 'Giao bổng cho ngầu: khi người nhận đứng lùi, flick bị đập thẳng xuống\.' \}, explain: 'Cùng một cú giao, đổi người nhận chồm trước và đứng lùi thì đáp án đổi ngược\. Đây là cặp gương DB04 để kiểm tra nhất quán\.', \}\), S\(\{ id: 'DB05', sport: BD, title: 'Bọc cầu bổng ngang lưới', phase: 'attacking', role: 'Người giữ lưới', skill: 'net\_play', difficulty: 1250, prompt: 'Đối thủ nâng cầu chậm, ngang lưới và cao hơn mép lưới\. Bạn đang ở lưới\.', cue: \['Cầu cao hơn mép lưới, rơi chậm', 'Người giữ lưới đối thủ đứng bên trái \(x khoảng 0,25\)', 'Người sau đối thủ đứng chính giữa cuối sân'\], actors: \[\['me', 'Bạn \(lưới\)', 0\.58, 0\.58\], \['partner', 'Partner', 0\.35, 0\.84\], \['opp', 'Người giữ lưới', 0\.25, 0\.38\], \['opp', 'Người sau', 0\.50, 0\.12\], \['ball', 'Cầu', 0\.60, 0\.55\]\], actions: \[\['kill', 'Tạt/đập xuống \(kill\)', 1\], \['push', 'Đẩy phẳng', 0\.6\], \['net', 'Bỏ nhỏ sát lưới', 0\.5\], \['lift', 'Nâng cao', 0\.2\], \['clear', 'Đánh cao sâu', 0\]\], targets: \[\['M\-R', 'Giữa sân bên phải \(xa cả hai người\)', 0\.80, 0\.28, 1\], \['F\-R', 'Lưới bên phải', 0\.78, 0\.42, 0\.9\], \['M\-C', 'Giữa sân', 0\.50, 0\.28, 0\.45\], \['R\-C', 'Cuối giữa \(chỗ người sau\)', 0\.50, 0\.08, 0\.3\], \['F\-L', 'Lưới trái \(sát người lưới\)', 0\.25, 0\.42, 0\.1\]\], trap: \{ kind: 'action', id: 'net', why: 'Bỏ nhỏ sát lưới là an toàn: nhưng người lưới đối thủ đã đứng đỡ, dễ bị bắt\.' \}, explain: 'Đánh cao sâu từ sát lưới là hard\-fail \(không thể tạo quỹ đạo\)\. Cầu cao hơn lưới thì phải tấn công, thả xuống khoảng trống bên phải\.', \}\), S\(\{ id: 'DB06', sport: BD, title: 'Nâng cầu khi bị ép ở lưới', phase: 'defending', role: 'Người giữ lưới', skill: 'doubles\_defense', difficulty: 1350, prompt: 'Cầu thấp sát lưới, bạn bị ép\. Đối thủ đang chờ tấn công\.', cue: \['Cầu thấp sát lưới, không thể đập', 'Người lưới đối thủ đã áp sát \(x khoảng 0,30\)', 'Người sau đối thủ đứng lệch trái, góc cuối bên phải bỏ trống'\], actors: \[\['me', 'Bạn \(lưới\)', 0\.45, 0\.60\], \['partner', 'Partner', 0\.62, 0\.82\], \['opp', 'Người giữ lưới', 0\.30, 0\.36\], \['opp', 'Người sau', 0\.40, 0\.12\], \['ball', 'Cầu', 0\.46, 0\.56\]\], actions: \[\['lift\_deep', 'Nâng cao sâu cuối sân', 1\], \['net', 'Bỏ nhỏ', 0\.35\], \['push', 'Đẩy phẳng', 0\.2\], \['smash', 'Đập xuống', 0\]\], targets: \[\['R\-R', 'Góc cuối phải \(xa người sau\)', 0\.85, 0\.08, 1\], \['R\-C', 'Cuối sân giữa', 0\.50, 0\.08, 0\.6\], \['R\-L', 'Góc cuối trái \(gần người sau\)', 0\.15, 0\.08, 0\.3\], \['M\-C', 'Nâng ngắn giữa sân', 0\.50, 0\.28, 0\.1\]\], trap: \{ kind: 'target', id: 'M\-C', why: 'Nâng ngắn giữa sân để ép thời gian: nhưng cầu ngắn giữa sân sẽ bị đập thẳng vào bạn\.' \}, explain: 'Đập xuống từ cầu thấp sát lưới là hard\-fail\. Khi bị ép, nâng cao sâu vào góc xa nhất để lấy thời gian về vị trí\.', \}\), // \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- BONG DA \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- S\(\{ id: 'FB01', sport: FB, title: 'Đối mặt tiền đạo: bạn là người cuối cùng', phase: 'defending', role: 'Trung vệ', skill: 'defensive\_reading', difficulty: 1250, prompt: 'Tiền đạo đối phương đang cầm bóng lao vào\. Đồng đội bọc lót đang chạy về\.', cue: \['Đồng đội bọc lót còn cách khoảng 2 giây ở bên trái', 'Tiền đạo chạy nhanh vào giữa', 'Bạn còn khoảng không phía sau, thủ môn sẵn sàng'\], actors: \[\['me', 'Bạn \(trung vệ\)', 0\.50, 0\.72\], \['opp', 'Tiền đạo cầm bóng', 0\.52, 0\.60\], \['partner', 'Đồng đội bọc lót', 0\.28, 0\.80\], \['partner', 'Thủ môn', 0\.50, 0\.97\], \['ball', 'Bóng', 0\.52, 0\.62\]\], actions: \[\['jockey', 'Kèm giữ khoảng cách, dẫn ra', 1\], \['retreat', 'Lùi sâu chờ', 0\.6\], \['tackle', 'Lao vào cướp bóng', 0\.25\], \['foul', 'Kéo áo cản lại', 0\]\], targets: \[\['L', 'Dẫn về phía bọc lót \(trái\)', 0\.30, 0\.70, 1\], \['C', 'Giữ thẳng giữa', 0\.50, 0\.74, 0\.5\], \['R', 'Ép ra phải \(xa bọc lót\)', 0\.72, 0\.70, 0\.3\]\], trap: \{ kind: 'action', id: 'tackle', why: 'Lao vào cướp bóng: nếu trượt thì hết người chặn\. Có đồng đội bọc lót nên kiếm thời gian\.' \}, explain: 'Kéo áo trong vùng nguy hiểm là hard\-fail \(penalty, thẻ đỏ\)\. Dẫn tiền đạo về phía bọc lót để đồng đội kịp về\.', \}\), S\(\{ id: 'FB02', sport: FB, title: 'Bẫy việt vị khi tiền vệ đối phương bị ép', phase: 'defending', role: 'Hàng phòng ngự', skill: 'positioning', difficulty: 1300, prompt: 'Tiền vệ đối phương sắp chuyền xuyên tuyến\. Tiền đạo của họ đang ở sau lưng hàng thủ\. Cả hàng thủ cùng một đường\.', cue: \['Tiền vệ đối phương đang bị ép, khó ngẩng đầu', 'Cả 4 hậu vệ đứng thẳng hàng', 'Tiền đạo đang ở vị trí việt vị so với đường bóng'\], actors: \[\['me', 'Bạn \(trung vệ\)', 0\.45, 0\.62\], \['partner', 'Trung vệ', 0\.58, 0\.62\], \['partner', 'Hậu vệ trái', 0\.20, 0\.63\], \['partner', 'Hậu vệ phải', 0\.82, 0\.62\], \['partner', 'Tiền vệ ta ép bóng', 0\.52, 0\.50\], \['opp', 'Tiền vệ cầm bóng', 0\.50, 0\.47\], \['opp', 'Tiền đạo \(sau lưng hàng thủ\)', 0\.60, 0\.67\]\], actions: \[\['step\_up', 'Cả hàng thủ cùng bước lên \(bẫy việt vị\)', 1\], \['hold', 'Giữ nguyên đường', 0\.55\], \['drop', 'Lùi cả hàng', 0\.5\], \['step\_up\_alone', 'Một mình bước lên', 0\]\], targets: \[\], trap: \{ kind: 'action', id: 'drop', why: 'Bị chuyền xuyên thì lùi cho an toàn: lùi làm tiền đạo tự do nhận bóng\.' \}, explain: 'Một mình bước lên là hard\-fail: phá vỡ hàng, mở cửa cho tiền đạo\. Khi tiền vệ bị ép, cả hàng cùng lên để bẫy việt vị\.', \}\), S\(\{ id: 'FB02b', sport: FB, title: 'Giữ hàng khi tiền vệ đối phương thoải mái', phase: 'defending', role: 'Hàng phòng ngự', skill: 'positioning', difficulty: 1300, mirrorOf: 'FB02', prompt: 'Lần này tiền vệ đối phương không bị ép, có thời gian ngẩng đầu\. Tiền đạo vẫn ở sau lưng hàng thủ\.', cue: \['Không ai ép tiền vệ đối phương, họ có thời gian', 'Cả 4 hậu vệ đứng thẳng hàng', 'Tiền đạo đối phương sẵn sàng chạy vào khoảng trống'\], actors: \[\['me', 'Bạn \(trung vệ\)', 0\.45, 0\.62\], \['partner', 'Trung vệ', 0\.58, 0\.62\], \['partner', 'Hậu vệ trái', 0\.20, 0\.63\], \['partner', 'Hậu vệ phải', 0\.82, 0\.62\], \['partner', 'Tiền vệ ta \(xa bóng\)', 0\.30, 0\.45\], \['opp', 'Tiền vệ cầm bóng \(tự do\)', 0\.50, 0\.47\], \['opp', 'Tiền đạo \(sau lưng hàng thủ\)', 0\.60, 0\.67\]\], actions: \[\['drop', 'Lùi cả hàng giữ khoảng cách', 1\], \['hold', 'Giữ nguyên đường', 0\.6\], \['step\_up', 'Cả hàng cùng bước lên \(bẫy việt vị\)', 0\.15\], \['step\_up\_alone', 'Một mình bước lên', 0\]\], targets: \[\], trap: \{ kind: 'action', id: 'step\_up', why: 'Bẫy việt vị lúc nào cũng hay: bẫy chỉ hiệu quả khi người chuyền bị ép\. Nếu họ thoải mái, họ chuyền xuyên qua lưng hàng thủ\.' \}, explain: 'Cặp gương FB02: cùng hình dạng nhưng tiền vệ được nghỉ, nên phải lùi giữ khoảng cách thay vì bẫy việt vị\.', \}\), S\(\{ id: 'FB03', sport: FB, title: 'Phạt góc của đối phương', phase: 'defending', role: 'Trung vệ', skill: 'positioning', difficulty: 1200, prompt: 'Phạt góc cho đối phương từ bên trái\. Tiền đạo cao nhất của họ đứng gần chấm phạt đền\. Bạn chọn vị trí\.', cue: \['Bóng sẽ được treo vào vùng chấm phạt đền', 'Cột gần đã có đồng đội giữ', 'Tiền đạo cao nhất đang chuẩn bị tách ra'\], actors: \[\['me', 'Bạn', 0\.50, 0\.86\], \['partner', 'Đồng đội giữ cột gần', 0\.40, 0\.96\], \['partner', 'Đồng đội giữ cột xa', 0\.62, 0\.95\], \['opp', 'Tiền đạo cao nhất', 0\.50, 0\.84\], \['opp', 'Người đá phạt góc', 0\.02, 0\.98\]\], actions: \[\['mark\_man', 'Kèm sát tiền đạo cao nhất', 1\], \['zone', 'Giữ khu vực chấm phạt đền', 0\.6\], \['near\_post', 'Chạy ra cột gần', 0\.3\]\], targets: \[\['spot', 'Ngay sau lưng tiền đạo \(chặn hướng chạy\)', 0\.50, 0\.88, 1\], \['far', 'Cột xa', 0\.62, 0\.95, 0\.4\], \['near', 'Cột gần \(đã có người\)', 0\.40, 0\.96, 0\.3\], \['edge', 'Rìa vòng cấm', 0\.50, 0\.80, 0\.2\]\], trap: \{ kind: 'action', id: 'near\_post', why: 'Cột gần đã có đồng đội: chạy ra đó là bỏ trống người nguy hiểm nhất\.' \}, explain: 'Người cao nhất là mục tiêu chính của bóng bổng\. Kèm sát và chặn hướng chạy tốt hơn chạy ra chỗ đã có người\.', \}\), S\(\{ id: 'FB04a', sport: FB, title: 'Ép hay giữ khi đối thủ quay lưng', phase: 'defending', role: 'Tiền vệ phòng ngự', skill: 'defensive\_reading', difficulty: 1200, prompt: 'Đối phương nhận bóng quay lưng, hai đồng đội đã áp sát hai bên\. Bạn là tiền vệ phòng ngự phía sau\.', cue: \['Đối thủ quay lưng, khó xoay người', 'Hai đồng đội đã áp sát hai bên', 'Hàng thủ phía sau đã giữ cự ly'\], actors: \[\['me', 'Bạn \(tiền vệ phòng ngự\)', 0\.50, 0\.52\], \['opp', 'Tiền vệ nhận bóng quay lưng', 0\.46, 0\.44\], \['partner', 'Đồng đội áp sát trái', 0\.38, 0\.45\], \['partner', 'Đồng đội áp sát phải', 0\.56, 0\.45\], \['ball', 'Bóng', 0\.46, 0\.45\]\], actions: \[\['press', 'Lên ép ngay', 1\], \['hold', 'Giữ vị trí che đường chuyền', 0\.5\], \['drop', 'Lùi về', 0\.3\]\], targets: \[\], trap: \{ kind: 'action', id: 'hold', why: 'Giữ vị trí cho an toàn: bỏ lỡ lúc đối thủ bị bất động nhất\.' \}, explain: 'Đối thủ quay lưng và có hai người sẵn sàng áp sát là tín hiệu ép\. Cùng một vị trí bóng nhưng đổi cự ly đồng đội thì đáp án đổi\.', \}\), S\(\{ id: 'FB04b', sport: FB, title: 'Giữ hay ép khi đồng đội chưa kịp lên', phase: 'defending', role: 'Tiền vệ phòng ngự', skill: 'defensive\_reading', difficulty: 1200, mirrorOf: 'FB04a', prompt: 'Đối phương nhận bóng, quay mặt về phía bạn\. Đồng đội chưa kịp lên áp sát\.', cue: \['Đối thủ quay mặt về phía bạn, nhìn rõ sân', 'Đồng đội ở xa, chưa kịp áp sát', 'Nếu bạn lên một mình, dễ bị cắt qua người'\], actors: \[\['me', 'Bạn \(tiền vệ phòng ngự\)', 0\.50, 0\.52\], \['opp', 'Tiền vệ nhận bóng \(nhìn thẳng\)', 0\.46, 0\.44\], \['partner', 'Đồng đội \(xa\)', 0\.30, 0\.58\], \['partner', 'Đồng đội \(xa\)', 0\.68, 0\.58\], \['ball', 'Bóng', 0\.46, 0\.45\]\], actions: \[\['hold', 'Giữ vị trí che đường chuyền', 1\], \['drop', 'Lùi về giữ cự ly', 0\.6\], \['press', 'Lên ép ngay', 0\.3\]\], targets: \[\], trap: \{ kind: 'action', id: 'press', why: 'Lúc nào cũng ép cho nhiệt huyết: ép lẻ khi đồng đội chưa theo kịp sẽ bị chuyền thẳng qua người\.' \}, explain: 'Cặp gương FB04a: cùng vị trí bóng, khác nhau ở tín hiệu quay lưng và sự có mặt của đồng đội\.', \}\), S\(\{ id: 'FB05', sport: FB, title: 'Mất bóng, đối phương phản công 3 đánh 2', phase: 'defending', role: 'Tiền vệ trung tâm', skill: 'transition', difficulty: 1300, prompt: 'Vừa mất bóng ở giữa sân\. Đối phương phản công 3 đánh 2 với hàng thủ của ta\.', cue: \['3 tiền đạo đối phương chạy ba hướng trái, giữa, phải', 'Hàng thủ chỉ còn 2 người', 'Bạn cách bóng 12 m, cách hành lang giữa 8 m'\], actors: \[\['me', 'Bạn \(tiền vệ\)', 0\.50, 0\.46\], \['opp', 'Người cầm bóng', 0\.52, 0\.52\], \['opp', 'Tiền đạo trái', 0\.25, 0\.55\], \['opp', 'Tiền đạo phải', 0\.78, 0\.55\], \['partner', 'Trung vệ', 0\.42, 0\.80\], \['partner', 'Trung vệ', 0\.58, 0\.80\], \['ball', 'Bóng', 0\.52, 0\.53\]\], actions: \[\['sprint\_back', 'Chạy hồi phòng chặn đường chuyền giữa', 1\], \['jog', 'Chạy chậm về giữ cự ly', 0\.5\], \['press\_ball', 'Ép tiếp người cầm bóng', 0\.35\], \['stand', 'Đứng lại không về', 0\]\], targets: \[\['mid', 'Che hành lang giữa', 0\.50, 0\.62, 1\], \['ball', 'Áp sát người có bóng', 0\.55, 0\.56, 0\.45\], \['wing', 'Chạy về cánh', 0\.20, 0\.62, 0\.3\]\], trap: \{ kind: 'action', id: 'press\_ball', why: 'Ép người cầm bóng để cướp lại: nhưng bạn đang bị vượt, ép lẻ dễ bị chuyền cho người chạy\.' \}, explain: 'Đứng lại không về là hard\-fail trong phản công số lượng\. Hồi phòng che hành lang giữa, cho hàng thủ thời gian\.', \}\), S\(\{ id: 'FB06', sport: FB, title: 'Chọn đường chuyền dưới áp lực', phase: 'attacking', role: 'Tiền vệ trung tâm', skill: 'passing\_choice', difficulty: 1200, prompt: 'Bạn nhận bóng giữa sân, đối thủ ép dày bên phải\. Chọn đường chuyền\.', cue: \['Hai đối thủ ép dày bên phải bóng', 'Cánh trái ta đang bỏ trống hoàn toàn', 'Đường chuyền xuyên cho tiền đạo có tiền vệ đối thủ chặn'\], actors: \[\['me', 'Bạn', 0\.50, 0\.55\], \['opp', 'Đối thủ ép 1', 0\.58, 0\.52\], \['opp', 'Đối thủ ép 2', 0\.52, 0\.46\], \['opp', 'Tiền vệ chặn giữa', 0\.45, 0\.40\], \['partner', 'Cánh trái \(tự do\)', 0\.10, 0\.45\], \['partner', 'Tiền đạo \(bị kèm\)', 0\.50, 0\.20\], \['partner', 'Trung vệ', 0\.50, 0\.72\], \['ball', 'Bóng', 0\.50, 0\.55\]\], actions: \[\['pass', 'Chuyền bóng', 1\], \['dribble', 'Rê bóng thoát ép', 0\.3, true\], \['hold', 'Giữ bóng', 0\.2, true\]\], targets: \[\['LW', 'Chuyền sang cánh trái \(tự do\)', 0\.10, 0\.45, 1\], \['CB', 'Chuyền lùi cho trung vệ', 0\.50, 0\.72, 0\.5\], \['ST', 'Chuyền xuyên cho tiền đạo', 0\.50, 0\.20, 0\.2\]\], trap: \{ kind: 'target', id: 'ST', why: 'Chuyền xuyên cho tiền đạo nghe hay nhất, nhưng bị chặn giữa nên dễ mất bóng gần khung thành mình\.' \}, explain: 'Đối thủ ép dày một bên thì bên kia tự do\. Chuyền ngang sang cánh trái giữ bóng và tạo khoảng trống\.', \}\), S\(\{ id: 'FB07', sport: FB, title: 'Đối mặt thủ môn ở góc hẹp', phase: 'attacking', role: 'Tiền đạo', skill: 'finishing', difficulty: 1150, prompt: 'Bạn đối mặt thủ môn nhưng ở góc hẹp bên phải\. Đồng đội bên trái hoàn toàn trống\.', cue: \['Góc sút hẹp \(khoảng 20 độ\)', 'Hậu vệ đang đuổi sát phía sau', 'Đồng đội trống ở gần chấm 5m50, thủ môn lệch về phía bạn'\], actors: \[\['me', 'Bạn \(tiền đạo\)', 0\.62, 0\.14\], \['opp', 'Thủ môn', 0\.50, 0\.03\], \['opp', 'Hậu vệ đuổi theo', 0\.55, 0\.22\], \['partner', 'Đồng đội trống', 0\.35, 0\.12\], \['ball', 'Bóng', 0\.62, 0\.15\]\], actions: \[\['square\_pass', 'Chuyền ngang cho đồng đội trống', 1\], \['dribble', 'Rê qua thủ môn', 0\.55\], \['shoot', 'Sút luôn', 0\.45\], \['chip', 'Đá vọt qua đầu', 0\.3\]\], targets: \[\], trap: \{ kind: 'action', id: 'shoot', why: 'Đối mặt thủ môn là phải sút: góc hẹp và hậu vệ đuổi sát, chuyền cho người trống ăn hơn\.' \}, explain: 'Góc hẹp, thủ môn lệch về phía bạn và đồng đội trống thì chuyền ngang cho xác suất ghi bàn cao hơn\.', \}\), S\(\{ id: 'FB08', sport: FB, title: 'Tạt biên: tạt bóng hay cắt lùi', phase: 'attacking', role: 'Tiền vệ cánh', skill: 'passing\_choice', difficulty: 1150, prompt: 'Bạn có bóng sát đường biên ngang bên phải, gần đường cuối sân\.', cue: \['Hai trung vệ đối phương đang co về cột gần', 'Tiền vệ đồng đội chạy vào rìa vòng cấm không bị kèm', 'Bạn sát đường biên ngang, hậu vệ đang áp sát'\], actors: \[\['me', 'Bạn \(cánh phải\)', 0\.90, 0\.20\], \['opp', 'Hậu vệ', 0\.82, 0\.24\], \['opp', 'Trung vệ', 0\.58, 0\.10\], \['opp', 'Trung vệ', 0\.45, 0\.10\], \['partner', 'Tiền vệ vào rìa cấm \(trống\)', 0\.62, 0\.28\], \['partner', 'Tiền đạo ở chấm phạt đền \(bị kèm\)', 0\.50, 0\.12\], \['ball', 'Bóng', 0\.90, 0\.21\]\], actions: \[\['cutback', 'Cắt lùi chuyền ngang vào rìa cấm', 1\], \['high\_cross', 'Tạt bóng vào vùng cấm', 0\.5\], \['dribble\_in', 'Rê vào trong', 0\.4, true\], \['shoot\_angle', 'Sút từ góc hẹp', 0\.25, true\]\], targets: \[\['edge', 'Rìa vòng cấm \(đồng đội trống\)', 0\.62, 0\.28, 1\], \['far', 'Cột xa', 0\.35, 0\.07, 0\.4\], \['pen', 'Chấm phạt đền \(bị kèm\)', 0\.50, 0\.12, 0\.3\]\], trap: \{ kind: 'action', id: 'high\_cross', why: 'Có cánh là tạt bóng cao: nhưng hai trung vệ đã co về cột gần, bóng cao sẽ bị cắt\.' \}, explain: 'Khi hàng thủ co về cột gần, khoảng trống nằm ở rìa vòng cấm\. Cắt lùi về người chạy vào là lựa chọn tốt nhất\.', \}\), \]

// \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- CAU HOI GOI Y VI TRI BONG DA \(khong cong ELO\) \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- export type Pos = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'ST' export const POSITION\_LABEL: Record<Pos, string> = \{ GK: 'Thủ môn', CB: 'Trung vệ', FB: 'Hậu vệ cánh', DM: 'Tiền vệ phòng ngự', CM: 'Tiền vệ trung tâm', AM: 'Tiền vệ công / cánh', ST: 'Tiền đạo', \} export interface PosQuestion \{ id: string; text: string; options: \{ label: string; w: Partial<Record<Pos, number>> \}\[\] \} export const POSITION\_QUESTIONS: PosQuestion\[\] = \[ \{ id: 'P1', text: 'Trong trận bạn thích làm gì nhất?', options: \[ \{ label: 'Ngăn đối thủ ghi bàn', w: \{ GK: 2, CB: 3, FB: 1, DM: 2 \} \}, \{ label: 'Điều phối, chuyền bóng', w: \{ DM: 1, CM: 3, AM: 1 \} \}, \{ label: 'Ghi bàn, tạo đột biến', w: \{ AM: 2, ST: 3, FB: 1 \} \} \] \}, \{ id: 'P2', text: 'Điểm mạnh thể chất của bạn?', options: \[ \{ label: 'Chiều cao, tranh chấp bóng bổng', w: \{ CB: 3, GK: 1, ST: 1 \} \}, \{ label: 'Tốc độ, chạy biên', w: \{ FB: 3, AM: 2, ST: 1 \} \}, \{ label: 'Thể lực, chạy cả trận', w: \{ CM: 3, DM: 2, FB: 1 \} \} \] \}, \{ id: 'P3', text: 'Khi đội mất bóng bạn thường\.\.\.', options: \[ \{ label: 'Lao lên giành lại ngay', w: \{ DM: 2, CM: 2, ST: 1 \} \}, \{ label: 'Lùi về giữ đội hình', w: \{ CB: 2, FB: 1, DM: 1 \} \}, \{ label: 'Đứng cao chờ cơ hội', w: \{ ST: 2, AM: 2 \} \} \] \}, \{ id: 'P4', text: 'Khi nhận bóng dưới áp lực bạn\.\.\.', options: \[ \{ label: 'Chuyền an toàn', w: \{ CB: 2, DM: 2, GK: 1 \} \}, \{ label: 'Giữ bóng và xoay người thoát', w: \{ CM: 3, AM: 1 \} \}, \{ label: 'Rê qua người', w: \{ AM: 3, ST: 1, FB: 1 \} \} \] \}, \{ id: 'P5', text: 'Áp lực nào bạn chịu được?', options: \[ \{ label: 'Một mình đối mặt cú sút quyết định', w: \{ GK: 3, CB: 1 \} \}, \{ label: 'Quyết định đường chuyền cuối cùng', w: \{ AM: 2, CM: 2 \} \}, \{ label: 'Chạy dọc biên lên xuống cả trận', w: \{ FB: 3, CM: 1 \} \} \] \}, \] export function suggestRole\(answers: number\[\]\): \{ pos: Pos; label: string; ranking: \[Pos, number\]\[\] \} \{ const total: Partial<Record<Pos, number>> = \{\} POSITION\_QUESTIONS\.forEach\(\(q, i\) => \{ const o = q\.options\[answers\[i\]\] if \(\!o\) return for \(const k of Object\.keys\(o\.w\) as Pos\[\]\) total\[k\] = \(total\[k\] || 0\) \+ \(o\.w\[k\] || 0\) \}\) const ranking = \(Object\.entries\(total\) as \[Pos, number\]\[\]\)\.sort\(\(a, b\) => b\[1\] \- a\[1\]\) const pos = ranking\[0\] ? ranking\[0\]\[0\] : 'CM' return \{ pos, label: POSITION\_LABEL\[pos\], ranking \} \}

// \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- CHAM DIEM DON GIAN \-\-\-\-\-\-\-\-\-\-\-\-\-\-\-\- export function scoreScenario\(sc: Scenario, actionId: string, targetId?: string\) \{ const a = sc\.actions\.find\(\(x\) => x\.id === actionId\) const t = sc\.targets\.find\(\(x\) => x\.id === targetId\) if \(\!a\) return \{ s: 0, hardFail: false, trapped: false \} const fit = a\.fit const ts = a\.noTarget || sc\.targets\.length === 0 ? 1 : t ? t\.score : 0 const s = Math\.round\(fit \* ts \* 100\) / 100 const trapped = \(sc\.trap\.kind === 'action' && sc\.trap\.id === actionId\) || \(sc\.trap\.kind === 'target' && sc\.trap\.id === targetId\) return \{ s, hardFail: fit === 0, trapped \} \} // Rating don gian \(K lon cho giai doan dau\)\. Khong can chinh xac tuyet doi\. export function updateRating\(r: number, s: number, difficulty: number, k = 40\): number \{ const e = 1 / \(1 \+ Math\.pow\(10, \(difficulty \- r\) / 400\)\) return Math\.round\(r \+ k \* \(s \- e\)\) \} export function pickSession\(sport: Sport, n = 6\): Scenario\[\] \{ const pool = SCENARIOS\.filter\(\(s\) => s\.sport === sport\) const arr = pool\.slice\(\) for \(let i = arr\.length \- 1; i > 0; i\-\-\) \{ const j = Math\.floor\(Math\.random\(\) \* \(i \+ 1\)\); \[arr\[i\], arr\[j\]\] = \[arr\[j\], arr\[i\]\] \} const out: Scenario\[\] = \[\] const used = new Set\(\) for \(const s of arr\) \{ const key = s\.mirrorOf || s\.id // moi cap guong chi vao mot lan, tru khi dung checkMirror if \(used\.has\(key\)\) continue used\.add\(key\); used\.add\(s\.id\); out\.push\(s\) if \(out\.length >= n\) break \} return out \}

## <a id="_myr5hmksj17y"></a>T17\#2 \(8,695 ký tự\)

Dưới đây là BẢN ĐẶC TẢ TỔNG HỢP CUỐI CÙNG \(MASTER PROMPT V6\.0\) được viết lại hoàn toàn, cấu trúc tối ưu để bạn có thể copy/paste trực tiếp vào Cursor, v0, Bolt, Lovable hoặc các AI tạo web\.

Tôi đã tóm tắt lại toàn bộ ngữ cảnh để AI hiểu, đập đi xây lại phần câu hỏi và hình ảnh cho thực tế, bổ sung Hệ thống Đánh giá Độ phù hợp Thiết bị \(Equipment Fit\) và Hồ sơ Mạng xã hội \(Anti\-fake\) đúng như bạn yêu cầu\.

BẢN ĐẶC TẢ KỸ THUẬT MASTER V6\.0 \(DÀNH CHO AI TẠO WEB\)

0\. TÓM TẮT BỐI CẢNH \(DÀNH CHO AI\)

Bạn đang xây dựng module "Chẩn đoán Trình độ & Tư vấn Thiết bị" cho một website thương mại điện tử thể thao \(Cầu lông & Bóng đá\)\. Hệ thống có 3 trụ cột chính:

Skill Assessment \(Đánh giá kỹ năng\): Bài test chia làm Quick \(6 câu\) và Deep \(10\-12 nhóm câu\)\.

Achievement \(Thành tích\): Khai báo giải đấu, tính điểm AP \(Achievement Points\)\.

Social Profile \(Mạng xã hội thể thao\): Nơi người chơi khoe hồ sơ, phân biệt rõ \*Tự khai báo\* và \*Đã xác minh\*\.

VẤN ĐỀ CỦA PHIÊN BẢN CŨ MÀ BẠN PHẢI SỬA:

Câu hỏi quá chung chung \(VD: "Bạn đánh tốt không?"\)\. Đáp án phải là kết quả quan sát được \(VD: "Cầu rơi ở đâu?"\)\.

Hình ảnh minh họa vô dụng, không thể hiện được góc nhìn, quỹ đạo\. Bạn phải code SVG/Canvas thực tế\.

Chưa có phần tư vấn thiết bị \(Vợt, Giày, Cầu\) dựa trên điểm số\.

Mạng xã hội dễ bị fake\. Phải chia cấp độ xác minh\.

1\. NGUYÊN TẮC CỐT LÕI \(BẮT BUỘC TUÂN THỦ\)

Không cộng chéo điểm: Skill Elo \(trình độ\) độc lập với AP \(thành tích\) và Equipment Fit \(độ hợp thiết bị\)\.

Đo lường thực tế, không tự sướng: Không cho khách chọn "Tôi đánh khá"\. Chỉ cho chọn "Cầu thường rơi ở giữa sân", "Cầu thường đâm vào lưới"\.

Phân biệt rõ Fake/Real trên MXH: Hồ sơ phải chia rõ: Tự đánh giá \(Self\-reported\) / Đã làm test \(Assessment\) / Được CLB xác nhận \(Community\) / Có bằng chứng giải đấu \(Official\)\.

Đánh giá thiết bị dựa trên thông số thực tế: Không bán vợt cho người yếu tay chỉ vì họ có điểm Smash cao\.

2\. MODULE 1: ĐÁNH GIÁ KỸ NĂNG \(SKILL ASSESSMENT\)

2\.1\. Cấu trúc câu hỏi mới \(Bắt buộc áp dụng cho toàn bộ Ngân hàng câu hỏi\)

Mỗi câu hỏi phải có:

Tình huống \(Scenario\): Ngắn gọn, bối cảnh thi đấu\.

Hình ảnh \(Visual\): Do AI Frontend tự code bằng SVG \(hướng dẫn bên dưới\)\.

4 Đáp án \(A/B/C/D\): Mô tả KẾT QUẢ QUAN SÁT ĐƯỢC, không mô tả cảm giác\.

Câu hỏi phụ \(Độ ổn định\): "Trong 10 lần thực hiện gần nhất, bạn làm được bao nhiêu lần?" \(A: 0\-2, B: 3\-5, C: 6\-8, D: 9\-10\)\.

2\.2\. Ví dụ câu hỏi Cầu Lông \(Sửa lại từ bản cũ\)

ID: \`BD\-Q01\` \- Trái tay cuối sân Tình huống: Đối thủ đánh cầu cao sâu về góc trái tay cuối sân của bạn\. Bạn di chuyển tới và thực hiện cú đánh trái tay\. Câu hỏi chính: Khi thực hiện cú đánh này, quả cầu thường bay đi như thế nào?

A\. Tôi thường không kịp chạm cầu, hoặc cầu đâm thẳng vào lưới/không qua lưới\.

B\. Cầu qua được lưới nhưng chỉ bay lơ lửng đến khoảng giữa sân đối phương\.

C\. Cầu bay cao và xa, đến khoảng 2/3 sân đối phương nhưng điểm rơi chưa chính xác\.

D\. Cầu bay cao sâu, rơi sát vạch cuối sân đối phương\. Tôi có thể chủ động đổi hướng sang trái/phải\. Câu hỏi phụ \(Độ ổn định\): Trong 10 lần đánh trái tay gần nhất, bao nhiêu lần cầu đi đúng ý bạn?

A\. 0\-2 lần | B\. 3\-5 lần | C\. 6\-8 lần | D\. 9\-10 lần\. \*\(Điểm Elo sẽ tính cả câu chính và câu phụ\)\.\*

2\.3\. Quy chuẩn Hình ảnh \(Visual\) \- YÊU CẦU CODE SVG

\*AI Frontend BẮT BUỘC dùng code SVG/Canvas để vẽ, không dùng ảnh placeholder\.\*

Hướng nhìn: Phải là Side\-view \(Góc nhìn ngang sân\) để thấy được độ cao của cầu và lưới\. Tuyệt đối không dùng Top\-down \(nhìn từ trên xuống\) cho các câu hỏi về quỹ đạo bay\.

Bố cục:

Trục ngang: Chiều dài sân\. Trục dọc: Độ cao\.

Vẽ lưới cao 1\.55m ở giữa\.

Vẽ người chơi \(hình khối vector đơn giản\) đang cầm vợt\.

Minh họa đáp án: Bật/tắt 4 đường nét đứt \(dashed lines\) tương ứng với 4 đáp án A/B/C/D\.

Đáp án A: Đường màu đỏ đâm vào lưới\.

Đáp án B: Đường màu vàng rơi giữa sân\.

Đáp án C: Đường màu cam đi xa hơn\.

Đáp án D: Đường màu xanh lá bay cao, rơi sát vạch cuối sân\.

\*Có animation cầu bay dọc theo đường nét đứt khi user click chọn đáp án\.\*

Nhãn \(Labels\): Ghi rõ "Điểm tiếp xúc", "Độ cao lưới", "Điểm rơi"\.

\*\(Áp dụng tương tự cho bóng đá: Side\-view cho sút bóng, Top\-down cho chuyền bóng/giữ bóng\)\.\*

3\. MODULE 2: ĐÁNH GIÁ ĐỘ PHÙ HỢP THIẾT BỊ \(EQUIPMENT FIT\) \- MỚI

Mục tiêu: Khi khách hàng xem một sản phẩm \(Vợt, Giày, Cầu, Bóng\), hệ thống tính điểm % phù hợp dựa trên hồ sơ của họ\.

3\.1\. Cấu trúc Điểm phù hợp \(Fit Score\)

Thang điểm: \`0 \- 100\`\. \(Trên 85: Rất phù hợp; 70\-84: Phù hợp; 50\-69: Cân nhắc; Dưới 50: Không phù hợp\)\.

Điều kiện tiên quyết \(Hard Rules\): Nếu vi phạm, tự động đánh rớt xuống "Không phù hợp" \(0 điểm\)\.

Giày bóng đá: Sai đinh \(TF cho sân cỏ nhân tạo, FG cho sân tự nhiên, IC cho futsal\)\.

Vợt cầu lông: Căng cước vượt quá mức tối đa của khung vợt\.

3\.2\. Thuật toán tính điểm \(Dành cho Backend\)

Kỹ thuật \(Weight 40%\):

Nếu Điểm Smash thấp \+ Thân vợt Siêu Cứng => Trừ điểm mạnh \(dễ chấn thương cổ tay\)\.

Nếu Điểm Phòng thủ thấp \+ Vợt Nặng đầu => Trừ điểm\.

Lối chơi \(Weight 30%\):

Khách thích đập cầu \(Attack\) \+ Vợt Nặng đầu => Cộng điểm\.

Khách thích phòng thủ \(Defense\) \+ Vợt Nhẹ đầu, thân dẻo => Cộng điểm\.

Thể trạng & Form \(Weight 20%\):

Form chân bè \+ Giày form thon => Trừ điểm nặng\. Form chân thon \+ Giày form bè => Cảnh báo lỏng\.

Sở thích/Ngân sách \(Weight 10%\):

3\.3\. Hiển thị UI cho khách hàng

Thêm block "Độ phù hợp với bạn: 85%" vào trang chi tiết sản phẩm:

✅ Vì sao phù hợp: \*"Thân vợt dẻo trung bình giúp bù đắp lực cổ tay còn yếu của bạn \(Dựa trên bài Test Deep\)\."\*

⚠️ Lưu ý: \*"Vợt hơi nặng đầu, bạn sẽ cần thời gian làm quen nếu chưa quen đánh vợt công\."\*

4\. MODULE 3: HỒ SƠ MẠNG XÃ HỘI & XÁC MINH \(ANTI\-FAKE SOCIAL PROFILE\)

Mạng xã hội thể thao này phải chia làm 2 mảng riêng biệt trên UI: Tự đánh giá và Bằng chứng xác minh\.

4\.1\. Cấp độ xác minh \(Verification Tiers\)

V0 \- Tự khai báo \(\`self\_reported\`\): Người dùng tự điền thông tin\. Chỉ hiển thị dạng văn bản, có nhãn xám "Chưa xác minh"\.

V1 \- Đã qua đánh giá \(\`assessment\_completed\`\): Đã làm bài test Elo\. Có huy hiệu Tier \(VD: Trung bình \+\)\.

V2 \- Cộng đồng xác nhận \(\`community\_verified\`\): Được HLV, CLB hoặc đối thủ xác nhận trên hệ thống\. Có huy hiệu xanh lá\.

V3 \- Xác minh chính thức \(\`officially\_verified\`\): Có minh chứng giải đấu, ban tổ chức xác nhận\. Có huy hiệu vàng/Kim cương\.

4\.2\. Trang Hồ sơ \(Sport Profile\)

Tab 1: Kỹ năng \(Skill\) \- Hiển thị biểu đồ Radar 8 trục \(chỉ số Elo\)\.

Tab 2: Thành tích \(Achievement\) \- Chia rõ 2 mục: \*"Thành tích đã xác minh"\* và \*"Khai báo chờ duyệt"\*\. Điểm AP \(Achievement Points\) chỉ cộng từ các thành tích đã xác minh\.

Tab 3: Trận đấu \(Verified Matches\) \- Lịch sử trận đấu có xác nhận của đối thủ/trọng tài\.

Tab 4: Thiết bị \(Equipment\) \- Đang dùng vợt/giày gì, đánh giá của họ về món đồ đó\.

5\. CẤU TRÚC DỮ LIỆU & HỆ THỐNG ĐIỂM \(BACKEND\)

5\.1\. Hệ thống Điểm \(Không giới hạn trần\)

Skill Elo: Khởi tạo 1000\. Hệ số K: Quick = 16, Deep = 24 \(Tránh việc làm Quick dễ lên điểm ảo\)\.

Achievement Points \(AP\): Tính từ giải đấu: \`AP = Điểm thứ hạng × Hệ số cấp giải × Quy mô × Thời gian\`\. Không cộng dồn AP vào Elo\.

5\.2\. Cấu trúc JSON trả về cho Frontend \(Mẫu Result API\)

\`\`\`json \{ "skill\_profile": \{ "overall\_elo": 1250, "tier": "tier\_4\_above\_avg", "tier\_label": "Trung bình \+", "radar": \{ "power": 75, "speed": 40, "reflex": 20, "technique": 55, "control": 49, "endurance": 40, "tactics": 52, "balance": 73 \} \}, "equipment\_fit": \{ "product\_id": "racket\_yonex\_astrox\_88d", "fit\_score": 86, "pros": \["Hợp lối chơi tấn công", "Trọng lượng 4U vừa sức"\], "cons": \["Thân siêu cứng cần lực cổ tay tốt"\] \}, "social\_profile": \{ "verified\_badges": \["V1\_Assessed", "V3\_Provincial\_Champion"\], "unverified\_claims": \["Tự nhận trình độ Khá"\] \} \} \`\`\`

6\. BACKLOG \- NHIỆM VỤ CHO CÁC AI TIẾP THEO \(HANDOVER\)

Bạn \(AI Web Builder\) hãy chia task theo thứ tự sau:

UI/UX & Frontend \(P0\):

Code SVG Side\-view cho toàn bộ câu hỏi quỹ đạo \(cầu lông, bóng đá\)\. Có animation nét đứt\.

Code UI câu hỏi: 1 câu hỏi chính \(4 đáp án\) \+ 1 câu hỏi phụ \(tần suất 0\-10 lần\)\.

Code UI Hồ sơ MXH: 4 Tab rõ ràng, chia rõ Verified / Unverified\.

Code UI Trang sản phẩm: Thêm block "Độ phù hợp với bạn" \(Thanh phần trăm \+ Lý do\)\.

Backend \(P0\):

Viết logic tính Elo mới \(dựa trên cả câu chính và câu phụ\)\.

Viết logic tính Điểm phù hợp thiết bị \(Mapping thông số vợt/giày với Elo/Tag\)\.

Viết API xác minh thành tích: Update từ V0 lên V1, V2, V3\. Không cho phép user tự đổi trạng thái\.

Data/Content \(P0\):

Cập nhật lại toàn bộ 4 ngân hàng câu hỏi \(Cầu lông Quick/Deep, Bóng đá Quick/Deep\) theo chuẩn "Kết quả quan sát được" như ví dụ ở Mục 2\.2\.

Nhập liệu thông số cho 20 sản phẩm mẫu \(10 vợt, 10 giày\) để test thuật toán Fit Score\.

TÔI \(AI WEB BUILDER\) CẦN BẮT ĐẦU TỪ ĐÂU? \*Hãy bắt đầu bằng việc dựng cấu trúc UI của Trang Đánh giá \(Assessment\), code mẫu 1 câu hỏi Cầu lông có hình SVG chuyển động thực tế, và giao diện Trang Hồ sơ Mạng xã hội \(Profile\)\.\*

## <a id="_n7beta39134l"></a>T17\#21 \(22,554 ký tự\)

Dựa trên bộ SportDNA hiện tại gồm 47 câu/tình huống, mình sẽ phát triển thêm 30 câu mới, nâng ngân hàng lên 77 câu\.

Mình giữ cấu trúc hiện có: mã câu riêng, tình huống thực tế, lựa chọn hành động, điểm rơi/vị trí khi cần, đáp án tốt nhất, các phương án bẫy và lý do\. Các câu mới sẽ không chỉ thay đổi câu chữ mà phải tạo ra những tình huống chiến thuật khác nhau\.

G\. Cầu lông đơn – 15 tình huống mới

Các câu này tập trung vào đọc hướng cầu, điều chỉnh vị trí, khai thác khoảng trống, chuyển trạng thái và ra quyết định dưới áp lực\.

Nhóm G1 – Đọc tình huống và khai thác khoảng trống

BS11 – Đối thủ đứng lệch về góc trái

Đề bài: Đối thủ vừa di chuyển sang góc trái sân và chưa kịp trở về giữa\. Bạn nhận cầu ở giữa sân, ngang tầm vai\.

Lựa chọn: Đánh chéo sang góc phải ✓ · Đánh thẳng vào giữa · Bỏ nhỏ trước lưới · Phông cầu về góc trái\.

Bẫy: Đánh vào vị trí đối thủ vừa rời khỏi nhưng không khai thác khoảng trống phía đối diện\.

BS12 – Đối thủ đứng quá sát lưới

Đề bài: Đối thủ tiến lên gần lưới sau một cú bỏ nhỏ\. Bạn đón được cầu ở giữa sân\.

Lựa chọn: Phông cầu cao sâu cuối sân ✓ · Bỏ nhỏ tiếp · Đánh lưới · Đẩy cầu ngang\.

Bẫy: Tiếp tục đánh ngắn khi đối thủ đã chiếm ưu thế phía trước\.

BS13 – Đối thủ đứng sâu cuối sân

Đề bài: Đối thủ đang đứng gần baseline\. Cầu đến phía trước bạn ở độ cao thuận lợi\.

Lựa chọn: Bỏ nhỏ sát lưới ✓ · Phông cầu cao sâu · Đập cầu về cuối sân · Drive ngang\.

Bẫy: Đánh sâu vào khu vực đối thủ đang kiểm soát\.

BS14 – Đối thủ liên tục chờ đánh chéo

Đề bài: Qua nhiều pha cầu, bạn nhận thấy đối thủ thường dịch chuyển sớm để đón cú đánh chéo\.

Lựa chọn: Đánh thẳng vào khoảng trống ✓ · Tiếp tục đánh chéo · Phông cao giữa sân · Bỏ nhỏ về đúng hướng đối thủ đang chờ\.

Bẫy: Lặp lại hướng đánh đã bị đối thủ đọc trước\.

BS15 – Cầu đến sát biên cuối sân

Đề bài: Cầu bay sâu về phía cuối sân, gần đường biên\. Bạn đang di chuyển lùi và phải quyết định có đánh hay không\.

Lựa chọn: Đánh khi xác định cầu còn trong sân ✓ · Bỏ cầu nếu xác định ngoài sân · Đập cầu trong tư thế mất thăng bằng · Cố đánh bằng mọi giá\.

Bẫy: Cố cứu một quả cầu ngoài sân, khiến mất thăng bằng và vị trí\.

Nhóm G2 – Điều chỉnh kỹ thuật và thời điểm

BS16 – Cầu đến thấp khi đang di chuyển

Đề bài: Bạn vừa chạy ngang sân, cầu đến thấp ở phía trái tay\.

Lựa chọn: Đánh phông phòng thủ cao sâu ✓ · Đập cầu · Đánh ngang thiếu tư thế · Bỏ nhỏ sát lưới\.

Bẫy: Cố tấn công khi chưa ổn định trọng tâm\.

BS17 – Đối thủ trả cầu yếu giữa sân

Đề bài: Sau cú đẩy cầu của bạn, đối thủ trả cầu yếu và nâng cầu lên giữa sân\.

Lựa chọn: Di chuyển vào cầu và đập có kiểm soát ✓ · Phông cầu tiếp · Bỏ nhỏ khi cầu còn quá thấp · Đứng chờ cầu rơi\.

Bẫy: Bỏ lỡ cơ hội tấn công khi cầu đã tạo điều kiện thuận lợi\.

BS18 – Bị kéo liên tục hai góc trước

Đề bài: Đối thủ liên tiếp đánh vào hai góc lưới\. Bạn vừa kịp cứu cú thứ hai nhưng chưa về giữa sân\.

Lựa chọn: Đánh trả cao sâu để tái lập vị trí ✓ · Tiếp tục bỏ nhỏ · Đẩy cầu ngang sát lưới · Đập cầu trong tư thế mất thăng bằng\.

Bẫy: Tiếp tục đánh ngắn khiến bạn không có thời gian hồi vị\.

BS19 – Đối thủ đổi nhịp bất ngờ

Đề bài: Đối thủ đang đánh nhanh liên tục nhưng bất ngờ thực hiện cú bỏ nhỏ chậm sát lưới\.

Lựa chọn: Giảm trọng tâm, bước đón cầu sớm ✓ · Tiếp tục lùi về cuối sân · Nhảy lên đập cầu · Đứng chờ cầu rơi\.

Bẫy: Không điều chỉnh nhịp di chuyển theo tốc độ cầu\.

BS20 – Cầu cao nhưng cơ thể chưa cân bằng

Đề bài: Bạn nhận được cầu bổng ở giữa sân nhưng vừa chạy hết tốc lực sang một bên\.

Lựa chọn: Đánh cầu có kiểm soát, ưu tiên hồi vị ✓ · Đập hết lực · Đập chéo góc khó · Bỏ nhỏ sát lưới\.

Bẫy: Nhầm lẫn giữa cầu thuận lợi và tư thế thuận lợi\.

Nhóm G3 – Chiến thuật và chuyển trạng thái

BS21 – Đối thủ có thói quen trả cầu về giữa

Đề bài: Đối thủ thường trả cầu về giữa sân sau mỗi lần bị ép\.

Lựa chọn: Chủ động đứng chờ ở vị trí giữa có lợi để tấn công tiếp ✓ · Lùi sâu cuối sân · Đứng sát lưới · Di chuyển theo hướng đánh cũ\.

Bẫy: Không khai thác được thói quen trả cầu của đối thủ\.

BS22 – Tạo cơ hội bằng cú đánh thứ nhất

Đề bài: Bạn đang ở giữa sân\. Đối thủ đứng cân bằng\. Bạn muốn tạo một tình huống thuận lợi cho cú đánh tiếp theo\.

Lựa chọn: Đẩy cầu nhanh về góc trái, sau đó chuẩn bị khai thác cú trả giữa sân ✓ · Đập mạnh vào giữa · Bỏ nhỏ ngay · Phông cầu cao không mục tiêu\.

Bẫy: Chỉ quan tâm cú đánh hiện tại, không chuẩn bị cho phản ứng tiếp theo\.

BS23 – Đối thủ vừa thực hiện cú đập nhưng tiếp đất lệch

Đề bài: Đối thủ đập cầu rồi tiếp đất lệch về phía phải, chưa hồi vị\.

Lựa chọn: Đánh nhanh vào khoảng trống phía trái ✓ · Đánh về phía phải · Phông cầu vào giữa · Giữ cầu chậm\.

Bẫy: Không tận dụng trạng thái mất cân bằng của đối thủ\.

BS24 – Dẫn trước điểm nhưng bị ép liên tục

Đề bài: Bạn đang dẫn điểm\. Đối thủ tăng tốc độ đánh và liên tục ép hai góc\.

Lựa chọn: Giữ cầu an toàn, chọn thời điểm phản công ✓ · Cố đập kết thúc mọi pha · Đánh mạo hiểm sát biên · Tăng tốc theo đối thủ\.

Bẫy: Để áp lực tỷ số làm thay đổi chất lượng quyết định\.

BS25 – Cơ hội kết thúc sau cú trả yếu

Đề bài: Đối thủ vừa trả cầu ngắn và cao ở gần lưới\. Bạn đã vào vị trí thuận lợi\.

Lựa chọn: Đánh kết thúc vào khoảng trống với kiểm soát ✓ · Nâng cầu cao sâu · Bỏ nhỏ thêm một lần · Đánh mạnh không xác định hướng\.

Bẫy: Kéo dài pha cầu khi đã có cơ hội kết thúc hợp lý\.

H\. Cầu lông đôi – 15 tình huống mới

Tập trung vào phối hợp hai người, phân chia trách nhiệm, chuyển đổi đội hình, bọc lót và đọc ý đồ đối thủ\.

Nhóm H1 – Phối hợp và phân chia trách nhiệm

DB07 – Cầu giữa khi hai người lệch đội hình

Đề bài: Bạn đứng phía sau, partner đứng trước\. Cầu bay vào khoảng giữa hai người nhưng lệch về phía tay thuận của partner\.

Lựa chọn: Gọi partner xử lý, bạn bọc khoảng trống phía sau ✓ · Cùng lao vào cầu · Đứng chờ partner tự quyết định · Lùi hẳn về cuối sân\.

Bẫy: Hai người cùng lao vào tạo khoảng trống ở phía sau\.

DB08 – Partner bị kéo ra biên

Đề bài: Partner đang ở góc phải và vừa đánh trả cầu\. Đối thủ đánh nhanh sang góc trái của bạn\.

Lựa chọn: Di chuyển sang trái nhận cầu, partner hồi vị ✓ · Đứng nguyên chờ partner · Cùng chạy sang phải · Lùi cả hai về cuối sân\.

Bẫy: Không bù vị trí khi partner bị kéo khỏi khu vực kiểm soát\.

DB09 – Partner vừa đập cầu

Đề bài: Partner đập cầu từ cuối sân\. Bạn đang giữ lưới và đối thủ có khả năng chặn cầu ngắn\.

Lựa chọn: Giữ vợt cao, chủ động bắt cầu trả ngắn ✓ · Lùi về đứng ngang partner · Đứng sát lưới không quan sát · Di chuyển sang biên đối diện\.

Bẫy: Không chuẩn bị cho cú chặn lưới sau smash\.

DB10 – Hai người cùng bị ép cuối sân

Đề bài: Đối thủ đánh nhanh khiến cả hai bạn phải lùi về phía sau\. Đội hình đang bị kéo ngang\.

Lựa chọn: Phối hợp trả cầu cao sâu và khôi phục đội hình song song ✓ · Một người lao lên lưới · Cả hai cùng đứng giữa · Cố phản công ngay bằng cú đập\.

Bẫy: Cố duy trì đội hình tấn công khi đang mất thế chủ động\.

DB11 – Đối thủ đánh vào khe giữa

Đề bài: Hai bạn đứng song song, đối thủ đánh drive nhanh vào khoảng giữa hai người\.

Lựa chọn: Người có tư thế thuận lợi hơn gọi cầu, người còn lại bọc lót ✓ · Cả hai cùng đánh · Cả hai nhường cầu · Người đứng xa tự động lao vào\.

Bẫy: Không có nguyên tắc giao tiếp và phân chia trách nhiệm\.

Nhóm H2 – Tấn công và chuyển đội hình

DB12 – Partner nâng cầu từ lưới

Đề bài: Partner bị ép ở lưới và buộc phải nâng cầu cao\. Bạn đang ở cuối sân\.

Lựa chọn: Chủ động vào tư thế phòng thủ song song ✓ · Tiếp tục đứng đội hình trước\-sau · Lao lên lưới · Đập cầu khi đối thủ chưa đánh\.

Bẫy: Không chuyển từ đội hình tấn công sang phòng thủ\.

DB13 – Đối thủ đứng song song nhưng lệch trọng tâm

Đề bài: Hai đối thủ đứng song song\. Người bên trái đang dịch chuyển về phía trước, người bên phải giữ vị trí sâu\.

Lựa chọn: Tấn công vào khoảng trống phía sau người bên trái ✓ · Đánh thẳng vào người bên trái · Bỏ nhỏ trước người bên phải · Đánh cao giữa sân\.

Bẫy: Không khai thác chênh lệch vị trí giữa hai người\.

DB14 – Partner bỏ nhỏ thành công

Đề bài: Partner vừa bỏ nhỏ khiến đối thủ phải nâng cầu\. Bạn đang đứng ở giữa sân\.

Lựa chọn: Tiến lên hỗ trợ bắt cầu trả ngắn ✓ · Lùi về cuối sân · Đứng yên · Đổi sang biên đối diện\.

Bẫy: Không chuyển trạng thái ngay khi đội mình giành được lợi thế\.

DB15 – Smash bị đối thủ chặn ngược

Đề bài: Bạn vừa smash, đối thủ chặn cầu nhanh về phía lưới\. Partner đang đứng bên cạnh\.

Lựa chọn: Người gần cầu xử lý, người còn lại bọc khoảng trống ✓ · Cả hai cùng lao lên · Cả hai cùng lùi · Người vừa smash tiếp tục đập bất chấp vị trí\.

Bẫy: Không phân chia trách nhiệm sau cú tấn công\.

DB16 – Tấn công vào người đứng giữa

Đề bài: Hai đối thủ đứng song song nhưng khoảng cách giữa họ khá rộng\. Partner đã giữ lưới\.

Lựa chọn: Smash vào khe giữa hai đối thủ ✓ · Đánh cao về góc cuối sân · Bỏ nhỏ sát lưới · Đánh chéo ra ngoài biên\.

Bẫy: Ưu tiên góc khó trong khi khoảng giữa là mục tiêu chiến thuật tốt\.

Nhóm H3 – Đọc đối thủ và xử lý áp lực

DB17 – Đối thủ chuyên chặn cầu vào chân

Đề bài: Đối thủ phòng thủ thường xuyên chặn smash xuống chân người đánh\. Bạn đang chuẩn bị tấn công\.

Lựa chọn: Điều chỉnh smash vào thân hoặc khoảng trống, partner giữ lưới ✓ · Tiếp tục smash cùng một hướng · Đứng lùi chờ · Chỉ bỏ nhỏ\.

Bẫy: Lặp lại phương án đã bị đối thủ khai thác\.

DB18 – Partner giao cầu bị tấn công

Đề bài: Partner giao cầu ngắn\. Đối thủ đẩy cầu nhanh về phía sau bạn\.

Lựa chọn: Người phía sau lùi xử lý, người giao cầu giữ vị trí trước ✓ · Người giao cầu lùi theo · Cả hai cùng tiến lên · Đứng chờ cầu rơi\.

Bẫy: Không thực hiện bọc lót sau giao cầu\.

DB19 – Đối thủ giả vờ đánh thẳng

Đề bài: Đối thủ ở cuối sân có động tác chuẩn bị đập thẳng nhưng thường đổi hướng vào khe giữa\.

Lựa chọn: Giữ tư thế cân bằng, quan sát mặt vợt và chuẩn bị bọc lót ✓ · Đoán hướng trước khi đối thủ chạm cầu · Cả hai đứng sát nhau · Một người bỏ hẳn khu vực giữa\.

Bẫy: Di chuyển quá sớm theo động tác giả\.

DB20 – Mất liên lạc khi đổi vị trí

Đề bài: Trong pha cầu nhanh, bạn và partner cùng di chuyển sang một bên, để trống bên còn lại\.

Lựa chọn: Người gần khu vực trống chủ động điều chỉnh, gọi vị trí và tái lập đội hình ✓ · Tiếp tục đánh mà không giao tiếp · Cả hai đứng nguyên · Đổ trách nhiệm cho partner\.

Bẫy: Không khôi phục cấu trúc đội hình sau khi bị phá vỡ\.

DB21 – Cầu cuối trận, áp lực cao

Đề bài: Tỷ số đang hòa ở thời điểm quyết định\. Đối thủ có cú giao cầu ngắn và partner của bạn đã sẵn sàng lên lưới\.

Lựa chọn: Trả giao cầu có kiểm soát vào khoảng trống, partner phối hợp giữ lưới ✓ · Đánh mạo hiểm sát biên · Nâng cầu bổng không cần thiết · Đập cầu ngay từ cú trả giao\.

Bẫy: Đánh quá mạo hiểm vì áp lực tỷ số\.

I\. Quy tắc đưa 30 câu vào SportDNA

Thành phần Phân bổ

Cầu lông đơn mới 15

Cầu lông đôi mới 15

Tổng bổ sung 30

Ngân hàng cũ 47

Tổng dự kiến 77

Những điểm cần giữ khi triển khai

Không ghi đè B01–B10, DF1–DF8, DB01–DB06 và các biến thể hiện có\.

Mỗi câu mới phải có ID riêng, không trùng ID cũ\.

Những cặp tình huống đối xứng phải có \`mirrorPairId\` và \`mirrorVariantId\`\.

Tách riêng ba lớp: hình học, hành động và đánh giá\.

Hard\-fail phải giữ nguyên quy tắc A = 0\.

Các chuỗi hai bước phải lưu trạng thái ban đầu, phản ứng của đối thủ và tập hành động tiếp theo\.

Không tự gán điểm chuỗi hoặc tự định nghĩa R khi chưa có đặc tả chấm điểm được duyệt\.

Không thay đổi các ma trận T của DF1–DF8 đã kiểm tra\.

Lưu ý về trạng thái: 30 câu trên là nội dung thiết kế mới, chưa phải 30 bản ghi JSON đã kiểm chứng theo schema TypeScript, chưa được kiểm tra tọa độ sân và chưa được hiệu chuẩn điểm\. Không nên đưa thẳng vào hệ thống chấm ELO ở trạng thái này\.

Bước tiếp theo hợp lý là chuyển cả 30 câu thành dữ liệu TypeScript/JSON đúng schema SportDNA, kèm tọa độ, biến thể và kiểm tra hard\-fail trước khi tích hợp vào ngân hàng câu hỏi\.

Bổ sung 30 câu cho SportDNA

Dưới đây là 30 câu/tình huống mới, bám đúng format hiện có \(hệ số 0–1, ✓ / ✗, bẫy kèm lý do\), chia thành 4 khối:

Khối Số câu Mã Dùng ở

A2\. Thể chất – Cầu lông đôi 6 A2\-1 → A2\-6 Quick \(đôi\)

A3\. Thể chất – Bóng đá 6 A3\-1 → A3\-6 Quick \(bóng đá\)

D\. Cầu lông đôi \(bổ sung\) 10 DB07 → DB16 \`/sportdna/bank/cau\-long\-doi\`

E\. Bóng đá \(bổ sung\) 8 FB09 → FB16 \`/sportdna/bank/bong\-da\`

Sau khi thêm, cầu lông đôi có 16 câu gốc \(17 tính cả DB04b\) và bóng đá có 16 câu gốc \(18 tính cả FB02b, FB04b\) — đủ để mỗi lượt 6 câu thực sự ngẫu nhiên\.

A2\. Câu hỏi thể chất – Cầu lông đôi \(6 câu\)

Mỗi câu 4 mức, từ thấp đến cao, dùng cho bài Quick khi chọn chế độ đôi\.

\[Sức mạnh\] Cú smash của bạn trong đôi thường… A\. Không qua được hàng thủ · B\. Đối thủ đỡ được nhưng bị đẩy lùi · C\. Thường gây khó cho đối thủ · D\. Đối thủ thường không phản xạ kịp

\[Tốc độ\] Khi partner đập cầu, bạn đứng ở lưới\. Đối thủ đỡ cầu rơi về giữa sân, bạn… A\. Không kịp lên · B\. Lên được nhưng chậm · C\. Lên kịp và bắt được cầu · D\. Lên kịp, chủ động tấn công tiếp

\[Phản xạ\] Đối thủ đập thẳng vào người bạn ở cự ly gần, bạn… A\. Thường bị dính cầu · B\. Đỡ được nhưng cầu bổng · C\. Chặn được cầu về lưới · D\. Phản xạ tốt, đưa cầu đi hiểm

\[Bền bỉ\] Chơi đôi với nhịp độ cao liên tục, bạn trụ được… A\. Dưới 10 phút · B\. 10 – 20 phút · C\. 20 – 40 phút · D\. Trên 40 phút

\[Cân bằng\] Khi bị đối thủ đổi hướng liên tục trái – phải, bạn… A\. Mất thăng bằng, bỏ vị trí · B\. Theo được nhưng chậm · C\. Giữ được vị trí phần lớn pha · D\. Luôn sẵn sàng đổi hướng

\[Phối hợp\] Khi partner di chuyển vào vùng của bạn, bạn… A\. Không để ý, hay va chạm · B\. Có để ý nhưng phản ứng chậm · C\. Theo kịp và bù vị trí · D\. Phối hợp nhịp nhàng, gần như không có khoảng trống

A3\. Câu hỏi thể chất – Bóng đá \(6 câu\)

\[Sức mạnh\] Cú sút xa của bạn từ 20–25 m… A\. Không tới khung thành · B\. Tới nhưng thủ môn bắt dễ · C\. Đi mạnh, thủ môn phải cố gắng · D\. Uy lực cao, khó cản

\[Tốc độ\] Chạy nước rút 30 m của bạn so với đồng đội cùng đội… A\. Chậm nhất đội · B\. Dưới trung bình · C\. Trên trung bình · D\. Nhanh nhất đội

\[Bền bỉ\] Chạy liên tục cả trận, phong độ của bạn… A\. Giảm rõ sau hiệp 1 · B\. Giảm ở cuối trận · C\. Giữ được phần lớn · D\. Gần như không giảm

\[Cân bằng\] Khi tranh chấp bóng bổng với đối thủ, bạn… A\. Hay bị hất ngã · B\. Giữ được nhưng thua thiệt · C\. Tranh chấp ngang ngửa · D\. Thường thắng, giữ vững trọng tâm

\[Phản xạ\] Khi bóng bất ngờ đổi hướng trong vòng cấm, bạn… A\. Phản ứng chậm, mất bóng · B\. Đỡ được nhưng không kiểm soát · C\. Đọc được và cản phá · D\. Phản xạ nhanh, xử lý gọn

\[Tranh chấp\] Khi bị đối thủ tì đè, bạn… A\. Dễ mất bóng · B\. Chịu được nhưng không thoát · C\. Giữ bóng và xoay xở · D\. Mạnh hơn, chủ động đẩy ngược

D\. Cầu lông đôi — bổ sung \(DB07 → DB16\)

DB07 – Ai lấy cầu cao giữa sân khi partner đang ở lưới \(Người phòng thủ, độ khó 1150\)

Đề bài: Cầu bổng cao rơi vào giữa sân\. Partner đang ở lưới phía trước, bạn ở vị trí phòng thủ bên phải\.

Lựa chọn: Bạn di chuyển vào giữa lấy cầu ✓ · Gọi partner lấy \(0,4\) · Đứng yên chờ \(0,2\) · Lùi ra sau \(0,3\)

Bẫy: Gọi partner lấy — partner đang ở lưới không kịp lùi, cầu sẽ rơi xuống sân\.

DB08 – Xoay vòng sau cú smash từ bên trái \(Người cuối sân, độ khó 1250\)

Đề bài: Bạn vừa đập cầu từ bên trái\. Partner đang ở giữa sân chuẩn bị lùi\. Chọn vị trí tiếp theo\.

Lựa chọn: Tiến lên giữ lưới trái ✓ · Đứng nguyên chờ \(0,3\) · Lùi về cuối sân trái \(0,2\) · Chạy sang phải giữ lưới \(0,4\)

Bẫy: Lùi về cuối sân trái — đây là thói quen đánh đơn; trong đôi, người vừa đập phải lên lưới, partner lùi xuống\.

DB09 – Phòng thủ đập chéo, chọn đường trả \(Người phòng thủ, độ khó 1250\)

Đề bài: Đối thủ đập chéo xuống góc trái tay bạn\. Người lưới đối thủ chực sẵn giữa sân\.

Cú đánh: Đỡ phẳng về giữa sân ✓ · Chặn ngắn sát lưới \(0,65\) · Nâng cao cuối sân \(0,4\) · Đập trả \(0,2\)

Điểm rơi: Giữa sân ✓ · Cuối sân \(0,5\) · Lưới \(0,5\) · Chéo góc \(0,35\)

Bẫy: Nâng cao cuối sân — nghe an toàn nhưng đưa cầu cho đối thủ tiếp tục đập\.

DB10 – Đập cầu từ giữa sân khi partner đã lên lưới \(Người cuối sân, độ khó 1200\)

Đề bài: Partner vừa giao cầu ngắn, đối thủ đẩy cầu cao về giữa sân\. Partner đang ở lưới\.

Cú đánh: Đập cầu ✓ · Cắt cầu \(0,55\) · Phông cầu \(0,4\) · Đánh ngang \(0,3\)

Điểm rơi: Giữa hai người đối thủ ✓ · Góc cuối \(0,5\) · Vào người gần \(0,35\) · Sát lưới \(0,25\)

Bẫy: Phông cầu — bỏ lỡ cơ hội tấn công trong khi partner đã sẵn sàng ở lưới\.

DB11 – Vị trí của người giao cầu khi partner giao \(Người giao cầu, độ khó 1100\)

Đề bài: Partner đang giao cầu ở ô phải\. Bạn nên đứng ở đâu?

Lựa chọn: Giữa sân, hơi lệch trái để bọc phần sân đối diện ✓ · Sát lưới bên phải partner \(0,3\) · Cuối sân giữa \(0,35\) · Đứng song song partner \(0,4\)

Bẫy: Đứng song song với partner — nếu đối thủ đẩy cầu sâu về bên trái sẽ không ai bọc\.

DB12 – Bọc lưới sau cú đập của partner \(Người giữ lưới, độ khó 1200\)

Đề bài: Partner đập cầu từ cuối sân bên phải\. Bạn đang ở lưới giữa\. Cầu có thể bị chặn rơi xuống lưới\.

Lựa chọn: Sẵn sàng bọc lưới cả hai bên ✓ · Lùi về cuối sân trái \(0,4\) · Đứng yên giữa lưới \(0,3\) · Chạy sang phải sát partner \(0,25\)

Bẫy: Lùi về cuối sân trái — cầu rơi ngắn sẽ không ai bắt\.

DB13 – Chuyển phòng thủ → tấn công trong đôi \(Người phòng thủ, độ khó 1250\)

Đề bài: Bạn vừa chặn cầu về lưới đối thủ\. Đối thủ lùi về cuối sân đẩy cầu cao\. Partner đang ở lưới\.

Cú đánh: Đập cầu ✓ · Cắt cầu \(0,5\) · Phông cầu \(0,4\) · Đẩy cầu \(0,3\)

Điểm rơi: Giữa hai người đối thủ ✓ · Góc xa người lưới \(0,55\) · Vào người \(0,4\) · Sát lưới \(0,25\)

Bẫy: Phông cầu — bỏ lỡ cơ hội tấn công ngay sau khi vừa chuyển thế\.

DB14 – Kết thúc điểm khi đối thủ mất thăng bằng \(Người cuối sân, độ khó 1250\)

Đề bài: Đối thủ vừa mất thăng bằng ở giữa sân\. Cầu bổng đến trước mặt bạn, partner đang ở lưới\.

Cú đánh: Đập cầu chéo xa người lưới ✓ · Đập thẳng vào người \(0,5\) · Bỏ nhỏ \(0,4\) · Đánh ngang \(0,25\)

Điểm rơi: Chéo góc xa người đứng lưới ✓ · Giữa sân \(0,5\) · Vào người \(0,4\) · Góc gần \(0,35\)

Bẫy: Bỏ nhỏ — partner đã ở lưới, bỏ nhỏ vừa chồng vị trí vừa mất lợi thế kết thúc\.

DB15 – Giao cầu khi người nhận đứng chực sẵn tấn công \(Người giao cầu, độ khó 1200\)

Đề bài: Bạn giao cầu\. Người nhận đứng cao, vợt giơ lên, sẵn sàng đập\. Partner ở giữa sân\.

Kiểu giao: Giao ngắn thấp sát vạch ✓ · Giao cao sâu \(0,4\) · Flick \(0,3\) · Giao phẳng nhanh \(0,25\)

Điểm rơi: Sát vạch giao ngắn, gần đường giữa ✓ · Cuối ô giao \(0,35\) · Sát biên \(0,4\)

Bẫy: Flick — người nhận đã ở thế cao, flick sẽ bị đập thẳng xuống\.

DB16 – Đỡ smash vào góc trái tay khi partner ở giữa \(Người phòng thủ, độ khó 1300\)

Đề bài: Đối thủ đập mạnh xuống góc trái tay của bạn\. Partner đứng giữa sân chờ bọc\.

Cú đánh: Đỡ phẳng chéo sang phải ✓ · Chặn ngắn về lưới trái \(0,55\) · Nâng cao giữa sân \(0,4\) · Đập trả \(0,25\)

Điểm rơi: Giữa sân chếch phải ✓ · Cuối sân phải \(0,5\) · Lưới trái \(0,5\) · Giữa sân \(0,35\)

Bẫy: Nâng cao giữa sân — đưa cầu về đúng tầm đập của đối thủ\.

E\. Bóng đá — bổ sung \(FB09 → FB16\)

FB09 – Chọn vị trí khi đội bạn tấn công cánh phải \(Hậu vệ cánh trái, độ khó 1150\)

Đề bài: Đồng đội đang tấn công cánh phải\. Bạn là hậu vệ cánh trái\. Chọn vị trí\.

Lựa chọn: Dâng lên ngang hàng tiền vệ, bọc cánh trái ✓ · Ở lại hàng thủ \(0,5\) · Dâng cao tận vòng cấm đối phương \(0,3\) · Chạy sang cánh phải hỗ trợ \(0,25\)

Bẫy: Dâng cao tận vòng cấm đối phương — bỏ trống cánh trái khi mất bóng\.

FB10 – Chuyền bóng khi bị ép ở biên \(Hậu vệ cánh, độ khó 1200\)

Đề bài: Bạn nhận bóng sát biên, đối thủ ép sát và đồng đội chưa lên kịp\.

Lựa chọn: Chuyền về trung vệ hoặc thủ môn ✓ · Phá bóng ra biên \(0,55\) · Chuyền dài lên tiền đạo \(0,4\) · Cố rê qua người \(0,35\)

Bẫy: Cố rê qua người — mất bóng ngay ở vị trí nguy hiểm\.

FB11 – Đối mặt 2 đánh 1 khi phòng thủ \(Trung vệ, độ khó 1300\)

Đề bài: Đối thủ phản công 2 đánh 1 với bạn\. Một người có bóng, một người chạy chỗ\.

Lựa chọn: Giữ vị trí giữa, chặn đường chuyền, chờ hỗ trợ ✓ · Bám người chạy chỗ \(0,35\) · Lao vào người có bóng \(0,3\) · Lùi về thủ môn \(0,4\)

Bẫy: Bám người chạy chỗ — để người có bóng tự do sút\.

FB12 – Nhận bóng từ thủ môn dưới áp lực \(Trung vệ, độ khó 1250\)

Đề bài: Thủ môn chuyền cho bạn, đối thủ ép sát từ phía sau\.

Lựa chọn: Chuyền một chạm sang ngang cho đồng đội ✓ · Phá bóng lên \(0,5\) · Đỡ bóng rồi xoay \(0,4\) · Đỡ bóng rồi rê \(0,3\)

Đích chuyền: Trung vệ bên cạnh / hậu vệ cánh ✓ · Tiền vệ \(0,5\) · Thủ môn \(0,4\) · Tiền đạo \(0,3\)

Bẫy: Đỡ bóng rồi xoay — đối thủ ép sát dễ đoán và cướp bóng\.

FB13 – Xử lý khi thủ môn đã lên tấn công \(Hậu vệ, độ khó 1200\)

Đề bài: Phút cuối, đội bạn đang thua\. Thủ môn đã lên vòng cấm đối phương đánh đầu\. Bóng bật ra đến chân bạn ở giữa sân\.

Lựa chọn: Sút ngay về khung thành trống ✓ · Dẫn bóng lên \(0,5\) · Chuyền cho đồng đội gần \(0,4\) · Chuyền về phần sân nhà \(0,3\)

Bẫy: Dẫn bóng lên — mất thời gian, đối thủ kịp lùi về\.

FB14 – Đá phạt trực tiếp gần vòng cấm \(Tiền vệ, độ khó 1200\)

Đề bài: Đá phạt trực tiếp cách khung thành 22 m, chếch bên phải\. Hàng thủ đối phương dựng 4 người\.

Lựa chọn: Sút xoáy qua hàng rào vào góc xa ✓ · Tạt bóng vào vòng cấm \(0,55\) · Sút thẳng vào góc gần \(0,4\) · Chuyền ngắn cho đồng đội \(0,3\)

Bẫy: Sút thẳng vào góc gần — hàng rào đã che, thủ môn dễ bắt\.

FB15 – Chuyền bóng khi bị ép bởi 2 người \(Tiền vệ trung tâm, độ khó 1250\)

Đề bài: Bạn nhận bóng giữa sân, hai đối thủ ép từ hai bên\. Đồng đội đang di chuyển\.

Lựa chọn: Chuyền một chạm về phía đồng đội đang trống ✓ · Chuyền dài mạo hiểm \(0,35\) · Rê bóng thoát \(0,3\) · Giữ bóng chờ \(0,2\)

Bẫy: Rê bóng thoát — bị ép hai bên, rê bóng rất dễ mất\.

FB16 – Phá bóng khi bị ép cuối trận \(Hậu vệ, độ khó 1150\)

Đề bài: Phút 90, đội bạn đang dẫn 1\-0\. Bạn nhận bóng ở góc sân nhà, đối thủ ép sát\. Chọn xử lý\.

Lựa chọn: Phá bóng thật xa lên trên hoặc ra biên ✓ · Chuyền về thủ môn \(0,5\) · Chuyền ngang sân \(0,35\) · Cố rê qua người \(0,2\)

Bẫy: Cố rê qua người — mất bóng ở vị trí nguy hiểm, đối thủ có cơ hội gỡ hòa\.

Ghi chú khi ghép vào mã nguồn

1\. Cập nhật bảng tổng:

Nhóm Trước Sau

A\. Thể chất cầu lông đơn 8 8

A2\. Thể chất cầu lông đôi \(mới\) 0 6

A3\. Thể chất bóng đá \(mới\) 0 6

B\. Tình huống sân B01–B10 10 10

C\. Họ phòng thủ DF1–DF8 8 \(\+ đối xứng\) 8 \(\+ đối xứng\)

D\. Cầu lông đôi 7 17

E\. Bóng đá 9 17

F\. Gợi ý vị trí bóng đá 5 5

2\. Ứng viên tạo bản đối xứng trái–phải \(nếu muốn làm tiếp\):

DB08 → DB08b \(smash từ bên phải, xoay sang lưới phải\)

DB09 → DB09b \(đối thủ đập thẳng thay vì đập chéo\)

DB15 → DB15b \(người nhận đứng thấp, giao cao sâu là đúng\)

FB11 → FB11b \(3 đánh 2 thay vì 2 đánh 1\)

FB14 → FB14b \(đá phạt xa 30 m, chọn tạt bóng thay vì sút\)

3\. Cách dùng A2 / A3:

Đề xuất tạo Quick \(đôi\) và Quick \(bóng đá\): 6 câu A2/A3 \+ 2 câu tình huống ngẫu nhiên từ D/E \(tương tự Quick đơn: 8 câu A \+ B01, B05\)\.

Nếu không muốn tạo mode mới, có thể trộn A2/A3 vào đầu mỗi lượt D/E làm "câu khởi động thể chất", mỗi lượt 1–2 câu\.

4\. Cập nhật phần "Còn thiếu":

✅ Cầu lông đôi: 16 câu gốc → mỗi lượt 6 câu đã thực sự ngẫu nhiên \(không còn lặp cứng 6 câu\)\.

✅ Bóng đá: 16 câu gốc → đa dạng hơn nhiều so với trước\.

✅ Đã có câu hỏi thể chất cho cả đôi và bóng đá\.

❌ Vẫn còn thiếu: câu hỏi thể chất cho nhóm F \(gợi ý vị trí\) — có thể bổ sung sau nếu cần\.

chia rõ thành 2 mục cầu lông, bóng đá cho tôi và mấy thanh công cụ như hồ sơ, thiết bị, cồng đồng bên sportDNa làm gọp vô luôn cái của web luôn đi

## <a id="_twy6bjub68k7"></a>T17\#4 \(20,480 ký tự\)

SPORTDNA — MASTER HANDOFF FOR FIGMA AI

Version: v1\.3\.1 FINAL

Recipient: Figma AI

Date: 06/11/2026

Scope: Badminton only \(football cut\)

Status: UI AUTHORIZED — Business logic PENDING

⚡ 0\. INSTRUCTIONS

Task Status

Đọc và phân tích tài liệu ✅ GO

Thiết kế UI skeleton, navigation, component library ✅ GO

Vẽ mockup Scenario Court, CP Profile, Equipment Fit ð¡ CONDITIONAL GO — phải show mockup cho Lead duyệt trước khi build final

Implement business logic \(scoring, ELO, CP engine\) ⏸️ HOLD — chờ ChatGPT finalize sᵢ table

Thay đổi công thức S, ELO, CP, Equipment Fit ❌ FORBIDDEN

Placeholder convention: Dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\`, \`\{\{D\}\}\`, \`\{\{fitScore\}\}\`, \`\{\{coverage\}\}\` khi gặp giá trị chưa finalize\. Không hardcode số\.

1\. PRODUCT OVERVIEW

SportDNA = nền tảng thể thao với 5 trục độc lập \(không gộp thành điểm tổng\):

Skill Rating — năng lực thể thao \(ELO\)

Evidence Level — mức xác thực V1/V2/V3

Community Reputation \(CP\) — uy tín đóng góp cộng đồng

Achievement — thành tích thi đấu

Equipment Fit — độ phù hợp thiết bị

Mỗi trục có visual identity riêng \(màu, icon, badge style\)\. Không được dùng chung style\.

Trục Visual identity

Skill Rating Primary blue

Evidence Level Purple badge

Community Reputation Gold badge

Achievement Red badge

Equipment Fit Green

2\. SCOPE FINAL

Hạng mục Quyết định

Môn thể thao CHỈ CẦU LÔNG \(bóng đá cut khỏi v1\.3\)

Loại đánh Đơn \(singles\) only

Audience Toàn bộ trình độ \(D range \[900, 1500\]\)

Scenario pool 20 \(10 tình huống × 2 biến thể\)

Assessment modes Quick \(8\-10 câu\) \+ Deep \(≤ 20 câu, dùng hết pool\) \+ Retest \(10 câu sample\)

3\. HỆ TỌA ĐỘ SÂN \(FINAL\)

3\.1\. Convention duy nhất

Trục Range Ý nghĩa

\`x\` \[0, 1\] 0 = biên trái, 1 = biên phải

\`y\` \[0, 1\] 0 = baseline đối thủ, 0\.5 = lưới, 1 = baseline người chơi

Vùng sân:

Opponent's half: \`y ∈ \[0, 0\.5\]\`

Player's half: \`y ∈ \(0\.5, 1\]\`

Net line: \`y = 0\.5\`

3\.2\. Target depth d — DERIVED, không lưu trong JSON

d=\(0\.5\-y\)2

y d Vị trí

0\.50 0\.00 Sát lưới đối thủ

0\.40 0\.20 Gần lưới

0\.352 0\.296 Vạch giao cầu ngắn \(1\.98m\)

0\.25 0\.50 Giữa sân đối thủ

0\.10 0\.80 Gần baseline đối thủ

0\.00 1\.00 Baseline đối thủ

Quy tắc: JSON luôn dùng \`y\` cho vị trí\. Scoring engine tự tính \`d\` tại runtime khi cần\.

4\. NGÂN HÀNG 20 SCENARIO \(FINAL\)

4\.1\. Coverage matrix

Nhóm năng lực Scenario phủ

Giao cầu B04, B05

Tấn công B01, B08

Phòng thủ B02, B09

Điều cầu B03, B07

Di chuyển B03, B09

Đọc tình huống B07, B10

Chuyển trạng thái B08 \+ B09 \(reframed\)

Chiến thuật đôi N/A v1\.3\.1

4\.2\. Danh mục

Mã Tên rally\_phase Năng lực chính

B01 Tấn công cầu bổng giữa sân attacking Chọn điểm rơi

B02 Phòng thủ smash vào thân defending Block / phản tạt

B03 Xử lý cầu sát lưới neutral Net shot

B04 Nhận giao cầu neutral Return serve

B05 Chọn phương án giao cầu neutral Serve selection

B06 Bị ép cuối sân cần thoát defending Thoát ép

B07 Drive ngang đổi hướng neutral Drive control

B08 Chuyển phòng thủ → tấn công attacking Transition \#1

B09 Phòng thủ biên trái tay → phản công defending→attacking Transition \#2

B10 Kết thúc điểm khi đối thủ mất thăng bằng attacking Finish

4\.3\. targetZones JSON \(3×3 grid chuẩn\)

\`\`\`json "targetZones": \{ "net\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.40, 0\.50\], "dRange": \[0\.00, 0\.20\]\}, "net\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.40, 0\.50\], "dRange": \[0\.00, 0\.20\]\}, "net\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.40, 0\.50\], "dRange": \[0\.00, 0\.20\]\}, "mid\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.25, 0\.35\], "dRange": \[0\.30, 0\.50\]\}, "mid\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.25, 0\.35\], "dRange": \[0\.30, 0\.50\]\}, "mid\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.25, 0\.35\], "dRange": \[0\.30, 0\.50\]\}, "back\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.05, 0\.15\], "dRange": \[0\.70, 0\.90\]\}, "back\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.05, 0\.15\], "dRange": \[0\.70, 0\.90\]\}, "back\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.05, 0\.15\], "dRange": \[0\.70, 0\.90\]\} \} \`\`\`

\`net\_\*\` = gần lưới \(y cao, d thấp\)\. \`back\_\*\` = gần baseline đối thủ \(y thấp, d cao\)\. \`dRange\` là helper text, engine tự tính\.

5\. CÔNG THỨC CHẤM ĐIỂM

S=ATR

Biến Ý nghĩa Range

A Action Fit \[0\.20, 1\.00\] — floor = 0\.20, chỉ A = 0 khi rule violation \(serve sai loại\)

T Tactical Target \`base\_3x3 × context\_multiplier\`

R Line Proximity 1\.0 / 0\.93 / 0\.8 theo khoảng cách tới vạch

5\.1\. A scale

A Ý nghĩa

1\.00 Lựa chọn rất phù hợp

0\.80 Tốt

0\.60 Chấp nhận được

0\.40 Ít hiệu quả

0\.20 Bất lợi rõ rệt nhưng khả thi

0\.00 Chỉ rule violation \(serve action ngoài 3 loại serve\)

5\.2\. T — Context multiplier

Dùng vector \`movement\` trong JSON:

Điều kiện Multiplier

Đối thủ di chuyển RA XA target 1\.2

Đứng yên / không rõ 1\.0

Đối thủ di chuyển VỀ target 0\.7

5\.3\. R — Line proximity

Khoảng cách tới vạch R

≥ 0\.5m 1\.00

0\.2–0\.5m 0\.93

< 0\.2m 0\.80

6\. LUẬT GIAO CẦU B05 \(FINAL\)

Loại giao targetDepthRange d Tương đương y

serve\_short \[0\.30, 0\.45\] \[0\.275, 0\.350\]

serve\_flick \[0\.45, 0\.75\] \[0\.125, 0\.275\]

serve\_long \[0\.75, 1\.00\] \[0\.000, 0\.125\]

Rule: Click ngoài range → T = 0, S = 0\.

⚠️ DISCLAIMER \(bắt buộc hiển thị UI\)

\*"Vùng điểm rơi gợi ý được thiết kế cho SportDNA assessment\. BWF chỉ quy định cầu phải qua vạch giao ngắn 1\.98m và rơi trong ô giao chéo — không quy định dải cụ thể cho short/long/flick\. Đây là targetZone của hệ thống đánh giá, không phải luật thi đấu\."\*

UI:

Overlay xanh khi chọn serve action → label: \*"Vùng gợi ý \(SportDNA\)"\*, không phải \*"Vùng hợp lệ \(BWF\)"\*

Toast sai: \*"Ngoài vùng gợi ý của SportDNA\. Điểm sẽ không được tính\."\* — không nói "phạm luật"

7\. ĐỘ KHÓ D \(FINAL\)

D=900\+roundi=17wisi

7\.1\. Định nghĩa sᵢ \(bắt buộc\)

Property Value

Range \`sᵢ ∈ \[0, 100\]\`, integer

Direction Higher = harder

0 Không áp lực \(đối thủ đứng yên, cầu chậm, không gian rộng\)

50 Trung bình

100 Áp lực tối đa

7\.2\. Trọng số wᵢ

\# Tiêu chí Đo wᵢ

1 Movement demand Quãng di chuyển player 1\.2

2 Time pressure Thời gian phản ứng 1\.0

3 Stamina cost Năng lượng tiêu hao 0\.6

4 Opponent motion Đối thủ di chuyển 0\.9

5 Shuttle difficulty Cao \+ tốc độ \+ quỹ đạo 0\.8

6 Court constraint Ép biên / góc hẹp 0\.7

7 Decision complexity Số phương án hợp lệ \(ít = khó\) 0\.8

Σwᵢ = 6, D range = \[900, 1500\]\.

7\.3\. Phân bổ 20 scenario \(BẮT BUỘC\)

Phân khúc D range Số lượng

Dễ \[900, 1100\) 5 scenario

Trung bình \[1100, 1300\) 10 scenario

Khó \[1300, 1500\] 5 scenario

ChatGPT đang finalize bảng sᵢ cho đúng 5/10/5\. Figma dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\` và \`\{\{D\}\}\` placeholder\.

7\.4\. Dùng cho 2 mục đích

Chọn độ khó scenario theo trình độ user

Feed vào ELO update: $E\_i = dfrac\{1\}\{1 \+ 10^\{\(D\_i \- R\_i\)/400\}\}$

8\. ELO \(không đổi v6\.1\)

Mỗi kỹ năng bắt đầu 1000

Update: Rnew=Rold\+K\(Si\-Ei\)

Tách rating: \`tactical\_rating\`, \`shot\_selection\_rating\`, \`target\_selection\_rating\`, \`defensive\_reading\_rating\`

KHÔNG dùng: response time, CP, promotion, giá sản phẩm để tác động ELO

9\. EVIDENCE LEVEL

Level Nguồn

V1 Đã làm SportDNA assessment

V2 Xác nhận cộng đồng \(explicit, không auto\)

V3 Thành tích chính thức

CP KHÔNG phải evidence level\.

10\. COMMUNITY REPUTATION \(CP\) — FINAL

10\.1\. Ba bucket độc lập

Bucket Nguồn Decay UI hiển thị

\`pendingContribution\` Events PENDING / NEEDS\_REVIEW Không Dòng phụ "Đang chờ duyệt"

\`lifetimeContribution\` Events APPROVED chưa revoke Không Badge Lifetime

\`currentReputation\` Events APPROVED có decay Có Score chính

10\.2\. Tier thresholds \(PROVISIONAL\)

Tier ID Score

NEWCOMER 0\-49

ACTIVE\_MEMBER 50\-149

TRUSTED\_MEMBER 150\-349

CONTRIBUTOR 350\-649

PILLAR 650\+

10\.3\. Lifetime Peak Tier \(tách khỏi lifetimeContribution\)

Field Khi nào giảm

\`lifetimeContribution\` User tự xóa bài, hoặc revoke

\`lifetimePeakTier\` CHỈ giảm khi CONFIRMED\_VIOLATION / FRAUD / SPAM

\`currentReputation\` Decay tự nhiên

Logic tính \`lifetimePeakTier\`: \`\`\`

Khởi tạo = NEWCOMER

Event APPROVED → peakCandidate = resolveTier\(lifetimeContribution\) if peakCandidate\.rank > lifetimePeakTier\.rank: lifetimePeakTier = peakCandidate

Event REVOKE do VIOLATION/FRAUD/SPAM: recompute = resolveTier\(lifetimeContribution\) lifetimePeakTier = min\(currentPeakTier, recompute\)

User tự xóa bài \(không vi phạm\): lifetimeContribution giảm, lifetimePeakTier GIỮ NGUYÊN \`\`\`

10\.4\. Event lifecycle

\`\`\` PENDING → APPROVED / NEEDS\_REVIEW / REJECTED / REVOKED \`\`\`

Trạng thái Ý nghĩa Bucket

PENDING Mới tạo, < 7 ngày pendingContribution

APPROVED Đã duyệt lifetimeContribution \+ currentReputation

NEEDS\_REVIEW Có flag bất thường pendingContribution \(không move\)

REJECTED Reviewer reject Không tính

REVOKED Bị xóa / vi phạm Không tính

Không có multiplier 50% cho account < 7 ngày\.

10\.5\. Decay

Event type Half\-life

Posts \(Tips/Review/Experience\) 365 ngày

Interactions \(like/comment\) 180 ngày

P\(t\)=P02\-t/H

10\.6\. Deletion / revocation

User tự xóa bài: thu hồi điểm, KHÔNG hạ \`lifetimePeakTier\`

CONFIRMED\_VIOLATION/FRAUD/SPAM: thu hồi điểm VÀ hạ \`lifetimePeakTier\`

Bị xóa khi đang PENDING/NEEDS\_REVIEW: xóa khỏi \`pendingContribution\` ngay, không bao giờ chạm lifetime

10\.7\. Event ledger

APPROVED / REVOKED: giữ vĩnh viễn

REJECTED: purge sau 90 ngày

Event ID unique, có audit trail

10\.8\. UI profile rules

Current Reputation \(primary\):

CP score hiện tại

Current Tier — hiển thị chính

Lifetime Recognition \(secondary\):

\`lifetimeContribution\` \(số\) — hiển thị riêng

\`lifetimePeakTier\` \(badge\) — badge phụ, tooltip: \*"Danh dự lịch sử"\*

Nếu \`lifetimeTierRevokedAt \!== null\` → tooltip: \*"Danh dự lịch sử đã bị điều chỉnh do vi phạm\."\*

Pending:

\`pendingContribution > 0\` → dòng phụ: \*"\+15 đang chờ duyệt"\*, style mờ

Không bao giờ hiển thị \`pending \+ lifetime = X\` như pending đã duyệt

Status NEEDS\_REVIEW → tooltip: \*"Đang được xem xét\. Chưa được cộng vào uy tín\."\*

Shop:

Không có CP cấp cửa hàng

Chủ shop có CP cá nhân trên profile cá nhân

Demo:

Không tạo CP thật, không hiển thị

11\. EQUIPMENT FIT — CẦU LÔNG \(FINAL\)

11\.1\. 4 module độc lập

\`\`\` ProductDataValidator | ConfigurationValidator | EquipmentFitEngine | CommercialRankingEngine \`\`\`

Khuyến mãi, giá, quảng cáo KHÔNG được ảnh hưởng Fit Score\.

11\.2\. EquipmentFitResult JSON

\`\`\`json \{ "status": "calculated" | "insufficient\_data", "fitScore": 92 | null, "dataCoverage": 0\.75, "availableCriteria": 3, "totalCriteria": 4, "criticalMissing": \["balance"\], "missingCriteria": \["compatible\_tension"\], "confidence": "medium", "dataSourceQuality": \{ "manufacturerVerified": 2, "sellerProvided": 1, "inferred": 0, "unknown": 1 \} \} \`\`\`

11\.3\. Coverage rules

Coverage Status Confidence

< 50% insufficient\_data fitScore = null

50\-69% calculated low

70\-89% calculated medium

90\-100% calculated high

11\.4\. Critical criteria guard \(BẮT BUỘC\)

Core criteria vợt:

Criteria Critical level

Weight CRITICAL

Shaft stiffness CRITICAL

Balance point CRITICAL

Compatible tension Non\-critical

Guard rules: \`\`\` criticalAvailable = count\(weight, stiffness, balance có data\)

if criticalAvailable < 2: → status = "insufficient\_data", fitScore = null, ẩn khỏi list else if criticalAvailable == 2: → status = "calculated", confidence = "low" → warning: "Thiếu 1 tiêu chí cốt lõi" → rank CUỐI danh sách else \(criticalAvailable == 3\): → coverage logic bình thường \`\`\`

UI: banner vàng khi \`criticalMissing\.length > 0\`: \*"Sản phẩm thiếu \[X\] tiêu chí cốt lõi\. Điểm phù hợp có thể không chính xác\."\*

11\.5\. Trọng số vợt \(Budget đã bị loại\)

Tiêu chí Weight Loại

Weight 22% Core technical

Shaft stiffness 22% Core technical

Balance point 22% Core technical

Compatible tension 17% Core technical

Playing style match 17% User preference

Total 100%

Tag UI: \*"Trọng số đang ở giai đoạn thử nghiệm, sẽ hiệu chỉnh sau beta\."\*

11\.6\. Budget — CHỈ filter, KHÔNG phải tiêu chí

Budget không xuất hiện trong bất kỳ trọng số Fit nào\.

\`\`\` Step 1: User chọn budget range → filter products Step 2: Với products còn lại → tính Fit Score \(chỉ từ 5 technical criteria\) Step 3: Rank products theo Fit Score \(không theo giá\) \`\`\`

Range Note

Dưới 1 triệu Bình dân

1\-2 triệu DEFAULT

2\-5 triệu Trung cấp

Trên 5 triệu Cao cấp

UI copy bắt buộc: \*"Ngân sách được dùng để lọc sản phẩm\. Điểm phù hợp được tính dựa trên thông số kỹ thuật, không phụ thuộc giá\."\*

11\.7\. Data source quality

\`\`\` MANUFACTURER\_VERIFIED | SELLER\_PROVIDED | INFERRED | UNKNOWN \`\`\`

UI phải phân biệt\. Không hiển thị 100% coverage như 100% chính xác\.

11\.8\. Configuration validation

\`\`\` User chọn căng 35 lbs, max vợt 30 lbs → Error code: TENSION\_EXCEEDS\_MANUFACTURER\_LIMIT → KHÔNG chuyển thành Fit Score = 0 \`\`\`

11\.9\. Football

CẮT khỏi v1\.3\.1\. Backlog, mở lại khi có reviewer chuyên môn\.

12\. JSON CONTRACTS

12\.1\. Scenario JSON

\`\`\`json \{ "scenarioId": "BD\-B01\-V1\-deep\-seed1001", "variant": "deep", "gameMode": "singles", "rallyPhase": "attacking", "singlesOnly": true, "state": \{ "player": \{"x": 0\.22, "y": 0\.78, "stamina": 0\.80\}, "opponent": \{"x": 0\.75, "y": 0\.15, "movement": \[\-0\.05, 0\.10\]\}, "shuttle": \{"x": 0\.24, "y": 0\.68, "height": "high", "speed": "medium"\} \}, "availableActions": \["smash", "drop", "clear", "drive"\], "actionFit": \{ "smash": 0\.80, "drop": 1\.00, "clear": 0\.60, "drive": 0\.20 \}, "trajectory": \{"height": "high", "speed": "medium"\}, "difficulty": "\{\{D\}\}", "targetZones": \{ \.\.\. \} \} \`\`\`

12\.2\. CP Profile JSON

\`\`\`json \{ "pendingContribution": 15, "lifetimeContribution": 320, "currentScore": 180,

"currentTier": "TRUSTED\_MEMBER", "lifetimePeakTier": "CONTRIBUTOR", "lifetimeTierRevokedAt": null,

"enabled": true, "recentEvents": \[ \{"eventId": "e1", "type": "TIPS\_POST", "status": "APPROVED", "points": 5, "createdAt": "\.\.\."\}, \{"eventId": "e2", "type": "LIKE\_RECEIVED", "status": "PENDING", "points": 0\.2, "createdAt": "\.\.\."\} \] \} \`\`\`

12\.3\. Equipment Fit Result JSON

\(Đã có trong Section 11\.2\)

13\. DANH SÁCH MÀN HÌNH

13\.1\. Assessment Flow — CONDITIONAL GO

Màn Chức năng

Hub SportDNA Entry point, chọn Quick/Deep/Scenario

Quick Quiz 8\-10 câu

Deep Quiz ≤ 20 câu

Scenario Court Sân 2D, chọn action \+ click target

Assessment Result Kết quả \+ radar \+ tier \+ evidence

13\.2\. Profile — CONDITIONAL GO

Màn Chức năng

Profile Overview 5 trục riêng biệt

Skill Detail ELO \+ radar 8 trục

Reputation Detail Current Tier \(primary\) \+ Lifetime Peak \(secondary\) \+ pending line \+ history

Achievement List Danh sách thành tích

Equipment Fit Summary Top 3\-5 sản phẩm phù hợp

13\.3\. Equipment — CONDITIONAL GO

Màn Chức năng

Product Listing Filter budget \+ Fit Score \+ critical warning

Product Detail Spec table \+ Data coverage \+ Data source \+ criticalMissing banner

Configuration Editor Căng cước, chọn biến thể → validate

Fit Explanation Lý do fit/không fit \+ data quality breakdown

13\.4\. Community — GO

Màn Chức năng

Community Feed Bài viết \+ 2 badges \(Skill \+ CP\)

Post Detail Nội dung \+ tác giả badges

Post Composer Chủ đề: experience/question/review/tips/offer/wanted

Reputation History Event ledger

Moderation Status Pending/Approved/Needs\_Review

13\.5\. Settings — GO

Màn Chức năng

Privacy Controls Toggle show/hide Skill Badge, CP Badge

Budget Preferences Chọn budget range default

14\. COMPONENT INVENTORY

Assessment

\`CourtCanvas\` — SVG sân top\-down, dùng \`y\` convention \(0 = baseline đối thủ, 1 = baseline người chơi\)

\`PlayerMarker\` — chấm xanh

\`OpponentMarker\` — chấm đỏ \+ movement vector

\`ShuttleMarker\` — icon cầu \+ direction

\`TargetZone\` — clickable 3×3 grid

\`ActionSelector\` — Smash/Drop/Clear/Drive/Net\_shot/Lift/Block/Push/Serve\_\*

\`ValidTargetOverlay\` — vùng hợp lệ sáng lên khi chọn action \(bắt buộc cho serve\)

\`ContextIndicator\` — hiển thị multiplier 1\.2/1\.0/0\.7

\`ScenarioProgress\`

\`AssessmentResult\`

Profile

\`SkillRatingCard\`

\`EvidenceLevelBadge\` \(V1/V2/V3\)

\`CurrentReputationCard\` \(primary\)

\`LifetimePeakBadge\` \(secondary, có tooltip\)

\`PendingContributionLine\` \(mờ, "\+15 đang chờ duyệt"\)

\`AchievementList\`

\`EquipmentFitSummary\`

Equipment

\`ProductCard\` — Fit Score \+ Data coverage \+ critical warning icon

\`CoreSpecificationTable\`

\`DataCoverageIndicator\` — progress bar 0\-100%

\`DataSourceLabel\` — chip 4 loại

\`CriticalMissingBanner\` — vàng, hiện khi \`criticalMissing\.length > 0\`

\`ConfigurationWarning\` — hiện \`TENSION\_EXCEEDS\_MANUFACTURER\_LIMIT\`

\`BudgetFilter\` — 4 chip range

\`FitScoreDisplay\` — có tooltip \+ confidence badge

Community

\`CommunityPostCard\` — 2 badges \(Skill \+ CP\) cạnh tên tác giả

\`ContributionIndicator\`

\`PendingContributionState\` — "Đang chờ duyệt"

\`ReputationHistory\` — timeline

\`ModerationStatusBadge\`

15\. UI REQUIREMENTS \(bắt buộc\)

15\.1\. Phân biệt 5 trục

Không dùng cùng màu/icon/style\. Mỗi trục visual identity riêng \(xem Section 1\)\.

15\.2\. Current vs Lifetime Tier

Current Tier: hiển thị chính, prominent

Lifetime Peak: badge phụ, nhỏ hơn, tooltip \*"Danh dự lịch sử, không giảm do inactivity"\*

\`lifetimeContribution\` \(số\): hiển thị riêng, có thể giảm \(user tự xóa bài\), không gộp với peak badge

15\.3\. Serve UI

Chọn serve action → overlay xanh với label \*"Vùng gợi ý \(SportDNA\)"\*

Click ngoài → toast \*"Ngoài vùng gợi ý\. Điểm sẽ không được tính\."\*

Không dùng từ "phạm luật", "BWF", "hợp lệ"

15\.4\. Fit Score có điều kiện

\`status = "insufficient\_data"\` → KHÔNG hiện %, thay bằng \*"Chưa đủ dữ liệu để đánh giá"\*

\`status = "calculated"\` → hiện % \+ coverage \+ confidence \+ source breakdown

\`criticalMissing\.length > 0\` → banner vàng \+ rank cuối

15\.5\. Pending rõ ràng

Pending không hiển thị như điểm đã cộng

Dòng phụ mờ, không prominent

NEEDS\_REVIEW có tooltip riêng

15\.6\. Responsive

Bắt buộc cả Desktop \(1440\) và Mobile \(390\)\.

16\. WHAT FIGMA MUST NOT DO

❌ Đổi công thức S = A × T × R

❌ Gộp 5 trục thành 1 điểm

❌ Hiển thị CP như evidence level

❌ Hardcode \`sᵢ\` hoặc \`D\` — dùng placeholder

❌ Thêm môn thể thao ngoài cầu lông

❌ Tự sửa business logic

❌ Dùng Unity / engine 3D — chỉ Web 2D \(SVG/Canvas\)

❌ Đưa Budget vào Fit weights

❌ Dùng \`d\` và \`y\` lẫn lộn trong code — chỉ \`y\` cho vị trí

❌ Hiển thị pending như đã duyệt

17\. RELEASE GATE

Item Status

UI skeleton, navigation flow ✅ GO

Component library \(generic\) ✅ GO

Community UI ✅ GO

Settings UI ✅ GO

Scenario Court UI ð¡ CONDITIONAL — show mockup duyệt trước, đảm bảo \`y\` convention đúng

CP Profile UI ð¡ CONDITIONAL — show mockup duyệt trước, đảm bảo 3 bucket \+ peak tier tách đúng

Equipment Fit UI ð¡ CONDITIONAL — show mockup duyệt trước, đảm bảo budget không trong Fit \+ critical banner

Business logic \(scoring, ELO, CP engine\) ⏸️ HOLD — chờ ChatGPT finalize sᵢ table

Formula changes ❌ FORBIDDEN

Football ❌ CUT

Unblock business logic khi: ChatGPT nộp bảng sᵢ cho 20 scenario, verify đúng phân bổ 5 dễ / 10 trung bình / 5 khó theo Section 7\.3\.

18\. TEST CONTRACTS \(để Figma hiểu acceptance criteria\)

Đây là test spec, không phải code Figma phải viết\.

\`\`\`javascript // T7\.8\.1 — Pending deleted before 7 days test\("pending event deleted → REVOKED, không chạm lifetime/current", \(\) => \{ // pendingContribution = 0, lifetimeContribution = 0, currentScore = 0 // event\.status = "REVOKED" \}\);

// T7\.8\.2 — Decay\-then\-delete test\("post 5CP sau 365 ngày còn 2\.5, bị xóa → lifetime \-5, current \-2\.5", \(\) => \{ // before: lifetime = 5, current = 2\.5 // after: lifetime = 0, current = 0 \}\);

// T7\.8\.3 — Duplicate event ID test\("cùng eventId chỉ tính 1 lần", \(\) => \{ // lifetimeContribution = 1, không phải 2 \}\);

// T7\.8\.4a — User tự xóa bài test\("user tự xóa bài → peak tier KHÔNG giảm", \(\) => \{ // lifetimeContribution giảm 80, lifetimePeakTier giữ CONTRIBUTOR \}\);

// T7\.8\.4b — CONFIRMED\_VIOLATION test\("vi phạm xác nhận → peak tier giảm về tier mới", \(\) => \{ // lifetimePeakTier từ CONTRIBUTOR \(rank 4\) → TRUSTED\_MEMBER \(rank 3\) \}\); \`\`\`

Ngoài ra còn các test trong D2 v1\.2 \(24 test\) về ELO independence, scenario diversity \(≥50 fingerprint / 1000 seed, mỗi variant ≥1%\), CP lifecycle, config validator, coverage boundary, migration idempotency\.

19\. EXPECTED RESPONSE FROM FIGMA

Sau khi đọc handoff, Figma trả lại:

Sơ đồ màn hình — screens \+ navigation flow

Component inventory — component tree với states/variants

Wireframe cho 3 màn ưu tiên \(CONDITIONAL GO\):

Scenario Court \(verify \`y\` convention đúng\)

CP Profile \(verify 3 bucket \+ peak tier tách\)

Equipment Product Detail \(verify critical banner \+ budget ngoài Fit\)

Câu hỏi — chỗ chưa đủ info để thiết kế

Mâu thuẫn phát hiện — nếu có

Không code business logic\. Chỉ design\.

END MASTER HANDOFF v1\.3\.1 FINAL

ð TÓM TẮT CHO SẾP

Sếp copy nguyên khối trên, gửi Figma AI\. Đây là bản duy nhất — không cần round nữa\.

So với bản gửi Figma trước \(v1\.3 FINAL\), v1\.3\.1 sửa 8 điểm:

\# Fix

M1 Hệ tọa độ: chỉ dùng \`y\`, \`d\` derive — không còn lẫn lộn

M2 Budget ra khỏi Fit weights \(chỉ filter\), weights redistribute 22/22/22/17/17

M3 \`pendingContribution\` bucket riêng — không cộng vào lifetime nữa

M4 \`lifetimePeakTier\` tách khỏi \`lifetimeContribution\` — tự xóa bài không hạ peak

M5 Deep cap ≤ 20 \(không phải 24\)

M6 Critical criteria guard: <2/3 critical → insufficient\_data

M7 sᵢ ∈ \[0, 100\] integer, phân bổ 5/10/5 chính xác

M8 Serve disclaimer: "targetZone SportDNA", không phải "luật BWF"

Release gate: Sếp có thể cho Figma làm UI skeleton \+ community \+ settings ngay\. 3 màn scenario/CP/equipment là CONDITIONAL GO — Figma thiết kế nhưng phải show mockup sếp duyệt trước khi build final\.

## <a id="_37lp7voc7hej"></a>T17\#5 \(25,760 ký tự\)

SPORTDNA — MASTER HANDOFF v1\.3\.3 FINAL FOR FIGMA AI

Version: v1\.3\.3 FINAL

Recipient: Figma AI

Date: 06/11/2026

Scope: Badminton only \(football cut\)

Status: UI AUTHORIZED — Business logic HOLD

Đây là bản duy nhất, đầy đủ, không cần merge gì thêm\. Middleman copy nguyên khối và gửi Figma\.

⚡ 0\. INSTRUCTIONS

Task Status

Đọc và phân tích tài liệu ✅ GO

Thiết kế UI skeleton, navigation, component library ✅ GO

Vẽ mockup clickable Scenario Court, CP Profile, Equipment Fit ✅ GO

Build toàn bộ màn hình còn lại ✅ GO

Implement business logic \(scoring, ELO, CP engine\) ⏸️ HOLD

Thay đổi công thức S, ELO, CP, Equipment Fit ❌ FORBIDDEN

Placeholder convention: Dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\`, \`\{\{D\}\}\`, \`\{\{fitScore\}\}\`, \`\{\{coverage\}\}\`, \`\{\{base\_3x3\}\}\` cho giá trị chưa finalize\. Không hardcode số\.

Nguyên tắc xuyên suốt: \*Thà UI honest mà xấu, còn hơn UI đẹp mà bịa số liệu\.\*

1\. PRODUCT OVERVIEW

SportDNA = nền tảng thể thao với 5 trục độc lập \(không gộp thành điểm tổng\):

Trục Ý nghĩa Visual identity

Skill Rating Năng lực thể thao \(ELO\) Xanh dương primary

Evidence Level Mức xác thực V1/V2/V3 \(\+ LEGACY\) Tím

Community Reputation \(CP\) Uy tín đóng góp Vàng gold

Achievement Thành tích thi đấu Đỏ tươi \+ icon cúp

Equipment Fit Độ phù hợp thiết bị Xanh lá tươi

2\. SCOPE FINAL

Hạng mục Quyết định

Môn thể thao CHỈ CẦU LÔNG \(football cut khỏi v1\.3\.3, ẩn route, không xóa code\)

Loại đánh Đơn \(singles\) only

Audience Toàn bộ trình độ \(D range \[900, 1500\]\)

Scenario pool 20 \(10 tình huống × 2 biến thể\)

Assessment modes Quick \(8\-10 câu\) \+ Deep \(đúng 20 câu\) \+ Retest \(10 câu, priority chain\)

3\. HỆ TỌA ĐỘ SÂN \(FINAL\)

3\.1\. Convention duy nhất

Trục Range Ý nghĩa

\`x\` \[0, 1\] 0 = biên trái \(screen\), 1 = biên phải \(screen\)

\`y\` \[0, 1\] 0 = baseline đối thủ \(screen TOP\), 0\.5 = lưới, 1 = baseline người chơi \(screen BOTTOM\)

Vùng sân:

Opponent's half: \`y ∈ \[0, 0\.5\]\` \(screen top\)

Player's half: \`y ∈ \(0\.5, 1\]\` \(screen bottom\)

Net line: \`y = 0\.5\`

Player faces UP, Opponent faces DOWN

3\.2\. Quy đổi tọa độ → mét \(FINAL — sửa P0\-Q9\)

Full court = 13\.4m, nửa sân = 6\.7m:

\`\`\` x\_meter = x × 5\.18 y\_meter\_from\_opponent\_baseline = y × 13\.4 \`\`\`

y y\_meter \(đúng\)

0\.00 0\.00 m \(baseline đối thủ\)

0\.125 1\.675 m

0\.275 3\.685 m

0\.352 4\.72 m \(vạch giao cầu ngắn\)

0\.50 6\.70 m \(lưới\)

1\.00 13\.4 m \(baseline người chơi\)

Target depth d \(DERIVED, dùng cho scoring\):

d=\(0\.5\-y\)2

d = 0 sát lưới đối thủ \(y=0\.5\)

d = 1 baseline đối thủ \(y=0\)

3\.3\. targetZones JSON \(3×3 grid chuẩn\)

\`\`\`json "targetZones": \{ "net\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.40, 0\.50\]\}, "net\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.40, 0\.50\]\}, "net\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.40, 0\.50\]\}, "mid\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.25, 0\.35\]\}, "mid\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.25, 0\.35\]\}, "mid\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.25, 0\.35\]\}, "back\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.05, 0\.15\]\}, "back\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.05, 0\.15\]\}, "back\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.05, 0\.15\]\} \} \`\`\`

4\. NGÂN HÀNG 20 SCENARIO

4\.1\. Coverage matrix \(FINAL — sửa M9\)

Nhóm năng lực Scenario phủ

Giao cầu B04, B05

Tấn công B01, B08, B10

Phòng thủ B02, B06, B09

Điều cầu B03, B07

Di chuyển B03, B09

Đọc tình huống B07, B10

Chuyển trạng thái B08, B09

4\.2\. Danh mục

Mã Tên rally\_phase Năng lực chính

B01 Tấn công cầu bổng giữa sân attacking Chọn điểm rơi

B02 Phòng thủ smash vào thân defending Block / phản tạt

B03 Xử lý cầu sát lưới neutral Net shot

B04 Nhận giao cầu neutral Return serve

B05 Chọn phương án giao cầu neutral Serve selection

B06 Bị ép cuối sân cần thoát defending Defensive positioning

B07 Drive ngang đổi hướng neutral Drive control

B08 Chuyển phòng thủ → tấn công attacking Transition \#1

B09 Phòng thủ biên trái tay → phản công defending→attacking Transition \#2

B10 Kết thúc điểm khi đối thủ mất thăng bằng attacking Finish

5\. CÔNG THỨC CHẤM ĐIỂM

S=ATR

Biến Ý nghĩa Range

A Action Fit \[0\.20, 1\.00\]\. Floor = 0\.20\. Chỉ A=0 khi rule violation \(serve action ngoài 3 loại serve\)

T Tactical = base\_3x3 × context\_multiplier \[0, 1\.2\]

R Line Proximity \{1\.0, 0\.93, 0\.8\}

5\.1\. A scale

A Ý nghĩa

1\.00 Rất phù hợp

0\.80 Tốt

0\.60 Chấp nhận được

0\.40 Ít hiệu quả

0\.20 Bất lợi nhưng khả thi

0\.00 Rule violation ONLY

5\.2\. T — context\_multiplier \(FINAL — sửa P1\-Q8\)

\`\`\`js const MIN\_MOVEMENT = 0\.02; // normalized units per 0\.5s const magnitude = Math\.hypot\(opponent\.movement\[0\], opponent\.movement\[1\]\);

if \(magnitude < MIN\_MOVEMENT\) \{ multiplier = 1\.0; // đứng yên \} else \{ angle = angleBetween\(opponent\.movement, vector\_to\_target\_zone\_center\); if \(angle < 30°\) multiplier = 0\.7; // về phía target else if \(angle > 150°\) multiplier = 1\.2; // ra xa target else multiplier = 1\.0; \} \`\`\`

Lưu ý: \`movement\` vector = displacement over next 0\.5s\. \`target\_zone\.center\` = center của zone click, không phải click point\.

5\.3\. R — Line Proximity \(FINAL — sửa P0\-Q9\)

Danh sách vạch phụ thuộc loại cú đánh:

Non\-serve \(smash/drop/clear/drive/net\_shot/lift/block/push\): \`\`\` distances = \[ x\_meter, // left sideline 5\.18 \- x\_meter, // right sideline y\_meter\_from\_opponent\_baseline // baseline \] \`\`\`

Serve \(serve\_short/flick/long\): \`\`\` distances = \[ x\_meter, // left sideline 5\.18 \- x\_meter, // right sideline y\_meter\_from\_opponent\_baseline, // baseline |y\_meter \- 4\.72|, // short service line |x\_meter \- 2\.59| // center line \] \`\`\`

Loại bỏ lưới khỏi R\. Cầu chạm lưới = S = 0 ngay, không phải R thấp\.

\`\`\` min\_distance = min\(distances\) R = 1\.0 if min\_distance >= 0\.5m R = 0\.93 if 0\.2m <= min\_distance < 0\.5m R = 0\.80 if min\_distance < 0\.2m \`\`\`

Figma: Không hiển thị R\. Derived metric\.

6\. LUẬT GIAO CẦU B05 \(FINAL — sửa P0\-Q5\)

⚠️ CRITICAL: Cross\-court direction

Player faces UP, Opponent faces DOWN → Right của player ≠ Right của opponent trong screen coordinates\.

Ô giao player \(screen x\) Ô đối thủ nhắm \(screen x\)

Right service court, x ∈ \[0\.5, 1\] x ∈ \[0, 0\.5\] \(screen LEFT\)

Left service court, x ∈ \[0, 0\.5\] x ∈ \[0\.5, 1\] \(screen RIGHT\)

6\.1\. Serve target ranges

Loại giao targetDepthRange d Tương đương y

serve\_short \[0\.30, 0\.45\] \[0\.275, 0\.350\]

serve\_flick \[0\.45, 0\.75\] \[0\.125, 0\.275\]

serve\_long \[0\.75, 1\.00\] \[0\.000, 0\.125\]

6\.2\. B05 JSON \(FINAL\)

\`\`\`json \{ "scenarioId": "BD\-B05\-V1\-\.\.\.", "playerServicePosition": "right", "targetZones": \{ "serve\_short": \{ "x": \[0\.00, 0\.50\], "y": \[0\.275, 0\.350\] \}, "serve\_flick": \{ "x": \[0\.00, 0\.50\], "y": \[0\.125, 0\.275\] \}, "serve\_long": \{ "x": \[0\.00, 0\.50\], "y": \[0\.000, 0\.125\] \} \} \} \`\`\`

Note: \`x range\` = opposite half của player\. Nếu \`playerServicePosition = "left"\` → x range = \[0\.50, 1\.00\]\.

6\.3\. Rules

Click ngoài x\-half chéo → T = 0, S = 0\.

Click ngoài y\-range của serve type → T = 0, S = 0\.

Giao cầu chạm lưới → S = 0\.

Hardcode \`playerServicePosition: "right"\` cho B05 v1\.3\.3\. Score\-based rotation defer v2\.

6\.4\. UI

Overlay sáng nửa sân chéo \(opposite x\-half so với player\)\.

Label overlay: \*"Vùng gợi ý \(SportDNA\)"\* — KHÔNG dùng "BWF", "hợp lệ"\.

Toast sai: \*"Giao cầu phải chéo ô\. Điểm không được tính\."\*

Tooltip: \*"Giao chéo — bắt buộc \(BWF 9\.1\.3\)"\* — chỉ trong tooltip, không trong overlay\.

⚠️ DISCLAIMER \(bắt buộc hiển thị UI, không được lược bỏ\)

\*"Vùng điểm rơi gợi ý được thiết kế cho SportDNA assessment\. BWF chỉ quy định cầu phải qua vạch giao ngắn 1\.98m và rơi trong ô giao chéo — không quy định dải cụ thể cho short/long/flick\. Đây là targetZone của hệ thống đánh giá, không phải luật thi đấu\."\*

"BWF" chỉ xuất hiện trong: ServeDisclaimer \+ tooltip rule reference\. KHÔNG xuất hiện trong overlay, toast, error message, badge\.

7\. ĐỘ KHÓ D

D=900\+roundi=17wisi

7\.1\. Định nghĩa sᵢ \(BẮT BUỘC\)

Property Value

Range \`sᵢ ∈ \[0, 100\]\`, integer

Direction Higher = harder

0 Không áp lực

50 Trung bình

100 Áp lực tối đa

7\.2\. Trọng số wᵢ

\# Tiêu chí wᵢ

1 Movement demand 1\.2

2 Time pressure 1\.0

3 Stamina cost 0\.6

4 Opponent motion 0\.9

5 Shuttle difficulty 0\.8

6 Court constraint 0\.7

7 Decision complexity 0\.8

Σwᵢ = 6, D range = \[900, 1500\]\.

7\.3\. Phân bổ 20 scenario \(BẮT BUỘC\)

Phân khúc D range Số lượng

Dễ \[900, 1100\) 5 scenario

Trung bình \[1100, 1300\) 10 scenario

Khó \[1300, 1500\] 5 scenario

ChatGPT đang finalize\. Figma dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\` và \`\{\{D\}\}\`\.

7\.4\. D dùng cho 2 mục đích

Chọn độ khó scenario theo trình độ user

Feed vào ELO: $E\_i = dfrac\{1\}\{1 \+ 10^\{\(D\_i \- R\_i\)/400\}\}$

8\. ELO \(không đổi v6\.1\)

Mỗi kỹ năng bắt đầu 1000

Update: Rnew=Rold\+K\(Si\-Ei\)

K: Quick = 16, Deep = 24, Retest = 16

Tách rating: \`tactical\_rating\`, \`shot\_selection\_rating\`, \`target\_selection\_rating\`, \`defensive\_reading\_rating\`

KHÔNG dùng: response time, CP, promotion, giá sản phẩm

9\. EVIDENCE LEVEL \(FINAL — sửa P0\-Q13\)

9\.1\. 4 levels \(KHÔNG có V0\)

Level Badge Tooltip

SELF\_REPORTED\_LEGACY Xám, "Tự khai báo \(cũ\)" \*"Hoàn thành assessment để nâng lên V1"\*

V1 Xanh dương, "Đã đánh giá" \*"Đã hoàn thành SportDNA assessment"\*

V2 Tím, "Cộng đồng xác nhận"

V3 Vàng gold, "Chính thức"

9\.2\. Schema

\`\`\`json "skillEvidence": \{ "level": "SELF\_REPORTED\_LEGACY" | "V1" | "V2" | "V3", "legacy\_self\_reported": boolean, "verifiedAt": "date" | null, "assessedAt": "date" | null \} \`\`\`

9\.3\. Migration \(FINAL\)

\`\`\` On first login after v1\.3\.3 deploy: if skillEvidence\.level === "V0": skillEvidence\.level = "SELF\_REPORTED\_LEGACY" skillEvidence\.legacy\_self\_reported = true

On assessment completion: if skillEvidence\.level === "SELF\_REPORTED\_LEGACY": skillEvidence\.level = "V1" skillEvidence\.legacy\_self\_reported = false skillEvidence\.assessedAt = now\(\) \`\`\`

KHÔNG tự nâng V0 → V1 mà không qua assessment\.

9\.4\. CP KHÔNG phải evidence level\.

10\. COMMUNITY REPUTATION \(CP\) — FINAL

10\.1\. Ba bucket độc lập

Bucket Nguồn Decay UI

\`pendingContribution\` Events PENDING/NEEDS\_REVIEW Không Dòng phụ mờ

\`lifetimeContribution\` Events APPROVED chưa revoke Không Badge Lifetime

\`currentReputation\` Events APPROVED có decay Có Score chính

10\.2\. Tier thresholds \(PROVISIONAL\)

Tier ID Score

NEWCOMER 0\-49

ACTIVE\_MEMBER 50\-149

TRUSTED\_MEMBER 150\-349

CONTRIBUTOR 350\-649

PILLAR 650\+

10\.3\. Lifetime Peak Tier \(tách khỏi lifetimeContribution\)

Field Khi nào giảm

\`lifetimeContribution\` User tự xóa bài, revoke

\`lifetimePeakTier\` CHỈ giảm khi CONFIRMED\_VIOLATION / FRAUD / SPAM

\`currentReputation\` Decay tự nhiên

Logic: \`\`\`

Khởi tạo = NEWCOMER

Event APPROVED → peakCandidate = resolveTier\(lifetimeContribution\) if peakCandidate\.rank > lifetimePeakTier\.rank: lifetimePeakTier = peakCandidate

Event REVOKE do VIOLATION/FRAUD/SPAM: recompute = resolveTier\(lifetimeContribution\) lifetimePeakTier = min\(currentPeakTier, recompute\)

User tự xóa bài \(không vi phạm\): lifetimeContribution giảm, lifetimePeakTier GIỮ NGUYÊN \`\`\`

10\.4\. Event lifecycle

\`\`\` PENDING → APPROVED / NEEDS\_REVIEW / REJECTED / REVOKED \`\`\`

Trạng thái Bucket

PENDING pendingContribution

APPROVED lifetimeContribution \+ currentReputation

NEEDS\_REVIEW pendingContribution \(không move\)

REJECTED Không tính

REVOKED Không tính

10\.5\. Auto\-approve \(FINAL — sửa Q12\)

\`\`\` Scheduled daily job: for each event PENDING > 7 days: if no flag AND no user report: status = APPROVED move to lifetimeContribution log autoApprovedAt, trigger: "7\_day\_timeout" else: status = NEEDS\_REVIEW \`\`\`

Late flag handling: \`\`\` Event APPROVED → user report / fraud detection later: status: APPROVED → NEEDS\_REVIEW Không xóa khỏi lifetimeContribution ngay Reviewer: clear → APPROVED | confirm fraud → REVOKED \+ trừ \+ hạ peak tier \`\`\`

Không khóa vĩnh viễn APPROVED\.

10\.6\. Decay

Event type Half\-life

Posts 365 ngày

Interactions 180 ngày

P\(t\)=P02\-t/H

10\.7\. Deletion / revocation

User tự xóa: thu hồi điểm, KHÔNG hạ peak tier

CONFIRMED\_VIOLATION/FRAUD/SPAM: thu hồi điểm VÀ hạ peak tier

Xóa khi đang PENDING/NEEDS\_REVIEW: xóa khỏi pending ngay, không chạm lifetime

10\.8\. Event ledger

APPROVED / REVOKED: giữ vĩnh viễn

REJECTED: purge sau 90 ngày

Event ID unique, audit trail

10\.9\. UI profile

Current Reputation \(primary\):

CP score

Current Tier \(hiển thị chính\)

Lifetime Recognition \(secondary\):

\`lifetimeContribution\` \(số\)

\`lifetimePeakTier\` \(badge phụ, tooltip \*"Danh dự lịch sử"\*\)

\`lifetimeTierRevokedAt \!== null\` → tooltip \*"Danh dự đã bị điều chỉnh do vi phạm"\*

Pending:

\`pendingContribution > 0\` → \*"\+15 đang chờ duyệt"\* \(mờ, phụ\)

KHÔNG hiển thị \`pending \+ lifetime\` như pending đã duyệt

NEEDS\_REVIEW → tooltip \*"Đang được xem xét\. Chưa cộng vào uy tín\."\*

Shop: Không có CP cấp cửa hàng\. Chủ shop có CP cá nhân trên profile\.

Demo: Không tạo CP thật, không hiển thị\.

11\. EQUIPMENT FIT — CẦU LÔNG \(FINAL\)

11\.1\. 4 module độc lập

\`\`\` ProductDataValidator | ConfigurationValidator | EquipmentFitEngine | CommercialRankingEngine \`\`\`

Khuyến mãi, giá, quảng cáo KHÔNG ảnh hưởng Fit Score\.

11\.2\. EquipmentFitResult JSON \(FINAL — sửa M4\)

\`\`\`json \{ "status": "calculated" | "insufficient\_data", "fitScore": 78 | null, "dataCoverage": 0\.50, "availableCriteria": 2, "totalCriteria": 4, "criticalMissing": \["balance"\], "missingCriteria": \["balance", "compatible\_tension"\], "confidence": "low", "dataSourceQuality": \{ "manufacturerVerified": 1, "sellerProvided": 1, "inferred": 0, "unknown": 2 \} \} \`\`\`

11\.3\. Coverage rules

Core criteria = 4 \(KHÔNG có playing style\):

Criteria Core? Count coverage?

Weight ✅ ✅

Shaft stiffness ✅ ✅

Balance point ✅ ✅

Compatible tension ✅ ✅

Playing style match ❌ ❌ \(user preference\)

11\.4\. Confidence rules \(FINAL\)

\`\`\` coverage\_confidence: coverage >= 0\.9 → high coverage >= 0\.7 → medium coverage >= 0\.5 → low coverage < 0\.5 → insufficient\_data

critical\_confidence: criticalAvailable == 3 → high criticalAvailable == 2 → low criticalAvailable < 2 → insufficient\_data

confidence = min\(coverage\_confidence, critical\_confidence\) \`\`\`

11\.5\. Critical guard

\`\`\` criticalAvailable = count\(weight, stiffness, balance có data\)

if criticalAvailable < 2: → insufficient\_data, fitScore = null, ẩn khỏi list else if criticalAvailable == 2: → status = "calculated", confidence = "low" → banner: "Thiếu 1 tiêu chí cốt lõi" → rank CUỐI danh sách \`\`\`

11\.6\. Trọng số vợt \(FINAL — sửa M5\)

Full \(5 criteria\):

Tiêu chí Weight

Weight 22%

Shaft stiffness 22%

Balance point 22%

Compatible tension 17%

Playing style match 17%

Total 100%

Khi thiếu playing\_style \(4 criteria\):

Tiêu chí Weight

Weight 26\.51%

Shaft stiffness 26\.51%

Balance point 26\.51%

Compatible tension 20\.48%

Total 100%

Công thức: \`w'\_i = w\_i / 83 × 100\`\. KHÔNG làm tròn gây sai tổng\.

Tag UI: \*"Trọng số đang ở giai đoạn thử nghiệm, sẽ hiệu chỉnh sau beta\."\*

11\.7\. Budget — CHỈ filter

Budget không xuất hiện trong Fit weight\.

\`\`\` Step 1: User chọn budget range → filter products Step 2: Tính Fit Score \(chỉ 5 technical criteria\) Step 3: Rank theo Fit Score \(không theo giá\) \`\`\`

Range Note

Dưới 1 triệu Bình dân

1\-2 triệu DEFAULT

2\-5 triệu Trung cấp

Trên 5 triệu Cao cấp

UI copy bắt buộc: \*"Ngân sách được dùng để lọc sản phẩm\. Điểm phù hợp được tính dựa trên thông số kỹ thuật, không phụ thuộc giá\."\*

11\.8\. Data source quality

\`\`\` MANUFACTURER\_VERIFIED | SELLER\_PROVIDED | INFERRED | UNKNOWN \`\`\`

UI phân biệt\. Không hiển thị 100% coverage như 100% chính xác\.

11\.9\. Configuration validation \(FINAL — sửa M6\)

Config error độc lập với Fit Score:

Case Fit \`compatible\_tension\` score ConfigurationValidator

User chưa chọn tension, product max phù hợp Full score Valid

User chọn tension ≤ max Full score Valid

User chọn tension > max Full score \(không ảnh hưởng\) ERROR

Error code: \`TENSION\_EXCEEDS\_MANUFACTURER\_LIMIT\`

UI: Fit Score vẫn hiển thị bình thường \(VD: 78%\)\. Banner đỏ riêng: \*"Cấu hình không hợp lệ: căng 35 lbs vượt mức tối đa 30 lbs của vợt này\."\*

KHÔNG gán Fit = 0\.

11\.10\. Football

CẮT khỏi v1\.3\.3\. Ẩn toàn bộ UI football khỏi SportDNA navigation\. Route \`/sportdna/football/\*\` → redirect \`/sportdna\` với banner \*"Bóng đá đang được phát triển\."\* Data giữ nguyên DB\. Mở lại khi có reviewer chuyên môn\.

12\. RADAR 8 TRỤC \(FINAL — sửa P1\-Q10\)

12\.1\. Mapping honest

\# Radar axis Source rating Confidence

1 Sức mạnh — insufficient\_data

2 Tốc độ — insufficient\_data

3 Phản xạ \`defensive\_reading\_rating\` low \(không tương đương\)

4 Kỹ thuật \`shot\_selection\_rating\` low \(không tương đương\)

5 Kiểm soát \`target\_selection\_rating\` low \(không tương đương\)

6 Bền bỉ — insufficient\_data

7 Chiến thuật \`tactical\_rating\` medium

8 Cân bằng — insufficient\_data

12\.2\. UI requirement

Radar hiển thị 8 trục

4 trục có data → chấm solid \+ polygon kết nối

4 trục không data → chấm mờ ở tâm \+ label \*"Chưa đủ dữ liệu"\* \+ icon đồng hồ cát

Polygon chỉ vẽ trên 4 trục có data \(tứ giác lệch\)

KHÔNG giả lập giá trị để polygon đầy đủ

Nguyên tắc: Thà radar xấu mà honest, còn hơn radar đẹp mà bịa\.

13\. ASSESSMENT MODES \(FINAL — sửa P0\-S1\)

13\.1\. Mode table

Mode Số câu Sample logic

Quick 8\-10 Greedy set cover \(xem 13\.2\)

Deep Đúng 20 Full pool, không lặp

Retest 10 Priority chain \(xem 13\.3\)

13\.2\. Quick sampling algorithm \(FINAL — sửa P1\-S1\)

\`\`\`python groups = \{serve, attack, defense, rally, movement, reading, transition\} selected = \[\] uncovered = groups\.copy\(\)

Greedy set cover

while len\(selected\) < min\_target and uncovered: best = argmax\( scenario covers most uncovered groups, tie\_break=random \) selected\.append\(best\) uncovered \-= groups\_of\(best\)

Fill remaining slots randomly

while len\(selected\) < target: selected\.append\(random from unselected\) \`\`\`

13\.3\. Retest priority chain \(FINAL — sửa P0\-S1\)

\`\`\` Priority 1: Template \+ variant KHÔNG dùng trong 30 ngày Priority 2: Template KHÔNG dùng, variant lặp với seed mới \(state khác\) Priority 3: Cho phép lặp hoàn toàn, generate seed mới \`\`\`

Weak skill selection:

6 câu từ weak skills \(rating confidence < medium OR variance > 150 OR chưa làm 60\+ ngày\)

4 câu random

BỎ rule tuyệt đối "cấm lặp 30 ngày"\. Ưu tiên không lặp, fallback khi hết pool\.

14\. JSON CONTRACTS

14\.1\. Scenario JSON

\`\`\`json \{ "scenarioId": "BD\-B01\-V1\-deep\-seed1001", "variant": "deep", "gameMode": "singles", "rallyPhase": "attacking", "state": \{ "player": \{"x": 0\.22, "y": 0\.78, "stamina": 0\.80\}, "opponent": \{"x": 0\.75, "y": 0\.15, "movement": \[\-0\.05, 0\.10\]\}, "shuttle": \{"x": 0\.24, "y": 0\.68, "height": "high", "speed": "medium"\} \}, "availableActions": \["smash", "drop", "clear", "drive"\], "actionFit": \{ "smash": 0\.80, "drop": 1\.00, "clear": 0\.60, "drive": 0\.20 \}, "trajectory": \{"height": "high", "speed": "medium"\}, "difficulty": "\{\{D\}\}", "targetZones": \{ /\* 3×3 grid, xem Section 3\.3 \*/ \} \} \`\`\`

14\.2\. CP Profile JSON

\`\`\`json \{ "pendingContribution": 15, "lifetimeContribution": 320, "currentScore": 180, "currentTier": "TRUSTED\_MEMBER", "lifetimePeakTier": "CONTRIBUTOR", "lifetimeTierRevokedAt": null, "enabled": true, "recentEvents": \[ \{"eventId": "e1", "type": "TIPS\_POST", "status": "APPROVED", "points": 5, "createdAt": "\.\.\."\}, \{"eventId": "e2", "type": "LIKE\_RECEIVED", "status": "PENDING", "points": 0\.2, "createdAt": "\.\.\."\} \] \} \`\`\`

14\.3\. Equipment Fit JSON

\(Xem Section 11\.2\)

15\. DANH SÁCH MÀN HÌNH

15\.1\. Hub

\`\`\` SportDNA Hub ├─ Quick \(8\-10 câu\) ├─ Deep \(đúng 20 câu\) ├─ Retest \(10 câu\) └─ Hồ sơ \`\`\`

Note: Không có "Scenario" như mode riêng\. Scenario Court là shared component dùng bởi cả 3 mode\.

15\.2\. Assessment Flow

Màn Chức năng

Hub SportDNA Entry point, 3 mode \+ profile

Scenario Court Shared cho Quick/Deep/Retest

Assessment Result Kết quả \+ radar \+ tier \+ evidence

15\.3\. Profile

Màn Chức năng

Profile Overview 5 trục riêng

Skill Detail ELO \+ radar 8 trục \(4 insufficient\)

Reputation Detail Current Tier \(primary\) \+ Lifetime Peak \(secondary\) \+ pending line

Reputation History Event ledger

Achievement List Danh sách thành tích

Equipment Fit Summary Top 3\-5 sản phẩm

15\.4\. Equipment

Màn Chức năng

Product Listing Filter budget \+ Fit Score \+ critical warning

Product Detail Spec table \+ coverage \+ source \+ critical banner

Configuration Editor Căng cước, validate

Fit Explanation Lý do fit/không fit

15\.5\. Community

Màn Chức năng

Community Feed Bài viết \+ 2 badges

Post Detail Nội dung \+ tác giả badges

Post Composer 6 chủ đề

Moderation Status Pending/Approved/Needs\_Review/Rejected/Revoked

15\.6\. Settings

Màn Chức năng

Privacy Controls Toggle badges

Budget Preferences Default budget range

16\. COMPONENT INVENTORY

Assessment

\`CourtCanvas\` — SVG top\-down, \`y=0\` = top, \`y=1\` = bottom

\`PlayerMarker\` — chấm xanh \(bottom half\)

\`OpponentMarker\` — chấm đỏ \(top half\) \+ movement vector

\`ShuttleMarker\` — icon cầu \+ direction

\`TargetZone\` — 9 clickable zones

\`ActionSelector\` — Smash/Drop/Clear/Drive/Net\_shot/Lift/Block/Push/Serve\_\*

\`ServeTargetOverlay\` — vùng gợi ý sáng, CHỈ sáng nửa sân chéo, label \*"Vùng gợi ý \(SportDNA\)"\*

\`ContextIndicator\` — chỉ hiện sau khi confirm, không leak trước

\`ScenarioProgress\`

\`AssessmentResult\`

\`ServeDisclaimer\` — collapsible, chứa text có "BWF"

Profile

\`SkillRatingCard\`

\`SkillRadar\` — 8 trục, 4 insufficient\_data hiển thị mờ

\`EvidenceLevelBadge\` — 4 variants \(LEGACY/V1/V2/V3\)

\`CurrentReputationCard\` — primary

\`LifetimePeakBadge\` — secondary \+ tooltip

\`LifetimeContributionStat\` — số riêng

\`PendingContributionLine\` — mờ, phụ

\`AchievementList\`

\`EquipmentFitSummary\`

Equipment

\`ProductCard\` — Fit \+ coverage \+ critical warning icon

\`CoreSpecificationTable\`

\`DataCoverageIndicator\`

\`DataSourceLabel\` — 4 chips

\`CriticalMissingBanner\` — vàng cam viền

\`ConfigurationWarning\` — đỏ đậm

\`BudgetFilter\` — 4 chips

\`FitScoreDisplay\` — có confidence badge

Community

\`CommunityPostCard\` — 2 badges

\`ContributionIndicator\`

\`PendingContributionState\`

\`ReputationHistory\` — timeline

\`ModerationStatusBadge\` — 5 trạng thái

17\. UI REQUIREMENTS

17\.1\. 5 trục visual identity

Không dùng chung màu/icon/style\. Xem Section 1\.

17\.2\. Color system \(FINAL — sửa M10\)

Element Color

Skill Rating Xanh dương primary

Evidence Level Tím

CP badge Vàng gold

Achievement Đỏ tươi \+ icon cúp

Equipment Fit Xanh lá tươi

ServeTargetOverlay Xanh ngọc \(teal\)

CriticalMissingBanner Cam vàng có viền

Error states Đỏ đậm

Pending line Xám nhạt

Lifetime Peak badge Vàng đồng \(khác CP gold\)

17\.3\. Current vs Lifetime Tier

Current Tier: hiển thị chính, prominent

Lifetime Peak: badge phụ, nhỏ, tooltip \*"Danh dự lịch sử, không giảm do inactivity"\*

\`lifetimeContribution\` \(số\): hiển thị riêng, có thể giảm \(user xóa bài\), không gộp với peak

17\.4\. Serve UI

Chọn serve → overlay sáng nửa sân chéo, label \*"Vùng gợi ý \(SportDNA\)"\*

Click sai → toast \*"Giao cầu phải chéo ô\. Điểm không được tính\."\* hoặc \*"Ngoài vùng gợi ý\. Điểm không được tính\."\*

KHÔNG dùng "phạm luật", "BWF" trong overlay/toast

17\.5\. Fit Score điều kiện

\`insufficient\_data\` → KHÔNG hiện %, thay \*"Chưa đủ dữ liệu để đánh giá"\*

\`calculated\` → % \+ coverage \+ confidence \+ source breakdown

\`criticalMissing\.length > 0\` → banner cam vàng \+ rank cuối

17\.6\. Pending rõ ràng

Không hiển thị pending như đã duyệt

Dòng phụ mờ

NEEDS\_REVIEW có tooltip riêng

17\.7\. Radar honest

4 trục insufficient → chấm mờ ở tâm

Polygon chỉ trên 4 trục có data

KHÔNG fake giá trị

17\.8\. Responsive

Desktop \(1440\) \+ Mobile \(390\) cho mọi màn\.

18\. WHAT FIGMA MUST NOT DO

❌ Đổi công thức S = A × T × R

❌ Gộp 5 trục thành 1 điểm

❌ Hiển thị CP như evidence level

❌ Hardcode \`sᵢ\`, \`D\`, \`base\_3x3\`, \`fitScore\`

❌ Thêm môn thể thao ngoài cầu lông

❌ Tự sửa business logic

❌ Dùng Unity / engine 3D

❌ Đưa Budget vào Fit weights

❌ Lẫn \`d\` và \`y\` trong code — chỉ \`y\` cho vị trí

❌ Hiển thị pending như đã duyệt

❌ Nâng \`SELF\_REPORTED\_LEGACY\` lên V1 mà không qua assessment

❌ Fake radar data để polygon đầy đủ

❌ Gán Fit = 0 khi config error

❌ Đảo lộn trái/phải khi vẽ serve overlay

19\. RELEASE GATE

Item Status

UI skeleton, navigation flow ✅ GO

Component library ✅ GO

Community UI ✅ GO

Settings UI ✅ GO

Scenario Court UI ✅ GO \(với serve overlay đúng chiều chéo\)

CP Profile UI ✅ GO \(với 3 bucket \+ peak tier\)

Equipment Fit UI ✅ GO \(với budget ngoài Fit \+ critical banner\)

Mockup clickable ✅ GO

Business logic \(scoring, ELO, CP engine\) ⏸️ HOLD — chờ ChatGPT finalize sᵢ table

Formula changes ❌ FORBIDDEN

Football ❌ CUT \(ẩn route\)

Unblock business logic khi: ChatGPT nộp bảng sᵢ cho 20 scenario, verify đúng phân bổ 5 dễ / 10 trung bình / 5 khó theo Section 7\.3\.

20\. TEST CONTRACTS \(acceptance criteria\)

Đây là test spec, Figma hiểu acceptance criteria, không code\.

20\.1\. ELO independence

Thay đổi CP / promotion / response time không đổi ELO \(khi valid input giữ nguyên\)

20\.2\. Scenario diversity

1000 seed → ≥ 50 fingerprint unique

Mỗi variant ≥ 1% tổng số lần sinh

20\.3\. CP lifecycle

Pending delete < 7 ngày → REVOKED, không chạm lifetime/current

Decay\-then\-delete: post 5CP sau 365d còn 2\.5, xóa → lifetime \-5, current \-2\.5

Duplicate eventId → count 1 lần

User tự xóa bài → peak tier KHÔNG giảm

CONFIRMED\_VIOLATION → peak tier giảm về tier mới

20\.4\. Config vs Fit

Tension vượt max → config error, Fit Score KHÔNG = 0

Fit Score computed bình thường

20\.5\. Migration

V0 → SELF\_REPORTED\_LEGACY \(không phải V1\)

ELO/evidence preserved

Idempotent

21\. EXPECTED RESPONSE FROM FIGMA

Sau khi đọc handoff, Figma trả lại:

Sơ đồ màn hình — screens \+ navigation flow

Component inventory — component tree với states/variants

Wireframe update cho 3 màn:

Scenario Court \(verify serve overlay đúng chiều chéo\)

CP Profile \(verify 3 bucket \+ peak tier \+ radar honest\)

Equipment Product Detail \(verify critical banner \+ budget ngoài Fit\)

Câu hỏi — chỗ chưa đủ info

Mâu thuẫn phát hiện — nếu có

Không code business logic\. Chỉ design\.

END MASTER HANDOFF v1\.3\.3 FINAL

ð TÓM TẮT CHO SẾP

Middleman copy nguyên khối trên → gửi Figma\. Đây là bản duy nhất, không cần merge\.

v1\.3\.3 sửa 10 lỗi so với v1\.3\.2:

\# Fix Ảnh hưởng

P0\-1 Serve cross\-court đảo trái/phải Figma phải vẽ overlay nửa sân chéo

P0\-2 y→meter factor 2 Scoring R đúng

P0\-3 V0 → SELF\_REPORTED\_LEGACY \(không phải V1\) Badge mới, không nâng cấp sai

P0\-4 Retest priority chain thay rule tuyệt đối Retest sau Deep vẫn chạy được

P1\-5 Weight redistribution 26\.51/26\.51/26\.51/20\.48 Sum = 100% chính xác

P1\-6 Radar honest \(4 trục insufficient\) Không fake data

P1\-7 Movement threshold 0\.02 Không nhầm "đứng yên" thành "di chuyển"

P1\-8 Config error độc lập Fit Score Không gán Fit = 0 sai

P1\-9 Quick sampling greedy set cover Coverage đủ 7 nhóm

P1\-10 dataCoverage JSON đúng arithmetic 2/4 = 0\.50, không phải 0\.75

Figma được phép build mockup clickable ngay\. Không cần round nữa với tôi\. Sau mockup về, sếp review → unlock business logic → ChatGPT deliver sᵢ table → dev implement\.

## <a id="_rk3ofatdr92i"></a>T17\#6 \(23,233 ký tự\)

SportDNA: Prompt giao việc cho Figma AI \(đợt 5, lượt 14\)

Gửi từng ticket một, theo thứ tự R0 → E1 → E7\. Mỗi tin nhắn gồm: Khối chung \+ đúng một ticket\. Chờ báo cáo của ticket trước rồi mới gửi ticket sau\. E6, E8, E9 \(nạp tình huống đôi/phòng thủ, bóng đá\) chưa viết vì cần định nghĩa R từ báo cáo R0 \(Lead cố ý không đoán\)\.

Khối chung \(dán đầu mọi ticket\)

Bạn là kỹ sư sửa source code của dự án SportDNA \(Next\.js \+ Payload CMS\)\. Bạn sửa file thật, không phải thiết kế trên Figma\.

Quy tắc:

Đọc trước, sửa sau\. Không đoán đường dẫn file\. Nếu ticket nêu tên file mà repo không có, dừng và báo, đừng tạo thay thế tùy ý\.

Chỉ sửa file trong mục "Được sửa" của ticket\. Mục "Cấm động vào" là tuyệt đối\. Cần sửa file ngoài danh sách thì dừng lại và hỏi\.

Mọi con số đánh dấu GIẢ ĐỊNH phải để thành hằng số có tên trong một file cấu hình duy nhất, kèm comment \`// GIẢ ĐỊNH\`, để Lead đổi sau khi có dữ liệu\.

Không dùng thời gian phản hồi của người dùng để chấm điểm ở bất kỳ đâu\.

Cuối mỗi ticket báo cáo đúng khuôn: \(a\) file đã tạo/sửa, \(b\) lệnh đã chạy và kết quả thật \(test, build, typecheck; dán đầu ra, không tóm tắt\), \(c\) điều chưa làm được và lý do, \(d\) câu hỏi cho Lead\. Không tự ghi "đạt" khi chưa chạy\.

Không migration phá dữ liệu: chỉ thêm trường/collection, không xóa hay đổi tên trường hiện có\.

Ticket R0: Do thám source \(CHỈ ĐỌC, không sửa gì\)

Mục tiêu\. Lead chưa đọc source nên chưa chốt được định nghĩa R trong S = A × T × R, chưa biết đường dẫn thật để viết ticket sửa file\. Bạn trả lời bằng dữ kiện trích từ code\.

Được sửa: không file nào\. Cấm động vào: mọi file\.

Trả lời đủ các mục, mỗi mục kèm đường dẫn file và số dòng:

Bản đồ file\. Đường dẫn thật của: collection Users, UserAchievements, SportAssessments, CommunityProfiles; \`actions\.ts\` \(hoặc nơi chứa server action chấm điểm tình huống\); \`payload\.config\`; trang admin; chỗ hiển thị bậc/Elo trong hồ sơ\.

Engine chấm tình huống\. Hàm nào tính S = A × T × R? Nhập/xuất của nó là gì? Dán chữ ký hàm và thân hàm\.

Định nghĩa R\. R là trường nào, thang nào \(0–1? hệ số?\), tính từ đâu? Nếu code không có biến tên R, nói rõ biểu thức tương ứng\. Không suy diễn: nếu không tìm thấy, ghi "không tìm thấy"\.

Nhánh positional\. Hiện có hành động định vị \(không phải cú đánh\) và điểm P không? Chấm ở đâu?

Hard\-fail\. Engine xử lý hard\-fail thế nào \(A = 0? S = 0? cờ riêng\)? Có kiểm tầm với ≤ 1,6 m, nửa sân, chiều cao cầu so với lưới không?

Schema tình huống\. Dán một tình huống đơn B01 đầy đủ như đang lưu \(JSON hoặc TS\), và nêu các trường có thể có \`gameMode\`, \`partner\`, \`opponents\`, \`heightM\`, \`activeBranch\` hay chưa\.

Elo hiện tại\. Thang Elo/bậc đang nằm ở đâu? Bao nhiêu bậc, ranh giới nào, khởi tạo bao nhiêu? Có MR/AR tách riêng chưa?

Khung kiểm thử\. Có vitest/jest chưa? Lệnh chạy test, typecheck, build là gì?

Dữ liệu mẫu\. Có seed/fixture không? Hồ sơ demo và shop được đánh dấu bằng trường nào?

Ticket E1: Engine Match Rating \+ thang Elo \(GIẢ ĐỊNH nhiều chỗ\)

Điều kiện: đã có báo cáo R0\. Dùng đường dẫn thật từ R0\.

Mục tiêu\. Thêm engine MR thuần TypeScript \(không phụ thuộc thư viện, không đụng DB\) và áp thang bậc mới\. Chưa nối vào giải đấu \(đó là E7\)\.

Được sửa/tạo:

Tạo \`<thư mục lib của dự án>/rating/ratingEngine\.ts\` \(nội dung bên dưới, chép nguyên văn\)\.

Tạo \`<cùng thư mục>/rating/ratingConfig\.ts\` chứa mọi hằng GIẢ ĐỊNH và bảng bậc\.

Tạo \`<cùng thư mục>/rating/ratingEngine\.test\.ts\` và \`ratingEngine\.rules\.test\.ts\` \(nội dung bên dưới\)\.

Sửa chỗ hiển thị bậc/Elo trong hồ sơ để đọc bảng bậc từ \`ratingConfig\.ts\` \(đường dẫn lấy từ R0\)\.

Cấm động vào: engine chấm tình huống \(\`actions\.ts\` và hàm tính S\), schema tình huống B01–B10, collection Users \(không sửa trường hiện có\)\.

Bảng bậc \(đặt trong ratingConfig\.ts\)\. Khởi tạo MR = 1000\. Quần thể GIẢ ĐỊNH chuẩn, trung bình 1000, độ lệch chuẩn 250\.

Mã Tên hiển thị Khoảng Elo

\`unrated\` Chưa xác định \-

\`tier\_1\` Mới tập chơi < 800

\`tier\_2\` Phong trào yếu 800–999

\`tier\_3\` Trung bình 1000–1199

\`tier\_4\` Trung bình khá 1200–1399

\`tier\_5\` Khá 1400–1599

\`tier\_6\` Khá \+ 1600–1799

\`tier\_7\` Bán chuyên 1800–1999

\`tier\_8\` Chuyên nghiệp 2000–2199

\`tier\_9\` Bán chuyên Quốc gia 2200–2399

\`tier\_10\` Huyền thoại ≥ 2400

Màu: tier 1–3 xám, 4–5 xanh lá, 6–7 cam, 8–9 đỏ, 10 tím\. Thanh tiến độ = \(Elo − Elo\_min\) / \(Elo\_max − Elo\_min\) của bậc hiện tại\. Thông báo thăng bậc khi BR vượt ranh giới\.

Điểm hiển thị \(BR\) và trần chưa xác minh \(đã cài sẵn trong ratingEngine\.ts, hàm \`calculateBlendedRating\`; bạn không viết lại, chỉ nối vào hiển thị\)\.

\`n\_eff = 0,2 × \(trận giao hữu V1\) \+ 0,5 × \(trận giải cộng đồng V2\) \+ 1,0 × \(trận chính thức V3\)\`; \`w = n\_eff / \(n\_eff \+ 10\)\`; \`BR = w × MR \+ \(1 − w\) × AR\`\.

Hai trần áp đồng thời: BR cuối = min\(BR, các trần còn hiệu lực\)\. Trần 1: 1199, gỡ khi ≥ 5 trận V3 hoặc \(≥ 10 trận V2 và ≥ 3 đối thủ khác nhau\)\. Trần 2: AR \+ 200, gỡ khi ≥ 5 trận V3 hoặc \(≥ 20 trận V2 và ≥ 5 đối thủ khác nhau\)\. Số đối thủ khác nhau lấy từ \`countUniqueOpponents\`\. Hàm trả \`\{ br, activeCaps, isFullyUncapped \}\`\.

Mọi ngưỡng đặt trong ratingConfig\.ts, GIẢ ĐỊNH\.

Quy tắc đã chốt \(không đổi\):

K cơ bản: giao hữu 10, cộng đồng 24, chính thức 32\. K lâm thời gấp đôi trong 10 trận đầu \(đếm theo số trận thực tế\)\.

Mỗi trận dùng \`K\_match = max\(K\_mọi người trong trận\)\` để người thắng và người thua đổi cùng số điểm\.

Trong 10 trận đầu, tổng mức tăng MR của từng người không vượt \+400 \(lưu riêng \`mrGainFirst10\`, không suy từ MR − 1000\)\.

Người vi phạm farm \(đấu cùng đối thủ ≥ 3 lần trong 30 ngày, ngoại lệ vòng bảng/loại trực tiếp do admin xác minh\): ΔR = 0 riêng người đó, người còn lại trong trận giữ ΔR bình thường \(quyết định 14\)\.

Tài khoản trùng \`deviceId\` chỉ gắn cờ, không chặn; không được đếm là "đối thủ khác nhau" \(quyết định 13\)\.

Đánh đôi: Elo đội = trung bình MR hai người; mỗi người cùng đội nhận cùng ΔR; tổng bốn người = 0 \(GIẢ ĐỊNH, quyết định 16\)\.

Trần ±80 điểm mỗi giải áp theo từng người \(hàm \`applyTournamentCap\` đã có sẵn: kẹp tổng ΔR của một người trong một giải\)\.

Nghiệm thu bắt buộc:

\`ratingEngine\.test\.ts\` bên dưới chạy xanh, bạn dán đầu ra thật\. Bạn được thêm test, không được sửa/xóa test có sẵn\. Nếu một test có sẵn đỏ vì khung test khác môi trường, báo Lead, đừng sửa kỳ vọng\.

Thêm một test tích hợp: 3 đối thủ V2 cùng \`deviceId\` \(qua \`canonicalIds\` \+ \`countUniqueOpponents\`\) rồi đưa kết quả vào \`calculateBlendedRating\` thì trần 1 không được gỡ dù đủ 10 trận V2\.

Typecheck và build của dự án không lỗi mới\.

Hồ sơ người chơi hiển thị đúng tên bậc, màu, thanh tiến độ cho MR = 999, 1000, 1599, 1600, 2400\.

Không dùng thời gian phản hồi\.

Nội dung ratingEngine\.ts \(chép nguyên văn, KHÔNG viết lại; đã gồm calculateBlendedRating, applyTournamentCap, findFarmViolators, measureAndApplyDrift\)

\`\`\`typescript // Match Rating engine \(DS\-1 v8, Lead sửa lượt 14\)\. Thuần TS, không phụ thuộc thư viện\. export type MatchType = 'friendly' | 'community' | 'official'; export const K\_BASE: Record<MatchType, number> = \{ friendly: 10, community: 24, official: 32 \};

export interface PlayerState \{ id: string; mr: number; matchesPlayed: number; // số trận đã tính điểm \(để xác định 10 trận đầu\) mrGainFirst10: number; // tổng mức tăng MR đã nhận trong 10 trận đầu \(chỉ cộng phần dương\) deviceId?: string; \}

export function expectedScore\(ra: number, rb: number\): number \{ return 1 / \(1 \+ Math\.pow\(10, \(rb \- ra\) / 400\)\); \}

export function kFor\(p: PlayerState, type: MatchType\): number \{ return K\_BASE\[type\] \* \(p\.matchesPlayed < 10 ? 2 : 1\); \}

/ teamA/teamB: 1 người \(đơn\) hoặc 2 người \(đôi\)\. aWins: đội A thắng\. violators: tập người bị ΔR = 0 \(quyết định 14\)\. \*/ export function computeMatchDeltas\( teamA: PlayerState\[\], teamB: PlayerState\[\], aWins: boolean, type: MatchType, violators: Set = new Set\(\), growthCap = 400, \): Record<string, number> \{ const mean = \(t: PlayerState\[\]\) => t\.reduce\(\(s, p\) => s \+ p\.mr, 0\) / t\.length; const e = expectedScore\(mean\(teamA\), mean\(teamB\)\); const kMatch = Math\.max\(\.\.\.\[\.\.\.teamA, \.\.\.teamB\]\.map\(p => kFor\(p, type\)\)\); const dA = kMatch \* \(\(aWins ? 1 : 0\) \- e\); // mỗi người đội A nhận dA, mỗi người đội B nhận \-dA const out: Record<string, number> = \{\}; for \(const p of teamA\) out\[p\.id\] = dA; for \(const p of teamB\) out\[p\.id\] = \-dA; for \(const p of \[\.\.\.teamA, \.\.\.teamB\]\) \{ if \(violators\.has\(p\.id\)\) \{ out\[p\.id\] = 0; continue; \} if \(p\.matchesPlayed < 10 && out\[p\.id\] > 0\) \{ out\[p\.id\] = Math\.max\(0, Math\.min\(out\[p\.id\], growthCap \- p\.mrGainFirst10\)\); // áp cho TỪNG người \} \} return out; // drift tổng sinh ra theo quyết định 12 \}

/ Gom tài khoản cùng deviceId thành một cụm \(union\-find\) để đếm đối thủ khác nhau\. Đại diện cụm xác định \(id nhỏ nhất\)\. \*/ export function canonicalIds\(players: Record<string, \{ deviceId?: string \}>\): Record<string, string> \{ const byDev: Record<string, string\[\]> = \{\}; for \(const \[id, p\] of Object\.entries\(players\)\) if \(p\.deviceId\) \(byDev\[p\.deviceId\] ||= \[\]\)\.push\(id\); const canon: Record<string, string> = \{\}; for \(const id of Object\.keys\(players\)\) canon\[id\] = id; for \(const ids of Object\.values\(byDev\)\) \{ const rep = \[\.\.\.ids\]\.sort\(\)\[0\]; for \(const id of ids\) canon\[id\] = rep; \} return canon; \}

export interface MatchResult \{ matchId: string; matchType: MatchType; date: Date; teamA: string\[\]; teamB: string\[\]; isVerified: boolean; isAdminVerified?: boolean; isWalkover: boolean; isKZero: boolean; \}

export function countUniqueOpponents\( matches: MatchResult\[\], target: string, type: MatchType, players: Record<string, \{ deviceId?: string \}>, \): number \{ const canon = canonicalIds\(players\); const me = canon\[target\] ?? target; const set = new Set\(\); for \(const m of matches\) \{ if \(m\.matchType \!== type || \!m\.isVerified || m\.isWalkover || m\.isKZero\) continue; if \(type === 'community' && m\.isAdminVerified \!== true\) continue; const inA = m\.teamA\.includes\(target\), inB = m\.teamB\.includes\(target\); if \(\!inA && \!inB\) continue; for \(const o of inA ? m\.teamB : m\.teamA\) \{ const c = canon\[o\] ?? o; if \(c \!== me\) set\.add\(c\); // tài khoản trùng cụm với chính mình không tính \} \} return set\.size; \}

// \-\-\-\- Bổ sung lượt 14 \-\-\-\- export interface BlendInput \{ ar: number; mr: number; v1: number; v2: number; v3: number; uniqueV2Opponents: number \} export const CAP\_CONFIG = \{ cap1: 1199, cap2Margin: 200, v3ToRemove: 5, v2For1: 10, opp1: 3, v2For2: 20, opp2: 5 \}; // GIẢ ĐỊNH

export function calculateBlendedRating\(i: BlendInput\) \{ const nEff = i\.v1 \* 0\.2 \+ i\.v2 \* 0\.5 \+ i\.v3 \* 1\.0; const w = nEff / \(nEff \+ 10\); let br = w \* i\.mr \+ \(1 \- w\) \* i\.ar; const c = CAP\_CONFIG; const rm1 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For1 && i\.uniqueV2Opponents >= c\.opp1\); const rm2 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For2 && i\.uniqueV2Opponents >= c\.opp2\); const caps: number\[\] = \[\], activeCaps: string\[\] = \[\]; if \(\!rm1 && \!rm2\) \{ /\* cả hai còn \*/ \} if \(\!rm1\) \{ caps\.push\(c\.cap1\); activeCaps\.push\('cap1\_1199'\); \} if \(\!rm2\) \{ caps\.push\(i\.ar \+ c\.cap2Margin\); activeCaps\.push\('cap2\_AR\+200'\); \} if \(caps\.length\) br = Math\.min\(br, \.\.\.caps\); return \{ br, activeCaps, isFullyUncapped: caps\.length === 0 \}; \}

/ Trần ±80/giải: kẹp TỔNG ΔR của từng người trong một giải\. GIẢ ĐỊNH\. \*/ export function applyTournamentCap\(totals: Record<string, number>, maxCap = 80\): Record<string, number> \{ const out: Record<string, number> = \{\}; for \(const \[id, d\] of Object\.entries\(totals\)\) out\[id\] = Math\.max\(\-maxCap, Math\.min\(maxCap, d\)\); return out; \}

/ Người vi phạm farm: cặp đối thủ đã gặp ≥ 2 lần \(đã xác minh, không walkover/KZero, không official\) trong 30 ngày trước trận này\. \*/ export function findFarmViolators\(all: MatchResult\[\], cur: MatchResult & \{ tournamentId?: string; tournamentPhase?: 'group' | 'knockout' | 'none' \}\): Set \{ const v = new Set\(\); if \(cur\.tournamentId && \['group', 'knockout'\]\.includes\(cur\.tournamentPhase || ''\) && cur\.isAdminVerified === true\) return v; const to = new Date\(cur\.date\)\.getTime\(\), from = to \- 30 \* 86400000; const past = all\.filter\(m => m\.matchType \!== 'official' && \!m\.isKZero && \!m\.isWalkover && m\.isVerified && new Date\(m\.date\)\.getTime\(\) < to && new Date\(m\.date\)\.getTime\(\) >= from\); for \(const a of cur\.teamA\) for \(const b of cur\.teamB\) \{ let n = 0; for \(const m of past\) if \(\(m\.teamA\.includes\(a\) && m\.teamB\.includes\(b\)\) || \(m\.teamA\.includes\(b\) && m\.teamB\.includes\(a\)\)\) n\+\+; if \(n >= 2\) \{ v\.add\(a\); v\.add\(b\); \} \} return v; \}

/ Giảm phát hai chiều: nếu |mean − 1000| > 50 thì dịch mọi người về lại mean = 1000\. \*/ export function measureAndApplyDrift\(r: Record<string, number>\) \{ const ids = Object\.keys\(r\); if \(\!ids\.length\) return \{ newRatings: \{\}, driftApplied: 0 \}; const mean = ids\.reduce\(\(s, id\) => s \+ r\[id\], 0\) / ids\.length; if \(Math\.abs\(mean \- 1000\) <= 50\) return \{ newRatings: \{ \.\.\.r \}, driftApplied: 0 \}; const shift = 1000 \- mean; const out: Record<string, number> = \{\}; for \(const id of ids\) out\[id\] = r\[id\] \+ shift; return \{ newRatings: out, driftApplied: shift \}; \} \`\`\`

Nội dung test \(chép nguyên văn thành hai file test\)

Hai bộ dưới đây Lead đã chạy xanh \(17 \+ 17 ca, số kỳ vọng tính tay\)\. Khi đổi sang khung test của dự án, giữ nguyên dữ liệu vào và số kỳ vọng\.

ratingEngine\.test\.ts

\`\`\`typescript import \{ computeMatchDeltas, countUniqueOpponents, expectedScore \} from '\./ratingEngine\.ts'; import type \{ PlayerState, MatchResult \} from '\./ratingEngine\.ts'; let fail=0; const ok=\(n:string,c:boolean\)=>\{console\.log\(\(c?'PASS ':'FAIL '\)\+n\);if\(\!c\)fail\+\+\}; const P=\(id:string,mr:number,n:number,g=0,dev?:string\):PlayerState=>\(\{id,mr,matchesPlayed:n,mrGainFirst10:g,deviceId:dev\}\); const near=\(a:number,b:number\)=>Math\.abs\(a\-b\)<1e\-6; // 1 đơn 1000 vs 1000, ổn định, cộng đồng, thắng: \+12 let d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'community'\); ok\('đơn ngang nhau thắng \+12',near\(d\.a,12\)&&near\(d\.b,\-12\)\); // 2 tổng bằng 0 d=computeMatchDeltas\(\[P\('a',1200,3\)\],\[P\('b',900,40\)\],false,'community'\); ok\('tổng bằng 0',near\(d\.a\+d\.b,0\)\); ok\('K\_match=max → 48',near\(d\.a,\-48\*expectedScore\(1200,900\)\)\); // 3 người mới sát trần \+400: chỉ còn 20 d=computeMatchDeltas\(\[P\('a',1000,3,380\)\],\[P\('b',1000,30\)\],true,'community'\); ok\('cap người mới còn 20',near\(d\.a,20\)\); // 4 cap áp cho người thứ hai \(B mới, A cũ thua\) d=computeMatchDeltas\(\[P\('a',1000,30\)\],\[P\('b',1000,3,390\)\],false,'community'\); ok\('cap áp cho B',near\(d\.b,10\)&&d\.a<0\); // 5 farm: chỉ người vi phạm ΔR=0 \(đôi\), người kia giữ nguyên d=computeMatchDeltas\(\[P\('a1',1000,20\),P\('a2',1000,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community',new Set\(\['a2','b1'\]\)\); ok\('farm: a2,b1=0',d\.a2===0&&d\.b1===0\); ok\('farm: a1,b2 giữ',near\(d\.a1,12\)&&near\(d\.b2,\-12\)\); // 6 không NaN khi có K nhỏ d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'friendly'\); ok\('không NaN',Number\.isFinite\(d\.a\)&&near\(d\.a,5\)\); // 7 thắng người mạnh hơn không bao giờ giảm let bad=0; for\(const ra of \[800,1000,1500\]\) for\(const rb of \[ra\+1,ra\+200,ra\+800\]\) \{ const x=computeMatchDeltas\(\[P\('a',ra,20\)\],\[P\('b',rb,20\)\],true,'official'\); if\(x\.a<0\) bad\+\+; \} ok\('thắng người mạnh hơn không giảm',bad===0\); // 8 đôi: tổng 4 người bằng 0 d=computeMatchDeltas\(\[P\('a1',1100,20\),P\('a2',900,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community'\); ok\('đôi tổng 0',near\(d\.a1\+d\.a2\+d\.b1\+d\.b2,0\)\); // countUniqueOpponents const players:any=\{target:\{deviceId:'X'\},o1:\{deviceId:'A'\},o2:\{deviceId:'A'\},o3:\{deviceId:'A'\},o4:\{deviceId:'B'\},twin:\{deviceId:'X'\}\}; const m=\(id:string,o:string\[\],extra:Partial=\{\}\):MatchResult=>\(\{matchId:id,matchType:'community',date:new Date\(\),teamA:\['target'\],teamB:o,isVerified:true,isAdminVerified:true,isWalkover:false,isKZero:false,\.\.\.extra\}\); ok\('2 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\)\],'target','community',players\)===1\); ok\('3 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\),m\('3',\['o3'\]\)\],'target','community',players\)===1\); ok\('đôi: hai đối thủ cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1','o2'\]\)\],'target','community',players\)===1\); ok\('đối thủ cùng máy với chính mình không tính',countUniqueOpponents\(\[m\('1',\['twin'\]\),m\('2',\['o4'\]\)\],'target','community',players\)===1\); ok\('V2 thiếu admin xác minh bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isAdminVerified:false\}\)\],'target','community',players\)===0\); ok\('walkover/KZero bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isWalkover:true\}\),m\('2',\['o4'\],\{isKZero:true\}\)\],'target','community',players\)===0\); ok\('đếm theo phía B',countUniqueOpponents\(\[\{\.\.\.m\('1',\['target'\]\),teamA:\['o4'\],teamB:\['target'\]\}\],'target','community',players\)===1\); console\.log\(fail?\`$\{fail\} FAIL\`:'ALL PASS'\); process\.exit\(fail?1:0\); \`\`\`

ratingEngine\.rules\.test\.ts

\`\`\`typescript import \{ calculateBlendedRating as B, applyTournamentCap, findFarmViolators, measureAndApplyDrift \} from '\./ratingEngine\.ts'; import type \{ MatchResult \} from '\./ratingEngine\.ts'; let f=0;const ok=\(n:string,c:boolean\)=>\{console\.log\(\(c?'PASS ':'FAIL '\)\+n\);if\(\!c\)f\+\+\}; let r=B\(\{ar:1500,mr:1000,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('chỉ AR 1500: br=1500 bị chặn ≤1199',r\.br===1199&&r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:0,v3:5,uniqueV2Opponents:0\}\); ok\('5 trận V3 gỡ cả hai trần',r\.isFullyUncapped&&Math\.abs\(r\.br\-\(5/15\*1500\+10/15\*1500\)\)<1e\-9\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:3\}\); ok\('10 V2 ≥3 đối thủ: gỡ trần 1, còn trần AR\+200',r\.activeCaps\.join\(\)==='cap2\_AR\+200'\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:2\}\); ok\('10 V2 chỉ 2 đối thủ: chưa gỡ',r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:20,v3:0,uniqueV2Opponents:5\}\); ok\('20 V2 ≥5 đối thủ: gỡ hết',r\.isFullyUncapped\); r=B\(\{ar:900,mr:900,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('AR 900: trần AR\+200=1100 chặt hơn 1199',r\.br===900&&r\.activeCaps\.length===2\); const c=applyTournamentCap\(\{a:120,b:\-95,c:30\}\); ok\('trần ±80',c\.a===80&&c\.b===\-80&&c\.c===30\); const d0=new Date\('2026\-11\-10'\); const m=\(id:string,days:number,a:string,b:string,x:Partial=\{\}\):MatchResult=>\(\{matchId:id,matchType:'community',date:new Date\(d0\.getTime\(\)\-days\*86400000\),teamA:\[a\],teamB:\[b\],isVerified:true,isWalkover:false,isKZero:false,\.\.\.x\}\); const cur=\{\.\.\.m\('cur',0,'a','b'\),date:d0\}; ok\('2 trận trước trong 30 ngày → vi phạm cả hai',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',5,'b','a'\)\],cur\)\.size===2\); ok\('1 trận trước: không vi phạm',findFarmViolators\(\[m\('1',3,'a','b'\)\],cur\)\.size===0\); ok\('trận ngoài 30 ngày không đếm',findFarmViolators\(\[m\('1',31,'a','b'\),m\('2',40,'a','b'\)\],cur\)\.size===0\); ok\('trận KZero/walkover/chưa xác minh không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{isKZero:true\}\),m\('2',4,'a','b',\{isWalkover:true\}\),m\('3',5,'a','b',\{isVerified:false\}\)\],cur\)\.size===0\); ok\('trận official không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{matchType:'official'\}\),m\('2',4,'a','b',\{matchType:'official'\}\)\],cur\)\.size===0\); ok\('vòng bảng có admin xác minh: miễn',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',4,'a','b'\)\],\{\.\.\.cur,tournamentId:'T',tournamentPhase:'group',isAdminVerified:true\}\)\.size===0\); ok\('đôi: chỉ cặp đối đầu bị đếm',\(\(\)=>\{const dm=\(id:string,days:number\):MatchResult=>\(\{\.\.\.m\(id,days,'a1','b1'\),teamA:\['a1','a2'\],teamB:\['b1','b2'\]\}\);const v=findFarmViolators\(\[dm\('1',3\),dm\('2',4\)\],\{\.\.\.cur,teamA:\['a1','a3'\],teamB:\['b1','b3'\]\}\);return v\.has\('a1'\)&&v\.has\('b1'\)&&\!v\.has\('a3'\)&&\!v\.has\('b3'\)\}\)\(\)\); let x=measureAndApplyDrift\(\{a:1100,b:1100\}\); ok\('drift \+: kéo về 1000',x\.driftApplied===\-100&&x\.newRatings\.a===1000\); x=measureAndApplyDrift\(\{a:900,b:900\}\); ok\('drift −: kéo về 1000',x\.driftApplied===100\); x=measureAndApplyDrift\(\{a:1030,b:1030\}\); ok\('trong ngưỡng 50: không đổi',x\.driftApplied===0\); console\.log\(f?f\+' FAIL':'ALL PASS'\);process\.exit\(f?1:0\) \`\`\`

Ticket E7: Giải đấu và sự kiện, MVP M1

Điều kiện: E1 đã xong và Lead đã duyệt báo cáo\. Dùng đường dẫn thật từ R0\.

Mục tiêu\. Admin tạo sự kiện cầu lông \(đơn/đôi\) ngay trong trang Payload admin, nhập kết quả, duyệt, đóng giải; hệ thống xử lý lô, cập nhật MR bằng engine E1, lưu lịch sử, hiển thị lịch sử MR trong hồ sơ\. Phạm vi M1: cầu lông đơn và đôi; bóng đá chưa làm\.

Được sửa/tạo \(collection mới, 5\): \`Events\`, \`EventRegistrations\`, \`EventMatches\`, \`EventResults\`, \`MatchRatingHistory\`\. Sửa \`payload\.config\` để đăng ký chúng\. Sửa CommunityProfiles/UserAchievements chỉ để thêm trường \(xem dưới\), không đổi trường cũ\. Thêm một khối "Lịch sử MR" vào trang hồ sơ\.

Cấm động vào: engine chấm tình huống, schema tình huống, \`ratingEngine\.ts\` \(chỉ gọi, không sửa; cần đổi thì hỏi Lead\), phiếu đánh giá bóng đá, audit log \(để sau\)\.

Trường chính \(kiểu và quan hệ do bạn chọn theo quy ước Payload của repo\):

\`Events\`: tên, môn \(badminton\), thể thức \(singles/doubles\), loại \(\`friendly\` | \`community\` | \`official\`\), ngày, địa điểm, trạng thái, người tạo, \`isPublicNames\` \(riêng tư\), \`isDemo\`\.

\`EventRegistrations\`: sự kiện, người chơi \(đôi: hai người\), trạng thái đăng ký\.

\`EventMatches\`: sự kiện, \`teamA\[\]\`, \`teamB\[\]\` \(1 hoặc 2 người\), vòng/giai đoạn \(\`group\` | \`knockout\` | \`none\`\), điểm hai bên, \`enteredBy\`, \`confirmedBy\`, \`approvedBy\`, \`isWalkover\`, \`isDisputed\`\.

\`EventResults\`: sự kiện, người chơi, hạng cuối, số thắng/thua\.

\`MatchRatingHistory\`: người chơi, sự kiện, trận, \`mrBefore\`, \`mrAfter\`, \`delta\`, \`kMatch\`, lý do \(\`normal\` | \`farm\_zero\` | \`growth\_cap\` | \`tournament\_cap\`\), \`createdAt\`\.

Thêm vào hồ sơ người chơi: \`mr\` \(mặc định 1000\), \`matchesPlayed\`, \`mrGainFirst10\`, \`deviceId\`, \`possibleAlt\` \(cờ\)\.

Vòng đời sự kiện \(6 trạng thái\): \`draft\` → \`registration\_open\` → \`in\_progress\` → \`pending\_approval\` → \`closed\_processed\`; và \`cancelled\` từ mọi trạng thái trước \`closed\_processed\`\. Chỉ admin chuyển \`pending\_approval\` → \`closed\_processed\`\. Chuyển trạng thái sai thứ tự phải bị từ chối\.

Ánh xạ loại sự kiện → K và mức xác minh: \`friendly\` = V1 \(K 10, hai người chơi cùng xác nhận\), \`community\` = V2 \(K 24, cần admin xác minh\), \`official\` = V3 \(K 32, admin duyệt, sinh bản ghi AP theo luật AP hiện có nhưng không cộng Elo từ AP\)\.

Xử lý khi đóng giải \(một hành động admin\):

Chỉ lấy trận đã \`approved\`, không \`isWalkover\`, không \`isDisputed\`\.

Xử lý theo thứ tự thời gian của trận; kết quả không được phụ thuộc thứ tự lưu trong DB\. Nếu engine phụ thuộc thứ tự thì ghi rõ trong báo cáo\.

Với mỗi trận: tìm người vi phạm farm \(dùng \`findFarmViolators\` có sẵn trong ratingEngine\.ts\), gọi \`computeMatchDeltas\`, áp \`applyTournamentCap\` ở cuối giải, ghi \`MatchRatingHistory\`\.

Idempotency: đóng giải lần hai không được cộng điểm lần nữa \(khóa theo sự kiện\)\.

Hồ sơ demo và shop không được đăng ký, không đấu, không có MR\.

Tên, bậc, MR chỉ hiện công khai khi người chơi bật công khai\.

Ngoại lệ: kết quả bị tranh chấp \(giữ trận ở trạng thái chờ, không tính\), nhập nhầm \(admin sửa trước khi đóng giải; sau khi đóng thì cần "đảo bút toán" bằng bản ghi lịch sử mới, không xóa\), người rút lui \(giữ trận đã đấu, vô hiệu trận chưa đấu\), sự kiện hủy sau khi đã có kết quả \(không xử lý rating\)\.

Màn hình \(khối giao diện, không cần mockup\): danh sách sự kiện, chi tiết sự kiện, trang admin nhập/duyệt kết quả \(dùng giao diện Payload mặc định nếu được\), khối "Lịch sử MR" trong hồ sơ\.

Nghiệm thu bắt buộc:

Test tích hợp: tạo giải 4 người đơn vòng tròn, đóng giải, kiểm tổng ΔMR toàn giải bằng 0 \(nếu không bằng 0 vì trần thì nêu rõ nguồn\)\.

Đóng giải hai lần: MR không đổi ở lần hai\.

Hai tài khoản cùng \`deviceId\` không làm tăng số đối thủ khác nhau\.

Chuyển trạng thái sai thứ tự bị từ chối \(test\)\.

Dán đầu ra thật của test, typecheck, build\.

Dữ liệu seed tạo ra phải ghi nhãn \`isDemo = true\` và hiện chữ "minh họa" trên giao diện\.

Câu hỏi để bạn trả lời trong báo cáo: engine E1 có xử lý được toàn bộ giải trong một giao dịch DB không; Payload hiện dùng DB gì \(để chọn cách khóa idempotency\)\.

## <a id="_5h9hy78tcygd"></a>T17\#7 \(16,450 ký tự\)

Khối chung \(dán đầu mọi ticket\)

Bạn là kỹ sư sửa source code của dự án SportDNA \(Next\.js \+ Payload CMS\)\. Bạn sửa file thật, không phải thiết kế trên Figma\.

Quy tắc:

Đọc trước, sửa sau\. Không đoán đường dẫn file\. Nếu ticket nêu tên file mà repo không có, dừng và báo, đừng tạo thay thế tùy ý\. Chỉ sửa file trong mục "Được sửa" của ticket\. Mục "Cấm động vào" là tuyệt đối\. Cần sửa file ngoài danh sách thì dừng lại và hỏi\. Mọi con số đánh dấu GIẢ ĐỊNH phải để thành hằng số có tên trong một file cấu hình duy nhất, kèm comment // GIẢ ĐỊNH, để Lead đổi sau khi có dữ liệu\. Không dùng thời gian phản hồi của người dùng để chấm điểm ở bất kỳ đâu\. Cuối mỗi ticket báo cáo đúng khuôn: \(a\) file đã tạo/sửa, \(b\) lệnh đã chạy và kết quả thật \(test, build, typecheck; dán đầu ra, không tóm tắt\), \(c\) điều chưa làm được và lý do, \(d\) câu hỏi cho Lead\. Không tự ghi "đạt" khi chưa chạy\. Không migration phá dữ liệu: chỉ thêm trường/collection, không xóa hay đổi tên trường hiện có\. Quy ước repo \(từ báo cáo R0\): test dùng node:test dạng \.mjs trong tests/ \(chạy node \-\-test tests/\), không dùng vitest/jest; typecheck pnpm exec tsc \-\-noEmit; build pnpm build\. Không sửa src/app/\(payload\)/ \(do Payload quản lý\), src/lib/scenario\-engine\.ts, ScenarioCourt\.tsx, src/lib/sportdna\.ts \(kể cả TIERS\)\. Ticket E1: Engine Match Rating \(thư viện thuần, chưa đụng DB, chưa đụng giao diện\)

Điều kiện: R0 đã xong\. Đây là bản đã sửa theo R0\.

Mục tiêu\. Đưa engine MR thuần TypeScript vào repo và thêm bảng bậc cho điểm hiển thị BR\. E1 không tạo collection, không sửa giao diện, không sửa bảng TIERS đang dùng cho quiz\. Hai bảng bậc sẽ tạm thời cùng tồn tại \(xem quyết định 18 ở dưới\); việc hợp nhất để Lead quyết sau\.

Được tạo:

src/lib/rating/ratingEngine\.ts: chép nguyên văn nội dung bên dưới\. Không viết lại, không đổi tên hàm\. src/lib/rating/ratingConfig\.ts: bảng bậc MR/BR \(bên dưới\) và hàm resolveRatingTier\(br: number\) trả \{ id, name, min, max, color, progress \}\. File này không import sportdna\.ts\. tests/rating\-engine\.test\.mjs: chép nguyên văn nội dung bên dưới\. tests/rating\-config\.test\.mjs: bạn viết, kiểm resolveRatingTier tại 799, 800, 999, 1000, 1199, 1200, 1599, 1600, 2399, 2400 \(đúng id bậc, màu, progress trong \[0, 1\]\)\.

Cấm động vào: mọi file ngoài danh sách trên, đặc biệt src/lib/sportdna\.ts, src/lib/scenario\-engine\.ts, src/collections/, src/payload\.config\.ts, AccountSportDna\.tsx, SportDnaQuiz\.tsx, package\.json \(không thêm script, không thêm thư viện\)\.

Bảng bậc \(trong ratingConfig\.ts\)\. GIẢ ĐỊNH: quần thể chuẩn, trung bình 1000, độ lệch chuẩn 250\.

Mã Tên hiển thị Khoảng Màu tier\_1 Mới tập chơi < 800 xám tier\_2 Phong trào yếu 800–999 xám tier\_3 Trung bình 1000–1199 xám tier\_4 Trung bình khá 1200–1399 xanh lá tier\_5 Khá 1400–1599 xanh lá tier\_6 Khá \+ 1600–1799 cam tier\_7 Bán chuyên 1800–1999 cam tier\_8 Chuyên nghiệp 2000–2199 đỏ tier\_9 Bán chuyên Quốc gia 2200–2399 đỏ tier\_10 Huyền thoại ≥ 2400 tím

progress = \(br − min\) / \(max − min\) của bậc hiện tại; bậc đầu và bậc cuối \(không có một đầu\) cho progress = 0 ở bậc cuối và kẹp trong \[0, 1\] ở bậc đầu \(ghi rõ lựa chọn trong báo cáo\)\.

Quy tắc engine \(đã cài trong code, chỉ để bạn biết, không đổi\): K 10/24/32 theo giao hữu/cộng đồng/chính thức, gấp đôi trong 10 trận đầu; K\_match = max của mọi người trong trận; trần \+400 trong 10 trận đầu cho từng người \(mrGainFirst10\); người vi phạm farm ΔR = 0, người còn lại giữ nguyên; tài khoản cùng deviceId gộp thành một cụm khi đếm đối thủ khác nhau; đôi dùng trung bình MR hai người, mỗi người cùng đội nhận cùng ΔR, tổng bốn người bằng 0; BR = w × MR \+ \(1 − w\) × AR với w = n\_eff / \(n\_eff \+ 10\); hai trần chưa xác minh áp đồng thời\. Mọi ngưỡng là GIẢ ĐỊNH, nằm ở CAP\_CONFIG và các hằng trong file\.

Nghiệm thu bắt buộc:

node \-\-test tests/rating\-engine\.test\.mjs tests/rating\-config\.test\.mjs xanh\. Dán đầu ra thật\. Nếu Node của môi trường không import được \.ts trực tiếp, báo Lead, đừng đổi đuôi hay thêm bước build tự ý\. pnpm exec tsc \-\-noEmit không phát sinh lỗi mới \(báo cả khi ratingEngine\.ts bị báo lỗi\)\. Bạn được thêm test, không được sửa hay xóa test có sẵn\. Nếu một test đỏ vì khác môi trường, báo Lead, đừng sửa số kỳ vọng\. Thêm một test tích hợp: 3 đối thủ V2 cùng deviceId \(qua countUniqueOpponents\) rồi đưa số đó vào calculateBlendedRating thì trần 1 không được gỡ dù đủ 10 trận V2\. git status chỉ có đúng 4 file mới ở trên\. Nội dung src/lib/rating/ratingEngine\.ts \(chép nguyên văn\) typescript // Match Rating engine \(DS\-1 v8, Lead sửa lượt 14\)\. Thuần TS, không phụ thuộc thư viện\. export type MatchType = 'friendly' | 'community' | 'official'; export const K\_BASE: Record<MatchType, number> = \{ friendly: 10, community: 24, official: 32 \};

export interface PlayerState \{ id: string; mr: number; matchesPlayed: number; // số trận đã tính điểm \(để xác định 10 trận đầu\) mrGainFirst10: number; // tổng mức tăng MR đã nhận trong 10 trận đầu \(chỉ cộng phần dương\) deviceId?: string; \}

export function expectedScore\(ra: number, rb: number\): number \{ return 1 / \(1 \+ Math\.pow\(10, \(rb \- ra\) / 400\)\); \}

export function kFor\(p: PlayerState, type: MatchType\): number \{ return K\_BASE\[type\] \* \(p\.matchesPlayed < 10 ? 2 : 1\); \}

/ teamA/teamB: 1 người \(đơn\) hoặc 2 người \(đôi\)\. aWins: đội A thắng\. violators: tập người bị ΔR = 0 \(quyết định 14\)\. \*/ export function computeMatchDeltas\( teamA: PlayerState\[\], teamB: PlayerState\[\], aWins: boolean, type: MatchType, violators: Set = new Set\(\), growthCap = 400, \): Record<string, number> \{ const mean = \(t: PlayerState\[\]\) => t\.reduce\(\(s, p\) => s \+ p\.mr, 0\) / t\.length; const e = expectedScore\(mean\(teamA\), mean\(teamB\)\); const kMatch = Math\.max\(\.\.\.\[\.\.\.teamA, \.\.\.teamB\]\.map\(p => kFor\(p, type\)\)\); const dA = kMatch \* \(\(aWins ? 1 : 0\) \- e\); // mỗi người đội A nhận dA, mỗi người đội B nhận \-dA const out: Record<string, number> = \{\}; for \(const p of teamA\) out\[p\.id\] = dA; for \(const p of teamB\) out\[p\.id\] = \-dA; for \(const p of \[\.\.\.teamA, \.\.\.teamB\]\) \{ if \(violators\.has\(p\.id\)\) \{ out\[p\.id\] = 0; continue; \} if \(p\.matchesPlayed < 10 && out\[p\.id\] > 0\) \{ out\[p\.id\] = Math\.max\(0, Math\.min\(out\[p\.id\], growthCap \- p\.mrGainFirst10\)\); // áp cho TỪNG người \} \} return out; // drift tổng sinh ra theo quyết định 12 \}

/ Gom tài khoản cùng deviceId thành một cụm \(union\-find\) để đếm đối thủ khác nhau\. Đại diện cụm xác định \(id nhỏ nhất\)\. \*/ export function canonicalIds\(players: Record<string, \{ deviceId?: string \}>\): Record<string, string> \{ const byDev: Record<string, string\[\]> = \{\}; for \(const \[id, p\] of Object\.entries\(players\)\) if \(p\.deviceId\) \(byDev\[p\.deviceId\] ||= \[\]\)\.push\(id\); const canon: Record<string, string> = \{\}; for \(const id of Object\.keys\(players\)\) canon\[id\] = id; for \(const ids of Object\.values\(byDev\)\) \{ const rep = \[\.\.\.ids\]\.sort\(\)\[0\]; for \(const id of ids\) canon\[id\] = rep; \} return canon; \}

export interface MatchResult \{ matchId: string; matchType: MatchType; date: Date; teamA: string\[\]; teamB: string\[\]; isVerified: boolean; isAdminVerified?: boolean; isWalkover: boolean; isKZero: boolean; \}

export function countUniqueOpponents\( matches: MatchResult\[\], target: string, type: MatchType, players: Record<string, \{ deviceId?: string \}>, \): number \{ const canon = canonicalIds\(players\); const me = canon\[target\] ?? target; const set = new Set\(\); for \(const m of matches\) \{ if \(m\.matchType \!== type || \!m\.isVerified || m\.isWalkover || m\.isKZero\) continue; if \(type === 'community' && m\.isAdminVerified \!== true\) continue; const inA = m\.teamA\.includes\(target\), inB = m\.teamB\.includes\(target\); if \(\!inA && \!inB\) continue; for \(const o of inA ? m\.teamB : m\.teamA\) \{ const c = canon\[o\] ?? o; if \(c \!== me\) set\.add\(c\); // tài khoản trùng cụm với chính mình không tính \} \} return set\.size; \}

// \-\-\-\- Bổ sung lượt 14 \-\-\-\- export interface BlendInput \{ ar: number; mr: number; v1: number; v2: number; v3: number; uniqueV2Opponents: number \} export const CAP\_CONFIG = \{ cap1: 1199, cap2Margin: 200, v3ToRemove: 5, v2For1: 10, opp1: 3, v2For2: 20, opp2: 5 \}; // GIẢ ĐỊNH

export function calculateBlendedRating\(i: BlendInput\) \{ const nEff = i\.v1 \* 0\.2 \+ i\.v2 \* 0\.5 \+ i\.v3 \* 1\.0; const w = nEff / \(nEff \+ 10\); let br = w \* i\.mr \+ \(1 \- w\) \* i\.ar; const c = CAP\_CONFIG; const rm1 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For1 && i\.uniqueV2Opponents >= c\.opp1\); const rm2 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For2 && i\.uniqueV2Opponents >= c\.opp2\); const caps: number\[\] = \[\], activeCaps: string\[\] = \[\]; if \(\!rm1 && \!rm2\) \{ /\* cả hai còn \*/ \} if \(\!rm1\) \{ caps\.push\(c\.cap1\); activeCaps\.push\('cap1\_1199'\); \} if \(\!rm2\) \{ caps\.push\(i\.ar \+ c\.cap2Margin\); activeCaps\.push\('cap2\_AR\+200'\); \} if \(caps\.length\) br = Math\.min\(br, \.\.\.caps\); return \{ br, activeCaps, isFullyUncapped: caps\.length === 0 \}; \}

/ Trần ±80/giải: kẹp TỔNG ΔR của từng người trong một giải\. GIẢ ĐỊNH\. \*/ export function applyTournamentCap\(totals: Record<string, number>, maxCap = 80\): Record<string, number> \{ const out: Record<string, number> = \{\}; for \(const \[id, d\] of Object\.entries\(totals\)\) out\[id\] = Math\.max\(\-maxCap, Math\.min\(maxCap, d\)\); return out; \}

/ Người vi phạm farm: cặp đối thủ đã gặp ≥ 2 lần \(đã xác minh, không walkover/KZero, không official\) trong 30 ngày trước trận này\. \*/ export function findFarmViolators\(all: MatchResult\[\], cur: MatchResult & \{ tournamentId?: string; tournamentPhase?: 'group' | 'knockout' | 'none' \}\): Set \{ const v = new Set\(\); if \(cur\.tournamentId && \['group', 'knockout'\]\.includes\(cur\.tournamentPhase || ''\) && cur\.isAdminVerified === true\) return v; const to = new Date\(cur\.date\)\.getTime\(\), from = to \- 30 \* 86400000; const past = all\.filter\(m => m\.matchType \!== 'official' && \!m\.isKZero && \!m\.isWalkover && m\.isVerified && new Date\(m\.date\)\.getTime\(\) < to && new Date\(m\.date\)\.getTime\(\) >= from\); for \(const a of cur\.teamA\) for \(const b of cur\.teamB\) \{ let n = 0; for \(const m of past\) if \(\(m\.teamA\.includes\(a\) && m\.teamB\.includes\(b\)\) || \(m\.teamA\.includes\(b\) && m\.teamB\.includes\(a\)\)\) n\+\+; if \(n >= 2\) \{ v\.add\(a\); v\.add\(b\); \} \} return v; \}

/ Giảm phát hai chiều: nếu |mean − 1000| > 50 thì dịch mọi người về lại mean = 1000\. \*/ export function measureAndApplyDrift\(r: Record<string, number>\) \{ const ids = Object\.keys\(r\); if \(\!ids\.length\) return \{ newRatings: \{\}, driftApplied: 0 \}; const mean = ids\.reduce\(\(s, id\) => s \+ r\[id\], 0\) / ids\.length; if \(Math\.abs\(mean \- 1000\) <= 50\) return \{ newRatings: \{ \.\.\.r \}, driftApplied: 0 \}; const shift = 1000 \- mean; const out: Record<string, number> = \{\}; for \(const id of ids\) out\[id\] = r\[id\] \+ shift; return \{ newRatings: out, driftApplied: shift \}; \} Nội dung tests/rating\-engine\.test\.mjs \(chép nguyên văn; Lead đã chạy 34/34 xanh bằng node \-\-experimental\-strip\-types \-\-test\) javascript import test from 'node:test' import assert from 'node:assert/strict' import \* as E from '\.\./src/lib/rating/ratingEngine\.ts' const \{ computeMatchDeltas, countUniqueOpponents, expectedScore, calculateBlendedRating: B, applyTournamentCap, findFarmViolators, measureAndApplyDrift \} = E \{ const ok=\(n,c\)=>test\(n,\(\)=>assert\.ok\(c\)\); const P=\(id,mr,n,g=0,dev\)=>\(\{id,mr,matchesPlayed:n,mrGainFirst10:g,deviceId:dev\}\); const near=\(a,b\)=>Math\.abs\(a\-b\)<1e\-6; // 1 đơn 1000 vs 1000, ổn định, cộng đồng, thắng: \+12 let d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'community'\); ok\('đơn ngang nhau thắng \+12',near\(d\.a,12\)&&near\(d\.b,\-12\)\); // 2 tổng bằng 0 d=computeMatchDeltas\(\[P\('a',1200,3\)\],\[P\('b',900,40\)\],false,'community'\); ok\('tổng bằng 0',near\(d\.a\+d\.b,0\)\); ok\('K\_match=max → 48',near\(d\.a,\-48\*expectedScore\(1200,900\)\)\); // 3 người mới sát trần \+400: chỉ còn 20 d=computeMatchDeltas\(\[P\('a',1000,3,380\)\],\[P\('b',1000,30\)\],true,'community'\); ok\('cap người mới còn 20',near\(d\.a,20\)\); // 4 cap áp cho người thứ hai \(B mới, A cũ thua\) d=computeMatchDeltas\(\[P\('a',1000,30\)\],\[P\('b',1000,3,390\)\],false,'community'\); ok\('cap áp cho B',near\(d\.b,10\)&&d\.a<0\); // 5 farm: chỉ người vi phạm ΔR=0 \(đôi\), người kia giữ nguyên d=computeMatchDeltas\(\[P\('a1',1000,20\),P\('a2',1000,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community',new Set\(\['a2','b1'\]\)\); ok\('farm: a2,b1=0',d\.a2===0&&d\.b1===0\); ok\('farm: a1,b2 giữ',near\(d\.a1,12\)&&near\(d\.b2,\-12\)\); // 6 không NaN khi có K nhỏ d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'friendly'\); ok\('không NaN',Number\.isFinite\(d\.a\)&&near\(d\.a,5\)\); // 7 thắng người mạnh hơn không bao giờ giảm let bad=0; for\(const ra of \[800,1000,1500\]\) for\(const rb of \[ra\+1,ra\+200,ra\+800\]\) \{ const x=computeMatchDeltas\(\[P\('a',ra,20\)\],\[P\('b',rb,20\)\],true,'official'\); if\(x\.a<0\) bad\+\+; \} ok\('thắng người mạnh hơn không giảm',bad===0\); // 8 đôi: tổng 4 người bằng 0 d=computeMatchDeltas\(\[P\('a1',1100,20\),P\('a2',900,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community'\); ok\('đôi tổng 0',near\(d\.a1\+d\.a2\+d\.b1\+d\.b2,0\)\); // countUniqueOpponents const players=\{target:\{deviceId:'X'\},o1:\{deviceId:'A'\},o2:\{deviceId:'A'\},o3:\{deviceId:'A'\},o4:\{deviceId:'B'\},twin:\{deviceId:'X'\}\}; const m=\(id,o,extra=\{\}\)=>\(\{matchId:id,matchType:'community',date:new Date\(\),teamA:\['target'\],teamB:o,isVerified:true,isAdminVerified:true,isWalkover:false,isKZero:false,\.\.\.extra\}\); ok\('2 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\)\],'target','community',players\)===1\); ok\('3 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\),m\('3',\['o3'\]\)\],'target','community',players\)===1\); ok\('đôi: hai đối thủ cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1','o2'\]\)\],'target','community',players\)===1\); ok\('đối thủ cùng máy với chính mình không tính',countUniqueOpponents\(\[m\('1',\['twin'\]\),m\('2',\['o4'\]\)\],'target','community',players\)===1\); ok\('V2 thiếu admin xác minh bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isAdminVerified:false\}\)\],'target','community',players\)===0\); ok\('walkover/KZero bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isWalkover:true\}\),m\('2',\['o4'\],\{isKZero:true\}\)\],'target','community',players\)===0\); ok\('đếm theo phía B',countUniqueOpponents\(\[\{\.\.\.m\('1',\['target'\]\),teamA:\['o4'\],teamB:\['target'\]\}\],'target','community',players\)===1\);

\} \{ const ok=\(n,c\)=>test\(n,\(\)=>assert\.ok\(c\)\); let r=B\(\{ar:1500,mr:1000,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('chỉ AR 1500: br=1500 bị chặn ≤1199',r\.br===1199&&r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:0,v3:5,uniqueV2Opponents:0\}\); ok\('5 trận V3 gỡ cả hai trần',r\.isFullyUncapped&&Math\.abs\(r\.br\-\(5/15\*1500\+10/15\*1500\)\)<1e\-9\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:3\}\); ok\('10 V2 ≥3 đối thủ: gỡ trần 1, còn trần AR\+200',r\.activeCaps\.join\(\)==='cap2\_AR\+200'\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:2\}\); ok\('10 V2 chỉ 2 đối thủ: chưa gỡ',r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:20,v3:0,uniqueV2Opponents:5\}\); ok\('20 V2 ≥5 đối thủ: gỡ hết',r\.isFullyUncapped\); r=B\(\{ar:900,mr:900,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('AR 900: trần AR\+200=1100 chặt hơn 1199',r\.br===900&&r\.activeCaps\.length===2\); const c=applyTournamentCap\(\{a:120,b:\-95,c:30\}\); ok\('trần ±80',c\.a===80&&c\.b===\-80&&c\.c===30\); const d0=new Date\('2026\-11\-10'\); const m=\(id,days,a,b,x=\{\}\)=>\(\{matchId:id,matchType:'community',date:new Date\(d0\.getTime\(\)\-days\*86400000\),teamA:\[a\],teamB:\[b\],isVerified:true,isWalkover:false,isKZero:false,\.\.\.x\}\); const cur=\{\.\.\.m\('cur',0,'a','b'\),date:d0\}; ok\('2 trận trước trong 30 ngày → vi phạm cả hai',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',5,'b','a'\)\],cur\)\.size===2\); ok\('1 trận trước: không vi phạm',findFarmViolators\(\[m\('1',3,'a','b'\)\],cur\)\.size===0\); ok\('trận ngoài 30 ngày không đếm',findFarmViolators\(\[m\('1',31,'a','b'\),m\('2',40,'a','b'\)\],cur\)\.size===0\); ok\('trận KZero/walkover/chưa xác minh không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{isKZero:true\}\),m\('2',4,'a','b',\{isWalkover:true\}\),m\('3',5,'a','b',\{isVerified:false\}\)\],cur\)\.size===0\); ok\('trận official không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{matchType:'official'\}\),m\('2',4,'a','b',\{matchType:'official'\}\)\],cur\)\.size===0\); ok\('vòng bảng có admin xác minh: miễn',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',4,'a','b'\)\],\{\.\.\.cur,tournamentId:'T',tournamentPhase:'group',isAdminVerified:true\}\)\.size===0\); ok\('đôi: chỉ cặp đối đầu bị đếm',\(\(\)=>\{const dm=\(id,days\)=>\(\{\.\.\.m\(id,days,'a1','b1'\),teamA:\['a1','a2'\],teamB:\['b1','b2'\]\}\);const v=findFarmViolators\(\[dm\('1',3\),dm\('2',4\)\],\{\.\.\.cur,teamA:\['a1','a3'\],teamB:\['b1','b3'\]\}\);return v\.has\('a1'\)&&v\.has\('b1'\)&&\!v\.has\('a3'\)&&\!v\.has\('b3'\)\}\)\(\)\); let x=measureAndApplyDrift\(\{a:1100,b:1100\}\); ok\('drift \+: kéo về 1000',x\.driftApplied===\-100&&x\.newRatings\.a===1000\); x=measureAndApplyDrift\(\{a:900,b:900\}\); ok\('drift −: kéo về 1000',x\.driftApplied===100\); x=measureAndApplyDrift\(\{a:1030,b:1030\}\); ok\('trong ngưỡng 50: không đổi',x\.driftApplied===0\);

\}

## <a id="_li82ofg5ej9b"></a>T17\#8 \(31,577 ký tự\)

Khối chung \(dán đầu mọi ticket\)

Bạn là kỹ sư sửa source code của dự án SportDNA \(Next\.js \+ Payload CMS\)\. Bạn sửa file thật, không phải thiết kế trên Figma\.

Quy tắc:

Đọc trước, sửa sau\. Không đoán đường dẫn file\. Nếu ticket nêu tên file mà repo không có, dừng và báo, đừng tạo thay thế tùy ý\. Chỉ sửa file trong mục "Được sửa" của ticket\. Mục "Cấm động vào" là tuyệt đối\. Cần sửa file ngoài danh sách thì dừng lại và hỏi\. Mọi con số đánh dấu GIẢ ĐỊNH phải để thành hằng số có tên trong một file cấu hình duy nhất, kèm comment // GIẢ ĐỊNH, để Lead đổi sau khi có dữ liệu\. Không dùng thời gian phản hồi của người dùng để chấm điểm ở bất kỳ đâu\. Cuối mỗi ticket báo cáo đúng khuôn: \(a\) file đã tạo/sửa, \(b\) lệnh đã chạy và kết quả thật \(test, build, typecheck; dán đầu ra, không tóm tắt\), \(c\) điều chưa làm được và lý do, \(d\) câu hỏi cho Lead\. Không tự ghi "đạt" khi chưa chạy\. Không migration phá dữ liệu: chỉ thêm trường/collection, không xóa hay đổi tên trường hiện có\. Quy ước repo \(từ báo cáo R0\): test dùng node:test dạng \.mjs trong tests/ \(chạy node \-\-test tests/\), không dùng vitest/jest; typecheck pnpm exec tsc \-\-noEmit; build pnpm build\. Không sửa src/app/\(payload\)/ \(do Payload quản lý\), src/lib/scenario\-engine\.ts, ScenarioCourt\.tsx, src/lib/sportdna\.ts \(kể cả TIERS\)\.

Báo cáo E1: Engine Match Rating

E1 đã xong\. Hai bộ test chạy xanh 49/49, typecheck không báo lỗi, và \`git status\` trước khi commit chỉ có đúng 4 file mới\.

\(a\) File đã tạo/sửa

Không sửa file nào có sẵn\. Chỉ tạo 4 file mới:

\`src/lib/rating/ratingEngine\.ts\`: chép nguyên văn nội dung Lead gửi\. Mình chỉ bỏ các ký tự thoát markdown như \`\*\` và \`\_\`, không đổi tên hàm hay logic\.

\`src/lib/rating/ratingConfig\.ts\`: bảng bậc BR và hàm \`resolveRatingTier\(br\)\`, trả về \`\{ id, name, min, max, color, progress \}\`\. File này không import \`sportdna\.ts\`\. Các hằng GIẢ ĐỊNH đều có comment \`// GIẢ ĐỊNH\`:

\`RATING\_POPULATION\_MEAN = 1000\`

\`RATING\_POPULATION\_SD = 250\`

\`FIRST\_TIER\_PROGRESS\_FLOOR = 600\`

\`RATING\_TIERS\`

\`tests/rating\-engine\.test\.mjs\`: chép nguyên văn, giữ nguyên số kỳ vọng\.

\`tests/rating\-config\.test\.mjs\`: test mới do mình viết, gồm:

10 điểm 799, 800, 999, 1000, 1199, 1200, 1599, 1600, 2399, 2400: kiểm id bậc, màu và progress nằm trong \[0, 1\]\.

Progress ở hai cận của một bậc, ở bậc cuối và ở bậc đầu\.

BR số thực sát ranh giới \(999\.6\)\.

Test tích hợp: 10 trận V2 với 3 tài khoản cùng \`deviceId\`\. \`countUniqueOpponents\` trả về 1, và khi đưa số này vào \`calculateBlendedRating\` thì trần 1 vẫn còn, BR = 1199\.

Cách tính progress:

Bậc có đủ hai đầu: progress = \(br − min\) / \(max − min\), với \`max\` là cận trên trong bảng\. Ví dụ tier\_3 có max = 1199, nên 1199 cho progress = 1\.

Bậc cuối \(tier\_10\): progress luôn bằng 0\.

Bậc đầu \(tier\_1\): lấy min = \`FIRST\_TIER\_PROGRESS\_FLOOR\` \(600, GIẢ ĐỊNH, thấp hơn 800 đúng một độ rộng bậc\), tính như trên rồi kẹp vào \[0, 1\]\.

BR là số thực nên bậc được chọn theo cận dưới của bậc kế tiếp\. Ví dụ 999\.6 vẫn thuộc tier\_2\.

\(b\) Lệnh đã chạy và kết quả thật

Test:

\`\`\`text $ node \-\-test tests/rating\-engine\.test\.mjs tests/rating\-config\.test\.mjs; echo "EXIT=$?" TAP version 13 ok 1 \- BR 799 → tier\_1 \(gray\) ok 2 \- BR 800 → tier\_2 \(gray\) ok 3 \- BR 999 → tier\_2 \(gray\) ok 4 \- BR 1000 → tier\_3 \(gray\) ok 5 \- BR 1199 → tier\_3 \(gray\) ok 6 \- BR 1200 → tier\_4 \(green\) ok 7 \- BR 1599 → tier\_5 \(green\) ok 8 \- BR 1600 → tier\_6 \(orange\) ok 9 \- BR 2399 → tier\_9 \(red\) ok 10 \- BR 2400 → tier\_10 \(purple\) ok 11 \- progress tại cận dưới = 0, cận trên = 1 của bậc có hai đầu ok 12 \- bậc cuối có progress = 0 ok 13 \- bậc đầu kẹp progress trong \[0, 1\] ok 14 \- BR số thực sát ranh giới giữ bậc dưới ok 15 \- tích hợp: 3 đối thủ V2 cùng deviceId không gỡ trần 1 dù đủ 10 trận V2 ok 16 \- đơn ngang nhau thắng \+12 ok 17 \- tổng bằng 0 ok 18 \- K\_match=max → 48 ok 19 \- cap người mới còn 20 ok 20 \- cap áp cho B ok 21 \- farm: a2,b1=0 ok 22 \- farm: a1,b2 giữ ok 23 \- không NaN ok 24 \- thắng người mạnh hơn không giảm ok 25 \- đôi tổng 0 ok 26 \- 2 alt cùng máy = 1 ok 27 \- 3 alt cùng máy = 1 ok 28 \- đôi: hai đối thủ cùng máy = 1 ok 29 \- đối thủ cùng máy với chính mình không tính ok 30 \- V2 thiếu admin xác minh bị loại ok 31 \- walkover/KZero bị loại ok 32 \- đếm theo phía B ok 33 \- chỉ AR 1500: br=1500 bị chặn ≤1199 ok 34 \- 5 trận V3 gỡ cả hai trần ok 35 \- 10 V2 ≥3 đối thủ: gỡ trần 1, còn trần AR\+200 ok 36 \- 10 V2 chỉ 2 đối thủ: chưa gỡ ok 37 \- 20 V2 ≥5 đối thủ: gỡ hết ok 38 \- AR 900: trần AR\+200=1100 chặt hơn 1199 ok 39 \- trần ±80 ok 40 \- 2 trận trước trong 30 ngày → vi phạm cả hai ok 41 \- 1 trận trước: không vi phạm ok 42 \- trận ngoài 30 ngày không đếm ok 43 \- trận KZero/walkover/chưa xác minh không đếm ok 44 \- trận official không đếm ok 45 \- vòng bảng có admin xác minh: miễn ok 46 \- đôi: chỉ cặp đối đầu bị đếm ok 47 \- drift \+: kéo về 1000 ok 48 \- drift −: kéo về 1000 ok 49 \- trong ngưỡng 50: không đổi 1\.\.49

tests 49

suites 0

pass 49

fail 0

cancelled 0

skipped 0

todo 0

duration\_ms 192\.205861

EXIT=0 \`\`\`

Phần trên giữ nguyên mọi dòng kết quả\. Mình chỉ lược các khối \`duration\_ms\` / \`type: 'test'\` của từng ca để báo cáo gọn hơn\.

Node v22\.23\.4 import file \`\.ts\` trực tiếp được, không cần cờ thêm và không cần bước build\. Bộ test Lead gửi \(34 ca\) đều xanh, mình không sửa số kỳ vọng nào\.

Typecheck:

\`\`\`text $ pnpm exec tsc \-\-noEmit; echo "EXIT=$?" EXIT=0 \`\`\`

Không có lỗi nào, kể cả trong \`ratingEngine\.ts\`\.

Phạm vi file, kiểm tra trước khi commit:

\`\`\`text $ git status \-\-short \-\-untracked\-files=all ?? src/lib/rating/ratingConfig\.ts ?? src/lib/rating/ratingEngine\.ts ?? tests/rating\-config\.test\.mjs ?? tests/rating\-engine\.test\.mjs \`\`\`

Commit theo quy trình Make:

\`\`\`text \[main b57850d89509bc3a0ec54b5ccfc2ef00c3600faa\] Add Match Rating engine and BR tier config \(E1\) 4 files changed, 364 insertions\(\+\) Created Make version 4 \(b57850d89509bc3a0ec54b5ccfc2ef00c3600faa\) \`\`\`

\(c\) Điều chưa làm được và lý do

Không chạy \`pnpm build\`: ticket không yêu cầu, và E1 không đụng tới route hay collection nào\.

Không chạy \`oxfmt\` cho \`ratingEngine\.ts\` và \`rating\-engine\.test\.mjs\`: hai file này phải giữ nguyên văn, mà formatter sẽ định dạng lại chúng\.

Hằng GIẢ ĐỊNH chưa gom về một file: \`CAP\_CONFIG\`, \`K\_BASE\`, hệ số n\_eff \(0,2/0,5/1,0\), số 10 trong w, trần \+400, trần ±80, ngưỡng farm và ngưỡng drift đều nằm trong \`ratingEngine\.ts\`\. File đó phải chép nguyên văn nên mình không chuyển các hằng này sang \`ratingConfig\.ts\`\. Điều này trái với quy tắc 3 của khối chung\.

\(d\) Câu hỏi cho Lead

Có cho phép một ticket sau chuyển các hằng GIẢ ĐỊNH trong \`ratingEngine\.ts\` sang \`ratingConfig\.ts\` không, để đúng quy tắc "một file cấu hình duy nhất"?

Mốc \`FIRST\_TIER\_PROGRESS\_FLOOR = 600\` cho bậc đầu có ổn không, hay Lead muốn bậc đầu cũng có progress bằng 0?

\`color\` hiện là tên màu dạng chữ \(\`gray\`, \`green\`, …\)\. Có cần mã màu hex hoặc design token cụ thể trước khi nối vào giao diện ở E7 không?

Ba câu hỏi từ R0 vẫn chờ trả lời trước khi viết E7:

Đặt tên collection giải đấu là \`TournamentEvents\` cho khỏi trùng \`Events\`?

Lưu MR và \`deviceId\` ở \`users\` \(riêng tư\) hay tạo collection mới, thay vì \`community\-profiles\` mà ai cũng đọc được?

Bảng bậc của quiz và bảng bậc MR sẽ hợp nhất khi nào?

SportDNA: Prompt giao việc cho Figma AI \(đợt 5, lượt 14\)

Gửi từng ticket một, theo thứ tự R0 \(đã xong\) → E1 \(đã xong\) → E7\. Khi gửi E7, dán theo thứ tự: Khối chung, "Trả lời báo cáo E1", rồi Ticket E7\. Bản này đã sửa theo báo cáo R0\. Mỗi tin nhắn gồm: Khối chung \+ đúng một ticket\. Chờ báo cáo của ticket trước rồi mới gửi ticket sau\. E6, E8, E9 \(nạp tình huống đôi/phòng thủ, bóng đá\) chưa viết vì cần định nghĩa R từ báo cáo R0 \(Lead cố ý không đoán\)\.

Khối chung \(dán đầu mọi ticket\)

Bạn là kỹ sư sửa source code của dự án SportDNA \(Next\.js \+ Payload CMS\)\. Bạn sửa file thật, không phải thiết kế trên Figma\.

Quy tắc:

Đọc trước, sửa sau\. Không đoán đường dẫn file\. Nếu ticket nêu tên file mà repo không có, dừng và báo, đừng tạo thay thế tùy ý\.

Chỉ sửa file trong mục "Được sửa" của ticket\. Mục "Cấm động vào" là tuyệt đối\. Cần sửa file ngoài danh sách thì dừng lại và hỏi\.

Mọi con số đánh dấu GIẢ ĐỊNH phải để thành hằng số có tên trong một file cấu hình duy nhất, kèm comment \`// GIẢ ĐỊNH\`, để Lead đổi sau khi có dữ liệu\.

Không dùng thời gian phản hồi của người dùng để chấm điểm ở bất kỳ đâu\.

Cuối mỗi ticket báo cáo đúng khuôn: \(a\) file đã tạo/sửa, \(b\) lệnh đã chạy và kết quả thật \(test, build, typecheck; dán đầu ra, không tóm tắt\), \(c\) điều chưa làm được và lý do, \(d\) câu hỏi cho Lead\. Không tự ghi "đạt" khi chưa chạy\.

Không migration phá dữ liệu: chỉ thêm trường/collection, không xóa hay đổi tên trường hiện có\.

Quy ước repo \(từ báo cáo R0\): test dùng \`node:test\` dạng \`\.mjs\` trong \`tests/\` \(chạy \`node \-\-test tests/\`\), không dùng vitest/jest; typecheck \`pnpm exec tsc \-\-noEmit\`; build \`pnpm build\`\. Không sửa \`src/app/\(payload\)/\` \(do Payload quản lý\), \`src/lib/scenario\-engine\.ts\`, \`ScenarioCourt\.tsx\`, \`src/lib/sportdna\.ts\` \(kể cả \`TIERS\`\)\.

Ticket R0: Do thám source \(CHỈ ĐỌC, không sửa gì\)

Mục tiêu\. Lead chưa đọc source nên chưa chốt được định nghĩa R trong S = A × T × R, chưa biết đường dẫn thật để viết ticket sửa file\. Bạn trả lời bằng dữ kiện trích từ code\.

Được sửa: không file nào\. Cấm động vào: mọi file\.

Trả lời đủ các mục, mỗi mục kèm đường dẫn file và số dòng:

Bản đồ file\. Đường dẫn thật của: collection Users, UserAchievements, SportAssessments, CommunityProfiles; \`actions\.ts\` \(hoặc nơi chứa server action chấm điểm tình huống\); \`payload\.config\`; trang admin; chỗ hiển thị bậc/Elo trong hồ sơ\.

Engine chấm tình huống\. Hàm nào tính S = A × T × R? Nhập/xuất của nó là gì? Dán chữ ký hàm và thân hàm\.

Định nghĩa R\. R là trường nào, thang nào \(0–1? hệ số?\), tính từ đâu? Nếu code không có biến tên R, nói rõ biểu thức tương ứng\. Không suy diễn: nếu không tìm thấy, ghi "không tìm thấy"\.

Nhánh positional\. Hiện có hành động định vị \(không phải cú đánh\) và điểm P không? Chấm ở đâu?

Hard\-fail\. Engine xử lý hard\-fail thế nào \(A = 0? S = 0? cờ riêng\)? Có kiểm tầm với ≤ 1,6 m, nửa sân, chiều cao cầu so với lưới không?

Schema tình huống\. Dán một tình huống đơn B01 đầy đủ như đang lưu \(JSON hoặc TS\), và nêu các trường có thể có \`gameMode\`, \`partner\`, \`opponents\`, \`heightM\`, \`activeBranch\` hay chưa\.

Elo hiện tại\. Thang Elo/bậc đang nằm ở đâu? Bao nhiêu bậc, ranh giới nào, khởi tạo bao nhiêu? Có MR/AR tách riêng chưa?

Khung kiểm thử\. Có vitest/jest chưa? Lệnh chạy test, typecheck, build là gì?

Dữ liệu mẫu\. Có seed/fixture không? Hồ sơ demo và shop được đánh dấu bằng trường nào?

Ticket E1: Engine Match Rating \(thư viện thuần, chưa đụng DB, chưa đụng giao diện\)

Điều kiện: R0 đã xong\. Đây là bản đã sửa theo R0\.

Mục tiêu\. Đưa engine MR thuần TypeScript vào repo và thêm bảng bậc cho điểm hiển thị BR\. E1 không tạo collection, không sửa giao diện, không sửa bảng \`TIERS\` đang dùng cho quiz\. Hai bảng bậc sẽ tạm thời cùng tồn tại \(xem quyết định 18 ở dưới\); việc hợp nhất để Lead quyết sau\.

Được tạo:

\`src/lib/rating/ratingEngine\.ts\`: chép nguyên văn nội dung bên dưới\. Không viết lại, không đổi tên hàm\.

\`src/lib/rating/ratingConfig\.ts\`: bảng bậc MR/BR \(bên dưới\) và hàm \`resolveRatingTier\(br: number\)\` trả \`\{ id, name, min, max, color, progress \}\`\. File này không import \`sportdna\.ts\`\.

\`tests/rating\-engine\.test\.mjs\`: chép nguyên văn nội dung bên dưới\.

\`tests/rating\-config\.test\.mjs\`: bạn viết, kiểm \`resolveRatingTier\` tại 799, 800, 999, 1000, 1199, 1200, 1599, 1600, 2399, 2400 \(đúng id bậc, màu, progress trong \[0, 1\]\)\.

Cấm động vào: mọi file ngoài danh sách trên, đặc biệt \`src/lib/sportdna\.ts\`, \`src/lib/scenario\-engine\.ts\`, \`src/collections/\`, \`src/payload\.config\.ts\`, \`AccountSportDna\.tsx\`, \`SportDnaQuiz\.tsx\`, \`package\.json\` \(không thêm script, không thêm thư viện\)\.

Bảng bậc \(trong ratingConfig\.ts\)\. GIẢ ĐỊNH: quần thể chuẩn, trung bình 1000, độ lệch chuẩn 250\.

Mã Tên hiển thị Khoảng Màu

\`tier\_1\` Mới tập chơi < 800 xám

\`tier\_2\` Phong trào yếu 800–999 xám

\`tier\_3\` Trung bình 1000–1199 xám

\`tier\_4\` Trung bình khá 1200–1399 xanh lá

\`tier\_5\` Khá 1400–1599 xanh lá

\`tier\_6\` Khá \+ 1600–1799 cam

\`tier\_7\` Bán chuyên 1800–1999 cam

\`tier\_8\` Chuyên nghiệp 2000–2199 đỏ

\`tier\_9\` Bán chuyên Quốc gia 2200–2399 đỏ

\`tier\_10\` Huyền thoại ≥ 2400 tím

\`progress = \(br − min\) / \(max − min\)\` của bậc hiện tại; bậc đầu và bậc cuối \(không có một đầu\) cho \`progress = 0\` ở bậc cuối và kẹp trong \[0, 1\] ở bậc đầu \(ghi rõ lựa chọn trong báo cáo\)\.

Quy tắc engine \(đã cài trong code, chỉ để bạn biết, không đổi\): K 10/24/32 theo giao hữu/cộng đồng/chính thức, gấp đôi trong 10 trận đầu; \`K\_match = max\` của mọi người trong trận; trần \+400 trong 10 trận đầu cho từng người \(\`mrGainFirst10\`\); người vi phạm farm ΔR = 0, người còn lại giữ nguyên; tài khoản cùng \`deviceId\` gộp thành một cụm khi đếm đối thủ khác nhau; đôi dùng trung bình MR hai người, mỗi người cùng đội nhận cùng ΔR, tổng bốn người bằng 0; BR = w × MR \+ \(1 − w\) × AR với w = n\_eff / \(n\_eff \+ 10\); hai trần chưa xác minh áp đồng thời\. Mọi ngưỡng là GIẢ ĐỊNH, nằm ở \`CAP\_CONFIG\` và các hằng trong file\.

Nghiệm thu bắt buộc:

\`node \-\-test tests/rating\-engine\.test\.mjs tests/rating\-config\.test\.mjs\` xanh\. Dán đầu ra thật\. Nếu Node của môi trường không import được \`\.ts\` trực tiếp, báo Lead, đừng đổi đuôi hay thêm bước build tự ý\.

\`pnpm exec tsc \-\-noEmit\` không phát sinh lỗi mới \(báo cả khi \`ratingEngine\.ts\` bị báo lỗi\)\.

Bạn được thêm test, không được sửa hay xóa test có sẵn\. Nếu một test đỏ vì khác môi trường, báo Lead, đừng sửa số kỳ vọng\.

Thêm một test tích hợp: 3 đối thủ V2 cùng \`deviceId\` \(qua \`countUniqueOpponents\`\) rồi đưa số đó vào \`calculateBlendedRating\` thì trần 1 không được gỡ dù đủ 10 trận V2\.

\`git status\` chỉ có đúng 4 file mới ở trên\.

Nội dung \`src/lib/rating/ratingEngine\.ts\` \(chép nguyên văn\)

\`\`\`typescript // Match Rating engine \(DS\-1 v8, Lead sửa lượt 14\)\. Thuần TS, không phụ thuộc thư viện\. export type MatchType = 'friendly' | 'community' | 'official'; export const K\_BASE: Record<MatchType, number> = \{ friendly: 10, community: 24, official: 32 \};

export interface PlayerState \{ id: string; mr: number; matchesPlayed: number; // số trận đã tính điểm \(để xác định 10 trận đầu\) mrGainFirst10: number; // tổng mức tăng MR đã nhận trong 10 trận đầu \(chỉ cộng phần dương\) deviceId?: string; \}

export function expectedScore\(ra: number, rb: number\): number \{ return 1 / \(1 \+ Math\.pow\(10, \(rb \- ra\) / 400\)\); \}

export function kFor\(p: PlayerState, type: MatchType\): number \{ return K\_BASE\[type\] \* \(p\.matchesPlayed < 10 ? 2 : 1\); \}

/ teamA/teamB: 1 người \(đơn\) hoặc 2 người \(đôi\)\. aWins: đội A thắng\. violators: tập người bị ΔR = 0 \(quyết định 14\)\. \*/ export function computeMatchDeltas\( teamA: PlayerState\[\], teamB: PlayerState\[\], aWins: boolean, type: MatchType, violators: Set = new Set\(\), growthCap = 400, \): Record<string, number> \{ const mean = \(t: PlayerState\[\]\) => t\.reduce\(\(s, p\) => s \+ p\.mr, 0\) / t\.length; const e = expectedScore\(mean\(teamA\), mean\(teamB\)\); const kMatch = Math\.max\(\.\.\.\[\.\.\.teamA, \.\.\.teamB\]\.map\(p => kFor\(p, type\)\)\); const dA = kMatch \* \(\(aWins ? 1 : 0\) \- e\); // mỗi người đội A nhận dA, mỗi người đội B nhận \-dA const out: Record<string, number> = \{\}; for \(const p of teamA\) out\[p\.id\] = dA; for \(const p of teamB\) out\[p\.id\] = \-dA; for \(const p of \[\.\.\.teamA, \.\.\.teamB\]\) \{ if \(violators\.has\(p\.id\)\) \{ out\[p\.id\] = 0; continue; \} if \(p\.matchesPlayed < 10 && out\[p\.id\] > 0\) \{ out\[p\.id\] = Math\.max\(0, Math\.min\(out\[p\.id\], growthCap \- p\.mrGainFirst10\)\); // áp cho TỪNG người \} \} return out; // drift tổng sinh ra theo quyết định 12 \}

/ Gom tài khoản cùng deviceId thành một cụm \(union\-find\) để đếm đối thủ khác nhau\. Đại diện cụm xác định \(id nhỏ nhất\)\. \*/ export function canonicalIds\(players: Record<string, \{ deviceId?: string \}>\): Record<string, string> \{ const byDev: Record<string, string\[\]> = \{\}; for \(const \[id, p\] of Object\.entries\(players\)\) if \(p\.deviceId\) \(byDev\[p\.deviceId\] ||= \[\]\)\.push\(id\); const canon: Record<string, string> = \{\}; for \(const id of Object\.keys\(players\)\) canon\[id\] = id; for \(const ids of Object\.values\(byDev\)\) \{ const rep = \[\.\.\.ids\]\.sort\(\)\[0\]; for \(const id of ids\) canon\[id\] = rep; \} return canon; \}

export interface MatchResult \{ matchId: string; matchType: MatchType; date: Date; teamA: string\[\]; teamB: string\[\]; isVerified: boolean; isAdminVerified?: boolean; isWalkover: boolean; isKZero: boolean; \}

export function countUniqueOpponents\( matches: MatchResult\[\], target: string, type: MatchType, players: Record<string, \{ deviceId?: string \}>, \): number \{ const canon = canonicalIds\(players\); const me = canon\[target\] ?? target; const set = new Set\(\); for \(const m of matches\) \{ if \(m\.matchType \!== type || \!m\.isVerified || m\.isWalkover || m\.isKZero\) continue; if \(type === 'community' && m\.isAdminVerified \!== true\) continue; const inA = m\.teamA\.includes\(target\), inB = m\.teamB\.includes\(target\); if \(\!inA && \!inB\) continue; for \(const o of inA ? m\.teamB : m\.teamA\) \{ const c = canon\[o\] ?? o; if \(c \!== me\) set\.add\(c\); // tài khoản trùng cụm với chính mình không tính \} \} return set\.size; \}

// \-\-\-\- Bổ sung lượt 14 \-\-\-\- export interface BlendInput \{ ar: number; mr: number; v1: number; v2: number; v3: number; uniqueV2Opponents: number \} export const CAP\_CONFIG = \{ cap1: 1199, cap2Margin: 200, v3ToRemove: 5, v2For1: 10, opp1: 3, v2For2: 20, opp2: 5 \}; // GIẢ ĐỊNH

export function calculateBlendedRating\(i: BlendInput\) \{ const nEff = i\.v1 \* 0\.2 \+ i\.v2 \* 0\.5 \+ i\.v3 \* 1\.0; const w = nEff / \(nEff \+ 10\); let br = w \* i\.mr \+ \(1 \- w\) \* i\.ar; const c = CAP\_CONFIG; const rm1 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For1 && i\.uniqueV2Opponents >= c\.opp1\); const rm2 = i\.v3 >= c\.v3ToRemove || \(i\.v2 >= c\.v2For2 && i\.uniqueV2Opponents >= c\.opp2\); const caps: number\[\] = \[\], activeCaps: string\[\] = \[\]; if \(\!rm1 && \!rm2\) \{ /\* cả hai còn \*/ \} if \(\!rm1\) \{ caps\.push\(c\.cap1\); activeCaps\.push\('cap1\_1199'\); \} if \(\!rm2\) \{ caps\.push\(i\.ar \+ c\.cap2Margin\); activeCaps\.push\('cap2\_AR\+200'\); \} if \(caps\.length\) br = Math\.min\(br, \.\.\.caps\); return \{ br, activeCaps, isFullyUncapped: caps\.length === 0 \}; \}

/ Trần ±80/giải: kẹp TỔNG ΔR của từng người trong một giải\. GIẢ ĐỊNH\. \*/ export function applyTournamentCap\(totals: Record<string, number>, maxCap = 80\): Record<string, number> \{ const out: Record<string, number> = \{\}; for \(const \[id, d\] of Object\.entries\(totals\)\) out\[id\] = Math\.max\(\-maxCap, Math\.min\(maxCap, d\)\); return out; \}

/ Người vi phạm farm: cặp đối thủ đã gặp ≥ 2 lần \(đã xác minh, không walkover/KZero, không official\) trong 30 ngày trước trận này\. \*/ export function findFarmViolators\(all: MatchResult\[\], cur: MatchResult & \{ tournamentId?: string; tournamentPhase?: 'group' | 'knockout' | 'none' \}\): Set \{ const v = new Set\(\); if \(cur\.tournamentId && \['group', 'knockout'\]\.includes\(cur\.tournamentPhase || ''\) && cur\.isAdminVerified === true\) return v; const to = new Date\(cur\.date\)\.getTime\(\), from = to \- 30 \* 86400000; const past = all\.filter\(m => m\.matchType \!== 'official' && \!m\.isKZero && \!m\.isWalkover && m\.isVerified && new Date\(m\.date\)\.getTime\(\) < to && new Date\(m\.date\)\.getTime\(\) >= from\); for \(const a of cur\.teamA\) for \(const b of cur\.teamB\) \{ let n = 0; for \(const m of past\) if \(\(m\.teamA\.includes\(a\) && m\.teamB\.includes\(b\)\) || \(m\.teamA\.includes\(b\) && m\.teamB\.includes\(a\)\)\) n\+\+; if \(n >= 2\) \{ v\.add\(a\); v\.add\(b\); \} \} return v; \}

/ Giảm phát hai chiều: nếu |mean − 1000| > 50 thì dịch mọi người về lại mean = 1000\. \*/ export function measureAndApplyDrift\(r: Record<string, number>\) \{ const ids = Object\.keys\(r\); if \(\!ids\.length\) return \{ newRatings: \{\}, driftApplied: 0 \}; const mean = ids\.reduce\(\(s, id\) => s \+ r\[id\], 0\) / ids\.length; if \(Math\.abs\(mean \- 1000\) <= 50\) return \{ newRatings: \{ \.\.\.r \}, driftApplied: 0 \}; const shift = 1000 \- mean; const out: Record<string, number> = \{\}; for \(const id of ids\) out\[id\] = r\[id\] \+ shift; return \{ newRatings: out, driftApplied: shift \}; \} \`\`\`

Nội dung \`tests/rating\-engine\.test\.mjs\` \(chép nguyên văn; Lead đã chạy 34/34 xanh bằng \`node \-\-experimental\-strip\-types \-\-test\`\)

\`\`\`javascript import test from 'node:test' import assert from 'node:assert/strict' import \* as E from '\.\./src/lib/rating/ratingEngine\.ts' const \{ computeMatchDeltas, countUniqueOpponents, expectedScore, calculateBlendedRating: B, applyTournamentCap, findFarmViolators, measureAndApplyDrift \} = E \{ const ok=\(n,c\)=>test\(n,\(\)=>assert\.ok\(c\)\); const P=\(id,mr,n,g=0,dev\)=>\(\{id,mr,matchesPlayed:n,mrGainFirst10:g,deviceId:dev\}\); const near=\(a,b\)=>Math\.abs\(a\-b\)<1e\-6; // 1 đơn 1000 vs 1000, ổn định, cộng đồng, thắng: \+12 let d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'community'\); ok\('đơn ngang nhau thắng \+12',near\(d\.a,12\)&&near\(d\.b,\-12\)\); // 2 tổng bằng 0 d=computeMatchDeltas\(\[P\('a',1200,3\)\],\[P\('b',900,40\)\],false,'community'\); ok\('tổng bằng 0',near\(d\.a\+d\.b,0\)\); ok\('K\_match=max → 48',near\(d\.a,\-48\*expectedScore\(1200,900\)\)\); // 3 người mới sát trần \+400: chỉ còn 20 d=computeMatchDeltas\(\[P\('a',1000,3,380\)\],\[P\('b',1000,30\)\],true,'community'\); ok\('cap người mới còn 20',near\(d\.a,20\)\); // 4 cap áp cho người thứ hai \(B mới, A cũ thua\) d=computeMatchDeltas\(\[P\('a',1000,30\)\],\[P\('b',1000,3,390\)\],false,'community'\); ok\('cap áp cho B',near\(d\.b,10\)&&d\.a<0\); // 5 farm: chỉ người vi phạm ΔR=0 \(đôi\), người kia giữ nguyên d=computeMatchDeltas\(\[P\('a1',1000,20\),P\('a2',1000,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community',new Set\(\['a2','b1'\]\)\); ok\('farm: a2,b1=0',d\.a2===0&&d\.b1===0\); ok\('farm: a1,b2 giữ',near\(d\.a1,12\)&&near\(d\.b2,\-12\)\); // 6 không NaN khi có K nhỏ d=computeMatchDeltas\(\[P\('a',1000,20\)\],\[P\('b',1000,20\)\],true,'friendly'\); ok\('không NaN',Number\.isFinite\(d\.a\)&&near\(d\.a,5\)\); // 7 thắng người mạnh hơn không bao giờ giảm let bad=0; for\(const ra of \[800,1000,1500\]\) for\(const rb of \[ra\+1,ra\+200,ra\+800\]\) \{ const x=computeMatchDeltas\(\[P\('a',ra,20\)\],\[P\('b',rb,20\)\],true,'official'\); if\(x\.a<0\) bad\+\+; \} ok\('thắng người mạnh hơn không giảm',bad===0\); // 8 đôi: tổng 4 người bằng 0 d=computeMatchDeltas\(\[P\('a1',1100,20\),P\('a2',900,20\)\],\[P\('b1',1000,20\),P\('b2',1000,20\)\],true,'community'\); ok\('đôi tổng 0',near\(d\.a1\+d\.a2\+d\.b1\+d\.b2,0\)\); // countUniqueOpponents const players=\{target:\{deviceId:'X'\},o1:\{deviceId:'A'\},o2:\{deviceId:'A'\},o3:\{deviceId:'A'\},o4:\{deviceId:'B'\},twin:\{deviceId:'X'\}\}; const m=\(id,o,extra=\{\}\)=>\(\{matchId:id,matchType:'community',date:new Date\(\),teamA:\['target'\],teamB:o,isVerified:true,isAdminVerified:true,isWalkover:false,isKZero:false,\.\.\.extra\}\); ok\('2 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\)\],'target','community',players\)===1\); ok\('3 alt cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1'\]\),m\('2',\['o2'\]\),m\('3',\['o3'\]\)\],'target','community',players\)===1\); ok\('đôi: hai đối thủ cùng máy = 1',countUniqueOpponents\(\[m\('1',\['o1','o2'\]\)\],'target','community',players\)===1\); ok\('đối thủ cùng máy với chính mình không tính',countUniqueOpponents\(\[m\('1',\['twin'\]\),m\('2',\['o4'\]\)\],'target','community',players\)===1\); ok\('V2 thiếu admin xác minh bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isAdminVerified:false\}\)\],'target','community',players\)===0\); ok\('walkover/KZero bị loại',countUniqueOpponents\(\[m\('1',\['o1'\],\{isWalkover:true\}\),m\('2',\['o4'\],\{isKZero:true\}\)\],'target','community',players\)===0\); ok\('đếm theo phía B',countUniqueOpponents\(\[\{\.\.\.m\('1',\['target'\]\),teamA:\['o4'\],teamB:\['target'\]\}\],'target','community',players\)===1\);

\} \{ const ok=\(n,c\)=>test\(n,\(\)=>assert\.ok\(c\)\); let r=B\(\{ar:1500,mr:1000,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('chỉ AR 1500: br=1500 bị chặn ≤1199',r\.br===1199&&r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:0,v3:5,uniqueV2Opponents:0\}\); ok\('5 trận V3 gỡ cả hai trần',r\.isFullyUncapped&&Math\.abs\(r\.br\-\(5/15\*1500\+10/15\*1500\)\)<1e\-9\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:3\}\); ok\('10 V2 ≥3 đối thủ: gỡ trần 1, còn trần AR\+200',r\.activeCaps\.join\(\)==='cap2\_AR\+200'\); r=B\(\{ar:1500,mr:1500,v1:0,v2:10,v3:0,uniqueV2Opponents:2\}\); ok\('10 V2 chỉ 2 đối thủ: chưa gỡ',r\.activeCaps\.length===2\); r=B\(\{ar:1500,mr:1500,v1:0,v2:20,v3:0,uniqueV2Opponents:5\}\); ok\('20 V2 ≥5 đối thủ: gỡ hết',r\.isFullyUncapped\); r=B\(\{ar:900,mr:900,v1:0,v2:0,v3:0,uniqueV2Opponents:0\}\); ok\('AR 900: trần AR\+200=1100 chặt hơn 1199',r\.br===900&&r\.activeCaps\.length===2\); const c=applyTournamentCap\(\{a:120,b:\-95,c:30\}\); ok\('trần ±80',c\.a===80&&c\.b===\-80&&c\.c===30\); const d0=new Date\('2026\-11\-10'\); const m=\(id,days,a,b,x=\{\}\)=>\(\{matchId:id,matchType:'community',date:new Date\(d0\.getTime\(\)\-days\*86400000\),teamA:\[a\],teamB:\[b\],isVerified:true,isWalkover:false,isKZero:false,\.\.\.x\}\); const cur=\{\.\.\.m\('cur',0,'a','b'\),date:d0\}; ok\('2 trận trước trong 30 ngày → vi phạm cả hai',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',5,'b','a'\)\],cur\)\.size===2\); ok\('1 trận trước: không vi phạm',findFarmViolators\(\[m\('1',3,'a','b'\)\],cur\)\.size===0\); ok\('trận ngoài 30 ngày không đếm',findFarmViolators\(\[m\('1',31,'a','b'\),m\('2',40,'a','b'\)\],cur\)\.size===0\); ok\('trận KZero/walkover/chưa xác minh không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{isKZero:true\}\),m\('2',4,'a','b',\{isWalkover:true\}\),m\('3',5,'a','b',\{isVerified:false\}\)\],cur\)\.size===0\); ok\('trận official không đếm',findFarmViolators\(\[m\('1',3,'a','b',\{matchType:'official'\}\),m\('2',4,'a','b',\{matchType:'official'\}\)\],cur\)\.size===0\); ok\('vòng bảng có admin xác minh: miễn',findFarmViolators\(\[m\('1',3,'a','b'\),m\('2',4,'a','b'\)\],\{\.\.\.cur,tournamentId:'T',tournamentPhase:'group',isAdminVerified:true\}\)\.size===0\); ok\('đôi: chỉ cặp đối đầu bị đếm',\(\(\)=>\{const dm=\(id,days\)=>\(\{\.\.\.m\(id,days,'a1','b1'\),teamA:\['a1','a2'\],teamB:\['b1','b2'\]\}\);const v=findFarmViolators\(\[dm\('1',3\),dm\('2',4\)\],\{\.\.\.cur,teamA:\['a1','a3'\],teamB:\['b1','b3'\]\}\);return v\.has\('a1'\)&&v\.has\('b1'\)&&\!v\.has\('a3'\)&&\!v\.has\('b3'\)\}\)\(\)\); let x=measureAndApplyDrift\(\{a:1100,b:1100\}\); ok\('drift \+: kéo về 1000',x\.driftApplied===\-100&&x\.newRatings\.a===1000\); x=measureAndApplyDrift\(\{a:900,b:900\}\); ok\('drift −: kéo về 1000',x\.driftApplied===100\); x=measureAndApplyDrift\(\{a:1030,b:1030\}\); ok\('trong ngưỡng 50: không đổi',x\.driftApplied===0\);

\} \`\`\`

Trả lời báo cáo E1 \(dán trước Ticket E7, cùng Khối chung\)

E1 được duyệt\. Trả lời câu hỏi của bạn:

Chưa chuyển các hằng GIẢ ĐỊNH sang \`ratingConfig\.ts\` bây giờ; việc đó thuộc ticket E1b sau E7\. Không tự làm trong E7\.

\`FIRST\_TIER\_PROGRESS\_FLOOR = 600\` ổn, giữ nguyên\.

\`color\` giữ tên chữ; ánh xạ sang design token làm khi nối giao diện\.

Ba câu hỏi từ R0: \(a\) dùng tiền tố \`tournament\-\` cho mọi collection giải đấu \(\`tournament\-events\`, \.\.\.\) như trong Ticket E7; \(b\) MR và \`deviceId\` lưu ở collection riêng tư mới \`rating\-profiles\`, không đặt ở \`users\` hay \`community\-profiles\`; \(c\) bảng bậc quiz và bảng MR hợp nhất ở ticket E1b, sau E7, không làm trong E7\.

Sửa nhỏ bắt buộc trước khi làm E7 \(bước 0\)\. Báo cáo nói \`max\` của tier\_3 là 1199 nên progress\(1199\) = 1; với BR số thực trong khoảng \(1199, 1200\) progress sẽ vượt 1\. Mở \`src/lib/rating/ratingConfig\.ts\`: kẹp \`progress\` vào \[0, 1\] cho mọi bậc \(không chỉ bậc đầu\), hoặc dùng cận trên = cận dưới của bậc kế\. Thêm test cho BR = 1199\.6, 1599\.9 và 2399\.9 \(progress trong \[0, 1\], id đúng bậc\)\. Báo cáo tách riêng kết quả bước 0 này\.

Ticket E7: Giải đấu và sự kiện, MVP M1

Điều kiện: E1 đã xong và Lead đã duyệt báo cáo\.

Mục tiêu\. Admin tạo giải cầu lông \(đơn/đôi\) bằng Payload admin, nhập kết quả, duyệt, đóng giải; hệ thống xử lý lô bằng engine E1, lưu lịch sử MR, và hồ sơ hiển thị lịch sử\. Phạm vi M1: cầu lông đơn và đôi; bóng đá chưa làm\.

Tránh trùng tên \(R0 phát hiện\): repo đã có collection \`events\` \(khuyến mãi của shop\)\. Mọi collection mới dùng tiền tố \`tournament\-\`; không sửa \`events\`, không sửa \`src/app/\(frontend\)/quan\-tri/su\-kien/\`\.

Được tạo \(5 collection \+ 1 riêng tư\): \`tournament\-events\`, \`tournament\-registrations\`, \`tournament\-matches\`, \`tournament\-results\`, \`match\-rating\-history\`, và \`rating\-profiles\` \(riêng tư\)\. Sửa \`src/payload\.config\.ts\` chỉ để đăng ký các collection này vào mảng \`collections\`\. Thêm một khối "Lịch sử MR" ở trang hồ sơ người chơi \(chỗ cụ thể: bạn đề xuất dựa trên \`tai\-khoan/AccountSportDna\.tsx\`, hỏi Lead trước khi sửa file này\)\.

Cấm động vào: \`scenario\-engine\.ts\`, \`ScenarioCourt\.tsx\`, \`sportdna\.ts\`, \`ratingEngine\.ts\` \(chỉ import, cần đổi thì hỏi Lead\), \`events\` \(khuyến mãi\), \`src/app/\(payload\)/\`, \`community\-profiles\` \(không thêm trường nào vào đây, vì collection này ai cũng đọc được\), phiếu đánh giá bóng đá, audit log\.

\`rating\-profiles\` \(riêng tư, quyết định 17\)\. Mỗi người chơi một bản ghi: \`user\` \(quan hệ, duy nhất\), \`mr\` \(mặc định 1000\), \`matchesPlayed\`, \`mrGainFirst10\`, \`deviceId\`, \`possibleAlt\`, \`isPublic\` \(mặc định false\)\. Quyền đọc: chính chủ và admin; quyền ghi: chỉ hệ thống/admin \(không cho client tự sửa\)\. Hiển thị công khai tên, bậc, MR chỉ khi \`isPublic = true\`, và lấy qua một endpoint/hàm server trả về đúng các trường được phép, không lộ \`deviceId\`\.

Trường chính \(chọn kiểu theo quy ước Payload của repo\):

\`tournament\-events\`: tên, môn \(badminton\), thể thức \(singles/doubles\), loại \(\`friendly\` | \`community\` | \`official\`\), ngày, địa điểm, trạng thái, người tạo, \`isDemo\`, \`processedAt\`, \`processingLock\`\.

\`tournament\-registrations\`: sự kiện, người chơi \(đôi: hai người\), trạng thái\.

\`tournament\-matches\`: sự kiện, \`teamA\[\]\`, \`teamB\[\]\` \(1 hoặc 2 người\), giai đoạn \(\`group\` | \`knockout\` | \`none\`\), điểm hai bên, \`enteredBy\`, \`confirmedBy\`, \`approvedBy\`, \`isWalkover\`, \`isDisputed\`\.

\`tournament\-results\`: sự kiện, người chơi, hạng cuối, số thắng/thua\.

\`match\-rating\-history\`: người chơi, sự kiện, trận, \`mrBefore\`, \`mrAfter\`, \`delta\`, \`kMatch\`, lý do \(\`normal\` | \`farm\_zero\` | \`growth\_cap\` | \`tournament\_cap\` | \`reversal\`\), \`createdAt\`\.

Vòng đời \(6 trạng thái\): \`draft\` → \`registration\_open\` → \`in\_progress\` → \`pending\_approval\` → \`closed\_processed\`; và \`cancelled\` từ mọi trạng thái trước \`closed\_processed\`\. Chỉ admin chuyển \`pending\_approval\` → \`closed\_processed\`\. Chuyển sai thứ tự phải bị từ chối\.

Loại sự kiện → K và mức xác minh: \`friendly\` = V1 \(K 10, hai người chơi cùng xác nhận\), \`community\` = V2 \(K 24, cần admin xác minh\), \`official\` = V3 \(K 32, admin duyệt; sinh bản ghi AP theo luật AP hiện có nhưng không cộng Elo từ AP\)\.

Xử lý khi đóng giải \(chạy phía server, không chạy ở client\):

Chỉ lấy trận đã duyệt, không \`isWalkover\`, không \`isDisputed\`\.

Xử lý theo thứ tự thời gian của trận; kết quả không phụ thuộc thứ tự lưu trong DB\.

Mỗi trận: \`findFarmViolators\` \(có sẵn trong engine\), rồi \`computeMatchDeltas\`; cuối giải áp \`applyTournamentCap\` theo từng người; ghi \`match\-rating\-history\`; cập nhật \`rating\-profiles\`\.

Idempotency: đóng giải lần hai không cộng điểm lần nữa\. Dùng \`processingLock\` và \`processedAt\` trên sự kiện \(kiểm và đặt cờ trong một thao tác ghi có điều kiện\)\. Nếu Payload hỗ trợ transaction trong môi trường này thì bọc cả lô trong một transaction, và báo Lead là có hay không\.

Hồ sơ demo \(\`community\-profiles\.demo = true\`\) và shop \(\`kind = "shop"\`\) không được đăng ký, không có MR\.

Hệ thống chưa có script seed; nếu cần dữ liệu thử thì tạo trong test, hoặc tạo bản ghi gắn \`isDemo = true\` và hiện chữ "minh họa" trên giao diện\.

Ngoại lệ: kết quả tranh chấp \(giữ chờ, không tính\), nhập nhầm \(admin sửa trước khi đóng giải; sau khi đóng thì ghi bản ghi lịch sử lý do \`reversal\`, không xóa bản ghi cũ\), người rút lui \(giữ trận đã đấu, vô hiệu trận chưa đấu\), sự kiện hủy sau khi có kết quả \(không xử lý rating\)\.

Nghiệm thu bắt buộc \(viết test bằng \`node:test\`, không cần DB thật nếu tách được phần xử lý lô thành hàm thuần nhận dữ liệu vào/ra\):

Giải 4 người đơn vòng tròn: tổng ΔMR toàn giải bằng 0 \(nếu khác 0 vì trần, nêu rõ nguồn\)\.

Đóng giải hai lần: MR không đổi ở lần hai\.

Hai tài khoản cùng \`deviceId\` không làm tăng số đối thủ khác nhau\.

Chuyển trạng thái sai thứ tự bị từ chối\.

Một người dùng khác \(không phải chủ, không phải admin\) không đọc được \`rating\-profiles\` của người khác\.

Dán đầu ra thật của test, \`pnpm exec tsc \-\-noEmit\`, \`pnpm build\`\.

Câu hỏi trong báo cáo: Payload ở đây hỗ trợ transaction không; chỗ nào trong \`tai\-khoan/AccountSportDna\.tsx\` hợp lý để đặt khối "Lịch sử MR"\.

## <a id="_cwn8xsuxy1t4"></a>T7\#1 \(25,760 ký tự\)

SPORTDNA — MASTER HANDOFF v1\.3\.3 FINAL FOR FIGMA AI

Version: v1\.3\.3 FINAL

Recipient: Figma AI

Date: 06/11/2026

Scope: Badminton only \(football cut\)

Status: UI AUTHORIZED — Business logic HOLD

Đây là bản duy nhất, đầy đủ, không cần merge gì thêm\. Middleman copy nguyên khối và gửi Figma\.

⚡ 0\. INSTRUCTIONS

Task Status

Đọc và phân tích tài liệu ✅ GO

Thiết kế UI skeleton, navigation, component library ✅ GO

Vẽ mockup clickable Scenario Court, CP Profile, Equipment Fit ✅ GO

Build toàn bộ màn hình còn lại ✅ GO

Implement business logic \(scoring, ELO, CP engine\) ⏸️ HOLD

Thay đổi công thức S, ELO, CP, Equipment Fit ❌ FORBIDDEN

Placeholder convention: Dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\`, \`\{\{D\}\}\`, \`\{\{fitScore\}\}\`, \`\{\{coverage\}\}\`, \`\{\{base\_3x3\}\}\` cho giá trị chưa finalize\. Không hardcode số\.

Nguyên tắc xuyên suốt: \*Thà UI honest mà xấu, còn hơn UI đẹp mà bịa số liệu\.\*

1\. PRODUCT OVERVIEW

SportDNA = nền tảng thể thao với 5 trục độc lập \(không gộp thành điểm tổng\):

Trục Ý nghĩa Visual identity

Skill Rating Năng lực thể thao \(ELO\) Xanh dương primary

Evidence Level Mức xác thực V1/V2/V3 \(\+ LEGACY\) Tím

Community Reputation \(CP\) Uy tín đóng góp Vàng gold

Achievement Thành tích thi đấu Đỏ tươi \+ icon cúp

Equipment Fit Độ phù hợp thiết bị Xanh lá tươi

2\. SCOPE FINAL

Hạng mục Quyết định

Môn thể thao CHỈ CẦU LÔNG \(football cut khỏi v1\.3\.3, ẩn route, không xóa code\)

Loại đánh Đơn \(singles\) only

Audience Toàn bộ trình độ \(D range \[900, 1500\]\)

Scenario pool 20 \(10 tình huống × 2 biến thể\)

Assessment modes Quick \(8\-10 câu\) \+ Deep \(đúng 20 câu\) \+ Retest \(10 câu, priority chain\)

3\. HỆ TỌA ĐỘ SÂN \(FINAL\)

3\.1\. Convention duy nhất

Trục Range Ý nghĩa

\`x\` \[0, 1\] 0 = biên trái \(screen\), 1 = biên phải \(screen\)

\`y\` \[0, 1\] 0 = baseline đối thủ \(screen TOP\), 0\.5 = lưới, 1 = baseline người chơi \(screen BOTTOM\)

Vùng sân:

Opponent's half: \`y ∈ \[0, 0\.5\]\` \(screen top\)

Player's half: \`y ∈ \(0\.5, 1\]\` \(screen bottom\)

Net line: \`y = 0\.5\`

Player faces UP, Opponent faces DOWN

3\.2\. Quy đổi tọa độ → mét \(FINAL — sửa P0\-Q9\)

Full court = 13\.4m, nửa sân = 6\.7m:

\`\`\` x\_meter = x × 5\.18 y\_meter\_from\_opponent\_baseline = y × 13\.4 \`\`\`

y y\_meter \(đúng\)

0\.00 0\.00 m \(baseline đối thủ\)

0\.125 1\.675 m

0\.275 3\.685 m

0\.352 4\.72 m \(vạch giao cầu ngắn\)

0\.50 6\.70 m \(lưới\)

1\.00 13\.4 m \(baseline người chơi\)

Target depth d \(DERIVED, dùng cho scoring\):

d=\(0\.5\-y\)2

d = 0 sát lưới đối thủ \(y=0\.5\)

d = 1 baseline đối thủ \(y=0\)

3\.3\. targetZones JSON \(3×3 grid chuẩn\)

\`\`\`json "targetZones": \{ "net\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.40, 0\.50\]\}, "net\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.40, 0\.50\]\}, "net\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.40, 0\.50\]\}, "mid\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.25, 0\.35\]\}, "mid\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.25, 0\.35\]\}, "mid\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.25, 0\.35\]\}, "back\_left": \{"x": \[0\.00, 0\.33\], "y": \[0\.05, 0\.15\]\}, "back\_center": \{"x": \[0\.33, 0\.67\], "y": \[0\.05, 0\.15\]\}, "back\_right": \{"x": \[0\.67, 1\.00\], "y": \[0\.05, 0\.15\]\} \} \`\`\`

4\. NGÂN HÀNG 20 SCENARIO

4\.1\. Coverage matrix \(FINAL — sửa M9\)

Nhóm năng lực Scenario phủ

Giao cầu B04, B05

Tấn công B01, B08, B10

Phòng thủ B02, B06, B09

Điều cầu B03, B07

Di chuyển B03, B09

Đọc tình huống B07, B10

Chuyển trạng thái B08, B09

4\.2\. Danh mục

Mã Tên rally\_phase Năng lực chính

B01 Tấn công cầu bổng giữa sân attacking Chọn điểm rơi

B02 Phòng thủ smash vào thân defending Block / phản tạt

B03 Xử lý cầu sát lưới neutral Net shot

B04 Nhận giao cầu neutral Return serve

B05 Chọn phương án giao cầu neutral Serve selection

B06 Bị ép cuối sân cần thoát defending Defensive positioning

B07 Drive ngang đổi hướng neutral Drive control

B08 Chuyển phòng thủ → tấn công attacking Transition \#1

B09 Phòng thủ biên trái tay → phản công defending→attacking Transition \#2

B10 Kết thúc điểm khi đối thủ mất thăng bằng attacking Finish

5\. CÔNG THỨC CHẤM ĐIỂM

S=ATR

Biến Ý nghĩa Range

A Action Fit \[0\.20, 1\.00\]\. Floor = 0\.20\. Chỉ A=0 khi rule violation \(serve action ngoài 3 loại serve\)

T Tactical = base\_3x3 × context\_multiplier \[0, 1\.2\]

R Line Proximity \{1\.0, 0\.93, 0\.8\}

5\.1\. A scale

A Ý nghĩa

1\.00 Rất phù hợp

0\.80 Tốt

0\.60 Chấp nhận được

0\.40 Ít hiệu quả

0\.20 Bất lợi nhưng khả thi

0\.00 Rule violation ONLY

5\.2\. T — context\_multiplier \(FINAL — sửa P1\-Q8\)

\`\`\`js const MIN\_MOVEMENT = 0\.02; // normalized units per 0\.5s const magnitude = Math\.hypot\(opponent\.movement\[0\], opponent\.movement\[1\]\);

if \(magnitude < MIN\_MOVEMENT\) \{ multiplier = 1\.0; // đứng yên \} else \{ angle = angleBetween\(opponent\.movement, vector\_to\_target\_zone\_center\); if \(angle < 30°\) multiplier = 0\.7; // về phía target else if \(angle > 150°\) multiplier = 1\.2; // ra xa target else multiplier = 1\.0; \} \`\`\`

Lưu ý: \`movement\` vector = displacement over next 0\.5s\. \`target\_zone\.center\` = center của zone click, không phải click point\.

5\.3\. R — Line Proximity \(FINAL — sửa P0\-Q9\)

Danh sách vạch phụ thuộc loại cú đánh:

Non\-serve \(smash/drop/clear/drive/net\_shot/lift/block/push\): \`\`\` distances = \[ x\_meter, // left sideline 5\.18 \- x\_meter, // right sideline y\_meter\_from\_opponent\_baseline // baseline \] \`\`\`

Serve \(serve\_short/flick/long\): \`\`\` distances = \[ x\_meter, // left sideline 5\.18 \- x\_meter, // right sideline y\_meter\_from\_opponent\_baseline, // baseline |y\_meter \- 4\.72|, // short service line |x\_meter \- 2\.59| // center line \] \`\`\`

Loại bỏ lưới khỏi R\. Cầu chạm lưới = S = 0 ngay, không phải R thấp\.

\`\`\` min\_distance = min\(distances\) R = 1\.0 if min\_distance >= 0\.5m R = 0\.93 if 0\.2m <= min\_distance < 0\.5m R = 0\.80 if min\_distance < 0\.2m \`\`\`

Figma: Không hiển thị R\. Derived metric\.

6\. LUẬT GIAO CẦU B05 \(FINAL — sửa P0\-Q5\)

⚠️ CRITICAL: Cross\-court direction

Player faces UP, Opponent faces DOWN → Right của player ≠ Right của opponent trong screen coordinates\.

Ô giao player \(screen x\) Ô đối thủ nhắm \(screen x\)

Right service court, x ∈ \[0\.5, 1\] x ∈ \[0, 0\.5\] \(screen LEFT\)

Left service court, x ∈ \[0, 0\.5\] x ∈ \[0\.5, 1\] \(screen RIGHT\)

6\.1\. Serve target ranges

Loại giao targetDepthRange d Tương đương y

serve\_short \[0\.30, 0\.45\] \[0\.275, 0\.350\]

serve\_flick \[0\.45, 0\.75\] \[0\.125, 0\.275\]

serve\_long \[0\.75, 1\.00\] \[0\.000, 0\.125\]

6\.2\. B05 JSON \(FINAL\)

\`\`\`json \{ "scenarioId": "BD\-B05\-V1\-\.\.\.", "playerServicePosition": "right", "targetZones": \{ "serve\_short": \{ "x": \[0\.00, 0\.50\], "y": \[0\.275, 0\.350\] \}, "serve\_flick": \{ "x": \[0\.00, 0\.50\], "y": \[0\.125, 0\.275\] \}, "serve\_long": \{ "x": \[0\.00, 0\.50\], "y": \[0\.000, 0\.125\] \} \} \} \`\`\`

Note: \`x range\` = opposite half của player\. Nếu \`playerServicePosition = "left"\` → x range = \[0\.50, 1\.00\]\.

6\.3\. Rules

Click ngoài x\-half chéo → T = 0, S = 0\.

Click ngoài y\-range của serve type → T = 0, S = 0\.

Giao cầu chạm lưới → S = 0\.

Hardcode \`playerServicePosition: "right"\` cho B05 v1\.3\.3\. Score\-based rotation defer v2\.

6\.4\. UI

Overlay sáng nửa sân chéo \(opposite x\-half so với player\)\.

Label overlay: \*"Vùng gợi ý \(SportDNA\)"\* — KHÔNG dùng "BWF", "hợp lệ"\.

Toast sai: \*"Giao cầu phải chéo ô\. Điểm không được tính\."\*

Tooltip: \*"Giao chéo — bắt buộc \(BWF 9\.1\.3\)"\* — chỉ trong tooltip, không trong overlay\.

⚠️ DISCLAIMER \(bắt buộc hiển thị UI, không được lược bỏ\)

\*"Vùng điểm rơi gợi ý được thiết kế cho SportDNA assessment\. BWF chỉ quy định cầu phải qua vạch giao ngắn 1\.98m và rơi trong ô giao chéo — không quy định dải cụ thể cho short/long/flick\. Đây là targetZone của hệ thống đánh giá, không phải luật thi đấu\."\*

"BWF" chỉ xuất hiện trong: ServeDisclaimer \+ tooltip rule reference\. KHÔNG xuất hiện trong overlay, toast, error message, badge\.

7\. ĐỘ KHÓ D

D=900\+roundi=17wisi

7\.1\. Định nghĩa sᵢ \(BẮT BUỘC\)

Property Value

Range \`sᵢ ∈ \[0, 100\]\`, integer

Direction Higher = harder

0 Không áp lực

50 Trung bình

100 Áp lực tối đa

7\.2\. Trọng số wᵢ

\# Tiêu chí wᵢ

1 Movement demand 1\.2

2 Time pressure 1\.0

3 Stamina cost 0\.6

4 Opponent motion 0\.9

5 Shuttle difficulty 0\.8

6 Court constraint 0\.7

7 Decision complexity 0\.8

Σwᵢ = 6, D range = \[900, 1500\]\.

7\.3\. Phân bổ 20 scenario \(BẮT BUỘC\)

Phân khúc D range Số lượng

Dễ \[900, 1100\) 5 scenario

Trung bình \[1100, 1300\) 10 scenario

Khó \[1300, 1500\] 5 scenario

ChatGPT đang finalize\. Figma dùng \`\{\{s1\}\}\`\.\.\.\`\{\{s7\}\}\` và \`\{\{D\}\}\`\.

7\.4\. D dùng cho 2 mục đích

Chọn độ khó scenario theo trình độ user

Feed vào ELO: $E\_i = dfrac\{1\}\{1 \+ 10^\{\(D\_i \- R\_i\)/400\}\}$

8\. ELO \(không đổi v6\.1\)

Mỗi kỹ năng bắt đầu 1000

Update: Rnew=Rold\+K\(Si\-Ei\)

K: Quick = 16, Deep = 24, Retest = 16

Tách rating: \`tactical\_rating\`, \`shot\_selection\_rating\`, \`target\_selection\_rating\`, \`defensive\_reading\_rating\`

KHÔNG dùng: response time, CP, promotion, giá sản phẩm

9\. EVIDENCE LEVEL \(FINAL — sửa P0\-Q13\)

9\.1\. 4 levels \(KHÔNG có V0\)

Level Badge Tooltip

SELF\_REPORTED\_LEGACY Xám, "Tự khai báo \(cũ\)" \*"Hoàn thành assessment để nâng lên V1"\*

V1 Xanh dương, "Đã đánh giá" \*"Đã hoàn thành SportDNA assessment"\*

V2 Tím, "Cộng đồng xác nhận"

V3 Vàng gold, "Chính thức"

9\.2\. Schema

\`\`\`json "skillEvidence": \{ "level": "SELF\_REPORTED\_LEGACY" | "V1" | "V2" | "V3", "legacy\_self\_reported": boolean, "verifiedAt": "date" | null, "assessedAt": "date" | null \} \`\`\`

9\.3\. Migration \(FINAL\)

\`\`\` On first login after v1\.3\.3 deploy: if skillEvidence\.level === "V0": skillEvidence\.level = "SELF\_REPORTED\_LEGACY" skillEvidence\.legacy\_self\_reported = true

On assessment completion: if skillEvidence\.level === "SELF\_REPORTED\_LEGACY": skillEvidence\.level = "V1" skillEvidence\.legacy\_self\_reported = false skillEvidence\.assessedAt = now\(\) \`\`\`

KHÔNG tự nâng V0 → V1 mà không qua assessment\.

9\.4\. CP KHÔNG phải evidence level\.

10\. COMMUNITY REPUTATION \(CP\) — FINAL

10\.1\. Ba bucket độc lập

Bucket Nguồn Decay UI

\`pendingContribution\` Events PENDING/NEEDS\_REVIEW Không Dòng phụ mờ

\`lifetimeContribution\` Events APPROVED chưa revoke Không Badge Lifetime

\`currentReputation\` Events APPROVED có decay Có Score chính

10\.2\. Tier thresholds \(PROVISIONAL\)

Tier ID Score

NEWCOMER 0\-49

ACTIVE\_MEMBER 50\-149

TRUSTED\_MEMBER 150\-349

CONTRIBUTOR 350\-649

PILLAR 650\+

10\.3\. Lifetime Peak Tier \(tách khỏi lifetimeContribution\)

Field Khi nào giảm

\`lifetimeContribution\` User tự xóa bài, revoke

\`lifetimePeakTier\` CHỈ giảm khi CONFIRMED\_VIOLATION / FRAUD / SPAM

\`currentReputation\` Decay tự nhiên

Logic: \`\`\`

Khởi tạo = NEWCOMER

Event APPROVED → peakCandidate = resolveTier\(lifetimeContribution\) if peakCandidate\.rank > lifetimePeakTier\.rank: lifetimePeakTier = peakCandidate

Event REVOKE do VIOLATION/FRAUD/SPAM: recompute = resolveTier\(lifetimeContribution\) lifetimePeakTier = min\(currentPeakTier, recompute\)

User tự xóa bài \(không vi phạm\): lifetimeContribution giảm, lifetimePeakTier GIỮ NGUYÊN \`\`\`

10\.4\. Event lifecycle

\`\`\` PENDING → APPROVED / NEEDS\_REVIEW / REJECTED / REVOKED \`\`\`

Trạng thái Bucket

PENDING pendingContribution

APPROVED lifetimeContribution \+ currentReputation

NEEDS\_REVIEW pendingContribution \(không move\)

REJECTED Không tính

REVOKED Không tính

10\.5\. Auto\-approve \(FINAL — sửa Q12\)

\`\`\` Scheduled daily job: for each event PENDING > 7 days: if no flag AND no user report: status = APPROVED move to lifetimeContribution log autoApprovedAt, trigger: "7\_day\_timeout" else: status = NEEDS\_REVIEW \`\`\`

Late flag handling: \`\`\` Event APPROVED → user report / fraud detection later: status: APPROVED → NEEDS\_REVIEW Không xóa khỏi lifetimeContribution ngay Reviewer: clear → APPROVED | confirm fraud → REVOKED \+ trừ \+ hạ peak tier \`\`\`

Không khóa vĩnh viễn APPROVED\.

10\.6\. Decay

Event type Half\-life

Posts 365 ngày

Interactions 180 ngày

P\(t\)=P02\-t/H

10\.7\. Deletion / revocation

User tự xóa: thu hồi điểm, KHÔNG hạ peak tier

CONFIRMED\_VIOLATION/FRAUD/SPAM: thu hồi điểm VÀ hạ peak tier

Xóa khi đang PENDING/NEEDS\_REVIEW: xóa khỏi pending ngay, không chạm lifetime

10\.8\. Event ledger

APPROVED / REVOKED: giữ vĩnh viễn

REJECTED: purge sau 90 ngày

Event ID unique, audit trail

10\.9\. UI profile

Current Reputation \(primary\):

CP score

Current Tier \(hiển thị chính\)

Lifetime Recognition \(secondary\):

\`lifetimeContribution\` \(số\)

\`lifetimePeakTier\` \(badge phụ, tooltip \*"Danh dự lịch sử"\*\)

\`lifetimeTierRevokedAt \!== null\` → tooltip \*"Danh dự đã bị điều chỉnh do vi phạm"\*

Pending:

\`pendingContribution > 0\` → \*"\+15 đang chờ duyệt"\* \(mờ, phụ\)

KHÔNG hiển thị \`pending \+ lifetime\` như pending đã duyệt

NEEDS\_REVIEW → tooltip \*"Đang được xem xét\. Chưa cộng vào uy tín\."\*

Shop: Không có CP cấp cửa hàng\. Chủ shop có CP cá nhân trên profile\.

Demo: Không tạo CP thật, không hiển thị\.

11\. EQUIPMENT FIT — CẦU LÔNG \(FINAL\)

11\.1\. 4 module độc lập

\`\`\` ProductDataValidator | ConfigurationValidator | EquipmentFitEngine | CommercialRankingEngine \`\`\`

Khuyến mãi, giá, quảng cáo KHÔNG ảnh hưởng Fit Score\.

11\.2\. EquipmentFitResult JSON \(FINAL — sửa M4\)

\`\`\`json \{ "status": "calculated" | "insufficient\_data", "fitScore": 78 | null, "dataCoverage": 0\.50, "availableCriteria": 2, "totalCriteria": 4, "criticalMissing": \["balance"\], "missingCriteria": \["balance", "compatible\_tension"\], "confidence": "low", "dataSourceQuality": \{ "manufacturerVerified": 1, "sellerProvided": 1, "inferred": 0, "unknown": 2 \} \} \`\`\`

11\.3\. Coverage rules

Core criteria = 4 \(KHÔNG có playing style\):

Criteria Core? Count coverage?

Weight ✅ ✅

Shaft stiffness ✅ ✅

Balance point ✅ ✅

Compatible tension ✅ ✅

Playing style match ❌ ❌ \(user preference\)

11\.4\. Confidence rules \(FINAL\)

\`\`\` coverage\_confidence: coverage >= 0\.9 → high coverage >= 0\.7 → medium coverage >= 0\.5 → low coverage < 0\.5 → insufficient\_data

critical\_confidence: criticalAvailable == 3 → high criticalAvailable == 2 → low criticalAvailable < 2 → insufficient\_data

confidence = min\(coverage\_confidence, critical\_confidence\) \`\`\`

11\.5\. Critical guard

\`\`\` criticalAvailable = count\(weight, stiffness, balance có data\)

if criticalAvailable < 2: → insufficient\_data, fitScore = null, ẩn khỏi list else if criticalAvailable == 2: → status = "calculated", confidence = "low" → banner: "Thiếu 1 tiêu chí cốt lõi" → rank CUỐI danh sách \`\`\`

11\.6\. Trọng số vợt \(FINAL — sửa M5\)

Full \(5 criteria\):

Tiêu chí Weight

Weight 22%

Shaft stiffness 22%

Balance point 22%

Compatible tension 17%

Playing style match 17%

Total 100%

Khi thiếu playing\_style \(4 criteria\):

Tiêu chí Weight

Weight 26\.51%

Shaft stiffness 26\.51%

Balance point 26\.51%

Compatible tension 20\.48%

Total 100%

Công thức: \`w'\_i = w\_i / 83 × 100\`\. KHÔNG làm tròn gây sai tổng\.

Tag UI: \*"Trọng số đang ở giai đoạn thử nghiệm, sẽ hiệu chỉnh sau beta\."\*

11\.7\. Budget — CHỈ filter

Budget không xuất hiện trong Fit weight\.

\`\`\` Step 1: User chọn budget range → filter products Step 2: Tính Fit Score \(chỉ 5 technical criteria\) Step 3: Rank theo Fit Score \(không theo giá\) \`\`\`

Range Note

Dưới 1 triệu Bình dân

1\-2 triệu DEFAULT

2\-5 triệu Trung cấp

Trên 5 triệu Cao cấp

UI copy bắt buộc: \*"Ngân sách được dùng để lọc sản phẩm\. Điểm phù hợp được tính dựa trên thông số kỹ thuật, không phụ thuộc giá\."\*

11\.8\. Data source quality

\`\`\` MANUFACTURER\_VERIFIED | SELLER\_PROVIDED | INFERRED | UNKNOWN \`\`\`

UI phân biệt\. Không hiển thị 100% coverage như 100% chính xác\.

11\.9\. Configuration validation \(FINAL — sửa M6\)

Config error độc lập với Fit Score:

Case Fit \`compatible\_tension\` score ConfigurationValidator

User chưa chọn tension, product max phù hợp Full score Valid

User chọn tension ≤ max Full score Valid

User chọn tension > max Full score \(không ảnh hưởng\) ERROR

Error code: \`TENSION\_EXCEEDS\_MANUFACTURER\_LIMIT\`

UI: Fit Score vẫn hiển thị bình thường \(VD: 78%\)\. Banner đỏ riêng: \*"Cấu hình không hợp lệ: căng 35 lbs vượt mức tối đa 30 lbs của vợt này\."\*

KHÔNG gán Fit = 0\.

11\.10\. Football

CẮT khỏi v1\.3\.3\. Ẩn toàn bộ UI football khỏi SportDNA navigation\. Route \`/sportdna/football/\*\` → redirect \`/sportdna\` với banner \*"Bóng đá đang được phát triển\."\* Data giữ nguyên DB\. Mở lại khi có reviewer chuyên môn\.

12\. RADAR 8 TRỤC \(FINAL — sửa P1\-Q10\)

12\.1\. Mapping honest

\# Radar axis Source rating Confidence

1 Sức mạnh — insufficient\_data

2 Tốc độ — insufficient\_data

3 Phản xạ \`defensive\_reading\_rating\` low \(không tương đương\)

4 Kỹ thuật \`shot\_selection\_rating\` low \(không tương đương\)

5 Kiểm soát \`target\_selection\_rating\` low \(không tương đương\)

6 Bền bỉ — insufficient\_data

7 Chiến thuật \`tactical\_rating\` medium

8 Cân bằng — insufficient\_data

12\.2\. UI requirement

Radar hiển thị 8 trục

4 trục có data → chấm solid \+ polygon kết nối

4 trục không data → chấm mờ ở tâm \+ label \*"Chưa đủ dữ liệu"\* \+ icon đồng hồ cát

Polygon chỉ vẽ trên 4 trục có data \(tứ giác lệch\)

KHÔNG giả lập giá trị để polygon đầy đủ

Nguyên tắc: Thà radar xấu mà honest, còn hơn radar đẹp mà bịa\.

13\. ASSESSMENT MODES \(FINAL — sửa P0\-S1\)

13\.1\. Mode table

Mode Số câu Sample logic

Quick 8\-10 Greedy set cover \(xem 13\.2\)

Deep Đúng 20 Full pool, không lặp

Retest 10 Priority chain \(xem 13\.3\)

13\.2\. Quick sampling algorithm \(FINAL — sửa P1\-S1\)

\`\`\`python groups = \{serve, attack, defense, rally, movement, reading, transition\} selected = \[\] uncovered = groups\.copy\(\)

Greedy set cover

while len\(selected\) < min\_target and uncovered: best = argmax\( scenario covers most uncovered groups, tie\_break=random \) selected\.append\(best\) uncovered \-= groups\_of\(best\)

Fill remaining slots randomly

while len\(selected\) < target: selected\.append\(random from unselected\) \`\`\`

13\.3\. Retest priority chain \(FINAL — sửa P0\-S1\)

\`\`\` Priority 1: Template \+ variant KHÔNG dùng trong 30 ngày Priority 2: Template KHÔNG dùng, variant lặp với seed mới \(state khác\) Priority 3: Cho phép lặp hoàn toàn, generate seed mới \`\`\`

Weak skill selection:

6 câu từ weak skills \(rating confidence < medium OR variance > 150 OR chưa làm 60\+ ngày\)

4 câu random

BỎ rule tuyệt đối "cấm lặp 30 ngày"\. Ưu tiên không lặp, fallback khi hết pool\.

14\. JSON CONTRACTS

14\.1\. Scenario JSON

\`\`\`json \{ "scenarioId": "BD\-B01\-V1\-deep\-seed1001", "variant": "deep", "gameMode": "singles", "rallyPhase": "attacking", "state": \{ "player": \{"x": 0\.22, "y": 0\.78, "stamina": 0\.80\}, "opponent": \{"x": 0\.75, "y": 0\.15, "movement": \[\-0\.05, 0\.10\]\}, "shuttle": \{"x": 0\.24, "y": 0\.68, "height": "high", "speed": "medium"\} \}, "availableActions": \["smash", "drop", "clear", "drive"\], "actionFit": \{ "smash": 0\.80, "drop": 1\.00, "clear": 0\.60, "drive": 0\.20 \}, "trajectory": \{"height": "high", "speed": "medium"\}, "difficulty": "\{\{D\}\}", "targetZones": \{ /\* 3×3 grid, xem Section 3\.3 \*/ \} \} \`\`\`

14\.2\. CP Profile JSON

\`\`\`json \{ "pendingContribution": 15, "lifetimeContribution": 320, "currentScore": 180, "currentTier": "TRUSTED\_MEMBER", "lifetimePeakTier": "CONTRIBUTOR", "lifetimeTierRevokedAt": null, "enabled": true, "recentEvents": \[ \{"eventId": "e1", "type": "TIPS\_POST", "status": "APPROVED", "points": 5, "createdAt": "\.\.\."\}, \{"eventId": "e2", "type": "LIKE\_RECEIVED", "status": "PENDING", "points": 0\.2, "createdAt": "\.\.\."\} \] \} \`\`\`

14\.3\. Equipment Fit JSON

\(Xem Section 11\.2\)

15\. DANH SÁCH MÀN HÌNH

15\.1\. Hub

\`\`\` SportDNA Hub ├─ Quick \(8\-10 câu\) ├─ Deep \(đúng 20 câu\) ├─ Retest \(10 câu\) └─ Hồ sơ \`\`\`

Note: Không có "Scenario" như mode riêng\. Scenario Court là shared component dùng bởi cả 3 mode\.

15\.2\. Assessment Flow

Màn Chức năng

Hub SportDNA Entry point, 3 mode \+ profile

Scenario Court Shared cho Quick/Deep/Retest

Assessment Result Kết quả \+ radar \+ tier \+ evidence

15\.3\. Profile

Màn Chức năng

Profile Overview 5 trục riêng

Skill Detail ELO \+ radar 8 trục \(4 insufficient\)

Reputation Detail Current Tier \(primary\) \+ Lifetime Peak \(secondary\) \+ pending line

Reputation History Event ledger

Achievement List Danh sách thành tích

Equipment Fit Summary Top 3\-5 sản phẩm

15\.4\. Equipment

Màn Chức năng

Product Listing Filter budget \+ Fit Score \+ critical warning

Product Detail Spec table \+ coverage \+ source \+ critical banner

Configuration Editor Căng cước, validate

Fit Explanation Lý do fit/không fit

15\.5\. Community

Màn Chức năng

Community Feed Bài viết \+ 2 badges

Post Detail Nội dung \+ tác giả badges

Post Composer 6 chủ đề

Moderation Status Pending/Approved/Needs\_Review/Rejected/Revoked

15\.6\. Settings

Màn Chức năng

Privacy Controls Toggle badges

Budget Preferences Default budget range

16\. COMPONENT INVENTORY

Assessment

\`CourtCanvas\` — SVG top\-down, \`y=0\` = top, \`y=1\` = bottom

\`PlayerMarker\` — chấm xanh \(bottom half\)

\`OpponentMarker\` — chấm đỏ \(top half\) \+ movement vector

\`ShuttleMarker\` — icon cầu \+ direction

\`TargetZone\` — 9 clickable zones

\`ActionSelector\` — Smash/Drop/Clear/Drive/Net\_shot/Lift/Block/Push/Serve\_\*

\`ServeTargetOverlay\` — vùng gợi ý sáng, CHỈ sáng nửa sân chéo, label \*"Vùng gợi ý \(SportDNA\)"\*

\`ContextIndicator\` — chỉ hiện sau khi confirm, không leak trước

\`ScenarioProgress\`

\`AssessmentResult\`

\`ServeDisclaimer\` — collapsible, chứa text có "BWF"

Profile

\`SkillRatingCard\`

\`SkillRadar\` — 8 trục, 4 insufficient\_data hiển thị mờ

\`EvidenceLevelBadge\` — 4 variants \(LEGACY/V1/V2/V3\)

\`CurrentReputationCard\` — primary

\`LifetimePeakBadge\` — secondary \+ tooltip

\`LifetimeContributionStat\` — số riêng

\`PendingContributionLine\` — mờ, phụ

\`AchievementList\`

\`EquipmentFitSummary\`

Equipment

\`ProductCard\` — Fit \+ coverage \+ critical warning icon

\`CoreSpecificationTable\`

\`DataCoverageIndicator\`

\`DataSourceLabel\` — 4 chips

\`CriticalMissingBanner\` — vàng cam viền

\`ConfigurationWarning\` — đỏ đậm

\`BudgetFilter\` — 4 chips

\`FitScoreDisplay\` — có confidence badge

Community

\`CommunityPostCard\` — 2 badges

\`ContributionIndicator\`

\`PendingContributionState\`

\`ReputationHistory\` — timeline

\`ModerationStatusBadge\` — 5 trạng thái

17\. UI REQUIREMENTS

17\.1\. 5 trục visual identity

Không dùng chung màu/icon/style\. Xem Section 1\.

17\.2\. Color system \(FINAL — sửa M10\)

Element Color

Skill Rating Xanh dương primary

Evidence Level Tím

CP badge Vàng gold

Achievement Đỏ tươi \+ icon cúp

Equipment Fit Xanh lá tươi

ServeTargetOverlay Xanh ngọc \(teal\)

CriticalMissingBanner Cam vàng có viền

Error states Đỏ đậm

Pending line Xám nhạt

Lifetime Peak badge Vàng đồng \(khác CP gold\)

17\.3\. Current vs Lifetime Tier

Current Tier: hiển thị chính, prominent

Lifetime Peak: badge phụ, nhỏ, tooltip \*"Danh dự lịch sử, không giảm do inactivity"\*

\`lifetimeContribution\` \(số\): hiển thị riêng, có thể giảm \(user xóa bài\), không gộp với peak

17\.4\. Serve UI

Chọn serve → overlay sáng nửa sân chéo, label \*"Vùng gợi ý \(SportDNA\)"\*

Click sai → toast \*"Giao cầu phải chéo ô\. Điểm không được tính\."\* hoặc \*"Ngoài vùng gợi ý\. Điểm không được tính\."\*

KHÔNG dùng "phạm luật", "BWF" trong overlay/toast

17\.5\. Fit Score điều kiện

\`insufficient\_data\` → KHÔNG hiện %, thay \*"Chưa đủ dữ liệu để đánh giá"\*

\`calculated\` → % \+ coverage \+ confidence \+ source breakdown

\`criticalMissing\.length > 0\` → banner cam vàng \+ rank cuối

17\.6\. Pending rõ ràng

Không hiển thị pending như đã duyệt

Dòng phụ mờ

NEEDS\_REVIEW có tooltip riêng

17\.7\. Radar honest

4 trục insufficient → chấm mờ ở tâm

Polygon chỉ trên 4 trục có data

KHÔNG fake giá trị

17\.8\. Responsive

Desktop \(1440\) \+ Mobile \(390\) cho mọi màn\.

18\. WHAT FIGMA MUST NOT DO

❌ Đổi công thức S = A × T × R

❌ Gộp 5 trục thành 1 điểm

❌ Hiển thị CP như evidence level

❌ Hardcode \`sᵢ\`, \`D\`, \`base\_3x3\`, \`fitScore\`

❌ Thêm môn thể thao ngoài cầu lông

❌ Tự sửa business logic

❌ Dùng Unity / engine 3D

❌ Đưa Budget vào Fit weights

❌ Lẫn \`d\` và \`y\` trong code — chỉ \`y\` cho vị trí

❌ Hiển thị pending như đã duyệt

❌ Nâng \`SELF\_REPORTED\_LEGACY\` lên V1 mà không qua assessment

❌ Fake radar data để polygon đầy đủ

❌ Gán Fit = 0 khi config error

❌ Đảo lộn trái/phải khi vẽ serve overlay

19\. RELEASE GATE

Item Status

UI skeleton, navigation flow ✅ GO

Component library ✅ GO

Community UI ✅ GO

Settings UI ✅ GO

Scenario Court UI ✅ GO \(với serve overlay đúng chiều chéo\)

CP Profile UI ✅ GO \(với 3 bucket \+ peak tier\)

Equipment Fit UI ✅ GO \(với budget ngoài Fit \+ critical banner\)

Mockup clickable ✅ GO

Business logic \(scoring, ELO, CP engine\) ⏸️ HOLD — chờ ChatGPT finalize sᵢ table

Formula changes ❌ FORBIDDEN

Football ❌ CUT \(ẩn route\)

Unblock business logic khi: ChatGPT nộp bảng sᵢ cho 20 scenario, verify đúng phân bổ 5 dễ / 10 trung bình / 5 khó theo Section 7\.3\.

20\. TEST CONTRACTS \(acceptance criteria\)

Đây là test spec, Figma hiểu acceptance criteria, không code\.

20\.1\. ELO independence

Thay đổi CP / promotion / response time không đổi ELO \(khi valid input giữ nguyên\)

20\.2\. Scenario diversity

1000 seed → ≥ 50 fingerprint unique

Mỗi variant ≥ 1% tổng số lần sinh

20\.3\. CP lifecycle

Pending delete < 7 ngày → REVOKED, không chạm lifetime/current

Decay\-then\-delete: post 5CP sau 365d còn 2\.5, xóa → lifetime \-5, current \-2\.5

Duplicate eventId → count 1 lần

User tự xóa bài → peak tier KHÔNG giảm

CONFIRMED\_VIOLATION → peak tier giảm về tier mới

20\.4\. Config vs Fit

Tension vượt max → config error, Fit Score KHÔNG = 0

Fit Score computed bình thường

20\.5\. Migration

V0 → SELF\_REPORTED\_LEGACY \(không phải V1\)

ELO/evidence preserved

Idempotent

21\. EXPECTED RESPONSE FROM FIGMA

Sau khi đọc handoff, Figma trả lại:

Sơ đồ màn hình — screens \+ navigation flow

Component inventory — component tree với states/variants

Wireframe update cho 3 màn:

Scenario Court \(verify serve overlay đúng chiều chéo\)

CP Profile \(verify 3 bucket \+ peak tier \+ radar honest\)

Equipment Product Detail \(verify critical banner \+ budget ngoài Fit\)

Câu hỏi — chỗ chưa đủ info

Mâu thuẫn phát hiện — nếu có

Không code business logic\. Chỉ design\.

END MASTER HANDOFF v1\.3\.3 FINAL

ð TÓM TẮT CHO SẾP

Middleman copy nguyên khối trên → gửi Figma\. Đây là bản duy nhất, không cần merge\.

v1\.3\.3 sửa 10 lỗi so với v1\.3\.2:

\# Fix Ảnh hưởng

P0\-1 Serve cross\-court đảo trái/phải Figma phải vẽ overlay nửa sân chéo

P0\-2 y→meter factor 2 Scoring R đúng

P0\-3 V0 → SELF\_REPORTED\_LEGACY \(không phải V1\) Badge mới, không nâng cấp sai

P0\-4 Retest priority chain thay rule tuyệt đối Retest sau Deep vẫn chạy được

P1\-5 Weight redistribution 26\.51/26\.51/26\.51/20\.48 Sum = 100% chính xác

P1\-6 Radar honest \(4 trục insufficient\) Không fake data

P1\-7 Movement threshold 0\.02 Không nhầm "đứng yên" thành "di chuyển"

P1\-8 Config error độc lập Fit Score Không gán Fit = 0 sai

P1\-9 Quick sampling greedy set cover Coverage đủ 7 nhóm

P1\-10 dataCoverage JSON đúng arithmetic 2/4 = 0\.50, không phải 0\.75

Figma được phép build mockup clickable ngay\. Không cần round nữa với tôi\. Sau mockup về, sếp review → unlock business logic → ChatGPT deliver sᵢ table → dev implement\.

## <a id="_ltl6tlww1mel"></a>T7\#3 \(9,264 ký tự\)

Đây là BẢN ĐẶC TẢ UI/UX CHI TIẾT NHẤT \(FINAL v1\.3\.4\) dành riêng cho Figma\.

Sếp chỉ cần copy toàn bộ nội dung từ dòng "BẮT ĐẦU" đến "KẾT THÚC" và gửi thẳng cho Figma AI \(hoặc team design\)\. Bản này đã được cấu trúc cực kỳ rõ ràng, không còn bất kỳ mâu thuẫn nào từ các phiên bản trước\.

BẮT ĐẦU

ð¨ SPORTDNA — MASTER UI/UX SPECIFICATION FOR FIGMA

Version: v1\.3\.4 FINAL

Recipient: Figma AI / UI\-UX Design Team

Status: UI AUTHORIZED — Full implementation\.

⚡ 0\. NGUYÊN TẮC THIẾT KẾ CỐT LÕI \(BẮT BUỘC\)

5 Trục Độc Lập: Skill Rating \(ELO\), Evidence Level \(V1/V2/V3\), Community Reputation \(CP\), Achievement \(Thành tích\), Equipment Fit \(Độ phù hợp thiết bị\)\. TUYỆT ĐỐI KHÔNG gộp 5 trục này thành 1 điểm tổng\.

Trung thực dữ liệu: Thà UI xấu mà honest, còn hơn UI đẹp mà bịa số liệu\. Nếu thiếu dữ liệu \(null\), phải hiển thị trạng thái \`insufficient\_data\` \(Chưa đủ dữ liệu\), không tự động gán số 0\.

Màu sắc \(Color System\):

Skill Rating: Xanh dương Primary\.

Evidence Level: Tím\.

CP \(Community\): Vàng Gold\.

Achievement: Đỏ tươi \+ Icon cúp\.

Equipment Fit: Xanh lá tươi\.

Serve Target Overlay: Xanh ngọc \(Teal\)\.

Critical Warning \(Cảnh báo thiếu dữ liệu\): Cam vàng, có viền\.

Error/Config: Đỏ đậm\.

Pending \(Chờ duyệt\): Xám nhạt\.

1\. SƠ ĐỒ MÀN HÌNH & LUỒNG ĐIỀU HƯỚNG

\`\`\`text SportDNA Hub \(Entry\) ├─ 1\. Quick Assessment \(8 Quiz ABCD \+ 2 Scenario\) ├─ 2\. Deep Assessment \(20 Scenario\) ├─ 3\. Retest \(10 Scenario\) └─ 4\. Profile \(Hồ sơ\)

Assessment Flow: Hub \-> Scenario Court \(Shared Component\) \-> Assessment Result \-> Profile

Profile Flow: Profile Overview \-> Reputation Detail / Skill Detail / Equipment Summary Equipment Flow: Equipment Listing \-> Product Detail \-> Configuration Editor Community Flow: Feed \-> Post Detail / Post Composer / Moderation Status Settings Flow: Privacy Controls / Budget Preferences \`\`\`

2\. DANH SÁCH COMPONENT \(COMPONENT LIBRARY\)

2\.1\. Assessment & Scenario Court

\`CourtCanvas\`: Sân cầu lông 2D \(Top\-down\)\. Trục y=0 là baseline địch \(Top\), y=1 là baseline ta \(Bottom\)\. Lưới ở y=0\.5\.

\`PlayerMarker\`: Chấm tròn màu Xanh dương \(Nửa sân dưới\)\.

\`OpponentMarker\`: Chấm tròn màu Đỏ \(Nửa sân trên\), có kèm mũi tên vector di chuyển\.

\`ShuttleMarker\`: Icon quả cầu, kèm hướng bay \(nếu có\)\.

\`TargetZone\`: Ma trận 3x3 \(9 vùng\) trên nửa sân địch\.

\`ActionSelector\`: Các nút chọn động tác\. Trạng thái: Default, Hover, Selected, Disabled\.

\`ServeTargetOverlay\`: Vùng sáng Xanh ngọc \(Teal\) chỉ phủ nửa sân chéo so với vị trí người chơi\. Xuất hiện khi chọn \`serve\_short\`, \`serve\_flick\`, \`serve\_long\`\. Có label: \*"Vùng gợi ý \(SportDNA\)"\*\.

\`ContextIndicator\`: Chỉ hiển thị SAU KHI user xác nhận câu trả lời \(ở màn Feedback\), không hiển thị trước để tránh leak đáp án\.

\`ServeDisclaimer\`: Text thu gọn/mở rộng chứa cảnh báo luật giao cầu\.

\`QuickQuizCard\`: Thẻ hiển thị câu hỏi trắc nghiệm \(ABCD\) cho 8 câu hỏi thể chất\.

\`AssessmentResult\`: Màn hình tổng kết điểm\.

2\.2\. Profile & Radar

\`SkillRatingCard\`: Hiển thị Overall ELO\.

\`SkillRadar\` \(8 trục\):

4 trục Scenario: Phản xạ, Kỹ thuật, Kiểm soát, Chiến thuật \(Lấy từ data\)\.

4 trục Quiz: Sức mạnh, Tốc độ, Bền bỉ, Cân bằng \(Lấy từ data\)\.

Quy tắc UI: Nếu trục nào \`null\` \-> Vẽ chấm mờ ở tâm kèm icon đồng hồ cát \+ tooltip \*"Chưa đủ dữ liệu"\*\. Polygon chỉ nối các trục có data\.

\`EvidenceLevelBadge\`: Badge Tím hiển thị V1/V2/V3 hoặc "Tự khai báo \(cũ\)"\.

\`CurrentReputationCard\`: CP Score \+ Tier hiện tại \(Primary\)\.

\`LifetimePeakBadge\`: Badge phụ Vàng đồng, tooltip \*"Danh dự lịch sử, không giảm do inactivity"\*\.

\`PendingContributionLine\`: Dòng text xám mờ \*"\+\{X\} đang chờ duyệt"\*\.

\`AchievementList\`: Danh sách thành tích\.

2\.3\. Equipment \(Cầu lông\)

\`ProductCard\`: Có Fit Score \+ Data coverage \+ Icon Warning \(nếu thiếu tiêu chí cốt lõi\)\.

\`CoreSpecificationTable\`: Bảng thông số\. Có chip hiển thị nguồn \(Manufacturer Verified / Seller Provided / Inferred\)\.

\`BudgetFilter\`: 4 nút range: Dưới 1tr, 1\-2tr \(Default\), 2\-5tr, Trên 5tr\.

\`CriticalMissingBanner\`: Banner Cam vàng cảnh báo \*"Sản phẩm thiếu tiêu chí cốt lõi\. Điểm phù hợp có thể không chính xác\."\*

\`ConfigurationWarning\`: Banner Đỏ đậm báo lỗi căng cước\.

\`FitScoreDisplay\`: Hiển thị % kèm Confidence Badge \(Low/Medium/High\)\. Nếu \`insufficient\_data\` \-> Hiển thị \*"Chưa đủ dữ liệu để đánh giá"\*\.

2\.4\. Community

\`CommunityPostCard\`: 2 Badges cạnh tên tác giả \(Skill Badge \+ CP Badge\)\.

\`ModerationStatusBadge\`: 5 trạng thái \(Pending/Approved/Needs Review/Rejected/Revoked\)\.

3\. CHI TIẾT UI TEXT & TIERS \(COPY NGUYÊN VĂN\)

3\.1\. Skill Tiers \(10 Bậc \- Badge Xanh dương\)

\`tier\_0\_new\` \(1000–1099\): Người mới bắt đầu

\`tier\_1\_beginner\` \(1100–1199\): Sơ cấp

\`tier\_2\_novice\` \(1200–1299\): Sơ cấp nâng cao

\`tier\_3\_developing\` \(1300–1399\): Đang phát triển

\`tier\_4\_intermediate\` \(1400–1499\): Trung cấp

\`tier\_5\_upper\_intermediate\` \(1500–1599\): Trung cấp nâng cao

\`tier\_6\_advanced\` \(1600–1699\): Khá

\`tier\_7\_competitive\` \(1700–1849\): Nâng cao

\`tier\_8\_expert\` \(1850–1999\): Chuyên sâu

\`tier\_9\_elite\` \(2000\+\): Tinh hoa

3\.2\. CP Tiers \(5 Bậc Cộng đồng \- Badge Vàng Gold\)

\`NEWCOMER\` \(0–99 CP\): Thành viên mới\. \*Text UI: "Bạn đang bắt đầu hành trình\.\.\."\*

\`ACTIVE\_MEMBER\` \(100–299 CP\): Thành viên tích cực\. \*Text UI: "Bạn đã trở thành một thành viên tích cực\.\.\."\*

\`TRUSTED\_MEMBER\` \(300–549 CP\): Thành viên uy tín\.

\`CONTRIBUTOR\` \(550–799 CP\): Người đóng góp\.

\`PILLAR\` \(800–1000 CP\): Trụ cột cộng đồng\.

3\.3\. UI Toast / Alert / Tooltip

Thăng bậc Skill: \*"Chúc mừng\! Bạn đã lên bậc\! Overall ELO của bạn đã đạt \{newElo\}\.\.\."\*

Giáng bậc Skill: \*"Cấp độ đã thay đổi\. Overall ELO hiện tại của bạn là \{newElo\}\.\.\."\*

Lỗi giao cầu \(Toast\): \*"Ngoài vùng gợi ý của SportDNA\. Điểm sẽ không được tính\."\*

Lỗi giao chéo ô \(Toast\): \*"Giao cầu phải chéo ô\. Điểm không được tính\."\*

Tooltip Phân biệt:

\*Skill Rating:\* "Đánh giá bạn chơi cầu lông tốt đến mức nào\."

\*Community Reputation:\* "Đánh giá bạn đóng góp tích cực đến mức nào cho cộng đồng\."

4\. ĐẶC TẢ 3 MÀN HÌNH TRỌNG TÂM \(CONDITIONAL GO\)

4\.1\. Màn hình Scenario Court

Layout: Trái là sân 2D \(60% width\), Phải là Panel điều khiển \(40% width\)\.

Panel phải:

Thông tin: Scenario ID, Tên tình huống \(Prompt text\), Độ khó \(D \- ẩn đi không hiển thị cho user, chỉ hiện ở chế độ Review\)\.

Chọn động tác \(ActionSelector\): Grid 2x2 hoặc 2x3\. Các nút: Đập cầu, Bỏ nhỏ, Phòng cầu, Đánh ngang, v\.v\.

Hướng dẫn chọn điểm rơi: \*"Chạm vào nửa sân đối thủ để chọn điểm rơi\."\*

Nút Xác nhận: Nút Primary lớn ở dưới cùng\.

Tương tác:

User click chọn Action \-> Action sáng lên\.

User click vào sân \-> Vùng đó đổi màu \(highlight\)\.

Nếu chọn Action \`serve\_short\` \-> Sân tự động bật \`ServeTargetOverlay\` \(Xanh ngọc\) ở nửa sân chéo\. Nếu user click ra ngoài vùng xanh \-> Hiện Toast lỗi, không cho Confirm\.

4\.2\. Màn hình CP Profile

Layout: Chia 2 cột rõ rệt\.

Cột Trái \(Primary\):

CURRENT REPUTATION \(Heading xám\)\.

Số CP to đùng \(VD: 180 CP\)\.

Badge \`TRUSTED\_MEMBER\` \(Màu Vàng Gold\)\.

Dòng Pending: \*"\+15 đang chờ duyệt"\* \(Chữ mờ, nhỏ hơn\)\.

Cột Phải \(Secondary\):

LIFETIME RECOGNITION \(Heading xám\)\.

Số điểm Lifetime Contribution \(VD: 320 điểm\)\.

Badge Peak Tier \(VD: \`CONTRIBUTOR\` ⓘ\)\.

Bên dưới \(Lịch sử\):

List các event: \`APPROVED\` \(Xanh lá\), \`PENDING\` \(Vàng mờ\), \`REVOKED\` \(Đỏ, gạch ngang\)\.

4\.3\. Màn hình Equipment Product Detail

Header: Tên sản phẩm, Giá \(kèm note \*"Giá chỉ là thông tin thương mại"\*\)\.

Box Fit Score \(Nổi bật\):

\*"Equipment Fit: 78%"\* \(Kèm Badge Confidence: Low/Medium/High\)\.

\*"Coverage: 50% \(2/4 tiêu chí\)"\*\.

Critical Banner: Nếu thiếu tiêu chí cốt lõi, hiện banner Cam Vàng: \*"Sản phẩm thiếu 1 tiêu chí cốt lõi\. Điểm phù hợp có thể không chính xác\."\*

Bảng thông số \(CoreSpecificationTable\): Cột Nguồn dữ liệu phải dùng chip màu \(Xanh dương: Manufacturer, Vàng: Seller, Xám: Unknown\)\.

Box Cấu hình \(Configuration Editor\):

Nếu user chọn căng cước vượt giới hạn \-> Hiện Banner Đỏ đậm: \*"Cấu hình vượt giới hạn nhà sản xuất\. Fit Score không bị đổi thành 0\."\*

Ngân sách \(Budget\): Luôn hiển thị dưới dạng bộ lọc \(Filter\) ở đầu trang Listing, không phải tiêu chí tính điểm\.

5\. DỮ LIỆU GIẢ LẬP \(MOCK DATA JSON\)

\*\(Figma sử dụng cấu trúc này để bind data vào UI\)\*

\`\`\`json // Mock cho 1 Scenario \{ "scenarioId": "BD\-B01\-V1", "prompt": "Đối thủ lùi sâu cuối sân\. Cầu bổng đến trước mặt bạn\.", "availableActions": \["smash", "drop", "clear", "drive"\], "state": \{ "player": \{"x": 0\.22, "y": 0\.78\}, "opponent": \{"x": 0\.75, "y": 0\.15, "movement": \[\-0\.05, 0\.10\]\}, "shuttle": \{"x": 0\.24, "y": 0\.68\} \} \}

// Mock cho CP Profile \{ "currentScore": 180, "currentTier": "TRUSTED\_MEMBER", "lifetimeContribution": 320, "lifetimePeakTier": "CONTRIBUTOR", "pendingContribution": 15 \}

// Mock cho Equipment Fit \{ "fitScore": 78, "dataCoverage": 0\.50, "confidence": "low", "criticalMissing": \["balance"\], "status": "calculated" \} \`\`\`

6\. BÀN GIAO TỪ FIGMA

Figma vui lòng phản hồi lại các mục sau:

Link Figma Prototype: Bản clickable cho 3 màn trọng tâm\.

Component Library: Xuất file UI Kit với đầy đủ variants \(State: Default/Hover/Active/Disabled\)\.

Danh sách màn hình: Đã hoàn thiện bao nhiêu màn, còn màn nào chưa xong\.

Câu hỏi/Mâu thuẫn: Nếu thấy logic nào chưa rõ, ghi cụ thể để Lead giải đáp\.

\*Lưu ý: Không sử dụng hình ảnh minh họa \(stock photo\) cho sân đấu\. Sân đấu phải được vẽ bằng vector \(SVG\) với tỷ lệ chính xác\.\*

KẾT THÚC

Sếp copy nguyên khối trên gửi Figma nhé\. Bản này tôi đã lược bỏ toàn bộ các đoạn code tính toán backend \(vì Figma không cần\), chỉ giữ lại UI/UX & Data Binding\. Figma nhìn vào là hiểu ngay cần vẽ gì\!
