'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Column,
  Row,
  Grid,
  Text,
  Button,
  Card,
  Heading,
  Tag,
  SegmentedControl,
} from '@once-ui-system/core';
import StatCard from './dashboard/StatCard';
import DashboardSection from './dashboard/DashboardSection';
import useAppToast from '../hooks/useAppToast';

const TYPE_LABELS = {
  deadline: 'Deadlines',
  quality: 'Quality',
  workflow: 'Workflow',
  success: 'Approved',
};

const PRIORITY_TAG = {
  high: { label: 'High', variant: 'danger' },
  medium: { label: 'Medium', variant: 'warning' },
  low: { label: 'Low', variant: 'success' },
};

function buildNotifications(forms) {
  const items = [];

  forms.forEach((form) => {
    const daysSinceCreated = Math.floor(
      (Date.now() - new Date(form.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceCreated > 30 && form.status === 'draft') {
      items.push({
        id: `overdue-${form._id}`,
        type: 'deadline',
        priority: 'high',
        title: 'Overdue draft',
        message: `${form.schoolName} has had a draft for more than 30 days.`,
        school: form.schoolName,
        formId: form._id,
        action: 'Open form',
        href: `/form/${form._id}`,
      });
    }

    const completedSteps = form.completedSteps?.length || 0;
    if (completedSteps > 0 && completedSteps < 14 && form.status !== 'draft') {
      items.push({
        id: `incomplete-${form._id}`,
        type: 'quality',
        priority: 'medium',
        title: 'Incomplete submission',
        message: `${form.schoolName} submitted with ${completedSteps}/14 steps complete.`,
        school: form.schoolName,
        formId: form._id,
        action: 'Review form',
        href: `/form/${form._id}`,
      });
    }

    if (form.status === 'approved') {
      const daysSinceApproval = Math.floor(
        (Date.now() - new Date(form.updatedAt || form.createdAt || Date.now()).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      if (daysSinceApproval <= 7) {
        items.push({
          id: `approved-${form._id}`,
          type: 'success',
          priority: 'low',
          title: 'Plan approved',
          message: `${form.schoolName} was approved in the last 7 days.`,
          school: form.schoolName,
          formId: form._id,
          action: 'View form',
          href: `/form/${form._id}`,
        });
      }
    }
  });

  const pendingReviews = forms.filter((form) =>
    ['submitted', 'under_review'].includes(form.status)
  );
  if (pendingReviews.length > 0) {
    items.unshift({
      id: 'review-backlog',
      type: 'workflow',
      priority: pendingReviews.length > 5 ? 'high' : 'medium',
      title: 'Waiting for review',
      message: `${pendingReviews.length} school plan${pendingReviews.length === 1 ? '' : 's'} ready to review.`,
      school: 'All schools',
      action: 'Open submissions',
      href: '/admin/submissions',
    });
  }

  return items;
}

export default function SmartNotifications({ forms = [] }) {
  const router = useRouter();
  const toast = useAppToast();
  const [filter, setFilter] = useState('all');
  const [showCompose, setShowCompose] = useState(false);
  const [selectedSchools, setSelectedSchools] = useState([]);
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('reminder');

  const notifications = useMemo(() => buildNotifications(forms), [forms]);
  const counts = useMemo(
    () => ({
      all: notifications.length,
      deadline: notifications.filter((n) => n.type === 'deadline').length,
      quality: notifications.filter((n) => n.type === 'quality').length,
      workflow: notifications.filter((n) => n.type === 'workflow').length,
      success: notifications.filter((n) => n.type === 'success').length,
    }),
    [notifications]
  );

  const filteredNotifications =
    filter === 'all' ? notifications : notifications.filter((n) => n.type === filter);

  const sendBulkNotification = () => {
    if (selectedSchools.length === 0 || !message.trim()) return;
    toast.success(`Notification queued for ${selectedSchools.length} school${selectedSchools.length === 1 ? '' : 's'}.`);
    setSelectedSchools([]);
    setMessage('');
    setShowCompose(false);
  };

  const toggleSchool = (id) => {
    setSelectedSchools((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    );
  };

  return (
    <Column gap="24" fillWidth>
      <Grid columns="4" gap="16" fillWidth s={{ columns: '2' }}>
        <StatCard
          accentKey="rejected"
          label="Deadlines"
          value={counts.deadline}
          selected={filter === 'deadline'}
          onClick={() => setFilter(filter === 'deadline' ? 'all' : 'deadline')}
        />
        <StatCard
          accentKey="underReview"
          label="Quality"
          value={counts.quality}
          selected={filter === 'quality'}
          onClick={() => setFilter(filter === 'quality' ? 'all' : 'quality')}
        />
        <StatCard
          accentKey="submitted"
          label="Workflow"
          value={counts.workflow}
          selected={filter === 'workflow'}
          onClick={() => setFilter(filter === 'workflow' ? 'all' : 'workflow')}
        />
        <StatCard
          accentKey="approved"
          label="Approved"
          value={counts.success}
          selected={filter === 'success'}
          onClick={() => setFilter(filter === 'success' ? 'all' : 'success')}
        />
      </Grid>

      <DashboardSection
        title={`Notifications (${filteredNotifications.length})`}
        description="Alerts generated from current school plans"
        actions={
          <Row gap="8" wrap>
            <SegmentedControl
              buttons={[
                { value: 'all', label: 'All' },
                { value: 'deadline', label: 'Deadlines' },
                { value: 'quality', label: 'Quality' },
                { value: 'workflow', label: 'Workflow' },
                { value: 'success', label: 'Approved' },
              ]}
              selected={filter}
              onToggle={setFilter}
              compact
            />
            <Button size="s" onClick={() => setShowCompose(true)}>
              Send notice
            </Button>
          </Row>
        }
      >
        {filteredNotifications.length === 0 ? (
          <Column horizontal="center" paddingY="32" gap="8">
            <Text variant="heading-strong-m" align="center">
              No notifications
            </Text>
            <Text onBackground="neutral-weak" align="center">
              {filter === 'all'
                ? 'Nothing needs attention right now.'
                : `No ${TYPE_LABELS[filter]?.toLowerCase() || filter} alerts.`}
            </Text>
          </Column>
        ) : (
          <Column gap="12" fillWidth>
            {filteredNotifications.map((notification) => {
              const priority = PRIORITY_TAG[notification.priority] || PRIORITY_TAG.low;
              return (
                <Row
                  key={notification.id}
                  fillWidth
                  gap="16"
                  padding="16"
                  border="neutral-medium"
                  radius="m"
                  vertical="center"
                  wrap
                >
                  <Column gap="8" style={{ flex: 1, minWidth: 220 }}>
                    <Row gap="8" vertical="center" wrap>
                      <Text weight="strong">{notification.title}</Text>
                      <Tag size="s" variant={priority.variant} label={priority.label} />
                      <Tag size="s" variant="neutral" label={TYPE_LABELS[notification.type]} />
                    </Row>
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      {notification.message}
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {notification.school}
                    </Text>
                  </Column>
                  {notification.href && (
                    <Button
                      size="s"
                      variant={notification.priority === 'high' ? 'primary' : 'secondary'}
                      onClick={() => router.push(notification.href)}
                    >
                      {notification.action}
                    </Button>
                  )}
                </Row>
              );
            })}
          </Column>
        )}
      </DashboardSection>

      {showCompose && (
        <div className="app-modal-backdrop app-modal-md">
          <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '36rem' }}>
            <Column gap="16">
              <Row fillWidth horizontal="between" vertical="center">
                <Heading variant="heading-strong-m">Send notice</Heading>
                <Button size="s" variant="tertiary" onClick={() => setShowCompose(false)}>
                  Close
                </Button>
              </Row>
              <Column gap="8">
                <Text variant="label-default-s">Type</Text>
                <select
                  className="app-field"
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value)}
                >
                  <option value="reminder">Deadline reminder</option>
                  <option value="update">Status update</option>
                  <option value="instruction">Instruction</option>
                  <option value="congratulations">Congratulations</option>
                </select>
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">Schools</Text>
                <Column
                  gap="8"
                  padding="12"
                  border="neutral-medium"
                  radius="m"
                  style={{ maxHeight: 200, overflowY: 'auto' }}
                >
                  {forms.length === 0 ? (
                    <Text variant="body-default-s" onBackground="neutral-weak">
                      No schools available.
                    </Text>
                  ) : (
                    forms.map((form) => (
                      <label key={form._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={selectedSchools.includes(form._id)}
                          onChange={() => toggleSchool(form._id)}
                        />
                        <Text variant="body-default-s">
                          {form.schoolName} ({form.status})
                        </Text>
                      </label>
                    ))
                  )}
                </Column>
              </Column>
              <Column gap="8">
                <Text variant="label-default-s">Message</Text>
                <textarea
                  className="app-field"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write the notice for selected schools..."
                />
              </Column>
              <Row gap="8" horizontal="end">
                <Button variant="secondary" onClick={() => setShowCompose(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={sendBulkNotification}
                  disabled={selectedSchools.length === 0 || !message.trim()}
                >
                  Send to {selectedSchools.length || 0}
                </Button>
              </Row>
            </Column>
          </Card>
        </div>
      )}
    </Column>
  );
}
