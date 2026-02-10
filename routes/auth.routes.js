const express = require('express');
const { login, getProfile } = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

const router = express.Router();

// POST /api/auth/login
router.post('/login', login);

// GET /api/auth/profile
router.get('/profile', verifyToken, getProfile);

module.exports = router;
