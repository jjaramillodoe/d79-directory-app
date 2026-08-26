'use client';

import { Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';
import Modal from '../ui/Modal';

export default function FormConfirmModal({
  title,
  description,
  warnings = [],
  confirmLabel = 'Continue',
  cancelLabel = 'Cancel',
  onConfirm,
  onClose,
  busy = false,
}) {
  return (
    <Modal onClose={busy ? undefined : onClose} labelledBy="confirm-modal-title">
      <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
        <Column gap="16">
          <Heading id="confirm-modal-title" variant="heading-strong-m">{title}</Heading>
          {description && (
            <Text variant="body-default-s" onBackground="neutral-weak">
              {description}
            </Text>
          )}
          {warnings.length > 0 && (
            <Column gap="8">
              {warnings.map((warning) => (
                <Text key={warning} variant="body-default-s">
                  {warning}
                </Text>
              ))}
            </Column>
          )}
          <Row gap="8" horizontal="end" wrap>
            <Button variant="secondary" onClick={onClose} disabled={busy}>
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm} disabled={busy}>
              {busy ? 'Working…' : confirmLabel}
            </Button>
          </Row>
        </Column>
      </Card>
    </Modal>
  );
}
