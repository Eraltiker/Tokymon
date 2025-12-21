
# TOKYMON Finance Manager 🍱

Ứng dụng quản lý tài chính (Doanh thu/Chi phí) chuyên nghiệp cho nhà hàng Tokymon. Tích hợp AI để quét hóa đơn và phân tích tài chính.

## 🌟 Tính năng chính
- **Quản lý đa chi nhánh**: Phân quyền Super Admin, Admin, Manager, Viewer.
- **AI Scanning**: Tự động trích xuất thông tin hóa đơn từ ảnh chụp (Sử dụng Gemini AI).
- **Phân tích tài chính**: Biểu đồ trực quan về doanh thu, lợi nhuận và dòng tiền thực tế.
- **Quản lý nợ**: Theo dõi các khoản nợ nhà cung cấp chưa thanh toán.
- **Dark Mode**: Giao diện tối ưu cho thiết bị di động.

## 🛠 Công nghệ sử dụng
- **Frontend**: React 19, TypeScript, Vite.
- **Styling**: Tailwind CSS.
- **AI**: Google Gemini API (@google/genai).
- **Charts**: Recharts.
- **Export**: SheetJS (XLSX).

## 🚀 Cách cài đặt để chạy máy cá nhân (Local)

1. **Clone repository**:
   ```bash
   git clone https://github.com/user-name/tokymon-finance.git
   cd tokymon-finance
   ```

2. **Cài đặt thư viện**:
   ```bash
   npm install
   ```

3. **Cấu hình môi trường**:
   Tạo file `.env` ở thư mục gốc và thêm key của bạn:
   ```env
   VITE_API_KEY=your_gemini_api_key_here
   ```
   *(Lưu ý: Trong code local, bạn cần đổi process.env.API_KEY thành import.meta.env.VITE_API_KEY hoặc thiết lập biến môi trường tương ứng)*.

4. **Chạy ứng dụng**:
   ```bash
   npm run dev
   ```

## 🌐 Triển khai lên Vercel

1. Kết nối tài khoản GitHub của bạn với [Vercel](https://vercel.com).
2. Chọn Repository này.
3. Trong phần **Environment Variables**, thêm `API_KEY` với mã bí mật từ Google AI Studio.
4. Nhấn **Deploy**.

---
*Phát triển bởi Tokymon Team.*
