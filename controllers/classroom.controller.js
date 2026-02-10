/**
 * Classroom Controller
 * Handles classroom management, student assignments, and announcements
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CLASSROOM_SECTIONS = ['A', 'B', 'C', 'D'];

const normalizeSection = (section) => {
  if (section === undefined || section === null) return null;
  const normalized = String(section).trim().toUpperCase();
  return CLASSROOM_SECTIONS.includes(normalized) ? normalized : null;
};

const buildClassName = (grade, section) => `${grade}-${section}`;

const extractSectionFromName = (name) => {
  if (!name) return null;
  const dashParts = name.split('-');
  if (dashParts.length > 1) {
    const candidate = dashParts[1].trim().toUpperCase();
    if (CLASSROOM_SECTIONS.includes(candidate)) {
      return candidate;
    }
  }
  const trimmed = name.trim();
  if (!trimmed) return null;
  const lastChar = trimmed.slice(-1).toUpperCase();
  return CLASSROOM_SECTIONS.includes(lastChar) ? lastChar : null;
};

const validateTeacherId = async (teacherId) => {
  const parsedId = parseInt(teacherId, 10);
  if (Number.isNaN(parsedId)) {
    return null;
  }

  const teacher = await prisma.user.findFirst({
    where: {
      id: parsedId,
      roles: {
        some: {
          role: { name: 'TEACHER' }
        }
      }
    },
    select: { id: true }
  });

  return teacher ? parsedId : null;
};

/**
 * Create a new classroom
 * POST /api/classrooms
 * Required roles: TEACHER, ADMIN
 */
const createClassroom = async (req, res) => {
  try {
    const { grade, section, description, teacherId } = req.body;
    const isAdmin = req.userRoles?.includes('ADMIN');

    if (!grade || !section) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf seviyesi ve şubesi gereklidir'
      });
    }

    const numericGrade = parseInt(grade, 10);
    if (Number.isNaN(numericGrade) || numericGrade < 1 || numericGrade > 8) {
      return res.status(400).json({
        success: false,
        message: 'Sınıf seviyesi 1-8 arasında olmalıdır'
      });
    }

    const normalizedSection = normalizeSection(section);
    if (!normalizedSection) {
      return res.status(400).json({
        success: false,
        message: 'Geçerli bir sınıf şubesi seçin'
      });
    }

    let assignedTeacherId;
    if (isAdmin) {
      const validTeacherId = await validateTeacherId(teacherId);
      if (!validTeacherId) {
        return res.status(400).json({
          success: false,
          message: 'Lütfen geçerli bir öğretmen seçin'
        });
      }
      assignedTeacherId = validTeacherId;
    } else {
      const validTeacherId = await validateTeacherId(req.userId);
      if (!validTeacherId) {
        return res.status(403).json({
          success: false,
          message: 'Öğretmen rolünüz olmadan sınıf oluşturamazsınız'
        });
      }
      assignedTeacherId = validTeacherId;
    }

    const classroom = await prisma.classroom.create({
      data: {
        name: buildClassName(numericGrade, normalizedSection),
        grade: numericGrade,
        description: description || null,
        teacherId: assignedTeacherId
      },
      include: {
        teacher: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Sınıf başarıyla oluşturuldu',
      data: classroom
    });
  } catch (error) {
    console.error('Create classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf oluşturulurken hata oluştu'
    });
  }
};

/**
 * Get all classrooms for current teacher
 * GET /api/classrooms
 * Required roles: TEACHER, ADMIN
 */
const getClassrooms = async (req, res) => {
  try {
    const teacherId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    const where = isAdmin ? {} : { teacherId };

    const classrooms = await prisma.classroom.findMany({
      where,
      include: {
        teacher: {
          select: { id: true, name: true, email: true }
        },
        students: {
          select: { id: true, name: true, email: true }
        },
        _count: {
          select: {
            students: true,
            announcements: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: classrooms
    });
  } catch (error) {
    console.error('Get classrooms error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıflar yüklenirken hata oluştu'
    });
  }
};

/**
 * Get classroom by ID
 * GET /api/classrooms/:id
 * Required roles: TEACHER, ADMIN, STUDENT
 */
const getClassroomById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');
    const isStudent = req.userRoles?.includes('STUDENT');

    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        teacher: {
          select: { id: true, name: true, email: true }
        },
        students: {
          select: { id: true, name: true, email: true }
        },
        announcements: {
          include: {
            createdBy: {
              select: { id: true, name: true, email: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check access: Admin, owner teacher, or student in classroom
    const hasAccess = isAdmin ||
                      classroom.teacherId === userId ||
                      (isStudent && classroom.students.some(s => s.id === userId));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfa erişim yetkiniz yok'
      });
    }

    res.json({
      success: true,
      data: classroom
    });
  } catch (error) {
    console.error('Get classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf yüklenirken hata oluştu'
    });
  }
};

