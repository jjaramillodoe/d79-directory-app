'use client';

import { useState } from 'react';
import {
  Column,
  Row,
  Text,
  Button,
  ProgressBar,
  Spinner,
  SmartLink,
  Tag,
} from '@once-ui-system/core';
import { FileSpreadsheet } from 'lucide-react';
import DashboardSection from './DashboardSection';
import FormStatusTag from './FormStatusTag';
import DuplicateFormModal from '../admin/DuplicateFormModal';
import { inferSchoolYear } from '../../lib/schoolYear';
import { completedStepCount, stepProgressPercent, TOTAL_STEPS } from '../../lib/formProgress';

export default function FormsOverview({
  forms,
  loading,
  isAdmin,
  userLevel,
  onDuplicated,
}) {
  const [formToDuplicate, setFormToDuplicate] = useState(null);
  const title = isAdmin ? 'All Form Submissions' : 'Your Form Submissions';

  return (
    <DashboardSection title={title}>
      {loading ? (
        <Column horizontal="center" vertical="center" paddingY="48" gap="16">
          <Spinner size="l" />
          <Text onBackground="neutral-weak">Loading forms...</Text>
        </Column>
      ) : forms.length === 0 ? (
        <Column horizontal="center" paddingY="48" gap="16">
          <FileSpreadsheet size={64} strokeWidth={1.25} />
          <Text variant="heading-strong-l" align="center">
            No forms found yet.
          </Text>
          <Text onBackground="neutral-weak" align="center">
            {isAdmin
              ? 'No form submissions have been created yet.'
              : 'This is where your school plan submissions will appear once you create them.'}
          </Text>
          {userLevel >= 4 && !isAdmin && (
            <Button href="/form/new">Create your first form</Button>
          )}
          {userLevel === 3 && (
            <Text variant="body-default-s" onBackground="neutral-weak" align="center">
              Forms will appear here once your principal assigns them to you for collaboration.
            </Text>
          )}
        </Column>
      ) : (
        <Column gap="12" fillWidth>
          <Row fillWidth paddingX="12" paddingY="4" gap="12" wrap>
            <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 2 }}>
              School
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 1 }}>
              Principal
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 1 }}>
              Status
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak" style={{ flex: 1.4 }}>
              Progress
            </Text>
            <Text variant="label-default-s" onBackground="neutral-weak" style={{ width: 168 }}>
              Actions
            </Text>
          </Row>

          {forms.slice(0, 10).map((form) => {
            const completed = completedStepCount(form);
            const progress = stepProgressPercent(form, TOTAL_STEPS);

            return (
              <Row
                key={form._id}
                fillWidth
                gap="12"
                padding="12"
                border="neutral-medium"
                radius="m"
                vertical="center"
                wrap
              >
                <Column gap="4" style={{ flex: 2, minWidth: 160 }}>
                  <Row gap="8" vertical="center" wrap>
                    <Text weight="strong">{form.schoolName}</Text>
                    <Tag size="s" variant="neutral" label={inferSchoolYear(form)} />
                    {form.locked && <Tag size="s" variant="warning" label="Archived" />}
                    {form.yearArchived && form.allowEditsWhenArchived && (
                      <Tag size="s" variant="success" label="Live to finish" />
                    )}
                  </Row>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    {form.principalEmail}
                  </Text>
                </Column>
                <Text style={{ flex: 1, minWidth: 120 }}>{form.principalName}</Text>
                <Row style={{ flex: 1, minWidth: 120 }}>
                  <FormStatusTag status={form.status} />
                </Row>
                <Column gap="4" style={{ flex: 1.4, minWidth: 140 }}>
                  <ProgressBar value={progress} label={false} barBackground="brand-strong" />
                  <Text variant="label-default-s" onBackground="neutral-weak">
                    {completed}/{TOTAL_STEPS} steps · {progress}%
                  </Text>
                </Column>
                <Row gap="8" wrap style={{ width: 220 }}>
                  <Button href={`/form/${form._id}`} size="s" variant="primary">
                    View
                  </Button>
                  <Button href={`/form/${form._id}/compare`} size="s" variant="tertiary">
                    Compare
                  </Button>
                  {userLevel >= 4 && (
                    <Button size="s" variant="secondary" onClick={() => setFormToDuplicate(form)}>
                      Duplicate
                    </Button>
                  )}
                </Row>
              </Row>
            );
          })}

          {forms.length > 10 && (
            <Row fillWidth horizontal="center" paddingY="8">
              <Text variant="body-default-s" onBackground="neutral-weak">
                Showing first 10 submissions.
                {userLevel === 5 && (
                  <>
                    {' '}
                    <SmartLink href="/admin/submissions">View all submissions →</SmartLink>
                  </>
                )}
              </Text>
            </Row>
          )}
        </Column>
      )}

      {formToDuplicate && (
        <DuplicateFormModal
          form={formToDuplicate}
          onClose={() => setFormToDuplicate(null)}
          onDuplicated={onDuplicated}
        />
      )}
    </DashboardSection>
  );
}
