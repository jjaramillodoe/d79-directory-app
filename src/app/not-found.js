import { Button, Column, Heading, Row, Text } from '@once-ui-system/core';

export const metadata = {
  title: 'Page not found - District 79',
};

export default function NotFound() {
  return (
    <Column
      minHeight="100vh"
      horizontal="center"
      vertical="center"
      gap="16"
      padding="24"
      background="page"
    >
      <Heading variant="display-strong-l">404</Heading>
      <Heading variant="heading-strong-m" align="center">
        We could not find that page
      </Heading>
      <Text onBackground="neutral-weak" align="center" style={{ maxWidth: '32rem' }}>
        The link may be out of date, or the plan may have been moved or removed.
      </Text>
      <Row gap="8" horizontal="center" wrap>
        <Button size="s" variant="primary" href="/dashboard">
          Back to dashboard
        </Button>
        <Button size="s" variant="tertiary" href="/">
          Home
        </Button>
      </Row>
    </Column>
  );
}