/**
 * Update classroom
 * PUT /api/classrooms/:id
 * Required roles: TEACHER, ADMIN
 */
const updateClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { grade, section, description, teacherId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    // Check if classroom exists
    const existingClassroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingClassroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check ownership (Admin can update any)
    if (!isAdmin && existingClassroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfı düzenleme yetkiniz yok'
      });
    }

    let parsedGrade = null;
    if (grade !== undefined) {
      parsedGrade = parseInt(grade, 10);
      if (Number.isNaN(parsedGrade) || parsedGrade < 1 || parsedGrade > 8) {
        return res.status(400).json({
          success: false,
          message: 'Sınıf seviyesi 1-8 arasında olmalıdır'
        });
      }
    }

    let normalizedSection = null;
    if (section !== undefined) {
      normalizedSection = normalizeSection(section);
      if (!normalizedSection) {
        return res.status(400).json({
          success: false,
          message: 'Geçerli bir sınıf şubesi seçin'
        });
      }
    }

    const updateData = {};
    if (parsedGrade !== null) {
      updateData.grade = parsedGrade;
    }

    if (description !== undefined) {
      updateData.description = description || null;
    }

    if (teacherId !== undefined) {
      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Öğretmen atamasını yalnızca yöneticiler güncelleyebilir'
        });
      }
      const validTeacherId = await validateTeacherId(teacherId);
      if (!validTeacherId) {
        return res.status(400).json({
          success: false,
          message: 'Lütfen geçerli bir öğretmen seçin'
        });
      }
      updateData.teacherId = validTeacherId;
    }

    if (normalizedSection || parsedGrade !== null) {
      const finalGrade = parsedGrade !== null ? parsedGrade : existingClassroom.grade;
      const currentSection = extractSectionFromName(existingClassroom.name) || CLASSROOM_SECTIONS[0];
      const finalSection = normalizedSection || currentSection;
      updateData.name = buildClassName(finalGrade, finalSection);
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Güncellenecek bir alan belirtilmedi'
      });
    }

    const classroom = await prisma.classroom.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        teacher: {
          select: { id: true, name: true, email: true }
        },
        students: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Sınıf başarıyla güncellendi',
      data: classroom
    });
  } catch (error) {
    console.error('Update classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf güncellenirken hata oluştu'
    });
  }
};

const getClassroomTeachers = async (req, res) => {
  try {
    const teachers = await prisma.user.findMany({
      where: {
        roles: {
          some: {
            role: { name: 'TEACHER' }
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
      data: teachers
    });
  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğretmen listesi alınırken hata oluştu'
    });
  }
};

/**
 * Delete classroom
 * DELETE /api/classrooms/:id
 * Required roles: TEACHER, ADMIN
 * Note: Students will have classroomId set to null, related homeworks will be deleted
 */
const deleteClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    // Check if classroom exists
    const existingClassroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        students: true
      }
    });

    if (!existingClassroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check ownership (Admin can delete any)
    if (!isAdmin && existingClassroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfı silme yetkiniz yok'
      });
    }

    // Get student IDs for homework deletion
    const studentIds = existingClassroom.students.map(s => s.id);

    // Delete homeworks assigned by this teacher to students in this classroom
    if (studentIds.length > 0) {
      await prisma.homework.deleteMany({
        where: {
          studentId: { in: studentIds },
          teacherId: existingClassroom.teacherId
        }
      });
    }

    // Delete classroom (cascade will delete announcements, students' classroomId will be set to null)
    await prisma.classroom.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Sınıf başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete classroom error:', error);
    res.status(500).json({
      success: false,
      message: 'Sınıf silinirken hata oluştu'
    });
  }
};

/**
 * Add student to classroom
 * POST /api/classrooms/:id/students
 * Required roles: TEACHER, ADMIN
 * Note: Student can only be in ONE classroom, will be removed from previous
 */
const addStudentToClassroom = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentId } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    if (!studentId) {
      return res.status(400).json({
        success: false,
        message: 'Öğrenci ID gereklidir'
      });
    }

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && classroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfa öğrenci ekleme yetkiniz yok'
      });
    }

    // Check if student exists and has STUDENT role
    const student = await prisma.user.findFirst({
      where: {
        id: parseInt(studentId),
        roles: {
          some: {
            role: { name: 'STUDENT' }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci bulunamadı veya kullanıcı öğrenci değil'
      });
    }

    // Update student's classroom (removes from previous classroom automatically)
    await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: { classroomId: parseInt(id) }
    });

    // Get updated classroom
    const updatedClassroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        students: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      success: true,
      message: 'Öğrenci sınıfa eklendi',
      data: updatedClassroom
    });
  } catch (error) {
    console.error('Add student error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci eklenirken hata oluştu'
    });
  }
};

