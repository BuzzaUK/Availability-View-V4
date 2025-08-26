# Access Levels and Permissions Documentation

This document outlines the different user roles in the Asset Availability Dashboard system and their respective permissions and access levels.

## Role Hierarchy

The system uses a hierarchical role-based access control (RBAC) system with the following roles, ordered from highest to lowest privilege:

1. **Super Admin** (Level 100)
2. **Admin** (Level 80)
3. **Manager** (Level 60)
4. **Operator** (Level 40)
5. **Viewer** (Level 20)
6. **User** (Basic level)

---

## Role Definitions and Permissions

### 1. Super Admin
**Highest level of access with complete system control**

#### Frontend Access:
- **Navigation**: Access to all pages and features
- **User Management**: Full access to create, edit, delete users and assign any role including `super_admin`
- **Team Management**: Full access to all teams and team management features
- **Configuration**: Complete system configuration access
- **Analytics**: Access to all analytics and advanced analytics
- **Alerts**: Full alert management capabilities
- **Archives**: Complete access to historical data

#### Backend Permissions:
- **System Management**: Complete system administration (`manage_users`, `system_config`)
- **Data Access**: Global data visibility across all teams and users
- **User Operations**: Can create, update, delete any user including other `super_admin` users
- **Team Operations**: Full team management across all teams
- **API Access**: Access to all API endpoints without restrictions
- **Special Privileges**: Only role that can create other `super_admin` users

#### Data Visibility:
- **Scope**: Global - can see all data across the entire system
- **Teams**: Access to all teams regardless of membership
- **Users**: Can view and manage all users in the system

---

### 2. Admin
**High-level administrative access with some restrictions**

#### Frontend Access:
- **Navigation**: Access to most pages including admin sections
- **User Management**: Can create, edit, delete users but cannot create `super_admin` users
- **Team Management**: Full access to team management features
- **Configuration**: System configuration access (limited compared to super_admin)
- **Analytics**: Access to all analytics and advanced analytics
- **Alerts**: Full alert management capabilities
- **Archives**: Complete access to historical data

#### Backend Permissions:
- **System Management**: User management and most system operations
- **Data Access**: Global data visibility across all teams
- **User Operations**: Can manage users except `super_admin` creation/deletion
- **Team Operations**: Full team management capabilities
- **API Access**: Access to most API endpoints
- **Restrictions**: Cannot create `super_admin` users or delete existing `super_admin` users

#### Data Visibility:
- **Scope**: Global - can see all data across teams
- **Teams**: Access to all teams
- **Users**: Can view and manage most users (except super_admin restrictions)

---

### 3. Manager
**Mid-level management access with team-focused permissions**

#### Frontend Access:
- **Navigation**: Access to operational pages and limited admin features
- **User Management**: Can view and manage users within their teams
- **Team Management**: Can manage teams they belong to with admin/owner role
- **Configuration**: Limited configuration access (downtime reasons, shift schedules)
- **Analytics**: Full access to analytics and advanced analytics
- **Alerts**: Can manage alert thresholds and acknowledge alerts
- **Archives**: Access to historical data within their scope

#### Backend Permissions:
- **System Management**: Limited to team and user management within scope
- **Data Access**: Team-based data visibility
- **User Operations**: Can manage users within their teams
- **Team Operations**: Can manage teams where they have admin/owner role
- **API Access**: Access to team-scoped endpoints
- **Configuration**: Can modify operational settings like downtime reasons

#### Data Visibility:
- **Scope**: Team-based - limited to teams they belong to
- **Teams**: Only teams where they are members
- **Users**: Users within their accessible teams

---

### 4. Operator
**Operational access for day-to-day system interaction**

#### Frontend Access:
- **Navigation**: Access to operational pages (Dashboard, Events, Analytics)
- **User Management**: No access
- **Team Management**: Can view team information, limited member interaction
- **Configuration**: Read-only access to most configurations
- **Analytics**: Full access to analytics for their scope
- **Alerts**: Can view and acknowledge alerts
- **Archives**: Access to historical data within their scope

#### Backend Permissions:
- **System Management**: No administrative access
- **Data Access**: Team-based with operational focus
- **User Operations**: Can view user information within scope
- **Team Operations**: Limited to viewing and basic interactions
- **API Access**: Read access to most endpoints, limited write access

#### Data Visibility:
- **Scope**: Team-based - limited to assigned teams
- **Teams**: Teams they are members of
- **Users**: Limited user information within their teams

---

### 5. Viewer
**Read-only access for monitoring and reporting**

#### Frontend Access:
- **Navigation**: Access to Dashboard, Events, Analytics (read-only)
- **User Management**: No access
- **Team Management**: Can view team information only
- **Configuration**: Read-only access
- **Analytics**: Read-only access to analytics within their scope
- **Alerts**: Can view alerts but cannot manage them
- **Archives**: Read-only access to historical data

#### Backend Permissions:
- **System Management**: No administrative access
- **Data Access**: Read-only, team-based
- **User Operations**: Can view basic user information
- **Team Operations**: Read-only team information
- **API Access**: Primarily read-only endpoints

#### Data Visibility:
- **Scope**: Team-based, read-only
- **Teams**: Teams they are members of (view only)
- **Users**: Basic user information within their scope

---

### 6. User (Basic)
**Minimal access for basic system interaction**

#### Frontend Access:
- **Navigation**: Limited to Dashboard and basic operational views
- **User Management**: No access
- **Team Management**: Can view own team membership
- **Configuration**: No access
- **Analytics**: Limited access to basic analytics
- **Alerts**: Can view alerts relevant to them
- **Archives**: Limited access to own data

#### Backend Permissions:
- **System Management**: No access
- **Data Access**: Personal data only
- **User Operations**: Can view and update own profile
- **Team Operations**: Can view own team membership
- **API Access**: Very limited, mostly personal data endpoints

#### Data Visibility:
- **Scope**: Personal - only their own data
- **Teams**: Can see teams they belong to
- **Users**: Own profile information only

---

## Special Access Controls

### Team-Based Permissions
Within teams, users can have additional roles:
- **Team Owner**: Full control over the team
- **Team Admin**: Can manage team members and settings
- **Team Member**: Standard team participation
- **Team Viewer**: Read-only team access

### Navigation Menu Access
- **All Users**: Dashboard, Events, Archives, Analytics, Advanced Analytics, Alerts
- **Admin Only**: Configuration, Teams (shown in sidebar)
- **Super Admin**: All admin features plus super admin specific options

### API Endpoint Protection
- **Authentication Required**: All endpoints require valid JWT token
- **Role-Based Authorization**: Endpoints protected by `authorizeRoles` middleware
- **Enhanced Permissions**: Some endpoints use granular permission checks
- **Resource Access Control**: Data filtering based on user's team membership and role

### Data Filtering
- **Global Access**: `super_admin` and `admin` see all data
- **Team-Based**: Other roles see data filtered by their team memberships
- **Personal**: Some roles limited to their own data only

---

## Security Notes

1. **JWT Token**: All access requires valid authentication token
2. **Role Hierarchy**: Higher roles inherit permissions of lower roles
3. **Team Membership**: Team-based roles provide additional context-specific permissions
4. **Resource Ownership**: Users can typically access resources they own regardless of team restrictions
5. **Permission Inheritance**: Team permissions can be inherited and overridden at individual level

---

## Default Credentials

For initial system access:
- **Email**: admin@example.com
- **Password**: admin123
- **Role**: super_admin

*Note: Change default credentials immediately after first login for security.*