const GoogleProvider = require('next-auth/providers/google').default;
const { randomUUID } = require('crypto');
const connectDB = require('./mongodb');
const User = require('../models/User');
const { denyToken, isTokenDenied } = require('./redis');

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error('NEXTAUTH_SECRET is required');
}

const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      authorization: {
        params: {
          hd: 'schools.nyc.gov',
          prompt: 'select_account',
          scope: 'openid email profile',
        },
      },
      checks: ['pkce', 'state', 'nonce'],
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email || !user.email.endsWith('@schools.nyc.gov')) {
        return false;
      }

      try {
        await connectDB();
        const dbUser = await User.findOne({ email: user.email.toLowerCase() });
        if (!dbUser || dbUser.isActive === false) {
          return false;
        }

        dbUser.lastLogin = new Date();
        await dbUser.save();

        const { logLogin } = require('./auditLogger');
        logLogin(dbUser).catch((err) => console.error('Error logging login:', err));
        return true;
      } catch (error) {
        console.error('Error during sign in:', error);
        return false;
      }
    },
    async session({ session, token }) {
      if (!token?.userId || token.isActive === false || Number(token.level) < 1) {
        return null;
      }
      session.user.id = token.userId;
      session.user.name = token.name || session.user.name;
      session.user.email = token.email;
      session.user.level = token.level;
      session.user.schoolName = token.schoolName;
      session.user.isActive = token.isActive;
      session.impersonating = Boolean(token.impersonateEmail);
      session.actorEmail = token.actorEmail || null;
      session.actorName = token.actorName || null;
      session.actorLevel = token.actorLevel || null;
      return session;
    },
    async jwt({ token, user, trigger, session }) {
      const actorEmail = (token.actorEmail || user?.email || token.email || '').toLowerCase();
      if (!actorEmail) return null;
      if (!token.jti) token.jti = randomUUID();
      if (await isTokenDenied(token.jti)) return null;

      if (trigger === 'update') {
        if (session?.stopImpersonation || session?.impersonateEmail === null) {
          delete token.impersonateEmail;
        } else if (session?.impersonateEmail) {
          token.impersonateEmail = String(session.impersonateEmail).toLowerCase();
        }
      }

      const syncedAt = Number(token.lastSynced) || 0;
      const stale = Date.now() - syncedAt > 15 * 60 * 1000;
      const mustReload = Boolean(user) || trigger === 'update' || stale || !token.userId;
      if (!mustReload && token.isActive !== false) {
        return token;
      }

      try {
        await connectDB();
        const actor = await User.findOne({ email: actorEmail });
        if (!actor || actor.isActive === false) {
          return null;
        }

        token.actorEmail = actor.email;
        token.actorName = actor.name;
        token.actorLevel = actor.level;

        let dbUser = actor;
        if (token.impersonateEmail && Number(actor.level) === 5) {
          const target = await User.findOne({ email: token.impersonateEmail });
          if (target && target.isActive !== false && Number(target.level) < 5) {
            dbUser = target;
          } else {
            delete token.impersonateEmail;
          }
        } else {
          delete token.impersonateEmail;
        }

        token.email = dbUser.email;
        token.name = dbUser.name;
        token.level = dbUser.level;
        token.schoolName = dbUser.schoolName;
        token.isActive = dbUser.isActive;
        token.userId = dbUser._id.toString();
        token.lastSynced = Date.now();
      } catch (error) {
        console.error('Error in jwt callback:', error);
      }
      return token;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60,
    updateAge: 15 * 60,
  },
  secret: process.env.NEXTAUTH_SECRET,
  useSecureCookies: String(process.env.NEXTAUTH_URL || '').startsWith('https://'),
  events: {
    async signOut({ token }) {
      if (token?.jti) {
        await denyToken(token.jti, token.exp).catch(() => {});
      }
    },
  },
};

module.exports = { authOptions };
