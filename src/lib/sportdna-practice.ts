// SportDNA — câu luyện tập (bản thiết kế 1: BS11–BS25 đơn, DB07–DB21 đôi).
// Chưa có tọa độ sân và hệ số điểm đã duyệt, nên KHÔNG cộng ELO: chỉ hiện đáp án tốt nhất, bẫy và lý do.
// options[0] luôn là đáp án tốt nhất; giao diện tự xáo thứ tự khi hiển thị.

export type PracticeSport = 'badminton_singles' | 'badminton_doubles'
export interface PracticeQuestion {
  id: string
  sport: PracticeSport
  group: string
  title: string
  prompt: string
  options: [string, string, string, string]
  trap: { option: number; why: string }
}

export const PRACTICE_GROUPS: Record<string, string> = {
  G1: 'Đọc tình huống và khai thác khoảng trống',
  G2: 'Điều chỉnh kỹ thuật và thời điểm',
  G3: 'Chiến thuật và chuyển trạng thái',
  H1: 'Phối hợp và phân chia trách nhiệm',
  H2: 'Tấn công và chuyển đội hình',
  H3: 'Đọc đối thủ và xử lý áp lực',
}

type Raw = [id: string, group: string, title: string, prompt: string, options: [string, string, string, string], trapOption: number, why: string]
const make = (sport: PracticeSport) => ([id, group, title, prompt, options, option, why]: Raw): PracticeQuestion => ({
  id, sport, group, title, prompt, options, trap: { option, why },
})

