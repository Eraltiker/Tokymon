
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
  
  // Prompt cực kỳ tinh gọn để AI không bị nhầm lẫn
  const prompt = `OCR TASK: Extract financial data from receipt.
  
  MANDATORY JSON FIELDS:
  1. amount: Number. The TOTAL/SUMME amount to pay.
  2. date: String. YYYY-MM-DD format. Default to "${currentDate}" if not clear.
  3. category: String. Choose from: [${categoriesList}]. Default to "Chi phí khác".
  4. note: String. Vendor/Store name.

  RETURN ONLY VALID JSON.`;

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Sử dụng model Flash 3 để xử lý nhanh và ổn định nhất
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
    if (text) {
      const result = JSON.parse(text);
      // Clean up date if AI returns something weird
      if (result.date && !/^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
         result.date = currentDate;
      }
      return result;
    }

    // Fallback: Nếu JSON schema thất bại
    const fallbackResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: "What is the total amount and shop name on this receipt? Format: Amount|Shop" }
        ]
      }
    });

    const rawText = fallbackResponse.text || "";
    const parts = rawText.split('|');
    const amountMatch = parts[0]?.match(/(\d+[.,]\d{2})|(\d+)/);
    
    return {
      amount: amountMatch ? parseFloat(amountMatch[0].replace(',', '.')) : 0,
      date: currentDate,
      category: "Chi phí khác",
      note: parts[1]?.trim() || "Auto-extracted"
    };

  } catch (error: any) {
    console.error("Vision Scan Error:", error);
    throw error;
  }
};
