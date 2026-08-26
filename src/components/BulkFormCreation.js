'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Column,
  Row,
  Grid,
  Text,
  Button,
  Card,
  Heading,
  Tag,
  Spinner,
} from '@once-ui-system/core';
import StatCard from './dashboard/StatCard';
import DashboardSection from './dashboard/DashboardSection';
import Modal from './ui/Modal';
import * as logger from '../lib/logger';

export default function BulkFormCreation({ onFormsCreated }) {
  const [principals, setPrincipals] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPrincipals();
  }, []);

  const fetchPrincipals = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/users');
      if (response.ok) {
        const data = await response.json();
        setPrincipals((data.users || []).filter((user) => user.level === 4 && user.isActive));
      } else {
        setError('Could not load principals.');
      }
    } catch (err) {
      logger.error('Error fetching principals:', err);
      setError('Could not load principals.');
    } finally {
      setLoading(false);
    }
  };

  const filteredPrincipals = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return principals;
    return principals.filter((principal) =>
      [principal.name, principal.email, principal.schoolName]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query))
    );
  }, [principals, searchTerm]);

  const selectedPrincipals = principals.filter((principal) =>
    selectedIds.includes(principal._id)
  );

  const togglePrincipal = (id) => {
    setSelectedIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  const selectAllFiltered = () => {
    setSelectedIds(filteredPrincipals.map((principal) => principal._id));
  };

  const handleBulkCreate = async () => {
    if (selectedPrincipals.length === 0) return;

    setShowConfirm(false);
    setCreating(true);
    setResults(null);

    const createResults = { success: [], errors: [] };

    for (const principal of selectedPrincipals) {
      try {
        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            schoolName: principal.schoolName,
            initialOwnerEmail: principal.email,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          createResults.success.push({
            principal: principal.name,
            school: principal.schoolName,
            formId: data?.formId || data?.form?._id || data?._id,
          });
        } else {
          const errorData = await response.json().catch(() => ({}));
          createResults.errors.push({
            principal: principal.name,
            error: errorData.error || errorData.message || 'Failed to create form',
          });
        }
      } catch (err) {
        createResults.errors.push({
          principal: principal.name,
          error: err.message || 'Unknown error',
        });
      }
    }

    setResults(createResults);
    setCreating(false);

    if (createResults.success.length > 0 && onFormsCreated) {
      onFormsCreated();
    }
  };

  return (
    <Column gap="24" fillWidth>
      {error && (
        <Card padding="16" radius="l" fillWidth>
          <Text onBackground="danger-strong">{error}</Text>
        </Card>
      )}

      <Grid columns="3" gap="16" fillWidth s={{ columns: '1' }} m={{ columns: '3' }}>
        <StatCard accentKey="total" label="Level 4 principals" value={principals.length} />
        <StatCard accentKey="submitted" label="Selected" value={selectedIds.length} />
        <StatCard
          accentKey={results?.errors?.length ? 'rejected' : 'approved'}
          label={results ? 'Created this run' : 'Last run'}
          value={results ? results.success.length : 0}
          hint={results?.errors?.length ? `${results.errors.length} failed` : undefined}
        />
      </Grid>

      <Card padding="24" radius="l" fillWidth direction="column">
        <Column gap="16" fillWidth>
          <Row fillWidth horizontal="between" vertical="end" wrap gap="12">
            <Column gap="8" style={{ flex: 1, minWidth: 220 }}>
              <Text variant="label-default-s">Search principals</Text>
              <input
                className="app-field"
                type="search"
                placeholder="Name, email, or school"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </Column>
            <Row gap="8" wrap>
              <Button size="s" variant="secondary" onClick={selectAllFiltered} disabled={filteredPrincipals.length === 0}>
                Select shown ({filteredPrincipals.length})
              </Button>
              <Button size="s" variant="tertiary" onClick={() => setSelectedIds([])} disabled={selectedIds.length === 0}>
                Clear
              </Button>
            </Row>
          </Row>
          <Text variant="label-default-s" onBackground="neutral-weak">
            Showing {filteredPrincipals.length} of {principals.length}
          </Text>
        </Column>
      </Card>

      <DashboardSection title="Select principals" description="Each selected principal gets a new blank school plan">
        {loading ? (
          <Column horizontal="center" vertical="center" paddingY="48" gap="16">
            <Spinner size="l" />
            <Text onBackground="neutral-weak">Loading principals...</Text>
          </Column>
        ) : filteredPrincipals.length === 0 ? (
          <Column horizontal="center" paddingY="32" gap="8">
            <Text variant="heading-strong-m" align="center">
              No principals found
            </Text>
            <Text onBackground="neutral-weak" align="center">
              Try a different search, or add Level 4 users first.
            </Text>
          </Column>
        ) : (
          <Column gap="8" fillWidth style={{ maxHeight: 420, overflowY: 'auto' }}>
            {filteredPrincipals.map((principal) => {
              const selected = selectedIds.includes(principal._id);
              return (
                <Row
                  key={principal._id}
                  as="button"
                  fillWidth
                  gap="12"
                  padding="12"
                  border="neutral-medium"
                  radius="m"
                  vertical="center"
                  wrap
                  onClick={() => togglePrincipal(principal._id)}
                  style={{
                    cursor: 'pointer',
                    textAlign: 'left',
                    background: selected ? 'var(--brand-alpha-weak)' : undefined,
                    boxShadow: selected ? 'inset 0 0 0 2px var(--brand-solid-strong)' : undefined,
                  }}
                >
                  <Column gap="4" style={{ flex: 1, minWidth: 180 }}>
                    <Text weight="strong">{principal.name}</Text>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {principal.email}
                    </Text>
                  </Column>
                  <Text variant="body-default-s" style={{ flex: 1, minWidth: 140 }}>
                    {principal.schoolName || 'No school'}
                  </Text>
                  <Tag size="s" variant="warning" label="Level 4" />
                  {selected && <Tag size="s" variant="brand" label="Selected" />}
                </Row>
              );
            })}
          </Column>
        )}
      </DashboardSection>

      {results && (
        <DashboardSection title="Creation results">
          <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
            <StatCard accentKey="approved" label="Created" value={results.success.length} />
            <StatCard accentKey="rejected" label="Failed" value={results.errors.length} />
          </Grid>
          {results.success.length > 0 && (
            <Column gap="8" fillWidth>
              <Text variant="label-strong-s">Created</Text>
              {results.success.map((item, index) => (
                <Row key={`${item.formId}-${index}`} fillWidth gap="12" vertical="center" wrap>
                  <Text variant="body-default-s">
                    {item.principal} · {item.school}
                  </Text>
                  {item.formId && item.formId !== 'unknown' && (
                    <Button size="s" variant="tertiary" href={`/form/${item.formId}`}>
                      Open
                    </Button>
                  )}
                </Row>
              ))}
            </Column>
          )}
          {results.errors.length > 0 && (
            <Column gap="8" fillWidth>
              <Text variant="label-strong-s">Errors</Text>
              {results.errors.map((item, index) => (
                <Text key={`${item.principal}-${index}`} variant="body-default-s" onBackground="danger-strong">
                  {item.principal}: {item.error}
                </Text>
              ))}
            </Column>
          )}
          <Row>
            <Button
              variant="secondary"
              onClick={() => {
                setResults(null);
                setSelectedIds([]);
              }}
            >
              Create more
            </Button>
          </Row>
        </DashboardSection>
      )}

      {!results && (
        <Card padding="24" radius="l" fillWidth direction="column">
          <Row fillWidth horizontal="between" vertical="center" wrap gap="16">
            <Column gap="4">
              <Heading variant="heading-strong-s">Create forms</Heading>
              <Text variant="body-default-s" onBackground="neutral-weak">
                {selectedIds.length > 0
                  ? `${selectedIds.length} principal${selectedIds.length === 1 ? '' : 's'} selected`
                  : 'Select principals above to continue'}
              </Text>
            </Column>
            <Button
              onClick={() => setShowConfirm(true)}
              disabled={selectedIds.length === 0 || creating}
            >
              {creating ? 'Creating…' : `Create ${selectedIds.length || ''} form${selectedIds.length === 1 ? '' : 's'}`}
            </Button>
          </Row>
        </Card>
      )}

      {creating && (
        <Column horizontal="center" gap="8">
          <Spinner size="m" />
          <Text onBackground="neutral-weak">Creating forms…</Text>
        </Column>
      )}

      {showConfirm && (
        <Modal onClose={() => setShowConfirm(false)} labelledBy="bulk-create-title">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
            <Column gap="16">
              <Heading id="bulk-create-title" variant="heading-strong-m">Create {selectedIds.length} form{selectedIds.length === 1 ? '' : 's'}?</Heading>
              <Text onBackground="neutral-weak">
                A blank school plan will be created and assigned to each selected principal.
              </Text>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setShowConfirm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkCreate}>Create forms</Button>
              </Row>
            </Column>
          </Card>
        </Modal>
      )}
    </Column>
  );
}
