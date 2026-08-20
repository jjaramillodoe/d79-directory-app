'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Column, Row, Text, Button, Card, Spinner, Tag } from '@once-ui-system/core';
import useQuestionBank from '../../../hooks/useQuestionBank';
import useAppToast from '../../../hooks/useAppToast';
import Step1TableOfContents from '../../../components/form-steps/Step1TableOfContents';
import GenericFormStep from '../../../components/form-steps/GenericFormStep';
import DashboardShell from '../../../components/dashboard/DashboardShell';
import DashboardSidebar from '../../../components/dashboard/DashboardSidebar';
import DashboardHeader from '../../../components/dashboard/DashboardHeader';
import FormStatusTag from '../../../components/dashboard/FormStatusTag';
import { inferSchoolYear } from '../../../lib/schoolYear';
import { completedStepCount, stepProgressPercent } from '../../../lib/formProgress';

const FALLBACK_STEP_KEYS = [
  'tableOfContents', 'childAbuseIntervention',
  'sexualHarassment', 'respectForAll', 'suicidePrevention',
  'attendancePlan', 'temporaryHousing', 'serviceInSchools',
  'planningInterviews', 'militaryRecruitment', 'schoolCulture',
  'afterSchoolPrograms', 'cellPhonePolicy', 'counselingPlan',
];

