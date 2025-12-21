
import { GoogleGenAI, Type } from "@google/genai";
import { Transaction, TransactionType, Language, EXPENSE_CATEGORIES } from "../types";

/**
 * Analyze financial transactions using Gemini 3
 */
export const analyzeFinances = async (transactions: Transaction[], lang: Language = 'vi'): Promise<string> => {
  if (transactions.length === 0) return lang === 'vi' ? "Chưa có dữ liệu giao dịch." : "Keine Transaktionsdaten vorhanden.";

  const totalIncome = transactions.filter(t => t.type === TransactionType.INCOME).reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === TransactionType.EXPENSE).reduce((sum, t) => sum + t.amount, 0);
  const profit = totalIncome - totalExpense;

  const prompt = `
    Bạn là một chuyên gia tư vấn tài chính (CFO) cho nhà hàng "Tokymon".
    Dữ liệu:
    - Tổng doanh thu: ${totalIncome} EUR
    - Tổng chi phí: ${totalExpense} EUR
    - Lợi nhuận: ${profit} EUR

    Hãy đưa ra một bản phân tích ngắn gọn bằng ${lang === 'vi' ? 'tiếng Việt' : 'tiếng Đức'}.
    1. Nhận xét tình hình.
    2. Lời khuyên tăng lợi nhuận.
    Giọng văn chuyên nghiệp.
  `;

  try {
    // Fix: Using named parameter for API key and process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    // Fix: Access .text property directly as per latest guidelines
    return response.text || "Error.";
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Error connecting to AI.";
  }
};

/**
 * Scan a receipt image using Gemini 3 vision capabilities
 */
export const scanReceipt = async (base64Image: string, mimeType: string): Promise<any> => {
  const prompt = `Bạn là một trợ lý kế toán cho nhà hàng Tokymon. Hãy phân tích ảnh hóa đơn này.
  Trích xuất các thông tin sau vào JSON:
  - amount: tổng số tiền phải thanh toán (chỉ lấy số)
  - date: ngày trên hóa đơn (định dạng YYYY-MM-DD)
  - category: chọn danh mục phù hợp nhất từ danh sách này: [${EXPENSE_CATEGORIES.join(', ')}]
  - note: tên nhà cung cấp hoặc nội dung ngắn gọn (ví dụ: "Metro", "Edeka", "Lương tháng 5")
  
  Lưu ý: Nếu hóa đơn bằng tiếng Đức, hãy hiểu các từ như 'Summe', 'Gesamtbetrag' là tổng tiền. Nếu không tìm thấy ngày, hãy lấy ngày hôm nay.`;

  try {
    // Fix: Using named parameter for API key and process.env.API_KEY directly
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Image,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            amount: { type: Type.NUMBER, description: "Total amount on the receipt" },
            date: { type: Type.STRING, description: "Transaction date in YYYY-MM-DD format" },
            category: { type: Type.STRING, description: "The most appropriate category from the provided list" },
            note: { type: Type.STRING, description: "Brief vendor or item note" }
          },
          required: ["amount", "date", "category", "note"]
        }
      }
    });

    // Fix: Access .text property directly as per latest guidelines
    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("OCR Error:", error);
    throw error;
  }
};
