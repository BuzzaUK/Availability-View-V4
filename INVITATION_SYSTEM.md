# Invitation System Implementation

## Overview
A complete user invitation system has been implemented for the Industrial Asset Monitoring Dashboard. This system allows administrators to invite new users via email, who can then accept the invitation and automatically join the platform.

## Backend Implementation

### 1. Database Model
- **Invitation Model** (`src/backend/models/database/Invitation.js`)
  - Fields: `id`, `email`, `role`, `token_hash`, `expires_at`, `invited_by_user_id`, `accepted_at`, `status`, `receive_shift_reports`, `metadata`
  - Associations: Belongs to User (invited_by_user_id)

### 2. Controller (`src/backend/controllers/invitationController.js`)
- **sendInvitation**: Creates invitation record, generates secure token, sends email
- **acceptInvitation**: Validates token, creates user account, marks invitation as accepted
- **verifyInvitation**: Checks if invitation token is valid and not expired
- **getPendingInvitations**: Lists all pending invitations for admin/manager
- **cancelInvitation**: Marks invitation as cancelled

### 3. Routes (`src/backend/routes/invitationRoutes.js`)
- `GET /api/invitations/verify/:token` - Verify invitation token (public)
- `POST /api/invitations/accept` - Accept invitation and create user (public)
- `POST /api/invitations/send` - Send new invitation (admin only)
- `GET /api/invitations` - List pending invitations (admin/manager)
- `DELETE /api/invitations/:id` - Cancel invitation (admin only)

### 4. Server Integration (`src/backend/server.js`)
- Routes mounted at `/api/invitations`
- Import: `const invitationRoutes = require('./routes/invitationRoutes');`

## Frontend Implementation

### 1. AcceptInvitation Component (`src/frontend/src/components/auth/AcceptInvitation.js`)
- Handles invitation acceptance flow
- Verifies token and email from URL parameters
- Allows user to set name and password
- Automatically logs in user after successful acceptance
- Uses `loginWithToken` from AuthContext for seamless login

### 2. UserManagement Integration (`src/frontend/src/components/config/UserManagement.js`)
- **Invite User Button**: Opens invitation dialog
- **Invitation Dialog**: Form to send invitations (email, role, shift reports)
- **Pending Invitations Table**: Shows all pending invitations with cancel option
- Functions:
  - `handleSendInvitation`: Sends invitation via API
  - `handleCancelInvitation`: Cancels pending invitation
  - `fetchPendingInvitations`: Loads pending invitations list

### 3. AuthContext Enhancement (`src/frontend/src/context/AuthContext.js`)
- Added `loginWithToken` method for JWT-based login
- Used by AcceptInvitation component for auto-login

### 4. App Routing (`src/frontend/src/App.js`)
- Route: `/accept-invitation` → `AcceptInvitation` component
- Import: `import AcceptInvitation from './components/auth/AcceptInvitation';`

## Features

### Security
- Secure token generation using crypto.randomBytes
- Token hashing with SHA-256 before storage
- Configurable token expiration (default: 7 days)
- Role-based access control for invitation management

### Email Integration
- Uses existing `sendEmail` utility
- Professional invitation email template
- Includes secure invitation link with token and email
- Link format: `${frontendUrl}/accept-invitation?token=${token}&email=${email}`

### User Experience
- Clean, intuitive invitation dialog in UserManagement
- Real-time pending invitations list
- Automatic login after invitation acceptance
- Form validation and error handling
- Success/error notifications

### Administrative Features
- Admin-only invitation sending
- Manager/Admin can view pending invitations
- Admin can cancel pending invitations
- Integration with existing user management workflow

## Usage

### Sending Invitations
1. Navigate to Config → User Management
2. Click "Invite User" button
3. Fill in email, role, and shift report preferences
4. Click "Send Invitation"
5. Invitation email is sent automatically

### Accepting Invitations
1. User receives email with invitation link
2. Click link to open acceptance page
3. Set name and password
4. Click "Accept Invitation"
5. Automatically logged in and redirected to dashboard

### Managing Invitations
- View pending invitations in the UserManagement component
- Cancel invitations that are no longer needed
- Track invitation status and expiration

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/invitations/send` | Send invitation | Admin |
| GET | `/api/invitations` | List pending invitations | Admin/Manager |
| DELETE | `/api/invitations/:id` | Cancel invitation | Admin |
| GET | `/api/invitations/verify/:token` | Verify token | Public |
| POST | `/api/invitations/accept` | Accept invitation | Public |

## Dependencies
- `crypto` - Secure token generation
- `bcryptjs` - Password hashing
- Existing `sendEmail` utility
- Existing authentication middleware
- Sequelize models (User, Invitation)

This implementation provides a complete, secure, and user-friendly invitation system that integrates seamlessly with the existing application architecture.