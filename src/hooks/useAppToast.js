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

  return { success, error };
}