const SINGLES: Raw[] = [
  ['BS11', 'G1', 'Đối thủ đứng lệch về góc trái', 'Đối thủ vừa di chuyển sang góc trái sân và chưa kịp trở về giữa. Bạn nhận cầu ở giữa sân, ngang tầm vai.',
    ['Đánh chéo sang góc phải', 'Đánh thẳng vào giữa', 'Bỏ nhỏ trước lưới', 'Phông cầu về góc trái'], 1,
    'Đánh vào vị trí đối thủ vừa rời khỏi nhưng không khai thác khoảng trống phía đối diện.'],
  ['BS12', 'G1', 'Đối thủ đứng quá sát lưới', 'Đối thủ tiến lên gần lưới sau một cú bỏ nhỏ. Bạn đón được cầu ở giữa sân.',
    ['Phông cầu cao sâu cuối sân', 'Bỏ nhỏ tiếp', 'Đánh lưới', 'Đẩy cầu ngang'], 1,
    'Tiếp tục đánh ngắn khi đối thủ đã chiếm ưu thế phía trước.'],
  ['BS13', 'G1', 'Đối thủ đứng sâu cuối sân', 'Đối thủ đang đứng gần baseline. Cầu đến phía trước bạn ở độ cao thuận lợi.',
    ['Bỏ nhỏ sát lưới', 'Phông cầu cao sâu', 'Đập cầu về cuối sân', 'Drive ngang'], 1,
    'Đánh sâu vào khu vực đối thủ đang kiểm soát.'],
  ['BS14', 'G1', 'Đối thủ liên tục chờ đánh chéo', 'Qua nhiều pha cầu, bạn nhận thấy đối thủ thường dịch chuyển sớm để đón cú đánh chéo.',
    ['Đánh thẳng vào khoảng trống', 'Tiếp tục đánh chéo', 'Phông cao giữa sân', 'Bỏ nhỏ về đúng hướng đối thủ đang chờ'], 1,
    'Lặp lại hướng đánh đã bị đối thủ đọc trước.'],
  ['BS15', 'G1', 'Cầu đến sát biên cuối sân', 'Cầu bay sâu về phía cuối sân, gần đường biên. Bạn đang di chuyển lùi và phải quyết định có đánh hay không.',
    ['Đánh khi xác định cầu còn trong sân', 'Bỏ cầu dù chưa chắc cầu ra ngoài', 'Đập cầu trong tư thế mất thăng bằng', 'Cố đánh bằng mọi giá'], 3,
    'Cố cứu một quả cầu ngoài sân, khiến mất thăng bằng và vị trí.'],
  ['BS16', 'G2', 'Cầu đến thấp khi đang di chuyển', 'Bạn vừa chạy ngang sân, cầu đến thấp ở phía trái tay.',
    ['Đánh phông phòng thủ cao sâu', 'Đập cầu', 'Đánh ngang thiếu tư thế', 'Bỏ nhỏ sát lưới'], 1,
    'Cố tấn công khi chưa ổn định trọng tâm.'],
  ['BS17', 'G2', 'Đối thủ trả cầu yếu giữa sân', 'Sau cú đẩy cầu của bạn, đối thủ trả cầu yếu và nâng cầu lên giữa sân.',
    ['Di chuyển vào cầu và đập có kiểm soát', 'Phông cầu tiếp', 'Bỏ nhỏ khi cầu còn quá thấp', 'Đứng chờ cầu rơi'], 1,
    'Bỏ lỡ cơ hội tấn công khi cầu đã tạo điều kiện thuận lợi.'],
  ['BS18', 'G2', 'Bị kéo liên tục hai góc trước', 'Đối thủ liên tiếp đánh vào hai góc lưới. Bạn vừa kịp cứu cú thứ hai nhưng chưa về giữa sân.',
    ['Đánh trả cao sâu để tái lập vị trí', 'Tiếp tục bỏ nhỏ', 'Đẩy cầu ngang sát lưới', 'Đập cầu trong tư thế mất thăng bằng'], 1,
    'Tiếp tục đánh ngắn khiến bạn không có thời gian hồi vị.'],
  ['BS19', 'G2', 'Đối thủ đổi nhịp bất ngờ', 'Đối thủ đang đánh nhanh liên tục nhưng bất ngờ thực hiện cú bỏ nhỏ chậm sát lưới.',
    ['Giảm trọng tâm, bước đón cầu sớm', 'Tiếp tục lùi về cuối sân', 'Nhảy lên đập cầu', 'Đứng chờ cầu rơi'], 1,
    'Không điều chỉnh nhịp di chuyển theo tốc độ cầu.'],
  ['BS20', 'G2', 'Cầu cao nhưng cơ thể chưa cân bằng', 'Bạn nhận được cầu bổng ở giữa sân nhưng vừa chạy hết tốc lực sang một bên.',
    ['Đánh cầu có kiểm soát, ưu tiên hồi vị', 'Đập hết lực', 'Đập chéo góc khó', 'Bỏ nhỏ sát lưới'], 1,
    'Nhầm lẫn giữa cầu thuận lợi và tư thế thuận lợi.'],
  ['BS21', 'G3', 'Đối thủ có thói quen trả cầu về giữa', 'Đối thủ thường trả cầu về giữa sân sau mỗi lần bị ép.',
    ['Chủ động đứng chờ ở vị trí giữa có lợi để tấn công tiếp', 'Lùi sâu cuối sân', 'Đứng sát lưới', 'Di chuyển theo hướng đánh cũ'], 3,
    'Không khai thác được thói quen trả cầu của đối thủ.'],
  ['BS22', 'G3', 'Tạo cơ hội bằng cú đánh thứ nhất', 'Bạn đang ở giữa sân. Đối thủ đứng cân bằng. Bạn muốn tạo một tình huống thuận lợi cho cú đánh tiếp theo.',
    ['Đẩy cầu nhanh về góc trái, rồi chuẩn bị khai thác cú trả giữa sân', 'Đập mạnh vào giữa', 'Bỏ nhỏ ngay', 'Phông cầu cao không mục tiêu'], 1,
    'Chỉ quan tâm cú đánh hiện tại, không chuẩn bị cho phản ứng tiếp theo.'],
  ['BS23', 'G3', 'Đối thủ vừa đập nhưng tiếp đất lệch', 'Đối thủ đập cầu rồi tiếp đất lệch về phía phải, chưa hồi vị.',
    ['Đánh nhanh vào khoảng trống phía trái', 'Đánh về phía phải', 'Phông cầu vào giữa', 'Giữ cầu chậm'], 1,
    'Không tận dụng trạng thái mất cân bằng của đối thủ.'],
  ['BS24', 'G3', 'Dẫn điểm nhưng bị ép liên tục', 'Bạn đang dẫn điểm. Đối thủ tăng tốc độ đánh và liên tục ép hai góc.',
    ['Giữ cầu an toàn, chọn thời điểm phản công', 'Cố đập kết thúc mọi pha', 'Đánh mạo hiểm sát biên', 'Tăng tốc theo đối thủ'], 1,
    'Để áp lực tỷ số làm thay đổi chất lượng quyết định.'],
  ['BS25', 'G3', 'Cơ hội kết thúc sau cú trả yếu', 'Đối thủ vừa trả cầu ngắn và cao ở gần lưới. Bạn đã vào vị trí thuận lợi.',
    ['Đánh kết thúc vào khoảng trống với kiểm soát', 'Nâng cầu cao sâu', 'Bỏ nhỏ thêm một lần', 'Đánh mạnh không xác định hướng'], 1,
    'Kéo dài pha cầu khi đã có cơ hội kết thúc hợp lý.'],
]

