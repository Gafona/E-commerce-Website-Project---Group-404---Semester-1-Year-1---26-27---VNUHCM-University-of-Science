// SportDNA core question bank: 18 situations per sport, 6 per group
// (technique / tactics / physical & mental). Option scores are 0–1; the
// difficulty is the item's Elo rating. Options are shown shuffled.

import { AXIS_IDS, AXIS_TEXT } from "./sportdna-axes.ts"

export type CoreSport = "badminton" | "football"
export type QGroup = "technique" | "tactics" | "physical"
export type Bi = { vi: string; en: string }
export type FootballPosition = "FW" | "MF" | "DF" | "GK"
export type FootballSurface = "ag" | "fg" | "ic"
export type BadmintonStyle = "attack" | "defense" | "allround"

// Axis ids and labels live in the shared SportDNA axis config.
export const AXES = AXIS_IDS
export type BadmintonAxis = (typeof AXES.badminton)[number]
export type FootballAxis = (typeof AXES.football)[number]
export type AxisId = BadmintonAxis | FootballAxis

export const AXIS_LABEL: Record<CoreSport, Record<string, Bi>> = AXIS_TEXT

export const GROUP_LABEL: Record<QGroup, Bi> = {
  technique: { vi: "Kỹ thuật", en: "Technique" },
  tactics: { vi: "Chiến thuật", en: "Tactics" },
  physical: { vi: "Thể lực & tâm lý", en: "Physical & mental" },
}
export const POSITION_LABEL: Record<FootballPosition, Bi> = {
  FW: { vi: "Tiền đạo", en: "Forward" },
  MF: { vi: "Tiền vệ", en: "Midfielder" },
  DF: { vi: "Hậu vệ", en: "Defender" },
  GK: { vi: "Thủ môn", en: "Goalkeeper" },
}
export const SURFACE_LABEL: Record<FootballSurface, Bi> = {
  ag: { vi: "AG · cỏ nhân tạo", en: "AG · artificial grass" },
  fg: { vi: "FG · cỏ tự nhiên", en: "FG · natural grass" },
  ic: { vi: "IC · sân trong nhà / futsal", en: "IC · indoor / futsal" },
}
export const STYLE_LABEL: Record<BadmintonStyle, Bi> = {
  attack: { vi: "Tấn công", en: "Attacking" },
  defense: { vi: "Phòng thủ", en: "Defensive" },
  allround: { vi: "Toàn diện", en: "All-round" },
}

export type CoreOption = Bi & { score: number }
export type CoreQuestion = {
  id: string
  sport: CoreSport
  group: QGroup
  difficulty: number
  axes: Partial<Record<AxisId, number>>
  position?: FootballPosition
  surface?: FootballSurface
  style?: BadmintonStyle
  prompt: Bi
  options: [CoreOption, CoreOption, CoreOption, CoreOption]
}

const o = (vi: string, en: string, score: number): CoreOption => ({ vi, en, score })

