'use client';

import { useState, useEffect, useRef } from 'react';
import { Column, Row, Text, Card, Tag } from '@once-ui-system/core';
import formQuestionsData from '../../data/formQuestions.json';
import QuestionCard from './QuestionCard';

const FALLBACK_SECTIONS = [
  { num: 1, title: 'Table of Contents', key: 'tableOfContents' },
  { num: 2, title: 'Child Abuse and Neglect Intervention and Prevention School Plan', key: 'childAbuseIntervention' },
  { num: 3, title: 'Student to Student Sexual Harassment', key: 'sexualHarassment' },
  { num: 4, title: 'Respect For All Plan', key: 'respectForAll' },
  { num: 5, title: 'Suicide Prevention and School Crisis Intervention Plan', key: 'suicidePrevention' },
  { num: 6, title: 'School Attendance Plan', key: 'attendancePlan' },
  { num: 7, title: 'Students in Temporary Housing (STH) Program Plan', key: 'temporaryHousing' },
  { num: 8, title: 'Service In Schools Plan', key: 'serviceInSchools' },
  { num: 9, title: 'Planning Interviews', key: 'planningInterviews' },
  { num: 10, title: 'Military Recruitment OPT-OUT Notification', key: 'militaryRecruitment' },
  { num: 11, title: 'School Culture Plan', key: 'schoolCulture' },
  { num: 12, title: 'After School Programs', key: 'afterSchoolPrograms' },
  { num: 13, title: 'Cell Phone Policy', key: 'cellPhonePolicy' },
  { num: 14, title: 'School Counseling Plan', key: 'counselingPlan' },
];

const Step1TableOfContents = ({
  stepData,
  updateStepData,
  navigateToStep,
  allStepData,
  currentStep,
  questions: questionsProp,
  formSteps,
  readOnly = false,
}) => {
  const [questions, setQuestions] = useState(() => {
    if (questionsProp?.length) return questionsProp;
    const step = formQuestionsData.steps.find((item) => item.key === 'tableOfContents');
    return step ? step.questions : [];
  });

  useEffect(() => {
    if (questionsProp?.length) {
      setQuestions(questionsProp);
    }
  }, [questionsProp]);

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
    updateStepData('tableOfContents', newFormData);
  };

  const sections = formSteps?.length
    ? formSteps.map((step) => ({ num: step.id, title: step.title, key: step.key }))
    : FALLBACK_SECTIONS;

  const getStepKey = (stepNum) => sections.find((section) => section.num === stepNum)?.key;

  const isStepCompleted = (stepNum) => {
    if (!allStepData) return false;
    const stepKey = getStepKey(stepNum);
    return allStepData[stepKey]?.completed === true;
  };

  return (
    <Column gap="16" fillWidth>
      <Card padding="20" radius="l" fillWidth direction="column">
        <Column gap="12" fillWidth>
          <Text variant="label-strong-s">Plan sections</Text>
          <Text variant="body-default-s" onBackground="neutral-weak">
            Confirm you understand the structure, then continue. Use a section name to jump ahead.
          </Text>
          <Column gap="4" fillWidth>
            {sections.map((section) => {
              const completed = isStepCompleted(section.num);
              const selected = currentStep === section.num;
              return (
                <Row
                  key={section.num}
                  as="button"
                  fillWidth
                  gap="8"
                  paddingX="8"
                  paddingY="8"
                  radius="m"
                  vertical="center"
                  background={selected ? 'brand-alpha-weak' : undefined}
                  onClick={() => navigateToStep && navigateToStep(section.num)}
                  disabled={!navigateToStep}
                  style={{
                    cursor: navigateToStep ? 'pointer' : 'default',
                    border: 'none',
                    textAlign: 'left',
                  }}
                >
                  <Tag
                    size="s"
                    variant={completed ? 'success' : selected ? 'brand' : 'neutral'}
                    label={completed ? '✓' : String(section.num)}
                  />
                  <Text
                    variant={selected ? 'label-strong-s' : 'label-default-s'}
                    onBackground={selected ? 'brand-strong' : 'neutral-strong'}
                  >
                    {section.title}
                  </Text>
                </Row>
              );
            })}
          </Column>
        </Column>
      </Card>

      {questions.map((question) => (
        <QuestionCard
          key={question.id}
          question={question}
          value={formData[question.id] || (question.type === 'checkbox' ? false : '')}
          onChange={(value) => handleInputChange(question.id, value)}
          readOnly={readOnly}
        />
      ))}
    </Column>
  );
};

export default Step1TableOfContents;
