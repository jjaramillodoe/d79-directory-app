'use client';

import { useState, useEffect, useRef } from 'react';
import { Column, Text } from '@once-ui-system/core';
import { questionsForDisplay } from '../../lib/questionBankUtils';
import QuestionCard from './QuestionCard';

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
