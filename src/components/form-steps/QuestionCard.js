'use client';

import { Column, Row, Text, Button, Card, Tag } from '@once-ui-system/core';

function flagCopy(flag) {
  if (!flag) return '';
  if (flag.reason === 'new') return 'New this year';
  if (flag.reason === 'changed') return 'This question changed — review the copied answer';
  return 'Same as last year';
}

export default function QuestionCard({
  question,
  value,
  onChange,
  readOnly = false,
  flag,
  onReviewQuestion,
}) {
  const isCheckbox = question.type === 'checkbox';
  const isText = question.type === 'text';
  const flagged = Boolean(flag);
  const inactive = question.active === false;

  return (
    <Card
      padding="20"
      radius="l"
      fillWidth
      direction="column"
      border={flagged ? 'warning-medium' : 'neutral-medium'}
      background={flagged ? 'warning-alpha-weak' : 'surface'}
    >
      <Column gap="12" fillWidth>
        <Row gap="12" vertical="start" fillWidth>
          <Tag size="s" variant="brand" label={String(question.question_number || '•')} />
          <Column gap="4" fillWidth style={{ minWidth: 0 }}>
            {!isCheckbox && (
              <Text variant="heading-strong-s" style={{ whiteSpace: 'pre-line' }}>
                {question.title}
                {question.required && question.active !== false && !readOnly ? ' · Required' : ''}
              </Text>
            )}
            {question.description && !isCheckbox && (
              <Text variant="body-default-s" onBackground="neutral-weak" style={{ whiteSpace: 'pre-line' }}>
                {question.description}
              </Text>
            )}
            {inactive && (
              <Text variant="label-default-s" onBackground="warning-strong">
                Inactive · saved answer kept
              </Text>
            )}
          </Column>
        </Row>

        {flagged && (
          <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
            <Text variant="body-default-s">{flagCopy(flag)}</Text>
            {!readOnly && onReviewQuestion && (
              <Button size="s" variant="tertiary" onClick={() => onReviewQuestion(question.id)}>
                Mark reviewed
              </Button>
            )}
          </Row>
        )}

        {isCheckbox ? (
          <Row gap="12" vertical="start" as="label" style={{ cursor: readOnly ? 'default' : 'pointer' }}>
            <input
              type="checkbox"
              id={question.id}
              checked={Boolean(value)}
              disabled={readOnly}
              onChange={(event) => onChange(event.target.checked)}
              className="app-checkbox"
            />
            <Text variant="body-default-m" style={{ whiteSpace: 'pre-line' }}>
              {question.title}
              {question.required && !readOnly ? ' · Required' : ''}
            </Text>
          </Row>
        ) : isText ? (
          <input
            type="text"
            id={question.id}
            value={value || ''}
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            className="app-field"
          />
        ) : (
          <textarea
            id={question.id}
            value={value || ''}
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            rows={5}
            className="app-field app-field-area"
          />
        )}
      </Column>
    </Card>
  );
}
