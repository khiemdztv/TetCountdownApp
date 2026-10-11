'use strict';
/*
 * Kho loi chuc va tho Tet, dung cho tinh nang "moi ngay mot loi chuc".
 *
 * Cau truc:
 *   WISHES   : loi chuc ngan (1 cau), dung cho moi ngay
 *   POEMS    : tho 4 dong (luc bat hoac ca dao), co gan nhan
 *   OCCASIONS: noi dung rieng cho tung dip (Ong Tao, giao thua, mung 1...)
 *
 * `tags` cua POEMS duoc dung de loc tho theo dip: main.js se uu tien lay tho
 * co nhan trung voi dip cua ngay hom do, neu khong co thi lay tu kho chung.
 */

/* ------------------------------------------------------------------ */
/* Loi chuc ngắn                                                       */
/* ------------------------------------------------------------------ */

const WISHES = [
  // --- Gia dinh, sum hop ---
  { text: 'Năm mới chúc cả nhà luôn đầy ắp tiếng cười, cơm canh nóng hổi, chuyện trò thâu đêm.', tags: ['tet', 'gia-dinh', 'sum-hop'] },
  { text: 'Xuân này mong nhà mình đoàn tụ đủ đầy, người đi xa cũng kịp về ăn bữa cơm tất niên.', tags: ['tet', 'gia-dinh', 'xa-que'] },
  { text: 'Chúc gia đình bạn một năm mới thuận hoà, trên kính dưới nhường, trong ấm ngoài êm.', tags: ['tet', 'gia-dinh', 'binh-an'] },
  { text: 'Mong bàn thờ tổ tiên luôn ấm khói hương, con cháu sum vầy, anh em một lòng.', tags: ['tet', 'gia-dinh', 'sum-hop'] },
  { text: 'Chúc mẹ cha sức khoẻ dồi dào, con cháu quây quần bên mâm cỗ ngày xuân.', tags: ['tet', 'gia-dinh', 'suc-khoe'] },
  { text: 'Năm mới chúc bạn có một mái nhà luôn sáng đèn chờ, dù đi đâu cũng thấy đường về.', tags: ['tet', 'gia-dinh', 'binh-an'] },
  { text: 'Chúc anh chị em trong nhà thương nhau như thuở còn thơ, giận nhau rồi lại cười xoà.', tags: ['tet', 'gia-dinh', 'binh-an'] },
  { text: 'Mong năm nay nhà mình thêm người thêm phúc, thêm tiếng trẻ con chạy khắp sân.', tags: ['tet', 'gia-dinh', 'tre'] },
  { text: 'Chúc bạn một cái Tết đủ đầy: có bánh chưng, có câu đối, có người thân ngồi bên.', tags: ['tet', 'sum-hop', 'khai-xuan'] },
  { text: 'Mong những điều chưa kịp nói năm cũ, xuân này sẽ được nói hết với người thương.', tags: ['tet', 'tinh-yeu', 'binh-an'] },

  // --- Suc khoe ---
  { text: 'Chúc bạn sức khoẻ như cây cổ thụ, mưa nắng dãi dầu vẫn đứng vững giữa trời.', tags: ['tet', 'suc-khoe', 'binh-an'] },
  { text: 'Năm mới chúc ông bà ăn được ngủ được, chân bước nhẹ nhàng, mắt còn tinh tường.', tags: ['tet', 'suc-khoe', 'nguoi-gia'] },
  { text: 'Mong bạn ngủ đủ giấc, ăn đủ bữa, bệnh cũ tiêu tan, bệnh mới không tìm tới.', tags: ['tet', 'suc-khoe', 'binh-an'] },
  { text: 'Chúc bạn một năm thân thể an khang, lòng dạ thảnh thơi, chẳng phải thuốc thang gì.', tags: ['tet', 'suc-khoe', 'binh-an'] },
  { text: 'Xuân này chúc bạn bỏ được thói thức khuya, da dẻ hồng hào, tinh thần minh mẫn.', tags: ['xuan', 'suc-khoe', 'khai-xuan'] },
  { text: 'Chúc mẹ một năm không đau lưng nhức mỏi, chợ xa mấy cũng đi một mạch.', tags: ['tet', 'suc-khoe', 'nguoi-gia'] },
  { text: 'Mong bạn đủ sức khoẻ để làm hết những điều còn dang dở, và đủ thời gian để nghỉ ngơi.', tags: ['tet', 'suc-khoe', 'cong-viec'] },
  { text: 'Chúc bạn ăn Tết ngon miệng mà không tăng cân, chơi xuân vui vẻ mà không mệt.', tags: ['tet', 'suc-khoe', 'xuan'] },
  { text: 'Năm mới chúc bạn tinh thần sảng khoái, giấc ngủ sâu, sáng dậy thấy lòng nhẹ tênh.', tags: ['tet', 'suc-khoe', 'binh-an'] },
  { text: 'Mong người thân của bạn đều khoẻ mạnh, chẳng ai phải vào viện, chẳng ai phải uống thuốc.', tags: ['tet', 'suc-khoe', 'gia-dinh'] },

  // --- Cong viec, lam an ---
  { text: 'Chúc bạn năm mới việc gì cũng hanh thông, khách tới tấp, tiền vào như nước.', tags: ['tet', 'cong-viec', 'tai-loc'] },
  { text: 'Mong bạn thăng chức đúng lúc, lương tăng đúng kỳ, sếp quý đồng nghiệp thương.', tags: ['tet', 'cong-viec', 'than-tai'] },
  { text: 'Chúc bạn buôn may bán đắt, mở hàng ngày mùng một đông khách, cả năm không ế.', tags: ['tet', 'cong-viec', 'tai-loc'] },
  { text: 'Năm mới chúc bạn gặt hái được thành quả của những tháng ngày đã cố gắng.', tags: ['tet', 'cong-viec', 'khai-xuan'] },
  { text: 'Mong bạn có một năm làm việc hiệu quả, hết giờ là về, không phải mang việc về nhà.', tags: ['tet', 'cong-viec', 'binh-an'] },
  { text: 'Chúc bạn ký được hợp đồng lớn, dự án thuận lợi, đối tác giữ chữ tín.', tags: ['tet', 'cong-viec', 'tai-loc'] },
  { text: 'Mong năm nay bạn đổi được công việc mơ ước, lương cao hơn, gần nhà hơn.', tags: ['tet', 'cong-viec', 'than-tai'] },
  { text: 'Chúc bạn một năm tài lộc vượng, ví dày, nợ cũ trả hết, nợ mới không vay.', tags: ['tet', 'tai-loc', 'than-tai'] },
  { text: 'Mong bạn kinh doanh phát đạt, hàng hoá đắt như tôm tươi, khách quen ngày một đông.', tags: ['tet', 'cong-viec', 'tai-loc'] },
  { text: 'Chúc bạn năm mới công thành danh toại, cống hiến được ghi nhận, nỗ lực được đền đáp.', tags: ['tet', 'cong-viec', 'khai-xuan'] },

  // --- Hoc hanh ---
  { text: 'Chúc bạn thi đâu đỗ đó, bài khó mấy cũng giải ra, điểm cao chót vót.', tags: ['tet', 'hoc-hanh', 'khai-xuan'] },
  { text: 'Mong năm nay bạn học một hiểu mười, thi cử nhẹ nhàng như đi chơi.', tags: ['tet', 'hoc-hanh', 'may-man'] },
  { text: 'Chúc các bạn trẻ một năm học tập tiến bộ, đỗ vào ngôi trường mơ ước.', tags: ['tet', 'hoc-hanh', 'tre'] },
  { text: 'Mong bạn tốt nghiệp đúng hạn, luận văn suôn sẻ, ra trường có việc ngay.', tags: ['tet', 'hoc-hanh', 'cong-viec'] },
  { text: 'Chúc bạn năm mới tiếp thu nhanh, nhớ lâu, không còn học trước quên sau.', tags: ['tet', 'hoc-hanh', 'khai-xuan'] },
  { text: 'Mong bạn đạt được học bổng, đi được nước ngoài, mở mang tầm mắt.', tags: ['tet', 'hoc-hanh', 'may-man'] },
  { text: 'Chúc bạn chọn đúng ngành, gặp đúng thầy, học đúng điều mình thích.', tags: ['tet', 'hoc-hanh', 'khai-xuan'] },
  { text: 'Mong bạn thi chứng chỉ một lần là đỗ, không phải quay lại thi lần hai.', tags: ['tet', 'hoc-hanh', 'may-man'] },

  // --- Tinh yeu ---
  { text: 'Chúc bạn năm mới gặp đúng người, yêu đúng lúc, cưới đúng duyên.', tags: ['tet', 'tinh-yeu', 'may-man'] },
  { text: 'Mong bạn và người ấy bớt giận hờn, thêm thấu hiểu, nắm tay nhau đi hết mùa xuân này.', tags: ['xuan', 'tinh-yeu', 'binh-an'] },
  { text: 'Chúc bạn một mùa xuân có người chờ, có người thương, có người đưa về.', tags: ['xuan', 'tinh-yeu', 'sum-hop'] },
  { text: 'Mong người đang cô đơn sẽ tìm được một bàn tay để nắm khi trời trở lạnh.', tags: ['tet', 'tinh-yeu', 'binh-an'] },
  { text: 'Chúc đôi bạn trẻ năm nay về chung một nhà, đám cưới rộn ràng, trăm năm hạnh phúc.', tags: ['tet', 'tinh-yeu', 'sum-hop'] },
  { text: 'Mong tình cảm của bạn bền như cây đa bến nước, mưa nắng vẫn xanh.', tags: ['tet', 'tinh-yeu', 'binh-an'] },
  { text: 'Chúc bạn yêu nhau nhiều hơn giận, nhớ nhau nhiều hơn trách, thương nhau đủ để bỏ qua.', tags: ['tet', 'tinh-yeu', 'binh-an'] },
  { text: 'Mong năm mới bạn dám nói lời yêu với người mình đã thầm thương bao lâu.', tags: ['tet', 'tinh-yeu', 'khai-xuan'] },

  // --- Tai loc ---
  { text: 'Chúc bạn năm mới tiền vô như nước, tiền ra nhỏ giọt, cuối năm dư dả.', tags: ['tet', 'tai-loc', 'than-tai'] },
  { text: 'Mong bạn trúng số độc đắc, hoặc ít nhất là được mừng tuổi phong bao thật dày.', tags: ['tet', 'tai-loc', 'may-man'] },
  { text: 'Chúc bạn một năm kiếm được nhiều hơn, tiêu ít hơn, để dành được nhiều hơn.', tags: ['tet', 'tai-loc', 'than-tai'] },
  { text: 'Mong tài khoản của bạn năm nay chỉ có cộng, không có trừ.', tags: ['tet', 'tai-loc', 'may-man'] },
  { text: 'Chúc bạn phát tài phát lộc, vàng bạc đầy nhà, của cải dư thừa.', tags: ['tet', 'tai-loc', 'than-tai'] },
  { text: 'Mong bạn mua được nhà, tậu được xe, trả hết nợ, sống thoải mái.', tags: ['tet', 'tai-loc', 'cong-viec'] },
  { text: 'Chúc bạn làm ra tiền một cách chính đáng và tiêu tiền một cách thông minh.', tags: ['tet', 'tai-loc', 'cong-viec'] },
  { text: 'Mong năm mới bạn không còn phải đắn đo khi mua món mình thích.', tags: ['tet', 'tai-loc', 'than-tai'] },

  // --- Binh an, may man ---
  { text: 'Chúc bạn năm mới bình an như mặt hồ mùa xuân, phẳng lặng và trong veo.', tags: ['xuan', 'binh-an', 'khai-xuan'] },
  { text: 'Mong bạn đi đâu cũng gặp may, làm gì cũng thuận, gặp ai cũng quý.', tags: ['tet', 'may-man', 'binh-an'] },
  { text: 'Chúc bạn một năm vạn sự như ý, mọi điều đến đều là điều tốt.', tags: ['tet', 'may-man', 'binh-an'] },
  { text: 'Mong năm mới mang tới cho bạn cơ hội đúng lúc, đúng người, đúng thời điểm.', tags: ['tet', 'may-man', 'cong-viec'] },
  { text: 'Chúc bạn tai qua nạn khỏi, hung hoá cát, dữ hoá lành.', tags: ['tet', 'binh-an', 'may-man'] },
  { text: 'Mong bạn luôn gặp quý nhân, tránh được kẻ xấu, đường đi rộng mở.', tags: ['tet', 'may-man', 'cong-viec'] },
  { text: 'Chúc bạn năm mới gặp nhiều điều tốt lành, ít điều phiền muộn.', tags: ['tet', 'may-man', 'binh-an'] },
  { text: 'Mong bạn có một năm suôn sẻ từ tháng Giêng tới tháng Chạp.', tags: ['tet', 'may-man', 'khai-xuan'] },

  // --- Que nha, xa que ---
  { text: 'Chúc những người con xa quê năm nay kịp về ăn Tết, kịp ôm mẹ một cái thật chặt.', tags: ['tet', 'xa-que', 'gia-dinh'] },
  { text: 'Mong chuyến xe cuối năm của bạn không kẹt, về tới nhà trước giao thừa.', tags: ['tet', 'xa-que', 'may-man'] },
  { text: 'Chúc bạn một cái Tết quê: có tiếng gà, có khói bếp, có mùi rơm rạ.', tags: ['tet', 'que-nha', 'binh-an'] },
  { text: 'Mong bạn nhớ quê thì về, đừng để mẹ chờ mỏi mắt bên hiên nhà.', tags: ['tet', 'que-nha', 'xa-que'] },
  { text: 'Chúc người đi làm ăn xa một năm mới đỡ vất vả, gửi về nhà được nhiều hơn.', tags: ['tet', 'xa-que', 'cong-viec'] },
  { text: 'Mong bạn giữ được hồn quê dù đang sống giữa phố thị ồn ào.', tags: ['tet', 'que-nha', 'binh-an'] },
  { text: 'Chúc bạn có dịp về thăm lại mái trường cũ, gốc đa xưa, bờ ao cũ.', tags: ['tet', 'que-nha', 'xa-que'] },
  { text: 'Mong Tết này bạn được ngồi bên mâm cơm mẹ nấu, nghe bà kể chuyện ngày xưa.', tags: ['tet', 'gia-dinh', 'nguoi-gia'] },

  // --- Ban be ---
  { text: 'Chúc bạn thân của tôi năm mới vui vẻ, khoẻ mạnh, và giàu hơn tôi một chút thôi.', tags: ['tet', 'ban-be', 'suc-khoe'] },
  { text: 'Mong tình bạn của chúng ta bền qua năm tháng, dù xa nhau vẫn nhớ nhau.', tags: ['tet', 'ban-be', 'binh-an'] },
  { text: 'Chúc bạn năm mới có thêm nhiều bạn tốt, và giữ được những người bạn cũ.', tags: ['tet', 'ban-be', 'may-man'] },
  { text: 'Mong bạn gặp lại được đứa bạn thân đã lâu không liên lạc.', tags: ['tet', 'ban-be', 'sum-hop'] },
  { text: 'Chúc bạn đi chơi xuân về muộn mà vẫn có người để nhắn tin.', tags: ['xuan', 'ban-be', 'tinh-yeu'] },
  { text: 'Mong bạn luôn có người lắng nghe khi buồn và người chia vui khi thành công.', tags: ['tet', 'ban-be', 'binh-an'] },

  // --- Tre nho ---
  { text: 'Chúc các cháu năm mới hay ăn chóng lớn, ngoan ngoãn, học giỏi, được nhiều lì xì.', tags: ['tet', 'tre', 'hoc-hanh'] },
  { text: 'Mong các con một năm mới khoẻ mạnh, vui tươi, mỗi ngày đều có điều mới để khám phá.', tags: ['tet', 'tre', 'suc-khoe'] },
  { text: 'Chúc em bé nhà bạn năm đầu đời thật bình an, ăn ngon ngủ yên, mẹ tròn con vuông.', tags: ['tet', 'tre', 'binh-an'] },
  { text: 'Mong trẻ con trong nhà năm nay bớt ốm, bớt khóc, hay cười hơn.', tags: ['tet', 'tre', 'suc-khoe'] },

  // --- Nguoi gia ---
  { text: 'Chúc ông bà năm mới sống lâu trăm tuổi, con cháu đề huề, ngày ngày vui vẻ.', tags: ['tet', 'nguoi-gia', 'suc-khoe'] },
  { text: 'Mong bố mẹ năm nay bớt lo toan, để con cháu gánh vác thay phần nào.', tags: ['tet', 'nguoi-gia', 'gia-dinh'] },
  { text: 'Chúc bà một năm mới còn đủ khoẻ để gói bánh chưng cho cả nhà.', tags: ['tet', 'nguoi-gia', 'suc-khoe'] },
  { text: 'Mong ông giữ được thói quen pha trà sáng sớm và kể chuyện cho cháu nghe.', tags: ['tet', 'nguoi-gia', 'gia-dinh'] },

  // --- Khoi dau nam moi ---
  { text: 'Chúc bạn năm mới khởi đầu rực rỡ như pháo hoa đêm giao thừa.', tags: ['tet', 'khai-xuan', 'may-man'] },
  { text: 'Mong bạn bỏ lại sau lưng những tiếc nuối để bước vào năm mới nhẹ nhõm.', tags: ['tet', 'khai-xuan', 'binh-an'] },
  { text: 'Chúc bạn đủ dũng khí để bắt đầu lại những điều còn dang dở.', tags: ['tet', 'khai-xuan', 'cong-viec'] },
  { text: 'Mong năm mới bạn dám thử những điều mình chưa từng dám.', tags: ['tet', 'khai-xuan', 'cong-viec'] },
  { text: 'Chúc bạn năm mới mỗi ngày đều là một khởi đầu tốt lành.', tags: ['tet', 'khai-xuan', 'binh-an'] },
  { text: 'Mong bạn viết được trang mới tươi sáng hơn trang cũ.', tags: ['tet', 'khai-xuan', 'may-man'] },

  // --- Tet co truyen ---
  { text: 'Chúc bạn một cái Tết đúng nghĩa: có bánh chưng xanh, dưa hành, câu đối đỏ.', tags: ['tet', 'khai-xuan', 'gia-dinh'] },
  { text: 'Mong nhà bạn năm nay gói được mẻ bánh chưng thơm, nồi bánh chín đều, không bị sống.', tags: ['tet', 'gia-dinh', 'may-man'] },
  { text: 'Chúc bạn đón một mùa xuân ấm áp bên mâm cỗ đầy đủ.', tags: ['xuan', 'sum-hop', 'gia-dinh'] },
  { text: 'Mong bạn giữ được phong tục xông đất, hái lộc, chúc Tết ông bà.', tags: ['tet', 'gia-dinh', 'khai-xuan'] },
  { text: 'Chúc bạn năm mới được mừng tuổi bằng những phong bao đỏ đầy ắp.', tags: ['tet', 'tai-loc', 'tre'] },
  { text: 'Mong cành đào, cành mai trên bàn thờ nhà bạn nở đúng đêm giao thừa.', tags: ['tet', 'gia-dinh', 'may-man'] },
  { text: 'Chúc bạn có một mùa Tết an yên, không tất bật, không lo toan.', tags: ['tet', 'binh-an', 'sum-hop'] },
  { text: 'Mong những phong tục đẹp của Tết cổ truyền còn mãi trong nhà bạn.', tags: ['tet', 'gia-dinh', 'khai-xuan'] },

  // --- Chiem nghiem, song cham ---
  { text: 'Chúc bạn năm mới học được cách chậm lại để thấy mùa xuân ngay trước mắt.', tags: ['xuan', 'binh-an', 'khai-xuan'] },
  { text: 'Mong bạn biết đủ, biết dừng, biết thương mình như thương người.', tags: ['tet', 'binh-an', 'suc-khoe'] },
  { text: 'Chúc bạn năm mới bớt so đo, thêm bao dung, lòng nhẹ như mây xuân.', tags: ['xuan', 'binh-an', 'ban-be'] },
  { text: 'Mong bạn giữ được sự tử tế giữa những ngày bận rộn nhất.', tags: ['tet', 'binh-an', 'cong-viec'] },
  { text: 'Chúc bạn một năm biết ơn những điều nhỏ bé: chén trà nóng, nắng sớm, tiếng cười trẻ thơ.', tags: ['tet', 'binh-an', 'tre'] },
  { text: 'Mong bạn đối xử với bản thân dịu dàng như với người mình yêu quý.', tags: ['tet', 'binh-an', 'suc-khoe'] },

  // --- Vui ve, tong hop ---
  { text: 'Chúc bạn năm mới ăn Tết no nê, chơi xuân thoả thích, ngủ một giấc thật sâu.', tags: ['tet', 'xuan', 'suc-khoe'] },
  { text: 'Mong bạn năm nay cười nhiều hơn khóc, được nhiều hơn mất, vui nhiều hơn buồn.', tags: ['tet', 'may-man', 'binh-an'] },
  { text: 'Chúc bạn một năm mới rực rỡ như hoa đào ngày Tết.', tags: ['tet', 'xuan', 'may-man'] },
  { text: 'Mong bạn có một mùa xuân đáng nhớ, và một năm đáng sống.', tags: ['xuan', 'khai-xuan', 'may-man'] },
  { text: 'Chúc bạn năm mới vạn sự hanh thông, trăm điều như ý, ngàn điều tốt lành.', tags: ['tet', 'may-man', 'than-tai'] },
  { text: 'Mong điều ước đêm giao thừa của bạn năm nay thành sự thật.', tags: ['tet', 'may-man', 'khai-xuan'] },
  { text: 'Chúc bạn một đời an nhiên, một năm rộn rã, một xuân đủ đầy.', tags: ['xuan', 'binh-an', 'sum-hop'] },
  { text: 'Mong bạn luôn là người được nhớ tới trong những dịp sum họp.', tags: ['tet', 'sum-hop', 'ban-be'] },
  { text: 'Chúc bạn năm mới gặp nhiều niềm vui bất ngờ và ít điều phải lo nghĩ.', tags: ['tet', 'may-man', 'binh-an'] },
  { text: 'Mong bạn năm nay sống chậm mà sâu, làm ít mà chất.', tags: ['tet', 'binh-an', 'cong-viec'] },
  { text: 'Chúc bạn một năm mới đầy ắp những buổi sáng bình yên.', tags: ['tet', 'binh-an', 'suc-khoe'] },
  { text: 'Mong bạn đủ sức khoẻ để đi xa, đủ tiền để đi xa, và đủ người thương để muốn về.', tags: ['tet', 'suc-khoe', 'xa-que'] },
  { text: 'Chúc bạn năm mới mọi dự định đều thành, mọi chờ đợi đều đáng.', tags: ['tet', 'khai-xuan', 'may-man'] },
  { text: 'Mong năm mới bạn được sống là chính mình, không phải diễn cho ai xem.', tags: ['tet', 'binh-an', 'ban-be'] },
  { text: 'Chúc bạn một năm sung túc, một xuân an khang, một đời bình an.', tags: ['xuan', 'tai-loc', 'binh-an'] },
  { text: 'Mong xuân này là khởi đầu cho những năm tháng đẹp nhất của bạn.', tags: ['xuan', 'khai-xuan', 'may-man'] },
  { text: 'Chúc bạn năm mới có thêm một tuổi nhưng bớt đi một nỗi lo.', tags: ['tet', 'binh-an', 'suc-khoe'] },
  { text: 'Mong bạn gặp được người hiểu mình mà không cần phải giải thích nhiều.', tags: ['tet', 'ban-be', 'tinh-yeu'] },
  { text: 'Chúc bạn năm mới dám yêu, dám làm, dám tha thứ cho chính mình.', tags: ['tet', 'binh-an', 'tinh-yeu'] },
  { text: 'Mong mọi muộn phiền của năm cũ ở lại phía sau cánh cửa.', tags: ['tet', 'binh-an', 'khai-xuan'] },
  { text: 'Chúc bạn một năm mới nhẹ gánh lo toan, nặng phần hạnh phúc.', tags: ['tet', 'binh-an', 'sum-hop'] },
  { text: 'Mong xuân này nhà nhà no ấm, người người an vui.', tags: ['xuan', 'binh-an', 'sum-hop'] },
  { text: 'Chúc bạn năm mới được ăn Tết ở nơi mình muốn, bên người mình thương.', tags: ['tet', 'tinh-yeu', 'sum-hop'] },
  { text: 'Mong bạn giữ được nụ cười cả trong những ngày bận rộn nhất.', tags: ['tet', 'binh-an', 'cong-viec'] },
  { text: 'Chúc bạn năm mới tấn tài tấn lộc, cầu gì được nấy.', tags: ['tet', 'tai-loc', 'may-man'] },
  { text: 'Mong năm nay bạn đi tới đâu cũng được chào đón bằng nụ cười.', tags: ['tet', 'ban-be', 'may-man'] },
  { text: 'Chúc bạn một mùa xuân ấm cả ngoài trời lẫn trong lòng.', tags: ['xuan', 'binh-an', 'gia-dinh'] },
  { text: 'Mong bạn có đủ bình yên để không phải vội vàng điều gì.', tags: ['tet', 'binh-an', 'suc-khoe'] },
];

