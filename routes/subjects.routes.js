const express = require('express');
const router = express.Router();
const {
  getSubjects,
  getSubjectNames,
  getUnits,
  getTopics,
  getGradesBySubject,
  createSubject
} = require('../controllers/subjects.controller');

// Get all subjects (with optional filtering)
router.get('/', getSubjects);

// Get distinct subject names
router.get('/names', getSubjectNames);

// Get units by grade and subject
router.get('/units', getUnits);

// Get topics by grade, subject, and unit
router.get('/topics', getTopics);

// Get grades by subject
router.get('/grades', getGradesBySubject);

// Create new subject
router.post('/', createSubject);

module.exports = router;
