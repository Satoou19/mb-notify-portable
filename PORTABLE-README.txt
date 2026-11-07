MB NOTIFY — BẢN CHẠY GỌN CHO WINDOWS x64

1. Giải nén toàn bộ ZIP vào một thư mục cố định, ví dụ C:\MBNotify.
2. Mở start.cmd. Bản này kèm Node.js, không cần cài Node, Java hay Android SDK.
   Giữ cửa sổ chương trình mở khi sử dụng. Đóng cửa sổ sẽ dừng máy chủ.
3. Nếu trình duyệt chưa mở hoặc mở trước khi server sẵn sàng, truy cập:
   http://localhost:3189
4. Mở mục Ghép nối điện thoại trên trang. Trên app MB Notify Android,
   nhập địa chỉ LAN và mã ghép nối mới của máy này, rồi Lưu kết nối.
   Nếu chưa cài app điện thoại, dùng MB-Notify.apk đi kèm.
5. Điện thoại và máy tính phải cùng mạng LAN/Wi-Fi. Đặt mạng tin cậy của
   Windows là Private. Nếu chưa nhận kết nối, mở PowerShell bằng quyền
   Administrator, chuyển vào thư mục giải nén và chạy:
   powershell -ExecutionPolicy Bypass -File .\portable-firewall.ps1
   Chỉ cần làm khi thiết lập; nếu chuyển thư mục, cần chạy lại quy tắc.
6. Nhấn Gửi thử kết nối trên điện thoại và kiểm tra trạng thái trên trang.

DỮ LIỆU
- Gói này không chứa lịch sử giao dịch hoặc mã ghép nối của máy gốc.
- Lần chạy đầu tự tạo data\config.json (mã riêng) và lưu lịch sử trong data.
- Các tài khoản tự xuất hiện từ thông báo mới, không giới hạn 789 và 999.
- Nếu muốn CHUYỂN HẲN lịch sử và giữ mã cũ, dừng ứng dụng hai máy rồi
  tự chép thư mục data từ máy cũ sang máy mới. data chứa thông tin riêng tư.
- App điện thoại lưu một địa chỉ máy nhận; chuyển sang máy khác cần cập
  nhật địa chỉ. Gói này không bổ sung gửi đồng thời cho nhiều máy tính.

EXCEL
- Chức năng ghi trực tiếp cần Microsoft Excel desktop đã cài trên máy nhận.
- Hiện chương trình kiểm tra tên workbook “FILE CHỐT CA tháng 11 cn1”,
  cùng sheet có C1 là BANK. Có thể dùng Sao chép cột BANK để dán thủ công.

Không cần mang .tools, mã nguồn Android, bộ build hoặc bộ kiểm thử.
Node.js và thông báo giấy phép nằm trong runtime\NODE-LICENSE.txt.

ĐÓNG GÓI LẠI
- Bấm dong-goi.bat; ZIP mới nằm trong thư mục dist cạnh file BAT.
- Giữ package-portable.ps1 cùng thư mục. Cả hai file được kèm trong ZIP.
- Nếu đã có runtime\NODE-LICENSE.txt, đóng gói lại không cần Internet.
- Bản nguồn chỉ có Node cài trên máy sẽ tải giấy phép Node khi đóng gói.
- Luôn đóng gói với lịch sử trống và mã ghép nối mới trên máy nhận.

SAO CHÉP THEO TÀI KHOẢN
- Tab Nhập Excel: chọn Tài khoản cần sao chép / ghi Excel, rồi chọn ngày giờ.
- Cả Sao chép cột BANK, Sao chép 4 cột và Ghi vào Excel dùng bộ lọc này.
- Kiểm tra tài khoản, số giao dịch và tổng tiền phía trên bảng trước khi dùng.

THEO DÕI FNET
- Tab FNet · máy trạm đọc bảng Tên máy / Tình trạng mỗi 5 giây.
- Cần FNet Server 32-bit đang chạy trên cùng máy Windows, với danh sách máy.
  Nếu khác quyền chạy (ví dụ FNet chạy Administrator), mở MB Notify cùng quyền.
- Bộ đọc được kiểm tra với FNet 2.1.2 trên máy hiện tại. Phiên bản thay đổi
  cấu trúc bảng có thể cần cập nhật bộ đọc. Không cần nhập mật khẩu FNet.
