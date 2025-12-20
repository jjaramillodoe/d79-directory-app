const GoogleProvider = require('next-auth/providers/google').default;
const { MongoDBAdapter } = require('@next-auth/mongodb-adapter');
const { clientPromise } = require('./mongodb');
const connectDB = require('./mongodb');
const User = require('../models/User');

const authOptions = {
  // Remove MongoDBAdapter - we'll manage users ourselves
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Only allow @schools.nyc.gov email addresses
      if (!user.email || !user.email.endsWith('@schools.nyc.gov')) {
        console.log('Sign in rejected: Invalid email domain', user.email);
        return false;
      }

      try {
        await connectDB();
        
        // Check if user exists in our User model
        let dbUser = await User.findOne({ email: user.email.toLowerCase() });
        
        if (!dbUser) {
          console.log('User not found in database:', user.email);
          return false; // Only allow pre-registered users
        }

        // Update last login
        dbUser.lastLogin = new Date();
        await dbUser.save();

        // Log the login (async, don't wait for it)
        const { logLogin } = require('./auditLogger');
        logLogin(dbUser).catch(err => console.error('Error logging login:', err));

        console.log('Sign in successful for:', user.email, 'Level:', dbUser.level);
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      // Pass data from token to session
      if (token) {
        session.user.id = token.userId;
        session.user.level = token.level;
        session.user.schoolName = token.schoolName;
        session.user.isActive = token.isActive;
      }
      return session;
    },
    async jwt({ token, user, account, profile }) {
      // When user first signs in, add our custom data to the token
      if (account && user) {
        try {
          await connectDB();
          const dbUser = await User.findOne({ email: user.email.toLowerCase() });
          if (dbUser) {
            token.level = dbUser.level;
            token.schoolName = dbUser.schoolName;
            token.isActive = dbUser.isActive;
            token.userId = dbUser._id.toString();
          }
        } catch (error) {
          console.error('Error in jwt callback:', error);
        }
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt', // Change from database to jwt strategy
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'your-secret-key-here',
};

module.exports = { authOptions };