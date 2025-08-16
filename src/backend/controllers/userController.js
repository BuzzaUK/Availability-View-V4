const databaseService = require('../services/databaseService');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin, Manager)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', role = '' } = req.query;
    
    let users = await databaseService.getAllUsers();
    
    // Filter by search term
    if (search) {
      users = users.filter(user => {
        const fullName = `${user.name || ''} ${user.first_name || ''} ${user.last_name || ''}`.trim();
        return fullName.toLowerCase().includes(search.toLowerCase()) ||
               user.email.toLowerCase().includes(search.toLowerCase());
      });
    }
    
    // Filter by role
    if (role) {
      users = users.filter(user => user.role === role);
    }
    
    // Remove password from response
  users = users.map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  
  // Debug: Log user data to see shiftReportPreferences
  console.log('🔍 GET USERS - Response data:');
  users.forEach(user => {
    console.log(`User: ${user.name} (${user.email})`);
    console.log(`  shiftReportPreferences:`, user.shiftReportPreferences);
    console.log(`  shiftReportPreferences type:`, typeof user.shiftReportPreferences);
    if (user.shiftReportPreferences) {
      console.log(`  enabled:`, user.shiftReportPreferences.enabled);
    }
    console.log('---');
  });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;
    const paginatedUsers = users.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: paginatedUsers,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: users.length,
        pages: Math.ceil(users.length / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Get user by ID
// @route   GET /api/users/:id
// @access  Private (Admin, Manager)
const getUserById = async (req, res) => {
  try {
    const user = await databaseService.findUserById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Create new user
// @route   POST /api/users
// @access  Private (Admin)
const createUser = async (req, res) => {
  try {
    const { name, first_name, last_name, email, password, role = 'operator', isActive = true, shiftReportPreferences } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please provide email and password' 
      });
    }
    
    // Handle name field - split into first_name and last_name if provided
    let userFirstName = first_name;
    let userLastName = last_name;
    
    if (name && !first_name && !last_name) {
      const nameParts = name.split(' ');
      userFirstName = nameParts[0] || '';
      userLastName = nameParts.slice(1).join(' ') || '';
    }
    
    // Check if user already exists
    const existingUser = await databaseService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'User with this email already exists' 
      });
    }
    
    // Create user
    const newUser = await databaseService.createUser({ 
      name: `${userFirstName} ${userLastName}`.trim() || email.split('@')[0],
      email, 
      password, 
      role,
      receive_reports: shiftReportPreferences?.enabled || false,
      shiftReportPreferences: shiftReportPreferences || {
        enabled: false,
        shifts: [],
        emailFormat: 'pdf'
      }
    });
    
    // Remove password from response
    const { password: userPassword, ...userWithoutPassword } = newUser;
    
    res.status(201).json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    console.log('Update user request body:', req.body);
    const { name, first_name, last_name, email, role, isActive, shiftReportPreferences } = req.body;
    
    const user = await databaseService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    console.log('Current user data before update:', user);
    
    // Prepare update data
    const updateData = {};
    
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    
    // Handle name field
    if (name) {
      updateData.name = name;
    } else if (first_name !== undefined || last_name !== undefined) {
      updateData.name = `${first_name || ''} ${last_name || ''}`.trim();
    }
    
    if (shiftReportPreferences !== undefined) {
      updateData.receive_reports = shiftReportPreferences.enabled;
      updateData.shiftReportPreferences = shiftReportPreferences;
      console.log('Setting receive_reports to:', shiftReportPreferences.enabled);
      console.log('Setting shiftReportPreferences to:', shiftReportPreferences);
    }
    
    console.log('Update data to apply:', updateData);
    
    // Update user
    const updatedUser = await databaseService.updateUser(req.params.id, updateData);
    
    console.log('Updated user result:', updatedUser);
    
    // Remove password from response
    const { password, ...userWithoutPassword } = updatedUser;
    
    res.json({ success: true, data: userWithoutPassword });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await databaseService.findUserById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Prevent deleting the last admin
    const users = await databaseService.getAllUsers();
    const adminUsers = users.filter(u => u.role === 'admin');
    if (user.role === 'admin' && adminUsers.length === 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete the last admin user' 
      });
    }
    
    await databaseService.deleteUser(req.params.id);
    
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser
};