import NextAuth from 'next-auth';
import { authOptions } from '../../../../lib/auth';

const handler = NextAuth(authOptions);

// Export named exports for Next.js 16
export { handler as GET, handler as POST };