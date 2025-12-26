
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Language, EXPENSE_CATEGORIES } from "../types";

/**
 * Phân tích dữ liệu tài chính chuyên sâu bằng Gemini AI
 */
export const analyzeFinances = async (stats: any, lang: Language = 'vi'): Promise<string> => {
  const { totalIn, totalOut, profit, margin, topCategories, breakdown, totalDebt } = stats;
  
  const prompt = `
    Bạn là một chuyên gia tư vấn tài chính (CFO) giàu kinh nghiệm cho chuỗi nhà hàng "Tokymon".
    Hãy phân tích dữ liệu kinh doanh sau đây và đưa ra nhận xét, lời khuyên chiến lược bằng ${lang === 'vi' ? 'tiếng Việt' : 'tiếng Đức'}.

    Dữ liệu kinh doanh:
    - Tổng doanh thu: ${totalIn} EUR (Trong đó: Tiền mặt ${breakdown.cashIn} EUR, Thẻ ${breakdown.cardIn} EUR, Delivery ${breakdown.appIn} EUR)
    - Tổng chi phí: ${totalOut} EUR
    - Lợi nhuận ròng: ${profit} EUR
    - Tỷ suất lợi nhuận: ${(margin * 100).toFixed(2)}%
    - Tổng công nợ hiện tại: ${totalDebt} EUR
    - Top 3 hạng mục chi phí lớn nhất: ${topCategories.slice(0, 3).map((c: any) => `${c.name} (${c.value} EUR)`).join(', ')}

    Yêu cầu bản phân tích:
    1. Nhận xét ngắn gọn về sức khỏe tài chính.
    2. Chỉ ra điểm bất thường hoặc cần tối ưu (nếu có).
    3. Đưa ra 3 lời khuyên cụ thể để tăng lợi nhuận hoặc tối ưu dòng tiền.
    
    Phong cách: Chuyên nghiệp, súc tích, đi thẳng vào vấn đề. Sử dụng Markdown để trình bày.
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 0 } // Tối ưu tốc độ phản hồi
      }
    });
    return response.text || "Không thể khởi tạo bản phân tích.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'vi' ? "Lỗi kết nối với AI. Vui lòng thử lại sau." : "Fehler bei der KI-Verbindung. Bitte versuchen Sie es später erneut.";
  }
};

/**
 * Quét hóa đơn bằng Gemini 3 Vision - Tối ưu hóa tốc độ và độ chính xác trích xuất
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  // Prompt được thiết kế cực kỳ ngắn gọn để AI xử lý nhanh nhất
  const prompt = `Trích xuất dữ liệu từ hóa đơn này vào JSON:
  - amount: Số tiền cuối cùng phải trả (Tổng cộng/Summe/Total).
  - date: Ngày giao dịch (YYYY-MM-DD). Nếu không thấy, dùng ngày hiện tại.
  - category: Chọn 1 mục phù hợp nhất từ: [${EXPENSE_CATEGORIES.join(', ')}].
  - note: Tên cửa hàng/Nhà cung cấp (ví dụ: Metro, Edeka, Netto, v.v.).

  Ưu tiên độ chính xác của số tiền và tên cửa hàng.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }, // QUAN TRỌNG: Tắt thinking để đạt tốc độ nhanh nhất
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Total final amount" },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            category: { type: Type.STRING, description: "Matching category from list" },
            note: { type: Type.STRING, description: "Store or Vendor name" }
          },
          required: ["amount", "date", "category", "note"]
        }
      }
    });

    // Trả về dữ liệu đã được parse, nếu lỗi trả về object rỗng
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
