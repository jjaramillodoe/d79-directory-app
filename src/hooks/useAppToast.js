'use client';

import { useCallback } from 'react';
import { useToast } from '@once-ui-system/core';

export default function useAppToast() {
  const { addToast } = useToast();

  const success = useCallback(
    (message) => addToast({ variant: 'success', message }),
    [addToast]
  );

  const error = useCallback(
    (message) => addToast({ variant: 'danger', message }),
    [addToast]
  );

  // For conditions the user should know about where nothing has actually failed, so
  // 'danger' would misrepresent them.
  const warning = useCallback(
    (message) => addToast({ variant: 'warning', message }),
    [addToast]
  );

  return { success, error, warning };
}
