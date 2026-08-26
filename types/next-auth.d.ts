/**
 * Module augmentation for the fields this app adds to the NextAuth session and JWT.
 *
 * Without this, `session.user.level` is an error to TypeScript and `any` to the editor, which
 * is a poor situation for the value every authorization check in the codebase reads. The
 * shapes below are transcribed from the `session` and `jwt` callbacks in `src/lib/auth.js`;
 * that file remains the source of truth, and this one has to be updated alongside it.
 *
 * `level` is the permission tier: 1 assistant principal, 3 assistant principal with edit
 * rights, 4 principal, 5 super admin. See `src/lib/adminRouteLevels.js` and
 * `src/lib/formAccess.js` for how it is enforced.
 */
import type { DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      level: number;
      schoolName: string | null;
      isActive: boolean;
    } & DefaultSession['user'];

    /** True while a super admin is viewing the app as another user. */
    impersonating: boolean;

    /**
     * Who is really signed in during impersonation. These stay null in a normal session, and
     * audit logging reads them so an impersonated action is attributed to the real actor
     * rather than the account being impersonated.
     */
    actorEmail: string | null;
    actorName: string | null;
    actorLevel: number | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    userId?: string;
    level?: number;
    schoolName?: string | null;
    isActive?: boolean;

    /** Set only while impersonating; deleted when impersonation ends or is disallowed. */
    impersonateEmail?: string;
    actorEmail?: string;
    actorName?: string;
    actorLevel?: number;

    /** Token id, used to revoke a specific token via the Redis denylist. */
    jti?: string;

    /** Epoch ms of the last database sync, which bounds how stale `level` can be. */
    lastSynced?: number;
  }
}
