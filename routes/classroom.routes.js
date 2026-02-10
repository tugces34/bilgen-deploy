/**
 * Classroom Routes
 * API endpoints for classroom management
 */

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
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
} = require('../controllers/classroom.controller');

// All routes require authentication
router.use(verifyToken);

// Get unassigned students (must be before /:id routes)
router.get('/unassigned-students', checkRole(['TEACHER', 'ADMIN']), getUnassignedStudents);
router.get('/teachers', checkRole(['TEACHER', 'ADMIN']), getClassroomTeachers);

// Classroom CRUD
router.get('/', checkRole(['TEACHER', 'ADMIN']), getClassrooms);
router.post('/', checkRole(['TEACHER', 'ADMIN']), createClassroom);
router.get('/:id', checkRole(['TEACHER', 'ADMIN', 'STUDENT']), getClassroomById);
router.put('/:id', checkRole(['TEACHER', 'ADMIN']), updateClassroom);
router.delete('/:id', checkRole(['TEACHER', 'ADMIN']), deleteClassroom);

// Student management
router.post('/:id/students', checkRole(['TEACHER', 'ADMIN']), addStudentToClassroom);
router.delete('/:id/students/:studentId', checkRole(['TEACHER', 'ADMIN']), removeStudentFromClassroom);

// Announcements
router.get('/:id/announcements', checkRole(['TEACHER', 'ADMIN', 'STUDENT']), getAnnouncements);
router.post('/:id/announcements', checkRole(['TEACHER', 'ADMIN']), createAnnouncement);
router.delete('/:id/announcements/:announcementId', checkRole(['TEACHER', 'ADMIN']), deleteAnnouncement);

module.exports = router;
