'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import {
  RefreshCw,
  Trash2,
  RotateCcw,
  Activity,
  Database,
  HardDrive,
  FileText,
  Users,
  ClipboardList,
} from 'lucide-react';
import {
  Spinner,
  Column,
  Row,
  Text,
  Heading,
  Button,
  Card,
  Grid,
  Tag,
} from '@once-ui-system/core';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import DashboardSection from '../../../components/dashboard/DashboardSection';
import YearLockPanel from '../../../components/admin/YearLockPanel';
import StatCard from '../../../components/dashboard/StatCard';
import useAppToast from '../../../hooks/useAppToast';

function statusTag(status) {
  if (status === 'ok' || status === 'up') return { variant: 'success', label: 'Healthy' };
  if (status === 'degraded' || status === 'backing_off' || status === 'not_configured') {
    return { variant: 'warning', label: status === 'not_configured' ? 'Optional' : 'Degraded' };
  }
  return { variant: 'danger', label: 'Down' };
}

function formatTime(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString();
  } catch (error) {
    return String(value);
  }
}

function HealthCard({ title, icon: Icon, status, pingMs, children }) {
  const tag = statusTag(status);
  return (
    <Card padding="20" radius="l" fillWidth direction="column">
      <Column gap="16" fillWidth>
        <Row fillWidth horizontal="between" vertical="center">
          <Row gap="8" vertical="center">
            <Icon size={18} strokeWidth={1.75} />
            <Heading variant="heading-strong-s">{title}</Heading>
          </Row>
          <Row gap="8" vertical="center">
            {typeof pingMs === 'number' && (
              <Text variant="label-default-s" onBackground="neutral-weak">
                {pingMs} ms
              </Text>
            )}
            <Tag size="s" variant={tag.variant} label={tag.label} />
          </Row>
        </Row>
        {children}
      </Column>
    </Card>
  );
}

function Metric({ label, value }) {
  return (
    <Column gap="4">
      <Text variant="label-default-s" onBackground="neutral-weak">
        {label}
      </Text>
      <Text variant="label-strong-s">{value ?? '—'}</Text>
    </Column>
  );
}

