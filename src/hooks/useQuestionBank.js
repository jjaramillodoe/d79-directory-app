'use client';

import { useEffect, useState } from 'react';
import formQuestionsData from '../data/formQuestions.json';

export default function useQuestionBank({ schoolYear, version } = {}) {
  const [questionBank, setQuestionBank] = useState({
    steps: formQuestionsData.steps || [],
    source: 'json',
    version: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams();
    if (schoolYear) params.set('schoolYear', schoolYear);
    if (version) params.set('version', String(version));

    fetch(`/api/question-bank${params.toString() ? `?${params}` : ''}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (cancelled || !data?.steps?.length) return;
        setQuestionBank({
          steps: data.steps,
          source: data.source || 'mongo',
          version: data.version || null,
        });
      })
      .catch(() => {
        // Keep JSON fallback so existing answers still render.
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [schoolYear, version]);

  return { questionBank, loading };
}
