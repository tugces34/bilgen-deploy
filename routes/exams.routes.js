/**
 * Exams Routes
 * API endpoints for exam management
 */

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  generateExam,
  createExam,
  getAllExams,
  getExamById,
  updateExam,
  deleteExam
} = require('../controllers/exams.controller');

// All routes require authentication
router.use(verifyToken);

// Generate exam using AI (Teacher/Admin only)
router.post('/generate', checkRole(['TEACHER', 'ADMIN']), generateExam);

// Create/Save exam (Teacher/Admin only)
router.post('/', checkRole(['TEACHER', 'ADMIN']), createExam);

// Get all exams (Teacher/Admin only)
router.get('/', checkRole(['TEACHER', 'ADMIN']), getAllExams);

// Get exam by ID (Teacher/Admin/Student)
router.get('/:id', checkRole(['TEACHER', 'ADMIN', 'STUDENT']), getExamById);

// Update exam (Teacher/Admin only)
router.put('/:id', checkRole(['TEACHER', 'ADMIN']), updateExam);

// Delete exam (Teacher/Admin only)
router.delete('/:id', checkRole(['TEACHER', 'ADMIN']), deleteExam);

module.exports = router;

