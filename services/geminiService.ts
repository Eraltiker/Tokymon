
import { GoogleGenAI } from "@google/genai";
import { Language } from "../types";

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
    Provide 3 concise strategic remarks. Use markdown. Focus on profitability and cash flow.`;

  try {
    // Khởi tạo instance mới mỗi khi gọi để đảm bảo an toàn context
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
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
