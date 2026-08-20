'use client';

import { useEffect, useState } from 'react';
import {
  Column,
  Row,
  Text,
  Button,
  ProgressBar,
  Card,
  Tag,
  Spinner,
  Heading,
} from '@once-ui-system/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import DashboardShell from '../dashboard/DashboardShell';
import DashboardSidebar from '../dashboard/DashboardSidebar';
import DashboardHeader from '../dashboard/DashboardHeader';
import FormStatusTag from '../dashboard/FormStatusTag';
import { inferSchoolYear } from '../../lib/schoolYear';

const SECTIONS_OPEN_KEY = 'form-sections-open';

export default function FormWorkspace({
  session,
  isPrintView,
  formData,
  currentStep,
  formSteps,
  completion,
  userPermissions,
  autoSaving,
  lastSaved,
  saveError,
  showSaveReminder,
  redirecting,
  redirectCountdown,
  onCancelRedirect,
  onDismissReminder,
  onDismissError,
  onNavigateStep,
  headerActions,
  locked = false,
  yearArchived = false,
  allowEditsWhenArchived = false,
  deadlineLabel,
  footer,
  children,
}) {
  const [sectionsOpen, setSectionsOpen] = useState(true);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SECTIONS_OPEN_KEY) === 'false') {
        setSectionsOpen(false);
      }
    } catch (error) {
      // Keep the default open state if storage is unavailable.
    }
  }, []);

  const toggleSections = () => {
    setSectionsOpen((open) => {
      const next = !open;
      try {
        window.localStorage.setItem(SECTIONS_OPEN_KEY, String(next));
      } catch (error) {
        // Ignore storage failures.
      }
      return next;
    });
  };

  if (isPrintView) {
    return (
      <div className="min-h-screen bg-white p-8">
        {children}
      </div>
    );
  }

  if (!session) {
    return (
      <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
        <Spinner size="l" />
        <Text onBackground="neutral-weak">Loading...</Text>
      </Column>
    );
  }

  const stepTitle = formSteps[currentStep - 1]?.title || `Step ${currentStep}`;
  const schoolYear = inferSchoolYear(formData);
  const progressValue = formSteps.length
    ? Math.round((completion.completed / formSteps.length) * 100)
    : 0;
  const saveLabel = autoSaving
    ? 'Saving…'
    : saveError
      ? saveError
      : lastSaved
        ? `Editing · Saved ${lastSaved.toLocaleTimeString()}`
        : 'Editing · autosaved';

  return (
    <DashboardShell
      sidebar={<DashboardSidebar session={session} userLevel={session.user.level} />}
      header={
        <DashboardHeader
          title={formData.schoolName || 'School plan'}
          description={schoolYear}
          session={session}
          userLevel={session.user.level}
          actions={headerActions}
        />
      }
    >
      <Card padding="16" radius="l" fillWidth direction="column">
        <Column gap="12" fillWidth>
          <Row fillWidth horizontal="between" vertical="center" wrap gap="8">
            <Text variant="label-default-s" onBackground="neutral-weak">
              {locked
                ? 'Archived · read-only'
                : yearArchived && allowEditsWhenArchived
                  ? 'Year archived · this plan is live so it can be finished'
                  : userPermissions === 'view'
                  ? 'View only'
                  : saveError
                    ? saveLabel
                    : showSaveReminder && !autoSaving
                      ? 'Unsaved changes'
                      : saveLabel}
              {deadlineLabel ? ` · ${deadlineLabel}` : ''}
              {` · ${completion.completed}/${completion.total} sections`}
            </Text>
            <Row gap="8" wrap vertical="center">
              <FormStatusTag status={formData.status} />
              {saveError && (
                <Button size="s" variant="danger" onClick={onDismissError}>
                  Dismiss
                </Button>
              )}
              {showSaveReminder && !autoSaving && !saveError && (
                <Button size="s" variant="tertiary" onClick={onDismissReminder}>
                  Dismiss
                </Button>
              )}
            </Row>
          </Row>
          <ProgressBar value={progressValue} label={false} barBackground="brand-strong" />
          {redirecting && (
            <Row gap="8" vertical="center" wrap>
              <Text variant="body-default-s">Redirecting in {redirectCountdown}s</Text>
              <Button size="s" variant="secondary" onClick={onCancelRedirect}>
                Stay on form
              </Button>
            </Row>
          )}
        </Column>
      </Card>

      <Row fillWidth gap="16" wrap style={{ alignItems: 'stretch', flex: 1, minHeight: 'calc(100vh - 16rem)' }}>
        <Column
          gap="8"
          padding={sectionsOpen ? '16' : '8'}
          background="surface"
          border="neutral-medium"
          radius="l"
          className="no-print"
          style={{
            width: sectionsOpen ? 300 : 64,
            flexShrink: 0,
            position: 'sticky',
            top: 16,
            alignSelf: 'flex-start',
            maxHeight: 'calc(100vh - 8rem)',
            overflow: 'auto',
            transition: 'width 160ms ease',
          }}
        >
          <Row fillWidth horizontal="between" vertical="center" gap="4">
            {sectionsOpen && <Text variant="label-strong-s">Sections</Text>}
            <Button
              size="s"
              variant="tertiary"
              onClick={toggleSections}
              aria-label={sectionsOpen ? 'Hide sections' : 'Show sections'}
              title={sectionsOpen ? 'Hide sections' : 'Show sections'}
            >
              {sectionsOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </Button>
          </Row>
          {formSteps.map((step) => {
            const selected = step.id === currentStep;
            const completed = Boolean(step.completed);
            const label = `${step.id}. ${step.title}`;
            return (
              <Row
                key={step.key || step.id}
                as="button"
                fillWidth
                gap="8"
                paddingX="8"
                paddingY="8"
                radius="m"
                vertical="center"
                horizontal={sectionsOpen ? 'start' : 'center'}
                background={selected ? 'brand-alpha-weak' : undefined}
                onClick={() => onNavigateStep(step.id)}
                title={label}
                className="form-section-item"
                data-selected={selected ? 'true' : 'false'}
                style={{
                  cursor: 'pointer',
                  border: 'none',
                  textAlign: 'left',
                }}
              >
                <Tag
                  size="s"
                  variant={completed ? 'success' : selected ? 'brand' : 'neutral'}
                  label={completed ? '✓' : String(step.id)}
                />
                {sectionsOpen && (
                  <span className="form-section-title">{step.title}</span>
                )}
              </Row>
            );
          })}
        </Column>

        <Column
          fillWidth
          gap="12"
          style={{
            minWidth: 0,
            flex: 1,
            maxHeight: 'calc(100vh - 16rem)',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Column gap="16" fillWidth style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <Column gap="4">
              <Heading variant="heading-strong-m">{stepTitle}</Heading>
            </Column>
            {children}
          </Column>
          {footer && (
            <Row
              className="no-print"
              fillWidth
              padding="12"
              background="surface"
              border="neutral-medium"
              radius="l"
              style={{ flexShrink: 0 }}
            >
              {footer}
            </Row>
          )}
        </Column>
      </Row>
    </DashboardShell>
  );
}
