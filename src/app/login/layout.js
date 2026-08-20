import { Suspense } from 'react';

export { metadata } from '../../lib/privateRobots';

export default function LoginLayout({ children }) {
  return <Suspense fallback={null}>{children}</Suspense>;
}
