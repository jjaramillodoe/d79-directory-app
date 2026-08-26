'use client';

import { useEffect, useMemo, useState } from 'react';
import { Column, Row, Text, Button, Tag } from '@once-ui-system/core';
// Same predicate the API enforces. Importing it rather than restating it means the buttons
// this table shows cannot drift from what the server will actually permit.
import { canManageTarget as canManageUser } from '../../lib/canManageUser';

const LEVEL_TAGS = {
  1: { label: 'Level 1 · Viewer', variant: 'neutral' },
  2: { label: 'Level 2 · Staff', variant: 'neutral' },
  3: { label: 'Level 3 · AP', variant: 'brand' },
  4: { label: 'Level 4 · Principal', variant: 'warning' },
  5: { label: 'Level 5 · Super Admin', variant: 'danger' },
};

const PAGE_SIZE = 20;

const SORT_COLUMNS = [
  { field: 'name', label: 'Name', style: { flex: 2 } },
  { field: 'level', label: 'Level', style: { flex: 1 } },
  { field: 'school', label: 'School', style: { flex: 1.2 } },
  { field: 'login', label: 'Last sign-in', style: { flex: 1 } },
  { field: 'status', label: 'Status', style: { flex: 0.9 } },
];

function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function lastLoginLabel(value) {
  if (!value) return { label: 'Never signed in', tone: 'warning', never: true };
  const lastLogin = new Date(value);
  const diffDays = Math.floor((Date.now() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays > 30) return { label: `${diffDays} days ago`, tone: 'danger', never: false };
  if (diffDays > 7) return { label: `${diffDays} days ago`, tone: 'warning', never: false };
  if (diffDays > 0) return { label: `${diffDays}d ago`, tone: 'neutral', never: false };
  return { label: 'Today', tone: 'success', never: false };
}

function sortValue(user, field) {
  if (field === 'name') return String(user.name || '').toLowerCase();
  if (field === 'level') return Number(user.level) || 0;
  if (field === 'school') return String(user.schoolName || '').toLowerCase();
  if (field === 'status') return user.isActive ? 1 : 0;
  if (field === 'login') return user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
  return '';
}

function SortHeader({ field, label, style, sortField, sortDir, onSort }) {
  const active = sortField === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      style={{
        ...style,
        background: 'none',
        border: 0,
        padding: 0,
        textAlign: 'left',
        cursor: 'pointer',
        color: 'inherit',
        font: 'inherit',
      }}
    >
      <Text variant="label-default-s" onBackground={active ? 'brand-strong' : 'neutral-weak'}>
        {label}
        {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
      </Text>
    </button>
  );
}

export function downloadUsersCsv(users) {
  const headers = ['Name', 'Email', 'Level', 'School', 'Title', 'Status', 'Created', 'Last Login'];
  const lines = [
    headers.join(','),
    ...users.map((user) =>
      [
        user.name,
        user.email,
        user.level,
        user.schoolName,
        user.title,
        user.isActive ? 'Active' : 'Inactive',
        formatDate(user.createdAt),
        user.lastLogin ? formatDate(user.lastLogin) : 'Never',
      ]
        .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export default function UsersTable({
  users,
  actor,
  selectedUsers = [],
  onToggleSelect,
  onEdit,
  onDelete,
}) {
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    setPage(1);
  }, [users, sortField, sortDir]);

  const sortedUsers = useMemo(() => {
    const next = [...users];
    const direction = sortDir === 'asc' ? 1 : -1;
    next.sort((a, b) => {
      const left = sortValue(a, sortField);
      const right = sortValue(b, sortField);
      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      return String(a.name || '').localeCompare(String(b.name || ''));
    });
    return next;
  }, [users, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(sortedUsers.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageUsers = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return sortedUsers.slice(start, start + PAGE_SIZE);
  }, [sortedUsers, safePage]);

  const selectedIds = new Set(selectedUsers.map((user) => String(user._id)));
  const pageSelected = pageUsers.length > 0 && pageUsers.every((user) => selectedIds.has(String(user._id)));

  const onSort = (field) => {
    if (sortField === field) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortField(field);
    setSortDir(field === 'login' || field === 'level' ? 'desc' : 'asc');
  };

  const togglePage = () => {
    if (pageSelected) {
      pageUsers.forEach((user) => {
        if (selectedIds.has(String(user._id))) onToggleSelect(user);
      });
      return;
    }
    pageUsers.forEach((user) => {
      if (!selectedIds.has(String(user._id))) onToggleSelect(user);
    });
  };

  return (
    <Column gap="12" fillWidth>
      <Row fillWidth paddingX="12" paddingY="4" gap="12" wrap vertical="center">
        <Text variant="label-default-s" onBackground="neutral-weak" style={{ width: 28 }}>
          {' '}
        </Text>
        {SORT_COLUMNS.map((column) => (
          <SortHeader
            key={column.field}
            field={column.field}
            label={column.label}
            style={column.style}
            sortField={sortField}
            sortDir={sortDir}
            onSort={onSort}
          />
        ))}
        <Text variant="label-default-s" onBackground="neutral-weak" style={{ width: 180 }}>
          Actions
        </Text>
      </Row>

      {pageUsers.map((user) => {
        const level = LEVEL_TAGS[user.level] || LEVEL_TAGS[1];
        const login = lastLoginLabel(user.lastLogin);
        const manageable = canManageUser(actor, user);
        const selected = selectedIds.has(String(user._id));

        return (
          <Row
            key={user._id}
            fillWidth
            gap="12"
            padding="12"
            border="neutral-medium"
            radius="m"
            vertical="center"
            wrap
          >
            <input
              type="checkbox"
              className="app-checkbox"
              checked={selected}
              onChange={() => onToggleSelect(user)}
              aria-label={`Select ${user.name}`}
            />
            <Column gap="4" style={{ flex: 2, minWidth: 180 }}>
              <Text weight="strong">{user.name}</Text>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {user.email}
              </Text>
              {user.title ? (
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {user.title}
                </Text>
              ) : null}
            </Column>
            <Row style={{ flex: 1, minWidth: 140 }}>
              <Tag size="s" variant={level.variant} label={level.label} />
            </Row>
            <Column gap="4" style={{ flex: 1.2, minWidth: 140 }}>
              <Text variant="body-default-s">{user.schoolName || '—'}</Text>
              <Text variant="label-default-s" onBackground="neutral-weak">
                Created {formatDate(user.createdAt)}
              </Text>
            </Column>
            <Column gap="4" style={{ flex: 1, minWidth: 120 }}>
              <Text variant="body-default-s">{login.label}</Text>
            </Column>
            <Row gap="8" wrap style={{ flex: 0.9, minWidth: 120 }}>
              <Tag
                size="s"
                variant={user.isActive ? 'success' : 'danger'}
                label={user.isActive ? 'Active' : 'Inactive'}
              />
              {login.never && <Tag size="s" variant="warning" label="Never signed in" />}
              {!login.never && login.tone === 'danger' && (
                <Tag size="s" variant="warning" label="Stale login" />
              )}
            </Row>
            <Row gap="8" wrap style={{ width: 180 }}>
              {manageable ? (
                <>
                  <Button size="s" variant="secondary" onClick={() => onEdit(user)}>
                    Edit
                  </Button>
                  <Button size="s" variant="danger" onClick={() => onDelete(user)}>
                    Delete
                  </Button>
                </>
              ) : (
                <Text variant="label-default-s" onBackground="neutral-weak">
                  View only
                </Text>
              )}
            </Row>
          </Row>
        );
      })}

      <Row fillWidth horizontal="between" vertical="center" wrap gap="12" paddingY="8">
        <Row gap="8" vertical="center">
          <Button size="s" variant="tertiary" onClick={togglePage}>
            {pageSelected ? 'Clear page' : 'Select page'}
          </Button>
          <Text variant="label-default-s" onBackground="neutral-weak">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, sortedUsers.length)} of {sortedUsers.length}
          </Text>
        </Row>
        <Row gap="8">
          <Button
            size="s"
            variant="tertiary"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            size="s"
            variant="tertiary"
            disabled={safePage >= totalPages}
            onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          >
            Next
          </Button>
        </Row>
      </Row>
    </Column>
  );
}
