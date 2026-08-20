'use client';

import { Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';

export default function FormAttestModal({ schoolYear, name, onChangeName, onClose, onConfirm }) {
  return (
    <div className="app-modal-backdrop">
      <Card padding="24" radius="l" direction="column" style={{ width: '100%', maxWidth: '32rem' }}>
        <Column gap="16">
          <Heading variant="heading-strong-m">Principal attestation</Heading>
          <Text variant="body-default-s" onBackground="neutral-weak">
            This plan was copied from last year. Confirm you reviewed the answers for {schoolYear || 'this school year'}, especially attendance, housing, counseling, dates, and staffing.
          </Text>
          <Column gap="8">
            <Text variant="label-default-s">Your name</Text>
            <input
              className="app-field"
              value={name}
              onChange={(event) => onChangeName(event.target.value)}
              placeholder="Type your name"
            />
          </Column>
          <Row gap="8" horizontal="end" wrap>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm} disabled={!name.trim()}>
              Sign and submit
            </Button>
          </Row>
        </Column>
      </Card>
    </div>
  );
}
