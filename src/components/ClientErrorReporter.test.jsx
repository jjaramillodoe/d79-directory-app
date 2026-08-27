import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import ClientErrorReporter from './ClientErrorReporter';

/**
 * The reporter's job is to send errors. Its harder job is to not amplify them: a component
 * throwing in a render loop throws thousands of times a second, and a naive reporter turns that
 * into thousands of requests. These tests pin the three guards that prevent it, because those
 * are the parts that only misbehave under exactly the conditions you cannot reproduce by hand.
 */

const env = /** @type {{ NODE_ENV?: string }} */ (process.env);
const ORIGINAL_ENV = env.NODE_ENV;

function beacons() {
  const sendBeacon = /** @type {any} */ (navigator.sendBeacon);
  return sendBeacon.mock.calls.map(([url, blob]) => ({ url, blob }));
}

/**
 * Dispatches the event and then marks it handled.
 *
 * Without the `preventDefault`, jsdom treats an `error` event that no listener consumed as an
 * uncaught exception and fails the run — which is precisely the situation the two "nothing
 * should be reported" tests set up on purpose. The extra listener is appended after the
 * component's, so the component still sees the event first.
 */
function dispatchHandled(event) {
  const swallow = (e) => e.preventDefault();
  window.addEventListener(event.type, swallow);
  try {
    window.dispatchEvent(event);
  } finally {
    window.removeEventListener(event.type, swallow);
  }
}

function dispatchError(message, stack = 'at somewhere') {
  dispatchHandled(
    new ErrorEvent('error', {
      message,
      error: Object.assign(new Error(message), { stack }),
      cancelable: true,
    })
  );
}

function dispatchRejection(reason) {
  const event = /** @type {any} */ (new Event('unhandledrejection', { cancelable: true }));
  event.reason = reason;
  dispatchHandled(event);
}

describe('ClientErrorReporter', () => {
  beforeEach(() => {
    // The component is a no-op outside production, so the guards are only reachable here.
    env.NODE_ENV = 'production';
    navigator.sendBeacon = vi.fn(() => true);
  });

  afterEach(() => {
    env.NODE_ENV = ORIGINAL_ENV;
  });

  it('reports an uncaught error once', () => {
    render(<ClientErrorReporter />);
    dispatchError('boom');

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    expect(beacons()[0].url).toBe('/api/client-errors');
  });

  it('reports an unhandled rejection, preserving the message and stack', async () => {
    render(<ClientErrorReporter />);
    const reason = Object.assign(new Error('rejected'), { stack: 'at promise' });
    dispatchRejection(reason);

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(await beacons()[0].blob.text());
    expect(payload).toMatchObject({
      kind: 'unhandledrejection',
      message: 'rejected',
      stack: 'at promise',
    });
  });

  it('handles a rejection whose reason is not an Error', async () => {
    render(<ClientErrorReporter />);
    dispatchRejection('just a string');

    const payload = JSON.parse(await beacons()[0].blob.text());
    expect(payload.message).toBe('just a string');
    expect(payload.stack).toBe('');
  });

  // The guard that matters most: this is the render-loop case.
  it('sends one report no matter how many times the same error repeats', () => {
    render(<ClientErrorReporter />);
    for (let i = 0; i < 200; i += 1) dispatchError('same every time');

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
  });

  // The backstop for errors that vary slightly each time and so slip past the dedupe.
  it('stops at five reports per page load when every error is distinct', () => {
    render(<ClientErrorReporter />);
    for (let i = 0; i < 50; i += 1) dispatchError(`distinct ${i}`);

    expect(navigator.sendBeacon).toHaveBeenCalledTimes(5);
  });

  it('does nothing outside production', () => {
    env.NODE_ENV = 'development';
    render(<ClientErrorReporter />);
    dispatchError('boom');

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('stops listening after unmount', () => {
    const { unmount } = render(<ClientErrorReporter />);
    unmount();
    dispatchError('after unmount');

    expect(navigator.sendBeacon).not.toHaveBeenCalled();
  });

  it('falls back to fetch when sendBeacon is unavailable', () => {
    navigator.sendBeacon = undefined;
    const fetchMock = vi.fn(() => Promise.resolve());
    global.fetch = /** @type {any} */ (fetchMock);

    render(<ClientErrorReporter />);
    dispatchError('no beacon here');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = /** @type {[string, RequestInit]} */ (fetchMock.mock.calls[0]);
    expect(url).toBe('/api/client-errors');
    expect(options).toMatchObject({ method: 'POST', keepalive: true });
  });

  it('swallows a throwing transport rather than raising another error', () => {
    navigator.sendBeacon = vi.fn(() => {
      throw new Error('transport exploded');
    });

    render(<ClientErrorReporter />);
    expect(() => dispatchError('boom')).not.toThrow();
  });
});