- Hiện thông tin người dùng, bắt đầu, đã dùng, còn lại, số tiền, IP, nhóm máy.
  Bấm tên máy để xem ghi chú, COMBO, ngày và phiên bản nếu FNet cung cấp.
- Dòng đỏ: FNet báo Mất kết nối. Đây là dấu hiệu, không chứng minh máy đã tắt;
  lỗi mạng cũng có thể làm mất kết nối.
- Cảnh báo sau 2 lần đọc liên tiếp khi máy chuyển sang Mất kết nối. Lần đầu
  chỉ ghi nhận hiện trạng, không báo dồn các máy vốn đã mất kết nối.
- Bật âm thanh / thông báo máy tính trên trang để có cảnh báo ngoài bảng.
  Giữ trang mở. Có nút Đã xem cho mỗi cảnh báo; lưu 100 cảnh báo gần nhất
  trong data\fnet-alerts.json. Bản Portable mới không kèm lịch sử này.
- Nếu nguồn FNet bị gián đoạn, giữ bảng cũ và báo không đọc được; không báo
  tất cả máy đã tắt. Sau khi khởi động lại MB Notify sẽ lấy hiện trạng mới.
- Tính năng chỉ đọc bảng máy, không gửi lệnh tắt / mở / khóa máy.
GẮN FLAG MÁY CHƯA TRẢ TIỀN
- Tab FNet > Máy chưa trả tiền: chọn máy, nhập số tiền nguyên đồng, ghi chú,
  bấm Lưu / cập nhật. Số tiền là dư nợ do bạn nhập, độc lập tiền FNet tính.
- Chỉnh sửa để thay tổng số tiền còn nợ; không tự cộng dồn. Nếu khách trả một
  phần, nhập số còn lại. Đã trả hết · bỏ flag sẽ xóa ghi nợ của máy đó.
- Flag giữ theo tên máy, kể cả khi khách thay đổi hoặc máy mất kết nối;
  bạn cần chủ động bỏ flag khi thu đủ tiền.
- Khi máy đang sử dụng có Còn lại <= 30 phút, tạo cảnh báo kèm số tiền.
  Nếu đã dưới ngưỡng lúc gắn flag, nhắc ở lần đọc tiếp theo. Mỗi phiên / lần
  xuống ngưỡng chỉ nhắc một lần; thêm giờ trên 30 phút sẽ cho phép nhắc lại.
- Máy có flag mất kết nối qua hai lần đọc tạo cảnh báo kèm tiền còn nợ,
  kể cả nếu gắn flag lúc máy đã mất kết nối. Không báo lặp khi vẫn offline.
- Ghi nợ và trạng thái đã nhắc lưu trong data\fnet-debts.json; đóng mở lại
  ứng dụng vẫn giữ. Bản đóng gói gửi sang máy khác không chứa dữ liệu này.
- Cần giữ trang mở, bật âm thanh / thông báo máy tính để nhận cảnh báo ngoài
  bảng. Mất kết nối có thể là tắt máy hoặc lỗi mạng; hệ thống không phân biệt.

CẬP NHẬT PHẠM VI CẢNH BÁO FNET
- Chỉ máy đang có flag chưa trả tiền mới tạo cảnh báo, âm thanh và thông báo.
- Máy không có flag hoặc đã bỏ flag chỉ hiển thị trạng thái trong bảng.
- dong-goi.bat vẫn kèm đầy đủ FNet và tính năng ghi nợ trong ZIP mới.

