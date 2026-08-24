'use client';

import { Column, Text } from '@once-ui-system/core';
import LinkifiedText from './LinkifiedText';
import { splitQuestionCopy, withNoteEmphasis } from '../lib/questionCopy';

export default function QuestionPrompt({
  question,
  requiredSuffix = null,
  headingVariant = 'heading-strong-s',
  compact = false,
}) {
  const copy = splitQuestionCopy(question?.title, question?.description);
  const heading = copy.heading;
  const body = withNoteEmphasis(copy.body);
  const helper = copy.helper;
  const suffix = heading ? requiredSuffix : null;
  const bodySuffix = heading ? null : requiredSuffix;

  if (!heading && !body && !helper) return null;

  return (
    <Column gap={compact ? '8' : '4'} fillWidth style={{ minWidth: 0, width: '100%' }}>
      {heading ? (
        <Text variant={headingVariant} style={{ whiteSpace: 'pre-line' }}>
          <LinkifiedText text={heading} suffix={suffix} />
        </Text>
      ) : null}
      {body ? (
        <Text variant="body-default-m" style={{ whiteSpace: 'pre-line' }}>
          <LinkifiedText text={body} suffix={bodySuffix} />
        </Text>
      ) : null}
      {helper ? (
        <Text variant="body-default-s" onBackground="neutral-weak" style={{ whiteSpace: 'pre-line' }}>
          <LinkifiedText text={helper} />
        </Text>
      ) : null}
    </Column>
  );
}
