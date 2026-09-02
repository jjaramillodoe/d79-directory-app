# District 79 Consolidated School & Youth Development Plan

A comprehensive Next.js application for managing school plan submissions in NYC District 79, with MongoDB authentication and Google OAuth integration.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- MongoDB instance (local or MongoDB Atlas)
- Google Cloud Console project for OAuth

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd d79-directory
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```bash
# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/d79-directory  # Or your MongoDB Atlas URI

# NextAuth Configuration  
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here  # Generate a secure random string

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Set application type to "Web application"
6. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
7. Copy Client ID and Client Secret to your `.env.local`

### 4. Database Setup

**Option A: Local MongoDB**
```bash
# Install and start MongoDB locally
brew install mongodb/brew/mongodb-community  # macOS
sudo apt install mongodb  # Ubuntu
net start MongoDB  # Windows

# MongoDB will run on mongodb://localhost:27017
```

**Option B: MongoDB Atlas (Recommended)**
1. Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a cluster
3. Get connection string and add to `MONGODB_URI` in `.env.local`

### 5. Seed Users

```bash
npm run seed-users
```

This creates the authorized users:
- **SDorce@schools.nyc.gov** (Level 3 - Principal)
- **jjaramillo7@schools.nyc.gov** (Level 4 - Admin)

### 6. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication & Access Levels

### User Levels
- **Level 1-2**: View access only
- **Level 3**: Principals - Can create and edit forms
- **Level 4**: Admins - Full access to review and approve forms

### Access Control
- Only `@schools.nyc.gov` email addresses allowed
- Users must be pre-registered in database
- Google OAuth integration for secure authentication

## 📝 Features

### 15-Step School Plan Form
1. Table of Contents
2. Principal Letter
3. Child Abuse and Neglect Intervention
4. Student to Student Sexual Harassment
5. Respect For All Plan
6. Suicide Prevention and Crisis Intervention
7. School Attendance Plan
8. Students in Temporary Housing Program
9. Service In Schools Plan
10. Planning Interviews
11. Military Recruitment Opt-Out
12. School Culture Plan
13. After School Programs
14. Cell Phone Policy
15. School Counseling Plan

### Dashboard Features
- Form creation and management
- Progress tracking
- Admin review system
- User level-based access control

## 🛠️ API Endpoints

### Authentication
- `GET /api/auth/[...nextauth]` - NextAuth.js endpoints

### Forms
- `GET /api/forms` - Get user's forms (or all for admins)
- `POST /api/forms` - Create new form
- `GET /api/forms/[id]` - Get specific form
- `PUT /api/forms/[id]` - Update form data
- `DELETE /api/forms/[id]` - Delete form (admin only)

## 📦 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── dashboard/         # User dashboard
│   ├── login/            # Authentication
│   ├── form/             # Form creation/editing
│   └── admin/            # Admin features
├── lib/                   # Utility libraries
│   ├── mongodb.js        # Database connection
│   └── auth.js           # NextAuth configuration
├── models/               # Mongoose models
│   ├── User.js           # User model
│   └── FormSubmission.js # Form data model
└── scripts/              # Utility scripts
    └── seed-users.js     # Database seeding
```

## 🔧 Development Commands

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run seed-users   # Seed database with authorized users
```

## 🚀 Production Deployment

### Environment Variables for Production
- Set secure `NEXTAUTH_SECRET`
- Use production MongoDB URI
- Update `NEXTAUTH_URL` to your domain
- Configure Google OAuth for production domain

### Vercel Deployment (Recommended)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

## 🔒 Security Features

- Google OAuth integration
- Email domain restrictions (`@schools.nyc.gov` only)
- Session-based authentication
- Role-based access control
- CSRF protection via NextAuth.js
- Input validation and sanitization

## 📞 Support

For technical issues or access requests, contact the District 79 IT administrator.

## 🎯 Testing the Application

### Test Users (After seeding)
1. **SDorce@schools.nyc.gov** - Principal access (Level 3)
   - Can create and edit forms
   - Dashboard shows form creation options

2. **jjaramillo7@schools.nyc.gov** - Admin access (Level 4)
   - Full admin dashboard
   - Can review and approve submissions
   - Access to user management

### Test Flow
1. Visit http://localhost:3000
2. Click "Login" 
3. Sign in with Google using authorized email
4. Redirected to appropriate dashboard based on user level
5. Test form creation (Level 3+) and admin features (Level 4)

---

Built with ❤️ for NYC District 79 Schools