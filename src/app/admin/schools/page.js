'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { Spinner, Column, Text, Button } from '@once-ui-system/core';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import SchoolsWorkspace from '../../../components/admin/SchoolsWorkspace';
import useAppToast from '../../../hooks/useAppToast';
import * as logger from '../../../lib/logger';

function AdminSchoolsPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useAppToast();
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/admin/schools');
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load schools');
      }
      setSchools(data.schools || []);
    } catch (err) {
      logger.error('Error loading schools:', err);
      setError(err.message || 'Failed to load schools');
    } finally {
      setLoading(false);
    }
  }, []);

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

  useEffect(() => {
    if (session?.user?.level === 5) {
      loadSchools();
    }
  }, [session?.user?.level, loadSchools]);

  const createSchool = async (fields) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/schools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to create school');
      toast.success(`Created ${data.school.name}`);
      await loadSchools();
      return true;
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const saveSchool = async (id, fields) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/schools/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to update school');
      toast.success(`Updated ${data.school.name}`);
      await loadSchools();
      return true;
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const deleteSchool = async (id) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/schools/${id}`, { method: 'DELETE' });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Failed to delete school');
      toast.success(`Deleted ${data.name}`);
      await loadSchools();
      return true;
    } catch (err) {
      setError(err.message);
      toast.error(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  if (status === 'loading' || !session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading…</Text>
      </Column>
    );
  }

  if (session.user.level !== 5) {
    return null;
  }

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title="Schools"
          description="Add and rename District 79 schools. Only Super Admins can change this list."
          session={session}
          userLevel={session.user.level}
          actions={
            <Button size="s" variant="secondary" onClick={loadSchools} disabled={loading}>
              Refresh
            </Button>
          }
        />
      }
    >
      <SchoolsWorkspace
        schools={schools}
        loading={loading}
        saving={saving}
        error={error}
        onCreate={createSchool}
        onSave={saveSchool}
        onDelete={deleteSchool}
      />
    </DashboardShell>
  );
}

export default function AdminSchoolsPage() {
  return (
    <Suspense
      fallback={
        <Column minHeight="100vh" horizontal="center" vertical="center" background="page">
          <Spinner size="l" />
        </Column>
      }
    >
      <AdminSchoolsPageContent />
    </Suspense>
  );
}
