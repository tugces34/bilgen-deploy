/**
 * Homework Routes
 * API endpoints for homework assignment and submission
 */

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  assignHomework,
  getTeacherHomeworks,
  getStudentHomeworks,
  getHomeworkById,
  submitHomework,
  gradeHomework,
  getStudents
} = require('../controllers/homework.controller');

// All routes require authentication
router.use(verifyToken);

// Get students list (Teacher/Admin only)
router.get('/students', checkRole(['TEACHER', 'ADMIN']), getStudents);

// Assign homework to students (Teacher/Admin only)
router.post('/assign', checkRole(['TEACHER', 'ADMIN']), assignHomework);

// Get teacher's assigned homeworks (Teacher/Admin only)
router.get('/teacher', checkRole(['TEACHER', 'ADMIN']), getTeacherHomeworks);

// Get student's homeworks (Student only)
router.get('/student', checkRole(['STUDENT']), getStudentHomeworks);

// Get homework by ID (Teacher/Admin/Student)
router.get('/:id', checkRole(['TEACHER', 'ADMIN', 'STUDENT']), getHomeworkById);

// Submit homework answers (Student only)
router.patch('/:id/submit', checkRole(['STUDENT']), submitHomework);

// Grade homework (Teacher/Admin only)
router.patch('/:id/grade', checkRole(['TEACHER', 'ADMIN']), gradeHomework);

module.exports = router;

