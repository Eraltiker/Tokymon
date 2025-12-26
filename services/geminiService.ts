
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
    2. Chỉ ra điểm bất thường hoặc cần tối ưu (nếu có, ví dụ chi phí nguyên liệu quá cao hoặc nợ nhiều).
    3. Đưa ra 3 lời khuyên cụ thể để tăng lợi nhuận hoặc tối ưu dòng tiền.
    
    Phong cách: Chuyên nghiệp, súc tích, đi thẳng vào vấn đề. Sử dụng Markdown để trình bày (bullet points).
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Không thể khởi tạo bản phân tích.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return lang === 'vi' ? "Lỗi kết nối với AI. Vui lòng thử lại sau." : "Fehler bei der KI-Verbindung. Bitte versuchen Sie es später erneut.";
  }
};

/**
 * Scan a receipt image using Gemini 3 vision capabilities
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const prompt = `Bạn là một trợ lý kế toán cho nhà hàng Tokymon. Hãy phân tích ảnh hóa đơn này.
  Trích xuất các thông tin sau vào JSON:
  - amount: tổng số tiền phải thanh toán (chỉ lấy số)
  - date: ngày trên hóa đơn (định dạng YYYY-MM-DD)
  - category: chọn danh mục phù hợp nhất từ danh sách này: [${EXPENSE_CATEGORIES.join(', ')}]
  - note: tên nhà cung cấp hoặc nội dung ngắn gọn (ví dụ: "Metro", "Edeka", "Lương tháng 5")
  
  Lưu ý: Nếu hóa đơn bằng tiếng Đức, hãy hiểu các từ như 'Summe', 'Gesamtbetrag' là tổng tiền. Nếu không tìm thấy ngày, hãy lấy ngày hôm nay.`;

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
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Total amount on the receipt" },
            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
            category: { type: Type.STRING, description: "The most appropriate category from the provided list" },
            note: { type: Type.STRING, description: "Brief vendor or item note" }
          },
          required: ["amount", "date", "category", "note"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
