/* ==========================================================================
   Adaptive Quiz System - Gemini AI Remediation Service (js/ai-service.js)
   ========================================================================== */

// Khai báo API Key lấy từ Google AI Studio (aistudio.google.com)
const GEMINI_API_KEY = ""; 

// Danh sách các tên mô hình khả dụng của Google Gemini API
const AVAILABLE_MODELS = [
  "gemini-2.5-flash",          // Mô hình Flash ổn định chính thức
  "gemini-3.5-flash-lite",     // Mô hình siêu nhẹ, tốc độ phản hồi cực nhanh
  "gemini-3.8-flash",          // Mô hình thế hệ mới nhất
  "gemini-1.5-flash"           // Mô hình dự phòng
];

window.AIService = {

  /**
   * Tự động sinh câu hỏi bổ trợ dựa trên danh sách các câu làm sai
   * @param {Array} wrongQuestions - Mảng chứa danh sách câu hỏi học viên làm sai
   * @returns {Promise<Array|null>} Mảng câu hỏi mới do Gemini AI tạo ra
   */
  async generateRemediationQuiz(wrongQuestions) {
    // Kiểm tra nếu không có câu làm sai thì không cần xử lý
    if (!wrongQuestions || wrongQuestions.length === 0) return null;

    // Trích xuất bối cảnh kiến thức bị hổng từ các câu sai
    const context = wrongQuestions.map(q => ({
      topic: q.topic,                             // Tên chủ đề chính
      subTopic: q.subTopic,                       // Tên tiểu chủ đề
      failedQuestion: q.question,                 // Câu hỏi học viên trả lời sai
      explanation: q.explanation                  // Lời giải thích chuẩn
    }));

    // Khai báo Prompt kỹ thuật chỉ dẫn cho AI
    const promptText = `
Bạn là chuyên gia thiết kế đề thi trắc nghiệm lập trình Web.
Học viên vừa làm SAI các câu hỏi sau:
${JSON.stringify(context, null, 2)}

Nhiệm vụ của bạn:
1. Phân tích lỗ hổng kiến thức từ các câu hỏi sai trên.
2. Sinh ra chính xác ${wrongQuestions.length} câu hỏi MỚI (không trùng lặp với câu cũ) để giúp học viên củng cố đúng khái niệm bị hổng.
3. Độ khó: Tương đương hoặc dễ hơn một chút.

YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
- Trả về DUY NHẤT một mảng JSON chuẩn (Array of Objects).
- KHÔNG kèm theo lời mở đầu, lời kết, hoặc thẻ markdown codeblock (như \`\`\`json).
- Cấu trúc từng Object câu hỏi bắt buộc như sau:
[
  {
    "id": "ai_q_1",
    "topic": "Tên chủ đề",
    "subTopic": "Tên subtopic",
    "difficulty": "Easy",
    "type": "single",
    "question": "Nội dung câu hỏi mới?",
    "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
    "correctAnswer": [0],
    "explanation": "Lời giải chi tiết."
  }
]
    `;

    // Duyệt qua từng mô hình trong danh sách để thử gửi yêu cầu
    for (const modelName of AVAILABLE_MODELS) {
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
      
      try {
        console.log(`Đang thử gọi Gemini AI với mô hình: ${modelName}...`);

        // Gửi yêu cầu HTTP POST tới Google Gemini API
        const response = await fetch(apiUrl, {
          method: "POST", // Phương thức gửi dữ liệu
          headers: { 
            "Content-Type": "application/json" // Kiểu dữ liệu gửi đi
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: promptText }] // Truyền Prompt vào body
              }
            ],
            generationConfig: {
              responseMimeType: "application/json", // Bắt buộc AI trả về định dạng JSON
              temperature: 0.7                      // Mức độ sáng tạo
            }
          })
        });

        // Nếu model bị quá tải (503) hoặc không tìm thấy (404), thử mô hình tiếp theo
        if (response.status === 503 || response.status === 404) {
          console.warn(`Mô hình ${modelName} trả về lỗi ${response.status}. Tự động chuyển sang mô hình tiếp theo...`);
          continue;
        }

        // Nếu có lỗi khác xảy ra
        if (!response.ok) {
          const errorData = await response.json();
          console.error(`Chi tiết lỗi từ mô hình ${modelName}:`, errorData);
          continue;
        }

        // Đọc dữ liệu JSON thành công từ API
        const data = await response.json();
        
        // Trích xuất chuỗi JSON text trả về từ cấu trúc Gemini API
        const rawText = data.candidates[0].content.parts[0].text;
        
        // Parse chuỗi văn bản thành Object/Array JavaScript
        const aiQuestions = JSON.parse(rawText);

        // Lưu danh sách câu hỏi AI vừa tạo vào AppState
        window.AppState.aiQuestions = aiQuestions;
        
        console.log(`✅ Kết nối Gemini AI thành công với mô hình: ${modelName}`);
        
        // Trả về mảng câu hỏi thành công
        return aiQuestions;

      } catch (error) {
        // Bắt lỗi nếu gặp sự cố trong quá trình gọi API hoặc parse JSON
        console.error(`Sự cố khi thử mô hình ${modelName}:`, error);
      }
    }

    // Nếu tất cả các mô hình API đều lỗi, chuyển sang chế độ dự phòng
    console.error("Tất cả mô hình AI đều gặp sự cố. Chuyển sang chế độ dự phòng nội bộ.");
    return this.fallbackToStaticQuestions(wrongQuestions);
  },

  /**
   * Cơ chế dự phòng (Fallback) khi API gặp sự cố
   * @param {Array} wrongQuestions - Mảng câu hỏi làm sai
   * @returns {Array} Mảng câu hỏi dự phòng
   */
  fallbackToStaticQuestions(wrongQuestions) {
    // Hiển thị thông báo bằng SweetAlert2
    Swal.fire({
      icon: 'warning',
      title: 'Chế độ dự phòng',
      text: 'Máy chủ Google AI hiện tại chưa sẵn sàng. Hệ thống chuyển sang sử dụng kho câu hỏi ôn tập nội bộ.',
      confirmColor: '#38bdf8'
    });
    
    // Trả về câu hỏi dự phòng từ chính các câu làm sai
    return wrongQuestions.map((q, idx) => ({
      ...q,
      id: `fallback_q_${idx + 1}`
    }));
  }
};