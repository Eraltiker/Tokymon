
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
    console.error("Analysis Error:", error);
    return "Analysis service unavailable.";
  }
};

/**
 * Quét hóa đơn - Chế độ "Deep Vision" tối ưu cho WebKit/Brave
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  const prompt = `You are a professional accountant for Tokymon restaurant.
  TASK: Extract data from this receipt image. 
  
  CONTEXT: The photo is from a mobile device (iOS Brave/Safari). 
  GUIDELINES:
  - Find the amount (Total, Summe, Gesamtbetrag).
  - Date: Convert to YYYY-MM-DD. (German receipts often use DD.MM.YYYY).
  - Categories: Pick ONLY from [${categoriesList}].
  - Note: Shop/Vendor name and brief item description.

  RETURN: Strictly JSON. No markdown.
  { "amount": number, "date": "string", "category": "string", "note": "string" }`;

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
    const sanitized = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(sanitized);
  } catch (error: any) {
    console.error("AI Scan Error:", error);
    // Xử lý lỗi đặc thù của Brave/Safari khi mất kết nối hoặc bị chặn
    if (error.message?.includes('fetch') || error.message?.includes('origin')) {
      throw new Error("Network blocked. Please disable Brave Shields or check your connection.");
    }
    throw error;
  }
};
