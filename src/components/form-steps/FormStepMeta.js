'use client';

import { Column, Row, Text, Button, Card, Tag } from '@once-ui-system/core';

function commentStatus(comment) {
  if (comment.isFixed) return { label: 'Fixed', variant: 'success' };
  if (comment.status === 'rejected') return { label: 'Rejected', variant: 'danger' };
  if (comment.status === 'approved') return { label: 'Approved', variant: 'success' };
  return { label: 'Needs attention', variant: 'warning' };
}

function uniquePeople(editors) {
  const byPerson = new Map();
  editors.forEach((editor, index) => {
    const id = String(editor.email || editor.userId || `editor-${index}`).toLowerCase();
    const existing = byPerson.get(id);
    if (!existing || new Date(editor.lastSeen || 0) > new Date(existing.lastSeen || 0)) {
      byPerson.set(id, editor);
    }
  });
  return [...byPerson.values()];
}

export default function FormStepMeta({
  comments = [],
  onMarkRead,
  onMarkFixed,
  activeEditors = [],
  currentUser,
  formSteps = [],
  sharedWith = [],
  onRemoveShare,
  canManageSharing = false,
}) {
  const peopleOnPlan = uniquePeople(activeEditors);
  const hasComments = comments.length > 0;
  const hasEditors = peopleOnPlan.length > 0;
  const hasSharing = canManageSharing && sharedWith.length > 0;

  if (!hasComments && !hasEditors && !hasSharing) return null;

  return (
    <Column gap="12" fillWidth>
      {hasComments && (
        <Card padding="16" radius="l" fillWidth direction="column">
          <Column gap="12" fillWidth>
            <Text variant="label-strong-s">Review comments</Text>
            {comments.map((comment) => {
              const status = commentStatus(comment);
              return (
                <Column key={comment._id} gap="8" fillWidth>
                  <Row gap="8" wrap vertical="center">
                    <Text variant="label-strong-s">
                      {comment.reviewedBy?.name || comment.reviewedByName}
                    </Text>
                    <Text variant="label-default-s" onBackground="neutral-weak">
                      {comment.reviewedAt ? new Date(comment.reviewedAt).toLocaleDateString() : ''}
                    </Text>
                    <Tag size="s" variant={status.variant} label={status.label} />
                  </Row>
                  <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>
                    {comment.comment}
                  </Text>
                  <Row gap="8" wrap vertical="center">
                    {!comment.readBy && (
                      <Button size="s" variant="secondary" onClick={() => onMarkRead(comment._id)}>
                        Mark as read
                      </Button>
                    )}
                    {comment.readBy && !comment.isFixed && (
                      <Button size="s" variant="secondary" onClick={() => onMarkFixed(comment._id)}>
                        Mark as fixed
                      </Button>
                    )}
                    {comment.readBy && comment.readAt && (
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        Read {new Date(comment.readAt).toLocaleDateString()}
                      </Text>
                    )}
                  </Row>
                </Column>
              );
            })}
          </Column>
        </Card>
      )}

      {hasEditors && (
        <Card padding="16" radius="l" fillWidth direction="column">
          <Column gap="8" fillWidth>
            <Text variant="label-strong-s">
              {peopleOnPlan.length === 1 ? '1 person on this plan' : `${peopleOnPlan.length} people on this plan`}
            </Text>
            <Row gap="8" wrap>
              {peopleOnPlan.map((editor, index) => {
                const stepNumber = formSteps.find((step) => step.key === editor.stepKey)?.id;
                const editorUserId = typeof editor.userId === 'string' ? editor.userId : editor.userId?.toString();
                const currentUserId = currentUser?.id || currentUser?._id;
                const isCurrentUser =
                  editorUserId === currentUserId ||
                  editor.email?.toLowerCase() === currentUser?.email?.toLowerCase();
                const personKey = `${editor.email || editor.userId || 'editor'}-${editor.stepKey || index}-${index}`;
                return (
                  <Tag
                    key={personKey}
                    size="s"
                    variant={isCurrentUser ? 'brand' : 'neutral'}
                    label={`${editor.userName || editor.email}${stepNumber ? ` · Step ${stepNumber}` : ''}`}
                  />
                );
              })}
            </Row>
          </Column>
        </Card>
      )}

      {hasSharing && (
        <Card padding="16" radius="l" fillWidth direction="column">
          <Column gap="8" fillWidth>
            <Text variant="label-strong-s">Shared with</Text>
            <Row gap="8" wrap>
              {sharedWith.map((share) => (
                <Row key={share.email} gap="4" vertical="center">
                  <Tag size="s" variant="neutral" label={`${share.email} · ${share.permissions}`} />
                  {onRemoveShare && (
                    <Button size="s" variant="tertiary" onClick={() => onRemoveShare(share.email)}>
                      Remove
                    </Button>
                  )}
                </Row>
              ))}
            </Row>
          </Column>
        </Card>
      )}
    </Column>
  );
}
