# Asset Logger System - Availability Framework V2

A comprehensive IoT asset monitoring system with multi-user support, real-time data collection, and web-based dashboard.

## 🚀 Features

- **Multi-User Support**: Complete user isolation with role-based access control
- **Real-time Monitoring**: Live asset status tracking with WebSocket connections
- **ESP32 Integration**: Hardware logger support with automatic registration
- **Web Dashboard**: Modern React-based interface for data visualization
- **Data Analytics**: Historical data analysis and reporting
- **User Management**: Admin controls for user and logger management
- **Secure Authentication**: JWT-based authentication with role permissions

## 🏗️ Architecture

### Backend (Node.js/Express)
- RESTful API with JWT authentication
- In-memory database for rapid development
- WebSocket support for real-time updates
- Role-based authorization middleware
- Comprehensive logging and error handling

### Frontend (React)
- Modern responsive UI with Material-UI components
- Real-time dashboard with live updates
- User authentication and session management
- Multi-context state management
- Protected routes and role-based access

### Hardware (ESP32)
- Automatic logger registration
- Real-time asset status reporting
- WiFi connectivity with auto-reconnection
- OLED display for local status monitoring
- Configurable reporting intervals

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Git

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/BuzzaUK/Availability-Framework-V2.git
   cd Availability-Framework-V2
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install
   
   # Install backend dependencies
   cd src/backend
   npm install
   
   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Start the application**
   ```bash
   # Start backend (from src/backend directory)
   node server.js
   
   # Start frontend (from src/frontend directory)
   npm start
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000

### Default Login Credentials
- **Admin**: admin@example.com / admin123
- **Test User**: simon@example.com / simon123

## 📱 ESP32 Setup

1. **Hardware Requirements**
   - ESP32 development board
   - OLED display (optional)
   - WiFi network access

2. **Firmware Installation**
   - Open `ESP32_AssetLogger_Enhanced.ino` in Arduino IDE
   - Configure WiFi credentials
   - Set server endpoint
   - Upload to ESP32

3. **Logger Registration**
   - Logger automatically registers on first connection
   - Assign to user account via web interface
   - Configure asset monitoring parameters

## 🔧 Configuration

### Environment Variables
Create `.env` files in backend directory:
```env
PORT=5000
JWT_SECRET=your_jwt_secret_here
NODE_ENV=development
```

### User Roles
- **Admin**: Full system access, user management
- **Manager**: Asset and logger management
- **Operator**: Limited asset management
- **Viewer**: Read-only access

## 📊 API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Asset Management
- `GET /api/assets` - Get user's assets
- `POST /api/assets` - Create new asset
- `PUT /api/assets/:id` - Update asset
- `DELETE /api/assets/:id` - Delete asset

### Logger Management
- `GET /api/loggers` - Get user's loggers
- `POST /api/loggers/register` - Register new logger
- `PUT /api/loggers/:id` - Update logger settings

### Events & Analytics
- `GET /api/events` - Get asset events
- `GET /api/analytics` - Get analytics data
- `GET /api/reports` - Generate reports

## 🔒 Security Features

- JWT token-based authentication
- Role-based access control
- User data isolation
- Secure password hashing
- Input validation and sanitization
- CORS protection

## 🚀 Deployment

### Production Deployment
1. Set environment variables for production
2. Build frontend for production: `npm run build`
3. Configure reverse proxy (nginx recommended)
4. Set up SSL certificates
5. Configure database (migrate from in-memory to persistent)

### Docker Support
Docker configuration files are available for containerized deployment.

## 📈 Monitoring & Analytics

The system provides comprehensive monitoring capabilities:
- Real-time asset status tracking
- Historical data analysis
- Performance metrics
- User activity logs
- System health monitoring

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation in the `/docs` folder
- Review the troubleshooting guide

## 🔄 Version History

- **v2.0.0** - Multi-user support, enhanced security, improved UI
- **v1.5.0** - ESP32 integration, real-time monitoring
- **v1.0.0** - Initial release with basic asset tracking

---

**Built with ❤️ for industrial IoT monitoring**