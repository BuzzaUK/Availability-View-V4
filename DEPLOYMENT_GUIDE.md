# ESP32 Asset Monitor - Deployment Guide

## Overview

This application uses a unified database architecture:
- **Development**: SQLite (local file-based database)
- **Production**: PostgreSQL (Heroku Postgres)

## Local Development Setup

### 1. Install Dependencies
```bash
npm run install:all
```

### 2. Initialize Database
```bash
npm run db:init
```

### 3. Start Development Server
```bash
npm run dev:full
```

The application will:
- Use SQLite database (`database.sqlite`)
- Create admin user (email: `admin@example.com`, password: `admin123`)
- Create ESP32_001 logger
- Start both backend (port 5000) and frontend (port 3000)

## Database Management Commands

### Initialize Database
```bash
npm run db:init
```
Creates tables and essential data (admin user, default logger, settings).

### Reset Database
```bash
npm run db:reset
```
Completely resets the database (deletes SQLite file or drops all PostgreSQL tables).

### Debug Database
```bash
npm run db:debug
```
Shows all assets, loggers, and users in the database.

### Check Pin Numbers
```bash
npm run db:check-pins
```
Lists all used pin numbers and suggests available ones.

## Heroku Deployment

### 1. Prerequisites
- Heroku CLI installed
- Git repository initialized

### 2. Create Heroku App
```bash
heroku create your-app-name
```

### 3. Add PostgreSQL Add-on
```bash
heroku addons:create heroku-postgresql:mini
```

### 4. Set Environment Variables
```bash
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=your-super-secret-jwt-key
heroku config:set ADMIN_EMAIL=admin@example.com
heroku config:set ADMIN_PASSWORD=your-secure-password
```

### 5. Deploy
```bash
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

The deployment will:
- Automatically install dependencies
- Build the React frontend
- Initialize PostgreSQL database
- Create admin user and default logger

### 6. Verify Deployment
```bash
heroku logs --tail
heroku open
```

## Environment Variables

### Required for Production
- `NODE_ENV=production`
- `JWT_SECRET` - Secret key for JWT tokens
- `DATABASE_URL` - Automatically set by Heroku Postgres

### Optional
- `ADMIN_EMAIL` - Admin user email (default: admin@example.com)
- `ADMIN_PASSWORD` - Admin user password (default: admin123)
- `EMAIL_HOST` - SMTP server for notifications
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASSWORD` - SMTP password

## Database Schema

The application automatically creates these tables:

### Users
- Admin user management
- Role-based access control

### Loggers
- ESP32 device registration
- Status tracking

### Assets
- Industrial equipment monitoring
- Pin number assignments

### Events
- Asset state changes
- Historical tracking

### Shifts
- Work shift management
- Performance metrics

### Settings
- Application configuration
- Notification preferences

## Troubleshooting

### Database Connection Issues

**Development (SQLite)**:
```bash
# Reset database
npm run db:reset

# Check database contents
npm run db:debug
```

**Production (PostgreSQL)**:
```bash
# Check Heroku logs
heroku logs --tail

# Reset database
heroku run npm run db:reset

# Check database status
heroku pg:info
```

### Common Issues

1. **"Pin Already Exists" Error**
   - Run `npm run db:debug` to see existing assets
   - Use `npm run db:check-pins` to find available pin numbers

2. **Database Not Initialized**
   - Run `npm run db:init` to create tables and essential data

3. **Heroku Deployment Fails**
   - Ensure PostgreSQL add-on is attached
   - Check environment variables are set
   - Review build logs: `heroku logs --tail`

## Performance Considerations

### SQLite (Development)
- Single file database
- No concurrent writes
- Perfect for development and testing

### PostgreSQL (Production)
- Concurrent connections
- ACID compliance
- Automatic backups on Heroku
- Scalable for production use

## Security Notes

1. Change default admin password in production
2. Use strong JWT secret
3. Enable SSL in production (automatic on Heroku)
4. Regularly update dependencies
5. Monitor database access logs

## Monitoring

### Health Check