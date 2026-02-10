const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  generateNewImage,
  convertToLineArt,
  getImages,
  getImageById,
  approveImage,
  rejectImage
} = require('../controllers/images.controller');

// Generate new image - Requires TEACHER or ADMIN role
router.post('/generate', verifyToken, checkRole(['TEACHER', 'ADMIN']), generateNewImage);

// Convert existing image to line art - Requires TEACHER or ADMIN role
router.post('/:id/convert-to-lineart', verifyToken, checkRole(['TEACHER', 'ADMIN']), convertToLineArt);

// Get all images (with optional status filter) - Anyone can view
router.get('/', getImages);

// Get single image by ID - Anyone can view
router.get('/:id', getImageById);

// Approve image - Requires TEACHER or ADMIN role
router.patch('/:id/approve', verifyToken, checkRole(['TEACHER', 'ADMIN']), approveImage);

// Reject and delete image - Requires TEACHER or ADMIN role
router.delete('/:id/reject', verifyToken, checkRole(['TEACHER', 'ADMIN']), rejectImage);

module.exports = router;