export const CORE_BANK: CoreQuestion[] = [
  // ---------------- Football · technique ----------------
  { id: "F-T1", sport: "football", group: "technique", difficulty: 900, axes: { control: 0.6, shooting: 0.4 }, position: "FW", surface: "ag",
    prompt: { vi: "Bóng bổng từ biên bay tới, bạn đối diện khung thành, hậu vệ cách 2 m.", en: "A high ball arrives from the wing; you face goal with a defender 2 m away." },
    options: [o("Khống chế bằng đùi/ngực cho bóng rơi trước chân rồi dứt điểm", "Cushion it with thigh/chest onto your foot, then shoot", 1), o("Vô lê ngay dù tư thế chưa chuẩn", "Volley first time from an awkward stance", 0.55), o("Để bóng nảy rồi mới xử lý", "Let it bounce, then deal with it", 0.3), o("Đánh đầu về phía sau dù không có đồng đội", "Head it backwards with no teammate there", 0.1)] },
  { id: "F-T2", sport: "football", group: "technique", difficulty: 1100, axes: { control: 0.5, passing: 0.5 }, position: "MF", surface: "fg",
    prompt: { vi: "Bạn nhận bóng quay lưng về khung thành đối phương, có người áp sát sau lưng.", en: "You receive with your back to goal and an opponent tight behind you." },
    options: [o("Quan sát trước khi nhận, chạm bằng chân xa để xoay người", "Scan before receiving and turn with your far foot", 1), o("Che bóng rồi trả ngược về hậu vệ", "Shield it and play back to a defender", 0.7), o("Dừng bóng bằng gầm giày rồi mới nhìn", "Stop it under your sole, then look", 0.35), o("Xoay ngay bằng lòng chân phía gần đối thủ", "Turn immediately on the side nearest the opponent", 0.1)] },
  { id: "F-T3", sport: "football", group: "technique", difficulty: 1250, axes: { dribbling: 0.7, control: 0.3 }, position: "FW", surface: "ic",
    prompt: { vi: "Sân futsal, bạn đối mặt 1 đối 1 với hậu vệ sát biên.", en: "Futsal: you face a defender 1 v 1 near the touchline." },
    options: [o("Kéo bóng bằng gầm giày, đổi hướng khi hậu vệ dồn trọng tâm", "Drag it with the sole and change direction as the defender commits", 1), o("Lùi về chuyền ngang an toàn", "Retreat and pass square safely", 0.6), o("Đẩy bóng dài để vượt tốc độ", "Knock it long and race past", 0.4), o("Đánh gót qua người", "Try a back-heel past him", 0.15)] },
  { id: "F-T4", sport: "football", group: "technique", difficulty: 1450, axes: { shooting: 1 }, position: "FW", surface: "fg",
    prompt: { vi: "Cách khung thành 18 m, thủ môn đứng lệch về cột gần.", en: "18 m out, the goalkeeper is shading the near post." },
    options: [o("Sút má trong đặt bóng về góc xa, người đè bóng", "Side-foot it into the far corner, body over the ball", 1), o("Lốp bóng qua đầu thủ môn", "Chip the keeper", 0.45), o("Sút mu hết sức vào giữa", "Laces as hard as possible down the middle", 0.35), o("Chuyền thêm một nhịp khi hậu vệ đang lùi về", "Take one more pass as defenders recover", 0.25)] },
  { id: "F-T5", sport: "football", group: "technique", difficulty: 1600, axes: { passing: 0.6, control: 0.4 }, position: "DF", surface: "ag",
    prompt: { vi: "Bạn là trung vệ có bóng, tiền đạo đối phương pressing chéo, tiền vệ trụ bị kèm.", en: "You're a centre-back on the ball; the striker presses at an angle and your holding midfielder is marked." },
    options: [o("Chuyền sệt căng vượt tuyến vào chân tiền vệ lệch", "Drive a firm line-breaking pass into the wide midfielder", 1), o("Phá dài lên phía trên", "Clear it long", 0.45), o("Trả về thủ môn qua hướng đối thủ đang chặn", "Pass back to the keeper through the pressing lane", 0.25), o("Dẫn bóng qua người đầu tiên ở khu vực nhà", "Dribble past the first presser in your own third", 0.1)] },
  { id: "F-T6", sport: "football", group: "technique", difficulty: 1800, axes: { positioning: 0.5, control: 0.5 }, position: "GK", surface: "fg",
    prompt: { vi: "Thủ môn: cú sút căng chìm sát cột từ 12 m trên mặt sân ướt.", en: "Goalkeeper: a low, hard shot near the post from 12 m on a wet pitch." },
    options: [o("Đổ người thấp, đẩy bóng ra ngoài cột thay vì cố bắt", "Dive low and parry it wide rather than catch", 1), o("Cố bắt dính bằng hai tay", "Try to hold it with both hands", 0.45), o("Dùng chân cản", "Block with your feet", 0.35), o("Đứng yên chờ bóng nảy", "Stay still and wait for the bounce", 0)] },
  // ---------------- Football · tactics ----------------
  { id: "F-C1", sport: "football", group: "tactics", difficulty: 850, axes: { positioning: 0.6, defending: 0.4 }, position: "MF", surface: "fg",
    prompt: { vi: "Đội vừa mất bóng ở giữa sân.", en: "Your team has just lost the ball in midfield." },
    options: [o("Pressing ngay người có bóng 3–5 giây hoặc lùi che đường chuyền trung lộ", "Counter-press for 3–5 s or drop to block the central lane", 1), o("Chạy thẳng về khung thành nhà", "Sprint straight back to your goal", 0.5), o("Đứng nguyên chờ đồng đội", "Stand and wait for teammates", 0.2), o("Lao vào xoạc từ phía sau", "Slide in from behind", 0.15)] },
  { id: "F-C2", sport: "football", group: "tactics", difficulty: 1050, axes: { positioning: 0.7, shooting: 0.3 }, position: "FW", surface: "ag",
    prompt: { vi: "Đồng đội có bóng ở cánh, bạn là tiền đạo cắm, hậu vệ đứng sát.", en: "A teammate has the ball wide; you're the striker with a defender tight." },
    options: [o("Chạy chéo kéo hậu vệ ra rồi bứt vào cột gần", "Curve away to drag him, then attack the near post", 1), o("Lùi xuống nhận bóng", "Drop short to receive", 0.55), o("Đứng yên giữa vòng cấm", "Stand still in the box", 0.35), o("Chạy ra cánh trùng vị trí đồng đội", "Run wide into your teammate's space", 0.15)] },
  { id: "F-C3", sport: "football", group: "tactics", difficulty: 1200, axes: { defending: 0.7, positioning: 0.3 }, position: "DF", surface: "fg",
    prompt: { vi: "Phản công 2 đối 1, bạn là hậu vệ cuối cùng.", en: "A 2 v 1 counter-attack and you're the last defender." },
    options: [o("Lùi chậm, chắn đường chuyền, ép người dẫn bóng ra biên chờ đồng đội", "Back-pedal, cut the pass and show the carrier wide until help arrives", 1), o("Kèm người không bóng", "Mark the runner without the ball", 0.4), o("Lao lên tranh bóng ngay", "Charge the ball carrier immediately", 0.25), o("Xoạc từ xa", "Slide tackle from distance", 0.1)] },
  { id: "F-C4", sport: "football", group: "tactics", difficulty: 1400, axes: { positioning: 0.5, passing: 0.5 }, position: "MF", surface: "ic",
    prompt: { vi: "Futsal: đội bạn dẫn 1 bàn, còn 2 phút, đối thủ dâng thủ môn chơi 5 người.", en: "Futsal: you lead by one with 2 minutes left; the opponent uses a flying goalkeeper." },
    options: [o("Giữ khối phòng ngự, ép họ chuyền ra ngoài, chờ cơ hội sút cầu môn trống", "Stay compact, force passes wide and wait to shoot at the empty goal", 1), o("Sút xa ngay khi có bóng dù bị kèm", "Shoot from distance whenever you get it, even when marked", 0.45), o("Dâng cao pressing cả đội", "Press high with everyone", 0.35), o("Phạm lỗi chiến thuật liên tục", "Keep making tactical fouls", 0.2)] },
  { id: "F-C5", sport: "football", group: "tactics", difficulty: 1650, axes: { defending: 0.5, positioning: 0.5 }, position: "DF", surface: "ag",
    prompt: { vi: "Đối thủ có tiền đạo rất nhanh, hàng thủ đội bạn đang đẩy cao, sắp có đường chuyền dài sau lưng.", en: "Their striker is very fast, your back line is high and a ball over the top is coming." },
    options: [o("Giữ cự ly hàng thủ, đứng chếch về khung thành, bẫy việt vị đồng loạt", "Keep the line's spacing, angle your body to goal and step up together", 1), o("Lùi thật sâu", "Drop very deep", 0.5), o("Một mình đứng cao bắt việt vị", "Step up alone for offside", 0.25), o("Nhìn bóng thay vì nhìn người", "Watch the ball instead of the runner", 0.2)] },
  { id: "F-C6", sport: "football", group: "tactics", difficulty: 1900, axes: { positioning: 0.6, passing: 0.4 }, position: "GK", surface: "fg",
    prompt: { vi: "Thủ môn vừa bắt bóng, đối thủ còn 3 người ở phần sân nhà.", en: "As goalkeeper you've just caught it; three opponents are still in your half." },
    options: [o("Ném bóng nhanh cho hậu vệ biên đang trống để phản công", "Throw quickly to the free full-back to counter", 1), o("Giữ bóng chờ đội hình", "Hold it until the team is set", 0.55), o("Phát dài lên tiền đạo đang bị kèm 2 người", "Kick long to a striker marked by two", 0.45), o("Đặt xuống tự dẫn bóng", "Put it down and dribble out", 0.15)] },
  // ---------------- Football · physical & mental ----------------
  { id: "F-P1", sport: "football", group: "physical", difficulty: 800, axes: { endurance: 0.5, speed: 0.5 }, position: "FW", surface: "ag",
    prompt: { vi: "Phút 80, bạn mệt, tỉ số hòa, đối thủ phản công.", en: "80th minute, you're tired, it's level and they counter." },
    options: [o("Chạy về ít nhất tới giữa sân, chọn thời điểm nước rút", "Track back at least to halfway and pick your sprint", 1), o("Phạm lỗi để ngắt nhịp", "Commit a foul to stop it", 0.45), o("Đứng lại chờ bóng phía trên", "Stay up front and wait", 0.3), o("Xin thay người giữa pha bóng", "Ask to be subbed mid-play", 0.2)] },
  { id: "F-P2", sport: "football", group: "physical", difficulty: 1000, axes: { endurance: 1 }, position: "MF", surface: "fg",
    prompt: { vi: "Chạy liên tục 12 phút, bạn đi được khoảng bao xa?", en: "In a 12-minute continuous run, how far do you get?" },
    options: [o("Trên 2,6 km", "More than 2.6 km", 1), o("2,2 – 2,6 km", "2.2 – 2.6 km", 0.7), o("1,8 – 2,2 km", "1.8 – 2.2 km", 0.4), o("Dưới 1,8 km", "Under 1.8 km", 0.1)] },
  { id: "F-P3", sport: "football", group: "physical", difficulty: 1150, axes: { speed: 0.7, dribbling: 0.3 }, position: "FW", surface: "ic",
    prompt: { vi: "Nước rút 20 m từ tư thế đứng, bạn mất bao lâu?", en: "A 20 m sprint from standing takes you how long?" },
    options: [o("Dưới 3,1 giây", "Under 3.1 s", 1), o("3,1 – 3,4 giây", "3.1 – 3.4 s", 0.65), o("3,4 – 3,8 giây", "3.4 – 3.8 s", 0.35), o("Trên 3,8 giây", "Over 3.8 s", 0.1)] },
  { id: "F-P4", sport: "football", group: "physical", difficulty: 1350, axes: { defending: 0.5, positioning: 0.5 }, position: "DF", surface: "fg",
    prompt: { vi: "Phút 20, bạn mắc lỗi dẫn tới bàn thua.", en: "In the 20th minute your mistake leads to a goal." },
    options: [o("Tự nhắc phương án, chơi đơn giản vài pha để lấy lại nhịp", "Reset, play simple for a few actions to regain rhythm", 1), o("Cố gỡ bằng pha cá nhân mạo hiểm", "Try to make up for it with risky solo play", 0.3), o("Né nhận bóng phần còn lại của trận", "Avoid the ball for the rest of the game", 0.2), o("Trách đồng đội hoặc trọng tài", "Blame teammates or the referee", 0.05)] },
  { id: "F-P5", sport: "football", group: "physical", difficulty: 1550, axes: { shooting: 0.5, positioning: 0.5 }, position: "MF", surface: "ag",
    prompt: { vi: "Luân lưu, bạn đá lượt thứ 5, đội cần ghi bàn.", en: "Penalty shoot-out: you take the 5th kick and must score." },
    options: [o("Chọn góc trước, giữ đà chạy quen thuộc, không đổi ý", "Pick your corner early, keep your usual run-up, don't change", 1), o("Quyết định khi chạy đà dựa vào thủ môn", "Decide during the run-up by reading the keeper", 0.55), o("Sút hết sức vào giữa", "Blast it down the middle", 0.45), o("Xin không đá", "Ask not to take it", 0.1)] },
  { id: "F-P6", sport: "football", group: "physical", difficulty: 1750, axes: { speed: 0.6, positioning: 0.4 }, position: "GK", surface: "ic",
    prompt: { vi: "Futsal: cú sút từ 6 m bị đổi hướng trước mặt bạn.", en: "Futsal: a 6 m shot deflects just in front of you." },
    options: [o("Giữ trọng tâm thấp, mở rộng cơ thể che góc gần", "Stay low and make yourself big to block", 1), o("Lao ra cắt trước khi sút", "Rush out to smother before the shot", 0.45), o("Đổ người sớm theo dự đoán", "Dive early on a guess", 0.35), o("Đứng thẳng chờ bóng", "Stand upright and wait", 0.15)] },
  // ---------------- Badminton · technique ----------------
  { id: "B-T1", sport: "badminton", group: "technique", difficulty: 850, axes: { net: 0.6, drop: 0.4 }, style: "allround",
    prompt: { vi: "Cầu bỏ nhỏ sát lưới bên thuận tay, bạn đến kịp.", en: "A tight net drop lands on your forehand side and you get there in time." },
    options: [o("Bỏ nhỏ trả sát lưới, cầu xoáy lật", "Reply with a tight spinning net shot", 1), o("Đánh cầu cao sâu về cuối sân", "Lift it high and deep", 0.6), o("Đẩy cầu nhanh ngang mặt", "Push it flat and fast", 0.5), o("Đập ngay dù cầu thấp dưới lưới", "Smash it though it's below the tape", 0.05)] },
  { id: "B-T2", sport: "badminton", group: "technique", difficulty: 1000, axes: { smash: 1 }, style: "attack",
    prompt: { vi: "Cầu cao rơi giữa sân, bạn ở tư thế tốt.", en: "A high lift drops mid-court and you're well set." },
    options: [o("Đập dốc vào hông/người đối thủ", "Smash steeply at the opponent's hip/body", 1), o("Đập hết lực thẳng giữa", "Smash flat-out down the middle", 0.6), o("Chặn nhẹ", "Play a soft block", 0.35), o("Phông cầu cao lại", "Clear it back high", 0.3)] },
  { id: "B-T3", sport: "badminton", group: "technique", difficulty: 1150, axes: { defense: 0.7, movement: 0.3 }, style: "defense",
    prompt: { vi: "Đối thủ đập thẳng vào người bạn.", en: "The opponent smashes straight at your body." },
    options: [o("Đưa vợt trái tay trước người, chặn ngắn về lưới", "Backhand in front of the body and block short", 1), o("Vụt mạnh trả lại", "Drive it back hard", 0.45), o("Đánh cầu cao về giữa sân", "Lift it to mid-court", 0.4), o("Né sang bên rồi đánh thuận tay", "Step aside to play a forehand", 0.25)] },
  { id: "B-T4", sport: "badminton", group: "technique", difficulty: 1350, axes: { drop: 0.7, tactics: 0.3 }, style: "allround",
    prompt: { vi: "Bạn ở cuối sân, đối thủ đứng lùi chờ đập.", en: "You're at the back; the opponent sits deep expecting a smash." },
    options: [o("Chặt chéo với động tác chuẩn bị giống đập", "Cross-court slice drop disguised as a smash", 1), o("Vẫn đập dù đối thủ đã sẵn sàng", "Smash anyway though they're ready", 0.45), o("Phông cao sâu", "Clear deep", 0.4), o("Bỏ nhỏ chậm, cầu bay cao", "Slow floaty drop", 0.15)] },
  { id: "B-T5", sport: "badminton", group: "technique", difficulty: 1550, axes: { smash: 0.5, net: 0.5 }, style: "attack",
    prompt: { vi: "Sau cú đập của bạn, cầu được trả ngắn trên lưới.", en: "After your smash, the reply comes back short over the net." },
    options: [o("Áp sát lưới, chạm cầu ở điểm cao nhất", "Follow in and take it at the highest point", 1), o("Bỏ nhỏ chéo khi cầu đã rơi thấp", "Cross-court net shot once it has dropped", 0.5), o("Nâng cầu cao", "Lift it", 0.3), o("Lùi về chờ", "Retreat and wait", 0.2)] },
  { id: "B-T6", sport: "badminton", group: "technique", difficulty: 1800, axes: { defense: 0.5, stability: 0.5 }, style: "defense",
    prompt: { vi: "Cú đập dốc vào góc trái tay sát vạch.", en: "A steep smash into your backhand corner near the line." },
    options: [o("Hạ trọng tâm, trái tay lốp sâu cao ra cuối sân đối diện", "Get low and backhand-lift deep to the far corner", 1), o("Chặn ngắn chéo dù đang mất thăng bằng", "Block short cross-court while off balance", 0.5), o("Để cầu, hy vọng ra ngoài", "Leave it, hoping it's out", 0.35), o("Vòng thuận tay qua đầu", "Round-the-head forehand", 0.1)] },
  // ---------------- Badminton · tactics ----------------
  { id: "B-C1", sport: "badminton", group: "tactics", difficulty: 900, axes: { tactics: 1 }, style: "allround",
    prompt: { vi: "Đánh đôi, bạn vừa đập. Bạn đứng ở đâu?", en: "Doubles: you've just smashed. Where do you go?" },
    options: [o("Theo cầu lên lưới, đồng đội lùi sau (đội hình trước–sau)", "Follow in; partner covers the back (front-back)", 1), o("Lùi lại song song", "Drop back side by side", 0.4), o("Chạy sang phần của đồng đội", "Move into your partner's half", 0.2), o("Đứng yên", "Stay where you are", 0.15)] },
  { id: "B-C2", sport: "badminton", group: "tactics", difficulty: 1100, axes: { tactics: 0.6, defense: 0.4 }, style: "defense",
    prompt: { vi: "Đối thủ tấn công liên tục vào đội bạn.", en: "The opponents keep attacking you." },
    options: [o("Đứng song song, phản tạt ngang hoặc lốp sâu chéo để thoát", "Go side by side and counter flat or lift deep cross-court", 1), o("Tiếp tục phông cao về giữa", "Keep lifting to the middle", 0.35), o("Một người đứng lưới", "Keep one player at the net", 0.3), o("Liều đập trả", "Gamble on smashing back", 0.2)] },
  { id: "B-C3", sport: "badminton", group: "tactics", difficulty: 1300, axes: { tactics: 0.5, smash: 0.5 }, style: "attack",
    prompt: { vi: "Đối thủ yếu trái tay cuối sân.", en: "The opponent is weak on the deep backhand." },
    options: [o("Ép cầu vào trái tay cuối sân, chờ cầu yếu rồi đập", "Pin the deep backhand, then smash the weak reply", 1), o("Đánh vào giữa", "Play down the middle", 0.5), o("Đánh đều hai bên", "Spread it evenly", 0.45), o("Đập ngay từ cầu đầu tiên", "Smash from the first ball", 0.3)] },
  { id: "B-C4", sport: "badminton", group: "tactics", difficulty: 1450, axes: { tactics: 0.6, stability: 0.4 }, style: "allround",
    prompt: { vi: "Đánh đơn, bạn dẫn 20–19.", en: "Singles, you lead 20–19." },
    options: [o("Giữ lối chơi quen, giảm rủi ro, cầu sâu an toàn", "Stick to your game, cut risk, play safe and deep", 1), o("Đánh chậm câu giờ", "Slow everything down", 0.45), o("Đánh liều sát biên", "Go for the lines", 0.3), o("Đổi hẳn chiến thuật", "Switch tactics entirely", 0.2)] },
  { id: "B-C5", sport: "badminton", group: "tactics", difficulty: 1650, axes: { tactics: 0.5, movement: 0.5 }, style: "defense",
    prompt: { vi: "Giao cầu đôi, đối thủ lao lên đè cầu ngắn.", en: "Doubles serve: the receiver rushes your short serve." },
    options: [o("Giao ngắn chuẩn, xen kẽ giao nhanh (flick) ra sau lưng", "Accurate short serve mixed with flick serves", 1), o("Chỉ giao ngắn", "Only serve short", 0.5), o("Chỉ giao dài", "Only serve long", 0.4), o("Giao cao vừa phải", "Serve a medium-high ball", 0.15)] },
  { id: "B-C6", sport: "badminton", group: "tactics", difficulty: 1900, axes: { tactics: 0.7, drop: 0.3 }, style: "attack",
    prompt: { vi: "Đối thủ đọc được hướng đập của bạn.", en: "The opponent is reading your smash." },
    options: [o("Ngụy trang: cùng một động tác cho đập, chặt và phông", "Disguise: same preparation for smash, drop and clear", 1), o("Thôi không đập nữa", "Stop smashing", 0.4), o("Chỉ chặt", "Only play drops", 0.35), o("Đập mạnh hơn nữa", "Smash even harder", 0.3)] },
  // ---------------- Badminton · physical & mental ----------------
  { id: "B-P1", sport: "badminton", group: "physical", difficulty: 800, axes: { endurance: 1 }, style: "allround",
    prompt: { vi: "Bạn chơi liên tục bao lâu mà vẫn giữ được bước chân?", en: "How long can you play continuously and keep your footwork?" },
    options: [o("Trên 60 phút", "Over 60 minutes", 1), o("40 – 60 phút", "40 – 60 minutes", 0.7), o("20 – 40 phút", "20 – 40 minutes", 0.4), o("Dưới 20 phút", "Under 20 minutes", 0.1)] },
  { id: "B-P2", sport: "badminton", group: "physical", difficulty: 950, axes: { movement: 0.7, endurance: 0.3 }, style: "defense",
    prompt: { vi: "Bài di chuyển 6 góc trong 30 giây, bạn chạm được bao nhiêu góc?", en: "In a 30-second six-corner footwork drill, how many corners do you touch?" },
    options: [o("Trên 20", "More than 20", 1), o("16 – 20", "16 – 20", 0.7), o("12 – 16", "12 – 16", 0.4), o("Dưới 12", "Fewer than 12", 0.1)] },
  { id: "B-P3", sport: "badminton", group: "physical", difficulty: 1200, axes: { stability: 0.6, smash: 0.4 }, style: "attack",
    prompt: { vi: "Sau cú bật nhảy đập, bạn thường thế nào?", en: "After a jump smash, what usually happens?" },
    options: [o("Tiếp đất chắc và quay về trung tâm ngay", "Land balanced and recover to base at once", 1), o("Tiếp đất ổn nhưng quay về chậm", "Land fine but recover slowly", 0.55), o("Hay mất thăng bằng", "Often lose balance", 0.2), o("Chưa bật nhảy đập được", "Can't jump smash yet", 0.1)] },
  { id: "B-P4", sport: "badminton", group: "physical", difficulty: 1400, axes: { stability: 1 }, style: "allround",
    prompt: { vi: "Bạn bị dẫn 5–12, đối thủ đang hưng phấn.", en: "You trail 5–12 and the opponent is on a roll." },
    options: [o("Chơi chậm lại, ổn định từng điểm, chọn cầu an toàn", "Slow down, steady each point, choose safe shots", 1), o("Buông ván, giữ sức cho ván sau", "Give up the game to save energy", 0.45), o("Đánh liều để gỡ nhanh", "Take big risks to catch up fast", 0.3), o("Cáu và đánh mạnh mọi cầu", "Get angry and hit everything hard", 0.1)] },
  { id: "B-P5", sport: "badminton", group: "physical", difficulty: 1600, axes: { movement: 0.5, defense: 0.5 }, style: "defense",
    prompt: { vi: "Bạn ở cuối sân thì cầu bất ngờ rơi sát lưới.", en: "You're at the back when the shuttle suddenly drops at the net." },
    options: [o("Bước chùng dài, vợt đưa trước, đánh ở điểm cao nhất có thể", "Long lunge, racket first, hit as high as possible", 1), o("Chạy nhiều bước nhỏ", "Take many small steps", 0.45), o("Nhảy lao người", "Dive for it", 0.2), o("Bỏ cầu", "Let it go", 0)] },
  { id: "B-P6", sport: "badminton", group: "physical", difficulty: 1850, axes: { endurance: 0.5, stability: 0.5 }, style: "attack",
    prompt: { vi: "Pha cầu dài 30 lượt, bạn vẫn đang tấn công.", en: "A 30-shot rally and you're still on the attack." },
    options: [o("Giữ chất lượng đập/chặt, thở đều, chọn thời điểm kết thúc", "Keep smash/drop quality, breathe, choose when to finish", 1), o("Chuyển sang phông thủ", "Switch to defensive clears", 0.45), o("Đập liên tục đến khi hết sức", "Keep smashing until exhausted", 0.35), o("Đánh sát biên để kết thúc sớm", "Aim for the lines to end it", 0.25)] },
]

