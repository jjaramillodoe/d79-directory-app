'use client';

import { Grid } from '@once-ui-system/core';
import {
  FileText,
  Search,
  Users,
  School,
  ClipboardList,
  Target,
  Share2,
} from 'lucide-react';
import QuickActionCard from './QuickActionCard';

function getActions(userLevel, onBulkCreate) {
  const actions = [];

  if (userLevel >= 4) {
    actions.push({
      key: 'new-form',
      title: 'Start New Form',
      description: 'Begin a new school plan submission',
      href: '/form/new',
      icon: FileText,
    });
  }

  if (userLevel === 5) {
    actions.push(
      {
        key: 'bulk-create',
        title: 'Bulk Form Creation',
        description: 'Create and assign forms to multiple principals at once',
        onClick: onBulkCreate,
        icon: FileText,
        badge: 'Super Admin Only',
      },
      {
        key: 'review-submissions',
        title: 'Review All Submissions',
        description: 'Review and approve all forms across all schools',
        href: '/admin/submissions',
        icon: Search,
      },
      {
        key: 'manage-users',
        title: 'Manage All Users',
        description: 'Manage all users across all schools',
        href: '/admin/users',
        icon: Users,
      },
      {
        key: 'manage-schools',
        title: 'Manage schools',
        description: 'Add and rename District 79 schools',
        href: '/admin/schools',
        icon: School,
        badge: 'Super Admin Only',
      },
      {
        key: 'manage-goals',
        title: 'Manage Goals',
        description: 'Manage goals across all schools',
        href: '/admin/goals',
        icon: Target,
      },
      {
        key: 'question-bank',
        title: 'Question Bank',
        description: 'Browse and publish school plan questions',
        href: '/admin/questions',
        icon: ClipboardList,
        badge: 'Super Admin Only',
      },
      {
        key: 'collaboration',
        title: 'Collaboration Dashboard',
        description: 'Manage staff and share forms for collaboration',
        href: '/admin/users?tab=collaboration',
        icon: Share2,
      }
    );
  }

  if (userLevel === 4) {
    actions.push(
      {
        key: 'school-users',
        title: 'Manage School Users',
        description: 'Manage users from your school',
        href: '/admin/users',
        icon: Users,
      },
      {
        key: 'collaboration',
        title: 'Collaboration Dashboard',
        description: 'Manage staff and share forms for collaboration',
        href: '/admin/users?tab=collaboration',
        icon: Users,
      }
    );
  }

  return actions;
}

export default function QuickActionsGrid({ userLevel, onBulkCreate }) {
  const actions = getActions(userLevel, onBulkCreate);

  if (actions.length === 0) {
    return null;
  }

  return (
    <Grid columns="3" gap="24" fillWidth s={{ columns: '1' }} m={{ columns: '2' }}>
      {actions.map(({ key, ...action }) => (
        <QuickActionCard key={key} {...action} />
      ))}
    </Grid>
  );
}