/* ------------------------------------------------------------------ */
/* Tho 4 dong: ca dao dan gian va luc bat sang tac                     */
/* ------------------------------------------------------------------ */

const POEMS = [
  // --- Ca dao dan gian ve Tet, mua xuan ---
  { lines: ['Tháng Giêng là tháng ăn chơi', 'Tháng Hai cờ bạc, tháng Ba hội hè', 'Tháng Tư đôi dép dưới quê', 'Bước chân xuống chợ, nón che nghiêng đầu.'], tags: ['tet', 'xuan'], source: 'ca dao' },
  { lines: ['Hoa đào nở, Tết đến rồi', 'Nhà nhà gói bánh, mọi người vui xuân', 'Trẻ em mừng tuổi áo quần', 'Người già chúc thọ, muôn phần an khang.'], tags: ['tet', 'xuan', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Bánh chưng xanh, dưa hành muối', 'Câu đối đỏ, pháo nổ vang trời', 'Mâm cỗ dọn giữa nhà thờ', 'Hương trầm nghi ngút, tổ tiên về cùng.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Mùng một Tết cha, mùng hai Tết mẹ', 'Mùng ba Tết thầy, nhớ lấy mà đi', 'Ơn sinh thành, nghĩa thầy cô', 'Một năm khởi sự, nhớ về cội nguồn.'], tags: ['tet', 'gia-dinh', 'hoc-hanh'], source: 'tục ngữ' },
  { lines: ['Cây mai vàng trước ngõ nhà ai', 'Nở đúng giao thừa, báo hiệu xuân sang', 'Chậu quất cạnh bên cành đào', 'Đón một năm mới, an khang thịnh vượng.'], tags: ['tet', 'xuan'], source: 'sáng tác' },
  { lines: ['Lì xì đỏ, phong bao thắm', 'Trao tay trẻ nhỏ, lời chúc an lành', 'Một năm mới, một khởi đầu', 'Cầu mong may mắn theo chân mọi nhà.'], tags: ['tet', 'tre', 'may-man'], source: 'sáng tác' },
  { lines: ['Chiều ba mươi, tiếng pháo ran', 'Cơm tất niên, cả nhà quây quần', 'Kể nhau nghe chuyện một năm', 'Vui buồn gói lại, để xuân bước vào.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Giao thừa trời đất giao hoà', 'Năm cũ khép lại, năm mới sang', 'Người người hái lộc đầu xuân', 'Cầu cho quốc thái, dân an, nhà nhà.'], tags: ['tet', 'xuan', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Thịt mỡ, dưa hành, câu đối đỏ', 'Nêu cao, tràng pháo, bánh chưng xanh', 'Bốn thứ ấy là Tết Việt Nam', 'Giữ gìn phong tục, muôn đời chẳng phai.'], tags: ['tet', 'gia-dinh', 'khai-xuan'], source: 'ca dao' },
  { lines: ['Đêm ba mươi, ngồi bên bếp lửa', 'Nghe bà kể chuyện Táo Quân', 'Ông Công ông Táo về trời', 'Báo cáo Ngọc Hoàng việc một năm qua.'], tags: ['tet', 'nguoi-gia'], source: 'truyền thuyết' },

  // --- Que huong, xa que ---
  { lines: ['Quê tôi có luỹ tre xanh', 'Có dòng sông nhỏ chảy quanh bờ đê', 'Tết về nhớ mẹ nhớ cha', 'Nhớ nồi bánh tét, nhớ mùi khói rơm.'], tags: ['tet', 'que-nha', 'xa-que'], source: 'sáng tác' },
  { lines: ['Đi đâu rồi cũng phải về', 'Về bên mâm cỗ, về nghe mẹ cười', 'Nhà là nơi để trở lui', 'Tết là dịp để nhớ người thân thương.'], tags: ['tet', 'xuan', 'binh-an'], source: 'sáng tác' },
  { lines: ['Xa quê như cánh chim trời', 'Tết về lại thấy lòng mình bồi hồi', 'Chuyến xe cuối chạy về quê', 'Chở theo cả nỗi nhớ nhà nặng vai.'], tags: ['tet', 'xa-que'], source: 'sáng tác' },
  { lines: ['Mẹ già đứng ngõ trông con', 'Chiều ba mươi Tết, mắt mòn đợi ai', 'Xuân này con phải về ngay', 'Đừng để mẹ phải thêm một mùa xuân.'], tags: ['tet', 'nguoi-gia', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Con về nhà, mẹ reo lên', 'Tay xoa đầu cháu, tay đơm mâm cơm', 'Một năm vất vả lo toan', 'Giờ ngồi bên mẹ, thấy lòng nhẹ tênh.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Người ơi, Tết đến nơi rồi', 'Thu xếp hành lý, mau về nhà thôi', 'Quê hương đang đợi chờ người', 'Bếp hồng đã nhóm, mâm cơm đã bày.'], tags: ['tet', 'xa-que', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Hoa mai nở rộ vườn nhà', 'Gió xuân hây hẩy thoảng qua mái hiên', 'Tết về trên khắp mọi miền', 'Người đi xa cũng thấy lòng nao nao.'], tags: ['xuan', 'tet', 'binh-an'], source: 'sáng tác' },
  { lines: ['Chiếc nón lá đội che nghiêng', 'Chợ Tết người đông, tiếng nói rộn ràng', 'Mua một cành đào hồng thắm', 'Mang về cắm giữa nhà, chờ đón xuân sang.'], tags: ['tet', 'xuan', 'que-nha'], source: 'sáng tác' },
  { lines: ['Đường làng rộn rã tiếng chân', 'Trẻ con nô đùa, áo mới tinh khôi', 'Người già ngồi bên hiên nhà', 'Ngắm xuân về, lòng thấy ấm vô cùng.'], tags: ['xuan', 'tre', 'que-nha'], source: 'sáng tác' },
  { lines: ['Nồi bánh chưng nghi ngút khói', 'Cả nhà quây quần bên bếp hồng', 'Thức trắng đêm để trông bánh', 'Kể chuyện xưa, chờ đón giao thừa.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },

  // --- Ban be, tinh cam ---
  { lines: ['Bạn bè gặp lại ngày xuân', 'Chén trà, câu chuyện, nhớ thời học sinh', 'Năm tháng qua, tóc pha sương', 'Tình xưa nghĩa cũ, vẫn còn nguyên đây.'], tags: ['xuan', 'ban-be'], source: 'sáng tác' },
  { lines: ['Một năm mới, một khởi đầu', 'Chúc nhau sức khoẻ, chúc nhau an lành', 'Chúc cho công việc hanh thông', 'Chúc cho gia đạo, ấm êm thuận hoà.'], tags: ['tet', 'binh-an', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Chén rượu xuân, nâng lên nào', 'Mừng năm mới đến, mừng ta còn nhau', 'Đời người mấy chốc đã qua', 'Cùng nhau uống cạn, mừng xuân sum vầy.'], tags: ['xuan', 'ban-be', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Tình yêu như nụ hoa đào', 'Nở vào ngày Tết, đẹp màu thắm tươi', 'Mong cho đôi lứa nên duyên', 'Trăm năm hạnh phúc, một đời bên nhau.'], tags: ['xuan', 'tinh-yeu'], source: 'sáng tác' },
  { lines: ['Nhớ em, nhớ đến nao lòng', 'Tết này không biết em còn nhớ anh', 'Cành mai trước ngõ nhà em', 'Có ai ngắm nữa, hay là mình anh.'], tags: ['tet', 'tinh-yeu'], source: 'sáng tác' },
  { lines: ['Lời chúc gửi tới người thương', 'Mong em năm mới an nhiên, vui vầy', 'Dẫu mình chưa thể gần nhau', 'Lòng anh vẫn hướng về em mỗi ngày.'], tags: ['tet', 'tinh-yeu'], source: 'sáng tác' },
  { lines: ['Cành đào đỏ thắm ngoài hiên', 'Như lòng ta gửi tới người mình thương', 'Xuân này có được bên nhau', 'Là điều hạnh phúc nhất trong đời ta.'], tags: ['xuan', 'tinh-yeu'], source: 'sáng tác' },
  { lines: ['Tết về, ai cũng có nhà', 'Còn ta lặng lẽ bước qua phố buồn', 'Mong xuân này sẽ khác hơn', 'Có người nắm tay, cùng ta đón xuân.'], tags: ['tet', 'tinh-yeu', 'binh-an'], source: 'sáng tác' },
  { lines: ['Trà xuân pha đãi bạn hiền', 'Kể nhau nghe chuyện một năm đã qua', 'Vui buồn rồi cũng qua đi', 'Để xuân mang tới những gì tốt hơn.'], tags: ['xuan', 'ban-be'], source: 'sáng tác' },
  { lines: ['Bạn ơi, cạn chén xuân này', 'Chúc nhau một năm rộng đường thênh thang', 'Đường đời dẫu lắm gian nan', 'Có bạn bên cạnh, nhẹ nhàng bước đi.'], tags: ['xuan', 'ban-be', 'cong-viec'], source: 'sáng tác' },

  // --- Cong viec, lam an ---
  { lines: ['Mở hàng ngày Tết đông vui', 'Khách vô tấp nập, tiền rơi đầy tay', 'Cả năm buôn bán hanh thông', 'Tài lộc vượng phát, ấm no đủ đầy.'], tags: ['tet', 'tai-loc', 'cong-viec'], source: 'sáng tác' },
  { lines: ['Một năm khởi nghiệp hanh thông', 'Công danh sự nghiệp, vững vàng bước đi', 'Nỗ lực hôm nay gặt hái', 'Thành quả ngày mai, xứng đáng công lao.'], tags: ['tet', 'cong-viec', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Cày sâu cuốc bẫm quanh năm', 'Tết về mới có dư ăn, dư dùng', 'Công sức đổ xuống ruộng đồng', 'Đổi thành hạt lúa, ấm no quanh nhà.'], tags: ['tet', 'que-nha', 'cong-viec'], source: 'ca dao' },
  { lines: ['Buôn tận gốc, bán tận ngọn', 'Làm ăn có đức, tài lộc mới bền', 'Một năm khởi sự hanh thông', 'Khách quen khách mới, đông vui cả nhà.'], tags: ['tet', 'cong-viec', 'tai-loc'], source: 'sáng tác' },
  { lines: ['Sáng mùng một, mở cửa hàng', 'Cầu cho buôn bán, một năm phát tài', 'Niềm tin đặt ở tay mình', 'Thêm chút may mắn, thế là đủ vui.'], tags: ['tet', 'tai-loc', 'may-man'], source: 'sáng tác' },
  { lines: ['Gạo đầy bồ, tiền đầy túi', 'Đó là ước nguyện của người nông dân', 'Tết về nhà cửa tươm tất', 'Mừng một năm mới, an khang thịnh vượng.'], tags: ['tet', 'tai-loc', 'que-nha'], source: 'sáng tác' },
  { lines: ['Học hành cho lắm vào', 'Để mai thi đỗ, rạng danh gia đình', 'Tết này chúc cháu học giỏi', 'Một năm tiến bộ, mở mang tương lai.'], tags: ['tet', 'hoc-hanh', 'tre'], source: 'sáng tác' },
  { lines: ['Cơm cha áo mẹ công thầy', 'Nghĩa này nặng lắm, nhớ ngày nhớ đêm', 'Tết về thăm lại trường xưa', 'Cúi đầu cảm tạ, ân tình năm xưa.'], tags: ['tet', 'hoc-hanh', 'nguoi-gia'], source: 'ca dao' },
  { lines: ['Một mai ta đỗ đạt rồi', 'Nhớ về làng cũ, nhớ người dìu dắt', 'Công ơn dưỡng dục sinh thành', 'Khắc sâu trong dạ, suốt đời không quên.'], tags: ['tet', 'hoc-hanh', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Đèn sách đêm khuya, một năm dài', 'Tết này xả hơi, ngủ cho đã đời', 'Rồi lại cắp sách tới trường', 'Mang theo lời chúc, năm mới thành công.'], tags: ['tet', 'tre', 'hoc-hanh'], source: 'sáng tác' },

  // --- Nguoi gia, gia dinh ---
  { lines: ['Ông bà sống mãi trăm năm', 'Cháu con sum họp, quây quần bên nhau', 'Mừng thọ ông bà một tuổi', 'Chúc cho sức khoẻ, dồi dào an khang.'], tags: ['tet', 'nguoi-gia', 'suc-khoe'], source: 'sáng tác' },
  { lines: ['Chúc thọ mẹ cha trường thọ', 'Đầu năm chúc Tết, lòng thành kính dâng', 'Công lao sinh dưỡng một đời', 'Con xin đền đáp, trọn đời hiếu thân.'], tags: ['tet', 'nguoi-gia', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Trẻ con mừng tuổi áo hoa', 'Người già chúc thọ, thêm quà cho con', 'Mùa xuân ai cũng được vui', 'Từ già tới trẻ, một nhà an khang.'], tags: ['tet', 'gia-dinh', 'tre'], source: 'sáng tác' },
  { lines: ['Bố mẹ già, tóc bạc phơ', 'Công lao nuôi dưỡng, con nào dám quên', 'Tết về con phải ở bên', 'Chăm nom bố mẹ, ấy là đạo con.'], tags: ['tet', 'nguoi-gia', 'gia-dinh'], source: 'ca dao' },
  { lines: ['Một mái nhà, mấy thế hệ', 'Trên kính dưới nhường, trong ấm ngoài êm', 'Tết về cả nhà quây quần', 'Ấy là hạnh phúc, chẳng gì sánh hơn.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Con cháu hiếu thuận một lòng', 'Ông bà khoẻ mạnh, thọ trường sống lâu', 'Gia đình hoà thuận, an vui', 'Phúc đức để lại, muôn đời về sau.'], tags: ['tet', 'gia-dinh', 'binh-an'], source: 'sáng tác' },
  { lines: ['Bàn thờ nghi ngút khói hương', 'Tổ tiên phù hộ, con cháu ấm no', 'Một năm mới, một lời cầu', 'Gia đình bình an, vạn sự hanh thông.'], tags: ['tet', 'gia-dinh', 'binh-an'], source: 'sáng tác' },
  { lines: ['Đất lành chim đậu về đây', 'Người hiền ở lại, lộc tài đến theo', 'Tết về nhà cửa tươi vui', 'Một năm sung túc, một năm dư dả.'], tags: ['tet', 'tai-loc', 'binh-an'], source: 'sáng tác' },
  { lines: ['Bánh chưng gói ghém ân tình', 'Lá dong xanh, gạo nếp thơm bùi', 'Nhân đậu, thịt mỡ, hành tiêu', 'Gói tròn một tấm lòng thành dâng lên.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Mâm ngũ quả bày trên bàn thờ', 'Cầu, dừa, đu đủ, xoài, mãng cầu', 'Ước mong vừa đủ, vừa sung', 'Một năm an khang, thịnh vượng đủ đầy.'], tags: ['tet', 'gia-dinh', 'tai-loc'], source: 'sáng tác' },

  // --- Mua xuan, thien nhien ---
  { lines: ['Mùa xuân cây cỏ đâm chồi', 'Hoa nở khắp nơi, bướm lượn vườn nhà', 'Người người hớn hở đón xuân', 'Đất trời như cũng, reo vui cùng người.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
  { lines: ['Én về báo hiệu mùa xuân', 'Trời xanh, mây trắng, gió lành thoảng qua', 'Con người thêm một tuổi mới', 'Cây cối thêm một mùa xanh tươi.'], tags: ['xuan', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Xuân về, hoa nở khắp nơi', 'Đào hồng, mai thắm, quất xanh, cúc vàng', 'Mỗi loài một vẻ riêng tươi', 'Góp thành bức hoạ, mùa xuân diệu kỳ.'], tags: ['xuan', 'tet'], source: 'sáng tác' },
  { lines: ['Ngày xuân mưa bụi bay bay', 'Ướt vai người bước, trên đường chợ xuân', 'Áo mới, nón mới, tươi cười', 'Một năm khởi sắc, lòng người hân hoan.'], tags: ['xuan', 'tet'], source: 'sáng tác' },
  { lines: ['Nắng xuân ấm áp ngoài hiên', 'Chim hót líu lo, báo hiệu mùa sang', 'Một năm mới, một hy vọng', 'Gieo vào đất mới, chờ ngày nở hoa.'], tags: ['xuan', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Gió xuân thổi nhẹ qua nhà', 'Mang theo hơi ấm, của một năm mới', 'Người người đều thấy an vui', 'Xuân về mang tới, những gì tốt hơn.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
  { lines: ['Tháng Giêng, trăng sáng vằng vặc', 'Trời trong, đất rộng, lòng người thảnh thơi', 'Rằm tháng Giêng, đi lễ chùa', 'Cầu cho quốc thái, dân an, nhà nhà.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
  { lines: ['Đầu năm đi hái lộc xuân', 'Một cành non mới, mang về treo lên', 'Mong một năm mới bình an', 'Công việc hanh thông, gia đạo thuận hoà.'], tags: ['xuan', 'khai-xuan', 'cong-viec'], source: 'sáng tác' },
  { lines: ['Chợ Tết đông nghịt người đi', 'Kẻ mua người bán, rộn ràng tiếng cười', 'Cành đào, chậu quất, bánh chưng', 'Một năm vất vả, Tết phải thật vui.'], tags: ['tet', 'vui'], source: 'sáng tác' },
  { lines: ['Đêm xuân phố xá rực đèn', 'Người đi chơi Tết, áo quần tươi xinh', 'Tiếng nhạc, tiếng nói, tiếng cười', 'Một năm mới đến, ai cũng hân hoan.'], tags: ['xuan', 'tet'], source: 'sáng tác' },

  // --- Chiem nghiem, song cham ---
  { lines: ['Một năm qua, được gì mất gì', 'Tết về ngồi lại, nghĩ suy đôi điều', 'Điều gì đáng giữ thì giữ', 'Điều gì nên bỏ, thì buông cho nhẹ.'], tags: ['tet', 'binh-an'], source: 'sáng tác' },
  { lines: ['Thời gian như nước chảy xuôi', 'Một năm nữa lại trôi qua mất rồi', 'Còn ta thì được thêm gì', 'Thêm một năm nữa, để yêu để sống.'], tags: ['tet', 'binh-an', 'tinh-yeu'], source: 'sáng tác' },
  { lines: ['Biết đủ thì thấy an nhiên', 'Không tham, không vọng, lòng yên như hồ', 'Tết về chẳng phải lo toan', 'Một chén trà nóng, ấy là đủ vui.'], tags: ['tet', 'binh-an'], source: 'sáng tác' },
  { lines: ['Sống chậm lại một chút thôi', 'Để nghe mình thở, để nhìn xuân sang', 'Đừng vội vàng, đừng hối hả', 'Xuân đang ở ngay, trước cửa nhà ta.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
  { lines: ['Cho đi rồi sẽ nhận về', 'Lòng nhân ái ấy, chẳng hề mất đi', 'Tết về chia sẻ đôi phần', 'Nhà nghèo cũng có, một mùa xuân vui.'], tags: ['tet', 'binh-an', 'ban-be'], source: 'sáng tác' },
  { lines: ['Ơn cha nghĩa mẹ sinh thành', 'Công thầy dạy dỗ, nghĩa tình bạn bè', 'Tết về nhớ để mà thương', 'Những người đã giúp, ta trên đường đời.'], tags: ['tet', 'gia-dinh', 'ban-be'], source: 'sáng tác' },
  { lines: ['Xuân này ta chúc cho nhau', 'Một năm bình an, một năm an vui', 'Cầu mong trời đất thuận hoà', 'Mưa thuận gió hoà, mùa màng bội thu.'], tags: ['xuan', 'binh-an', 'que-nha'], source: 'sáng tác' },
  { lines: ['Cây đa, giếng nước, sân đình', 'Là nơi lưu giữ, hồn quê Việt Nam', 'Tết về nhớ gốc nhớ cành', 'Nhớ về cội nguồn, nhớ ơn tổ tiên.'], tags: ['tet', 'que-nha', 'gia-dinh'], source: 'sáng tác' },
  { lines: ['Năm mới ước một điều thôi', 'Ước cho mọi người, được sống yên vui', 'Không còn đói rét, lo toan', 'Ai cũng có một, cái Tết đủ đầy.'], tags: ['tet', 'binh-an', 'sum-hop'], source: 'sáng tác' },
  { lines: ['Chúc nhau một chữ "an"', 'An khang, an lạc, an nhiên, an lành', 'Một năm mới, một chữ "an"', 'Ấy là hạnh phúc, ấy là đủ đầy.'], tags: ['tet', 'binh-an'], source: 'sáng tác' },

  // --- Vui ve, doi thuong ---
  { lines: ['Tết này ăn uống thoả thuê', 'Bánh chưng, giò chả, thịt đông, dưa hành', 'Ăn xong lại thấy lo lo', 'Sợ cái cân nó, không tha cho mình.'], tags: ['tet', 'vui'], source: 'sáng tác' },
  { lines: ['Mừng tuổi thì phải nhận ngay', 'Không thì người lớn, lại buồn cho xem', 'Trẻ con sung sướng vô cùng', 'Bao nhiêu phong đỏ, ấy là ấm no.'], tags: ['tet', 'tre', 'vui'], source: 'sáng tác' },
  { lines: ['Tết về xe cộ đông ghê', 'Về quê mất mấy tiếng đồng hồ', 'Nhưng mà nghĩ tới mẹ cha', 'Mệt mấy cũng phải, cố mà về thôi.'], tags: ['tet', 'xa-que', 'vui'], source: 'sáng tác' },
  { lines: ['Ba ngày Tết, chơi cho đã', 'Hết Tết lại thấy, túi mình nhẹ tênh', 'Nhưng mà vui thì đã sao', 'Tiền thì kiếm lại, Tết thì mấy khi.'], tags: ['tet', 'vui', 'tai-loc'], source: 'sáng tác' },
  { lines: ['Ai hỏi năm nay thế nào', 'Cười cười nói nói, "cũng ổn, cũng vui"', 'Thật ra trong bụng lo âu', 'Nhưng Tết mà, phải vui lên chứ.'], tags: ['tet', 'vui', 'cong-viec'], source: 'sáng tác' },
  { lines: ['Tết đến, nhà cửa sạch bong', 'Mẹ tôi dọn dẹp, cả tuần không ngơi', 'Công nhận mẹ giỏi thật', 'Một tay lo hết, cái Tết cho nhà.'], tags: ['tet', 'gia-dinh', 'nguoi-gia'], source: 'sáng tác' },
  { lines: ['Đi chúc Tết, mỏi cả chân', 'Nhưng mà vui lắm, gặp bao nhiêu người', 'Một năm mới gặp lại nhau', 'Chuyện trò rôm rả, quên cả mệt mỏi.'], tags: ['tet', 'ban-be', 'vui'], source: 'sáng tác' },
  { lines: ['Năm mới, quyết tâm đổi thay', 'Được ba ngày Tết, lại về như xưa', 'Thôi thì cứ vậy cũng hay', 'Biết đâu năm khác, mình lại quyết tâm.'], tags: ['tet', 'vui', 'khai-xuan'], source: 'sáng tác' },
  { lines: ['Xuân về, hoa nở khắp nơi', 'Người người hạnh phúc, nụ cười trên môi', 'Cầu cho năm mới an khang', 'Vạn sự như ý, một năm thái hoà.'], tags: ['xuan', 'binh-an', 'may-man'], source: 'sáng tác' },
  { lines: ['Tết ơi, Tết ở lại chơi', 'Đừng đi vội vã, để người ta vui', 'Một năm chỉ có mấy ngày', 'Được sum họp, được yêu thương, đủ rồi.'], tags: ['tet', 'sum-hop', 'vui'], source: 'sáng tác' },
];


/* ------------------------------------------------------------------ */
/* Noi dung theo tung dip                                              */
/* ------------------------------------------------------------------ */

const OCCASIONS = {
  // 23 thang Chap: le dua Ong Cong Ong Tao ve troi
  'ong-tao': {
    label: 'Ông Công Ông Táo',
    wishes: [
      'Hôm nay tiễn Táo Quân về trời, mong ngài báo cáo toàn điều tốt, xin về một năm no ấm.',
      'Cúng ông Táo rồi, nhà cửa tươm tất, chỉ chờ Tết gõ cửa.',
      'Tiễn Táo về trời, gửi theo lời cầu: nhà nhà an khang, người người khoẻ mạnh.',
      'Mong Táo Quân nói giúp vài lời hay, để năm mới nhà mình được hanh thông.',
      'Lễ ông Táo xong, thấy lòng nhẹ nhõm như vừa dọn sạch một năm cũ.',
      'Cá chép tiễn Táo, khói hương tiễn năm, mong điều tốt lành ở lại với nhà.',
      'Hôm nay lo việc bếp núc, ngày mai lo việc Tết, thấy Tết đã về thật gần.',
    ],
    poems: [
      { lines: ['Hai mươi ba tháng Chạp rồi', 'Ông Công ông Táo về trời báo công', 'Cá chép thả xuống ao sâu', 'Gửi theo lời nguyện, một năm an lành.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
      { lines: ['Táo Quân lên tới thiên đình', 'Kể cho Ngọc Đế nghe tình nhà ta', 'Cầu xin ban phước lành cho', 'Năm mới no ấm, an khang thịnh vượng.'], tags: ['tet', 'may-man'], source: 'sáng tác' },
      { lines: ['Dọn bếp sạch sẽ hôm nay', 'Để tiễn ông Táo, về trời tâu lên', 'Miệng ngài ngọt, lòng ta thành', 'Mong điều tốt đẹp, ở lại quanh nhà.'], tags: ['tet', 'binh-an'], source: 'sáng tác' },
      { lines: ['Chiều nay tiễn Táo về trời', 'Khói hương nghi ngút, lòng người bâng khuâng', 'Một năm qua đã hết rồi', 'Năm mới lại tới, mở ra hy vọng.'], tags: ['tet', 'khai-xuan'], source: 'sáng tác' },
      { lines: ['Ông Táo cười, ta cũng cười', 'Một năm vất vả, giờ thời nhẹ tênh', 'Tiễn ngài lên chốn thiên đình', 'Giữ cho nhà cửa, ấm êm thuận hoà.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
    ],
  },

  // Ngay cuoi cung cua nam am lich
  'tat-nien': {
    label: 'Ngày Tất niên',
    wishes: [
      'Bữa cơm tất niên hôm nay đông đủ, thế là một năm trọn vẹn.',
      'Tất niên rồi, mọi lo toan gói lại, chỉ còn lại niềm vui bên gia đình.',
      'Chúc bữa cơm tất niên nhà bạn ấm cúng, đủ đầy, và có tiếng cười của trẻ nhỏ.',
      'Hôm nay ăn bữa cơm cuối năm, ngày mai đón một năm mới tinh khôi.',
      'Tất niên sum họp — điều quý nhất của một năm không phải tiền bạc mà là còn đủ người ngồi chung mâm.',
      'Chúc bạn một tất niên thật trọn vẹn, để sáng mai thức dậy thấy lòng nhẹ tênh.',
    ],
    poems: [
      { lines: ['Chiều ba mươi, bữa cơm tất niên', 'Cả nhà quây quần, ấm áp vô cùng', 'Kể nhau nghe chuyện một năm', 'Vui buồn gói lại, để xuân bước vào.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },
      { lines: ['Nồi bánh chưng đã chín rồi', 'Mùi thơm lan toả, khắp cả gian nhà', 'Tất niên sum họp một nhà', 'Chờ đêm giao thừa, đón một năm mới.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
      { lines: ['Một năm qua, bao nhiêu chuyện', 'Giờ ngồi lại, thấy nhẹ nhõm trong lòng', 'Tất niên, chén rượu nâng lên', 'Mừng ta còn được, ngồi bên nhau này.'], tags: ['tet', 'sum-hop', 'binh-an'], source: 'sáng tác' },
      { lines: ['Sân nhà quét đã sạch tinh', 'Bàn thờ lau bụi, hương trầm toả bay', 'Tất niên, lòng thấy an nhiên', 'Một năm khép lại, một năm mở ra.'], tags: ['tet', 'binh-an'], source: 'sáng tác' },
      { lines: ['Mẹ dọn mâm cỗ đầy ắp', 'Con cháu về đủ, thế là vui rồi', 'Tất niên, không cần cao sang', 'Chỉ cần đủ mặt, ấy là hạnh phúc.'], tags: ['tet', 'gia-dinh', 'nguoi-gia'], source: 'sáng tác' },
    ],
  },

  // Nua dem mung 1 Tet
  'giao-thua': {
    label: 'Giao thừa',
    wishes: [
      'Giao thừa an lành — năm cũ khép lại, năm mới mở ra với bao điều tốt đẹp đang chờ.',
      'Khoảnh khắc chuyển giao năm cũ sang năm mới, chúc bạn mọi điều ước đều thành sự thật.',
      'Phút giao thừa, cầu cho gia đình bạn một năm mới an khang, thịnh vượng, vạn sự như ý.',
      'Giao thừa rồi, hãy ôm người thân một cái thật chặt — đó là điều quý nhất của khoảnh khắc này.',
      'Chúc bạn một năm mới khởi đầu rực rỡ như pháo hoa đêm giao thừa.',
      'Đêm nay trời đất giao hoà, chúc nhà bạn một năm mới đủ đầy và bình an.',
      'Giao thừa — thời khắc đẹp nhất năm, chúc bạn và gia đình vạn sự hanh thông.',
    ],
    poems: [
      { lines: ['Giao thừa trời đất giao hoà', 'Năm cũ khép lại, năm mới sang', 'Người người hái lộc đầu xuân', 'Cầu cho quốc thái, dân an, nhà nhà.'], tags: ['tet', 'khai-xuan'], source: 'sáng tác' },
      { lines: ['Đêm ba mươi, pháo nổ ran trời', 'Thời khắc giao thừa, đất trời chuyển mình', 'Một năm mới, một khởi đầu', 'Cầu mong may mắn, theo chân mọi nhà.'], tags: ['tet', 'may-man'], source: 'sáng tác' },
      { lines: ['Khói hương nghi ngút bàn thờ', 'Giao thừa lễ tổ tiên về sum vầy', 'Một năm mới, một lời cầu', 'Gia đình an lạc, một nhà ấm êm.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
      { lines: ['Phút giao thừa, đứng bên nhau', 'Nghe tim đập nhịp, chờ năm mới sang', 'Điều ước gì cũng được thôi', 'Miễn là có nhau, ấy là đủ rồi.'], tags: ['tet', 'sum-hop', 'tinh-yeu'], source: 'sáng tác' },
      { lines: ['Trống đồng vang, pháo nổ đì đùng', 'Giao thừa đã điểm, một năm mới sang', 'Chúc nhau sức khoẻ, an khang', 'Chúc nhau hạnh phúc, một năm an lành.'], tags: ['tet', 'suc-khoe', 'binh-an'], source: 'sáng tác' },
      { lines: ['Năm cũ đi, năm mới tới', 'Mang theo hy vọng, của một khởi đầu', 'Giao thừa, ta chúc cho nhau', 'Một năm rực rỡ, một năm đủ đầy.'], tags: ['tet', 'khai-xuan', 'may-man'], source: 'sáng tác' },
    ],
  },

  // Mung 1 Tet
  'mung-1': {
    label: 'Mùng 1 Tết',
    wishes: [
      'Mùng 1 Tết, chúc bạn mở hàng hanh thông, cả năm may mắn, tiền vào như nước.',
      'Sáng mùng một, chúc cả nhà một năm mới an khang, thịnh vượng, vạn sự như ý.',
      'Ngày đầu năm, chúc bạn khởi đầu thuận lợi, gặp nhiều quý nhân, tránh được kẻ xấu.',
      'Mùng 1 Tết cha — chúc bố mẹ một năm mới khoẻ mạnh, an nhiên, con cháu đề huề.',
      'Sáng mùng một, phong bao đỏ đã sẵn, lời chúc hay đã có — chúc bạn một năm đủ đầy.',
      'Mùng 1 Tết, chúc bạn một năm mới tấn tài tấn lộc, cầu gì được nấy.',
      'Ngày đầu tiên của năm, chúc mọi dự định của bạn đều thành hiện thực.',
    ],
    poems: [
      { lines: ['Mùng một Tết, sáng tinh mơ', 'Nhà nhà mở cửa, đón một năm mới', 'Chúc nhau câu chúc an khang', 'Một năm thịnh vượng, một năm đủ đầy.'], tags: ['tet', 'khai-xuan', 'tai-loc'], source: 'sáng tác' },
      { lines: ['Mùng một Tết cha, nhớ lời', 'Công ơn sinh dưỡng, một đời không quên', 'Đầu năm chúc thọ mẹ cha', 'Sức khoẻ dồi dào, sống lâu trăm tuổi.'], tags: ['tet', 'gia-dinh', 'nguoi-gia'], source: 'sáng tác' },
      { lines: ['Sáng mùng một, mở cửa nhà', 'Đón luồng khí mới, vào trong gian nhà', 'Cầu cho một năm hanh thông', 'Buôn may bán đắt, tiền vô đầy nhà.'], tags: ['tet', 'tai-loc', 'cong-viec'], source: 'sáng tác' },
      { lines: ['Trẻ con mừng tuổi sáng nay', 'Phong bao đỏ thắm, trao tay rộn ràng', 'Người lớn chúc Tết lẫn nhau', 'Một năm mới tới, ai cũng hân hoan.'], tags: ['tet', 'tre', 'sum-hop'], source: 'sáng tác' },
      { lines: ['Mùng một, đi chúc Tết nhà', 'Chén trà, miếng mứt, câu chào thân thương', 'Một năm mới, một niềm tin', 'Điều tốt sẽ tới, với người hiền lành.'], tags: ['tet', 'ban-be'], source: 'sáng tác' },
      { lines: ['Ngày đầu năm, giữ lời lành', 'Không nói điều dữ, không làm điều sai', 'Cả năm sẽ được an khang', 'Khởi đầu tốt đẹp, cả năm tốt lành.'], tags: ['tet', 'binh-an', 'khai-xuan'], source: 'sáng tác' },
    ],
  },

  // Mung 2 Tet
  'mung-2': {
    label: 'Mùng 2 Tết',
    wishes: [
      'Mùng 2 Tết mẹ — chúc mẹ một năm mới bớt lo toan, để con cháu gánh vác thay.',
      'Ngày mùng hai, chúc bạn về nhà ngoại thật vui, gặp đủ người thân yêu.',
      'Mùng 2 Tết, chúc đại gia đình sum họp đông đủ, trên dưới một lòng.',
      'Sang ngày thứ hai của năm, chúc bạn giữ được niềm vui của ngày đầu tiên.',
      'Mùng 2 Tết, chúc bạn những chuyến đi chúc Tết đều thuận đường, gặp toàn điều tốt.',
      'Chúc mùng 2 Tết ấm cúng, mâm cỗ đầy, tiếng cười vang khắp nhà.',
    ],
    poems: [
      { lines: ['Mùng hai Tết mẹ, về nhà', 'Thăm bên ngoại, thăm bà thăm ông', 'Một năm mới, một lần về', 'Thấy lòng ấm lại, như ngày còn thơ.'], tags: ['tet', 'gia-dinh', 'sum-hop'], source: 'sáng tác' },
      { lines: ['Ngày mùng hai, rộn rã đường quê', 'Xe cộ tấp nập, người về chúc nhau', 'Một năm mới, gặp lại nhau', 'Chuyện trò rôm rả, quên hết mệt nhọc.'], tags: ['tet', 'que-nha', 'sum-hop'], source: 'sáng tác' },
      { lines: ['Mùng hai Tết, chúc đôi bên', 'Nội ngoại hai họ, một nhà an khang', 'Trên kính dưới nhường, hoà thuận', 'Ấy là phúc đức, để lại đời sau.'], tags: ['tet', 'gia-dinh', 'binh-an'], source: 'sáng tác' },
      { lines: ['Chén rượu mùng hai, nâng lên', 'Mừng đại gia đình, sum họp đông vui', 'Một năm mới, một niềm vui', 'Có nhau là đủ, chẳng cần gì hơn.'], tags: ['tet', 'sum-hop', 'ban-be'], source: 'sáng tác' },
      { lines: ['Sáng mùng hai, trời đẹp trong veo', 'Đi chúc Tết họ hàng, lòng thấy nhẹ tênh', 'Một năm mới, một khởi đầu', 'Mọi điều tốt đẹp, đang chờ phía trước.'], tags: ['tet', 'khai-xuan'], source: 'sáng tác' },
    ],
  },

  // Mung 3 Tet
  'mung-3': {
    label: 'Mùng 3 Tết',
    wishes: [
      'Mùng 3 Tết thầy — chúc thầy cô một năm mới sức khoẻ dồi dào, học trò ngoan ngoãn.',
      'Ngày mùng ba, chúc bạn nhớ về người đã dạy mình, và gửi một lời cảm ơn.',
      'Mùng 3 Tết, chúc bạn một năm học hành tấn tới, thi đâu đỗ đó.',
      'Sang ngày thứ ba, chúc bạn giữ trọn đạo thầy trò, nghĩa bạn bè.',
      'Mùng 3 Tết, chúc các bạn trẻ đỗ vào ngôi trường mơ ước.',
      'Chúc mùng 3 Tết, ai cũng nhớ về người đã nâng mình lên.',
    ],
    poems: [
      { lines: ['Mùng ba Tết thầy, nhớ ơn', 'Công người dạy dỗ, một đời không quên', 'Đầu năm ghé lại trường xưa', 'Cúi đầu chào thầy, lòng thành kính dâng.'], tags: ['tet', 'hoc-hanh'], source: 'sáng tác' },
      { lines: ['Cơm cha áo mẹ công thầy', 'Nghĩa này nặng lắm, nhớ ngày nhớ đêm', 'Mùng ba Tết, nhớ tới thầy', 'Người đã dìu dắt, ta trên đường đời.'], tags: ['tet', 'hoc-hanh', 'gia-dinh'], source: 'ca dao' },
      { lines: ['Một chữ cũng là thầy', 'Nửa chữ cũng là thầy, nhớ công', 'Mùng ba Tết, chúc thầy cô', 'Sức khoẻ dồi dào, học trò thành đạt.'], tags: ['tet', 'hoc-hanh', 'suc-khoe'], source: 'tục ngữ' },
      { lines: ['Ngày mùng ba, ghé thăm trường', 'Nhớ thời cắp sách, nhớ thầy nhớ cô', 'Một năm mới, một lời chúc', 'Thầy cô mạnh khoẻ, trò giỏi hơn xưa.'], tags: ['tet', 'hoc-hanh', 'tre'], source: 'sáng tác' },
      { lines: ['Học trò cũ, nhớ trường xưa', 'Mùng ba Tết, lại ghé về thăm thầy', 'Chén trà, câu chuyện năm nào', 'Nghĩa tình thầy trò, mãi còn vẹn nguyên.'], tags: ['tet', 'hoc-hanh', 'ban-be'], source: 'sáng tác' },
    ],
  },

  // Mung 4: le ta, tien ong ba
  'tien-ong-ba': {
    label: 'Lễ tạ, tiễn ông bà',
    wishes: [
      'Hôm nay làm lễ tạ, tiễn ông bà tổ tiên — cầu mong một năm mới được phù hộ độ trì.',
      'Lễ tạ rồi, Tết đã trọn vẹn, chúc bạn một năm mới bình an và may mắn.',
      'Tiễn ông bà về chốn tổ tiên, mong người yên lòng vì con cháu thuận hoà.',
      'Kết thúc mấy ngày Tết, chúc bạn giữ được dư âm ấm áp cho cả năm.',
      'Lễ tạ hôm nay, lòng thành dâng lên, cầu cho gia đạo an khang.',
      'Tiễn ông bà, tiễn luôn những điều chưa may của năm cũ.',
    ],
    poems: [
      { lines: ['Hôm nay làm lễ tạ ơn', 'Tiễn ông bà tổ tiên về sum vầy', 'Một năm mới, một lời cầu', 'Gia đạo an khang, con cháu hiếu thuận.'], tags: ['tet', 'gia-dinh'], source: 'sáng tác' },
      { lines: ['Mấy ngày Tết đã trôi qua', 'Hôm nay lễ tạ, tiễn bà tiễn ông', 'Cầu mong tổ tiên phù hộ', 'Một năm mới, một nhà an khang.'], tags: ['tet', 'gia-dinh', 'binh-an'], source: 'sáng tác' },
      { lines: ['Khói hương nghi ngút bàn thờ', 'Lòng thành con cháu, dâng lên tổ tiên', 'Cầu cho một năm bình an', 'Mưa thuận gió hoà, nhà nhà ấm no.'], tags: ['tet', 'binh-an', 'que-nha'], source: 'sáng tác' },
      { lines: ['Tiễn ông bà về chốn xưa', 'Để lại phước lành, cho con cho cháu', 'Một năm mới, một niềm tin', 'Gia đình thuận hoà, vạn sự hanh thông.'], tags: ['tet', 'gia-dinh', 'may-man'], source: 'sáng tác' },
      { lines: ['Tết đã hết, lòng vẫn ấm', 'Dư âm sum họp, còn mãi trong ta', 'Hẹn một năm nữa gặp lại', 'Bên mâm cơm Tết, đủ mặt đủ lòng.'], tags: ['tet', 'sum-hop', 'binh-an'], source: 'sáng tác' },
    ],
  },

  // Ram thang Gieng
  'ram': {
    label: 'Rằm tháng Giêng',
    wishes: [
      'Rằm tháng Giêng, chúc bạn một năm bình an, cầu gì được nấy.',
      'Tết Nguyên Tiêu — đêm trăng tròn đầu năm, chúc bạn vạn sự viên mãn.',
      'Rằm tháng Giêng, đi chùa cầu an, mong một năm thuận hoà, mưa thuận gió hoà.',
      'Đêm rằm đầu năm, trăng sáng như gương, chúc bạn một năm sáng sủa hanh thông.',
      'Rằm tháng Giêng, chúc gia đình bạn đoàn viên, viên mãn, đủ đầy.',
      'Tết Nguyên Tiêu rồi, coi như Tết đã khép lại — chúc bạn một năm làm ăn phát đạt.',
    ],
    poems: [
      { lines: ['Rằm tháng Giêng, trăng sáng vằng vặc', 'Trời trong, đất rộng, lòng người thảnh thơi', 'Đi chùa cầu một năm an', 'Cầu cho quốc thái, dân an, nhà nhà.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
      { lines: ['Nguyên Tiêu, đêm hội hoa đăng', 'Người người nô nức, đón trăng đầu năm', 'Cầu cho một năm viên mãn', 'Gia đình sum họp, an khang thịnh vượng.'], tags: ['xuan', 'sum-hop'], source: 'sáng tác' },
      { lines: ['Tháng Giêng là tháng ăn chơi', 'Rằm tháng Giêng, lại càng rộn ràng', 'Hội hè, đình đám, chùa chiền', 'Một năm khởi sắc, từ đây bắt đầu.'], tags: ['xuan', 'tet'], source: 'ca dao' },
      { lines: ['Trăng rằm soi khắp quê hương', 'Đồng ruộng xanh mướt, làng quê thanh bình', 'Cầu cho mưa thuận gió hoà', 'Mùa màng bội thu, cuộc sống ấm no.'], tags: ['xuan', 'que-nha'], source: 'sáng tác' },
      { lines: ['Rằm tháng Giêng, lễ Phật cầu an', 'Mong cho gia đạo, được bình an', 'Một năm mới, một lời nguyện', 'Chúng sinh no ấm, muôn nhà an vui.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
    ],
  },

  // Mung 5 den mung 10 thang Gieng
  'dau-xuan': {
    label: 'Những ngày đầu xuân',
    wishes: [
      'Những ngày đầu xuân còn vương chút Tết — chúc bạn giữ trọn niềm vui này cho cả năm.',
      'Xuân đang đẹp nhất, chúc bạn tận hưởng trọn vẹn từng ngày đầu năm.',
      'Đầu xuân, chúc bạn khởi sự thuận lợi, việc gì cũng hanh thông.',
      'Mùa xuân vẫn còn, chúc bạn gieo được những hạt giống tốt cho cả năm.',
      'Những ngày đầu xuân, chúc bạn bình an, thư thái, và tràn đầy hy vọng.',
      'Chúc bạn một mùa xuân đáng nhớ, và một năm đáng sống.',
      'Đầu xuân năm mới, chúc bạn có thêm nhiều khởi đầu tốt đẹp.',
    ],
    poems: [
      { lines: ['Đầu xuân đi hái lộc non', 'Một cành non mới, mang về treo lên', 'Mong một năm mới bình an', 'Công việc hanh thông, gia đạo thuận hoà.'], tags: ['xuan', 'khai-xuan'], source: 'sáng tác' },
      { lines: ['Mùa xuân cây cỏ đâm chồi', 'Hoa nở khắp nơi, bướm lượn vườn nhà', 'Người người hớn hở đón xuân', 'Đất trời như cũng, reo vui cùng người.'], tags: ['xuan', 'binh-an'], source: 'sáng tác' },
      { lines: ['Đầu năm, khởi sự hanh thông', 'Việc gì cũng thuận, người người quý thương', 'Một năm mới, một niềm tin', 'Nỗ lực hôm nay, gặt hái ngày mai.'], tags: ['xuan', 'cong-viec', 'khai-xuan'], source: 'sáng tác' },
      { lines: ['Xuân về, hoa nở khắp nơi', 'Người người hạnh phúc, nụ cười trên môi', 'Cầu cho năm mới an khang', 'Vạn sự như ý, một năm thái hoà.'], tags: ['xuan', 'may-man'], source: 'sáng tác' },
      { lines: ['Nắng xuân ấm áp ngoài hiên', 'Chim hót líu lo, báo hiệu mùa sang', 'Một năm mới, một hy vọng', 'Gieo vào đất mới, chờ ngày nở hoa.'], tags: ['xuan', 'khai-xuan'], source: 'sáng tác' },
      { lines: ['Tháng Giêng, ngày hội mùa xuân', 'Trai thanh gái lịch, du xuân khắp miền', 'Một năm mới, một mùa vui', 'Nhớ về cội nguồn, nhớ ơn tổ tiên.'], tags: ['xuan', 'que-nha', 'gia-dinh'], source: 'sáng tác' },
    ],
  },
};

module.exports = { WISHES, POEMS, OCCASIONS };

