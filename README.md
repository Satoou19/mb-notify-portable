# MB Notify Portable

Ứng dụng Windows và Android để chuyển thông báo MB Bank từ điện thoại lên máy tính, theo dõi máy FNet còn nợ và hỗ trợ nhập cột BANK vào Excel.

## Cài bản phát hành

1. Tải và giải nén `MB-Notify-Portable-v1.3.0-win-x64.zip` trong mục Releases.
2. Chạy `start.vbs` để mở trang quản lý; server chạy nền. Chạy `stop.vbs` để dừng.
3. Cài `MB-Notify.apk` lên Android, nhập địa chỉ LAN/mã ghép nối được hiển thị trên máy tính, cấp quyền đọc thông báo.
4. Chọn đúng tài khoản nhận cảnh báo của quán, bật âm thanh và thông báo trình duyệt khi cần.

Hai thiết bị cần cùng mạng nội bộ tin cậy. Phần chuyển tiếp hiện dùng HTTP. Trang quản lý chỉ mở trên localhost của máy tính. Khi cần nhận kết nối từ điện thoại, chạy `portable-firewall.ps1` bằng quyền Administrator trên mạng Private hoặc cấu hình quy tắc LAN tương ứng. APK Android 1.2 được giữ trong release desktop 1.3.0.

## Chức năng

- Nhận/lưu thông báo MB Bank, trực tiếp qua SSE và dự phòng lấy dữ liệu mỗi 5 giây.
- Chỉ phát cảnh báo MB Bank cho tài khoản được chọn. Tách bản thử khỏi thông báo thật.
- Tab nhập Excel: bộ lọc tài khoản, ngày, ca 07:00–19:00; sắp từ sớm đến muộn. Ghi BANK từ C2 theo nghìn đồng sau khi xem trước.
- Theo dõi FNet, gắn flag tiền chưa thu, cảnh báo còn ≤30 phút hoặc mất kết nối.
- Thanh “Máy cần thu” ở mọi tab; tên tài khoản đang chơi hiển thị rõ; nhập 50 tương ứng 50.000đ.
- Chạy nền, log chẩn đoán theo ngày, theo dõi kết nối và phiên chạy kết thúc bất thường.
- Android có công tắc bật/tắt. Tắt sẽ xóa hàng đợi và không thu nhận thông báo; bật lại chỉ nhận thông báo mới.

Để phát âm thanh/thông báo, cần giữ trang quản lý mở. Chạy nền server không tự tạo cảnh báo khi trình duyệt đã đóng. Dữ liệu thông báo không phải xác nhận giao dịch từ API ngân hàng; kiểm tra đủ dữ liệu ca trước khi thay cột BANK.

## Phát triển

- Windows x64, Node.js 26.13.0 (runtime của bản phát hành), Windows PowerShell 5.1.
- Excel desktop để ghi BANK; FNet Server 32-bit để đọc danh sách máy.
- Server không cần dependency npm khi chạy. Dùng `node launch.js` nếu Node đã cài.
- Kiểm thử: `npm ci`, `npm test`, `npm run test:ui`. Kiểm thử giao diện dùng Chrome cài tại `C:\Program Files\Google\Chrome\Application\chrome.exe`.
- Build bộ đọc FNet: `powershell -ExecutionPolicy Bypass -File build-fnet-reader.ps1`.
- Mã Android nằm trong `android/`. Mở bằng Android Studio, dùng JDK 17 / SDK 35 / Gradle 8.11.1 / AGP 8.9.1. Không đưa khóa ký lên Git.
- Chuẩn bị Node portable: `powershell -ExecutionPolicy Bypass -File prepare-runtime.ps1`.
- Đóng gói: `powershell -ExecutionPolicy Bypass -File package-portable.ps1`.

Chưa có kiểm thử ghi thật vào workbook của người dùng hay kiểm thử thiết bị Android đầy đủ. Kiểm thử UI dùng dữ liệu mô phỏng, không thay đổi tiền nợ/giao dịch thật.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `server.js`, `launch.js` | API nội bộ và khởi động |
| `public/` | Giao diện MB Bank, Excel, FNet |
| `fnet.js`, `FNetReader.cs` | Đọc FNet và quản lý flag |
| `excel.js`, `excel-bridge.ps1` | Xem trước/ghi Excel |
| `diagnostics.js`, `logs/` | Chẩn đoán (log được bỏ qua khi commit) |
| `android/` | Mã nguồn app Android |
| `tests/` | Kiểm thử với dữ liệu độc lập |

## Dữ liệu và bảo mật

`data/` chứa mã ghép nối, lịch sử giao dịch, flag và ghi chú tại quán. `data/`, `logs/`, khóa ký, cấu hình Android cục bộ và runtime Node không được đưa vào Git. Gói Portable tạo mới không kèm dữ liệu/mã ghép nối. Xem `PORTABLE-README.txt` để biết hướng dẫn vận hành chi tiết.

Không liên kết hoặc được bảo trợ bởi MB Bank hay FNet. Node.js được phân phối theo giấy phép trong `runtime/NODE-LICENSE.txt`. Repository chưa cấp giấy phép sử dụng lại mã nguồn cho bên thứ ba.
