
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
 * Quét hóa đơn - Chế độ "Deep Vision" cho Mobile
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  const prompt = `You are a professional accountant for Tokymon restaurant.
  TASK: Extract data from this receipt image. 
  
  GUIDELINES for Mobile Photos:
  - The photo might be blurry or taken at an angle. Look for currency symbols (€, EUR) to find the amount.
  - Date format is likely DD.MM.YYYY (German) or DD/MM/YYYY (Vietnamese). Convert to YYYY-MM-DD.
  - The amount is the 'Total', 'Gesamtbetrag', or the largest number at the bottom.
  - Categories: [${categoriesList}]. Use keywords: 'Miete' -> Tiền nhà, 'Lohn' -> Lương, 'Fleisch/Gemüse' -> Nguyên liệu.
  - Note: Extract the Shop/Vendor name.

  RETURN FORMAT: Strictly JSON. No markdown tags.
  JSON Schema: { amount: number, date: string, category: string, note: string }`;

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
    // Đảm bảo không có rác trong chuỗi JSON
    const sanitized = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(sanitized);
  } catch (error) {
    console.error("AI deep scan failed:", error);
    throw error;
  }
};
