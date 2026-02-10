const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

// Users Controller - User and Role Management

// Get all users with their roles
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        roles: {
          include: {
            role: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email,
      name: user.name,
      roles: user.roles.map(ur => ur.role.name),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }));

    res.json({
      success: true,
      users: formattedUsers
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcılar alınırken hata oluştu'
    });
  }
};

// Get all available roles
const getAllRoles = async (req, res) => {
  try {
    const roles = await prisma.role.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      roles
    });
  } catch (error) {
    console.error('Get roles error:', error);
    res.status(500).json({
      success: false,
      message: 'Roller alınırken hata oluştu'
    });
  }
};

// Create new user
const createUser = async (req, res) => {
  try {
    const { email, password, name, roles } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email ve şifre gereklidir'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Şifre en az 6 karakter olmalıdır'
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'Bu email adresi zaten kullanılıyor'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name: name || null
      }
    });

    // Assign roles if provided
    if (roles && Array.isArray(roles) && roles.length > 0) {
      // Get role IDs
      const roleRecords = await prisma.role.findMany({
        where: {
          name: {
            in: roles
          }
        }
      });

      // Create UserRole entries
      for (const roleRecord of roleRecords) {
        await prisma.userRole.create({
          data: {
            userId: user.id,
            roleId: roleRecord.id
          }
        });
      }
    }

    // Fetch user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Kullanıcı başarıyla oluşturuldu',
      user: {
        id: userWithRoles.id,
        email: userWithRoles.email,
        name: userWithRoles.name,
        roles: userWithRoles.roles.map(ur => ur.role.name)
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı oluşturulurken hata oluştu'
    });
  }
};

// Update user
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, name, password, roles } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingUser) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Prevent admin from removing their own admin role
    if (req.userId === parseInt(id) && roles && !roles.includes('ADMIN')) {
      return res.status(400).json({
        success: false,
        message: 'Kendi admin yetkilerinizi kaldıramazsınız'
      });
    }

    // Check if email is being changed and if it's already in use
    if (email && email !== existingUser.email) {
      const emailInUse = await prisma.user.findUnique({
        where: { email }
      });

      if (emailInUse) {
        return res.status(400).json({
          success: false,
          message: 'Bu email adresi zaten kullanılıyor'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (email) updateData.email = email;
    if (name !== undefined) updateData.name = name;
    if (password && password.length >= 6) {
      updateData.password = await bcrypt.hash(password, 10);
    }

    // Update user
    await prisma.user.update({
      where: { id: parseInt(id) },
      data: updateData
    });

    // Update roles if provided
    if (roles && Array.isArray(roles)) {
      // Delete existing roles
      await prisma.userRole.deleteMany({
        where: { userId: parseInt(id) }
      });

      // Add new roles
      if (roles.length > 0) {
        const roleRecords = await prisma.role.findMany({
          where: {
            name: {
              in: roles
            }
          }
        });

        for (const roleRecord of roleRecords) {
          await prisma.userRole.create({
            data: {
              userId: parseInt(id),
              roleId: roleRecord.id
            }
          });
        }
      }
    }

    // Fetch updated user with roles
    const userWithRoles = await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        roles: {
          include: {
            role: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla güncellendi',
      user: {
        id: userWithRoles.id,
        email: userWithRoles.email,
        name: userWithRoles.name,
        roles: userWithRoles.roles.map(ur => ur.role.name)
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı güncellenirken hata oluştu'
    });
  }
};

// Delete user
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Kullanıcı bulunamadı'
      });
    }

    // Prevent admin from deleting themselves
    if (req.userId === parseInt(id)) {
      return res.status(400).json({
        success: false,
        message: 'Kendi hesabınızı silemezsiniz'
      });
    }

    // Delete user (cascade will delete UserRole entries)
    await prisma.user.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Kullanıcı başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Kullanıcı silinirken hata oluştu'
    });
  }
};

// Create new role
const createRole = async (req, res) => {
  try {
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Rol adı gereklidir'
      });
    }

    // Check if role already exists
    const existingRole = await prisma.role.findUnique({
      where: { name: name.toUpperCase() }
    });

    if (existingRole) {
      return res.status(400).json({
        success: false,
        message: 'Bu rol adı zaten kullanılıyor'
      });
    }

    // Create role
    const role = await prisma.role.create({
      data: {
        name: name.toUpperCase(),
        description: description || null
      }
    });

    res.status(201).json({
      success: true,
      message: 'Rol başarıyla oluşturuldu',
      role
    });
  } catch (error) {
    console.error('Create role error:', error);
    res.status(500).json({
      success: false,
      message: 'Rol oluşturulurken hata oluştu'
    });
  }
};

// Update role
const updateRole = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // Validation
    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Rol adı gereklidir'
      });
    }

    // Check if role exists
    const existingRole = await prisma.role.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingRole) {
      return res.status(404).json({
        success: false,
        message: 'Rol bulunamadı'
      });
    }

    // Check if new name conflicts with another role
    if (name.toUpperCase() !== existingRole.name) {
      const nameConflict = await prisma.role.findUnique({
        where: { name: name.toUpperCase() }
      });

      if (nameConflict) {
        return res.status(400).json({
          success: false,
          message: 'Bu rol adı zaten kullanılıyor'
        });
      }
    }

    // Update role
    const role = await prisma.role.update({
      where: { id: parseInt(id) },
      data: {
        name: name.toUpperCase(),
        description: description || null
      }
    });

    res.json({
      success: true,
      message: 'Rol başarıyla güncellendi',
      role
    });
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({
      success: false,
      message: 'Rol güncellenirken hata oluştu'
    });
  }
};

// Delete role
const deleteRole = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if role exists
    const role = await prisma.role.findUnique({
      where: { id: parseInt(id) },
      include: {
        users: true
      }
    });

    if (!role) {
      return res.status(404).json({
        success: false,
        message: 'Rol bulunamadı'
      });
    }

    // Check if role is assigned to any users
    if (role.users.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Bu rol kullanıcılara atanmış durumda, silemezsiniz'
      });
    }

    // Delete role
    await prisma.role.delete({
      where: { id: parseInt(id) }
    });

    res.json({
      success: true,
      message: 'Rol başarıyla silindi'
    });
  } catch (error) {
    console.error('Delete role error:', error);
    res.status(500).json({
      success: false,
      message: 'Rol silinirken hata oluştu'
    });
  }
};

module.exports = {
  getAllUsers,
  getAllRoles,
  createUser,
  updateUser,
  deleteUser,
  createRole,
  updateRole,
  deleteRole
};

