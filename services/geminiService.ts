
import { GoogleGenAI, Type } from "@google/genai";
import { Language, EXPENSE_CATEGORIES } from "../types";

/**
 * Phân tích dữ liệu tài chính bằng Gemini 3 Flash
 */
export const analyzeFinances = async (stats: any, lang: Language = 'vi'): Promise<string> => {
  const { totalIn, totalOut, profit, margin, totalDebt } = stats;
  
  const prompt = `Phân tích tài chính nhà hàng Tokymon (${lang}):
    - Doanh thu: ${totalIn} EUR
    - Chi phí: ${totalOut} EUR
    - Lợi nhuận: ${profit} EUR (${(margin * 100).toFixed(1)}%)
    - Công nợ: ${totalDebt} EUR
    Hãy đưa ra 3 nhận xét chiến lược cực kỳ súc tích. Định dạng Markdown.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { thinkingConfig: { thinkingBudget: 0 } }
    });
    return response.text || "No analysis available.";
  } catch (error) {
    return "Analysis service unavailable.";
  }
};

/**
 * Quét hóa đơn - Cấu hình tối ưu cho OCR Mobile
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  const prompt = `Bạn là một chuyên gia kế toán của nhà hàng Tokymon. Hãy trích xuất thông tin từ ảnh hóa đơn này:
  1. amount (number): Tìm tổng số tiền (Gesamtbetrag, Summe, Total, EUR, €). Chỉ lấy con số.
  2. date (string): Định dạng YYYY-MM-DD. Nếu không thấy, lấy ngày hiện tại.
  3. category (string): Phân loại vào MỘT TRONG các danh mục sau: [${categoriesList}].
  4. note (string): Tên nhà cung cấp hoặc nội dung tóm tắt ngắn gọn.
  
  Lưu ý: Hóa đơn thường bằng tiếng Đức hoặc tiếng Việt. 
  Nếu thấy "Fleisch", "Gemüse", "Asiamarkt" -> Nguyên liệu.
  Nếu thấy "Miete", "Strom" -> Tiền nhà / Điện.
  Trả về duy nhất định dạng JSON.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 }, 
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER },
            date: { type: Type.STRING },
            category: { type: Type.STRING },
            note: { type: Type.STRING }
          },
          required: ["amount", "date", "category", "note"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error) {
    console.error("AI OCR Error:", error);
    throw error;
  }
};
