# Marathon Training Web Application

## Overview
A comprehensive web application for tracking and managing marathon training programs. This application helps runners plan their training schedules, track progress, and achieve their marathon goals.

## Project Structure
```
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   └── components/
├── backend/
│   ├── server.js
│   └── routes/
└── database/
    └── schema.js
```

## Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn package manager

## Setup Instructions

1. Clone the repository:
```bash
git clone https://github.com/your-username/marathon-training-app.git
cd marathon-training-app
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Environment Configuration:
Create `.env` files in both frontend and backend directories:

Backend (.env):
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/marathon-training
JWT_SECRET=your-secret-key
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:5000
```

4. Start the application:
```bash
# Start backend server
cd backend
npm run start

# Start frontend development server
cd frontend
npm start
```

## Features
- User authentication and profile management
- Training plan creation and customization
- Progress tracking and analytics
- Performance metrics visualization
- Training schedule management
- Goal setting and achievement tracking

## API Documentation
Base URL: `http://localhost:5000/api`

### Endpoints
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /training-plans` - Fetch training plans
- `POST /training-plans` - Create training plan
- `PUT /training-plans/:id` - Update training plan
- `DELETE /training-plans/:id` - Delete training plan

## Testing
```bash
# Run backend tests
cd backend
npm test

# Run frontend tests
cd frontend
npm test
```

## Deployment
Instructions for deploying to production environment:

1. Build frontend:
```bash
cd frontend
npm run build
```

2. Configure production environment variables
3. Set up MongoDB production database
4. Deploy using your preferred hosting service

## Contributing
1. Fork the repository
2. Create a feature branch
3. Commit changes
4. Push to the branch
5. Create a Pull Request

## License
MIT License

## Support
For support or questions, please open an issue in the repository.