'use client';

import RouteError from '../../components/ui/RouteError';

export default function AdminError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="This admin page could not load"
      description="Something failed while loading this tool. No records were modified."
    />
  );
}
