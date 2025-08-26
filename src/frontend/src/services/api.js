import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:5000/api',
  timeout: 100000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Team API functions
export const teamAPI = {
  // Get all teams
  getTeams: () => api.get('/teams'),
  
  // Get team by ID
  getTeam: (id) => api.get(`/teams/${id}`),
  
  // Create new team
  createTeam: (teamData) => api.post('/teams', teamData),
  
  // Update team
  updateTeam: (id, teamData) => api.put(`/teams/${id}`, teamData),
  
  // Delete team
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  
  // Get team members
  getTeamMembers: (teamId) => api.get(`/teams/${teamId}/members`),
  
  // Add team member
  addTeamMember: (teamId, memberData) => api.post(`/teams/${teamId}/members`, memberData),
  
  // Update team member
  updateTeamMember: (teamId, memberId, memberData) => api.put(`/teams/${teamId}/members/${memberId}`, memberData),
  
  // Remove team member
  removeTeamMember: (teamId, memberId) => api.delete(`/teams/${teamId}/members/${memberId}`),
  
  // Invite user to team
  inviteToTeam: (teamId, inviteData) => api.post(`/teams/${teamId}/invite`, inviteData),
  
  // Accept team invitation
  acceptInvitation: (token) => api.post(`/teams/accept-invitation/${token}`),
  
  // Get user's teams
  getUserTeams: () => api.get('/teams/my-teams')
};

// Shift Pattern API functions
export const shiftPatternAPI = {
  // Get all shift patterns
  getShiftPatterns: (params) => api.get('/shift-patterns', { params }),
  
  // Get shift pattern by ID
  getShiftPattern: (id) => api.get(`/shift-patterns/${id}`),
  
  // Create new shift pattern
  createShiftPattern: (patternData) => api.post('/shift-patterns', patternData),
  
  // Update shift pattern
  updateShiftPattern: (id, patternData) => api.put(`/shift-patterns/${id}`, patternData),
  
  // Delete shift pattern
  deleteShiftPattern: (id, confirmationData) => api.delete(`/shift-patterns/${id}`, { data: confirmationData }),
  
  // Assign shift pattern to team
  assignToTeam: (patternId, teamId, assignmentData) => api.post(`/shift-patterns/${patternId}/assign/${teamId}`, assignmentData),
  
  // Remove shift pattern from team
  removeFromTeam: (patternId, teamId) => api.delete(`/shift-patterns/${patternId}/assign/${teamId}`),
  
  // Get team shift assignments
  getTeamAssignments: (teamId, params) => api.get(`/teams/${teamId}/shift-assignments`, { params })
};

// User API functions
export const userAPI = {
  // Get all users
  getUsers: (params) => api.get('/users', { params }),
  
  // Get user by ID
  getUser: (id) => api.get(`/users/${id}`),
  
  // Create user
  createUser: (userData) => api.post('/users', userData),
  
  // Update user
  updateUser: (id, userData) => api.put(`/users/${id}`, userData),
  
  // Delete user
  deleteUser: (id) => api.delete(`/users/${id}`),
  
  // Get current user
  getCurrentUser: () => api.get('/users/me'),
  
  // Update current user
  updateCurrentUser: (userData) => api.put('/users/me', userData)
};

export default api;