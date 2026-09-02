'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Badge,
  useLayout,
} from '@once-ui-system/core';
import {
  LayoutDashboard,
  FileText,
  Search,
  Users,
  School,
  ClipboardList,
  Target,
  Share2,
  MessageSquare,
  BarChart3,
  Bell,
  Layers,
  Gauge,
  PlusSquare,
  HeartPulse,
  ScrollText,
  CircleHelp,
  LogOut,
} from 'lucide-react';

function getNavGroups(userLevel) {
  const groups = [
    {
      label: 'Workspace',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, href: '/dashboard' },
        { id: 'howto', label: 'How to', icon: CircleHelp, href: '/dashboard?view=howto' },
      ],
    },
  ];

  if (userLevel >= 4) {
    groups[0].items.push(
      { id: 'comments', label: 'Comments', icon: MessageSquare, href: '/dashboard?view=comments' },
      { id: 'analytics', label: 'Analytics', icon: BarChart3, href: '/dashboard?view=analytics' },
      { id: 'notifications', label: 'Notifications', icon: Bell, href: '/dashboard?view=notifications' },
      { id: 'bulk', label: 'Bulk operations', icon: Layers, href: '/dashboard?view=bulk' },
      { id: 'performance', label: 'Performance', icon: Gauge, href: '/dashboard?view=performance' },
    );
    groups.push({
      label: 'Create',
      items: [{ id: 'new-form', label: 'New form', icon: FileText, href: '/form/new' }],
    });
  }

  if (userLevel === 5) {
    groups[groups.length - 1].items.push({
      id: 'bulk-create',
      label: 'Year setup',
      icon: PlusSquare,
      href: '/dashboard?view=bulk-create',
    });
    groups.push({
      label: 'Admin',
      items: [
        { id: 'submissions', label: 'Submissions', icon: Search, href: '/admin/submissions' },
        { id: 'users', label: 'Users', icon: Users, href: '/admin/users' },
        { id: 'schools', label: 'Schools', icon: School, href: '/admin/schools' },
        { id: 'goals', label: 'Goals', icon: Target, href: '/admin/goals' },
        { id: 'questions', label: 'Question bank', icon: ClipboardList, href: '/admin/questions' },
        { id: 'collaboration', label: 'Collaboration', icon: Share2, href: '/admin/users?tab=collaboration' },
        { id: 'system', label: 'System', icon: HeartPulse, href: '/admin/system' },
        { id: 'logs', label: 'Audit logs', icon: ScrollText, href: '/admin/logs' },
      ],
    });
  }

  if (userLevel === 4) {
    groups.push({
      label: 'School',
      items: [
        { id: 'users', label: 'School users', icon: Users, href: '/admin/users' },
        { id: 'collaboration', label: 'Collaboration', icon: Share2, href: '/admin/users?tab=collaboration' },
      ],
    });
  }

  return groups;
}

function isItemSelected(item, pathname, searchParams) {
  if (!item.href) return false;

  const [path, queryString] = item.href.split('?');
  const hrefParams = new URLSearchParams(queryString || '');

  if (path === '/form/new') {
    return pathname === '/form/new';
  }

  if (path === '/dashboard') {
    if (pathname !== '/dashboard') return false;
    const currentView = searchParams.get('view') || 'overview';
    const itemView = hrefParams.get('view') || 'overview';
    return currentView === itemView;
  }

  if (path === '/admin/users') {
    if (pathname !== '/admin/users') return false;
    const wantsCollaboration = hrefParams.get('tab') === 'collaboration';
    const isCollaboration = searchParams.get('tab') === 'collaboration';
    return wantsCollaboration === isCollaboration;
  }

  return pathname === path;
}

function NavItem({ item, compact, selected }) {
  const Icon = item.icon;

  return (
    <Link href={item.href} title={item.label} style={{ textDecoration: 'none', width: '100%' }}>
      <Row
        className="dashboard-nav-item"
        fillWidth
        gap="12"
        paddingX={compact ? '8' : '12'}
        paddingY="8"
        radius="m"
        vertical="center"
        horizontal={compact ? 'center' : 'start'}
        background={selected ? 'brand-alpha-weak' : undefined}
      >
        <Icon size={18} strokeWidth={1.75} />
        {!compact && (
          <Text
            variant={selected ? 'label-strong-s' : 'label-default-s'}
            onBackground={selected ? 'brand-strong' : 'neutral-strong'}
          >
            {item.label}
          </Text>
        )}
      </Row>
    </Link>
  );
}

function DashboardSidebarInner({ session, userLevel }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { maxWidth } = useLayout();
  const compact = maxWidth('s');
  const groups = getNavGroups(userLevel);

  return (
    <Column
      as="nav"
      background="surface"
      padding="16"
      gap="20"
      style={{
        width: compact ? 72 : 260,
        minWidth: compact ? 72 : 260,
        height: '100vh',
        position: 'sticky',
        top: 0,
        borderRight: '1px solid var(--neutral-alpha-medium)',
        overflowY: 'auto',
        flexShrink: 0,
      }}
    >
      <Column gap="4" horizontal={compact ? 'center' : 'start'}>
        <Heading variant={compact ? 'heading-strong-s' : 'heading-strong-m'}>
          {compact ? 'D79' : 'District 79'}
        </Heading>
        {!compact && (
          <Text variant="label-default-s" onBackground="neutral-weak">
            School plans
          </Text>
        )}
      </Column>

      {groups.map((group) => (
        <Column key={group.label} gap="4" fillWidth>
          {!compact && (
            <Text variant="label-default-s" onBackground="neutral-weak" paddingX="12" paddingY="4">
              {group.label}
            </Text>
          )}
          {group.items.map((item) => (
            <NavItem
              key={item.id}
              item={item}
              compact={compact}
              selected={isItemSelected(item, pathname, searchParams)}
            />
          ))}
        </Column>
      ))}

      <Column fillWidth gap="8" style={{ marginTop: 'auto' }}>
        {!compact && session?.user && (
          <Column gap="4" paddingX="12">
            <Text variant="label-strong-s">{session.user.name}</Text>
            <Row gap="8" vertical="center">
              <Badge>Level {userLevel}</Badge>
            </Row>
          </Column>
        )}
        <Button
          variant="secondary"
          size="s"
          fillWidth
          onClick={() => signOut({ callbackUrl: '/login' })}
        >
          {compact ? <LogOut size={16} /> : 'Sign out'}
        </Button>
      </Column>
    </Column>
  );
}

function SidebarFallback() {
  return (
    <Column
      background="surface"
      style={{
        width: 260,
        minWidth: 260,
        height: '100vh',
        borderRight: '1px solid var(--neutral-alpha-medium)',
        flexShrink: 0,
      }}
    />
  );
}

export default function DashboardSidebar({ session, userLevel }) {
  return (
    <Suspense fallback={<SidebarFallback />}>
      <DashboardSidebarInner session={session} userLevel={userLevel} />
    </Suspense>
  );
}
