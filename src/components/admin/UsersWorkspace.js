'use client';

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
  const stats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    principals: users.filter((u) => u.level === 3).length,
    staff: users.filter((u) => u.title && u.title.trim() !== '').length,
    admin: users.filter((u) => u.level === 4).length,
    superAdmin: users.filter((u) => u.level === 5).length,
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
            <StatCard accentKey="averageProgress" label="With titles" value={stats.staff} />
            {userLevel === 5 && (
              <>
                <StatCard accentKey="underReview" label="Admin principals" value={stats.admin} />
                <StatCard accentKey="rejected" label="Super admins" value={stats.superAdmin} />
              </>
            )}
          </Grid>

          <div className="legacy-ui">{filters}</div>

          <DashboardSection
            title={`Users (${filteredUsers.length} of ${users.length})`}
            actions={
              <Row gap="8" wrap>
                <Button size="s" variant="secondary" onClick={() => downloadUsersCsv(filteredUsers)}>
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
            ) : filteredUsers.length === 0 ? (
              <Column horizontal="center" paddingY="48" gap="8">
                <Text variant="heading-strong-l" align="center">
                  No users match your filters
                </Text>
                <Text onBackground="neutral-weak" align="center">
                  Try clearing search or filters to see everyone.
                </Text>
              </Column>
            ) : (
              <UsersTable
                users={filteredUsers}
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
