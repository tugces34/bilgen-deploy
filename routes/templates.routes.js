const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate
} = require('../controllers/templates.controller');

// Get all templates - Anyone can view
router.get('/', getTemplates);

// Create new template - Only ADMIN
router.post('/', verifyToken, checkRole(['ADMIN']), createTemplate);

// Update template - Only ADMIN
router.put('/:id', verifyToken, checkRole(['ADMIN']), updateTemplate);

// Delete template - Only ADMIN
router.delete('/:id', verifyToken, checkRole(['ADMIN']), deleteTemplate);

module.exports = router;
