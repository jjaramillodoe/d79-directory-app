'use client';

import { useMemo, useState } from 'react';
import { Column, Row, Text, Button, Spinner, Tag, Grid } from '@once-ui-system/core';
import StatCard from '../dashboard/StatCard';
import DashboardSection from '../dashboard/DashboardSection';
import Modal from '../ui/Modal';

function emptyForm() {
  return { name: '', dbn: '', notes: '', isActive: true };
}

export default function SchoolsWorkspace({
  schools,
  loading,
  saving,
  error,
  onCreate,
  onSave,
  onDelete,
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return schools;
    return schools.filter((school) =>
      [school.name, school.dbn, school.notes].some((value) =>
        String(value || '').toLowerCase().includes(needle)
      )
    );
  }, [schools, query]);

  const stats = {
    total: schools.length,
    active: schools.filter((school) => school.isActive).length,
    users: schools.reduce((sum, school) => sum + (school.userCount || 0), 0),
    forms: schools.reduce((sum, school) => sum + (school.formCount || 0), 0),
  };

  const openCreate = () => {
    setEditing('new');
    setForm(emptyForm());
  };

  const openEdit = (school) => {
    setEditing(school);
    setForm({
      name: school.name,
      dbn: school.dbn || '',
      notes: school.notes || '',
      isActive: school.isActive,
    });
  };

  const closeModal = () => {
    setEditing(null);
    setForm(emptyForm());
  };

  const submit = async (event) => {
    event.preventDefault();
    if (editing === 'new') {
      const created = await onCreate(form);
      if (created) closeModal();
      return;
    }
    const saved = await onSave(editing.id, form);
    if (saved) closeModal();
  };

  return (
    <Column gap="24" fillWidth>
      <Grid columns="4" s={{ columns: '2' }} gap="16" fillWidth>
        <StatCard accentKey="total" label="Schools" value={stats.total} />
        <StatCard accentKey="approved" label="Active" value={stats.active} />
        <StatCard accentKey="submitted" label="Accounts" value={stats.users} />
        <StatCard accentKey="averageProgress" label="Plans" value={stats.forms} />
      </Grid>

      <DashboardSection
        title="Directory"
        description="Create a school before assigning users or starting a plan. Renaming updates accounts and plans that use the old name."
        actions={
          <Row gap="8" wrap>
            <input
              className="app-field"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search schools…"
              aria-label="Search schools"
            />
            <Button size="s" onClick={openCreate}>
              Add school
            </Button>
          </Row>
        }
      >
        {loading ? (
          <Column fillWidth horizontal="center" paddingY="32">
            <Spinner size="m" />
          </Column>
        ) : (
          <Column gap="0" fillWidth>
            <Row
              fillWidth
              paddingY="8"
              gap="12"
              style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}
            >
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 2 }}>
                School
              </Text>
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 0.8 }}>
                DBN
              </Text>
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 0.6 }}>
                Users
              </Text>
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 0.6 }}>
                Plans
              </Text>
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 0.7 }}>
                Status
              </Text>
              <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 1.2 }}>
                Actions
              </Text>
            </Row>
            {filtered.length === 0 ? (
              <Column paddingY="24">
                <Text onBackground="neutral-weak">No schools match that search.</Text>
              </Column>
            ) : (
              filtered.map((school) => (
                <Row
                  key={school.id}
                  fillWidth
                  paddingY="12"
                  gap="12"
                  vertical="center"
                  style={{ borderBottom: '1px solid var(--neutral-alpha-weak)' }}
                >
                  <Column gap="2" style={{ flex: 2 }}>
                    <Text variant="label-strong-s">{school.name}</Text>
                    {school.notes ? (
                      <Text variant="body-default-xs" onBackground="neutral-weak">
                        {school.notes}
                      </Text>
                    ) : null}
                  </Column>
                  <Text variant="body-default-s" style={{ flex: 0.8 }}>
                    {school.dbn || '—'}
                  </Text>
                  <Text variant="body-default-s" style={{ flex: 0.6 }}>
                    {school.userCount}
                  </Text>
                  <Text variant="body-default-s" style={{ flex: 0.6 }}>
                    {school.formCount}
                  </Text>
                  <Column style={{ flex: 0.7 }}>
                    <Tag
                      size="s"
                      variant={school.isActive ? 'success' : 'neutral'}
                      label={school.isActive ? 'Active' : 'Inactive'}
                    />
                  </Column>
                  <Row gap="8" wrap style={{ flex: 1.2 }}>
                    <Button size="s" variant="secondary" onClick={() => openEdit(school)}>
                      Edit
                    </Button>
                    {school.userCount === 0 && school.formCount === 0 ? (
                      <Button size="s" variant="danger" onClick={() => setConfirmDelete(school)}>
                        Delete
                      </Button>
                    ) : (
                      <Button
                        size="s"
                        variant="tertiary"
                        onClick={() => onSave(school.id, { ...school, isActive: !school.isActive })}
                      >
                        {school.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </Row>
                </Row>
              ))
            )}
          </Column>
        )}
      </DashboardSection>

      {editing && (
        <Modal onClose={closeModal} label={editing === 'new' ? 'Add school' : 'Edit school'} size="md">
          <form onSubmit={submit}>
            <Column gap="16" padding="24" background="surface" radius="l">
              <Text variant="heading-strong-m">{editing === 'new' ? 'Add school' : 'Edit school'}</Text>
              {error ? (
                <Text variant="body-default-s" onBackground="danger-strong">
                  {error}
                </Text>
              ) : null}
              <Column gap="8">
                <Text variant="label-default-s">School name</Text>
                <input
                  className="app-field"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  required
                />
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">DBN (optional)</Text>
                <input
                  className="app-field"
                  value={form.dbn}
                  onChange={(event) => setForm((current) => ({ ...current, dbn: event.target.value }))}
                  placeholder="e.g. 79K123"
                />
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">Notes (optional)</Text>
                <textarea
                  className="app-field"
                  rows={3}
                  value={form.notes}
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                />
              </Column>
              {editing !== 'new' && (
                  <label htmlFor="school-active" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      id="school-active"
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) =>
                        setForm((current) => ({ ...current, isActive: event.target.checked }))
                      }
                    />
                    <Text variant="label-default-s">
                      Active — appears in new-plan and user dropdowns
                    </Text>
                  </label>
              )}
              <Row gap="8" horizontal="end">
                <Button type="button" variant="secondary" onClick={closeModal}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editing === 'new' ? 'Create school' : 'Save'}
                </Button>
              </Row>
            </Column>
          </form>
        </Modal>
      )}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)} label="Delete school" size="sm">
          <Column gap="16" padding="24" background="surface" radius="l">
            <Text variant="heading-strong-m">Delete {confirmDelete.name}?</Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              This school has no users or plans. Deleting removes it from the directory. This cannot
              be undone.
            </Text>
            <Row gap="8" horizontal="end">
              <Button variant="secondary" onClick={() => setConfirmDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={saving}
                onClick={async () => {
                  const deleted = await onDelete(confirmDelete.id);
                  if (deleted) setConfirmDelete(null);
                }}
              >
                Delete
              </Button>
            </Row>
          </Column>
        </Modal>
      )}
    </Column>
  );
}
