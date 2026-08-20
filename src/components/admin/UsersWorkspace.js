'use client';

import { useMemo, useState } from 'react';
import {
  Column,
  Row,
  Text,
  Button,
  Spinner,
  Grid,
  SegmentedControl,
} from '@once-ui-system/core';
import StatCard from '../dashboard/StatCard';
import DashboardSection from '../dashboard/DashboardSection';
import UsersTable, { downloadUsersCsv } from './UsersTable';

function neverSignedIn(user) {
  return !user.lastLogin;
}

function staleLogin(user) {
  if (!user.lastLogin) return false;
  const diffDays = Math.floor((Date.now() - new Date(user.lastLogin).getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 30;
}

export default function UsersWorkspace({
  userLevel,
  actor,
  activeTab,
  onTabChange,
  users,
  filteredUsers,
  loading,
  selectedUsers,
  onToggleSelect,
  onEdit,
  onDelete,
  filters,
  analytics,
  templates,
  collaboration,
}) {
  const [loginFilter, setLoginFilter] = useState('all');

  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    principals: users.filter((u) => u.level === 3).length,
    neverSignedIn: users.filter(neverSignedIn).length,
    admin: users.filter((u) => u.level === 4).length,
    superAdmin: users.filter((u) => u.level === 5).length,
  };

  const visibleUsers = useMemo(() => {
    if (loginFilter === 'never') return filteredUsers.filter(neverSignedIn);
    if (loginFilter === 'stale') return filteredUsers.filter(staleLogin);
    return filteredUsers;
  }, [filteredUsers, loginFilter]);

  const toggleLoginFilter = (next) => {
    setLoginFilter((current) => (current === next ? 'all' : next));
  };

  return (
    <Column gap="24" fillWidth>
      <SegmentedControl
        buttons={[
          { value: 'users', label: userLevel === 4 ? 'School users' : 'Users' },
          { value: 'analytics', label: 'Analytics' },
          { value: 'templates', label: 'Role templates' },
          { value: 'collaboration', label: 'Collaboration' },
        ]}
        selected={activeTab}
        onToggle={onTabChange}
        fillWidth
      />

      {activeTab === 'users' && (
        <>
          <Grid columns={userLevel === 5 ? '6' : '4'} gap="16" fillWidth s={{ columns: '2' }} m={{ columns: '3' }}>
            <StatCard accentKey="total" label="Total" value={stats.total} />
            <StatCard accentKey="approved" label="Active" value={stats.active} />
            <StatCard accentKey="submitted" label="Assistant principals" value={stats.principals} />
            <StatCard
              accentKey="underReview"
              label="Never signed in"
              value={stats.neverSignedIn}
              hint="Click to filter"
              selected={loginFilter === 'never'}
              onClick={() => toggleLoginFilter('never')}
            />
            {userLevel === 5 && (
              <>
                <StatCard accentKey="averageProgress" label="Admin principals" value={stats.admin} />
                <StatCard accentKey="rejected" label="Super admins" value={stats.superAdmin} />
              </>
            )}
          </Grid>

          <div className="legacy-ui">{filters}</div>

          <DashboardSection
            title={`Users (${visibleUsers.length} of ${users.length})`}
            actions={
              <Row gap="8" wrap>
                <Button
                  size="s"
                  variant={loginFilter === 'all' ? 'secondary' : 'tertiary'}
                  onClick={() => setLoginFilter('all')}
                >
                  All
                </Button>
                <Button
                  size="s"
                  variant={loginFilter === 'never' ? 'secondary' : 'tertiary'}
                  onClick={() => toggleLoginFilter('never')}
                >
                  Never signed in
                </Button>
                <Button
                  size="s"
                  variant={loginFilter === 'stale' ? 'secondary' : 'tertiary'}
                  onClick={() => toggleLoginFilter('stale')}
                >
                  Stale (30+ days)
                </Button>
                <Button size="s" variant="secondary" onClick={() => downloadUsersCsv(visibleUsers)}>
                  Export CSV
                </Button>
              </Row>
            }
          >
            {loading ? (
              <Column horizontal="center" vertical="center" paddingY="48" gap="16">
                <Spinner size="l" />
                <Text onBackground="neutral-weak">Loading users...</Text>
              </Column>
            ) : visibleUsers.length === 0 ? (
              <Column horizontal="center" paddingY="48" gap="8">
                <Text variant="heading-strong-l" align="center">
                  No users match your filters
                </Text>
                <Text onBackground="neutral-weak" align="center">
                  Try clearing search or the sign-in filter to see everyone.
                </Text>
              </Column>
            ) : (
              <UsersTable
                users={visibleUsers}
                actor={actor}
                selectedUsers={selectedUsers}
                onToggleSelect={onToggleSelect}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            )}
          </DashboardSection>
        </>
      )}

      {activeTab === 'analytics' && <div className="legacy-ui">{analytics}</div>}
      {activeTab === 'templates' && <div className="legacy-ui">{templates}</div>}
      {activeTab === 'collaboration' && <div className="legacy-ui">{collaboration}</div>}
    </Column>
  );
}
