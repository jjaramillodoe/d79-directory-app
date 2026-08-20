'use client';

import { useState, useEffect, useRef } from 'react';
import { Column, Text } from '@once-ui-system/core';
import { isTableAnswered, isTableValue } from '../../lib/tableAnswer';
import QuestionCard from './QuestionCard';

function hasMeaningfulAnswer(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (isTableValue(value)) return isTableAnswered(value);
  return Boolean(value);
}

function questionsForDisplay(questions = [], answers = {}) {
  const sorted = [...questions].sort((a, b) => {
    const orderA = typeof a.order === 'number' ? a.order : 0;
    const orderB = typeof b.order === 'number' ? b.order : 0;
    return orderA - orderB;
  });

  const visible = sorted.filter((question) => question.active !== false || hasMeaningfulAnswer(answers[question.id]));
  const knownIds = new Set(visible.map((question) => question.id));

  Object.keys(answers || {}).forEach((id) => {
    if (knownIds.has(id) || !hasMeaningfulAnswer(answers[id])) return;
    visible.push({
      id,
      question_number: '',
      title: id,
      type: typeof answers[id] === 'boolean' ? 'checkbox' : 'textarea',
      required: false,
      description: 'Saved answer retained for a question that is no longer active.',
      active: false,
      orphan: true,
    });
  });

  return visible;
}

export default function GenericFormStep({
  stepKey,
  questions = [],
  stepData,
  updateStepData,
  currentStep,
  readOnly = false,
  needsUpdate = [],
  onReviewQuestion,
}) {
  const [formData, setFormData] = useState({});
  const isInitialMount = useRef(true);
  const lastStepRef = useRef(currentStep);
  const lastStepDataRef = useRef(null);

  useEffect(() => {
    const stepDataChanged = lastStepDataRef.current !== stepData;
    const stepDataHasContent = stepData && Object.keys(stepData).length > 0;
    const localDataIsEmpty = !formData || Object.keys(formData).length === 0;

    if (isInitialMount.current) {
      if (stepDataHasContent) {
        setFormData(stepData);
        lastStepDataRef.current = stepData;
      }
      isInitialMount.current = false;
      lastStepRef.current = currentStep;
    } else if (currentStep !== lastStepRef.current) {
      if (stepDataHasContent) {
        setFormData(stepData);
        lastStepDataRef.current = stepData;
      } else {
        setFormData({});
        lastStepDataRef.current = stepData;
      }
      lastStepRef.current = currentStep;
    } else if (stepDataChanged && stepDataHasContent && localDataIsEmpty) {
      setFormData(stepData);
      lastStepDataRef.current = stepData;
    }
  }, [currentStep, stepData, formData]);

  const handleInputChange = (questionId, value) => {
    const newFormData = { ...formData, [questionId]: value };
    setFormData(newFormData);
    updateStepData(stepKey, newFormData);
  };

  const displayQuestions = questionsForDisplay(questions, formData);
  const flagMap = new Map((needsUpdate || []).map((item) => [item.questionId, item]));

  if (displayQuestions.length === 0) {
    return (
      <Text onBackground="neutral-weak">No active questions in this section.</Text>
    );
  }

  return (
    <Column gap="16" fillWidth>
      {displayQuestions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          value={
            formData[question.id] ??
            (question.type === 'checkbox' ? false : question.type === 'table' ? null : '')
          }
          onChange={(value) => handleInputChange(question.id, value)}
          readOnly={readOnly}
          flag={flagMap.get(question.id)}
          onReviewQuestion={onReviewQuestion}
        />
      ))}
    </Column>
  );
}
