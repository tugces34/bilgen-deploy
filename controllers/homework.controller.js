/**
 * Homework Controller
 * Handles homework assignment, submission, and grading
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Assign exam to students
 * POST /api/homework/assign
 * Required roles: TEACHER, ADMIN
 * Supports: studentIds array OR classroomId (assigns to all students in classroom)
 */
const assignHomework = async (req, res) => {
  try {
    const { examId, studentIds, classroomId, dueDate } = req.body;
    const teacherId = req.userId;

    // Validation - need either studentIds or classroomId
    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'Sınav ID gereklidir'
      });
    }

    if ((!studentIds || !Array.isArray(studentIds) || studentIds.length === 0) && !classroomId) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci listesi veya sınıf ID gereklidir'
      });
    }

    // Check if exam exists
    const exam = await prisma.exam.findUnique({
      where: { id: parseInt(examId) }
    });

    if (!exam) {
      return res.status(404).json({
        success: false,
        message: 'Sınav bulunamadı'
      });
    }

    let targetStudentIds = studentIds ? studentIds.map(id => parseInt(id)) : [];

    // If classroomId provided, get all students from that classroom
    if (classroomId) {
      const classroom = await prisma.classroom.findUnique({
        where: { id: parseInt(classroomId) },
        include: {
          students: {
            select: { id: true }
          }
        }
      });

      if (!classroom) {
        return res.status(404).json({
          success: false,
          message: 'Sınıf bulunamadı'
        });
      }

      // Check if teacher owns this classroom (or is admin)
      const isAdmin = req.userRoles?.includes('ADMIN');
      if (!isAdmin && classroom.teacherId !== teacherId) {
        return res.status(403).json({
          success: false,
          message: 'Bu sınıfa ödev atama yetkiniz yok'
        });
      }

      targetStudentIds = classroom.students.map(s => s.id);

      if (targetStudentIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Bu sınıfta öğrenci bulunmuyor'
        });
      }
    }

    // Verify students exist and have STUDENT role
    const students = await prisma.user.findMany({
      where: {
        id: { in: targetStudentIds },
        roles: {
          some: {
            role: { name: 'STUDENT' }
          }
        }
      }
    });

    if (students.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli öğrenci bulunamadı'
      });
    }

    // Create homework assignments
    const assignments = [];
    const errors = [];

    for (const student of students) {
      try {
        const homework = await prisma.homework.create({
          data: {
            examId: parseInt(examId),
            studentId: student.id,
            teacherId,
            dueDate: dueDate ? new Date(dueDate) : null,
            status: 'ASSIGNED'
          }
        });
        assignments.push({
          id: homework.id,
          studentId: student.id,
          studentName: student.name || student.email
        });
      } catch (err) {
        // Skip if already assigned (unique constraint)
        if (err.code === 'P2002') {
          errors.push({
            studentId: student.id,
            message: 'Bu öğrenciye zaten atanmış'
          });
        } else {
          throw err;
        }
      }
    }

    // Update exam status to PUBLISHED if it was DRAFT
    if (exam.status === 'DRAFT') {
      await prisma.exam.update({
        where: { id: parseInt(examId) },
        data: { status: 'PUBLISHED' }
      });
    }

    res.status(201).json({
      success: true,
      message: `${assignments.length} öğrenciye ödev atandı`,
      data: {
        assigned: assignments,
        errors
      }
    });
  } catch (error) {
    console.error('Assign homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödev atanırken hata oluştu'
    });
  }
};

/**
 * Get teacher's assigned homeworks
 * GET /api/homework/teacher
 * Required roles: TEACHER, ADMIN
 */
const getTeacherHomeworks = async (req, res) => {
  try {
    const teacherId = req.userId;
    const { status, examId } = req.query;
    const isAdmin = req.userRoles?.includes('ADMIN');

    const where = {
      ...(status && { status }),
      ...(examId && { examId: parseInt(examId) }),
      // Non-admin teachers only see their own assignments
      ...(!isAdmin && { teacherId })
    };

    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            grade: true,
            subjectName: true,
            totalPoints: true
          }
        },
        student: {
          select: { id: true, name: true, email: true }
        },
        teacher: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: homeworks.map(hw => ({
        ...hw,
        studentAnswers: hw.studentAnswers ? JSON.parse(hw.studentAnswers) : null
      }))
    });
  } catch (error) {
    console.error('Get teacher homeworks error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödevler yüklenirken hata oluştu'
    });
  }
};