function AdminSystemPageContent() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const toast = useAppToast();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);

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

  const loadHealth = async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/admin/health');
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Failed to load system health');
      setHealth(result);
    } catch (err) {
      setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.level === 5) loadHealth();
  }, [session]);

  const runAction = async (action, successMessage) => {
    setBusy(action);
    try {
      const response = await fetch('/api/admin/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || 'Action failed');
      setHealth(result);
      toast.success(successMessage);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  if (status === 'loading') {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  if (!session || session.user.level !== 5) return null;

  const overall = statusTag(health?.overall);
  const mongo = health?.mongo || {};
  const redis = health?.redis || {};
  const api = health?.api || {};
  const formsByStatus = mongo.formsByStatus || {};

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title="System"
          description="API, MongoDB, and Redis health for Super Admins"
          session={session}
          userLevel={session.user.level}
          actions={
            <Row gap="8" wrap>
              <Button
                size="s"
                variant="secondary"
                onClick={() => loadHealth({ silent: true })}
                disabled={loading || Boolean(busy)}
              >
                <RefreshCw size={14} />
                Refresh
              </Button>
            </Row>
          }
        />
      }
    >
      {loading && !health ? (
        <Column fillWidth horizontal="center" paddingY="40" gap="12">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Checking services…</Text>
        </Column>
      ) : error ? (
        <Card padding="24" radius="l">
          <Text onBackground="danger-strong">{error}</Text>
        </Card>
      ) : (
        <Column gap="24" fillWidth>
          <Row gap="8" vertical="center">
            <Tag size="m" variant={overall.variant} label={`Overall ${overall.label.toLowerCase()}`} />
            <Text variant="label-default-s" onBackground="neutral-weak">
              Checked {formatTime(health.checkedAt)}
            </Text>
          </Row>

          <Grid columns="3" gap="16" fillWidth s={{ columns: '1' }}>
            <HealthCard title="API" icon={Activity} status="up" pingMs={undefined}>
              <Grid columns="2" gap="12" fillWidth>
                <Metric label="Environment" value={api.vercelEnv || api.env} />
                <Metric label="Node" value={api.node} />
                <Metric label="Uptime" value={api.uptimeHuman} />
                <Metric label="Heap" value={api.memory?.heapUsedHuman} />
                {api.region && <Metric label="Region" value={api.region} />}
                <Metric label="RSS" value={api.memory?.rssHuman} />
              </Grid>
            </HealthCard>

            <HealthCard title="MongoDB" icon={Database} status={mongo.status} pingMs={mongo.pingMs}>
              {mongo.ok ? (
                <Grid columns="2" gap="12" fillWidth>
                  <Metric label="Database" value={mongo.name} />
                  <Metric label="Data size" value={mongo.dataSizeHuman} />
                  <Metric label="Storage" value={mongo.storageSizeHuman} />
                  <Metric label="Indexes" value={mongo.indexSizeHuman} />
                  <Metric label="Documents" value={mongo.objects?.toLocaleString?.() || mongo.objects} />
                  <Metric
                    label="Unique school+year index"
                    value={mongo.uniquePlanIndex?.present ? 'Present' : 'Missing'}
                  />
                </Grid>
              ) : (
                <Text onBackground="danger-strong">{mongo.message}</Text>
              )}
            </HealthCard>

            <HealthCard title="Redis" icon={HardDrive} status={redis.status} pingMs={redis.pingMs}>
              {redis.ok ? (
                <Grid columns="2" gap="12" fillWidth>
                  <Metric label="Memory" value={redis.usedMemoryHuman} />
                  <Metric label="Keys" value={redis.keys} />
                  <Metric label="Clients" value={redis.clients} />
                  <Metric label="Version" value={redis.version} />
                  <Metric label="Cache keys" value={redis.keyspace?.cache?.total ?? 0} />
                  <Metric label="Locks / editors" value={`${redis.keyspace?.locks || 0} / ${redis.keyspace?.editors || 0}`} />
                </Grid>
              ) : (
                <Column gap="8">
                  <Text onBackground={redis.status === 'not_configured' ? 'neutral-strong' : 'warning-strong'}>
                    {redis.message}
                  </Text>
                  {redis.retryInSeconds ? (
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      Auto-retry in {redis.retryInSeconds}s
                    </Text>
                  ) : null}
                </Column>
              )}
            </HealthCard>
          </Grid>

          <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
            <StatCard accentKey="total" label="School plans" value={mongo.counts?.forms ?? '—'} />
            <StatCard accentKey="draft" label="Draft" value={formsByStatus.draft ?? 0} />
            <StatCard accentKey="submitted" label="Submitted" value={formsByStatus.submitted ?? 0} />
            <StatCard accentKey="approved" label="Users" value={mongo.counts?.users ?? '—'} />
          </Grid>

          <DashboardSection
            title="Tools"
            description="Safe operations for this app. Cache flush does not drop locks or rate-limit keys."
            actions={
              <Row gap="8" wrap>
                <Button
                  size="s"
                  variant="secondary"
                  onClick={() =>
                    runAction(
                      'flush-cache',
                      'App caches cleared. Question bank, year settings, and public overview will rebuild on next request.'
                    )
                  }
                  disabled={Boolean(busy)}
                >
                  <Trash2 size={14} />
                  {busy === 'flush-cache' ? 'Flushing…' : 'Flush caches'}
                </Button>
                {redis.configured && !redis.ok && (
                  <Button
                    size="s"
                    variant="secondary"
                    onClick={() => runAction('retry-redis', 'Redis connection retried.')}
                    disabled={Boolean(busy)}
                  >
                    <RotateCcw size={14} />
                    {busy === 'retry-redis' ? 'Retrying…' : 'Retry Redis'}
                  </Button>
                )}
              </Row>
            }
          >
            <Grid columns="3" gap="16" fillWidth s={{ columns: '1' }}>
              <Link href="/admin/logs" style={{ textDecoration: 'none' }}>
                <Card padding="16" radius="l" fillWidth>
                  <Column gap="8">
                    <Row gap="8" vertical="center">
                      <FileText size={16} />
                      <Text variant="label-strong-s">Audit logs</Text>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      Who changed users, plans, and settings.
                    </Text>
                  </Column>
                </Card>
              </Link>
              <Link href="/admin/users" style={{ textDecoration: 'none' }}>
                <Card padding="16" radius="l" fillWidth>
                  <Column gap="8">
                    <Row gap="8" vertical="center">
                      <Users size={16} />
                      <Text variant="label-strong-s">Users</Text>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {mongo.users?.active ?? 0} active · {mongo.users?.inactive ?? 0} inactive
                    </Text>
                  </Column>
                </Card>
              </Link>
              <Link href="/admin/questions" style={{ textDecoration: 'none' }}>
                <Card padding="16" radius="l" fillWidth>
                  <Column gap="8">
                    <Row gap="8" vertical="center">
                      <ClipboardList size={16} />
                      <Text variant="label-strong-s">Question bank</Text>
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {mongo.counts?.templates ?? 0} template versions on file
                    </Text>
                  </Column>
                </Card>
              </Link>
            </Grid>
          </DashboardSection>

          <YearLockPanel />

          <Grid columns="2" gap="16" fillWidth s={{ columns: '1' }}>
            <DashboardSection title="Environment" description="Whether each variable is set. Values are never shown.">
              <Column gap="8" fillWidth>
                {(health.env || []).map((item) => (
                  <Row key={item.key} fillWidth horizontal="between" vertical="center">
                    <Text variant="label-default-s">{item.key}</Text>
                    <Tag
                      size="s"
                      variant={item.set ? 'success' : item.required ? 'danger' : 'warning'}
                      label={item.set ? 'Set' : item.required ? 'Missing' : 'Not set'}
                    />
                  </Row>
                ))}
              </Column>
            </DashboardSection>

            <DashboardSection title="Plans by year">
              <Column gap="8" fillWidth>
                {(mongo.formsByYear || []).length === 0 ? (
                  <Text onBackground="neutral-weak">No school plans yet.</Text>
                ) : (
                  mongo.formsByYear.map((row) => (
                    <Row key={row.schoolYear} fillWidth horizontal="between">
                      <Text variant="label-default-s">{row.schoolYear}</Text>
                      <Text variant="label-strong-s">{row.count}</Text>
                    </Row>
                  ))
                )}
              </Column>
            </DashboardSection>
          </Grid>

          <DashboardSection title="MongoDB collections" description="Document counts and on-disk size">
            <Column gap="8" fillWidth>
              {(mongo.collections || []).map((collection) => (
                <Row key={collection.name} fillWidth horizontal="between" vertical="center" wrap gap="8">
                  <Text variant="label-strong-s">{collection.name}</Text>
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {collection.count?.toLocaleString?.() || 0} docs · {collection.sizeHuman} data · {collection.indexHuman} indexes
                  </Text>
                </Row>
              ))}
            </Column>
          </DashboardSection>

          <DashboardSection title="Recent activity" description="Latest audit events">
            <Column gap="12" fillWidth>
              {(health.recentAudit || []).length === 0 ? (
                <Text onBackground="neutral-weak">No audit events yet.</Text>
              ) : (
                health.recentAudit.map((log, index) => (
                  <Row key={`${log.timestamp}-${index}`} fillWidth horizontal="between" wrap gap="8">
                    <Column gap="4" style={{ minWidth: 0, flex: 1 }}>
                      <Text variant="label-strong-s">{String(log.action || '').replace(/_/g, ' ')}</Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {log.userName}
                        {log.details ? ` · ${log.details}` : ''}
                      </Text>
                    </Column>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {formatTime(log.timestamp)}
                    </Text>
                  </Row>
                ))
              )}
            </Column>
          </DashboardSection>
        </Column>
      )}
    </DashboardShell>
  );
}

export default function AdminSystemPage() {
  return (
    <Suspense
      fallback={
        <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Loading...</Text>
        </Column>
      }
    >
      <AdminSystemPageContent />
    </Suspense>
  );
}
