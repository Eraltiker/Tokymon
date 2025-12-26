
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
 * Quét hóa đơn - Tối ưu cho tốc độ và khả năng đọc ảnh mờ
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const prompt = `Act as an expert financial OCR auditor. 
  The image provided might be slightly blurry or from a mobile camera. 
  Carefully analyze the image and extract:
  1. amount (number): The absolute final total to pay.
  2. date (string): Format YYYY-MM-DD.
  3. category (string): Choose the most accurate from this list: [${EXPENSE_CATEGORIES.join(', ')}].
  4. note (string): The merchant/shop name.
  
  Critical Logic:
  - If text is blurry, look for patterns (e.g., numbers followed by 'EUR' or '€').
  - The 'amount' is usually the largest number on the bottom of a receipt.
  - If unsure about a digit, use the context of surrounding items to infer the value.
  
  Return ONLY the JSON object. No extra text.`;

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
    console.error("AI Scan Error:", error);
    throw error;
  }
};