export default function FormViewPage() {
  const params = useParams();
  const router = useRouter();
  const formId = params.id;
  const { data: session, status } = useSession();
  const toast = useAppToast();
  const [formData, setFormData] = useState(null);
  const { questionBank } = useQuestionBank({
    schoolYear: formData?.schoolYear,
    version: formData?.questionBankVersion,
  });
  const FORM_STEPS = (questionBank.steps || []).map((step, index) => ({
    id: index + 1,
    title: step.title,
    key: step.key,
  }));

  const [stepData, setStepData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [downloadingDOCX, setDownloadingDOCX] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'loading' || !session) return;
    loadFormData();
  }, [session, status, formId]);

  const loadFormData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/forms/${formId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.form) {
        throw new Error('Form not found');
      }

      setFormData(data.form);

      const loadedStepData = data.form.formData || {};
      const stepKeys = FORM_STEPS.length
        ? FORM_STEPS.map((step) => step.key)
        : FALLBACK_STEP_KEYS;

      const initializedStepData = {};
      stepKeys.forEach((key) => {
        const stepInfo = loadedStepData[key];
        let stepDataObj = {};

        if (stepInfo?.data && typeof stepInfo.data === 'object') {
          const nestedKey = Object.keys(stepInfo.data)[0];
          if (nestedKey === key && stepInfo.data[nestedKey]) {
            stepDataObj = stepInfo.data[nestedKey];
          } else {
            stepDataObj = stepInfo.data;
          }
        }

        initializedStepData[key] = {
          completed: stepInfo?.completed || false,
          data: stepDataObj,
        };
      });

      setStepData(initializedStepData);
    } catch (err) {
      console.error('Error loading form:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadFile = async (url, filename, expectedType, label) => {
    const response = await fetch(url);
    if (!response.ok) {
      let errorMessage = `Failed to generate ${label}`;
      try {
        const errorData = await response.json();
        errorMessage = errorData.error || errorMessage;
      } catch (e) {
        errorMessage = response.statusText || errorMessage;
      }
      throw new Error(errorMessage);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes(expectedType)) {
      const errorText = await response.text();
      console.error('Unexpected response:', errorText);
      throw new Error(`Server returned a non-${label} response`);
    }

    const blob = await response.blob();
    if (blob.size === 0) {
      throw new Error(`${label} file is empty`);
    }

    const objectUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(objectUrl);
    document.body.removeChild(a);
  };

  const handleDownloadPDF = async () => {
    setDownloadingPDF(true);
    try {
      const filename = `${(formData?.schoolName || 'form').replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.pdf`;
      await downloadFile(`/api/forms/${formId}/export/pdf`, filename, 'application/pdf', 'PDF');
    } catch (err) {
      console.error('Error downloading PDF:', err);
      toast.error(`Failed to download PDF: ${err.message}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  const handleDownloadDOCX = async () => {
    setDownloadingDOCX(true);
    try {
      const filename = `${(formData?.schoolName || 'form').replace(/[^a-z0-9]/gi, '_')}_Consolidated_Plan.docx`;
      await downloadFile(`/api/forms/${formId}/export/docx`, filename, 'wordprocessingml', 'Word document');
    } catch (err) {
      console.error('Error downloading DOCX:', err);
      toast.error(`Failed to download Word document: ${err.message}`);
    } finally {
      setDownloadingDOCX(false);
    }
  };

  const scrollToStep = (stepId) => {
    document.getElementById(`view-step-${stepId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const renderStep = (step) => {
    const stepKey = step.key;
    const currentStepData = stepData[stepKey]?.data || {};
    const dummyUpdate = () => {};
    const stepConfig = questionBank.steps.find((item) => item.key === stepKey);

    if (step.id === 1) {
      return (
        <Step1TableOfContents
          stepData={currentStepData}
          updateStepData={dummyUpdate}
          navigateToStep={scrollToStep}
          allStepData={stepData}
          currentStep={1}
          questions={stepConfig?.questions || []}
          formSteps={FORM_STEPS}
          readOnly
        />
      );
    }

    return (
      <GenericFormStep
        stepKey={stepKey}
        stepTitle={`Section ${step.id}: ${step.title}`}
        questions={stepConfig?.questions || []}
        stepData={currentStepData}
        updateStepData={dummyUpdate}
        currentStep={step.id}
        readOnly
      />
    );
  };

  if (status === 'loading' || !session || loading) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading plan…</Text>
      </Column>
    );
  }

  if (error || !formData) {
    return (
      <DashboardShell
        sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
        header={
          <DashboardHeader
            title="Plan view"
            description="Could not load this school plan"
            session={session}
            userLevel={session.user.level}
            actions={
              <Button size="s" variant="secondary" href="/dashboard">
                Back to dashboard
              </Button>
            }
          />
        }
      >
        <Text onBackground="danger-strong">{error || 'Form not found'}</Text>
      </DashboardShell>
    );
  }

  const schoolYear = inferSchoolYear(formData);
  const completed = completedStepCount(formData);
  const total = FORM_STEPS.length || 14;
  const percent = stepProgressPercent(formData, total);

  return (
    <>
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          header, aside, nav {
            display: none !important;
          }
          .print-break {
            page-break-before: always;
          }
          .print-avoid-break {
            page-break-inside: avoid;
          }
          body {
            background: white !important;
          }
        }
      `}</style>

      <DashboardShell
        sidebar={
          <div className="no-print">
            <DashboardSidebar session={session} userLevel={session.user.level} />
          </div>
        }
        header={
          <DashboardHeader
            title={formData.schoolName || 'School plan'}
            description={`${schoolYear} · All sections · Read-only`}
            session={session}
            userLevel={session.user.level}
            actions={
              <Row gap="8" wrap className="no-print">
                <Button size="s" variant="secondary" href={`/form/${formId}`}>
                  Edit plan
                </Button>
                <Button size="s" variant="tertiary" onClick={handlePrint}>
                  Print
                </Button>
                <Button size="s" variant="tertiary" onClick={handleDownloadPDF} disabled={downloadingPDF}>
                  {downloadingPDF ? 'Generating…' : 'PDF'}
                </Button>
                <Button size="s" variant="tertiary" onClick={handleDownloadDOCX} disabled={downloadingDOCX}>
                  {downloadingDOCX ? 'Generating…' : 'Word'}
                </Button>
              </Row>
            }
          />
        }
      >
        <Card padding="20" radius="l" fillWidth direction="column" className="print-avoid-break">
          <Column gap="12" fillWidth>
            <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
              <Row gap="8" wrap vertical="center">
                <FormStatusTag status={formData.status} />
                <Tag size="s" variant="neutral" label={schoolYear} />
                <Tag size="s" variant="brand" label="Read-only" />
                <Text variant="label-default-s" onBackground="neutral-weak">
                  {completed}/{total} steps · {percent}%
                </Text>
              </Row>
              {formData.principalName && (
                <Text variant="label-default-s" onBackground="neutral-weak">
                  Principal {formData.principalName}
                  {formData.submittedAt
                    ? ` · Submitted ${new Date(formData.submittedAt).toLocaleDateString()}`
                    : ''}
                </Text>
              )}
            </Row>
            <Text variant="body-default-s" onBackground="neutral-weak">
              Review every section in one place. Use Edit plan to make changes, or export a PDF or Word copy.
            </Text>
          </Column>
        </Card>

        <Row fillWidth gap="16" wrap style={{ alignItems: 'flex-start' }}>
          <Column
            gap="8"
            padding="16"
            background="surface"
            border="neutral-medium"
            radius="l"
            className="no-print"
            style={{
              width: 280,
              flexShrink: 0,
              position: 'sticky',
              top: 16,
            }}
          >
            <Text variant="label-strong-s">Sections</Text>
            {FORM_STEPS.map((step) => (
              <Row
                key={step.key || step.id}
                as="button"
                fillWidth
                gap="8"
                paddingX="8"
                paddingY="8"
                radius="m"
                vertical="start"
                onClick={() => scrollToStep(step.id)}
                title={step.title}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                  background: 'transparent',
                }}
              >
                <Text variant="label-default-s" onBackground="neutral-strong">
                  {step.id}. {step.title}
                </Text>
              </Row>
            ))}
          </Column>

          <Column fillWidth gap="16" style={{ minWidth: 0, flex: 1 }}>
            {FORM_STEPS.map((step, index) => (
              <Card
                key={step.id}
                id={`view-step-${step.id}`}
                padding="24"
                radius="l"
                fillWidth
                direction="column"
                className={`print-avoid-break ${index > 0 ? 'print-break' : ''}`}
              >
                <Column gap="16" fillWidth>
                  <Row gap="8" vertical="center" wrap>
                    <Tag size="s" variant="neutral" label={`Section ${step.id}`} />
                    {stepData[step.key]?.completed && (
                      <Tag size="s" variant="success" label="Completed" />
                    )}
                  </Row>
                  <Text variant="heading-strong-m">{step.title}</Text>
                  {renderStep(step)}
                </Column>
              </Card>
            ))}

            <Text variant="label-default-s" onBackground="neutral-weak" className="no-print">
              Plan ID {formId} · Generated {new Date().toLocaleString()}
            </Text>
          </Column>
        </Row>
      </DashboardShell>
    </>
  );
}
