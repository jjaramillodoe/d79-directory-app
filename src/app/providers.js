'use client';

import { SessionProvider } from 'next-auth/react';
import { OnceUIProviders } from '../components/OnceUIProviders';
import ImpersonationBanner from '../components/dashboard/ImpersonationBanner';

export function Providers({ children }) {
  return (
    <SessionProvider refetchInterval={15 * 60} refetchOnWindowFocus>
      <OnceUIProviders>
        <ImpersonationBanner />
        {children}
      </OnceUIProviders>
    </SessionProvider>
  );
}