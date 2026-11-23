# <a id="_hxqf87r40wkd"></a>1\. Khởi tạo dự án, yêu cầu tổng thể và quy tắc làm việc

*Các prompt đặt nền móng: bán gì, có chức năng gì, AI được tự quyết đến đâu; cùng hai prompt tổng hợp nhiều hạng mục \(T20, T23\)\.*

### <a id="_h55d9dy3e3f7"></a>T1\#1

Tạo ra một trang thương mại điện tử đủ các chức năng cơ bản như một sản phẩm thật\. Câu 1: Trang thương mại điện tại sẽ bán những sản phẩm gì? Đồ dùng, dụng cụ, sản phẩm \- Bóng đá; Cầu lông\. Câu 2: Các chức năng cơ bản của sản phẩm? Chức năng chuyên biệt? Danh sách chức năng: Nghiệp vụ: Khách hàng Lọc: Lọc theo môn thể thao \(cầu lông, bóng đá\) Lọc theo thương hiệu, bảng size, màu sắc, giá tiền Lọc mặt hàng theo vị trí, lối chơi, mặt sân/ môi trường \(cả 3\), nhu cầu, trình độ \(cầu lông\), chức năng\. Lọc theo giải dấu hiện hữu hoặc theo giải đấu tự chọn /CLB Lọc theo chất lượng Lọc đạo cụ lọc theo môn thể thao Tài khoản, thông tin cá nhân Đăng ký, đăng nhập Custom trang cá nhân \(avatar, nền\) Chỉnh sửa thông tin cá nhân Đơn hàng, sản phẩm Đặt trước đơn hàng Tìm kiếm theo tên sản phẩm Lịch sử tìm kiếm Gợi ý tìm kiếm, gợi ý sản phẩm liên quan So sánh thông tin giữa 2 sản phẩm \(mức giá, hiệu năng, thông số,\.\.\.\) Bộ yêu thích sản phẩm Thanh toán \(Online, COD, trả góp\) Hiển thị thông tin sản phẩm Tra cứu đơn hàng, theo dõi đơn hàng Đánh giá đơn hàng, sản phẩm Dịch vụ, ưu đãi Voucher, ưu đãi Thẻ thành viên Chăm sóc khách hàng đối với nền tảng \(hotline,\.\.\.\) Hỗ trợ đan cước \(đối với vợt cầu lông\) Hệ thống sự kiện \(mini game\) và đổi thưởng \(voucher\) \(option\) Thông báo Thông báo \(voucher, mặt hàng mới, đơn hàng, cài đặt thông báo\.\.\.\) Theo dõi shop Ước tính và thông báo thời gian giao hàng dựa trên vị trí Người bán: Đăng ký, đăng nhập của chủ/ nhân viên Đăng/ gỡ sản phẩm Số lượng, niêm yết giá Liên hệ, phản ánh chất lượng sản phẩm đối với bên bán\(zalo, facebook, tiktok, hotline, instagram, messenger, youtube\) Đăng quảng cáo \- ưu tiên sản phẩm Quản lí doanh thu, sản phẩm Đánh giá, phản hồi ý kiến khách hàng Bảo hành Chức năng chuyên biệt: Chức năng đo trình độ của người chơi cụ thể vào từng môn như bóng đá và cầu lông: đo lối chơi, trình độ, phong cách, … cùng nhiều kĩ năng cụ thể rồi tính trên 1 thang điểm 100 rồi tạo ra các thông số % phù hợp đối với các sản phẩm cụ thể, như giỏi tiền đạo \- chơi bán chuyên => đề xuất các sản phẩm có % tương thích cao với vai trò và vị thế của người đó… Custom áo thi đấu \(cho ảnh 2D bao gồm mặt trước và sau\): Tự vẽ, Sticker có sẵn, Text \- Bao gồm custom các chỉnh sửa cơ bản như in đậm, in nghiêng,\.\.\. Quy trình xác minh người bán và bảo vệ quyền lợi người mua: \(Khi bán các sản phẩm có tính độc nhất như giày, vợt có giá trị cao\. Cần người bán cung cấp các hóa đơn, giá tờ hợp lệ đối với nền tảng để được cấp phép bán sản phẩm, sau đó khi người mua mua sản phầm thì nền tảng sẽ cung cấp mã sản phẩm riêng như mã seri, mã số sản phẩm cho người mua, nếu sản phẩm thực tế khác mã seri và mã số sản phẩm thì là hàng giả, còn không là hàng chính hảng\) \- Quy đảm bảo rằng mọi người bán đều bán các sản phẩm chính hảng cho người mua\. Công cụ tạo sự kiện cho người bán \- Tạo các sự kiện theo mùa, theo thời điểm như Black Friday, Back2School,\.\.\. hay cả các giải đấu theo mùa, năm… cùng các mã giảm giá , giảm giá các sản phẩm,\.\.\. Bảng dữ liệu thói quen mua sắm \- Khách hay gì mà shop không có \- Ví dụ khách tìm vợt 1 triệu mà shop toàn giá cao hơn, hay sản phẩm nào hay bị bỏ ra khỏi giỏi hàng, một số xu hướng mua như sản phẩm được mua nhiều trong tuần này còn sản phẩm kia thì không,\.\.\. Trang web riêng về đánh giá sản phẩm hay một mạng xã hội thu nhỏ, có thông tin của người đăng \(Điểm số, trình đồ người đăng, kèm các thông số mức độ phù hợp với sản phẩm \- nếu có\),\.\.\. Hiệu suất: Đa ngôn ngữ UX/UI \(tối ưu máy tính/điện thoại\) SEO Smart Search Engine Câu 3: Sử dụng nền tảng nào để xây dựng sản phẩm? Một số nền tảng: wordpress; beacons; figma; firebase; gumroad; google sites; supabase; penpot; localwp; getboottrap;\.\.\. Qua tìm hiểu của nhóm thì nhóm thống nhất chọn Figma bởi các lý sau: Hỗ trợ miễn phí với mail sinh viên; Công cụ thiết kể gần gũi như Canva → dễ dàng làm quen Các chức năng cơ bản của nền tảng khớp với nhu cầu thực hiện sản phẩm\. Câu 4: Data của các sản phẩm lấy từ đâu? Data: \-Cầu lông: VnB Lining Yonex Mizuno Nydhi Shuttle House E78 BadmintonBay \- Bóng đá: Adidas Nike Kamito Unisportstore Pro:Direct Soccer Footy\.com

### <a id="_n2nu51xlodv0"></a>T1\#2

cho tôi thêm chức năng đi, như là bấm vô bóng đá ở thanh trên cùng thì lướt vô phần bóng đá, làm web đăng nhập đăng kí, thông báo, rồi cho thêm data 2 môn thể thao đó đi, mỗi một sản phẩm click vô sẽ hiện lên bảng/web thông tin sản phẩm, thông số, đổi màu chủ đạo thành xanh dương, đổi tên web thành BOAI, khi click vào thì về trang chính

### <a id="_2iub3ctty42p"></a>T1\#5

404\.pdf

PDF

phát triển sơ khai cái các chức năng và web cơ bản đi

### <a id="_v07c632ggr2a"></a>T1\#6

tự kiểm tra và phát triển thêm các chức đã có hoặc chưa có trên trang web đi

### <a id="_cpnbcy4npktk"></a>T1\#39

xem lại toàn bộ code & giao diện để đồng bộ toàn bộ các chức năng đã thêm, đã sửa, \.\.\., tự tìm thêm để check,\.\.\.

### <a id="_y68qighowugh"></a>T20

ở phần mẫu áo, họa tiết ,logo chữ áo, sô, vẽ, thiết kế hãy làm cho gọn lại, để khách hàng đỡ phải lướt lên lướt xuống, cho nó nằm bên cạnh khung thiết kế để dễ dàng quan sát để chỉnh sửa

ở phần custom mẫu áo, họa tiết logo, số áo, chữ, vẽ thì làm cho nó gọn lại để khách hàng k phải kéo lên kéo xuống bất tiện, làm cho nó ở kế bên khung thiết kế để dễ dàng quan sát và chỉnh sửa, và phải tối ưu cho cả điện thoại và máy tính

phần nhập hình ảnh lên của story còn lỗi do chồng chéo chức nawg crop ảnh với chỉnh thông tin story\. Sẵn xóa luôn mấy tài khoản thử do mình tạo ra lúc làm web đi, trong setting thêm mục custom id, thứ 3 ;à mục tìm kiếm thì bạn bè đề xuất nên được random hay có nút làm mới, cuối cùng là trang cá nhân đã gần như hoàn thiện những ở mục cuộng đồng lại thiếu chức năng theo dõi hay bị theo dõi và khi bấm vào tên người dùng thì thấy trang cá nhân nữa, từ thêm mà thêm chức năng riêng tư hoặc công khai, với riêng tư thì xin theo dõi phải được xác nhận qua thông báo mới được xem nội dung trang cá nhân

thêm các tag cho các loại sản phẩm như giày vợt quần áo cầu \.\.\. và thêm bộ lọc cho chúng\.

Những bản vẽ thiết kế đã lưu sẽ được lưu lại trong trang thiết kế và có thể chia sẽ ở trên cộng đồng và các thành viên trên cộng đồng có thể sử dụng bản vẽ thiết kế để đặt in trực tiếp trên boai

Sửa lỗi Ở mục nội dung website trong admin account thì các nội dung khi đc chỉnh sửa dù đã bấm lưu nhưng k lưu

Phần thanh toán bị lỗi không thanh toán được hãy kiểm tra lại

Ở phần custom áo khi chèn logo ở 1 mặt có thể làm cho nó tràn qua mặt kia khi để góc nghiêng

Ở custom áo khi điều chỉnh màu thì các phần được chỉnh trên khung thiết kế cũng được điều chỉnh theo luôn để dễ dàng chỉnh sửa

Ở phần thiết kế quần có thêm họa tiết phù hợp với áo đã chọn

Ở phần mục cộng đồng 1 bài viết khi đăng lên thì không thể xóa được, khi muốn sửa nội dung bài đăng thì nó nhảy lên lại chỗ bài viết mới để sửa lại nội dung thì ảnh hưởng đến trải nghiệm sử dụng\. Bên cạnh các tên trên bài viết thì thêm nút theo dõi để có thể theo dõi trực tiếp ngay tại bài đăng còn khi bấm vào tên thì vào trang cá nhân của họ

Mọi sự thay đổi và quyết định đều do bạn quản lí dựa trên tiêu chí tối ưu nhất có thể mà k cần qua trung gian hỏi tôi hay admin Nếu muốn thử các chứng năng trên web thì có thể vào tài khoản admin để thử admin@boai\.vn pass:[REDACTED] sau khi làm xong thì gửi tui check list những gì đã làm và tối ưu, mọi thứ tôi không đề cập mà bạn thấy nó hợp lý và tối ưu hơn thì bạn có quyền chỉnh sửa mà không cần hỏi qua ý kiến chung gian của tôi

chức năng tạm dừng hoạt động khi không đủ thông tin đã hoạt động mà khi nhập thôn tin mới thì lưu không được á

QUY ĐỊNH LÀM VIỆC \(áp dụng cho mọi yêu cầu sau này trong project này\)

Bạn được TOÀN QUYỀN quyết định về ý tưởng, thiết kế, kiến trúc, sửa lỗi và bổ sung tính năng cho dự án BOAI \(sàn thương mại điện tử đồ thể thao \+ SportDNA, giao diện tiếng Việt, có bản tiếng Anh\)\.

KHÔNG hỏi lại tôi về ý tưởng, hướng đi hay lựa chọn trung gian\. Khi có nhiều phương án, tự chọn phương án tốt nhất cho người dùng và làm luôn\. Chỉ báo lại sau khi xong\.

Được tự sửa mọi lỗi bạn phát hiện trong lúc làm, kể cả lỗi ngoài phạm vi yêu cầu, miễn là sửa an toàn và không đổi hành vi đang đúng\.

Được tự bổ sung phần còn thiếu để tính năng hoàn chỉnh, không để nút cụt, trang cụt hay chữ "sắp ra mắt"\. Nếu một tính năng đang hứa mà chưa có, hoặc làm cho xong, hoặc bỏ lời hứa đó khỏi giao diện\.

Được tự thêm, đổi tên, gộp hoặc xóa file/component khi cần, và tự thêm chuỗi tiếng Việt \+ tiếng Anh qua tr\(\) / t\(\) cho mọi chữ hiển thị mới\.

Giữ nhất quán với giao diện, màu sắc, phong cách hiện có của BOAI\. Giữ dark mode hoạt động\.

Giới hạn duy nhất \(để không phá dự án\):

Không xóa hoặc làm mất dữ liệu người dùng đã có \(đơn hàng, tài khoản, bài viết, thiết kế áo\)\.

Không làm lộ thông tin riêng tư \(email, số điện thoại, địa chỉ\) và không nới lỏng quyền của người mua / người bán / quản trị\.

Không đưa bí mật hoặc khóa API vào mã chạy trên trình duyệt\.

