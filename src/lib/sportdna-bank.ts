// SportDNA question bank (quick build): badminton doubles + football
// Quy uoc toa do chuan hoa x,y trong [0,1]:
//  - badminton_doubles: y=0 la baseline doi thu, y=0.5 la luoi, y=1 la baseline cua ban. Doi thu o nua tren.
//  - football: y=0 la khung thanh doi thu (ben tren), y=1 la khung thanh cua ban. Doi ta tan cong huong len.
// Diem mot cau: S = fit x targetScore (0..1). fit = 0 la hard-fail (sai co ban).

export type Sport = 'badminton_doubles' | 'football'
export type Phase = 'attacking' | 'neutral' | 'defending'
export type Team = 'me' | 'partner' | 'opp' | 'ball'
export interface Actor { team: Team; label: string; x: number; y: number }
export interface Action { id: string; label: string; fit: number; noTarget?: boolean }
export interface Target { id: string; label: string; x: number; y: number; score: number }
export interface Scenario {
  id: string; sport: Sport; title: string; phase: Phase; role: string; skill: string
  difficulty: number; prompt: string; cue: string[]
  actors: Actor[]; actions: Action[]; targets: Target[]
  trap: { kind: 'action' | 'target'; id: string; why: string }
  explain: string; mirrorOf?: string
}

type RA = [Team, string, number, number]
type RAct = [string, string, number, boolean?]
type RT = [string, string, number, number, number]
interface Raw {
  id: string; sport: Sport; title: string; phase: Phase; role: string; skill: string
  difficulty: number; prompt: string; cue: string[]
  actors: RA[]; actions: RAct[]; targets: RT[]
  trap: Scenario['trap']; explain: string; mirrorOf?: string
}
function S(r: Raw): Scenario {
  return {
    id: r.id, sport: r.sport, title: r.title, phase: r.phase, role: r.role, skill: r.skill,
    difficulty: r.difficulty, prompt: r.prompt, cue: r.cue,
    actors: r.actors.map(([team, label, x, y]) => ({ team, label, x, y })),
    actions: r.actions.map(([id, label, fit, noTarget]) => ({ id, label, fit, noTarget: !!noTarget })),
    targets: r.targets.map(([id, label, x, y, score]) => ({ id, label, x, y, score })),
    trap: r.trap, explain: r.explain, mirrorOf: r.mirrorOf,
  }
}

const BD: Sport = 'badminton_doubles'
const FB: Sport = 'football'

