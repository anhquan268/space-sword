# Sword Meteor Runner

Phiên bản đã sửa quỹ đạo đạn kiếm và nâng cấp giao diện.

## Thay đổi chính

- Kiếm bay theo một vector thẳng, không có trọng lực, homing hay cập nhật góc xoay.
- Quaternion của viên đạn được tính đúng một lần lúc khai hỏa và được khóa suốt chuyến bay.
- Mũi kiếm được căn theo trục tiến `-Z`, tránh lỗi đảo đầu do công thức `atan2` cũ.
- Va chạm dùng đoạn thẳng giữa hai khung hình, hạn chế xuyên mục tiêu khi FPS thấp.
- Giao diện, HUD, hiệu ứng va chạm, sao nền và khả năng hiển thị trên điện thoại đã được nâng cấp.
- Có mô hình dựng sẵn làm dự phòng nếu các tệp `.glb` chưa được chép vào thư mục `models`.

## Cấu trúc

```text
sword-meteor-runner/
├── index.html
├── README.md
├── models/
│   ├── character_1.glb   (tùy chọn)
│   ├── sword_1.glb       (tùy chọn)
│   └── meteor.glb        (tùy chọn)
└── src/
    ├── main.js
    └── style.css
```

## Chạy dự án

Do trình duyệt chặn ES module khi mở trực tiếp bằng `file://`, hãy chạy một web server cục bộ:

```bash
python -m http.server 8000
```

Sau đó mở `http://localhost:8000/sword-meteor-runner/`.

Trang dùng Three.js từ CDN. Nếu dự án của bạn đã dùng Vite/npm, có thể giữ `src/main.js` và thay import map bằng package `three` tương ứng.
