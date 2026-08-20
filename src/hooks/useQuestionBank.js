'use client';

import { useEffect, useState } from 'react';
import formQuestionsData from '../data/formQuestions.json';

export default function useQuestionBank({
  schoolYear,
  version,
  draft = false,
  preferPublished = false,
} = {}) {
  const [questionBank, setQuestionBank] = useState({
    steps: [],
    source: 'loading',
    version: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (draft) {
      params.set('draft', '1');
    } else {
      if (schoolYear) params.set('schoolYear', schoolYear);
      if (version && !preferPublished) params.set('version', String(version));
      if (preferPublished) params.set('latest', '1');
    }

    fetch(`/api/question-bank?${params.toString()}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.steps?.length) {
          setQuestionBank({
            steps: data.steps,
            source: data.source || 'mongo',
            version: data.version || null,
          });
          return;
        }
        setQuestionBank({
          steps: formQuestionsData.steps || [],
          source: 'json',
          version: null,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setQuestionBank({
          steps: formQuestionsData.steps || [],
          source: 'json',
          version: null,
        });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolYear, version, draft, preferPublished]);

  return { questionBank, loading };
}
