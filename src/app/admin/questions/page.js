'use client';

import { useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Loader2 } from 'lucide-react';
import QuestionsWorkspace from '../../../components/admin/QuestionsWorkspace';

function AdminQuestionsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.level !== 5) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading question bank...</p>
        </div>
      </div>
    );
  }

  if (session.user.level !== 5) return null;

  return <QuestionsWorkspace session={session} />;
}

export default function AdminQuestionsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      }
    >
      <AdminQuestionsPageContent />
    </Suspense>
  );
}