/** Two or three concrete drills per weak axis. */
export const DRILLS: Record<CoreSport, Record<string, Bi>> = {
  badminton: {
    smash: { vi: "Đập dốc 3 × 15 quả vào ô 1 m² hai biên, ghi tỉ lệ trúng mỗi buổi.", en: "Steep smashes 3 × 15 into 1 m² boxes on both tramlines; log your hit rate." },
    drop: { vi: "Chặt chéo 3 × 20 quả, cầu phải rơi trong 1,5 m trước lưới.", en: "Cross-court drops 3 × 20; each must land within 1.5 m of the net." },
    net: { vi: "Đối luyện bỏ nhỏ 5 phút, cầu qua lưới không cao quá 20 cm.", en: "Net-shot rallies for 5 minutes, crossing no more than 20 cm above the tape." },
    defense: { vi: "Chặn đập 3 × 1 phút với bạn tập đập liên tục, ưu tiên chặn ngắn.", en: "Smash defence 3 × 1 minute against a partner, prioritising short blocks." },
    movement: { vi: "Di chuyển 6 góc 6 × 30 giây, nghỉ 30 giây giữa các hiệp.", en: "Six-corner footwork 6 × 30 s with 30 s rest." },
    endurance: { vi: "Chạy biến tốc 20 phút hoặc nhảy dây 10 × 1 phút.", en: "20 minutes of interval running or 10 × 1 minute skipping." },
    stability: { vi: "Plank 3 × 45 giây và bật nhảy tiếp đất một chân 3 × 10 mỗi bên.", en: "Plank 3 × 45 s and single-leg landing jumps 3 × 10 each side." },
    tactics: { vi: "Quay lại một trận của bạn, ghi 5 điểm mất và chọn cú đánh thay thế.", en: "Film a match, note 5 lost points and pick a better shot for each." },
  },
  football: {
    control: { vi: "Khống chế bóng bổng bằng đùi, ngực, mu: 5 × 2 phút với tường hoặc bạn tập.", en: "Control high balls with thigh, chest, instep: 5 × 2 minutes with a wall or partner." },
    passing: { vi: "Chuyền một chạm qua cổng rộng 1 m cách 10–15 m, 3 × 20 lần mỗi chân.", en: "One-touch passes through a 1 m gate from 10–15 m, 3 × 20 per foot." },
    shooting: { vi: "Sút góc thấp 3 × 10 quả từ 16 m, mỗi chân, ghi số quả trúng đích.", en: "Low-corner finishing 3 × 10 from 16 m with each foot; count the hits." },
    dribbling: { vi: "Rê bóng zic-zắc qua 8 cọc, 6 lượt có bấm giờ.", en: "Zig-zag dribble through 8 cones, 6 timed runs." },
    positioning: { vi: "Rondo 4 đấu 2 trong ô 10 × 10 m, 5 × 3 phút, luôn tạo tam giác chuyền.", en: "4 v 2 rondo in a 10 × 10 m box, 5 × 3 minutes, always form passing triangles." },
    speed: { vi: "Nước rút 6 × 20 m, nghỉ đủ 60 giây giữa các lần.", en: "6 × 20 m sprints with a full 60 s rest." },
    defending: { vi: "1 đấu 1 phòng ngự trong hành lang rộng 5 m: ép đối thủ ra biên, 8 lượt.", en: "1 v 1 defending in a 5 m channel: show the attacker wide, 8 reps." },
    endurance: { vi: "Chạy biến tốc 4 × 4 phút (30 giây nhanh / 30 giây chậm).", en: "Interval running 4 × 4 minutes (30 s fast / 30 s easy)." },
  },
}

export const bankFor = (sport: CoreSport) => CORE_BANK.filter((q) => q.sport === sport)
