'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import UsersWorkspace from '../../../components/admin/UsersWorkspace';
import UserManagementModals from '../../../components/admin/UserManagementModals';
import { Spinner, Column, Row, Text, Button } from '@once-ui-system/core';
import CollaborationDashboard from '../../../components/CollaborationDashboard';
import SmartFilters from '../../../components/SmartFilters';
import UserRoleTemplates from '../../../components/UserRoleTemplates';
import useAppToast from '../../../hooks/useAppToast';
import useUserManagement from '../../../hooks/useUserManagement';

const UserAnalytics = dynamic(() => import('../../../components/UserAnalytics'), {
  loading: () => (
    <Column fillWidth horizontal="center" vertical="center" paddingY="48">
      <Spinner size="m" />
    </Column>
  ),
});

function AdminUsersPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const toast = useAppToast();
  const usersApi = useUserManagement({ session, toast });

  const initialTab = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(
    initialTab === 'collaboration' || initialTab === 'analytics' || initialTab === 'templates'
      ? initialTab
      : 'users'
  );

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'collaboration' || tab === 'analytics' || tab === 'templates') {
      setActiveTab(tab);
    } else {
      setActiveTab('users');
    }
  }, [searchParams]);

  const selectTab = (tab) => {
    setActiveTab(tab);
    if (tab === 'users') {
      router.replace('/admin/users');
    } else {
      router.replace(`/admin/users?tab=${tab}`);
    }
  };

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) {
      router.push('/login');
      return;
    }
    if (session.user.level < 4) {
      router.push('/dashboard');
    }
  }, [session, status, router]);

  if (status === 'loading' || !session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title={
            activeTab === 'collaboration'
              ? 'Collaboration'
              : activeTab === 'analytics'
                ? 'User analytics'
                : activeTab === 'templates'
                  ? 'Role templates'
                  : session.user.level === 4
                    ? 'School users'
                    : 'Users'
          }
          description={
            activeTab === 'collaboration'
              ? 'Share school plans with Level 3 staff'
              : session.user.level === 4
                ? 'Manage accounts and permissions for your school'
                : 'Manage accounts and permissions across all schools'
          }
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8" wrap>
              <Button size="s" onClick={usersApi.handleCreateUser}>
                Add user
              </Button>
              <Button size="s" variant="secondary" onClick={() => usersApi.setShowAdvancedModal(true)}>
                Advanced
              </Button>
              <Button size="s" variant="secondary" onClick={() => usersApi.setShowBulkModal(true)}>
                Bulk actions
              </Button>
              {session.user.level === 5 && (
                <Button size="s" variant="secondary" href="/admin/logs">
                  System logs
                </Button>
              )}
              <Button size="s" variant="secondary" onClick={() => usersApi.setShowAuditModal(true)}>
                Audit log
              </Button>
              <Button size="s" variant="secondary" onClick={() => usersApi.setShowCsvImportModal(true)}>
                Import CSV
              </Button>
            </Row>
          }
        />
      }
    >
      <UsersWorkspace
        userLevel={session.user.level}
        actor={session.user}
        activeTab={activeTab}
        onTabChange={selectTab}
        users={usersApi.users}
        filteredUsers={usersApi.filteredUsers}
        loading={usersApi.loading}
        selectedUsers={usersApi.selectedUsers}
        onToggleSelect={usersApi.toggleUserSelection}
        onEdit={usersApi.handleEditUser}
        onDelete={usersApi.handleDeleteUser}
        filters={
          <SmartFilters
            users={usersApi.users}
            onFilteredUsers={usersApi.handleFilteredUsers}
            onExportFiltered={usersApi.handleExportFiltered}
          />
        }
        analytics={<UserAnalytics users={usersApi.users} />}
        templates={<UserRoleTemplates onCreateUsers={usersApi.handleUsersCreated} />}
        collaboration={<CollaborationDashboard user={session.user} />}
      />
      <UserManagementModals {...usersApi.modals} />
    </DashboardShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense
      fallback={
        <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Loading...</Text>
        </Column>
      }
    >
      <AdminUsersPageContent />
    </Suspense>
  );
}