/**
 * Get student's homeworks
 * GET /api/homework/student
 * Required roles: STUDENT
 */
const getStudentHomeworks = async (req, res) => {
  try {
    const studentId = req.userId;
    const { status } = req.query;

    const where = {
      studentId,
      ...(status && { status })
    };

    const homeworks = await prisma.homework.findMany({
      where,
      include: {
        exam: {
          select: {
            id: true,
            title: true,
            grade: true,
            subjectName: true,
            topic: true,
            totalPoints: true,
            duration: true
          }
        },
        teacher: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: [
        { status: 'asc' }, // ASSIGNED first
        { dueDate: 'asc' }
      ]
    });

    res.json({
      success: true,
      data: homeworks.map(hw => ({
        ...hw,
        studentAnswers: hw.studentAnswers ? JSON.parse(hw.studentAnswers) : null
      }))
    });
  } catch (error) {
    console.error('Get student homeworks error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödevler yüklenirken hata oluştu'
    });
  }
};

/**
 * Get homework by ID with full exam details
 * GET /api/homework/:id
 * Required roles: TEACHER, ADMIN, STUDENT (own homework only)
 */
const getHomeworkById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isTeacherOrAdmin = req.userRoles?.includes('TEACHER') || req.userRoles?.includes('ADMIN');

    const homework = await prisma.homework.findUnique({
      where: { id: parseInt(id) },
      include: {
        exam: true,
        student: {
          select: { id: true, name: true, email: true }
        },
        teacher: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Ödev bulunamadı'
      });
    }

    // Check access
    if (!isTeacherOrAdmin && homework.studentId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu ödeve erişim yetkiniz yok'
      });
    }

    // Parse questions and student answers
    let questions = JSON.parse(homework.exam.questions);
    const studentAnswers = homework.studentAnswers ? JSON.parse(homework.studentAnswers) : null;

    // For students who haven't submitted, hide correct answers
    if (!isTeacherOrAdmin && homework.status === 'ASSIGNED') {
      questions = questions.map(q => ({
        ...q,
        correctAnswer: undefined,
        expectedAnswer: undefined,
        explanation: undefined
      }));
    }

    res.json({
      success: true,
      data: {
        ...homework,
        studentAnswers,
        exam: {
          ...homework.exam,
          questions
        }
      }
    });
  } catch (error) {
    console.error('Get homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödev yüklenirken hata oluştu'
    });
  }
};

/**
 * Submit homework answers
 * PATCH /api/homework/:id/submit
 * Required roles: STUDENT
 */
const submitHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const { answers } = req.body;
    const studentId = req.userId;

    if (!answers || !Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: 'Cevaplar gereklidir'
      });
    }

    const homework = await prisma.homework.findUnique({
      where: { id: parseInt(id) },
      include: {
        exam: true
      }
    });

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Ödev bulunamadı'
      });
    }

    // Verify ownership
    if (homework.studentId !== studentId) {
      return res.status(403).json({
        success: false,
        message: 'Bu ödev size ait değil'
      });
    }

    // Check if already submitted
    if (homework.status !== 'ASSIGNED') {
      return res.status(400).json({
        success: false,
        message: 'Bu ödev zaten gönderilmiş'
      });
    }

    // Check due date
    if (homework.dueDate && new Date() > new Date(homework.dueDate)) {
      return res.status(400).json({
        success: false,
        message: 'Ödev teslim süresi geçmiş'
      });
    }

    // Auto-grade multiple choice questions
    const questions = JSON.parse(homework.exam.questions);
    let autoScore = 0;
    let hasOpenEnded = false;

    const gradedAnswers = answers.map((answer, index) => {
      const question = questions.find(q => q.id === answer.questionId) || questions[index];

      if (!question) return answer;

      if (question.type === 'multiple_choice') {
        const isCorrect = answer.answer === question.correctAnswer;
        if (isCorrect) {
          autoScore += question.points || 0;
        }
        return {
          ...answer,
          isCorrect,
          points: isCorrect ? question.points : 0
        };
      } else {
        hasOpenEnded = true;
        return {
          ...answer,
          isCorrect: null, // Needs manual grading
          points: null
        };
      }
    });

    const updatedHomework = await prisma.homework.update({
      where: { id: parseInt(id) },
      data: {
        studentAnswers: JSON.stringify(gradedAnswers),
        status: hasOpenEnded ? 'SUBMITTED' : 'GRADED',
        score: hasOpenEnded ? null : autoScore,
        submittedAt: new Date()
      },
      include: {
        exam: {
          select: { title: true, totalPoints: true }
        }
      }
    });

    res.json({
      success: true,
      message: hasOpenEnded
        ? 'Ödev gönderildi. Açık uçlu sorular öğretmen tarafından değerlendirilecek.'
        : 'Ödev gönderildi ve puanlandı.',
      data: {
        ...updatedHomework,
        studentAnswers: gradedAnswers,
        autoScore: hasOpenEnded ? autoScore : undefined
      }
    });
  } catch (error) {
    console.error('Submit homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödev gönderilirken hata oluştu'
    });
  }
};

/**
 * Grade homework (for open-ended questions)
 * PATCH /api/homework/:id/grade
 * Required roles: TEACHER, ADMIN
 */
const gradeHomework = async (req, res) => {
  try {
    const { id } = req.params;
    const { grades, feedback } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    if (!grades || !Array.isArray(grades)) {
      return res.status(400).json({
        success: false,
        message: 'Puanlar gereklidir'
      });
    }

    const homework = await prisma.homework.findUnique({
      where: { id: parseInt(id) },
      include: {
        exam: true
      }
    });

    if (!homework) {
      return res.status(404).json({
        success: false,
        message: 'Ödev bulunamadı'
      });
    }

    // Check if teacher owns this assignment
    if (!isAdmin && homework.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu ödevi puanlama yetkiniz yok'
      });
    }

    if (homework.status === 'ASSIGNED') {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci henüz cevap göndermedi'
      });
    }

    // Update student answers with grades
    const studentAnswers = JSON.parse(homework.studentAnswers || '[]');
    let totalScore = 0;

    const gradedAnswers = studentAnswers.map(answer => {
      const grade = grades.find(g => g.questionId === answer.questionId);

      if (grade) {
        const points = grade.points || 0;
        totalScore += points;
        return {
          ...answer,
          points,
          isCorrect: points > 0,
          teacherComment: grade.comment
        };
      } else if (answer.points !== null) {
        totalScore += answer.points;
      }

      return answer;
    });

    const updatedHomework = await prisma.homework.update({
      where: { id: parseInt(id) },
      data: {
        studentAnswers: JSON.stringify(gradedAnswers),
        status: 'GRADED',
        score: totalScore,
        feedback,
        gradedAt: new Date()
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        },
        exam: {
          select: { title: true, totalPoints: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Ödev puanlandı',
      data: {
        ...updatedHomework,
        studentAnswers: gradedAnswers
      }
    });
  } catch (error) {
    console.error('Grade homework error:', error);
    res.status(500).json({
      success: false,
      message: 'Ödev puanlanırken hata oluştu'
    });
  }
};

/**
 * Get all students (for assignment dropdown)
 * GET /api/homework/students
 * Required roles: TEACHER, ADMIN
 */
const getStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'STUDENT' }
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: { name: 'asc' }
    });

    res.json({
      success: true,
      data: students
    });
  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenciler yüklenirken hata oluştu'
    });
  }
};

module.exports = {
  assignHomework,
  getTeacherHomeworks,
  getStudentHomeworks,
  getHomeworkById,
  submitHomework,
  gradeHomework,
  getStudents
};