Sau mỗi lần làm xong, tóm tắt ngắn: đã làm gì, đã tự sửa/bổ sung thêm gì, còn gì tồn đọng\. Tính năng custom áo đang dừng sau khi shop báo giá\. Trong custom\-ao/MyRequests\.tsx, hộp thoại chi tiết yêu cầu chỉ có "Xem shop" và "Hủy yêu cầu"\. Bên shop \(kenh\-ban\-hang/custom\-ao/CustomRequestControls\.tsx\) tự đổi trạng thái bằng danh sách chọn\. Luồng pending → quoted → accepted → completed chưa thể hoàn thành từ phía khách\.

Hãy hoàn thiện toàn bộ luồng:

Khách có nút "Chấp nhận báo giá" khi trạng thái là quoted, và "Từ chối / thương lượng"\. Chấp nhận thì chuyển accepted và thông báo cho shop\.

Thêm khung trao đổi ngay trong yêu cầu giữa khách và shop \(dùng lại hạ tầng chat của shop trong shop\-chat\-actions, gắn với yêu cầu custom\)\. Tin nhắn phải xuất hiện đồng bộ trong /tin\-nhan, bong bóng chat và mục "Tôi mua hàng"\.

Sau khi accepted, cho đặt cọc hoặc tạo đơn thật: tạo order liên kết với yêu cầu custom, dùng lại luồng thanh toán và /don\-hang hiện có \(COD hoặc chuyển khoản cho shop\)\. Hiện trạng thái sản xuất và giao hàng trong cùng một trang theo dõi\.

Phía shop: chỉ cho chuyển trạng thái hợp lệ theo từng bước, không cho nhảy cóc\. Mỗi lần đổi trạng thái hoặc báo giá đều gửi thông báo cho khách\.

Giữ nguyên dữ liệu yêu cầu đã gửi trước đây\. Trang /giai\-dau hiện chỉ để xem: không có đăng ký online, không có đường vào từ menu, và có dữ liệu "minh họa" lẫn trong web thật\. Match Rating \(MR\) cũng không hiện ở Hồ sơ thể thao\.

Hãy làm cho nó thành một tính năng trọn vẹn:

Thêm "Giải đấu" vào menu Khám phá \(ExploreMenu\) và trang SportDNA, để mọi người tìm thấy\.

Cho người dùng đã đăng nhập đăng ký tham gia giải đang mở đăng ký \(đơn hoặc đôi, nhập đồng đội bằng mã cộng đồng\)\. Có trạng thái chờ duyệt / đã duyệt / từ chối\. Thông báo kết quả duyệt qua chuông thông báo\.

Hiện MR, bậc rating và lịch sử trận ở Hồ sơ thể thao \(SportProfile\.tsx\)\. Có công tắc "công khai tên trên trang giải đấu" \(isPublic\) trong hồ sơ hoặc Cài đặt\.

Dữ liệu minh họa: ẩn khỏi người dùng thường \(chỉ hiện cho quản trị\) hoặc gắn nhãn rõ ràng, không để lẫn với giải thật\.

Thêm phần quản trị giải: tạo giải, duyệt đăng ký, nhập và duyệt kết quả\. Dùng khu quan\-tri hiện có và giữ đúng phân quyền\. Trang /sportdna quảng cáo "5 trục độc lập: Kỹ năng, Mức xác thực, Uy tín cộng đồng, Thành tích, Độ phù hợp thiết bị", nhưng hồ sơ chỉ hiện kỹ năng, thành tích và thiết bị\. Điểm uy tín \(CP\) trong sportdna/\_components/data\.ts là dữ liệu mẫu\.

Bạn tự quyết định cách làm gọn nhất và nhất quán:

Phương án A \(ưu tiên nếu làm được trọn vẹn\): tính điểm uy tín thật từ hoạt động cộng đồng \(bài viết hữu ích, lượt thích, bình luận được duyệt\) theo 5 bậc: Thành viên mới / tích cực / uy tín / Người đóng góp / Trụ cột\. Hiện ở hồ sơ và trang cộng đồng\. Có cơ chế chống spam\. "Mức xác thực" lấy từ việc kết quả kỹ năng đã được đối chiếu với trận thật hoặc thành tích đã xác minh\.

Phương án B: nếu không làm trọn được, bỏ hai trục này khỏi mọi chữ quảng cáo và sửa lại chữ thành đúng những gì web thật sự có\. Dù chọn phương án nào, xóa hoặc cô lập dữ liệu mẫu \(CP\_PROFILE, CP\_EVENTS, RACKETS, POSTS\) để không lẫn vào giao diện thật\. AchievementPanel\.tsx đang ghi cứng sport: "badminton", và hiện ở cả tab bóng đá của Hồ sơ thể thao\. Người dùng gửi xong chỉ thấy số đã xác minh và số chờ duyệt\.

Hãy sửa:

Form theo môn đang chọn \(cầu lông / bóng đá\)\. Bóng đá có cấp giải, vị trí thi đấu, thành tích đồng đội\.

Thêm danh sách "Các khai báo của tôi": tên giải, ngày gửi, trạng thái \(chờ duyệt / đã xác minh / bị từ chối\), lý do từ chối do admin nhập\.

Cho sửa hoặc rút khai báo khi còn chờ duyệt, và gửi lại khi bị từ chối\.

Gửi thông báo cho người dùng khi admin duyệt hoặc từ chối\.

Trang admin duyệt cần hiện đủ minh chứng và có ô nhập lý do\. EquipmentNeeds\.tsx chỉ có trường cho cầu lông: lối chơi, dáng bàn chân, mức căng dây, ngân sách\. Tab Bóng đá của Hồ sơ thể thao đang dùng chung form này nên thiếu dữ liệu để tính % phù hợp\.

Hãy:

Form đổi theo môn đang chọn\. Bóng đá có thêm mặt sân \(cỏ nhân tạo AG, cỏ tự nhiên FG, sân phủ trong nhà IC\), dáng bàn chân, vị trí chơi, ngân sách\. Giữ nguyên các trường cầu lông\.

Lưu riêng theo môn\. Đồng bộ vào tài khoản khi đăng nhập\.

Cập nhật phần tính độ phù hợp \(fitFor trong lib/sportdna\) để dùng các trường bóng đá\. Giày sai loại đinh với mặt sân thì loại hẳn \(hard fail\)\.

Hiện lý do vì sao sản phẩm phù hợp hoặc không phù hợp trên trang sản phẩm và trang so sánh\.

Thay chữ "??%" bằng thông báo "Làm bài test để xem độ phù hợp" kèm nút dẫn đến bài test\. Hiện có 3 hệ tin nhắn tách rời: \(a\) chat với shop: ChatDock \(bong bóng\) và /tin\-nhan\. \(b\) nhắn tin giữa người dùng: CommunityMessenger, chỉ mở được từ khối Story ở trang cộng đồng\. \(c\) báo giá custom áo: hộp thoại riêng\.

Hãy gom thành một hộp thư thống nhất:

Một trang /tin\-nhan với các thẻ lọc: Shop, Bạn bè, Custom áo\. Bong bóng chat dùng chung đúng dữ liệu và đúng trạng thái đã đọc với trang này \(đọc ở đâu thì nơi kia cập nhật ngay, không chờ vòng hỏi 8 giây\)\.

Khi đang ở trang /tin\-nhan thì ẩn bong bóng chat nổi, và không bật toast cho cuộc trò chuyện đang mở\.

Thêm "Tin nhắn" vào menu avatar cho tất cả loại hội thoại, kèm số chưa đọc\.

Thêm nút bật/tắt thông báo chat \(hiện chỉ có "Bật"\)\. Tắt thì ngừng toast và thông báo trình duyệt, nhưng vẫn giữ số chưa đọc\.

Chỉ dùng một vòng hỏi dữ liệu cho cả trang, không để hai bộ đếm thời gian chạy song song\. Trang /cai\-dat còn dòng giữ chỗ "sắp ra mắt" \(khóa moreSoon\)\. Đăng nhập không có "Quên mật khẩu"\. Thiếu các chức năng tài khoản cơ bản\.

Hãy hoàn thiện:

"Quên mật khẩu": nhập email, gửi liên kết đặt lại, trang đặt mật khẩu mới có hạn dùng\. Không tiết lộ email có tồn tại hay không\.

Trong Cài đặt: đổi mật khẩu \(yêu cầu mật khẩu cũ\), tùy chọn thông báo \(đơn hàng, tin nhắn, cộng đồng, khuyến mãi, bật hoặc tắt từng loại\), xóa tài khoản \(xác nhận hai bước, giải thích dữ liệu nào bị xóa, dữ liệu đơn hàng giữ lại theo quy định\)\.

Đưa công tắc ngôn ngữ và sáng/tối ra header \(khu vực biểu tượng bên phải, gồm cả bản mobile\), vẫn giữ trong Cài đặt\.

Xóa dòng "sắp ra mắt"\. Trang sản phẩm đang ghi "Đổi trả 30 ngày" và "Chính hãng 100% — Kiểm tra mã xác thực", nhưng không có luồng nào làm được điều đó\. Trang /don\-hang chỉ cho hủy đơn\.

Hãy làm cho đúng thật:

Đổi trả: trong chi tiết đơn đã giao, trong 30 ngày có nút "Yêu cầu đổi trả" \(chọn sản phẩm, lý do, ảnh minh chứng\)\. Shop xử lý ở kênh người bán\. Khách theo dõi trạng thái và nhận thông báo\. Quá 30 ngày thì ẩn nút\.

Kiểm tra mã xác thực: thêm trang /xac\-thuc nhập mã trên sản phẩm, trả về hợp lệ hoặc không hợp lệ và thông tin sản phẩm\. Shop nhập hoặc tạo mã cho sản phẩm trong kênh người bán\. Nếu không làm được thì bỏ dòng đó\.

Trả góp 0%: thêm bước chọn kỳ hạn 3/6/9/12 tháng và thông tin thẻ cho đúng với mô tả\. Nếu không có cổng thanh toán thật thì gỡ lựa chọn này khỏi thanh toán\.

Rà các lời hứa khác trên web \(miễn phí giao hàng, thời gian giao\.\.\.\) cho khớp chính sách thật\. Story trong cộng đồng \(StoryRail\.tsx\) có thanh tiến trình nhưng đứng yên, không tự chuyển story, không có phản ứng hay trả lời\.

Hãy làm:

Thanh tiến trình chạy thật\. Ảnh hiện 5 giây, video hiện hết thời lượng, tự chuyển sang story kế rồi kế tiếp người, đóng khi hết\. Giữ chuột hoặc chạm giữ thì tạm dừng\. Chạm hai bên màn hình để lùi hoặc tiến\.

Người xem thả cảm xúc \(tim, like, ủng hộ\) và trả lời nhanh\. Trả lời gửi vào hộp thư nhắn tin riêng\.

Chủ story xem được ai đã xem\.

Thông báo khi có người phản ứng\. Dọn các chỗ còn "nửa vời":

Hồ sơ minh họa trong cộng đồng và giải đấu minh họa: ẩn khỏi người dùng thường, chỉ hiện cho quản trị\.

Trang Sale: thêm nút "Thêm vào giỏ", yêu thích và so sánh cho thẻ sản phẩm, giống trang chủ\.

Chân trang \(hotline, Zalo, Facebook, TikTok\) hiện trên mọi trang chính, không chỉ ở trang chủ, tìm kiếm và sản phẩm\.

Trang đơn hàng: lấy hotline từ cấu hình trang web thay vì ghi cứng 1900 8868\.

Rà toàn bộ chữ hiển thị còn viết cứng tiếng Việt \(nhất là trang SportDNA và Hồ sơ thể thao\) và đưa qua tr\(\) cho đủ bản tiếng Anh\. Ngày tháng theo ngôn ngữ đang chọn\.

Xóa mọi chữ nội bộ lộ ra giao diện: nhóm menu "Đã gộp vào web", câu "Scenario Court là component dùng chung…", "36 scenario = …"\. Lỗi: các nút mua nhanh đang thêm sản phẩm vào giỏ KHÔNG có size \(và luôn lấy màu đầu tiên\), trong khi trang sản phẩm \(ProductPurchase\.tsx\) bắt buộc chọn size với giày \(category chứa "giày"\) và áo/quần \(category chứa "áo" hoặc "quần"\)\. Hậu quả: đơn giày/áo bị thiếu size\.

Các chỗ cần sửa:

Storefront\.tsx: hàm addToCart và cardProps\.onBuy \(nút "Thêm vào túi" và "Mua ngay" trên ProductCard\)\.

giam\-gia/SaleCatalog\.tsx: hàm buy \(nút "Mua ngay"\)\.

components/SavedLists\.tsx: hàm addLite \(nút "Thêm vào giỏ" ở Yêu thích và So sánh\)\.

Yêu cầu:

Tạo một hàm dùng chung, ví dụ needsSize\(category\), dùng lại đúng quy tắc đang có trong ProductPurchase\.tsx để tránh lệch quy tắc\.

Nếu sản phẩm cần size thì KHÔNG thêm thẳng vào giỏ\. Thay vào đó mở trang /san\-pham/\[slug\] kèm thông báo "Vui lòng chọn kích thước"\. Giữ nguyên hành vi hiện tại với sản phẩm không cần size \(vợt, bóng, phụ kiện\)\.

Với nút "Mua ngay" trên thẻ sản phẩm: chỉ chuyển sang /thanh\-toan sau khi đã thêm thành công\. Không tự động cộng dồn vào món đã có trong giỏ mà không báo\.

