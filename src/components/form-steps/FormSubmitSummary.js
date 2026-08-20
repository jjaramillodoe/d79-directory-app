'use client';

import { Column, Row, Text, Button, Card, Tag } from '@once-ui-system/core';

export default function FormSubmitSummary({
  steps = [],
  completion,
  getStepDetails,
  onGoToStep,
}) {
  const incomplete = steps
    .map((step) => ({ step, details: getStepDetails(step.key) }))
    .filter((item) => !item.details.isComplete);
  const allComplete = incomplete.length === 0;

  return (
    <Card padding="20" radius="l" fillWidth direction="column">
      <Column gap="12" fillWidth>
        <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
          <Column gap="4">
            <Text variant="heading-strong-s">
              {allComplete ? 'Ready to submit' : 'Finish remaining sections'}
            </Text>
            <Text variant="body-default-s" onBackground="neutral-weak">
              {completion.completed}/{completion.total} sections complete
              {completion.questionCompletion?.total
                ? ` · ${completion.questionCompletion.answered}/${completion.questionCompletion.total} required questions`
                : ''}
            </Text>
          </Column>
          <Tag
            size="s"
            variant={allComplete ? 'success' : 'warning'}
            label={allComplete ? 'Complete' : `${incomplete.length} remaining`}
          />
        </Row>

        {allComplete ? (
          <Text variant="body-default-s" onBackground="neutral-weak">
            All required questions are answered. Submit when the plan has been reviewed.
          </Text>
        ) : (
          <Column gap="8" fillWidth>
            {incomplete.map(({ step, details }) => (
              <Row key={step.key} fillWidth horizontal="between" vertical="center" wrap gap="8">
                <Column gap="2" style={{ minWidth: 0, flex: 1 }}>
                  <Text variant="label-strong-s">
                    {step.id}. {step.title}
                  </Text>
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {details.requiredQuestions === 0
                      ? 'No required questions yet'
                      : `${details.answeredRequired}/${details.requiredQuestions} required answered`}
                  </Text>
                </Column>
                <Button size="s" variant="secondary" onClick={() => onGoToStep(step.id)}>
                  Open
                </Button>
              </Row>
            ))}
          </Column>
        )}
      </Column>
    </Card>
  );
}