/**
 * Remove student from classroom
 * DELETE /api/classrooms/:id/students/:studentId
 * Required roles: TEACHER, ADMIN
 */
const removeStudentFromClassroom = async (req, res) => {
  try {
    const { id, studentId } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && classroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıftan öğrenci çıkarma yetkiniz yok'
      });
    }

    // Check if student is in this classroom
    const student = await prisma.user.findFirst({
      where: {
        id: parseInt(studentId),
        classroomId: parseInt(id)
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Öğrenci bu sınıfta bulunamadı'
      });
    }

    // Remove student from classroom
    await prisma.user.update({
      where: { id: parseInt(studentId) },
      data: { classroomId: null }
    });

    // Delete homeworks for this student from this teacher
    await prisma.homework.deleteMany({
      where: {
        studentId: parseInt(studentId),
        teacherId: classroom.teacherId
      }
    });

    res.json({
      success: true,
      message: 'Öğrenci sınıftan çıkarıldı'
    });
  } catch (error) {
    console.error('Remove student error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenci çıkarılırken hata oluştu'
    });
  }
};

/**
 * Get unassigned students (not in any classroom)
 * GET /api/classrooms/unassigned-students
 * Required roles: TEACHER, ADMIN
 */
const getUnassignedStudents = async (req, res) => {
  try {
    const students = await prisma.user.findMany({
      where: {
        classroomId: null,
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
    console.error('Get unassigned students error:', error);
    res.status(500).json({
      success: false,
      message: 'Öğrenciler yüklenirken hata oluştu'
    });
  }
};

/**
 * Create announcement for classroom
 * POST /api/classrooms/:id/announcements
 * Required roles: TEACHER, ADMIN
 */
const createAnnouncement = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    // Validation
    if (!title || !content) {
      return res.status(400).json({
        success: false,
        message: 'Başlık ve içerik gereklidir'
      });
    }

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && classroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfa duyuru ekleme yetkiniz yok'
      });
    }

    const announcement = await prisma.announcement.create({
      data: {
        title,
        content,
        classroomId: parseInt(id),
        createdById: userId
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Duyuru başarıyla oluşturuldu',
      data: announcement
    });
  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyuru oluşturulurken hata oluştu'
    });
  }
};

/**
 * Get announcements for classroom
 * GET /api/classrooms/:id/announcements
 * Required roles: TEACHER, ADMIN, STUDENT
 */
const getAnnouncements = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');
    const isStudent = req.userRoles?.includes('STUDENT');

    // Check if classroom exists
    const classroom = await prisma.classroom.findUnique({
      where: { id: parseInt(id) },
      include: {
        students: { select: { id: true } }
      }
    });

    if (!classroom) {
      return res.status(404).json({
        success: false,
        message: 'Sınıf bulunamadı'
      });
    }

    // Check access
    const hasAccess = isAdmin ||
                      classroom.teacherId === userId ||
                      (isStudent && classroom.students.some(s => s.id === userId));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Bu sınıfın duyurularına erişim yetkiniz yok'
      });
    }

    const announcements = await prisma.announcement.findMany({
      where: { classroomId: parseInt(id) },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: announcements
    });
  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyurular yüklenirken hata oluştu'
    });
  }
};

/**
 * Delete announcement
 * DELETE /api/classrooms/:classroomId/announcements/:announcementId
 * Required roles: TEACHER, ADMIN
 */
const deleteAnnouncement = async (req, res) => {
  try {
    const { id, announcementId } = req.params;
    const userId = req.userId;
    const isAdmin = req.userRoles?.includes('ADMIN');

    // Check if announcement exists
    const announcement = await prisma.announcement.findUnique({
      where: { id: parseInt(announcementId) },
      include: { classroom: true }
    });

    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Duyuru bulunamadı'
      });
    }

    // Check ownership
    if (!isAdmin && announcement.classroom.teacherId !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Bu duyuruyu silme yetkiniz yok'
      });
    }

    await prisma.announcement.delete({
      where: { id: parseInt(announcementId) }
    });

    res.json({
      success: true,
      message: 'Duyuru silindi'
    });
  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Duyuru silinirken hata oluştu'
    });
  }
};

module.exports = {
  createClassroom,
  getClassrooms,
  getClassroomById,
  updateClassroom,
  deleteClassroom,
  addStudentToClassroom,
  removeStudentFromClassroom,
  getUnassignedStudents,
  getClassroomTeachers,
  createAnnouncement,
  getAnnouncements,
  deleteAnnouncement
};