CHON TAI KHOAN NHAN CANH BAO MB BANK
- Nhan Ctrl+F5 tren trang dang mo sau khi cap nhat.
- O muc "Nhan am thanh / thong bao MB Bank cho quan co tai khoan", chon dung TK cua quan nay. Co the chon the tai khoan trong tab MB Bank; hai lua chon dong bo nhau.
- Am thanh va thong bao desktop MB Bank chi phat cho TK dang chon. Van can bam Bat am thanh / Bat thong bao may tinh nhu truoc.
- Chon Tat ca hoac Chua xac dinh: chi xem lich su, khong phat canh bao MB Bank. Thong bao thieu TK hoac ban thu khong phat canh bao.
- Lua chon duoc nho rieng tren trinh duyet/may tinh, dong bo giua cac tab cung trinh duyet. TK moi khong tu duoc chon de tranh bao nham quan.
- Loc canh bao ap dung ca khi nhan truc tiep va khi lay du lieu du phong. Khong thay doi bo loc xuat Excel. Canh bao may FNet tiep tuc hoat dong nhu truoc.
- Khong can cai lai APK.
CHAY NEN - KHONG GIU TERMINAL TREN TASKBAR
- Nhan dup start.vbs de mo MB Notify hoan toan khong hien terminal.
- start.cmd cung chuyen sang chay nen va tu dong dong cua so lenh (co the nhay nhanh luc mo).
- Nhan dup stop.vbs hoac stop.cmd de dung server cua dung thu muc project nay.
- Dong trang web khong dung server. Mo lai start.vbs neu muon quay lai trang.
- Nhat ky tai logs\server.log va logs\server-error.log. Loi khoi dong tai logs\launcher-error.txt.
- Khi chuyen project sang quan khac, chep ca start.vbs, stop.vbs va background.ps1. Chuc nang dong-goi da bao gom cac file nay.
THEO DOI MAY GAN FLAG O MOI TAB
- Thanh May can thu nam phia tren, giu tren man hinh khi cuon trang; khong can vao tab FNet de xem may da flag.
- Hien tong tien chua thu, so may va the tung may: tien no, con lai, trang thai, ghi chu. May mat ket noi xep truoc (do), may con <=30 phut tiep theo (vang).
- Bam the may de chinh sua hoac xac nhan Da thu du / bo flag. Nut + Gan flag cho phep them truc tiep, khong chuyen tab.
- Co the Thu gon / Mo danh sach; trinh duyet nho lua chon nay. Khi thu gon van thay tong no va so may can chu y.
- Khi du lieu FNet cu/mat nguon, the chuyen xam va ghi du lieu cu, khong suy dien rang tat ca may da tat.
- Cap nhat moi 5 giay nhu truoc. Neu dang nhap ghi chu/tien trong hop thoai, cap nhat khong xoa noi dung dang nhap.
- Nhan Ctrl+F5 de tai giao dien moi. Khong can cai lai APK.
DON VI NHAP TIEN FNET
- Ca form FNet va hop nhap nhanh deu nhap theo nghin dong: 50 = 50.000d, 15.5 = 15.500d.
- Cac khoan no cu giu nguyen gia tri; khi mo sua, 50.000d se hien 50 trong o nhap.
- Tong no, the may va canh bao van hien day du so tien theo dong.
LOG CHAN DOAN VA TEN TAI KHOAN FNET
- logs\diagnostic-YYYY-MM-DD.jsonl: log theo ngay Viet Nam, thoi gian UTC va UTC+7, PID, khoi dong/thoat/loi, trang thai ket noi dien thoai/FNet, loi HTTP/giao dien, thao tac gan/sua/bo flag.
- logs\launcher-events.jsonl: lich su bam mo/dung server va loi khoi dong; giu lai qua cac lan mo app.
- logs\session.json: PID va lan ghi nhan song gan nhat (moi 60 giay). Lan mo sau danh dau previous_session_unclean neu phien truoc khong ghi duoc su kien thoat. Day la dau hieu, khong khang dinh nguyen nhan.
- Log diagnostic tu xoay khi qua 5 MB, giu toi da 3 ban xoay moi ngay; don file diagnostic cu qua 14 ngay khi khoi dong. Khong ghi token/mat khau hoac toan noi dung thong bao ngan hang. Thao tac flag co ghi ten may va so tien de doi chieu.
- Mat dien, tat may hoac bi he thong ket thuc dot ngot co the khong kip ghi loi cuoi. Doi chieu lan process_alive cuoi va launcher-events, co the can them Windows Event Viewer.
- Khi co loi, giu thu muc logs de kiem tra; khong can xoa data hay cai lai APK.
- Danh sach chon may trong ca 2 form flag hien MAYxx + ten tai khoan FNet. The flag hien ten TK rieng, chu dam de nhin, khong bi ghi chu che mat. Neu thieu TK hien tai, ten luc ghi no duoc ghi ro la TK luc ghi no.