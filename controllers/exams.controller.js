/**
 * Exams Controller
 * Handles exam generation, creation, and management
 */

const { PrismaClient } = require('@prisma/client');
const { generateExamQuestions } = require('../services/gemini.service');

const prisma = new PrismaClient();

/**
 * Generate exam questions using AI
 * POST /api/exams/generate
 * Required roles: TEACHER, ADMIN
 */
const generateExam = async (req, res) => {
  try {
    const { subject, grade, topic, questionCount = 5, questionType = 'mixed' } = req.body;

    // Validation
    if (!subject || !grade) {
      return res.status(400).json({
        success: false,
        message: 'Ders ve sınıf bilgisi gereklidir'
      });
    }

    if (grade < 1 || grade > 8) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf 1-8 arasında olmalıdır'
      });
    }

    if (questionCount < 1 || questionCount > 20) {
      return res.status(400).json({
        success: false,
        message: 'Soru sayısı 1-20 arasında olmalıdır'
      });
    }

    const validTypes = ['multiple_choice', 'open_ended', 'mixed'];
    if (!validTypes.includes(questionType)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz soru tipi. Geçerli tipler: multiple_choice, open_ended, mixed'
      });
    }

    // Generate exam using AI
    const result = await generateExamQuestions({
      subject,
      grade: parseInt(grade),
      topic,
      questionCount: parseInt(questionCount),
      questionType
    });

    res.json({
      success: true,
      message: 'Sınav soruları oluşturuldu',
      data: result.data
    });
  } catch (error) {
    console.error('Generate exam error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Sınav oluşturulurken hata oluştu'
    });
  }
};

const DIFFICULTY_LEVELS = ['EASY', 'MEDIUM', 'HARD'];

/**
 * Create/Save an exam
 * POST /api/exams
 * Required roles: TEACHER, ADMIN
 */
const createExam = async (req, res) => {
  try {
    const { title, description, grade, subjectName, topic, questions, duration, difficulty } = req.body;
    const userId = req.userId;

    // Validation
    if (!title || !grade || !subjectName || !questions) {
      return res.status(400).json({
        success: false,
        message: 'Başlık, sınıf, ders ve sorular gereklidir'
      });
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'En az bir soru gereklidir'
      });
    }

    const normalizedDifficulty = (difficulty || 'MEDIUM').toString().toUpperCase();
    if (!DIFFICULTY_LEVELS.includes(normalizedDifficulty)) {
      return res.status(400).json({
        success: false,
        message: 'Geçersiz sınav zorluğu. Geçerli seçenekler: Kolay, Orta, Zor'
      });
    }

    // Calculate total points
    const totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);

    // Find matching subject
    const subject = await prisma.subject.findFirst({
      where: {
        name: subjectName,
        grade: parseInt(grade),
        ...(topic && { topic })
      }
    });

    const exam = await prisma.exam.create({
      data: {
        title,
        description,
        grade: parseInt(grade),
        subjectName,
        topic,
        questions: JSON.stringify(questions),
        totalPoints,
        duration: duration ? parseInt(duration) : null,
        difficulty: normalizedDifficulty,
        status: 'DRAFT',
        createdById: userId,
        subjectId: subject?.id || null
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sınav oluşturuldu',
      data: {
        ...exam,
        questions: JSON.parse(exam.questions)
      }
    });
  } catch (error) {
    console.error('Create exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınav kaydedilirken hata oluştu'
    });
  }
};

/**
 * Get all exams (for teacher/admin)
 * GET /api/exams
 * Required roles: TEACHER, ADMIN
 */
const getAllExams = async (req, res) => {
  try {
    const userId = req.userId;
    const { status } = req.query;
    const isAdmin = req.userRoles?.includes('ADMIN');

    const where = {
      ...(status && { status }),
      // Non-admin teachers can only see their own exams
      ...(!isAdmin && { createdById: userId })
    };

    const exams = await prisma.exam.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: { homeworks: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: exams.map(exam => ({
        ...exam,
        questions: JSON.parse(exam.questions),
        assignedCount: exam._count.homeworks
      }))
    });
  } catch (error) {
    console.error('Get exams error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınavlar yüklenirken hata oluştu'
    });
  }
};

/**
 * Get exam by ID
 * GET /api/exams/:id
 * Required roles: TEACHER, ADMIN, STUDENT (limited)
 */
const getExamById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isStudent = req.userRoles?.includes('STUDENT') && !req.userRoles?.includes('TEACHER');

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        },
        homeworks: isStudent ? {
          where: { studentId: userId }
        } : true
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Sınav bulunamadı'
      });
    }

    // Parse questions
    let questions = JSON.parse(exam.questions);

    // For students, hide correct answers if homework is not submitted
    if (isStudent) {
      const studentHomework = exam.homeworks?.[0];
      if (!studentHomework || studentHomework.status === 'ASSIGNED') {
        questions = questions.map(q => ({
          ...q,
          correctAnswer: undefined,
          expectedAnswer: undefined,
          explanation: undefined
        }));
      }
    }

    res.json({
      success: true,
      data: {
        ...exam,
        questions
      }
    });
  } catch (error) {
    console.error('Get exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınav yüklenirken hata oluştu'
    });
  }
};

/**
 * Update exam
 * PUT /api/exams/:id
 * Required roles: TEACHER, ADMIN
 */
const updateExam = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, questions, duration, status, difficulty } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Sınav bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && exam.createdById !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınavı düzenleme yetkiniz yok'
      });
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (duration !== undefined) updateData.duration = duration ? parseInt(duration) : null;
    if (status) updateData.status = status;
    if (difficulty) {
      const normalizedDifficulty = difficulty.toString().toUpperCase();
      if (!DIFFICULTY_LEVELS.includes(normalizedDifficulty)) {
        return res.status(400).json({
          success: false,
          message: 'Geçersiz sınav zorluğu. Geçerli seçenekler: Kolay, Orta, Zor'
        });
      }
      updateData.difficulty = normalizedDifficulty;
    }
    if (questions) {
      updateData.questions = JSON.stringify(questions);
      updateData.totalPoints = questions.reduce((sum, q) => sum + (q.points || 0), 0);
    }

    const updatedExam = await prisma.exam.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Sınav güncellendi',
      data: {
        ...updatedExam,
        questions: JSON.parse(updatedExam.questions)
      }
    });
  } catch (error) {
    console.error('Update exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınav güncellenirken hata oluştu'
    });
  }
};

/**
 * Delete exam
 * DELETE /api/exams/:id
 * Required roles: TEACHER, ADMIN
 */
const deleteExam = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(id) },
      include: {
        _count: { select: { homeworks: true } }
      }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Sınav bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && exam.createdById !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınavı silme yetkiniz yok'
      });
    }

    // Warn if exam has assignments
    if (exam._count.homeworks > 0) {
      return res.status(400).json({
        success: false,
        message: `Bu sınav ${exam._count.homeworks} öğrenciye atanmış. Önce atamaları silin.`
      });
    }

    await prisma.exam.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Sınav silindi'
    });
  } catch (error) {
    console.error('Delete exam error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınav silinirken hata oluştu'
    });
  }
};

module.exports = {
  generateExam,
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam
};
