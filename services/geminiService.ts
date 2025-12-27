
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
      // Removed invalid thinkingBudget: 0
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Analysis service unavailable.";
  }
};

/**
 * Quét hóa đơn - Sử dụng Gemini 3 Pro cho độ chính xác cao nhất
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  const prompt = `You are an expert accountant specializing in the gastronomy industry (Tokymon Restaurant).
  
  TASK: Extract accounting data from this receipt image.
  
  CONTEXT: The image might be in German or Vietnamese. Receipts are usually from suppliers (Lidl, Metro, Selgros) or utilities.
  
  DATA FIELDS TO EXTRACT:
  1. amount: The absolute total sum (Brutto/Total). Must be a number.
  2. date: The transaction date in YYYY-MM-DD format.
  3. category: Choose the best fit from: [${categoriesList}].
  4. note: Concise vendor name and main items purchased.

  RESPONSE FORMAT: Strictly return valid JSON only.
  { "amount": number, "date": "string", "category": "string", "note": "string" }`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        // Removed invalid thinkingBudget: 0. Gemini 3 Pro requires thinking mode.
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Total amount on the receipt" },
            date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
            category: { type: Type.STRING, description: "One of the predefined categories" },
            note: { type: Type.STRING, description: "Vendor and summary" }
          },
          required: ["amount", "date", "category", "note"]
        }
      }
    });

    const text = response.text || "{}";
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini 3 Pro Scan Error:", error);
    throw error;
  }
};
