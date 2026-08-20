'use client';

import { Column, Row, Heading, Text, Button, Card } from '@once-ui-system/core';
import { Bell } from 'lucide-react';
import DashboardSection from './DashboardSection';
import FormStatusTag from './FormStatusTag';

export default function ReviewNotifications({ notifications }) {
  if (!notifications?.length) return null;

  return (
    <DashboardSection
      title="Review Notifications"
      description="Feedback on your school plan submissions"
      actions={<Bell size={20} />}
    >
      <Column gap="16" fillWidth>
        {notifications.map((notification) => (
          <Card key={notification._id} padding="20" radius="l" fillWidth direction="column" gap="12">
            <Row fillWidth horizontal="between" vertical="start" gap="16" wrap>
              <Column gap="4">
                <Heading variant="heading-strong-s">
                  {notification.schoolName}
                </Heading>
                <Text variant="body-default-s" onBackground="neutral-weak">
                  Reviewed by {notification.reviewedBy?.name || 'Admin'} on{' '}
                  {new Date(notification.reviewedAt).toLocaleDateString()}
                </Text>
              </Column>
              <FormStatusTag status={notification.status} />
            </Row>
            {notification.reviewComments && (
              <Text variant="body-default-m" onBackground="neutral-medium">
                {notification.reviewComments}
              </Text>
            )}
            <Row>
              <Button href={`/form/${notification._id}`} size="s" variant="primary">
                View Submission
              </Button>
            </Row>
          </Card>
        ))}
      </Column>
    </DashboardSection>
  );
}
