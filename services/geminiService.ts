
import { GoogleGenAI, Type } from "@google/genai";
import { Language, EXPENSE_CATEGORIES } from "../types";

/**
 * Phân tích dữ liệu tài chính bằng Gemini 3 Flash
 */
export const analyzeFinances = async (stats: any, lang: Language = 'vi'): Promise<string> => {
  const { totalIn, totalOut, profit, margin, totalDebt } = stats;
  
  const prompt = `Analyze finances for Tokymon restaurant in ${lang === 'vi' ? 'Vietnamese' : 'German'}:
    - Revenue: ${totalIn} EUR
    - Expenses: ${totalOut} EUR
    - Profit: ${profit} EUR (${(margin * 100).toFixed(1)}%)
    - Debt: ${totalDebt} EUR
    Provide 3 concise strategic remarks. Markdown format.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt
    });
    return response.text || "No analysis available.";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "Analysis service unavailable.";
  }
};

/**
 * Quét hóa đơn - Sử dụng Gemini 3 Flash với cấu hình tối ưu nhất cho Mobile OCR
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  
  // Prompt được tinh chỉnh để tập trung vào trích xuất dữ liệu thô (Raw OCR)
  const prompt = `ACT AS OCR EXPERT. EXTRACT RAW DATA FROM THIS RECEIPT IMAGE.
  
  RULES:
  1. amount: Find the FINAL TOTAL/TOTAL BRUTTO. (Number only)
  2. date: Find the date of purchase (Format: YYYY-MM-DD).
  3. category: Map to one of: [${categoriesList}].
  4. note: Extract the shop/vendor name clearly.

  JSON OUTPUT ONLY:
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

    const text = response.text;
    if (!text) throw new Error("AI returned empty response");
    
    return JSON.parse(text);
  } catch (error: any) {
    console.error("Gemini Scan Error:", error);
    throw error;
  }
};