Không đổi giao diện các nút\. Chỉ đổi hành vi\. Lỗi: thông tin phí vận chuyển mâu thuẫn nhau\.

Trang sản phẩm \(san\-pham/\[slug\]/page\.tsx, khối detail\-services\) ghi "Giao hàng miễn phí" và "Dự kiến 1–3 ngày"\.

Giỏ hàng \(CartView\.tsx\) và thanh toán \(CheckoutForm\.tsx\) lại ghi phí tính theo khoảng cách, từ DISTANCE\_TARIFF\.firstFee cho DISTANCE\_TARIFF\.firstKm đầu, do BOAI báo sau khi shop xác nhận còn hàng\.

Trang đơn hàng \(don\-hang/page\.tsx\) hiện "Miễn phí" khi order\.shipping bằng 0 và không phải trạng thái chờ báo phí\.

Yêu cầu:

Đổi dòng "Giao hàng miễn phí" ở trang sản phẩm thành nội dung đúng chính sách thật, ví dụ "Phí giao theo khoảng cách" kèm dòng phụ "Từ \{firstFee\}₫ cho \{firstKm\} km đầu"\. Lấy số từ DISTANCE\_TARIFF trong lib/shipping, không viết cứng\. Có đủ bản tiếng Việt và tiếng Anh qua tr\(\)\.

Ở don\-hang/page\.tsx, chỉ hiện "Miễn phí" khi phí ship thực sự được shop/BOAI chốt bằng 0\. Nếu chưa chốt thì hiện "Chờ BOAI báo phí"\.

Rà lại toàn bộ chuỗi có chữ "miễn phí" liên quan vận chuyển trong project và đảm bảo nhất quán với chính sách ở trên\. Lỗi: ảnh đại diện và ảnh bìa không đồng bộ giữa các trang\.

Nguyên nhân nghi ngờ \(hãy kiểm tra trước khi sửa\):

tai\-khoan/avatar\-actions\.ts \(updateAvatarAction\) ghi ảnh vào collection "users", field avatar và cover\.

nguoi\-dung/\[id\]/page\.tsx lấy ảnh từ collection "community\-profiles" qua lib/community\-profile\-view\.ts \(mediaUrl\(profile\.avatar\), mediaUrl\(profile\.cover\)\)\.

Hai nơi lưu khác nhau và không thấy bước đồng bộ trong action\.

Yêu cầu:

Kiểm tra xem có hook nào trong collection users hoặc community\-profiles đang đồng bộ avatar/cover không\. Nếu chưa có, chọn MỘT nguồn dữ liệu duy nhất\. Đề xuất: trong readCommunityProfilePage và toPerson \(community\-profile\-view\.ts\), lấy avatar/cover từ user liên kết với profile\.account, hoặc cập nhật cả community\-profiles trong updateAvatarAction khi người dùng đổi hoặc xóa ảnh\. Không để hai nguồn lệch nhau\.

Sau khi đổi/xóa ảnh ở /tai\-khoan, /nguoi\-dung/\[id\] của chính người đó phải hiện đúng ngay \(gọi revalidatePath cho trang đó nếu cần\)\.

Hiển thị ảnh đại diện thật thay vì chỉ chữ cái đầu ở các chỗ sau:

AccountMenu\.tsx \(nút avatar trên header\)\.

PostCard và danh sách bình luận trong cong\-dong/Community\.tsx \(hiện không truyền prop image cho CommunityAvatar\)\. Cần thêm avatar vào dữ liệu bài viết và bình luận trong lib/community\.

Danh sách thành viên và gợi ý kết bạn nếu đang thiếu\.

Nếu người dùng chưa có ảnh thì giữ chữ cái đầu như hiện tại\. Tui nhận bàn giao rồi, bắt tay vào bước 1: đọc nốt mấy file chưa đọc trong Make\. Tui nạp skill của Figma trước, rồi mới lấy danh sách file\.

