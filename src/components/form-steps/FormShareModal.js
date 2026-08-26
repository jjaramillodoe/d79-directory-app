'use client';

import { Column, Row, Text, Heading, Button, Card, Tag } from '@once-ui-system/core';
import Modal from '../ui/Modal';

export default function FormShareModal({
  emails,
  onChangeEmails,
  permissions,
  onChangePermissions,
  sharedWith = [],
  sharing = false,
  onClose,
  onShare,
}) {
  return (
    <Modal onClose={sharing ? undefined : onClose} size="md" labelledBy="share-modal-title">
      <Card
        padding="24"
        radius="l"
        direction="column"
        style={{ width: '100%', maxWidth: '36rem', maxHeight: '90vh', overflow: 'auto' }}
      >
        <Column gap="16">
          <Heading id="share-modal-title" variant="heading-strong-m">Share this plan</Heading>
          <Column gap="8">
            <Text as="label" htmlFor="share-emails" variant="label-default-s">Email addresses</Text>
            <Text id="share-emails-hint" variant="body-default-s" onBackground="neutral-weak">
              Separate addresses with commas or new lines.
            </Text>
            <textarea
              id="share-emails"
              aria-describedby="share-emails-hint"
              className="app-field app-field-area"
              value={emails}
              onChange={(event) => onChangeEmails(event.target.value)}
              placeholder="name@schools.nyc.gov"
              rows={4}
            />
          </Column>
          <Column gap="8">
            <Text as="label" htmlFor="share-permissions" variant="label-default-s">Permission</Text>
            <select
              id="share-permissions"
              className="app-field"
              value={permissions}
              onChange={(event) => onChangePermissions(event.target.value)}
            >
              <option value="view">View only</option>
              <option value="edit">Can edit</option>
            </select>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {permissions === 'edit'
                ? 'They can view and edit answers.'
                : 'They can view the plan but cannot change it.'}
            </Text>
          </Column>
          {sharedWith.length > 0 && (
            <Column gap="8">
              <Text variant="label-strong-s">Already shared with</Text>
              <Row gap="8" wrap>
                {sharedWith.map((share) => (
                  <Tag
                    key={share.email}
                    size="s"
                    variant="neutral"
                    label={`${share.email} · ${share.permissions}`}
                  />
                ))}
              </Row>
            </Column>
          )}
          <Row gap="8" horizontal="end" wrap>
            <Button variant="secondary" onClick={onClose} disabled={sharing}>
              Cancel
            </Button>
            <Button onClick={onShare} disabled={sharing || !emails.trim()}>
              {sharing ? 'Sharing…' : 'Share'}
            </Button>
          </Row>
        </Column>
      </Card>
    </Modal>
  );
}
