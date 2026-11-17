# Chạy website có GPT-6 Luna

Website dùng HTML5, CSS3, JavaScript thuần ở giao diện và Node.js ở máy chủ nhỏ để giữ kín API key. Không cần cài thêm thư viện npm.

## Cấu hình một lần

1. Cài Node.js 20 trở lên.
2. Trong VS Code, mở Terminal tại thư mục `ielts-personal`.
3. Sao chép `.env.example` thành một tệp mới tên `.env`.
4. Mở `.env`, thay `your_api_key_here` bằng API key của bạn:

   ```env
   OPENAI_API_KEY=your_real_key_here
   OPENAI_MODEL=gpt-6-luna
   PORT=3000
   ```

5. Chạy `npm start` trong Terminal.
6. Mở `http://localhost:3000`.

Nếu thay đổi `.env` khi máy chủ đang chạy, dừng máy chủ bằng `Ctrl+C` rồi chạy lại `npm start`.

## Website gửi dữ liệu nào tới AI?

- Sau buổi học: kỹ năng, điểm, đáp án, câu trả lời Writing/Speaking và tối đa 12 buổi gần nhất.
- Bài kiểm tra tháng: đề, câu trả lời bốn kỹ năng và các buổi học trong tháng.

Lịch học và điểm ưu tiên lưu trong trình duyệt. Từ lần đánh giá đầu tiên, GPT-6 Luna đề xuất ưu tiên từng kỹ năng; lịch kế tiếp vẫn giữ ít nhất một buổi cho mỗi kỹ năng và phân bổ thêm buổi cho kỹ năng cần cải thiện.

Tệp `.env` đã được loại khỏi Git bằng `.gitignore`. Không đưa API key vào `index.html`, `js/app.js`, ảnh chụp màn hình hay kho Git. Không gửi key qua chat.

## Lưu ý chi phí

API sử dụng GPT-6 Luna được tính phí riêng theo mức dùng, tách biệt với gói ChatGPT. Chỉ các lần đánh giá buổi học và bài kiểm tra tháng mới gọi API.
