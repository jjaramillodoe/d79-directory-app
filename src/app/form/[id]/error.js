'use client';

import RouteError from '../../../components/ui/RouteError';

export default function FormError({ error, reset }) {
  return (
    <RouteError
      error={error}
      reset={reset}
      title="The plan editor could not load"
      // Worded carefully: unlike the other boundaries, this one can replace an editor that
      // held unsaved answers, so it should not promise nothing was lost. Everything through
      // the last successful save is on the server; "Try again" reloads from there.
      description="Answers saved up to this point are safe on the server. Any edits made since the last save may need to be re-entered."
    />
  );
}
