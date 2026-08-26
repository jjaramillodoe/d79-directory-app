import { Column, Spinner, Text } from '@once-ui-system/core';

/**
 * Shared body for the route-level `loading.js` files.
 *
 * Matches the inline spinner the pages already render while their own session or fetch
 * resolves, so a navigation does not visibly change shape when Next.js hands off from this
 * boundary to the page's own loading state.
 */
export default function RouteLoading({ label = 'Loading...' }) {
  return (
    <Column minHeight="100vh" horizontal="center" vertical="center" gap="16" background="page">
      <Spinner size="l" />
      <Text onBackground="neutral-weak" aria-live="polite">
        {label}
      </Text>
    </Column>
  );
}