export const SCENARIOS: Scenario[] = [
  // ---------------- CAU LONG DOI ----------------
  S({
    id: 'DB01', sport: BD, title: 'Smash vào khoảng giữa', phase: 'attacking', role: 'Người cuối sân (tấn công)',
    skill: 'doubles_attack', difficulty: 1150,
    prompt: 'Cầu bổng cao ngay trước mặt bạn. Hai đối thủ đứng song song giữa sân, partner đã lên giữ lưới. Chọn cú đánh và điểm rơi.',
    cue: ['Hai đối thủ đứng song song (side by side)', 'Khoảng giữa hai người rộng, khó che', 'Partner giữ lưới, bạn có thời gian chuẩn bị'],
    actors: [['me', 'Bạn', 0.40, 0.84], ['partner', 'Partner', 0.62, 0.60], ['opp', 'Đối thủ A', 0.28, 0.26], ['opp', 'Đối thủ B', 0.72, 0.26], ['ball', 'Cầu', 0.43, 0.76]],
    actions: [['smash', 'Smash (đập cầu)', 1], ['drop', 'Cắt cầu (drop)', 0.55], ['clear', 'Phông cầu cao sâu', 0.4], ['drive', 'Drive phẳng', 0.3]],
    targets: [['M-C', 'Khoảng giữa hai người', 0.50, 0.28, 1], ['M-L', 'Vào người A', 0.28, 0.28, 0.4], ['M-R', 'Vào người B', 0.72, 0.28, 0.4], ['R-L', 'Góc cuối trái', 0.15, 0.08, 0.55], ['R-R', 'Góc cuối phải', 0.85, 0.08, 0.55], ['F-C', 'Sát lưới giữa', 0.50, 0.40, 0.3]],
    trap: { kind: 'target', id: 'R-L', why: 'Quen đánh đơn: smash ra biên. Ở đánh đôi hàng thủ song song che biên tốt, khoảng giữa mới là điểm yếu.' },
    explain: 'Đội hình song song luôn hở khoảng giữa hai người vì mỗi người nghĩ là của người kia. Smash vào giữa ép họ đỡ nhau.',
  }),
  S({
    id: 'DB02', sport: BD, title: 'Phòng thủ smash vào thân', phase: 'defending', role: 'Phòng thủ bên trái',
    skill: 'doubles_defense', difficulty: 1300,
    prompt: 'Đối thủ đập mạnh vào bạn, cầu thấp và nhanh. Người ở lưới đối thủ đứng bên phải. Chọn cách đỡ và điểm rơi.',
    cue: ['Cầu thấp hơn lưới, tốc độ cao', 'Người ở lưới đối thủ đứng bên phải (x khoảng 0,68)', 'Partner cùng hàng, đỡ khoảng bên phải'],
    actors: [['me', 'Bạn', 0.30, 0.78], ['partner', 'Partner', 0.70, 0.78], ['opp', 'Người đập', 0.50, 0.12], ['opp', 'Người giữ lưới', 0.68, 0.38], ['ball', 'Cầu', 0.36, 0.74]],
    actions: [['block', 'Chặn ngắn sát lưới', 1], ['drive', 'Đỡ phẳng chéo', 0.65], ['lift', 'Nâng cao cuối sân', 0.5], ['smash', 'Đập trả', 0]],
    targets: [['F-L', 'Lưới bên trái (xa người lưới)', 0.25, 0.43, 1], ['F-R', 'Lưới bên phải (gần người lưới)', 0.72, 0.43, 0.25], ['M-C', 'Giữa sân', 0.50, 0.28, 0.55], ['R-C', 'Cuối sân giữa', 0.50, 0.08, 0.35], ['R-L', 'Cuối sân trái', 0.20, 0.08, 0.45]],
    trap: { kind: 'action', id: 'lift', why: 'Bị đập là nâng cao: đưa cầu cho người đập đập tiếp. Chặn ngắn vào chỗ trống làm đối thủ mất nhịp.' },
    explain: 'Đập trả là không thể vì cầu thấp hơn lưới (hard-fail). Chặn ngắn ra xa người giữ lưới là lựa chọn tốt nhất.',
  }),
  S({
    id: 'DB03', sport: BD, title: 'Ai lấy cầu giữa hai người?', phase: 'neutral', role: 'Phòng thủ bên trái',
    skill: 'rotation', difficulty: 1200,
    prompt: 'Cầu rơi đúng đường giữa hai bạn, thấp ngang thân. Bạn và partner đứng song song.',
    cue: ['Cầu rơi đúng đường giữa', 'Cầu nằm bên thuận tay của partner (đứng bên phải, ngay sát cầu)', 'Bạn vừa lùi lên, chưa vững thế'],
    actors: [['me', 'Bạn', 0.30, 0.76], ['partner', 'Partner', 0.66, 0.76], ['ball', 'Cầu', 0.52, 0.73], ['opp', 'Đối thủ A', 0.35, 0.20], ['opp', 'Đối thủ B', 0.65, 0.20]],
    actions: [['yield', 'Gọi "của partner" và lùi lấp khoảng trống', 1], ['take', 'Gọi "của tôi" và đánh', 0.55], ['back', 'Lùi xa nhường cầu nhưng không báo', 0.3], ['freeze', 'Đứng yên chờ xem', 0]],
    targets: [],
    trap: { kind: 'action', id: 'take', why: 'Cầu gần mình thì mình đánh. Trong đôi, cầu đường giữa thuộc người ở thế thuận tay tốt hơn, và phải gọi to.' },
    explain: 'Đứng yên là hard-fail: không ai lấy cầu. Nhường cho người ở thế tốt và gọi rõ giữ đội hình không bị hở.',
  }),
  S({
    id: 'DB04', sport: BD, title: 'Giao cầu khi người nhận chồm lên', phase: 'neutral', role: 'Người giao cầu',
    skill: 'serve_receive', difficulty: 1100,
    prompt: 'Bạn giao cầu. Người nhận đang chồm người về phía lưới.',
    cue: ['Người nhận chồm về trước, trọng tâm dồn vào mũi chân', 'Người đứng sau ở xa, không bọc cầu ngắn', 'Vạch giao sau của đôi nằm trong biên cuối sân (khoảng 0,76 m)'],
    actors: [['me', 'Bạn (giao cầu)', 0.55, 0.66], ['partner', 'Partner', 0.40, 0.80], ['opp', 'Người nhận (chồm trước)', 0.58, 0.40], ['opp', 'Người sau', 0.30, 0.18]],
    actions: [['flick', 'Giao bổng nhanh (flick) qua đầu', 1], ['short', 'Giao ngắn thấp', 0.5], ['drive', 'Giao phẳng nhanh', 0.25], ['long_single', 'Giao thẳng cuối sân như đánh đơn', 0]],
    targets: [['B-C', 'Cuối ô giao, gần đường giữa', 0.58, 0.10, 1], ['B-S', 'Cuối ô giao, sát biên', 0.85, 0.10, 0.7], ['F-T', 'Sát vạch giao ngắn', 0.58, 0.38, 0.35]],
    trap: { kind: 'action', id: 'short', why: 'Giao ngắn là an toàn nhất: sai khi người nhận chồm lên, họ sẽ bọc liền tay.' },
    explain: 'Giao thẳng cuối sân như đánh đơn là hard-fail (ra ngoài vạch giao sau của đôi). Khi người nhận chồm, flick đánh vào thế sai chân của họ.',
  }),
  S({
    id: 'DB04b', sport: BD, title: 'Giao cầu khi người nhận đứng lùi', phase: 'neutral', role: 'Người giao cầu',
    skill: 'serve_receive', difficulty: 1100, mirrorOf: 'DB04',
    prompt: 'Bạn giao cầu. Lần này người nhận đứng lùi, trọng tâm đặt về sau.',
    cue: ['Người nhận đứng lùi xa vạch, trọng tâm đặt sau', 'Người đứng sau đứng gần, sẵn sàng bọc cầu bổng', 'Giao bổng dễ bị đập xuống'],
    actors: [['me', 'Bạn (giao cầu)', 0.55, 0.66], ['partner', 'Partner', 0.40, 0.80], ['opp', 'Người nhận (lùi xa)', 0.58, 0.30], ['opp', 'Người sau', 0.45, 0.14]],
    actions: [['short', 'Giao ngắn thấp', 1], ['flick', 'Giao bổng nhanh (flick) qua đầu', 0.35], ['drive', 'Giao phẳng nhanh', 0.25], ['long_single', 'Giao thẳng cuối sân như đánh đơn', 0]],
    targets: [['F-T', 'Sát vạch giao ngắn', 0.58, 0.38, 1], ['B-C', 'Cuối ô giao, gần đường giữa', 0.58, 0.10, 0.3], ['B-S', 'Cuối ô giao, sát biên', 0.85, 0.10, 0.3]],
    trap: { kind: 'action', id: 'flick', why: 'Giao bổng cho ngầu: khi người nhận đứng lùi, flick bị đập thẳng xuống.' },
    explain: 'Cùng một cú giao, đổi người nhận chồm trước và đứng lùi thì đáp án đổi ngược. Đây là cặp gương DB04 để kiểm tra nhất quán.',
  }),
  S({
    id: 'DB05', sport: BD, title: 'Bọc cầu bổng ngang lưới', phase: 'attacking', role: 'Người giữ lưới',
    skill: 'net_play', difficulty: 1250,
    prompt: 'Đối thủ nâng cầu chậm, ngang lưới và cao hơn mép lưới. Bạn đang ở lưới.',
    cue: ['Cầu cao hơn mép lưới, rơi chậm', 'Người giữ lưới đối thủ đứng bên trái (x khoảng 0,25)', 'Người sau đối thủ đứng chính giữa cuối sân'],
    actors: [['me', 'Bạn (lưới)', 0.58, 0.58], ['partner', 'Partner', 0.35, 0.84], ['opp', 'Người giữ lưới', 0.25, 0.38], ['opp', 'Người sau', 0.50, 0.12], ['ball', 'Cầu', 0.60, 0.55]],
    actions: [['kill', 'Tạt/đập xuống (kill)', 1], ['push', 'Đẩy phẳng', 0.6], ['net', 'Bỏ nhỏ sát lưới', 0.5], ['lift', 'Nâng cao', 0.2], ['clear', 'Đánh cao sâu', 0]],
    targets: [['M-R', 'Giữa sân bên phải (xa cả hai người)', 0.80, 0.28, 1], ['F-R', 'Lưới bên phải', 0.78, 0.42, 0.9], ['M-C', 'Giữa sân', 0.50, 0.28, 0.45], ['R-C', 'Cuối giữa (chỗ người sau)', 0.50, 0.08, 0.3], ['F-L', 'Lưới trái (sát người lưới)', 0.25, 0.42, 0.1]],
    trap: { kind: 'action', id: 'net', why: 'Bỏ nhỏ sát lưới là an toàn: nhưng người lưới đối thủ đã đứng đỡ, dễ bị bắt.' },
    explain: 'Đánh cao sâu từ sát lưới là hard-fail (không thể tạo quỹ đạo). Cầu cao hơn lưới thì phải tấn công, thả xuống khoảng trống bên phải.',
  }),
  S({
    id: 'DB06', sport: BD, title: 'Nâng cầu khi bị ép ở lưới', phase: 'defending', role: 'Người giữ lưới',
    skill: 'doubles_defense', difficulty: 1350,
    prompt: 'Cầu thấp sát lưới, bạn bị ép. Đối thủ đang chờ tấn công.',
    cue: ['Cầu thấp sát lưới, không thể đập', 'Người lưới đối thủ đã áp sát (x khoảng 0,30)', 'Người sau đối thủ đứng lệch trái, góc cuối bên phải bỏ trống'],
    actors: [['me', 'Bạn (lưới)', 0.45, 0.60], ['partner', 'Partner', 0.62, 0.82], ['opp', 'Người giữ lưới', 0.30, 0.36], ['opp', 'Người sau', 0.40, 0.12], ['ball', 'Cầu', 0.46, 0.56]],
    actions: [['lift_deep', 'Nâng cao sâu cuối sân', 1], ['net', 'Bỏ nhỏ', 0.35], ['push', 'Đẩy phẳng', 0.2], ['smash', 'Đập xuống', 0]],
    targets: [['R-R', 'Góc cuối phải (xa người sau)', 0.85, 0.08, 1], ['R-C', 'Cuối sân giữa', 0.50, 0.08, 0.6], ['R-L', 'Góc cuối trái (gần người sau)', 0.15, 0.08, 0.3], ['M-C', 'Nâng ngắn giữa sân', 0.50, 0.28, 0.1]],
    trap: { kind: 'target', id: 'M-C', why: 'Nâng ngắn giữa sân để ép thời gian: nhưng cầu ngắn giữa sân sẽ bị đập thẳng vào bạn.' },
    explain: 'Đập xuống từ cầu thấp sát lưới là hard-fail. Khi bị ép, nâng cao sâu vào góc xa nhất để lấy thời gian về vị trí.',
  }),
  // ---------------- BONG DA ----------------
  S({
    id: 'FB01', sport: FB, title: 'Đối mặt tiền đạo: bạn là người cuối cùng', phase: 'defending', role: 'Trung vệ',
    skill: 'defensive_reading', difficulty: 1250,
    prompt: 'Tiền đạo đối phương đang cầm bóng lao vào. Đồng đội bọc lót đang chạy về.',
    cue: ['Đồng đội bọc lót còn cách khoảng 2 giây ở bên trái', 'Tiền đạo chạy nhanh vào giữa', 'Bạn còn khoảng không phía sau, thủ môn sẵn sàng'],
    actors: [['me', 'Bạn (trung vệ)', 0.50, 0.72], ['opp', 'Tiền đạo cầm bóng', 0.52, 0.60], ['partner', 'Đồng đội bọc lót', 0.28, 0.80], ['partner', 'Thủ môn', 0.50, 0.97], ['ball', 'Bóng', 0.52, 0.62]],
    actions: [['jockey', 'Kèm giữ khoảng cách, dẫn ra', 1], ['retreat', 'Lùi sâu chờ', 0.6], ['tackle', 'Lao vào cướp bóng', 0.25], ['foul', 'Kéo áo cản lại', 0]],
    targets: [['L', 'Dẫn về phía bọc lót (trái)', 0.30, 0.70, 1], ['C', 'Giữ thẳng giữa', 0.50, 0.74, 0.5], ['R', 'Ép ra phải (xa bọc lót)', 0.72, 0.70, 0.3]],
    trap: { kind: 'action', id: 'tackle', why: 'Lao vào cướp bóng: nếu trượt thì hết người chặn. Có đồng đội bọc lót nên kiếm thời gian.' },
    explain: 'Kéo áo trong vùng nguy hiểm là hard-fail (penalty, thẻ đỏ). Dẫn tiền đạo về phía bọc lót để đồng đội kịp về.',
  }),
  S({
    id: 'FB02', sport: FB, title: 'Bẫy việt vị khi tiền vệ đối phương bị ép', phase: 'defending', role: 'Hàng phòng ngự',
    skill: 'positioning', difficulty: 1300,
    prompt: 'Tiền vệ đối phương sắp chuyền xuyên tuyến. Tiền đạo của họ đang ở sau lưng hàng thủ. Cả hàng thủ cùng một đường.',
    cue: ['Tiền vệ đối phương đang bị ép, khó ngẩng đầu', 'Cả 4 hậu vệ đứng thẳng hàng', 'Tiền đạo đang ở vị trí việt vị so với đường bóng'],
    actors: [['me', 'Bạn (trung vệ)', 0.45, 0.62], ['partner', 'Trung vệ', 0.58, 0.62], ['partner', 'Hậu vệ trái', 0.20, 0.63], ['partner', 'Hậu vệ phải', 0.82, 0.62], ['partner', 'Tiền vệ ta ép bóng', 0.52, 0.50], ['opp', 'Tiền vệ cầm bóng', 0.50, 0.47], ['opp', 'Tiền đạo (sau lưng hàng thủ)', 0.60, 0.67]],
    actions: [['step_up', 'Cả hàng thủ cùng bước lên (bẫy việt vị)', 1], ['hold', 'Giữ nguyên đường', 0.55], ['drop', 'Lùi cả hàng', 0.5], ['step_up_alone', 'Một mình bước lên', 0]],
    targets: [],
    trap: { kind: 'action', id: 'drop', why: 'Bị chuyền xuyên thì lùi cho an toàn: lùi làm tiền đạo tự do nhận bóng.' },
    explain: 'Một mình bước lên là hard-fail: phá vỡ hàng, mở cửa cho tiền đạo. Khi tiền vệ bị ép, cả hàng cùng lên để bẫy việt vị.',
  }),
  S({
    id: 'FB02b', sport: FB, title: 'Giữ hàng khi tiền vệ đối phương thoải mái', phase: 'defending', role: 'Hàng phòng ngự',
    skill: 'positioning', difficulty: 1300, mirrorOf: 'FB02',
    prompt: 'Lần này tiền vệ đối phương không bị ép, có thời gian ngẩng đầu. Tiền đạo vẫn ở sau lưng hàng thủ.',
    cue: ['Không ai ép tiền vệ đối phương, họ có thời gian', 'Cả 4 hậu vệ đứng thẳng hàng', 'Tiền đạo đối phương sẵn sàng chạy vào khoảng trống'],
    actors: [['me', 'Bạn (trung vệ)', 0.45, 0.62], ['partner', 'Trung vệ', 0.58, 0.62], ['partner', 'Hậu vệ trái', 0.20, 0.63], ['partner', 'Hậu vệ phải', 0.82, 0.62], ['partner', 'Tiền vệ ta (xa bóng)', 0.30, 0.45], ['opp', 'Tiền vệ cầm bóng (tự do)', 0.50, 0.47], ['opp', 'Tiền đạo (sau lưng hàng thủ)', 0.60, 0.67]],
    actions: [['drop', 'Lùi cả hàng giữ khoảng cách', 1], ['hold', 'Giữ nguyên đường', 0.6], ['step_up', 'Cả hàng cùng bước lên (bẫy việt vị)', 0.15], ['step_up_alone', 'Một mình bước lên', 0]],
    targets: [],
    trap: { kind: 'action', id: 'step_up', why: 'Bẫy việt vị lúc nào cũng hay: bẫy chỉ hiệu quả khi người chuyền bị ép. Nếu họ thoải mái, họ chuyền xuyên qua lưng hàng thủ.' },
    explain: 'Cặp gương FB02: cùng hình dạng nhưng tiền vệ được nghỉ, nên phải lùi giữ khoảng cách thay vì bẫy việt vị.',
  }),
  S({
    id: 'FB03', sport: FB, title: 'Phạt góc của đối phương', phase: 'defending', role: 'Trung vệ',
    skill: 'positioning', difficulty: 1200,
    prompt: 'Phạt góc cho đối phương từ bên trái. Tiền đạo cao nhất của họ đứng gần chấm phạt đền. Bạn chọn vị trí.',
    cue: ['Bóng sẽ được treo vào vùng chấm phạt đền', 'Cột gần đã có đồng đội giữ', 'Tiền đạo cao nhất đang chuẩn bị tách ra'],
    actors: [['me', 'Bạn', 0.50, 0.86], ['partner', 'Đồng đội giữ cột gần', 0.40, 0.96], ['partner', 'Đồng đội giữ cột xa', 0.62, 0.95], ['opp', 'Tiền đạo cao nhất', 0.50, 0.84], ['opp', 'Người đá phạt góc', 0.02, 0.98]],
    actions: [['mark_man', 'Kèm sát tiền đạo cao nhất', 1], ['zone', 'Giữ khu vực chấm phạt đền', 0.6], ['near_post', 'Chạy ra cột gần', 0.3]],
    targets: [['spot', 'Ngay sau lưng tiền đạo (chặn hướng chạy)', 0.50, 0.88, 1], ['far', 'Cột xa', 0.62, 0.95, 0.4], ['near', 'Cột gần (đã có người)', 0.40, 0.96, 0.3], ['edge', 'Rìa vòng cấm', 0.50, 0.80, 0.2]],
    trap: { kind: 'action', id: 'near_post', why: 'Cột gần đã có đồng đội: chạy ra đó là bỏ trống người nguy hiểm nhất.' },
    explain: 'Người cao nhất là mục tiêu chính của bóng bổng. Kèm sát và chặn hướng chạy tốt hơn chạy ra chỗ đã có người.',
  }),
  S({
    id: 'FB04a', sport: FB, title: 'Ép hay giữ khi đối thủ quay lưng', phase: 'defending', role: 'Tiền vệ phòng ngự',
    skill: 'defensive_reading', difficulty: 1200,
    prompt: 'Đối phương nhận bóng quay lưng, hai đồng đội đã áp sát hai bên. Bạn là tiền vệ phòng ngự phía sau.',
    cue: ['Đối thủ quay lưng, khó xoay người', 'Hai đồng đội đã áp sát hai bên', 'Hàng thủ phía sau đã giữ cự ly'],
    actors: [['me', 'Bạn (tiền vệ phòng ngự)', 0.50, 0.52], ['opp', 'Tiền vệ nhận bóng quay lưng', 0.46, 0.44], ['partner', 'Đồng đội áp sát trái', 0.38, 0.45], ['partner', 'Đồng đội áp sát phải', 0.56, 0.45], ['ball', 'Bóng', 0.46, 0.45]],
    actions: [['press', 'Lên ép ngay', 1], ['hold', 'Giữ vị trí che đường chuyền', 0.5], ['drop', 'Lùi về', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'hold', why: 'Giữ vị trí cho an toàn: bỏ lỡ lúc đối thủ bị bất động nhất.' },
    explain: 'Đối thủ quay lưng và có hai người sẵn sàng áp sát là tín hiệu ép. Cùng một vị trí bóng nhưng đổi cự ly đồng đội thì đáp án đổi.',
  }),
  S({
    id: 'FB04b', sport: FB, title: 'Giữ hay ép khi đồng đội chưa kịp lên', phase: 'defending', role: 'Tiền vệ phòng ngự',
    skill: 'defensive_reading', difficulty: 1200, mirrorOf: 'FB04a',
    prompt: 'Đối phương nhận bóng, quay mặt về phía bạn. Đồng đội chưa kịp lên áp sát.',
    cue: ['Đối thủ quay mặt về phía bạn, nhìn rõ sân', 'Đồng đội ở xa, chưa kịp áp sát', 'Nếu bạn lên một mình, dễ bị cắt qua người'],
    actors: [['me', 'Bạn (tiền vệ phòng ngự)', 0.50, 0.52], ['opp', 'Tiền vệ nhận bóng (nhìn thẳng)', 0.46, 0.44], ['partner', 'Đồng đội (xa)', 0.30, 0.58], ['partner', 'Đồng đội (xa)', 0.68, 0.58], ['ball', 'Bóng', 0.46, 0.45]],
    actions: [['hold', 'Giữ vị trí che đường chuyền', 1], ['drop', 'Lùi về giữ cự ly', 0.6], ['press', 'Lên ép ngay', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'press', why: 'Lúc nào cũng ép cho nhiệt huyết: ép lẻ khi đồng đội chưa theo kịp sẽ bị chuyền thẳng qua người.' },
    explain: 'Cặp gương FB04a: cùng vị trí bóng, khác nhau ở tín hiệu quay lưng và sự có mặt của đồng đội.',
  }),
  S({
    id: 'FB05', sport: FB, title: 'Mất bóng, đối phương phản công 3 đánh 2', phase: 'defending', role: 'Tiền vệ trung tâm',
    skill: 'transition', difficulty: 1300,
    prompt: 'Vừa mất bóng ở giữa sân. Đối phương phản công 3 đánh 2 với hàng thủ của ta.',
    cue: ['3 tiền đạo đối phương chạy ba hướng trái, giữa, phải', 'Hàng thủ chỉ còn 2 người', 'Bạn cách bóng 12 m, cách hành lang giữa 8 m'],
    actors: [['me', 'Bạn (tiền vệ)', 0.50, 0.46], ['opp', 'Người cầm bóng', 0.52, 0.52], ['opp', 'Tiền đạo trái', 0.25, 0.55], ['opp', 'Tiền đạo phải', 0.78, 0.55], ['partner', 'Trung vệ', 0.42, 0.80], ['partner', 'Trung vệ', 0.58, 0.80], ['ball', 'Bóng', 0.52, 0.53]],
    actions: [['sprint_back', 'Chạy hồi phòng chặn đường chuyền giữa', 1], ['jog', 'Chạy chậm về giữ cự ly', 0.5], ['press_ball', 'Ép tiếp người cầm bóng', 0.35], ['stand', 'Đứng lại không về', 0]],
    targets: [['mid', 'Che hành lang giữa', 0.50, 0.62, 1], ['ball', 'Áp sát người có bóng', 0.55, 0.56, 0.45], ['wing', 'Chạy về cánh', 0.20, 0.62, 0.3]],
    trap: { kind: 'action', id: 'press_ball', why: 'Ép người cầm bóng để cướp lại: nhưng bạn đang bị vượt, ép lẻ dễ bị chuyền cho người chạy.' },
    explain: 'Đứng lại không về là hard-fail trong phản công số lượng. Hồi phòng che hành lang giữa, cho hàng thủ thời gian.',
  }),
  S({
    id: 'FB06', sport: FB, title: 'Chọn đường chuyền dưới áp lực', phase: 'attacking', role: 'Tiền vệ trung tâm',
    skill: 'passing_choice', difficulty: 1200,
    prompt: 'Bạn nhận bóng giữa sân, đối thủ ép dày bên phải. Chọn đường chuyền.',
    cue: ['Hai đối thủ ép dày bên phải bóng', 'Cánh trái ta đang bỏ trống hoàn toàn', 'Đường chuyền xuyên cho tiền đạo có tiền vệ đối thủ chặn'],
    actors: [['me', 'Bạn', 0.50, 0.55], ['opp', 'Đối thủ ép 1', 0.58, 0.52], ['opp', 'Đối thủ ép 2', 0.52, 0.46], ['opp', 'Tiền vệ chặn giữa', 0.45, 0.40], ['partner', 'Cánh trái (tự do)', 0.10, 0.45], ['partner', 'Tiền đạo (bị kèm)', 0.50, 0.20], ['partner', 'Trung vệ', 0.50, 0.72], ['ball', 'Bóng', 0.50, 0.55]],
    actions: [['pass', 'Chuyền bóng', 1], ['dribble', 'Rê bóng thoát ép', 0.3, true], ['hold', 'Giữ bóng', 0.2, true]],
    targets: [['LW', 'Chuyền sang cánh trái (tự do)', 0.10, 0.45, 1], ['CB', 'Chuyền lùi cho trung vệ', 0.50, 0.72, 0.5], ['ST', 'Chuyền xuyên cho tiền đạo', 0.50, 0.20, 0.2]],
    trap: { kind: 'target', id: 'ST', why: 'Chuyền xuyên cho tiền đạo nghe hay nhất, nhưng bị chặn giữa nên dễ mất bóng gần khung thành mình.' },
    explain: 'Đối thủ ép dày một bên thì bên kia tự do. Chuyền ngang sang cánh trái giữ bóng và tạo khoảng trống.',
  }),
  S({
    id: 'FB07', sport: FB, title: 'Đối mặt thủ môn ở góc hẹp', phase: 'attacking', role: 'Tiền đạo',
    skill: 'finishing', difficulty: 1150,
    prompt: 'Bạn đối mặt thủ môn nhưng ở góc hẹp bên phải. Đồng đội bên trái hoàn toàn trống.',
    cue: ['Góc sút hẹp (khoảng 20 độ)', 'Hậu vệ đang đuổi sát phía sau', 'Đồng đội trống ở gần chấm 5m50, thủ môn lệch về phía bạn'],
    actors: [['me', 'Bạn (tiền đạo)', 0.62, 0.14], ['opp', 'Thủ môn', 0.50, 0.03], ['opp', 'Hậu vệ đuổi theo', 0.55, 0.22], ['partner', 'Đồng đội trống', 0.35, 0.12], ['ball', 'Bóng', 0.62, 0.15]],
    actions: [['square_pass', 'Chuyền ngang cho đồng đội trống', 1], ['dribble', 'Rê qua thủ môn', 0.55], ['shoot', 'Sút luôn', 0.45], ['chip', 'Đá vọt qua đầu', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'shoot', why: 'Đối mặt thủ môn là phải sút: góc hẹp và hậu vệ đuổi sát, chuyền cho người trống ăn hơn.' },
    explain: 'Góc hẹp, thủ môn lệch về phía bạn và đồng đội trống thì chuyền ngang cho xác suất ghi bàn cao hơn.',
  }),
  S({
    id: 'FB08', sport: FB, title: 'Tạt biên: tạt bóng hay cắt lùi', phase: 'attacking', role: 'Tiền vệ cánh',
    skill: 'passing_choice', difficulty: 1150,
    prompt: 'Bạn có bóng sát đường biên ngang bên phải, gần đường cuối sân.',
    cue: ['Hai trung vệ đối phương đang co về cột gần', 'Tiền vệ đồng đội chạy vào rìa vòng cấm không bị kèm', 'Bạn sát đường biên ngang, hậu vệ đang áp sát'],
    actors: [['me', 'Bạn (cánh phải)', 0.90, 0.20], ['opp', 'Hậu vệ', 0.82, 0.24], ['opp', 'Trung vệ', 0.58, 0.10], ['opp', 'Trung vệ', 0.45, 0.10], ['partner', 'Tiền vệ vào rìa cấm (trống)', 0.62, 0.28], ['partner', 'Tiền đạo ở chấm phạt đền (bị kèm)', 0.50, 0.12], ['ball', 'Bóng', 0.90, 0.21]],
    actions: [['cutback', 'Cắt lùi chuyền ngang vào rìa cấm', 1], ['high_cross', 'Tạt bóng vào vùng cấm', 0.5], ['dribble_in', 'Rê vào trong', 0.4, true], ['shoot_angle', 'Sút từ góc hẹp', 0.25, true]],
    targets: [['edge', 'Rìa vòng cấm (đồng đội trống)', 0.62, 0.28, 1], ['far', 'Cột xa', 0.35, 0.07, 0.4], ['pen', 'Chấm phạt đền (bị kèm)', 0.50, 0.12, 0.3]],
    trap: { kind: 'action', id: 'high_cross', why: 'Có cánh là tạt bóng cao: nhưng hai trung vệ đã co về cột gần, bóng cao sẽ bị cắt.' },
    explain: 'Khi hàng thủ co về cột gần, khoảng trống nằm ở rìa vòng cấm. Cắt lùi về người chạy vào là lựa chọn tốt nhất.',
  }),
  // ---------------- CAU LONG DOI (bo sung, ban 2: DB07-DB16 doi ma thanh DB22-DB31) ----------------
  S({
    id: 'DB22', sport: BD, title: 'Ai lấy cầu cao giữa sân khi partner ở lưới', phase: 'neutral', role: 'Người phòng thủ bên phải',
    skill: 'rotation', difficulty: 1150,
    prompt: 'Cầu bổng cao rơi vào giữa sân. Partner đang ở lưới phía trước, bạn ở vị trí phòng thủ bên phải.',
    cue: ['Cầu bổng cao, rơi vào giữa sân', 'Partner ở lưới, quay lưng về phía cầu', 'Bạn ở phía sau, nhìn rõ đường cầu'],
    actors: [['me', 'Bạn', 0.68, 0.82], ['partner', 'Partner (lưới)', 0.45, 0.58], ['opp', 'Đối thủ A', 0.30, 0.24], ['opp', 'Đối thủ B', 0.70, 0.20], ['ball', 'Cầu', 0.52, 0.72]],
    actions: [['take', 'Di chuyển vào giữa lấy cầu', 1], ['call_partner', 'Gọi partner lấy', 0.4], ['back', 'Lùi ra sau', 0.3], ['stand', 'Đứng yên chờ', 0.2]],
    targets: [],
    trap: { kind: 'action', id: 'call_partner', why: 'Gọi partner lấy: partner đang ở lưới không kịp lùi, cầu sẽ rơi xuống sân.' },
    explain: 'Người đứng sau nhìn thấy cầu và có thời gian di chuyển, nên lấy cầu cao giữa sân. Người lưới giữ vị trí phía trước.',
  }),
  S({
    id: 'DB23', sport: BD, title: 'Xoay vòng sau cú smash từ bên trái', phase: 'attacking', role: 'Người cuối sân',
    skill: 'rotation', difficulty: 1250,
    prompt: 'Bạn vừa đập cầu từ bên trái. Partner đang ở giữa sân chuẩn bị lùi. Chọn vị trí tiếp theo.',
    cue: ['Bạn vừa đập từ cuối sân bên trái', 'Partner ở giữa sân, chuẩn bị lùi xuống', 'Hai đối thủ đứng song song phòng thủ'],
    actors: [['me', 'Bạn', 0.30, 0.84], ['partner', 'Partner', 0.50, 0.68], ['opp', 'Đối thủ A', 0.30, 0.26], ['opp', 'Đối thủ B', 0.70, 0.26], ['ball', 'Cầu', 0.34, 0.34]],
    actions: [['front_left', 'Tiến lên giữ lưới trái', 1], ['front_right', 'Chạy sang phải giữ lưới', 0.4], ['stay', 'Đứng nguyên chờ', 0.3], ['back_left', 'Lùi về cuối sân trái', 0.2]],
    targets: [],
    trap: { kind: 'action', id: 'back_left', why: 'Lùi về cuối sân trái là thói quen đánh đơn. Trong tình huống này partner đã chuẩn bị lùi, nên bạn lên lưới để hai người không chồng vị trí.' },
    explain: 'Khi partner đã lùi xuống để nhận cầu sau, người vừa đập tiến lên giữ lưới cùng phía để đội hình trước-sau không bị hở.',
  }),
  S({
    id: 'DB24', sport: BD, title: 'Phòng thủ đập chéo, chọn đường trả', phase: 'defending', role: 'Người phòng thủ bên trái',
    skill: 'doubles_defense', difficulty: 1250,
    prompt: 'Đối thủ đập chéo xuống góc trái tay bạn. Người lưới đối thủ chực sẵn giữa sân.',
    cue: ['Cú đập chéo về góc trái tay', 'Người lưới đối thủ đứng chờ ở giữa', 'Partner cùng hàng, che khoảng bên phải'],
    actors: [['me', 'Bạn', 0.25, 0.80], ['partner', 'Partner', 0.70, 0.78], ['opp', 'Người đập', 0.75, 0.10], ['opp', 'Người lưới', 0.50, 0.38], ['ball', 'Cầu', 0.20, 0.78]],
    actions: [['drive', 'Đỡ phẳng về giữa sân', 1], ['block', 'Chặn ngắn sát lưới', 0.65], ['lift', 'Nâng cao cuối sân', 0.4], ['smash', 'Đập trả', 0.2]],
    targets: [['M-C', 'Giữa sân', 0.50, 0.25, 1], ['R-C', 'Cuối sân', 0.50, 0.08, 0.5], ['F-C', 'Lưới', 0.50, 0.43, 0.5], ['X', 'Chéo góc', 0.85, 0.10, 0.35]],
    trap: { kind: 'action', id: 'lift', why: 'Nâng cao cuối sân nghe an toàn nhưng đưa cầu cho đối thủ tiếp tục đập.' },
    explain: 'Đỡ phẳng về giữa sân kéo cầu ra khỏi tầm đập và buộc đối thủ đánh lên, giúp đội bạn lấy lại nhịp.',
  }),
  S({
    id: 'DB25', sport: BD, title: 'Đập cầu từ giữa sân khi partner đã lên lưới', phase: 'attacking', role: 'Người cuối sân',
    skill: 'doubles_attack', difficulty: 1200,
    prompt: 'Partner vừa giao cầu ngắn, đối thủ đẩy cầu cao về giữa sân. Partner đang ở lưới.',
    cue: ['Cầu cao về giữa sân, tầm đánh thuận lợi', 'Partner đã ở lưới, sẵn sàng bắt cầu trả ngắn', 'Hai đối thủ đứng song song'],
    actors: [['me', 'Bạn', 0.55, 0.74], ['partner', 'Partner (lưới)', 0.45, 0.58], ['opp', 'Đối thủ A', 0.30, 0.28], ['opp', 'Đối thủ B', 0.70, 0.30], ['ball', 'Cầu', 0.56, 0.66]],
    actions: [['smash', 'Đập cầu', 1], ['drop', 'Cắt cầu', 0.55], ['clear', 'Phông cầu', 0.4], ['drive', 'Đánh ngang', 0.3]],
    targets: [['M-C', 'Giữa hai người đối thủ', 0.50, 0.28, 1], ['R-L', 'Góc cuối', 0.15, 0.08, 0.5], ['M-L', 'Vào người gần', 0.30, 0.28, 0.35], ['F-C', 'Sát lưới', 0.50, 0.43, 0.25]],
    trap: { kind: 'action', id: 'clear', why: 'Phông cầu bỏ lỡ cơ hội tấn công trong khi partner đã sẵn sàng ở lưới.' },
    explain: 'Cầu cao ở giữa sân và partner đã giữ lưới là thế tấn công trước-sau lý tưởng. Đập vào khe giữa ép hai đối thủ đỡ nhau.',
  }),
  S({
    id: 'DB26', sport: BD, title: 'Đứng ở đâu khi partner giao cầu', phase: 'neutral', role: 'Đồng đội người giao cầu',
    skill: 'serve_receive', difficulty: 1100,
    prompt: 'Partner đang giao cầu ở ô phải. Bạn nên đứng ở đâu?',
    cue: ['Partner giao từ ô phải, sẽ giữ lưới sau cú giao', 'Người nhận có thể đẩy cầu sâu về phía trái', 'Phần sân sau đang không có ai'],
    actors: [['me', 'Bạn', 0.42, 0.78], ['partner', 'Partner (giao cầu)', 0.56, 0.63], ['opp', 'Người nhận', 0.40, 0.39], ['opp', 'Người sau', 0.60, 0.18]],
    actions: [['mid_left', 'Giữa sân, hơi lệch trái để bọc phần sân đối diện', 1], ['parallel', 'Đứng song song partner', 0.4], ['back_center', 'Cuối sân giữa', 0.35], ['net_right', 'Sát lưới bên phải partner', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'parallel', why: 'Đứng song song với partner: nếu đối thủ đẩy cầu sâu về bên trái sẽ không ai bọc.' },
    explain: 'Người giao cầu giữ phía trước, bạn đứng sau giữa sân hơi lệch trái để kịp bọc cả cầu đẩy sâu lẫn cầu về góc trái.',
  }),
  S({
    id: 'DB27', sport: BD, title: 'Bọc lưới sau cú đập của partner', phase: 'attacking', role: 'Người giữ lưới',
    skill: 'net_play', difficulty: 1200,
    prompt: 'Partner đập cầu từ cuối sân bên phải. Bạn đang ở lưới giữa. Cầu có thể bị chặn rơi xuống lưới.',
    cue: ['Partner đập từ cuối sân bên phải', 'Đối thủ phòng thủ có thể chặn ngắn hai bên', 'Bạn đang đứng ở lưới giữa'],
    actors: [['me', 'Bạn (lưới)', 0.50, 0.60], ['partner', 'Partner (đập cầu)', 0.75, 0.84], ['opp', 'Đối thủ A', 0.30, 0.26], ['opp', 'Đối thủ B', 0.70, 0.26], ['ball', 'Cầu', 0.66, 0.36]],
    actions: [['cover_both', 'Giữ vợt cao, sẵn sàng bọc lưới cả hai bên', 1], ['back_left', 'Lùi về cuối sân trái', 0.4], ['stand', 'Đứng yên giữa lưới, hạ vợt', 0.3], ['right', 'Chạy sang phải sát partner', 0.25]],
    targets: [],
    trap: { kind: 'action', id: 'back_left', why: 'Lùi về cuối sân trái: cầu bị chặn ngắn sẽ không ai bắt.' },
    explain: 'Sau smash, cú trả thường gặp nhất là chặn ngắn. Người lưới giơ vợt cao, sẵn sàng bắt cả hai bên.',
  }),
  S({
    id: 'DB28', sport: BD, title: 'Chuyển phòng thủ thành tấn công', phase: 'attacking', role: 'Người phòng thủ',
    skill: 'transition', difficulty: 1250,
    prompt: 'Bạn vừa chặn cầu về lưới đối thủ. Đối thủ lùi về cuối sân đẩy cầu cao. Partner đang ở lưới.',
    cue: ['Đối thủ phải nâng cầu lên, bạn có tầm đánh cao', 'Partner đã ở lưới', 'Người lưới đối thủ đứng bên phải'],
    actors: [['me', 'Bạn', 0.40, 0.76], ['partner', 'Partner (lưới)', 0.55, 0.58], ['opp', 'Đối thủ cuối sân', 0.35, 0.15], ['opp', 'Người lưới', 0.65, 0.36], ['ball', 'Cầu', 0.42, 0.68]],
    actions: [['smash', 'Đập cầu', 1], ['drop', 'Cắt cầu', 0.5], ['clear', 'Phông cầu', 0.4], ['push', 'Đẩy cầu', 0.3]],
    targets: [['M-C', 'Giữa hai người đối thủ', 0.50, 0.26, 1], ['far', 'Góc xa người lưới', 0.15, 0.10, 0.55], ['body', 'Vào người', 0.35, 0.18, 0.4], ['F-C', 'Sát lưới', 0.50, 0.43, 0.25]],
    trap: { kind: 'action', id: 'clear', why: 'Phông cầu bỏ lỡ cơ hội tấn công ngay sau khi vừa chuyển thế.' },
    explain: 'Khi đối thủ buộc phải nâng cầu, đội bạn đã chuyển sang tấn công. Đập ngay vào khe giữa để giữ thế chủ động.',
  }),
  S({
    id: 'DB29', sport: BD, title: 'Kết thúc điểm khi đối thủ mất thăng bằng', phase: 'attacking', role: 'Người cuối sân',
    skill: 'doubles_attack', difficulty: 1250,
    prompt: 'Đối thủ vừa mất thăng bằng ở giữa sân. Cầu bổng đến trước mặt bạn, partner đang ở lưới.',
    cue: ['Một đối thủ mất thăng bằng ở giữa sân', 'Người lưới đối thủ đứng bên trái', 'Partner đã giữ lưới, cầu bổng trước mặt bạn'],
    actors: [['me', 'Bạn', 0.30, 0.78], ['partner', 'Partner (lưới)', 0.50, 0.58], ['opp', 'Đối thủ mất thăng bằng', 0.55, 0.26], ['opp', 'Người lưới', 0.30, 0.38], ['ball', 'Cầu', 0.32, 0.70]],
    actions: [['smash_cross', 'Đập cầu chéo xa người lưới', 1], ['smash_body', 'Đập thẳng vào người', 0.5], ['drop', 'Bỏ nhỏ', 0.4], ['drive', 'Đánh ngang', 0.25]],
    targets: [['cross', 'Chéo góc xa người đứng lưới', 0.85, 0.24, 1], ['mid', 'Giữa sân', 0.45, 0.20, 0.5], ['body', 'Vào người', 0.55, 0.28, 0.4], ['near', 'Góc gần', 0.15, 0.10, 0.35]],
    trap: { kind: 'action', id: 'drop', why: 'Bỏ nhỏ: partner đã ở lưới, bỏ nhỏ vừa chồng vị trí vừa mất lợi thế kết thúc.' },
    explain: 'Đối thủ chưa lấy lại thăng bằng, người lưới ở bên trái. Đập chéo sang phải là đường xa nhất với cả hai người.',
  }),
  S({
    id: 'DB30', sport: BD, title: 'Giao cầu khi người nhận chực sẵn tấn công', phase: 'neutral', role: 'Người giao cầu',
    skill: 'serve_receive', difficulty: 1200,
    prompt: 'Bạn giao cầu. Người nhận đứng cao, vợt giơ lên, sẵn sàng đập. Partner ở giữa sân.',
    cue: ['Người nhận đứng cao, vợt giơ sẵn', 'Mọi cú giao bổng đều rơi vào tầm đập', 'Partner ở giữa sân phía sau bạn'],
    actors: [['me', 'Bạn (giao cầu)', 0.55, 0.66], ['partner', 'Partner', 0.45, 0.78], ['opp', 'Người nhận (vợt giơ cao)', 0.60, 0.38], ['opp', 'Người sau', 0.40, 0.18]],
    actions: [['short', 'Giao ngắn thấp sát vạch', 1], ['long', 'Giao cao sâu', 0.4], ['flick', 'Giao bổng nhanh (flick)', 0.3], ['drive', 'Giao phẳng nhanh', 0.25]],
    targets: [['F-T', 'Sát vạch giao ngắn, gần đường giữa', 0.53, 0.38, 1], ['side', 'Sát biên', 0.88, 0.36, 0.4], ['B-C', 'Cuối ô giao', 0.60, 0.10, 0.35]],
    trap: { kind: 'action', id: 'flick', why: 'Flick: người nhận đã ở thế cao, cầu bổng sẽ bị đập thẳng xuống.' },
    explain: 'Khi người nhận chực sẵn tấn công, giao ngắn thấp sát vạch buộc họ phải đánh lên thay vì đập xuống.',
  }),
  S({
    id: 'DB31', sport: BD, title: 'Đỡ smash vào góc trái tay khi partner ở giữa', phase: 'defending', role: 'Người phòng thủ bên trái',
    skill: 'doubles_defense', difficulty: 1300,
    prompt: 'Đối thủ đập mạnh xuống góc trái tay của bạn. Partner đứng giữa sân chờ bọc.',
    cue: ['Cú đập mạnh về góc trái tay', 'Người lưới đối thủ đứng lệch trái', 'Phía phải sân đối thủ đang trống'],
    actors: [['me', 'Bạn', 0.25, 0.80], ['partner', 'Partner', 0.55, 0.72], ['opp', 'Người đập', 0.30, 0.10], ['opp', 'Người lưới', 0.40, 0.38], ['ball', 'Cầu', 0.18, 0.80]],
    actions: [['drive_cross', 'Đỡ phẳng chéo sang phải', 1], ['block', 'Chặn ngắn về lưới trái', 0.55], ['lift', 'Nâng cao giữa sân', 0.4], ['smash', 'Đập trả', 0.25]],
    targets: [['M-R', 'Giữa sân chếch phải', 0.72, 0.28, 1], ['R-R', 'Cuối sân phải', 0.80, 0.08, 0.5], ['F-L', 'Lưới trái', 0.25, 0.43, 0.5], ['M-C', 'Giữa sân', 0.50, 0.28, 0.35]],
    trap: { kind: 'action', id: 'lift', why: 'Nâng cao giữa sân đưa cầu về đúng tầm đập của đối thủ.' },
    explain: 'Cả hai đối thủ đều lệch trái. Đỡ phẳng chéo sang phải đưa cầu vào vùng trống và cắt nhịp tấn công.',
  }),
  // ---------------- BONG DA (bo sung FB09-FB16) ----------------
  S({
    id: 'FB09', sport: FB, title: 'Chọn vị trí khi đội tấn công cánh phải', phase: 'attacking', role: 'Hậu vệ cánh trái',
    skill: 'positioning', difficulty: 1150,
    prompt: 'Đồng đội đang tấn công cánh phải. Bạn là hậu vệ cánh trái. Chọn vị trí.',
    cue: ['Đội đang tấn công bên cánh phải', 'Tiền vệ cánh đối phương đứng chờ phản công bên trái', 'Hai trung vệ ở lại phía sau'],
    actors: [['me', 'Bạn (hậu vệ trái)', 0.12, 0.64], ['partner', 'Cánh phải cầm bóng', 0.85, 0.30], ['partner', 'Tiền vệ', 0.45, 0.45], ['partner', 'Trung vệ', 0.40, 0.72], ['partner', 'Trung vệ', 0.60, 0.72], ['opp', 'Cánh đối phương', 0.18, 0.52], ['opp', 'Hậu vệ đối phương', 0.80, 0.24], ['ball', 'Bóng', 0.85, 0.31]],
    actions: [['support', 'Dâng lên ngang hàng tiền vệ, bọc cánh trái', 1], ['stay', 'Ở lại hàng thủ', 0.5], ['overlap_high', 'Dâng cao tận vòng cấm đối phương', 0.3], ['cross_over', 'Chạy sang cánh phải hỗ trợ', 0.25]],
    targets: [],
    trap: { kind: 'action', id: 'overlap_high', why: 'Dâng cao tận vòng cấm đối phương bỏ trống cánh trái khi mất bóng.' },
    explain: 'Bóng ở cánh xa, hậu vệ cánh bên kia dâng vừa phải: vừa hỗ trợ tấn công, vừa kịp chặn phản công bên trái.',
  }),
  S({
    id: 'FB10', sport: FB, title: 'Chuyền bóng khi bị ép ở biên', phase: 'defending', role: 'Hậu vệ cánh',
    skill: 'passing_choice', difficulty: 1200,
    prompt: 'Bạn nhận bóng sát biên, đối thủ ép sát và đồng đội chưa lên kịp.',
    cue: ['Đối thủ ép sát, biên dọc chặn một phía', 'Trung vệ và thủ môn đang trống phía sau', 'Đồng đội phía trên chưa lên kịp'],
    actors: [['me', 'Bạn', 0.06, 0.72], ['opp', 'Đối thủ ép', 0.12, 0.68], ['opp', 'Đối thủ', 0.30, 0.60], ['partner', 'Trung vệ', 0.40, 0.80], ['partner', 'Thủ môn', 0.50, 0.97], ['partner', 'Tiền đạo', 0.50, 0.25], ['ball', 'Bóng', 0.07, 0.73]],
    actions: [['back_pass', 'Chuyền về trung vệ hoặc thủ môn', 1], ['clear_line', 'Phá bóng ra biên', 0.55], ['long', 'Chuyền dài lên tiền đạo', 0.4], ['dribble', 'Cố rê qua người', 0.35]],
    targets: [],
    trap: { kind: 'action', id: 'dribble', why: 'Cố rê qua người dễ mất bóng ngay ở vị trí nguy hiểm.' },
    explain: 'Bị ép sát biên mà đồng đội chưa lên, chuyền về người trống phía sau giữ được bóng và cho đội thời gian dàn xếp.',
  }),
  S({
    id: 'FB11', sport: FB, title: 'Đối mặt 2 đánh 1 khi phòng ngự', phase: 'defending', role: 'Trung vệ',
    skill: 'defensive_reading', difficulty: 1300,
    prompt: 'Đối thủ phản công 2 đánh 1 với bạn. Một người có bóng, một người chạy chỗ.',
    cue: ['Bạn là người phòng ngự duy nhất', 'Người có bóng và người chạy chỗ cách nhau khoảng 15 m', 'Đồng đội đang chạy về hỗ trợ'],
    actors: [['me', 'Bạn (trung vệ)', 0.50, 0.75], ['opp', 'Người cầm bóng', 0.40, 0.60], ['opp', 'Người chạy chỗ', 0.68, 0.62], ['partner', 'Thủ môn', 0.50, 0.97], ['partner', 'Đồng đội chạy về', 0.30, 0.45], ['ball', 'Bóng', 0.41, 0.61]],
    actions: [['hold_middle', 'Giữ vị trí giữa, chặn đường chuyền, chờ hỗ trợ', 1], ['retreat_gk', 'Lùi về sát thủ môn', 0.4], ['mark_runner', 'Bám người chạy chỗ', 0.35], ['dive', 'Lao vào người có bóng', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'mark_runner', why: 'Bám người chạy chỗ để người có bóng tự do sút.' },
    explain: 'Trong thế 2 đánh 1, đứng giữa hai người vừa che đường chuyền vừa đe dọa người có bóng, kéo dài thời gian cho đồng đội về.',
  }),
  S({
    id: 'FB12', sport: FB, title: 'Nhận bóng từ thủ môn dưới áp lực', phase: 'attacking', role: 'Trung vệ',
    skill: 'passing_choice', difficulty: 1250,
    prompt: 'Thủ môn chuyền cho bạn, đối thủ ép sát từ phía sau.',
    cue: ['Đối thủ áp sát lưng bạn', 'Trung vệ bên cạnh đang trống', 'Tiền vệ bị kèm lỏng ở giữa sân'],
    actors: [['me', 'Bạn (trung vệ)', 0.38, 0.84], ['opp', 'Đối thủ ép sau lưng', 0.36, 0.79], ['partner', 'Trung vệ bên cạnh', 0.70, 0.82], ['partner', 'Thủ môn', 0.50, 0.97], ['partner', 'Tiền vệ', 0.50, 0.60], ['partner', 'Tiền đạo', 0.50, 0.25], ['ball', 'Bóng', 0.39, 0.85]],
    actions: [['one_touch', 'Chuyền một chạm', 1], ['clear', 'Phá bóng lên', 0.5, true], ['turn', 'Đỡ bóng rồi xoay', 0.4, true], ['dribble', 'Đỡ bóng rồi rê', 0.3, true]],
    targets: [['CB2', 'Trung vệ bên cạnh / hậu vệ cánh', 0.70, 0.82, 1], ['CM', 'Tiền vệ', 0.50, 0.60, 0.5], ['GK', 'Thủ môn', 0.50, 0.97, 0.4], ['ST', 'Tiền đạo', 0.50, 0.25, 0.3]],
    trap: { kind: 'action', id: 'turn', why: 'Đỡ bóng rồi xoay khi đối thủ ép sát rất dễ bị đoán và cướp bóng.' },
    explain: 'Có người ép sau lưng thì không xoay. Chuyền một chạm sang người trống bên cạnh giữ bóng an toàn.',
  }),
  S({
    id: 'FB13', sport: FB, title: 'Khung thành đối phương bỏ trống', phase: 'attacking', role: 'Hậu vệ',
    skill: 'finishing', difficulty: 1200,
    prompt: 'Phút cuối, đối phương đang thua nên thủ môn của họ lên vòng cấm đội bạn đánh đầu. Bóng bật ra đến chân bạn ở giữa sân, khung thành đối phương bỏ trống.',
    cue: ['Thủ môn đối phương còn ở phần sân nhà bạn', 'Khung thành đối phương hoàn toàn trống', 'Đối thủ đang đuổi theo sau lưng'],
    actors: [['me', 'Bạn', 0.50, 0.50], ['opp', 'Thủ môn đối phương (đã lên)', 0.45, 0.88], ['opp', 'Đối thủ đuổi theo', 0.55, 0.60], ['partner', 'Đồng đội', 0.30, 0.48], ['ball', 'Bóng', 0.50, 0.51]],
    actions: [['shoot', 'Sút ngay về khung thành trống', 1], ['carry', 'Dẫn bóng lên', 0.5], ['pass_near', 'Chuyền cho đồng đội gần', 0.4], ['pass_back', 'Chuyền về phần sân nhà', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'carry', why: 'Dẫn bóng lên mất thời gian, đối thủ kịp lùi về.' },
    explain: 'Khung thành trống và không ai chặn trước mặt: sút ngay là cơ hội ghi bàn cao nhất trước khi đối thủ kịp về.',
  }),
  S({
    id: 'FB14', sport: FB, title: 'Đá phạt trực tiếp gần vòng cấm', phase: 'attacking', role: 'Tiền vệ',
    skill: 'set_piece', difficulty: 1200,
    prompt: 'Đá phạt trực tiếp cách khung thành 22 m, chếch bên phải. Đối phương dựng hàng rào 4 người.',
    cue: ['Khoảng cách 22 m, chếch phải', 'Hàng rào 4 người che góc gần', 'Thủ môn đứng lệch về góc xa'],
    actors: [['me', 'Bạn', 0.66, 0.21], ['opp', 'Hàng rào (4 người)', 0.58, 0.15], ['opp', 'Thủ môn', 0.48, 0.02], ['partner', 'Đồng đội đứng gần', 0.76, 0.23], ['partner', 'Đồng đội trong vòng cấm', 0.42, 0.08], ['ball', 'Bóng', 0.66, 0.215]],
    actions: [['curl_far', 'Sút xoáy qua hàng rào vào góc xa', 1], ['cross', 'Tạt bóng vào vòng cấm', 0.55], ['near_post', 'Sút thẳng vào góc gần', 0.4], ['short', 'Chuyền ngắn cho đồng đội', 0.3]],
    targets: [],
    trap: { kind: 'action', id: 'near_post', why: 'Sút thẳng vào góc gần: hàng rào đã che, thủ môn dễ bắt.' },
    explain: 'Ở 22 m, góc gần đã bị hàng rào che. Cú xoáy qua hàng rào vào góc xa là đường thủ môn khó với tới nhất.',
  }),
  S({
    id: 'FB15', sport: FB, title: 'Chuyền bóng khi bị ép bởi 2 người', phase: 'attacking', role: 'Tiền vệ trung tâm',
    skill: 'passing_choice', difficulty: 1250,
    prompt: 'Bạn nhận bóng giữa sân, hai đối thủ ép từ hai bên. Đồng đội đang di chuyển.',
    cue: ['Hai đối thủ khép từ hai bên', 'Một đồng đội đang di chuyển vào khoảng trống bên trái', 'Tiền đạo phía trên bị kèm'],
    actors: [['me', 'Bạn', 0.50, 0.55], ['opp', 'Đối thủ ép trái', 0.43, 0.53], ['opp', 'Đối thủ ép phải', 0.57, 0.53], ['partner', 'Đồng đội trống', 0.25, 0.60], ['partner', 'Tiền đạo (bị kèm)', 0.50, 0.30], ['opp', 'Hậu vệ kèm', 0.50, 0.27], ['ball', 'Bóng', 0.50, 0.56]],
    actions: [['one_touch', 'Chuyền một chạm về phía đồng đội đang trống', 1], ['long', 'Chuyền dài mạo hiểm', 0.35], ['dribble', 'Rê bóng thoát', 0.3], ['hold', 'Giữ bóng chờ', 0.2]],
    targets: [],
    trap: { kind: 'action', id: 'dribble', why: 'Rê bóng thoát: bị ép từ hai bên, rê bóng rất dễ mất.' },
    explain: 'Hai người ép mình thì chắc chắn có đồng đội trống. Chuyền một chạm trước khi bị khép lại.',
  }),
  S({
    id: 'FB16', sport: FB, title: 'Phá bóng khi bị ép cuối trận', phase: 'defending', role: 'Hậu vệ',
    skill: 'defensive_reading', difficulty: 1150,
    prompt: 'Phút 90, đội bạn đang dẫn 1-0. Bạn nhận bóng ở góc sân nhà, đối thủ ép sát. Chọn xử lý.',
    cue: ['Đội bạn đang dẫn, chỉ còn vài phút', 'Đối thủ ép sát ở góc sân nhà', 'Mất bóng ở đây là cơ hội gỡ hòa'],
    actors: [['me', 'Bạn', 0.10, 0.90], ['opp', 'Đối thủ ép', 0.15, 0.86], ['opp', 'Đối thủ', 0.30, 0.85], ['partner', 'Thủ môn', 0.50, 0.97], ['partner', 'Đồng đội', 0.45, 0.80], ['ball', 'Bóng', 0.11, 0.91]],
    actions: [['clear', 'Phá bóng thật xa lên trên hoặc ra biên', 1], ['gk', 'Chuyền về thủ môn', 0.5], ['across', 'Chuyền ngang sân', 0.35], ['dribble', 'Cố rê qua người', 0.2]],
    targets: [],
    trap: { kind: 'action', id: 'dribble', why: 'Cố rê qua người: mất bóng ở vị trí nguy hiểm, đối thủ có cơ hội gỡ hòa.' },
    explain: 'Khi dẫn điểm phút cuối và bị ép ở góc sân nhà, ưu tiên an toàn: phá bóng xa hoặc ra biên.',
  }),
]

// ---------------- CAU HOI THE CHAT (A2: cau long doi, A3: bong da) — khong cong ELO ----------------
export interface PhysicalQuestion { id: string; axis: string; q: string; options: [string, string, string, string] }
export const PHYSICAL_QUIZ: Record<Sport, PhysicalQuestion[]> = {
  badminton_doubles: [
    { id: 'A2-1', axis: 'Sức mạnh', q: 'Cú smash của bạn trong đôi thường…', options: ['Không qua được hàng thủ', 'Đối thủ đỡ được nhưng bị đẩy lùi', 'Thường gây khó cho đối thủ', 'Đối thủ thường không phản xạ kịp'] },
    { id: 'A2-2', axis: 'Tốc độ', q: 'Khi partner đập cầu, bạn đứng ở lưới. Đối thủ đỡ cầu rơi về giữa sân, bạn…', options: ['Không kịp lên', 'Lên được nhưng chậm', 'Lên kịp và bắt được cầu', 'Lên kịp, chủ động tấn công tiếp'] },
    { id: 'A2-3', axis: 'Phản xạ', q: 'Đối thủ đập thẳng vào người bạn ở cự ly gần, bạn…', options: ['Thường bị dính cầu', 'Đỡ được nhưng cầu bổng', 'Chặn được cầu về lưới', 'Phản xạ tốt, đưa cầu đi hiểm'] },
    { id: 'A2-4', axis: 'Bền bỉ', q: 'Chơi đôi với nhịp độ cao liên tục, bạn trụ được…', options: ['Dưới 10 phút', '10 – 20 phút', '20 – 40 phút', 'Trên 40 phút'] },
    { id: 'A2-5', axis: 'Cân bằng', q: 'Khi bị đối thủ đổi hướng liên tục trái – phải, bạn…', options: ['Mất thăng bằng, bỏ vị trí', 'Theo được nhưng chậm', 'Giữ được vị trí phần lớn pha', 'Luôn sẵn sàng đổi hướng'] },
    { id: 'A2-6', axis: 'Phối hợp', q: 'Khi partner di chuyển vào vùng của bạn, bạn…', options: ['Không để ý, hay va chạm', 'Có để ý nhưng phản ứng chậm', 'Theo kịp và bù vị trí', 'Phối hợp nhịp nhàng, gần như không có khoảng trống'] },
  ],
  football: [
    { id: 'A3-1', axis: 'Sức mạnh', q: 'Cú sút xa của bạn từ 20–25 m…', options: ['Không tới khung thành', 'Tới nhưng thủ môn bắt dễ', 'Đi mạnh, thủ môn phải cố gắng', 'Uy lực cao, khó cản'] },
    { id: 'A3-2', axis: 'Tốc độ', q: 'Chạy nước rút 30 m của bạn so với đồng đội cùng đội…', options: ['Chậm nhất đội', 'Dưới trung bình', 'Trên trung bình', 'Nhanh nhất đội'] },
    { id: 'A3-3', axis: 'Bền bỉ', q: 'Chạy liên tục cả trận, phong độ của bạn…', options: ['Giảm rõ sau hiệp 1', 'Giảm ở cuối trận', 'Giữ được phần lớn', 'Gần như không giảm'] },
    { id: 'A3-4', axis: 'Cân bằng', q: 'Khi tranh chấp bóng bổng với đối thủ, bạn…', options: ['Hay bị hất ngã', 'Giữ được nhưng thua thiệt', 'Tranh chấp ngang ngửa', 'Thường thắng, giữ vững trọng tâm'] },
    { id: 'A3-5', axis: 'Phản xạ', q: 'Khi bóng bất ngờ đổi hướng trong vòng cấm, bạn…', options: ['Phản ứng chậm, mất bóng', 'Đỡ được nhưng không kiểm soát', 'Đọc được và cản phá', 'Phản xạ nhanh, xử lý gọn'] },
    { id: 'A3-6', axis: 'Tranh chấp', q: 'Khi bị đối thủ tì đè, bạn…', options: ['Dễ mất bóng', 'Chịu được nhưng không thoát', 'Giữ bóng và xoay xở', 'Mạnh hơn, chủ động đẩy ngược'] },
  ],
}

// Số tình huống gốc (mỗi cặp gương tính một).
export const baseCount = (sport: Sport) => SCENARIOS.filter((s) => s.sport === sport && !s.mirrorOf).length

// ---------------- CAU HOI GOI Y VI TRI BONG DA (khong cong ELO) ----------------
export type Pos = 'GK' | 'CB' | 'FB' | 'DM' | 'CM' | 'AM' | 'ST'
export const POSITION_LABEL: Record<Pos, string> = {
  GK: 'Thủ môn', CB: 'Trung vệ', FB: 'Hậu vệ cánh', DM: 'Tiền vệ phòng ngự', CM: 'Tiền vệ trung tâm', AM: 'Tiền vệ công / cánh', ST: 'Tiền đạo',
}
export interface PosQuestion { id: string; text: string; options: { label: string; w: Partial<Record<Pos, number>> }[] }
export const POSITION_QUESTIONS: PosQuestion[] = [
  { id: 'P1', text: 'Trong trận bạn thích làm gì nhất?', options: [
    { label: 'Ngăn đối thủ ghi bàn', w: { GK: 2, CB: 3, FB: 1, DM: 2 } },
    { label: 'Điều phối, chuyền bóng', w: { DM: 1, CM: 3, AM: 1 } },
    { label: 'Ghi bàn, tạo đột biến', w: { AM: 2, ST: 3, FB: 1 } } ] },
  { id: 'P2', text: 'Điểm mạnh thể chất của bạn?', options: [
    { label: 'Chiều cao, tranh chấp bóng bổng', w: { CB: 3, GK: 1, ST: 1 } },
    { label: 'Tốc độ, chạy biên', w: { FB: 3, AM: 2, ST: 1 } },
    { label: 'Thể lực, chạy cả trận', w: { CM: 3, DM: 2, FB: 1 } } ] },
  { id: 'P3', text: 'Khi đội mất bóng bạn thường...', options: [
    { label: 'Lao lên giành lại ngay', w: { DM: 2, CM: 2, ST: 1 } },
    { label: 'Lùi về giữ đội hình', w: { CB: 2, FB: 1, DM: 1 } },
    { label: 'Đứng cao chờ cơ hội', w: { ST: 2, AM: 2 } } ] },
  { id: 'P4', text: 'Khi nhận bóng dưới áp lực bạn...', options: [
    { label: 'Chuyền an toàn', w: { CB: 2, DM: 2, GK: 1 } },
    { label: 'Giữ bóng và xoay người thoát', w: { CM: 3, AM: 1 } },
    { label: 'Rê qua người', w: { AM: 3, ST: 1, FB: 1 } } ] },
  { id: 'P5', text: 'Áp lực nào bạn chịu được?', options: [
    { label: 'Một mình đối mặt cú sút quyết định', w: { GK: 3, CB: 1 } },
    { label: 'Quyết định đường chuyền cuối cùng', w: { AM: 2, CM: 2 } },
    { label: 'Chạy dọc biên lên xuống cả trận', w: { FB: 3, CM: 1 } } ] },
]
export function suggestRole(answers: number[]): { pos: Pos; label: string; ranking: [Pos, number][] } {
  const total: Partial<Record<Pos, number>> = {}
  POSITION_QUESTIONS.forEach((q, i) => {
    const o = q.options[answers[i]]
    if (!o) return
    for (const k of Object.keys(o.w) as Pos[]) total[k] = (total[k] || 0) + (o.w[k] || 0)
  })
  const ranking = (Object.entries(total) as [Pos, number][]).sort((a, b) => b[1] - a[1])
  const pos = ranking[0] ? ranking[0][0] : 'CM'
  return { pos, label: POSITION_LABEL[pos], ranking }
}

// ---------------- CHAM DIEM DON GIAN ----------------
export function scoreScenario(sc: Scenario, actionId: string, targetId?: string) {
  const a = sc.actions.find((x) => x.id === actionId)
  const t = sc.targets.find((x) => x.id === targetId)
  if (!a) return { s: 0, hardFail: false, trapped: false }
  const fit = a.fit
  const ts = a.noTarget || sc.targets.length === 0 ? 1 : t ? t.score : 0
  const s = Math.round(fit * ts * 100) / 100
  const trapped = (sc.trap.kind === 'action' && sc.trap.id === actionId) || (sc.trap.kind === 'target' && sc.trap.id === targetId)
  return { s, hardFail: fit === 0, trapped }
}
// Rating don gian (K lon cho giai doan dau). Khong can chinh xac tuyet doi.
export function updateRating(r: number, s: number, difficulty: number, k = 40): number {
  const e = 1 / (1 + Math.pow(10, (difficulty - r) / 400))
  return Math.round(r + k * (s - e))
}
export function pickSession(sport: Sport, n = 6): Scenario[] {
  const pool = SCENARIOS.filter((s) => s.sport === sport)
  const arr = pool.slice()
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]] }
  const out: Scenario[] = []
  const used = new Set<string>()
  for (const s of arr) {
    const key = s.mirrorOf || s.id // moi cap guong chi vao mot lan, tru khi dung checkMirror
    if (used.has(key)) continue
    used.add(key); used.add(s.id); out.push(s)
    if (out.length >= n) break
  }
  return out
}
