import { render, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Characterization tests for the form editor.
 *
 * These exist to make splitting this 2,000-line component into `useFormData`, `useAutoSave`, and
 * `useCollaboration` a safe change rather than a hopeful one. They assert on behavior a principal
 * would notice — which requests fire and when, what reaches the step components, what happens on
 * a save conflict, what a view-only user is allowed to do — and never on internal state or
 * component structure. That is what lets them survive the refactor and still mean something
 * afterwards: passing before and after is evidence the contract held.
 *
 * The presentational tree is stubbed, both because rendering the real Once UI components would
 * test the design system on every run and because the stubs double as probes: each captures the
 * props it was handed, so a test can drive the page the way a user would and then inspect what
 * the page decided.
 *
 * The prop names below were read off the running component rather than guessed.
 */

const STEPS = [
  { key: 'tableOfContents', title: 'Table of Contents', questions: [] },
  { key: 'childAbuseIntervention', title: 'Child Abuse Intervention', questions: [] },
  { key: 'counselingPlan', title: 'Counseling Plan', questions: [] },
];

const push = vi.fn();
let sessionValue;

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }),
  useParams: () => ({ id: 'form-1' }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('next-auth/react', () => ({ useSession: () => sessionValue }));

vi.mock('../../../hooks/useQuestionBank', () => ({
  default: () => ({ questionBank: { steps: STEPS, source: 'mongo' }, loading: false }),
}));

const toast = { success: vi.fn(), error: vi.fn(), warning: vi.fn() };
vi.mock('../../../hooks/useAppToast', () => ({ default: () => toast }));

// Probes. `workspace` carries the page's whole view model; `step` carries the editing callbacks.
const workspace = { props: null };
const step = { props: null };

vi.mock('../../../components/form-steps/FormWorkspace', () => ({
  default: (props) => {
    workspace.props = props;
    return <div data-testid="workspace">{props.children}</div>;
  },
}));

vi.mock('../../../components/form-steps/Step1TableOfContents', () => ({
  default: (props) => {
    step.props = props;
    return <div data-testid="step1" />;
  },
}));

vi.mock('../../../components/form-steps/GenericFormStep', () => ({
  default: (props) => {
    step.props = props;
    return <div data-testid="generic-step" />;
  },
}));

function inert(name) {
  return { default: () => <div data-testid={name} /> };
}

vi.mock('../../../components/form-steps/DefaultFormStep', () => inert('default-step'));
vi.mock('../../../components/form-steps/FormStepMeta', () => inert('step-meta'));
vi.mock('../../../components/form-steps/FormSubmitSummary', () => inert('submit-summary'));
vi.mock('../../../components/admin/DuplicateFormModal', () => inert('duplicate-modal'));
vi.mock('../../../components/form-steps/FormAttestModal', () => inert('attest-modal'));
vi.mock('../../../components/form-steps/FormShareModal', () => inert('share-modal'));
vi.mock('../../../components/form-steps/FormCommentModal', () => inert('comment-modal'));
vi.mock('../../../components/form-steps/FormConfirmModal', () => inert('confirm-modal'));
vi.mock('../../../components/ScrollToTop', () => inert('scroll-to-top'));

const FORM = {
  _id: 'form-1',
  schoolName: 'Test School',
  status: 'draft',
  currentStep: 1,
  createdAt: '2026-01-15T00:00:00.000Z',
  formData: {
    tableOfContents: { data: { intro: 'hello' }, completed: true, revisionCount: 2 },
  },
  userPermission: 'owner',
};

function okJson(body) {
  return { ok: true, status: 200, json: async () => body };
}

/**
 * Routes each request to a canned response. Unmatched calls get an empty 200 rather than throwing,
 * so an unexpected request cannot masquerade as the failure under test.
 */
function mockFetch(overrides = {}) {
  const calls = [];
  global.fetch = /** @type {any} */ (vi.fn(async (url, options = {}) => {
    const href = String(url);
    calls.push({ url: href, method: options.method || 'GET', body: options.body });

    for (const [pattern, respond] of Object.entries(overrides)) {
      if (href.includes(pattern)) {
        const r = typeof respond === 'function' ? respond(options) : respond;
        return { ok: (r.status || 200) < 400, status: r.status || 200, json: async () => r.body ?? {} };
      }
    }

    if (href.includes('/editors')) return okJson({ editors: [] });
    if (href.includes('/locks')) return okJson({ locks: {} });
    if (href.includes('/comments')) return okJson({ comments: [] });
    if (href.includes('/share')) return okJson({ sharedWith: [] });
    if (href.includes('/api/forms/form-1')) return okJson({ form: FORM, userPermission: 'owner' });
    return okJson({});
  }));
  return calls;
}

let FormPage;

const puts = (calls, pattern) =>
  calls.filter((c) => c.method === 'PUT' && c.url.includes(pattern));

async function renderLoaded() {
  render(<FormPage />);
  await waitFor(() => expect(workspace.props).not.toBeNull());
  await waitFor(() => expect(workspace.props.formData.schoolName).toBe('Test School'));
}

beforeEach(async () => {
  vi.clearAllMocks();
  workspace.props = null;
  step.props = null;
  sessionValue = {
    data: {
      user: {
        id: 'u1',
        email: 'principal@schools.nyc.gov',
        name: 'A Principal',
        level: 4,
        schoolName: 'Test School',
      },
    },
    status: 'authenticated',
  };
  ({ default: FormPage } = await import('./page'));
});

describe('form editor — loading', () => {
  it('fetches the form and hands its data to the workspace', async () => {
    const calls = mockFetch();

    await renderLoaded();

    expect(calls.some((c) => c.url.includes('/api/forms/form-1') && c.method === 'GET')).toBe(true);
    expect(workspace.props.formData.status).toBe('draft');
  });

  it('restores the step the user last had open', async () => {
    mockFetch({ '/api/forms/form-1': { body: { form: { ...FORM, currentStep: 3 } } } });

    render(<FormPage />);

    await waitFor(() => expect(workspace.props?.currentStep).toBe(3));
  });

  it('passes the saved step data through to the step component', async () => {
    mockFetch();

    await renderLoaded();

    await waitFor(() => expect(step.props).not.toBeNull());
    expect(step.props.stepData).toMatchObject({ intro: 'hello' });
  });

  it('builds the step list from the question bank', async () => {
    mockFetch();

    await renderLoaded();

    expect(workspace.props.formSteps).toHaveLength(STEPS.length);
    expect(workspace.props.formSteps.map((s) => s.key)).toEqual(STEPS.map((s) => s.key));
  });

  it('registers the viewer as an active editor', async () => {
    const calls = mockFetch();

    await renderLoaded();

    await waitFor(() =>
      expect(calls.some((c) => c.url.includes('/editors/register') && c.method === 'POST')).toBe(true)
    );
  });

  it('asks who else is editing, so collaborators are visible', async () => {
    const calls = mockFetch();

    await renderLoaded();

    await waitFor(() =>
      expect(calls.some((c) => c.url.includes('/editors') && c.method === 'GET')).toBe(true)
    );
  });

  it('waits for the session before touching the collaboration endpoints', async () => {
    sessionValue = { data: null, status: 'loading' };
    const calls = mockFetch();

    render(<FormPage />);
    await act(async () => {
      await Promise.resolve();
    });

    expect(calls.filter((c) => c.url.includes('/editors'))).toHaveLength(0);
  });
});

describe('form editor — permissions', () => {
  // The permission arrives as a top-level field on the response, alongside `form` rather than
  // inside it. Worth stating, because putting it in the wrong place silently exercises the
  // fallback below instead.
  it('trusts the permission the API returns', async () => {
    mockFetch({ '/api/forms/form-1': { body: { form: FORM, userPermission: 'view' } } });

    render(<FormPage />);

    await waitFor(() => expect(workspace.props?.userPermissions).toBe('view'));
  });

  it('reports owner permission to the workspace', async () => {
    mockFetch();

    await renderLoaded();

    expect(workspace.props.userPermissions).toBe('owner');
  });

  it('renders the step read-only for a view-only user', async () => {
    mockFetch({ '/api/forms/form-1': { body: { form: FORM, userPermission: 'view' } } });

    render(<FormPage />);

    await waitFor(() => expect(step.props?.readOnly).toBe(true));
  });

  it('does not render the step read-only for an owner', async () => {
    mockFetch();

    await renderLoaded();

    await waitFor(() => expect(step.props).not.toBeNull());
    expect(step.props.readOnly).toBeFalsy();
  });

  // When the API omits the field, the page recomputes it. This is the client-side mirror of the
  // server's school scoping, and the two must not disagree — a principal who can edit here but
  // not on the server gets a form that looks editable and then refuses to save.
  describe('when the API omits the permission', () => {
    it('grants edit to a principal at the same school', async () => {
      mockFetch({ '/api/forms/form-1': { body: { form: FORM } } });

      render(<FormPage />);

      await waitFor(() => expect(workspace.props?.userPermissions).toBe('edit'));
    });

    it('grants only view to a principal at a different school', async () => {
      sessionValue.data.user.schoolName = 'Some Other School';
      mockFetch({ '/api/forms/form-1': { body: { form: FORM } } });

      render(<FormPage />);

      await waitFor(() => expect(workspace.props?.userPermissions).toBe('view'));
    });

    it('grants owner to a super admin regardless of school', async () => {
      sessionValue.data.user.level = 5;
      sessionValue.data.user.schoolName = 'Some Other School';
      mockFetch({ '/api/forms/form-1': { body: { form: FORM } } });

      render(<FormPage />);

      await waitFor(() => expect(workspace.props?.userPermissions).toBe('owner'));
    });
  });
});

describe('form editor — saving', () => {
  it('PUTs the step to the step endpoint when navigating away', async () => {
    const calls = mockFetch();

    await renderLoaded();

    await act(async () => {
      step.props.updateStepData('tableOfContents', { intro: 'edited' });
    });
    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    await waitFor(() => expect(puts(calls, '/step/').length).toBeGreaterThan(0));
  });

  it('sends the revision count so the server can detect a lost update', async () => {
    const calls = mockFetch();

    await renderLoaded();

    await act(async () => {
      step.props.updateStepData('tableOfContents', { intro: 'edited' });
    });
    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    await waitFor(() => {
      const put = puts(calls, '/step/')[0];
      expect(put).toBeDefined();
      expect(String(put.body)).toContain('revisionCount');
    });
  });

  it('surfaces a save conflict rather than silently overwriting', async () => {
    mockFetch({
      '/step/': {
        status: 409,
        body: {
          conflict: true,
          message: 'This step was modified by another user.',
          serverRevision: 9,
          serverData: { intro: 'theirs' },
        },
      },
    });

    await renderLoaded();

    await act(async () => {
      step.props.updateStepData('tableOfContents', { intro: 'mine' });
    });
    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    // The conflict has to reach the user: either as the workspace's save error or as a toast.
    await waitFor(() => {
      const surfaced =
        Boolean(workspace.props?.saveError) ||
        toast.error.mock.calls.length > 0 ||
        toast.warning.mock.calls.length > 0;
      expect(surfaced).toBe(true);
    });
  });

  it('lets the user dismiss a save error', async () => {
    mockFetch({
      '/step/': { status: 500, body: { error: 'Failed to save' } },
    });

    await renderLoaded();

    await act(async () => {
      step.props.updateStepData('tableOfContents', { intro: 'mine' });
    });
    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    await waitFor(() => expect(workspace.props.saveError).toBeTruthy());

    await act(async () => {
      workspace.props.onDismissError();
    });

    await waitFor(() => expect(workspace.props.saveError).toBeFalsy());
  });
});

describe('form editor — navigation', () => {
  it('moves to the requested step', async () => {
    mockFetch();

    await renderLoaded();

    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    await waitFor(() => expect(workspace.props.currentStep).toBe(2));
  });

  it('persists the step so reopening the form resumes where the user left off', async () => {
    const calls = mockFetch();

    await renderLoaded();

    await act(async () => {
      await workspace.props.onNavigateStep(2);
    });

    await waitFor(() => {
      const put = puts(calls, '/api/forms/form-1').find((c) => String(c.body).includes('currentStep'));
      expect(put).toBeDefined();
    });
  });

  it('ignores a request to open the step already showing', async () => {
    const calls = mockFetch();

    await renderLoaded();

    const before = calls.filter((c) => c.method === 'PUT').length;
    await act(async () => {
      await workspace.props.onNavigateStep(workspace.props.currentStep);
    });

    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(before);
  });
});
