'use client';

import { Column, Row, Text, Button, Tag } from '@once-ui-system/core';
import TableAnswerField from './TableAnswerField';
import QuestionPrompt from '../QuestionPrompt';
import { isGateQuestion, normalizeYesNo } from '../../lib/questionBankUtils';

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
  const isTable = question.type === 'table';
  const isYesNo = question.type === 'yesno';
  const isGate = isGateQuestion(question);
  const showAsCheckbox = isCheckbox || (isYesNo && isGate);
  const isChecked = value === true || normalizeYesNo(value) === 'yes';
  const flagged = Boolean(flag);
  const inactive = question.active === false;

  return (
    <Column
      padding="20"
      radius="l"
      fillWidth
      gap="12"
      horizontal="stretch"
      className="app-question-card"
      border={flagged ? 'warning-medium' : 'neutral-medium'}
      background={flagged ? 'warning-alpha-weak' : 'surface'}
      style={{ width: '100%', alignSelf: 'stretch' }}
    >
        <Row gap="12" vertical="start" fillWidth>
          <Tag size="s" variant="brand" label={String(question.question_number || '•')} />
          <Column gap="4" fillWidth style={{ minWidth: 0, width: '100%' }}>
            {!showAsCheckbox && !isYesNo && (
              <QuestionPrompt
                question={question}
                requiredSuffix={
                  question.required && question.active !== false && !readOnly ? ' · Required' : null
                }
              />
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

        {isYesNo && !showAsCheckbox ? (
          <Column gap="8" fillWidth>
            <QuestionPrompt
              question={question}
              requiredSuffix={question.required && question.active !== false && !readOnly ? ' · Required' : null}
            />
            <div className="app-yesno" role="radiogroup" aria-label={question.title}>
              {['yes', 'no'].map((option) => {
                const selected = value === option;
                return (
                  <label
                    key={option}
                    className="app-yesno-option"
                    data-selected={selected ? 'true' : 'false'}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option}
                      checked={selected}
                      disabled={readOnly}
                      onChange={() => onChange(option)}
                    />
                    <span>{option === 'yes' ? 'Yes' : 'No'}</span>
                  </label>
                );
              })}
            </div>
          </Column>
        ) : showAsCheckbox ? (
          <Column gap="8" fillWidth>
            <Row gap="12" vertical="start" fillWidth>
              <input
                type="checkbox"
                id={question.id}
                checked={isChecked}
                disabled={readOnly}
                onChange={(event) => onChange(event.target.checked)}
                className="app-checkbox"
              />
              <Column gap="4" fillWidth style={{ minWidth: 0 }}>
                <QuestionPrompt
                  question={question}
                  headingVariant="body-default-m"
                  requiredSuffix={question.required && !readOnly ? ' · Required' : null}
                />
              </Column>
            </Row>
          </Column>
        ) : isText ? (
          <input
            type="text"
            id={question.id}
            value={value || ''}
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            className="app-field"
            style={{ width: '100%', display: 'block', boxSizing: 'border-box' }}
          />
        ) : isTable ? (
          <div className="app-question-answer">
            <TableAnswerField
              value={value}
              columns={question.columns}
              placeholder={question.placeholder}
              readOnly={readOnly}
              onChange={onChange}
            />
          </div>
        ) : (
          <textarea
            id={question.id}
            value={value || ''}
            disabled={readOnly}
            onChange={(event) => onChange(event.target.value)}
            placeholder={question.placeholder}
            rows={5}
            className="app-field app-field-area"
            style={{ width: '100%', display: 'block', boxSizing: 'border-box' }}
          />
        )}
    </Column>
  );
}
