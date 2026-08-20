'use client';

import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
} from '@once-ui-system/core';
import { FileText, User, Calendar, Shield, AlertCircle } from 'lucide-react';
import FormStatusTag from './FormStatusTag';

function formHasComments(form) {
  const hasComments = form.comments && form.comments.length > 0;
  const hasLegacyComment = form.reviewComments && form.reviewComments.trim().length > 0;
  return hasComments || hasLegacyComment;
}

function getLatestDate(form) {
  if (form.comments && form.comments.length > 0) {
    return new Date(form.comments[0].reviewedAt);
  }
  return form.reviewedAt ? new Date(form.reviewedAt) : new Date(0);
}

export default function CommentsOverview({ forms }) {
  const commentedForms = forms.filter(formHasComments).sort((a, b) => getLatestDate(b) - getLatestDate(a));

  return (
    <Column gap="20" fillWidth>
      <Column gap="4">
        <Heading variant="heading-strong-m">Review Comments & Feedback</Heading>
        <Text variant="body-default-s" onBackground="neutral-weak">
          View review comments from super admins on Consolidated Plan submissions.
        </Text>
      </Column>

      {commentedForms.length === 0 ? (
        <Column horizontal="center" paddingY="48" gap="12">
          <FileText size={48} strokeWidth={1.25} />
          <Text variant="heading-strong-s">No review comments yet</Text>
          <Text variant="body-default-s" onBackground="neutral-weak" align="center">
            Comments will appear here once a super admin provides feedback.
          </Text>
        </Column>
      ) : (
        <Column gap="16" fillWidth>
          {commentedForms.map((form) => {
            const latestComment =
              form.comments && form.comments.length > 0
                ? form.comments[0]
                : form.reviewComments
                  ? {
                      comment: form.reviewComments,
                      reviewedBy: form.reviewedBy,
                      reviewedAt: form.reviewedAt,
                    }
                  : null;
            const reviewerName =
              latestComment?.reviewedBy?.name ||
              latestComment?.reviewedByName ||
              form.reviewedBy?.name;
            const reviewedAt = latestComment?.reviewedAt || form.reviewedAt;
            const stepComments = (form.comments || []).filter((comment) => comment.stepNumber);

            return (
              <Card key={form._id} padding="20" radius="l" fillWidth direction="column" gap="16">
                <Row fillWidth horizontal="between" vertical="start" gap="16" wrap>
                  <Column gap="8" flex={1}>
                    <Row gap="8" vertical="center" wrap>
                      <Heading variant="heading-strong-s">{form.schoolName}</Heading>
                      <FormStatusTag status={form.status} />
                    </Row>
                    <Row gap="16" wrap vertical="center">
                      <Row gap="4" vertical="center">
                        <User size={14} />
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          {form.principalName}
                        </Text>
                      </Row>
                      <Row gap="4" vertical="center">
                        <Calendar size={14} />
                        <Text variant="body-default-s" onBackground="neutral-weak">
                          {reviewedAt
                            ? `Reviewed: ${new Date(reviewedAt).toLocaleDateString()}`
                            : 'Not reviewed'}
                        </Text>
                      </Row>
                      {reviewerName && (
                        <Row gap="4" vertical="center">
                          <Shield size={14} />
                          <Text variant="body-default-s" onBackground="neutral-weak">
                            Reviewed by: {reviewerName}
                          </Text>
                        </Row>
                      )}
                    </Row>
                  </Column>
                  <Row gap="8" wrap>
                    <Button href={`/form/${form._id}`} size="s" variant="primary">
                      Edit Form
                    </Button>
                    <Button href={`/view/${form._id}`} size="s" variant="secondary">
                      View All
                    </Button>
                  </Row>
                </Row>

                <Card padding="16" radius="m" fillWidth direction="column" gap="12" background="brand-alpha-weak">
                  <Text variant="label-strong-s">
                    {form.comments && form.comments.length > 1
                      ? `Review Comments (${form.comments.length} total)`
                      : 'Review Comments'}
                  </Text>
                  {latestComment && (
                    <Text variant="body-default-m" style={{ whiteSpace: 'pre-wrap' }}>
                      {latestComment.comment || latestComment}
                    </Text>
                  )}

                  {stepComments.length > 0 && (
                    <Column gap="8" fillWidth>
                      <Text variant="label-default-s" onBackground="neutral-weak">
                        Step-specific comments
                      </Text>
                      {stepComments
                        .sort((a, b) => (a.stepNumber || 0) - (b.stepNumber || 0))
                        .map((comment) => (
                          <Card
                            key={comment._id}
                            padding="12"
                            radius="m"
                            fillWidth
                            direction="column"
                            gap="8"
                            border={comment.isFixed ? 'success-medium' : 'neutral-medium'}
                          >
                            <Row horizontal="between" vertical="center" fillWidth>
                              <Text variant="label-strong-s">
                                Step {comment.stepNumber}
                              </Text>
                              {comment.isFixed && (
                                <Text variant="label-default-s" onBackground="success-strong">
                                  Fixed
                                </Text>
                              )}
                            </Row>
                            <Text variant="body-default-s" style={{ whiteSpace: 'pre-wrap' }}>
                              {comment.comment}
                            </Text>
                          </Card>
                        ))}
                    </Column>
                  )}
                </Card>

                {(form.status === 'rejected' || form.status === 'under_review') && (
                  <Row
                    gap="8"
                    padding="12"
                    radius="m"
                    background="warning-alpha-weak"
                    vertical="center"
                  >
                    <AlertCircle size={16} />
                    <Text variant="body-default-s">
                      Action required: review the comments and update the Consolidated Plan.
                    </Text>
                  </Row>
                )}
              </Card>
            );
          })}
        </Column>
      )}
    </Column>
  );
}