const DOUBLES: Raw[] = [
  ['DB07', 'H1', 'Cầu giữa khi hai người lệch đội hình', 'Bạn đứng phía sau, partner đứng trước. Cầu bay vào khoảng giữa hai người nhưng lệch về phía tay thuận của partner.',
    ['Gọi partner xử lý, bạn bọc khoảng trống phía sau', 'Cùng lao vào cầu', 'Đứng chờ partner tự quyết định', 'Lùi hẳn về cuối sân'], 1,
    'Hai người cùng lao vào tạo khoảng trống ở phía sau.'],
  ['DB08', 'H1', 'Partner bị kéo ra biên', 'Partner đang ở góc phải và vừa đánh trả cầu. Đối thủ đánh nhanh sang góc trái của bạn.',
    ['Di chuyển sang trái nhận cầu, partner hồi vị', 'Đứng nguyên chờ partner', 'Cùng chạy sang phải', 'Lùi cả hai về cuối sân'], 1,
    'Không bù vị trí khi partner bị kéo khỏi khu vực kiểm soát.'],
  ['DB09', 'H1', 'Partner vừa đập cầu', 'Partner đập cầu từ cuối sân. Bạn đang giữ lưới và đối thủ có khả năng chặn cầu ngắn.',
    ['Giữ vợt cao, chủ động bắt cầu trả ngắn', 'Lùi về đứng ngang partner', 'Đứng sát lưới không quan sát', 'Di chuyển sang biên đối diện'], 1,
    'Không chuẩn bị cho cú chặn lưới sau smash.'],
  ['DB10', 'H1', 'Hai người cùng bị ép cuối sân', 'Đối thủ đánh nhanh khiến cả hai bạn phải lùi về phía sau. Đội hình đang bị kéo ngang.',
    ['Phối hợp trả cầu cao sâu và khôi phục đội hình song song', 'Một người lao lên lưới', 'Cả hai cùng đứng giữa', 'Cố phản công ngay bằng cú đập'], 1,
    'Cố duy trì đội hình tấn công khi đang mất thế chủ động.'],
  ['DB11', 'H1', 'Đối thủ đánh vào khe giữa', 'Hai bạn đứng song song, đối thủ đánh drive nhanh vào khoảng giữa hai người.',
    ['Người có tư thế thuận lợi hơn gọi cầu, người còn lại bọc lót', 'Cả hai cùng đánh', 'Cả hai nhường cầu', 'Người đứng xa tự động lao vào'], 2,
    'Không có nguyên tắc giao tiếp và phân chia trách nhiệm.'],
  ['DB12', 'H2', 'Partner nâng cầu từ lưới', 'Partner bị ép ở lưới và buộc phải nâng cầu cao. Bạn đang ở cuối sân.',
    ['Chủ động vào tư thế phòng thủ song song', 'Tiếp tục đứng đội hình trước-sau', 'Lao lên lưới', 'Lao lên chặn trước khi đối thủ kịp đánh'], 1,
    'Không chuyển từ đội hình tấn công sang phòng thủ.'],
  ['DB13', 'H2', 'Đối thủ song song nhưng lệch trọng tâm', 'Hai đối thủ đứng song song. Người bên trái đang dịch chuyển về phía trước, người bên phải giữ vị trí sâu.',
    ['Tấn công vào khoảng trống phía sau người bên trái', 'Đánh thẳng vào người bên trái', 'Bỏ nhỏ trước người bên phải', 'Đánh cao giữa sân'], 3,
    'Không khai thác chênh lệch vị trí giữa hai người.'],
  ['DB14', 'H2', 'Partner bỏ nhỏ thành công', 'Partner vừa bỏ nhỏ khiến đối thủ phải nâng cầu. Bạn đang đứng ở giữa sân.',
    ['Tiến lên hỗ trợ bắt cầu trả ngắn', 'Lùi về cuối sân', 'Đứng yên', 'Đổi sang biên đối diện'], 2,
    'Không chuyển trạng thái ngay khi đội mình giành được lợi thế.'],
  ['DB15', 'H2', 'Smash bị đối thủ chặn ngược', 'Bạn vừa smash, đối thủ chặn cầu nhanh về phía lưới. Partner đang đứng bên cạnh.',
    ['Người gần cầu xử lý, người còn lại bọc khoảng trống', 'Cả hai cùng lao lên', 'Cả hai cùng lùi', 'Người vừa smash tiếp tục đập bất chấp vị trí'], 1,
    'Không phân chia trách nhiệm sau cú tấn công.'],
  ['DB16', 'H2', 'Tấn công vào khe giữa', 'Hai đối thủ đứng song song nhưng khoảng cách giữa họ khá rộng. Partner đã giữ lưới.',
    ['Smash vào khe giữa hai đối thủ', 'Đánh cao về góc cuối sân', 'Bỏ nhỏ sát lưới', 'Đánh chéo ra sát biên'], 3,
    'Ưu tiên góc khó trong khi khoảng giữa là mục tiêu chiến thuật tốt.'],
  ['DB17', 'H3', 'Đối thủ chuyên chặn cầu vào chân', 'Đối thủ phòng thủ thường xuyên chặn smash xuống chân người đánh. Bạn đang chuẩn bị tấn công.',
    ['Điều chỉnh smash vào thân hoặc khoảng trống, partner giữ lưới', 'Tiếp tục smash cùng một hướng', 'Đứng lùi chờ', 'Chỉ bỏ nhỏ'], 1,
    'Lặp lại phương án đã bị đối thủ khai thác.'],
  ['DB18', 'H3', 'Partner giao cầu bị tấn công', 'Partner giao cầu ngắn. Đối thủ đẩy cầu nhanh về phía sau bạn.',
    ['Người phía sau lùi xử lý, người giao cầu giữ vị trí trước', 'Người giao cầu lùi theo', 'Cả hai cùng tiến lên', 'Đứng chờ cầu rơi'], 1,
    'Không thực hiện bọc lót sau giao cầu.'],
  ['DB19', 'H3', 'Đối thủ giả vờ đánh thẳng', 'Đối thủ ở cuối sân có động tác chuẩn bị đập thẳng nhưng thường đổi hướng vào khe giữa.',
    ['Giữ tư thế cân bằng, quan sát mặt vợt và chuẩn bị bọc lót', 'Đoán hướng trước khi đối thủ chạm cầu', 'Cả hai đứng sát nhau', 'Một người bỏ hẳn khu vực giữa'], 1,
    'Di chuyển quá sớm theo động tác giả.'],
  ['DB20', 'H3', 'Mất liên lạc khi đổi vị trí', 'Trong pha cầu nhanh, bạn và partner cùng di chuyển sang một bên, để trống bên còn lại.',
    ['Người gần khu vực trống chủ động điều chỉnh, gọi vị trí và tái lập đội hình', 'Tiếp tục đánh mà không giao tiếp', 'Cả hai đứng nguyên', 'Đổ trách nhiệm cho partner'], 1,
    'Không khôi phục cấu trúc đội hình sau khi bị phá vỡ.'],
  ['DB21', 'H3', 'Cầu cuối trận, áp lực cao', 'Tỷ số đang hòa ở thời điểm quyết định. Đối thủ có cú giao cầu ngắn và partner của bạn đã sẵn sàng lên lưới.',
    ['Trả giao cầu có kiểm soát vào khoảng trống, partner phối hợp giữ lưới', 'Đánh mạo hiểm sát biên', 'Nâng cầu bổng không cần thiết', 'Đập cầu ngay từ cú trả giao'], 1,
    'Đánh quá mạo hiểm vì áp lực tỷ số.'],
]

export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  ...SINGLES.map(make('badminton_singles')),
  ...DOUBLES.map(make('badminton_doubles')),
]

export const practiceFor = (sport: PracticeSport) => PRACTICE_QUESTIONS.filter((q) => q.sport === sport)
