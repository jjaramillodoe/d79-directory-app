'use client';

import { Column, Row, Text, Heading, Button, Card } from '@once-ui-system/core';
import Modal from '../ui/Modal';

export default function FormCommentModal({
  stepNumber,
  stepTitle,
  status,
  onChangeStatus,
  comment,
  onChangeComment,
  onClose,
  onSubmit,
}) {
  return (
    <Modal onClose={onClose} size="md" labelledBy="comment-modal-title">
      <Card
        padding="24"
        radius="l"
        direction="column"
        style={{ width: '100%', maxWidth: '36rem', maxHeight: '90vh', overflow: 'auto' }}
      >
        <Column gap="16">
          <Column gap="4">
            <Heading id="comment-modal-title" variant="heading-strong-m">Add a comment</Heading>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Step {stepNumber}
              {stepTitle ? `: ${stepTitle}` : ''}
            </Text>
          </Column>
          <Column gap="8">
            <Text as="label" htmlFor="comment-status" variant="label-default-s">Status</Text>
            <select
              id="comment-status"
              className="app-field"
              value={status}
              onChange={(event) => onChangeStatus(event.target.value)}
            >
              <option value="under_review">Under review</option>
              <option value="rejected">Needs update</option>
              <option value="approved">Approved</option>
            </select>
          </Column>
          <Column gap="8">
            <Text as="label" htmlFor="comment-body" variant="label-default-s">Comment</Text>
            <textarea
              id="comment-body"
              className="app-field app-field-area"
              value={comment}
              onChange={(event) => onChangeComment(event.target.value)}
              placeholder="What should the school change or confirm in this section?"
              rows={6}
            />
          </Column>
          <Row gap="8" horizontal="end" wrap>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSubmit} disabled={!comment.trim()}>
              Add comment
            </Button>
          </Row>
        </Column>
      </Card>
    </Modal>
  );
}
