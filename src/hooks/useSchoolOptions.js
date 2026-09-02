'use client';

import { useEffect, useState } from 'react';
import SCHOOL_NAMES from '../constants/schools';

/**
 * Super Admin dropdowns should follow the live catalog. Falls back to the static
 * district list if the request fails (local, or the catalog has not loaded yet).
 */
export default function useSchoolOptions({ enabled = false, extraName = '' } = {}) {
  const [names, setNames] = useState(SCHOOL_NAMES);

  useEffect(() => {
    if (!enabled) return undefined;
    let cancelled = false;

    fetch('/api/admin/schools?active=1')
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !Array.isArray(data?.schools)) return;
        const next = data.schools.map((school) => school.name).filter(Boolean);
        if (extraName && !next.includes(extraName)) next.push(extraName);
        if (next.length) setNames(next);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [enabled, extraName]);

  return names;
}
