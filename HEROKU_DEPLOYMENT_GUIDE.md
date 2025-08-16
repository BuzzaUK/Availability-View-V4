# Heroku Deployment Guide

## Prerequisites

1. **Install Heroku CLI**: Download from https://devcenter.heroku.com/articles/heroku-cli
2. **Git**: Ensure Git is installed and your project is in a Git repository
3. **Heroku Account**: Sign up at https://heroku.com

## Step-by-Step Deployment

### 1. Login to Heroku
```bash
heroku login
```

### 2. Create a New Heroku App
```bash
heroku create your-app-name
```
Replace `your-app-name` with your desired app name (must be unique).

### 3. Add PostgreSQL Database
```bash
heroku addons:create heroku-postgresql:mini
```

### 4. Set Environment Variables
```bash
# Required environment variables
heroku config:set NODE_ENV=production
heroku config:set JWT_SECRET=availability-view-super-secret-jwt-key-2024-production
heroku config:set ESP32_API_KEY=esp32-availability-view-api-key-2024-production

# Email configuration (update with your settings)
heroku config:set EMAIL_HOST=smtp.gmail.com
heroku config:set EMAIL_PORT=587
heroku config:set EMAIL_USER=availabilityview@gmail.com
heroku config:set EMAIL_PASSWORD=your-email-password
heroku config:set EMAIL_FROM="Availability View <availabilityview@gmail.com>"

# AWS S3 configuration (optional, update with your settings)
heroku config:set AWS_ACCESS_KEY_ID=your-aws-access-key
heroku config:set AWS_SECRET_ACCESS_KEY=your-aws-secret-key
heroku config:set AWS_REGION=us-east-1
heroku config:set AWS_S3_BUCKET=your-s3-bucket-name

# App configuration
heroku config:set DATA_RETENTION_DAYS=90
heroku config:set AUTO_SHIFT_DETECTION=true
# SHIFT_TIMES no longer needed - now configured via notification settings in the application

# Frontend URL (replace with your actual Heroku app URL)
heroku config:set FRONTEND_URL=https://your-app-name.herokuapp.com
```

### 5. Deploy to Heroku
```bash
# Add all changes to git
git add .
git commit -m "Prepare for Heroku deployment"

# Push to Heroku
git push heroku main
```

### 6. Open Your App
```bash
heroku open
```

## Important Notes

### Database
- Heroku automatically sets the `DATABASE_URL` environment variable
- The app will automatically use PostgreSQL in production
- Your local SQLite database won't be deployed (this is intentional)

### Environment Variables
- Update the email and AWS credentials with your actual production values
- The `JWT_SECRET` should be a strong, unique secret for production
- The `ESP32_API_KEY` should be different from your development key

### ESP32 Configuration
- Update your ESP32 devices to point to your Heroku app URL instead of localhost
- Example: `https://your-app-name.herokuapp.com/api/device/register`

### Monitoring
```bash
# View logs
heroku logs --tail

# Check app status
heroku ps

# Access Heroku dashboard
heroku dashboard
```

## Development vs Production

### Development (Local)
- Frontend runs on port 3001
- Backend runs on port 5001
- Uses SQLite database
- Proxy configuration handles API calls

### Production (Heroku)
- Single server serves both frontend and backend
- Uses PostgreSQL database
- Frontend built as static files
- All API calls go to the same domain

## Troubleshooting

### Build Failures
```bash
# Check build logs
heroku logs --tail

# Restart the app
heroku restart
```

### Database Issues
```bash
# Check database connection
heroku pg:info

# Access database console
heroku pg:psql
```

### Environment Variables
```bash
# List all config vars
heroku config

# Set a specific variable
heroku config:set VARIABLE_NAME=value

# Remove a variable
heroku config:unset VARIABLE_NAME
```

## Maintaining Development Environment

Your local development setup remains unchanged:
1. Run backend: `cd src/backend && PORT=5001 npm start`
2. Run frontend: `cd src/frontend && npm start`
3. The setupProxy.js file handles API routing in development
4. All your current functionality will continue to work locally

## Post-Deployment Checklist

- [ ] App loads successfully at your Heroku URL
- [ ] Login functionality works
- [ ] Dashboard displays correctly
- [ ] ESP32 devices can connect (update their configuration)
- [ ] Shift filtering and event archiving features work
- [ ] Database operations function properly
- [ ] Email notifications work (if configured)

## Updating Your App

To deploy updates:
```bash
git add .
git commit -m "Your update message"
git push heroku main
```

The app will automatically rebuild and redeploy.