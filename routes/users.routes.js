const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../middleware/auth.middleware');
const {
  getAllUsers,
  getAllRoles,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole
} = require('../controllers/users.controller');

// All user management endpoints require ADMIN role

// Get all users with their roles
router.get('/', verifyToken, checkRole(['ADMIN']), getAllUsers);

// Get all available roles
router.get('/roles', verifyToken, checkRole(['ADMIN']), getAllRoles);

// Create new user
router.post('/', verifyToken, checkRole(['ADMIN']), createUser);

// Update user
router.put('/:id', verifyToken, checkRole(['ADMIN']), updateUser);

// Delete user
router.delete('/:id', verifyToken, checkRole(['ADMIN']), deleteUser);

// Role management routes
// Create new role
router.post('/roles', verifyToken, checkRole(['ADMIN']), createRole);

// Update role
router.put('/roles/:id', verifyToken, checkRole(['ADMIN']), updateRole);

// Delete role
router.delete('/roles/:id', verifyToken, checkRole(['ADMIN']), deleteRole);

module.exports = router;

