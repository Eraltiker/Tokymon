
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
 * Quét hóa đơn - Sử dụng Ultimate Vision Logic
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const categoriesList = EXPENSE_CATEGORIES.join(', ');
  const currentDate = new Date().toISOString().split('T')[0];
  
  const prompt = `ACT AS EXPERT FINANCIAL OCR.
  TASK: Extract data from the receipt image.
  
  STRICT RULES:
  1. amount: The FINAL TOTAL / SUMME BRUTTO. (Number only)
  2. date: Format YYYY-MM-DD. If fuzzy, use "${currentDate}".
  3. category: Pick from [${categoriesList}]. Default to "Chi phí khác".
  4. note: Vendor name.

  JSON FORMAT REQUIRED.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Attempt 1: Structured JSON output
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
    if (text) return JSON.parse(text);

    // Attempt 2: Regex Fallback (if JSON structure fails)
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: "List the total amount, date (YYYY-MM-DD), category, and shop name from this receipt. Just the facts." }
        ]
      }
    });

    const rawText = fallbackResponse.text || "";
    const amountMatch = rawText.match(/(\d+[.,]\d{2})/);
    const dateMatch = rawText.match(/(\d{4}-\d{2}-\d{2})/);
    
    return {
      amount: amountMatch ? parseFloat(amountMatch[0].replace(',', '.')) : 0,
      date: dateMatch ? dateMatch[0] : currentDate,
      category: "Chi phí khác",
      note: "Auto-extracted"
    };

  } catch (error: any) {
    console.error("Ultimate Vision Error:", error);
    throw error;
  }
};
