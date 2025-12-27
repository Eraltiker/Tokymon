
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
 * Quét hóa đơn - Tối ưu cho hóa đơn tiếng Đức và ảnh iPhone
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const prompt = `Act as an expert OCR auditor for a restaurant's bookkeeping. 
  Extract from the receipt image:
  1. amount (number): Find the 'Gesamtbetrag', 'Summe', 'Total', or the largest amount at the bottom.
  2. date (string): Format YYYY-MM-DD. Look for DD.MM.YYYY patterns common in Germany/Vietnam.
  3. category (string): Choose one from: [${EXPENSE_CATEGORIES.join(', ')}].
  4. note (string): The vendor name at the header of the receipt.
  
  Important Logic for iPhone photos:
  - If the image is blurry, look for the '€' symbol or 'EUR' to find amounts.
  - For categories like 'Nguyên liệu', look for food items (Fleisch, Gemüse, etc.).
  - For 'Lương', look for names or 'Quittung'.
  
  Return ONLY a raw JSON object. Do not include markdown blocks or code formatting.`;

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
    const sanitizedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(sanitizedText);
  } catch (error) {
    console.error("AI Scan Error:", error);
    throw error;
  }
};
