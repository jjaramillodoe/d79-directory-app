'use client';

import { Tag } from '@once-ui-system/core';

const STATUS_CONFIG = {
  draft: { label: 'Draft', variant: 'neutral' },
  submitted: { label: 'Submitted', variant: 'brand' },
  under_review: { label: 'Under Review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
};

export default function FormStatusTag({ status }) {
  const config = STATUS_CONFIG[status] || {
    label: status || 'Unknown',
    variant: 'neutral',
  };

  return (
    <Tag variant={config.variant} size="s" label={config.label} />
  );
}
