# Changelog

## v1.3.0 — 2026-11-07

- Bản Portable Windows x64 kèm Node.js, APK Android 1.2 và bộ đọc FNet.
- Chạy server nền với `start.vbs` / `stop.vbs`.
- Cảnh báo MB Bank theo tài khoản; lựa chọn được lưu trên trình duyệt.
- Theo dõi máy FNet gắn flag ở mọi tab; hiển thị tài khoản đang chơi cạnh tên máy và trên thẻ.
- Thao tác thêm/sửa/xác nhận đã thu tiền ngay trên thanh theo dõi.
- Ô nhập tiền FNet dùng nghìn đồng: 50 = 50.000đ.
- Ghi log kết nối, phiên chạy, lỗi server/giao diện và thao tác flag; che thông tin xác thực.
- Bộ lọc nhập Excel theo tài khoản và ca, sao chép BANK hoặc xem trước/ghi từ C2.
- Bổ sung kiểm thử log và giao diện bằng dữ liệu độc lập.

### Giới hạn đã biết

- Cần mở trang trình duyệt để phát âm thanh/thông báo máy tính.
- Chỉ lưu tối đa 1.000 thông báo ngân hàng và 100 bản thử; chưa phải kho lưu trữ lâu dài.
- Kết nối Android dùng HTTP nội bộ. App hiện cấu hình một máy tính đích.
- Chống trùng theo ID thông báo; không đảm bảo phân biệt mọi trường hợp ngân hàng phát lại giao dịch.
- File Excel đích hiện cấu hình theo tên trong `excel.js`; cần thay cho quán/tháng khác.
- APK debug để cài trực tiếp; mã nguồn không chứa khóa ký của máy build ban đầu.
