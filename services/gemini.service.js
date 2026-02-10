/**
 * Gemini AI Service for Exam Generation
 * Uses Google Generative AI to create educational exam questions
 */

const { GoogleGenAI } = require('@google/genai');

// Initialize Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || '' });

/**
 * Generate exam questions using Gemini AI
 * @param {Object} params - Generation parameters
 * @param {string} params.subject - Subject name (Matematik, Fen Bilimleri, etc.)
 * @param {number} params.grade - Grade level (1-8)
 * @param {string} params.topic - Specific topic (optional)
 * @param {number} params.questionCount - Number of questions to generate
 * @param {string} params.questionType - 'multiple_choice', 'open_ended', or 'mixed'
 * @returns {Promise<Object>} Generated exam content
 */
async function generateExamQuestions({
  subject,
  grade,
  topic,
  questionCount = 5,
  questionType = 'mixed'
}) {
  // Check if we should use mock mode
  const useMock = process.env.USE_MOCK === 'true' || !process.env.GOOGLE_API_KEY;

  if (useMock) {
    console.log('🎭 Using mock exam generation');
    return generateMockExam({ subject, grade, topic, questionCount, questionType });
  }

  try {
    const prompt = buildExamPrompt({ subject, grade, topic, questionCount, questionType });

    // Use the new SDK pattern
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: prompt,
    });

    const text = response.text;

    // Parse the JSON response
    const examData = parseExamResponse(text);

    return {
      success: true,
      data: examData
    };
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Sınav oluşturulurken hata oluştu: ${error.message}`);
  }
}

/**
 * Build the prompt for exam generation
 */
function buildExamPrompt({ subject, grade, topic, questionCount, questionType }) {
  const questionTypeText = questionType === 'multiple_choice'
    ? 'sadece çoktan seçmeli'
    : questionType === 'open_ended'
      ? 'sadece açık uçlu'
      : 'hem çoktan seçmeli hem açık uçlu (karma)';

  const topicText = topic ? `Konu: ${topic}` : 'Genel müfredat konuları';

  return `Sen bir eğitim uzmanısın. Türkiye MEB müfredatına uygun sınav soruları hazırlayacaksın.

Parametreler:
- Ders: ${subject}
- Sınıf: ${grade}. sınıf
- ${topicText}
- Soru sayısı: ${questionCount}
- Soru tipi: ${questionTypeText}

Lütfen aşağıdaki JSON formatında cevap ver:

{
  "title": "Sınav başlığı",
  "description": "Sınav açıklaması",
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "question": "Soru metni",
      "options": ["A) Seçenek 1", "B) Seçenek 2", "C) Seçenek 3", "D) Seçenek 4"],
      "correctAnswer": "A",
      "points": 10,
      "explanation": "Doğru cevabın açıklaması"
    },
    {
      "id": 2,
      "type": "open_ended",
      "question": "Açık uçlu soru metni",
      "expectedAnswer": "Beklenen cevap açıklaması",
      "rubric": "Değerlendirme kriterleri",
      "points": 20
    }
  ]
}

Önemli kurallar:
1. Sorular ${grade}. sınıf seviyesine uygun olmalı
2. Türkçe ve anlaşılır bir dil kullan
3. Çoktan seçmeli sorularda 4 seçenek olmalı (A, B, C, D)
4. Her sorunun puanı olmalı
5. Toplam puan 100 olmalı
6. Sadece geçerli JSON formatında cevap ver, başka metin ekleme`;
}

/**
 * Parse Gemini response to extract exam data
 */
function parseExamResponse(text) {
  try {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('JSON format bulunamadı');
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate structure
    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error('Sorular bulunamadı');
    }

    // Ensure each question has required fields
    parsed.questions = parsed.questions.map((q, index) => ({
      id: q.id || index + 1,
      type: q.type || 'multiple_choice',
      question: q.question || '',
      options: q.options || [],
      correctAnswer: q.correctAnswer || '',
      expectedAnswer: q.expectedAnswer || '',
      rubric: q.rubric || '',
      points: q.points || 10,
      explanation: q.explanation || ''
    }));

    return parsed;
  } catch (error) {
    console.error('Parse error:', error);
    throw new Error('AI yanıtı işlenemedi: ' + error.message);
  }
}

/**
 * Generate mock exam for testing
 */
function generateMockExam({ subject, grade, topic, questionCount, questionType }) {
  const mockQuestions = [];
  const pointsPerQuestion = Math.floor(100 / questionCount);

  for (let i = 1; i <= questionCount; i++) {
    const isMultipleChoice = questionType === 'multiple_choice' ||
      (questionType === 'mixed' && i % 2 === 1);

    if (isMultipleChoice) {
      mockQuestions.push({
        id: i,
        type: 'multiple_choice',
        question: `${subject} dersi ${grade}. sınıf ${topic || 'genel'} konusu - Örnek Soru ${i}: Bu bir çoktan seçmeli test sorusudur.`,
        options: [
          'A) Birinci seçenek',
          'B) İkinci seçenek',
          'C) Üçüncü seçenek',
          'D) Dördüncü seçenek'
        ],
        correctAnswer: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
        points: pointsPerQuestion,
        explanation: 'Bu sorunun cevabı belirlenen seçenektir.'
      });
    } else {
      mockQuestions.push({
        id: i,
        type: 'open_ended',
        question: `${subject} dersi ${grade}. sınıf ${topic || 'genel'} konusu - Örnek Soru ${i}: Bu konuyu kendi cümlelerinizle açıklayınız.`,
        expectedAnswer: 'Öğrencinin konuyu kendi cümleleriyle açıklaması beklenmektedir.',
        rubric: 'Doğru kavramları kullanma: 10 puan, Açık anlatım: 5 puan, Örnek verme: 5 puan',
        points: pointsPerQuestion
      });
    }
  }

  // Adjust last question points to make total 100
  const totalPoints = mockQuestions.reduce((sum, q) => sum + q.points, 0);
  if (totalPoints !== 100 && mockQuestions.length > 0) {
    mockQuestions[mockQuestions.length - 1].points += (100 - totalPoints);
  }

  return {
    success: true,
    data: {
      title: `${grade}. Sınıf ${subject} Sınavı`,
      description: `${topic || 'Genel müfredat'} konularını kapsayan değerlendirme sınavı`,
      questions: mockQuestions
    }
  };
}

module.exports = {
  generateExamQuestions
};