\`CancelOrder\` gọi \`cancelOrderAction\` trong \`shop\-actions\.ts\`, đúng file cần để chốt B1\. Tui đọc nó cùng mấy file còn lại\.

Chốt được B1 rồi, ghi ở dưới\. Giờ thử đọc thẳng mấy file trong nhóm bị cắt bằng đường dẫn suy ra từ import \(\`@/lib/app\-auth\` → \`src/lib/app\-auth\.ts\`\)\.

C7 xác nhận: \`AuthForm\` không có link "Quên mật khẩu" nào\. Giờ tới E3: \`sitemap\`, \`robots\` và JSON\-LD\.

Giờ B6: tui đọc \`BankCourt\` để biết \`useSportDnaContext\` nằm ở đâu, rồi kiểm tra \`runs\` có rỗng khi chưa \`ready\` không\.

Tui làm xong phần đọc code và chốt các mục "Cần kiểm tra"\. Phần sửa mã \(bước 3\) với \`tsc\` \(bước 4\) thì chưa làm được, lý do ở cuối\. Ngoài ra bàn giao ghi file ngoài 200 file đầu không đọc được, thực ra đoán đúng đường dẫn là đọc được hết, nên không cần tải zip\.

Các mục "Cần kiểm tra" \(đã đọc mã thật\)

B1, hủy đơn: có tự kiểm tra lại\. \`cancelOrderAction\` tìm lại đơn bằng mã và SĐT ở server rồi mới hủy\. Việc GA lộ SĐT thì chưa kiểm, vì chưa đọc giá trị \`googleAnalyticsId\` ở \`makeSiteSettings\`\.

B2, kết quả Quick/Deep: không bị ghi đè\. Chúng lưu qua \`saveAssessmentAction\` vào \`sport\-assessments\`, còn các lượt test khác vào \`sport\-test\-runs\`\. \`saveAccountStateAction\` chỉ đụng \`shoppingState\`\.

B6, \`BankCourt\`: lỗi thật, nhưng chỉ ảnh hưởng số ELO hiển thị\. Effect của component con chạy trước effect của provider, nên lúc \`start\(\)\` chạy thì \`runs\` vẫn là \`\[\]\`\. ELO nền thành 1000 và không chạy lại khi dữ liệu về\. Server vẫn tính ELO đúng từ các lượt đã lưu\. Suy luận này từ thứ tự effect của React, ông nên test bằng cách refresh thẳng ở \`/sportdna/bank/cau\-long\-doi\`\.

B12, anchor: \`/sportdna\` có \`id="cau\-long"\` và \`id="bong\-da"\`, link trong URL ông gửi chạy được\.

C7, quên mật khẩu: không có\. \`AuthForm\` không có link nào, và danh sách file cũng không có trang hay route nào cho việc này\.

E3, SEO: trang sản phẩm không có \`generateMetadata\` lẫn JSON\-LD\. Không thấy \`sitemap\` hay \`robots\` ở \`src/app/sitemap\.ts\`, \`src/app/robots\.ts\`, \`public/robots\.txt\`\. Đây mới là "không thấy ở 3 chỗ chuẩn", chưa phải chắc chắn là không có\.

E8, tài khoản bị khóa: không phải lỗi\. Cái ném \`SUSPENDED\_MESSAGE\` là hook \`beforeLogin\` của \`Users\`, và \`loginAction\` bắt đúng nó\. Theo thứ tự Payload 3 như tui nhớ, hook này chạy sau khi mật khẩu đúng nên không lộ tài khoản tồn tại\. Chỗ này tui chưa chạy thử, ông test thử đăng nhập tài khoản bị khóa với mật khẩu sai và đúng là chắc\.

False alarm: \`saveTestRunAction\` gán cứng \`sport: "badminton"\` nhưng collection ghi đè lại từ \`TEST\_META\` phía server\. Không phải bug\.

Mới thấy thêm \(từ mã, chưa chạy\)

P1: trang sản phẩm ghi cứng "Giao hàng miễn phí", trong khi \`placeOrderAction\` để ship = 0 lúc tạo đơn rồi admin báo phí theo khoảng cách sau\. Hai chỗ mâu thuẫn nhau\.

P2: \`cancelOrderAction\` đọc trạng thái, cập nhật, rồi hoàn kho mà không khóa\. Hai request song song có thể cùng hoàn kho, làm tồn kho tăng ảo\. Chống nhấn đúp trên giao diện có rồi, nên chỉ xảy ra khi mở hai tab hoặc gọi thẳng\. \`placeOrderAction\` trừ kho kiểu đọc\-rồi\-ghi cũng có rủi ro tương tự\.

P3: hub \`/sportdna\` và \`BankCourt\` hardcode tiếng Việt, không qua \`tr\(\)\`, nên người dùng en vẫn thấy tiếng Việt\.

Hai bản vá đã đủ dữ kiện, ông dán vào Make

B6, trong \`BankCourt\.tsx\`: \`\`\`diff

const \{ runs \} = useSportDnaContext\(\)

const \{ runs, ready, authenticated \} = useSportDnaContext\(\)

// Quick không dùng ELO nền nên khỏi chờ; ELO phải chờ local và tài khoản đồng bộ xong\.

const loaded = \!scoreElo || \(ready && authenticated \!== null\) @@

useEffect\(start, \[sport\]\) // eslint\-disable\-line react\-hooks/exhaustive\-deps

useEffect\(\(\) => \{ if \(loaded\) start\(\) \}, \[sport, loaded\]\) // eslint\-disable\-line react\-hooks/exhaustive\-deps

if \(\!items\) return Đang tải bộ câu hỏi…

if \(\!loaded || \!items\) return Đang tải bộ câu hỏi… \`\`\` Trước khi dán cần xem \`lib/live\-feed\` có luôn resolve hoặc reject không\. Nếu nó treo thì \`authenticated\` mãi là \`null\` và trang sẽ kẹt ở "Đang tải"\.

B12, mật khẩu: tách câu báo lỗi trong \`auth\-actions\.ts\` và thêm \`maxLength\` cho form\. \`\`\`diff

if \(password\.length < 8 || password\.length > 128\) return \{ ok: false, error: tr\("Mật khẩu phải có ít nhất 8 ký tự\.", "Password must be at least 8 characters\."\) \}

if \(password\.length < 8\) return \{ ok: false, error: tr\("Mật khẩu phải có ít nhất 8 ký tự\.", "Password must be at least 8 characters\."\) \}

if \(password\.length > 128\) return \{ ok: false, error: tr\("Mật khẩu tối đa 128 ký tự\.", "Password must be at most 128 characters\."\) \} \`\`\` Trong \`AuthForm\.tsx\`, thêm \`maxLength=\{128\}\` vào input \`password\` và input \`confirmPassword\`\.

Chưa làm được và vì sao

File ông gửi tên \`prompt\-boai\-v3\-bo\-sung\.md\` nhưng bên trong là bản bàn giao\. Không có danh sách B1–E8, Phần A, hay thứ tự P0/P1\. Thiếu cái đó tui không biết sửa gì trước, nên ông gửi lại \`prompt\-boai\-3\-loi\-v2\.md\` và file v3 thật nhé\.

Tui không ghi ngược vào Make được, cũng không chạy \`tsc\` được vì không có repo\. Nên tui viết bản vá, ông dán vào Make rồi chạy \`tsc\` và test light/dark, vi/en, điện thoại, máy tính\.

Còn một số file chưa đọc: \`CheckoutForm\`, \`thanh\-toan/\*\`, \`lib/shipping\`, \`lib/live\-feed\`, \`hooks/\*\`, \`thong\-bao\`\. Chưa file nào cần cho sáu mục trên\. Có v3 thì tui đọc đúng những file mà mục nào cần, khỏi đọc tràn lan\# PROMPT BÀN GIAO: tiếp nhận công việc rà soát BOAI \(nối tiếp v2 và v3\)

Đọc file này trước\. Mục tiêu: bạn không phải kiểm tra lại những gì đã làm, chỉ làm tiếp phần dang dở\.

1\. Hiện trạng một câu

Đã rà soát và viết tài liệu, chưa sửa mã nào\. Có 3 file: \`prompt\-boai\-3\-loi\-v2\.md\` \(3 lỗi gốc, do người trước viết\), \`prompt\-boai\-v3\-bo\-sung\.md\` \(lỗi và ý tưởng mới, phần A chỉnh lại v2\), file này \(bàn giao\)\. Không có thay đổi nào trong repo hay trong Figma Make\.

2\. Đã làm xong, đừng làm lại

Đọc kỹ 20 file \(trong 200 file Figma trả về\): \`layout\.tsx\`, \`ShopProvider\`, \`ProductPurchase\`, \`Storefront\`, \`CartView\`, \`don\-hang/page\.tsx\`, \`AuthForm\`, \`auth\-actions\`, \`account\-state\-actions\`, \`api/app\-auth/login\`, \`api/live/\[feed\]\`, \`NotificationBell\`, \`ChatDock\`, \`sportdna/\_components/\{data, MySkill, EquipmentNeeds, PositionQuiz, BankCourt, LoginGate\}\`, \`docs/sportdna\-brief\.md\`\.

Các kết luận trong v3 ghi "Đã xác minh" đều lấy từ mã thật của các file trên, có thể tin dùng và sửa luôn\.

Đã đối chiếu v2 với mã: khớp ở danh sách size, \`saveAccountStateAction\` lưu \`size\`, \`CartView\` đã dùng \`DISTANCE\_TARIFF\`\. Không cần kiểm tra lại các điểm này\.

3\. Dang dở \(làm theo thứ tự\)

Đọc các file chưa đọc \(166 file Figma không trả về\): \`CheckoutForm\`, \`placeOrderAction\`, \`previewCheckoutAction\`, \`thanh\-toan/\*\`, \`lib/app\-auth\`, \`lib/shipping\`, \`lib/sportdna\*\`, \`lib/live\-feed\`, \`collections/\*\`, \`hooks/\*\`, \`sportdna/actions\.ts\`, các trang \`/sportdna/\*\`, \`thong\-bao\`, \`SaleCatalog\`, \`SavedLists\`, \`AccountMenu\`, \`CancelOrder\`\. Cách lấy: tải zip Make từ giao diện Figma, hoặc làm trực tiếp trên repo thật nếu có\.

Chốt các mục "Cần kiểm tra" trong v3 bằng chính các file ở bước 1:

B1: server action hủy đơn \(\`CancelOrder\`\) có tự kiểm tra lại mã \+ SĐT không\.

B2: kết quả Quick/Deep mới \(\`SkillResult\`\) lưu bằng đường nào, có bị \`saveAccountStateAction\` ghi đè không\.

B12 \(mục anchor \`\#cau\-long\`\): trang \`/sportdna\` có \`id="cau\-long"\` không \(hiện chỉ thấy ở trang chủ\)\.

C7, E3: có luồng quên mật khẩu, \`sitemap\`, \`robots\`, JSON\-LD chưa\.

E8: \`appAuth\.login\` có ném \`SUSPENDED\_MESSAGE\` trước khi kiểm tra mật khẩu không\.

Sửa mã theo thứ tự ở cuối v3 \(P0 trước\)\. Làm 3 lỗi của v2 kèm Phần A của v3 thay cho cách ghi gốc trong v2 ở các điểm đã nêu\.

Cuối cùng chạy \`tsc\`, kiểm tra light/dark, vi/en, điện thoại và máy tính\.

4\. Lưu ý để khỏi mắc lại

Đừng tin điều tôi chưa xác minh\. Có một điều tôi nghĩ ban đầu rồi đã bỏ: mật khẩu > 128 ký tự \*không\* gây khóa tài khoản, vì \`registerAction\` cũng chặn > 128\. Lỗi thật chỉ là câu báo sai \("ít nhất 8 ký tự"\) và form thiếu \`maxLength\` \(v3, B12\)\.

B4 \(\`src\` rỗng\): đã thấy \`imageOf\(\)\` trả \`""\`; việc Next\.js ném lỗi hay chỉ không vẽ ảnh chưa thử chạy\. Cứ thêm ảnh dự phòng, an toàn cả hai trường hợp\.

B6 \(\`BankCourt\`\): đã thấy mã bỏ qua \`ready\`, nhưng chưa chạy thật để xem ELO nền có sai không\. Đọc \`useSportDnaContext\` để biết \`runs\` có rỗng khi chưa \`ready\` không trước khi sửa\.

B1 \(GA lộ SĐT\): chỉ xảy ra khi \`googleAnalyticsId\` được cấu hình ở \`makeSiteSettings\`; kiểm tra giá trị thật\. Việc SĐT nằm trên URL thì chắc chắn\.

E1–E2 \(polling, font\): số liệu lấy từ hằng số trong mã \(8 giây, 60 giây, danh sách font\), chưa đo hiệu năng thật\. Đo trước khi báo cải thiện bao nhiêu\.

Quy định giữ nguyên từ v2: không xóa dữ liệu người dùng, không lộ email/SĐT/địa chỉ, không nới quyền, không đưa khóa API vào mã trình duyệt, mọi chữ mới có vi/en qua \`tr\(\)\`/\`t\(\)\`\.

5\. Mẹo công cụ \(nếu cần đọc lại Figma Make\)

Link \`figma\.com/make/\.\.\.\` không fetch trực tiếp được \(bị chặn robot\)\.

Dùng connector Figma: đọc skill \`figma\-design\-to\-code\` trước, rồi \`get\_design\_context\` với \`fileKey = gV5zMiRHh1fnZgsJavLAoY\`, \`nodeId = 0:1\`\. Kết quả chỉ liệt kê 200 file đầu \(theo thứ tự chữ cái đường dẫn, dừng ở \`sportdna/\_components/PracticeDrill\.tsx\`\)\.

Đọc từng file bằng \`read\_resource\_link\` với \`source: "Figma"\` và \`uri\` dạng \`file://figma/make/source//<đường dẫn>\`\. Nếu thấy \`tool\_search\` chưa nạp tool này, gọi \`tool\_search\` với "read\_resource\_link" trước\.

Không có tool nào ghi ngược vào Make; mọi thay đổi phải làm trên repo thật\.

6\. Định nghĩa hoàn thành

Các mục "Cần kiểm tra" đã được xác minh hoặc gạch bỏ trong v3 \(ghi kết quả ngay trong file\)\.

3 lỗi v2 và các mục P0/P1 của v3 đã sửa, \`tsc\` sạch\.

Tóm tắt cuối ghi rõ: đã làm, đã bỏ qua và vì sao, còn tồn đọng\.

Kiểm tra lại, nếu đã sửa thì bỏ qua\. SellerNav\.tsx có link tới /kenh\-ban\-hang/doi\-tra nhưng trang không tồn tại\. Khách gửi được yêu cầu đổi trả \(ReturnPanel, return\-actions\.ts\) nhưng shop không có chỗ xử lý, dù hàm updateReturnRequestAction đã có\.

Hãy tạo trang /kenh\-ban\-hang/doi\-tra:

Danh sách yêu cầu đổi trả của shop, có bộ lọc theo trạng thái \(chờ xử lý / đã chấp nhận / đã nhận hàng / đã hoàn tiền / từ chối\)\. Mỗi dòng gồm mã, đơn hàng, sản phẩm, lý do, ảnh minh chứng, ngày gửi\.

Chi tiết và nút thao tác theo đúng thứ tự trạng thái\. Từ chối bắt buộc nhập lý do \(lưu vào sellerNote và hiện cho khách ở ReturnPanel\)\.

Gửi thông báo cho khách mỗi khi trạng thái đổi\.

Hiện số yêu cầu chờ xử lý trên SellerNav và trang tổng quan kênh bán hàng\.

Chỉ shop sở hữu đơn mới xem và xử lý được\. Admin thấy toàn bộ trong /quan\-tri\. Cải tiến: hiện hạn xử lý \(ví dụ 3 ngày làm việc\) và đánh dấu đỏ khi quá hạn\.

Kiểm tra lại, nếu đã sửa thì bỏ qua\. Trang sản phẩm trỏ tới /xac\-thuc, SellerNav trỏ tới /kenh\-ban\-hang/xac\-thuc, cả hai đều chưa tồn tại dù collection authenticity\-codes đã có\.

Hãy làm:

/kenh\-ban\-hang/xac\-thuc: shop chọn sản phẩm, nhập số lượng, hệ thống sinh mã ngẫu nhiên không đoán được\. Có trang in danh sách mã kèm mã QR trỏ tới /xac\-thuc/\[mã\]\.

/xac\-thuc: ô nhập mã\. /xac\-thuc/\[mã\]: hiện hợp lệ hay không hợp lệ, tên sản phẩm, shop bán, lần kiểm tra đầu tiên\.

Cải tiến: đếm số lần mã bị tra\. Từ lần thứ 3 trở đi hiện cảnh báo "Mã đã được kiểm tra nhiều lần, hãy cẩn trọng"\. Có giới hạn số lần thử mỗi IP để chống dò mã\.

Trang sản phẩm chỉ hiện nút "Kiểm tra mã xác thực" khi sản phẩm đã có mã\. Nếu không làm trọn vẹn được thì bỏ chữ đó khỏi giao diện\. Kiểm tra lại, nếu đã sửa thì bỏ qua\. Công tắc ngôn ngữ và sáng/tối đang chỉ nằm trong /cai\-dat\.

Trong SiteHeader\.tsx, ở nhóm biểu tượng bên phải \(gần chuông thông báo\): thêm nút VI | EN và nút mặt trời/mặt trăng\. Trên mobile đưa vào menu mở ra từ nút hamburger\.

Dùng lại đúng hàm đổi ngôn ngữ và giao diện của SettingsView \(cookie, đồng bộ vào tài khoản qua shoppingState\.theme và language, router\.refresh\)\.

Cải tiến: lần đầu vào web thì theo ngôn ngữ và chế độ sáng/tối của hệ thống thiết bị \(prefers\-color\-scheme, Accept\-Language\), sau đó nhớ lựa chọn\. Không bị nháy sáng rồi tối khi tải trang\.

Giữ công tắc trong /cai\-dat đồng bộ với header\. Kiểm tra lại, nếu đã sửa thì bỏ qua\. SettingsView\.tsx còn dòng "sắp ra mắt" \(khóa moreSoon\)\. Đăng nhập chưa có "Quên mật khẩu"\. Users đã có field notificationPrefs nhưng chưa có giao diện\.

Xóa dòng moreSoon\.

Thêm vào /cai\-dat mục "Thông báo": công tắc cho từng loại \(theo dõi, cộng đồng, đơn hàng, tin nhắn, khuyến mãi\) dùng notificationPrefs\. Đảm bảo phần tạo thông báo và hộp thư thực sự tôn trọng các lựa chọn này\.

Thêm "Đổi mật khẩu" \(yêu cầu mật khẩu cũ\) và "Xóa tài khoản" \(xác nhận hai bước, nói rõ dữ liệu nào bị xóa, dùng cleanupAccount có sẵn\)\.

"Quên mật khẩu": dùng cơ chế forgot\-password có sẵn của Payload, trang đặt lại mật khẩu có hạn dùng, không tiết lộ email có tồn tại\. Nếu chưa có dịch vụ gửi email thì ẩn link này và ghi vào danh sách chức năng đang hoàn thiện, đừng làm giả\. Kiểm tra từng mục, mục nào đã sửa thì bỏ qua:

CheckoutForm\.tsx đang hiện dòng "Thử: …" liệt kê toàn bộ mã giảm giá\. Bỏ dòng này\. Mã chỉ hiện cho người đã nhận được\.

so\-sanh/page\.tsx: khi đổi sản phẩm ở ô 1, sản phẩm cũ ở ô 2 nhảy lên ô 1\. Giữ đúng thứ tự theo ô\.

Chữ "??%" ở thẻ Storefront và trang So sánh\. Thay bằng "Làm bài test để xem độ phù hợp" kèm nút dẫn tới SportDNA\.

Trang chủ, tìm kiếm, yêu thích, so sánh chỉ tải 100 sản phẩm\. Với yêu thích và so sánh, tải đúng các sản phẩm theo slug\. Với trang chủ và tìm kiếm, thêm phân trang hoặc nút "Xem thêm"\.

Storefront\.tsx và SavedLists\.tsx: nếu sản phẩm không có ảnh thì hiện khung giữ chỗ, không truyền src rỗng cho Image\. Kiểm tra lại, nếu đã sửa thì bỏ qua\. /giai\-dau chỉ để xem, không có link vào, có dữ liệu minh họa và chưa có đăng ký\. Match Rating không hiện ở hồ sơ\.

Thêm "Giải đấu" vào ExploreMenu và SportDnaMenu\.

Cho thành viên đăng nhập đăng ký giải đang mở \(đơn hoặc đôi, nhập đồng đội bằng mã cộng đồng\)\. Trạng thái chờ duyệt / đã duyệt / từ chối, có thông báo khi duyệt\.

Hiện MR, bậc và lịch sử trận ở SportProfile\.tsx, kèm công tắc "công khai tên trên trang giải đấu"\.

Giải minh họa chỉ hiện cho admin hoặc gắn nhãn rõ ràng\. Admin duyệt đăng ký và nhập kết quả trong /quan\-tri\. Nếu thấy quá lớn, làm tối thiểu: link menu \+ đăng ký \+ hiện MR\. Kiểm tra lại, nếu đã sửa thì bỏ qua\.

sportdna/page\.tsx quảng cáo "5 trục độc lập" nhưng hồ sơ chỉ có kỹ năng, thành tích và thiết bị\. Phương án chọn: bỏ "Uy tín cộng đồng" và "Mức xác thực" khỏi mọi chữ quảng cáo, hoặc làm đủ điểm uy tín thật từ hoạt động cộng đồng\. Chọn phương án nhanh và đúng sự thật\.

Xóa chữ nội bộ: "Scenario Court là component dùng chung…", "36 scenario = …", nhóm menu "Đã gộp vào web" trong SportDnaMenu\.

Dọn dữ liệu mẫu \(CP\_PROFILE, RACKETS, POSTS\) trong sportdna/\_components/data\.ts nếu không còn dùng\.

"Thiết bị hợp với bạn" đang chỉ dẫn tới cầu lông\. Chuyển tới môn người dùng chơi mạnh nhất và sắp xếp kết quả /tim\-kiem theo độ phù hợp SportDNA\.

Việt hóa toàn bộ chữ cứng trong trang SportDNA và Hồ sơ thể thao qua tr\(\) để có bản tiếng Anh\. Kiểm tra lại, nếu đã sửa thì bỏ qua\.

AchievementPanel\.tsx đang ghi cứng sport "badminton"\. Làm form theo môn đang chọn\. Thêm danh sách "Khai báo của tôi" \(trạng thái, lý do từ chối\), cho sửa hoặc rút khi còn chờ duyệt, và thông báo khi admin duyệt\.

EquipmentNeeds\.tsx chỉ có trường cầu lông\. Thêm form bóng đá dùng các field footballSurface, footballFootShape, footballPosition, footballBudget đã có trong Users\. Cập nhật phần tính độ phù hợp: giày sai loại đinh với mặt sân thì loại hẳn\.

Lý do phù hợp hoặc không phù hợp hiện trên trang sản phẩm và trang so sánh\. Kiểm tra lại, nếu đã sửa thì bỏ qua\. StoryRail\.tsx có thanh tiến trình đứng yên\. Các collection story reaction và story view đã có trong payload\.config nhưng giao diện chưa dùng\.

Ảnh hiện 5 giây, video hiện hết thời lượng, tự chuyển story kế và người kế\. Giữ chuột hoặc chạm giữ thì tạm dừng\. Chạm hai bên để lùi hoặc tiến\.

Người xem thả cảm xúc và trả lời nhanh\. Trả lời đi vào hộp thư nhắn tin riêng\.

Chủ story xem được danh sách người đã xem\. Có thông báo khi có phản ứng\.

Rà toàn bộ link nội bộ \(menu, SellerNav, trang quản trị, footer\) và đảm bảo không còn link 404\.

Chân trang \(hotline, Zalo, Facebook, TikTok\) hiện trên mọi trang chính, không chỉ trang chủ, tìm kiếm và sản phẩm\.

Không còn chữ "sắp ra mắt", dữ liệu mẫu hay chữ nội bộ lộ ra giao diện\. Dữ liệu minh họa gắn nhãn rõ ràng\.

Tạo tài khoản demo sẵn: 1 khách hàng, 1 người bán đã duyệt \(có sản phẩm, đơn hàng, yêu cầu custom và đổi trả mẫu\), 1 admin\. Liệt kê email và mật khẩu để tôi đưa vào báo cáo\.

Cuối cùng liệt kê chức năng nào còn dang dở để tôi ghi đúng vào checklist báo cáo\. Kiểm tra lại code hiện tại trước khi sửa \(lib/sportdna, sportdna/\_components/data\.ts, sportdna/page\.tsx, tai\-khoan/SportProfile\.tsx\)\. Nếu phần nào đã đúng thì giữ nguyên\.

Mục tiêu: SportDNA phải hoạt động đầy đủ và độc lập cho CẢ HAI môn\. Hiện bóng đá đang yếu hơn cầu lông \(dữ liệu, câu hỏi, trục đánh giá\)\.

Ngân hàng câu hỏi riêng cho từng môn, tối thiểu 18 tình huống mỗi môn, chia đều 3 nhóm: kỹ thuật, chiến thuật, thể lực/tâm lý\. Tình huống bóng đá phải có vị trí \(tiền đạo, tiền vệ, hậu vệ, thủ môn\) và mặt sân \(AG, FG, IC\)\. Tình huống cầu lông có lối chơi \(tấn công, phòng thủ, toàn diện\)\.

Trục mạng nhện riêng cho từng môn, 8 trục:

Cầu lông: smash, drop, lưới, phòng thủ, di chuyển, sức bền, ổn định, chiến thuật\.

Bóng đá: kiểm bóng, chuyền, sút, rê dắt, vị trí, tốc độ, phòng ngự, sức bền\.

Tính điểm trình độ \(ELO\) riêng cho từng môn, cùng 10 bậc\. Một người chơi cả hai môn thì có hai điểm, không cộng chung\.

Bộ tính độ phù hợp \(%\) dùng chung một hàm có tham số theo môn\. Giày bóng đá sai loại đinh với mặt sân thì loại hẳn, không tính %\. Vợt cầu lông không hợp lực căng dây hoặc thế cầm thì trừ điểm có lý do\.

Chống làm bừa: nếu các câu trả lời mâu thuẫn nhau nhiều \(ví dụ chọn "rất giỏi" ở tình huống khó nhưng chọn "mới chơi" ở tình huống dễ\) thì hiện cảnh báo và cho làm lại một phần\.

Kết quả giải thích được: mỗi trục hiện điểm, mỗi bậc hiện điều kiện để lên, và 2–3 gợi ý luyện tập cụ thể\.

Lưu hồ sơ riêng cho từng môn \(đã có sportDnaProfiles trong Users, tối đa 2 môn\)\. Làm lại bài thì ghi lịch sử, không ghi đè mất điểm cũ\.

Toàn bộ chữ hiển thị có bản tiếng Việt và tiếng Anh qua tr\(\)\. Không để chữ nội bộ lộ ra giao diện\.

Cuối cùng liệt kê: số câu mỗi môn, công thức ELO, các trục, và phần còn thiếu\. Kiểm tra lại code hiện tại trước khi sửa \(giam\-gia/, Storefront\.tsx, admin sự kiện trong quan\-tri, kenh\-ban\-hang, SiteHeader saleDiscount, CheckoutForm, lib liên quan đến giảm giá\)\. Giữ những gì đã đúng\.

Mục tiêu: luồng Sale đầy đủ từ người bán đăng ký, admin duyệt, shop quản lý, đến khách mua và đơn hàng ghi đúng giá\.

Trang /giam\-gia \(khách\): 4 mục Tất cả / Giày / Vợt / Quần áo\. Mỗi thẻ có giá gốc, giá sau giảm, % giảm, thời gian còn lại, số lượng suất còn lại \(nếu là flash sale\)\. Có nút Thêm giỏ, Mua ngay \(thêm đúng size/màu, không bỏ qua bước chọn size\), yêu thích, so sánh\.

Đăng ký sự kiện \(người bán\):

Trong kênh bán hàng, chọn sự kiện đang mở đăng ký, chọn sản phẩm đính kèm, nhập % giảm và số lượng suất\.

Trạng thái: nháp / chờ duyệt / đã duyệt / từ chối \(kèm lý do\) / đang chạy / đã kết thúc\.

Không cho đăng ký khi sản phẩm đang nằm trong sự kiện khác chồng thời gian\.

Quản lý Sale của người bán: danh sách sản phẩm đang tham gia, sửa % giảm khi còn chờ duyệt, rút sản phẩm, xem doanh số và số suất đã bán\.

Giảm giá % tùy chỉnh:

% giảm riêng cho từng sản phẩm, hoặc áp một % cho cả nhóm đã chọn \(chọn nhiều sản phẩm\)\.

Trần % do admin đặt cho mỗi sự kiện \(ví dụ tối đa 70%\)\. Vượt trần thì báo lỗi rõ ràng\.

Giá sau giảm làm tròn đến nghìn đồng\.

Admin \(/quan\-tri\): tạo sự kiện \(tên, thời gian, banner, trần %, nhóm sản phẩm được phép\), duyệt hoặc từ chối đăng ký của từng sản phẩm, bật hoặc tắt sự kiện ngay\.

Tự động: đến giờ bắt đầu thì sản phẩm lên Sale, đến giờ kết thúc thì trả về giá gốc, không cần ai bấm\. Đơn đặt trước giờ kết thúc giữ giá đã chốt lúc đặt\.

Thanh toán và đơn hàng: lưu giá gốc và giá sale vào từng dòng đơn \(ảnh chụp giá lúc mua\), để đổi giá sau này không làm sai đơn cũ\. Biểu tượng "Sale −x%" trên header lấy từ sự kiện đang chạy\.

Thông báo: khi sự kiện được duyệt thì báo cho shop, khi sắp bắt đầu thì báo cho người theo dõi shop \(tôn trọng notificationPrefs\.promotions\)\.

Kiểm tra: không cho giá sau giảm thấp hơn 0, không cho hai sự kiện chồng lên cùng một sản phẩm trong cùng khung giờ, khách không xem được danh sách đăng ký chờ duyệt của shop khác\.

Cuối cùng liệt kê: luồng nào đã chạy, luồng nào còn thiếu, và các quy tắc giá đã áp dụng\. Bạn là người kiểm tra độc lập, không phải người vừa làm\. Nhiệm vụ: đối chiếu công việc đã làm với danh sách yêu cầu, không bỏ sót mục nào\.

CHẾ ĐỘ LÀM VIỆC TỰ KIỂM TRA \(áp dụng cho toàn bộ phiên này\)

Mục tiêu: hoàn thành các hạng mục dưới đây trong MỘT phiên duy nhất, tự kiểm tra sau mỗi đợt sửa, và chỉ dừng khi đạt điều kiện ở mục "Điều kiện dừng"\.

PHẠM VI A\. SportDNA chuyên sâu cho cầu lông và bóng đá, độc lập, ngang nhau\. B\. Hoàn thiện Sale: trang /giam\-gia, đăng ký sự kiện, quản lý Sale của shop, giảm % tùy chỉnh, đăng kèm sản phẩm, admin tạo và duyệt sự kiện, tự bật tắt theo giờ, lưu giá vào đơn\. C\. Các mục đang dở đã liệt kê trước đó: đổi trả phía shop, mã xác thực, công tắc sáng/tối và ngôn ngữ ra header, Cài đặt \(đổi mật khẩu, xóa tài khoản, thông báo\), giải đấu tối thiểu \(link, đăng ký, hiện MR\), story, chữ "??%", chữ nội bộ, dữ liệu mẫu, link 404\.

QUY TRÌNH \(lặp cho đến khi đạt điều kiện dừng\)

Lập bảng yêu cầu\. Từ các hạng mục A, B, C, đánh mã \(SD\-01, SALE\-01, OPS\-01…\)\. Mỗi dòng là một việc kiểm tra được\.

Làm\. Sửa theo thứ tự: kiểu dữ liệu và collection trước, rồi logic, rồi giao diện\. Nếu một mục đã đúng thì giữ nguyên, không làm lại\.

Tự kiểm tra bằng code, không tin vào lời tóm tắt của chính mình:

Route hoặc file có tồn tại không\.

Nút và luồng có nối tới chức năng thật không, hay chỉ là giao diện\.

Dữ liệu có được lưu và đọc lại không\.

Còn sót chữ "sắp ra mắt", dữ liệu mẫu hay chữ nội bộ không\.

Có link nào trỏ tới trang không tồn tại không\.

Ghi bảng kết quả: | Mã | Yêu cầu | Trạng thái | File / route | Cách đã kiểm | Còn thiếu | Trạng thái chỉ được là: ✅ có bằng chứng từ code / ð¡ một phần \(nói rõ phần nào\) / ⬜ chưa làm \(ghi lý do\) / ❌ lỗi\.

Nếu còn ð¡, ⬜, ❌ mà làm được, quay lại bước 2 cho các mục đó\.

ĐIỀU KIỆN DỪNG \(chỉ dừng khi cả ba đều đúng\)

Không còn mục nào ở trạng thái ❌ hoặc ⬜ mà làm được trong phạm vi này\.

Mọi mục ✅ đều có bằng chứng từ code, không mục nào ghi ✅ mà chưa kiểm\.

Lần kiểm tra cuối không phát hiện lỗi mới nào\. Nếu có lỗi mới, mã bắt đầu bằng NEW, và phải sửa rồi kiểm lại\. Nếu sau 3 vòng vẫn còn mục chưa đạt, dừng và liệt kê rõ mục nào, vì sao chưa làm được, và cần ní quyết định gì\. Đây là trường hợp được phép dừng sớm, không cần tiếp tục vòng thứ tư\.

RÀO CHẮN

Không xóa dữ liệu người dùng đã có \(đơn hàng, tài khoản, bài viết, thiết kế áo, yêu cầu custom\)\.

Không làm lộ thông tin riêng tư và không nới lỏng quyền\.

Không đưa khóa API hay bí mật vào mã chạy trên trình duyệt\.

Dữ liệu minh họa phải gắn nhãn rõ ràng hoặc ẩn khỏi người dùng thường\.

Mọi chữ hiển thị mới có bản tiếng Việt và tiếng Anh qua tr\(\)\.

KẾT THÚC PHIÊN \(chỉ viết khi đã dừng\) \(a\) Bảng kết quả cuối cùng, đầy đủ mọi mã\. \(b\) Số mục ✅ / ð¡ / ⬜ / ❌, và số vòng đã chạy\. \(c\) Danh sách việc còn dang dở, viết theo cách dùng được trong báo cáo môn học\. \(d\) Các file đã đổi, để tôi xem lại\. \(e\) Hướng dẫn tạo tài khoản demo và liệt kê email, mật khẩu, không đưa mật khẩu thật\.

sua lai cho toi cai thanh tim kiem o trang chu, khi nhap phim thi no nhay trang

### <a id="_9j98niukjpxc"></a>T23

BỐI CẢNH Bạn đang sửa dự án BOAI \(sàn TMĐT đồ bóng đá và cầu lông, Next\.js \+ React \+ Tailwind \+ Payload CMS, giao diện tiếng Việt, có bản EN qua hàm tr\(\)\)\. Hãy ĐỌC mã hiện có trước khi sửa: tái dùng component, biến CSS \(\-\-line, \-\-lime, \-\-ink…\) và quy ước đặt tên sẵn có\. Không tạo giao diện mới lệch phong cách\.

QUY TẮC CHUNG

Làm lần lượt theo thứ tự mục\. Xong mỗi mục, tự kiểm tra trên giao diện rồi mới sang mục sau\.

Mọi chuỗi mới phải có cả tiếng Việt và tiếng Anh \(dùng tr\(\)\)\. Hỗ trợ dark mode và màn hình điện thoại \(rộng 375px\)\.

Mỗi form mới cần đủ: trạng thái đang tải, thông báo lỗi bằng tiếng Việt cụ thể, trạng thái rỗng\.

Khi "gỡ" một chức năng: gỡ khỏi giao diện, menu, footer, route; KHÔNG xóa dữ liệu trong database\. Các route cũ chuyển hướng 308 về trang chủ\.

Không đụng tới những gì không nêu\. Cuối cùng báo lại mục nào không làm được và lý do\.

======== ĐỢT 1: DỌN DẸP VÀ SỬA LỖI HIỂN THỊ ========

1\.1 GỠ GIẢI ĐẤU, THÀNH TÍCH, MATCH RATING Gỡ hoàn toàn: route /giai\-dau và /giai\-dau/\[id\]; /quan\-tri/giai\-dau và mục "Giải đấu" trong menu admin; link "Giải đấu" ở footer, ở menu SportDNA \(nhóm "Hồ sơ & thi đấu" đổi tên thành "Hồ sơ"\) và thẻ "Giải đấu" ở trang tổng quan /sportdna; chức năng "Khai báo thành tích" và AchievementCard ở /tai\-khoan và /nguoi\-dung/\[id\]; mọi chữ "Match Rating", "thành tích đã xác minh"\. Trang /sportdna đổi câu mô tả "3 phần riêng biệt" thành 2 phần: "Kỹ năng \(ELO và 8 trục cho từng môn\)" và "Độ phù hợp thiết bị"\. Điểm hiển thị chỉ còn ELO từ bài đánh giá\. LƯU Ý: "Sự kiện sale" \(quan\-tri/su\-kien, kenh\-ban\-hang/su\-kien\) KHÔNG phải giải đấu, giữ nguyên\.

1\.2 ĐÁNH GIÁ THẬT, THAY "ĐỘ TIN CẬY" Ở TRANG CỬA HÀNG

Trang /cua\-hang/\[id\]: bỏ hoàn toàn khối "Độ tin cậy", "Cách tính điểm tin cậy", điểm /100 và nhãn "Cần cải thiện"\. Thay bằng: "★ 4\.6 \(23 đánh giá\)" là trung bình cộng sao của mọi đánh giá thật thuộc các sản phẩm của shop \(làm tròn 1 chữ số thập phân\), kèm phân bố 5→1 sao dạng thanh ngang\. Chưa có đánh giá thì hiện "Chưa có đánh giá", không hiện 0 hay "—"\.

Bỏ điểm tin cậy cả ở thẻ người bán trên trang chi tiết sản phẩm \(ShopSellerCard\); thay bằng cùng chuỗi "★ x\.x \(n\)"\.

Điểm sao và số đánh giá trên thẻ sản phẩm, trang sản phẩm, trang shop PHẢI tính từ bảng đánh giá thật\. Xóa mọi số liệu cứng kiểu 4\.9 \(86\); nếu dữ liệu mẫu đang lưu sẵn các con số này, chạy script đặt lại bằng giá trị tính từ đánh giá thật\.

Admin /quan\-tri/danh\-gia \(kiểm duyệt đánh giá và bình luận\): thêm bộ lọc theo sao gồm Tất cả, 5★, 4★, 3★, 2★, 1★ \(mỗi nút kèm số lượng\), kết hợp được với bộ lọc có/không bình luận hiện có\.

1\.3 SỬA GIÁ VÀ SALE

Lỗi: một số sản phẩm có giá bán CAO hơn giá gạch \(Felet Crystal Bloom 838\.799₫ / gạch 699\.000₫; Mizuno JPX 2\.912\.400₫ / 2\.427\.000₫; Ống cầu VS NL500 360\.000₫ / 300\.000₫; Adidas Al Rihla Pro 4\.000\.000₫ / 3\.790\.000₫\)\. Ba sản phẩm đầu có giá bán đúng bằng giá gạch × 1,2: hãy tìm nơi nhân 1,2 \(VAT, phụ thu hay lỗi quy đổi\) và sửa tận gốc để mọi nơi \(thẻ, chi tiết, giỏ, thanh toán, đơn\) dùng cùng một giá\.

Quy tắc hiển thị: chỉ hiện giá gạch và nhãn "−x%" khi oldPrice > price\. Ở form seller, chặn lưu khi giá cũ ≤ giá bán \(nếu có điền\) và khi giá bán < 10\.000₫\.

Ẩn sản phẩm test "Giày NIke" \(KLFOOTBALL, 1\.000₫ gạch 1\.200\.000₫, −99%\)\. Banner "Giảm đến 99%" và nút "Sale −99%" ở menu phải tính từ % giảm thật lớn nhất của các sản phẩm đang hiển thị trên /giam\-gia\.

Sửa lỗi chính tả banner sự kiện: "chi ân" → "tri ân"\.

1\.4 BỘ LỌC VÀ SẮP XẾP THỐNG NHẤT

Trang /tim\-kiem: thay các danh sách dài \(Loại, Danh mục, Thương hiệu\) bằng bố cục GỌN GIỐNG TRANG CHỦ: tab môn \(Tất cả / Bóng đá / Cầu lông\), hàng chip "Loại", một nút "Bộ lọc" mở popover \(desktop\) hoặc bottom sheet \(điện thoại\) chứa: Thương hiệu \(nhiều lựa chọn, kèm số lượng, ẩn mục có 0 sản phẩm như "Puma 0"\), Khoảng giá \(ô từ–đến và các mức gợi ý\), Size, Màu sắc, Chỉ hiện còn hàng\. Dưới thanh công cụ hiện các chip bộ lọc đang áp dụng, mỗi chip có dấu ×, cùng nút "Xóa tất cả" và dòng "N sản phẩm phù hợp"\. Toàn bộ bộ lọc đồng bộ với URL \(chia sẻ link giữ nguyên lọc\)\.

Chuẩn hóa danh mục: ở form sản phẩm của seller, "Danh mục" là dropdown từ danh sách chuẩn \(Giày, Vợt, Quả cầu, Bóng, Quần áo, Túi & balo, Phụ kiện\) thay vì gõ tự do\. Gộp các giá trị trùng nghĩa hiện có \("Giày bóng đá"→Giày, "Vợt cầu lông"→Vợt, "Áo thi đấu"/"Váy"→Quần áo, "Cầu"/"Cầu lông"→Quả cầu, "Bóng thi đấu"→Bóng\)\. Số đếm trong bộ lọc phải khớp số sản phẩm thật \(hiện "Bóng 19" lệch với "Loại: Bóng 4"\)\.

Dùng MỘT component sắp xếp cho cả trang chủ và /tim\-kiem với 5 lựa chọn: Phù hợp nhất, Mới nhất, Giá tăng dần, Giá giảm dần, Đánh giá cao\. "Phù hợp nhất" = theo độ phù hợp SportDNA nếu người dùng có hồ sơ, ngược lại theo mặc định\. Không để nút bị vô hiệu hóa mà không giải thích\.

1\.5 CỘNG ĐỒNG: BÀI CŨ ĐỒNG BỘ CHỨC NĂNG MỚI

Tạo MỘT component PostHeader dùng cho mọi bài \(kể cả bài cũ\): avatar tròn, tên tác giả là link tới /nguoi\-dung/\[id\], nút Theo dõi \(ẩn nếu là bài của chính mình\), thời gian, tên chuyên mục\. Avatar và tên lấy trực tiếp từ hồ sơ tác giả \(quan hệ user\), không dùng bản chụp tên cũ\. Không có ảnh thì hiện avatar chữ cái đầu\.

Bài cũ chỉ có tên chữ \(hiện không avatar, không link, không nút theo dõi, ví dụ các bài "Mai Quốc Thắng", "Quốc Thắng"\): viết hàm đồng bộ một lần để gắn đúng tác giả theo id người dùng\. Bài nào không tìm được tác giả thì hiện avatar chữ cái đầu, tên không có link, ẩn nút theo dõi\.

Dòng "Bảng tin trực tiếp · Đang đồng bộ…" chỉ hiện trong lúc đang tải; nếu lỗi hoặc quá 8 giây thì hiện "Không tải được\. Làm mới"\.

1\.6 THÔNG SỐ KỸ THUẬT TÙY CHỌN; ĐỘ PHÙ HỢP CÓ ĐIỀU KIỆN

ProductSpecFields: mọi thông số kỹ thuật đều TÙY CHỌN, không bắt buộc để đăng bán, kể cả với vợt và giày\.

Chỉ tính độ phù hợp cho sản phẩm có đủ điều kiện: vợt cầu lông, giày bóng đá \(cần thêm mặt sân\), và bóng nếu đủ thông số\. Quần áo, phụ kiện, quả cầu, túi, hoặc sản phẩm thiếu thông số thì KHÔNG hiện badge "xx% phù hợp", KHÔNG hiện "Làm bài test để xem độ phù hợp", KHÔNG hiện panel độ phù hợp và radar vợt, KHÔNG hiện "Không phù hợp"\. Khi sắp xếp "Phù hợp nhất", các sản phẩm này đứng xen theo thứ tự mặc định, không bị đẩy xuống cuối\.

Vợt có một phần thông số: radar chỉ vẽ trục tính được và ghi "Tính từ x/7 thông số"; dưới 3/7 thì ẩn radar\.

1\.7 NHẤT QUÁN RADAR SPORTDNA Hiện có hai bộ trục khác nhau \(trang test dùng bộ mới, bài chia sẻ trong cộng đồng dùng bộ cũ\)\. Tạo MỘT file cấu hình trục dùng chung cho trang test, kết quả, hồ sơ, bài cộng đồng, ảnh chia sẻ:

Cầu lông: Đập cầu · Chặt · Lưới · Phòng thủ · Di chuyển · Sức bền · Ổn định · Chiến thuật\.

Bóng đá: Kiểm bóng · Chuyền · Sút · Rê dắt · Vị trí · Tốc độ · Phòng ngự · Sức bền\. Bài cộng đồng đã đăng vẫn hiển thị đúng dữ liệu của lần đo đó \(ánh xạ trục cũ sang trục mới, trục không có dữ liệu ghi "Chưa đủ dữ liệu"\)\. "Mạnh nhất" và "Cần cải thiện" không được cùng một trục: nếu mọi trục bằng nhau thì hiện "Các kỹ năng đang đồng đều"\.

1\.8 MUA SẮM: LỖI NHỎ

ProductPurchase\.buyNow: khi sản phẩm \(cùng màu, size, đan cước\) đã có trong giỏ mà người dùng chọn số lượng khác, phải cập nhật giỏ về số lượng vừa chọn trước khi sang thanh toán, không bỏ qua số lượng\.

CartView: bỏ dòng "Tạm tính" bị lặp; thêm ô chọn từng sản phẩm và "Chọn tất cả", chỉ các sản phẩm đã chọn được tính tiền và sang thanh toán\.

Trang /custom\-ao, thẻ shop chưa cấu hình giá/số lượng/ngày: hiện "Chưa cập nhật" thay vì "1\+ áo" và "—"\.

======== ĐỢT 2: TÀI KHOẢN, VẬN CHUYỂN, THANH TOÁN ========

2\.1 QUÊN MẬT KHẨU

Trang /dang\-nhap: thêm link "Quên mật khẩu?" dưới ô mật khẩu → /quen\-mat\-khau\.

/quen\-mat\-khau: một ô email \+ nút "Gửi liên kết đặt lại"\. Luôn trả cùng một thông báo \("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn"\) để không lộ email nào đã đăng ký\. Giới hạn 3 lần/giờ/email\.

Email tiếng Việt \(có logo BOAI, nút "Đặt lại mật khẩu", ghi hiệu lực 60 phút\), gửi qua email adapter của Payload bằng SMTP Gmail\. Đọc cấu hình từ biến môi trường SMTP\_HOST, SMTP\_PORT, SMTP\_USER, SMTP\_PASS \(mật khẩu ứng dụng Gmail\), EMAIL\_FROM\. Không ghi cứng thông tin\. Nếu thiếu biến, ghi link vào console ở môi trường dev và báo rõ trong kết quả cuối\.

/dat\-lai\-mat\-khau?token=…: nhập mật khẩu mới \+ nhập lại \(tối thiểu 8 ký tự, có chữ và số\), token dùng một lần, hết hạn thì báo "Liên kết đã hết hạn" kèm nút gửi lại\. Thành công thì chuyển về /dang\-nhap kèm thông báo\.

/cai\-dat: thêm mục "Đổi mật khẩu" \(mật khẩu hiện tại, mới, nhập lại\)\.

2\.2 PHÍ SHIP TỰ ĐỘNG \(BỎ XÁC NHẬN CỦA ADMIN VÀ SELLER\)

Bỏ bước "shop xác nhận còn hàng để chốt phí ship" và "admin chốt phí ship", và trạng thái "chờ báo phí"\. Luồng đơn mới: Chờ thanh toán → Shop xác nhận → Đang giao → Hoàn tất\. Nút Hủy đơn dùng được ở "Chờ thanh toán" và "Chờ shop xác nhận"\. Cập nhật mọi nơi dùng trạng thái cũ \(đơn của khách, kênh người bán, admin, thông báo, tra cứu đơn\)\.

Phí ship tính NGAY ở /thanh\-toan khi khách chọn địa chỉ: khoảng cách từ kho của shop đến địa chỉ nhận, áp biểu giá hiện có \(DISTANCE\_TARIFF: từ 8\.000₫ cho 3 km đầu, giữ nguyên các hằng số hiện tại cho phần km tiếp theo\)\. Giỏ nhiều shop: tính phí riêng cho từng shop và hiện từng dòng\. Ở /gio\-hang chỉ hiện "Phí ship tính ở bước thanh toán"\.

Kho shop: form shop có địa chỉ kho kèm tọa độ \(gợi ý địa chỉ khi gõ\)\. Địa chỉ nhận của khách trong sổ địa chỉ cũng lưu tọa độ\. Khoảng cách = đường chim bay × 1,3\. Nếu địa chỉ chưa có tọa độ hoặc dịch vụ gợi ý lỗi thì dùng phí mặc định theo tỉnh/thành và hiện chú thích "Phí ước tính"\.

Admin /quan\-tri/van\-chuyen: đổi từ trang chốt phí từng đơn thành trang CẤU HÌNH BIỂU GIÁ: phí km đầu, số km đầu, phí mỗi km thêm, và ô "Điều chỉnh phí ship \(%\)" lưu được giá trị từ −100 đến \+100 \(số nguyên; −100 = miễn phí ship, \+100 = gấp đôi\), kiểm tra miền giá trị ở cả giao diện lẫn máy chủ\. Phí cuối = phí tính được × \(1 \+ điều chỉnh/100\), làm tròn đến 1\.000₫\. Có bảng xem trước ví dụ \(3 km, 5 km, 10 km, 20 km\) cập nhật ngay khi đổi\.

2\.3 THANH TOÁN BẰNG MÃ QR TỰ ĐỘNG

Thay phần hướng dẫn chuyển khoản chữ \(TransferInstructions\) bằng mã QR VietQR động: ảnh từ img\.vietqr\.io theo mẫu https://img\.vietqr\.io/image/\{BANK\_BIN\}\-\{SỐ\_TÀI\_KHOẢN\}\-compact2\.png?amount=\{TỔNG\}&addInfo=\{MÃ\_ĐƠN\}&accountName=\{TÊN\}\. Dùng tài khoản nhận tiền của BOAI \(cấu hình ở admin\) nên không phụ thuộc từng shop\. Hiện kèm số tiền, nội dung chuyển khoản \(mã đơn\) có nút sao chép, và nút "Tôi đã chuyển khoản"\.

Tự động xác nhận thanh toán cần webhook từ cổng thanh toán, nên làm sẵn endpoint POST /api/payments/webhook \(xác thực bằng khóa bí mật trong biến môi trường, tương thích SePay/Casso/PayOS\): nhận số tiền và nội dung, khớp mã đơn, đủ tiền thì chuyển đơn sang "Shop xác nhận"\. Khi chưa cấu hình webhook, giữ nút "Tôi đã chuyển khoản" để admin xác nhận tay trong /quan\-tri, kèm dòng chú thích rõ\.

2\.4 MÃ GIẢM GIÁ DO ADMIN TẠO

Trang mới /quan\-tri/ma\-giam\-gia \(thêm vào menu admin\): form đúng 2 trường: "Tên mã" và "% giảm"\. Danh sách mã có công tắc Bật/Tắt và nút Xóa\.

Kiểm tra: tên mã tự viết hoa, chỉ A–Z và 0–9, 3–20 ký tự, không trùng; % giảm là số nguyên từ 1 đến 100\.

Thanh toán: ô "Mã giảm giá" \+ nút "Áp dụng"\. Mỗi đơn dùng được 1 mã\. Giảm theo % trên tiền hàng \(không tính phí ship\), hiện dòng "Mã ABC \(−10%\) −xx₫" và tổng tiền mới\. Lỗi cụ thể: "Mã không tồn tại", "Mã đã tắt"\. Lưu mã và số tiền giảm vào đơn\. Giỏ nhiều shop thì phân bổ giảm theo tỷ lệ tiền hàng từng shop\.

2\.5 THANH TOÁN MỘT LẦN, TỰ CHIA CHO NHIỀU SHOP

Giỏ có sản phẩm của nhiều shop: khách thanh toán MỘT lần \(một QR cho tổng tiền\)\. Hệ thống tạo 1 "Đơn tổng" và các đơn con theo từng shop \(mỗi đơn con có tiền hàng, phí ship, phần giảm giá riêng\)\. Khi đơn tổng được xác nhận đã thanh toán, mọi đơn con cùng sang "Shop xác nhận"\. Khách thấy 1 đơn tổng kèm danh sách đơn con\.

Chia tiền: thêm trang /quan\-tri/doi\-soat dạng sổ cái, mỗi dòng gồm shop, đơn con, tiền hàng, phí ship, phần giảm giá do BOAI chịu, SỐ TIỀN BOAI CẦN CHUYỂN CHO SHOP, và trạng thái Chưa chi / Đã chi \(admin bấm xác nhận kèm ngày\)\. Kênh người bán có mục "Tiền chờ nhận" xem được các khoản này\.

Giới hạn: tự động chuyển tiền thật cho nhiều tài khoản cần cổng thanh toán hỗ trợ chia tiền \(payout/escrow\)\. Bản này làm sổ cái đối soát, chưa chuyển tiền tự động\. Ghi rõ dòng này trong giao diện admin\.

2\.6 DỌN DỮ LIỆU KHI ĐĂNG XUẤT \(LỖI RÒ RỈ\) Khi đăng nhập, SportDNAProvider gộp dữ liệu SportDNA lưu trên trình duyệt rồi tải lên tài khoản đang đăng nhập\. Nếu đăng xuất không xóa dữ liệu này, tài khoản khác dùng chung máy sẽ nhận kết quả của người trước\. Sửa:

Khi đăng xuất: xóa dữ liệu SportDNA \(hồ sơ, lần làm, nhu cầu thiết bị\), bản nháp áo, giỏ hàng, danh sách yêu thích/so sánh lưu trên trình duyệt\.

Chỉ tải lên tài khoản những lần làm bài có cờ "tạo khi chưa đăng nhập" trong phiên hiện tại\.

======== ĐỢT 3: QUẢNG BÁ, SỰ KIỆN, CHIA SẺ SPORTDNA ========

3\.1 ĐỀ XUẤT SẢN PHẨM CÓ PHÍ \(THAY PHẦN GIẢM GIÁ/ĐỀ XUẤT CŨ CỦA SELLER\) Rút gọn /kenh\-ban\-hang/quang\-ba \(PromotionForm\) thành "Đề xuất sản phẩm lên trang chủ"\.

Hai vị trí trên trang chủ: "Trang bị sân cỏ" \(chỉ sản phẩm bóng đá\) và "Tốc độ trên không" \(chỉ sản phẩm cầu lông\)\.

Form seller gồm: chọn sản phẩm \(chỉ hiện sản phẩm đúng môn của vị trí\), vị trí, ngày bắt đầu, SỐ NGÀY \(1–30\), GIÁ MỖI NGÀY \(₫\)\. Hiện ngay "Tổng phí = giá mỗi ngày × số ngày"\. Gửi xong trạng thái "Chờ duyệt"\. Seller xem danh sách yêu cầu của mình \(Chờ duyệt / Đang chạy / Hết hạn / Bị từ chối kèm lý do\) và hủy được yêu cầu đang chờ\.

Admin: trang mới /quan\-tri/de\-xuat với 3 tab \(Chờ duyệt, Đang chạy, Lịch sử\)\. Mỗi dòng gồm shop, sản phẩm, vị trí, thời gian, giá/ngày, SỐ NGÀY, TỔNG PHÍ \(đây là khoản hoa hồng BOAI thu\), cùng nút "Đã thu phí & Duyệt" hoặc "Từ chối" \(bắt buộc ghi lý do\)\. Đầu trang có tổng phí đã thu và phí chờ thu\.

Giới hạn: mỗi vị trí tối đa 3 sản phẩm chạy cùng lúc \(hằng số cấu hình được trong admin\)\. Khi duyệt, kiểm tra số sản phẩm đã duyệt trùng khoảng thời gian; nếu đủ 3 thì chặn và báo "Vị trí đã đủ 3 sản phẩm trong khoảng thời gian này", đồng thời hiện ngày gần nhất còn chỗ\.

Hiển thị: CHỈ sản phẩm đã được duyệt và đang trong khoảng ngày mới hiện, gắn nhãn "Đề xuất"\. Thứ tự: giá/ngày cao hơn đứng trước, bằng nhau thì duyệt sớm hơn đứng trước\. Yêu cầu gửi sau không được tự động chiếm chỗ\. Hết hạn tự biến mất khi so sánh ngày ở lúc render, không cần tác vụ nền\. Các ô còn trống của mục được lấp bằng sản phẩm thường như hiện nay\. Bỏ nhãn "Được đề xuất" gắn tự động ở nơi khác\.

3\.2 SỰ KIỆN SALE DIỄN RA ĐỒNG THỜI Hiện đăng hơn 2 sự kiện sẽ xung đột\. Làm theo hướng cho nhiều sự kiện chạy cùng lúc:

Bỏ mọi giả định "chỉ có một sự kiện đang hoạt động" trong tính giá \(event\-pricing\), trang chủ, /giam\-gia, kênh người bán\.

Quy tắc chống xung đột: một sản phẩm tại một thời điểm chỉ thuộc MỘT sự kiện\. Khi shop đăng ký hoặc admin duyệt sản phẩm vào sự kiện B mà sản phẩm đã được duyệt ở sự kiện A trùng thời gian, chặn và báo "Sản phẩm đã tham gia sự kiện A \(đến dd/mm hh:mm\)"\.

Giao diện: trang chủ hiển thị banner sự kiện dạng carousel \(tối đa 5 sự kiện đang chạy, có chấm điều hướng\)\. /giam\-gia có hàng chip lọc theo sự kiện\. Mỗi thẻ sản phẩm ghi tên sự kiện và giờ kết thúc của chính nó\. Trang admin sự kiện hiển thị lịch dạng danh sách theo thời gian, đánh dấu các sự kiện chồng nhau\.

Kiểm tra form: giờ kết thúc phải sau giờ bắt đầu; % giảm không vượt trần của sự kiện\.

3\.3 CHIA SẺ KẾT QUẢ SPORTDNA

Sau khi làm xong bài \(trang /sportdna/ket\-qua/\[mon\] và màn hình ngay sau bài test\) thêm khối "Chia sẻ kết quả" gồm: "Đăng lên trang cá nhân trong Cộng đồng" \(mở trình soạn bài điền sẵn thẻ kết quả: môn, ELO, bậc trình độ, radar 8 trục, kèm ô lời nhắn tùy chọn, đăng công khai\), Facebook, Zalo, Sao chép liên kết, và "Ứng dụng khác" \(Web Share API trên điện thoại\)\. Bỏ nút Instagram \(web không chia sẻ trực tiếp được\)\. Dùng chung SharePanel hiện có\.

Trang công khai /sportdna/chia\-se/\[id\] xem được khi chưa đăng nhập: radar, ELO, bậc trình độ, nút "Làm bài test của bạn"\. Dữ liệu là bản chụp tại thời điểm chia sẻ\. Chỉ hiện tên và avatar nếu người dùng đã đăng ký tên công khai; nút "Thu hồi liên kết" trong hồ sơ\.

Xem trước khi dán link \(Open Graph\) riêng cho từng trang: og:title kiểu "Tên · SportDNA Cầu lông · ELO 1135 \(Trung bình\)", og:description, og:image 1200×630 là ảnh radar tạo động \(ImageResponse\)\. Làm tương tự cho /cong\-dong?post= \(lấy nội dung và ảnh bài viết\) và trang sản phẩm \(ảnh, tên, giá\)\. Hiện mọi trang đều dùng chung og:title "BOAI — Vượt giới hạn…" và chưa có og:image\.

3\.4 CHIA SẺ BẢN THIẾT KẾ ÁO LÊN CỘNG ĐỒNG \(ƯU TIÊN CHÍNH\)

A\. NÚT CHIA SẺ

Ở studio /custom\-ao \(JerseyStudio\) và ở mỗi mẫu trong "Yêu cầu của tôi" \(MyRequests\), thêm nút chính "Chia sẻ lên Cộng đồng"\. Mẫu chỉ có bản nháp trên máy thì yêu cầu đăng nhập và lưu mẫu trước, bản nháp giữ nguyên\.

Bấm nút mở trình soạn bài Cộng đồng ngay tại chỗ \(không rời trang studio\), điền sẵn: ảnh xem trước mặt trước và mặt sau \(cả quần nếu có "May kèm quần"\), tên mẫu\. Người dùng nhập thêm lời nhắn \(tùy chọn, tối đa 3000 ký tự, nếu nhập thì tối thiểu 5 ký tự như bài thường\), chọn bộ môn \(Bóng đá / Cầu lông\) và bấm "Đăng"\. Bài luôn công khai, hiện dòng chú thích này ngay trên nút Đăng\.

Đăng xong hiện thông báo kèm link "Xem bài trong Cộng đồng"\. Một mẫu có thể đăng nhiều lần \(mỗi lần là một bản chụp mới\)\. Chặn bấm Đăng hai lần liên tiếp\.

Các kênh phụ nằm trong cùng bảng, đặt dưới nút chính: Facebook, Zalo, Sao chép liên kết, Ứng dụng khác \(Web Share API\)\. Dùng lại SharePanel hiện có\.

B\. HIỂN THỊ TRONG CỘNG ĐỒNG

Thêm loại bài "Thiết kế áo": thẻ có ảnh trước/sau \(bấm lật hoặc vuốt\), tên mẫu, nút "Xem thiết kế"\. Dùng chung PostHeader ở mục 1\.5 \(avatar, tên có link, nút Theo dõi\)\.

Thêm chuyên mục "Thiết kế áo" vào hàng lọc chủ đề của Cộng đồng \(cạnh "Shop chào sản phẩm", "Chia sẻ trải nghiệm"…\), lọc theo được cùng bộ lọc môn\.

Bài thiết kế dùng đủ tương tác như bài thường: thích, bình luận, chia sẻ, đăng lại \(SharePanel\)\. Người đăng lại thấy lại đúng thẻ thiết kế\.

Người theo dõi tác giả nhận thông báo "X vừa chia sẻ một thiết kế áo" qua trung tâm thông báo hiện có\.

Admin kiểm duyệt xóa bài thiết kế ở /quan\-tri/cong\-dong như mọi bài khác\. Bài bị xóa thì trang xem thiết kế công khai báo "Bài viết không còn tồn tại"\.

C\. TRANG XEM THIẾT KẾ \(MỞ TỪ BÀI VIẾT\)

Route công khai /custom\-ao/chia\-se/\[id\], xem được khi chưa đăng nhập, chỉ xem: tên mẫu, mặt trước/sau \(nút lật\), quần nếu có, tên người đăng \(theo hồ sơ cộng đồng của họ\)\.

Nút "Thiết kế mẫu của bạn" \(tới /custom\-ao\) và "Dùng làm mẫu": đăng nhập rồi sao chép thành bản nháp MỚI trong tài khoản người xem, không sửa mẫu gốc\.

Dữ liệu là BẢN CHỤP tại lúc đăng, sửa mẫu sau đó không đổi bài đã đăng\. Người đăng xóa bài thì liên kết chia sẻ cũng ngừng hoạt động\.

D\. QUYỀN RIÊNG TƯ \(BẮT BUỘC\) Bài cộng đồng, trang xem thiết kế, ảnh xem trước TUYỆT ĐỐI không chứa số lượng, tên người liên hệ, số điện thoại, ghi chú, báo giá, tên shop đã nhận mẫu\. Chỉ có hình thiết kế và tên mẫu\. Dựng bản chụp từ dữ liệu hình \(svg\-export\), không sao chép nguyên bản ghi yêu cầu gửi shop\.

E\. XEM TRƯỚC KHI DÁN LINK og:title "Tên mẫu · Thiết kế áo trên BOAI", og:description ngắn, og:image 1200×630 ghép mặt trước và mặt sau, áp dụng cho cả /custom\-ao/chia\-se/\[id\] và /cong\-dong?post=\[id\] của bài thiết kế\.

NGHIỆM THU \(tự chạy trước khi báo xong\)

Không còn đường dẫn, menu, chữ nào về giải đấu, thành tích, Match Rating; /giai\-dau chuyển hướng về /\.

Không sản phẩm nào có giá gạch thấp hơn giá bán; banner sale khớp % thật\.

Trang shop không còn điểm tin cậy, hiện đánh giá trung bình từ dữ liệu thật; admin lọc được 1–5 sao\.

Mọi bài cộng đồng có avatar, tên link, nút theo dõi\.

Đặt hàng 2 shop một lần: 1 QR, 2 đơn con, phí ship tự tính, áp được mã giảm, sổ cái đối soát đúng số tiền\.

Quên mật khẩu gửi và dùng được link đặt lại \(hoặc báo rõ thiếu cấu hình SMTP\)\.

Đề xuất sản phẩm: yêu cầu thứ 4 cùng vị trí và thời gian bị chặn; yêu cầu chưa duyệt không lên trang chủ\.

Đăng ký 1 sản phẩm vào 2 sự kiện trùng giờ bị chặn; 3 sự kiện chạy đồng thời không lỗi\.

Làm bài SportDNA → chia sẻ Facebook: link có bản xem trước đúng\.

Đăng xuất rồi đăng nhập tài khoản khác: không thấy dữ liệu SportDNA, giỏ hàng, bản nháp áo của tài khoản trước\. ======== LỆNH CHỐT \(BẮT BUỘC, ĐỌC KỸ TRƯỚC KHI BẮT ĐẦU VÀ TRƯỚC KHI BÁO XONG\) ========

PHẠM VI: Phải hoàn thành TOÀN BỘ các mục 1\.1 → 3\.3 trong CÙNG MỘT PHIÊN LÀM VIỆC\. Không dừng giữa chừng để hỏi lại, không chia "để lần sau", không nói "các mục còn lại làm tương tự"\. Gặp điểm chưa rõ thì chọn cách hợp lý nhất, ghi lại giả định trong báo cáo cuối rồi làm tiếp\.

BƯỚC 0: LẬP DANH SÁCH VIỆC Trước khi sửa bất kỳ file nào, tạo danh sách kiểm tra có đủ 23 dòng, mỗi dòng một mục: 1\.1, 1\.2, 1\.3, 1\.4, 1\.5, 1\.6, 1\.7, 1\.8, 2\.1, 2\.2, 2\.3, 2\.4, 2\.5, 2\.6, 3\.1, 3\.2, 3\.3 và 6 mục phụ sau đây, tách riêng để không bị gộp mất: \(a\) bộ lọc sao 1–5 ở admin đánh giá; \(b\) chặn lưu giá bán < 10\.000₫ và giá cũ ≤ giá bán; \(c\) dropdown danh mục chuẩn ở form seller; \(d\) đặt lại điểm sao mẫu về giá trị tính từ đánh giá thật; \(e\) endpoint webhook thanh toán; \(f\) mục "Đổi mật khẩu" trong /cai\-dat\. Mỗi dòng có trạng thái: Chưa làm / Đang làm / Đã làm và đã kiểm tra / Không làm được \(kèm lý do\)\. Cập nhật danh sách sau MỖI mục, không dồn đến cuối\.

BƯỚC 1: LÀM VÀ TỰ KIỂM TRA TỪNG MỤC Với mỗi mục, trước khi đánh dấu "Đã làm", phải xác nhận được cả ba điều:

Đã sửa ĐỦ mọi chỗ liên quan \(giao diện, route, logic máy chủ, kiểm tra dữ liệu, bản EN, dark mode, điện thoại\), không chỉ một nơi\.

Đã mở chức năng đó trên giao diện và chạy thử cả trường hợp bình thường lẫn trường hợp lỗi \(dữ liệu sai, rỗng, ngoài giới hạn\)\.

Không làm hỏng chức năng cũ liền kề \(đăng nhập, giỏ hàng, đặt hàng, SportDNA, cộng đồng\)\. Không để lại TODO, mã giả, dữ liệu giả lộ ra giao diện, nút bấm không có tác dụng, hay đoạn "sẽ làm sau"\.

BƯỚC 2: QUÉT SÓT BẰNG TÌM KIẾM TOÀN DỰ ÁN Sau khi làm xong tất cả, tìm kiếm trong toàn bộ mã nguồn và dữ liệu các cụm từ sau, rồi xử lý hoặc giải thích từng kết quả còn lại: "giai\-dau", "giải đấu", "Match Rating", "thành tích", "AchievementCard", "chờ báo phí", "độ tin cậy", "trust", "Cách tính điểm", "Được đề xuất", "4\.9", "chi ân", "Instagram", "Danh mục" nhập tự do, "oldPrice" \(mọi nơi hiển thị giá gạch\)\. Với mỗi đường dẫn đã gỡ, kiểm tra thật rằng nó chuyển hướng 308 về trang chủ\. Với mỗi trạng thái đơn đã bỏ, kiểm tra không còn nơi nào đọc hoặc hiển thị trạng thái đó\.

BƯỚC 3: CHẠY KIỂM TRA KỸ THUẬT Chạy lần lượt: typecheck, lint, build\. Sửa hết lỗi \(kể cả lỗi có sẵn từ trước nếu chặn build\)\. Mở lần lượt các trang: /, /tim\-kiem, /giam\-gia, /san\-pham/\[bất kỳ\], /gio\-hang, /thanh\-toan, /don\-hang, /dang\-nhap, /quen\-mat\-khau, /cai\-dat, /tai\-khoan, /cong\-dong, /cua\-hang/\[bất kỳ\], /sportdna, /sportdna/ket\-qua/cau\-long, /custom\-ao, /quan\-tri \(mọi mục menu\), /kenh\-ban\-hang \(mọi mục menu\)\. Không trang nào được báo lỗi hay hiện trang trắng\.

BƯỚC 4: CHẠY LẠI 10 MỤC NGHIỆM THU Chạy từng mục trong phần NGHIỆM THU ở trên và ghi lại bằng chứng \(đường dẫn tới file đã sửa, hoặc mô tả kết quả quan sát được\)\. Mục nào không đạt thì quay lại sửa, không báo "đạt" nếu chưa tự kiểm chứng\.

BƯỚC 5: ĐỌC LẠI ĐỀ BÀI LẦN CUỐI Đọc lại toàn bộ prompt này từ đầu đến cuối, từng câu có động từ "thêm", "bỏ", "gỡ", "đổi", "chặn", "hiện", "ẩn", "kiểm tra", và đối chiếu với danh sách ở Bước 0\. Nếu còn bất kỳ yêu cầu nào chưa có dấu "Đã làm và đã kiểm tra", làm nốt TRƯỚC KHI viết báo cáo\.

BÁO CÁO CUỐI \(chỉ viết sau khi hoàn tất 5 bước trên\) Trả về một bảng đủ 23 dòng theo đúng danh sách Bước 0, mỗi dòng gồm: mã mục | trạng thái | các file đã sửa hoặc tạo | cách đã kiểm tra | giả định đã dùng \(nếu có\)\. Sau bảng ghi riêng: \(1\) mọi thứ không làm được hoặc chỉ làm một phần và lý do \(ví dụ thiếu biến môi trường SMTP, chưa có cổng thanh toán, thiếu tọa độ địa chỉ\); \(2\) các biến môi trường và cấu hình tôi phải tự thiết lập; \(3\) các thay đổi nằm ngoài danh sách yêu cầu mà bạn đã buộc phải làm, và lý do\. Tuyệt đối không viết "đã hoàn thành tất cả" nếu bảng còn dòng chưa ở trạng thái "Đã làm và đã kiểm tra"\. QUYỀN TỰ QUYẾT \(ÁP DỤNG KHI GẶP VẤN ĐỀ TRONG LÚC LÀM\) Nếu trong lúc làm bạn thấy bất kỳ vấn đề nào \(yêu cầu mâu thuẫn nhau, mã hiện có không khớp mô tả, một cách làm sẽ gây lỗi cho chức năng khác, dữ liệu mẫu hỏng, thiếu thông tin\), KHÔNG dừng lại hỏi\. Tự quyết định theo hướng sau:

CHỌN HƯỚNG CÓ TIỀM NĂNG NHẤT: ưu tiên phương án \(a\) chạy ổn định và kiểm chứng được trong phiên này, \(b\) mang lại giá trị rõ nhất cho người dùng cuối, \(c\) ít làm vỡ chức năng đang có, \(d\) dễ mở rộng sau này\. Có nhiều phương án ngang nhau thì chọn phương án đơn giản hơn\.

NHÁNH KHÔNG THỂ LÀM TRỌN THÌ BỎ HẲN: nếu một nhánh \(một chức năng con, một trường hợp biên, một phần mở rộng\) không thể làm xong, chạy đúng và kiểm tra được trong phiên này, thì BỎ nhánh đó\. Không làm dở dang\. Bỏ sạch nghĩa là: không để lại nút bấm, menu, route, trường dữ liệu, chữ hướng dẫn hay mã chết trỏ tới nhánh đã bỏ, và build vẫn qua\.

GIỚI HẠN CỦA VIỆC BỎ:

Chỉ bỏ phần nhỏ nhất không làm được, giữ lại phần còn lại đã chạy được\. Ví dụ không có cổng thanh toán thì vẫn giữ mã QR và nút "Tôi đã chuyển khoản", chỉ bỏ phần tự xác nhận\. Không bỏ cả mục khi còn một bản rút gọn chạy được\.

Không bỏ bất kỳ thứ gì làm hỏng luồng chính: đăng nhập, giỏ hàng, đặt hàng, SportDNA, cộng đồng, build\.

Không xóa dữ liệu trong database khi bỏ nhánh\. Chỉ gỡ khỏi giao diện và mã\.

Không dùng quyền này để né việc khó nhưng làm được\. Chỉ bỏ khi đã thử và chứng minh được là không làm trọn nổi\.

GHI LẠI MỌI QUYẾT ĐỊNH: mỗi lần tự quyết hoặc bỏ nhánh, ghi ngay vào danh sách Bước 0: vấn đề gặp, các phương án đã cân nhắc, phương án đã chọn, lý do\. Nhánh bị bỏ ghi trạng thái "Đã bỏ nhánh" kèm lý
