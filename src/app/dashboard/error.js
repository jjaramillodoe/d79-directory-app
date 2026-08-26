'use client';

import RouteError from '../../components/ui/RouteError';

export default function DashboardError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="The dashboard could not load"
      description="Something failed while loading your plans and notifications. Nothing was changed."
    />
  );
}
