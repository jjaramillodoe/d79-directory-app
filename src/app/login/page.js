'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import Image from 'next/image';
import {
  Column,
  Row,
  Heading,
  Text,
  Button,
  Card,
  Tag,
  Grid,
  Flex,
  Spinner,
} from '@once-ui-system/core';
import { Copy, Columns, Archive, Lock, Shield } from 'lucide-react';
import AppFooter from '../../components/AppFooter';
import { usePublicOverview } from '../../components/public/PublicShell';

function safeCallbackUrl(value) {
  if (!value || typeof value !== 'string') return '/dashboard';
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/login') || value.startsWith('/api')) {
    return '/dashboard';
  }
  return value;
}

function authErrorMessage(code) {
  if (code === 'AccessDenied') {
    return 'Sign-in was denied. Use a verified @schools.nyc.gov account that has been added to this system.';
  }
  if (code === 'OAuthAccountNotLinked' || code === 'OAuthCallback' || code === 'OAuthSignin') {
    return 'Google sign-in could not be completed. Try again, or contact District 79 if this continues.';
  }
  if (code === 'Configuration') {
    return 'Sign-in is misconfigured. Contact District 79 support.';
  }
  if (!code) return '';
  return 'Sign in failed. Use a verified @schools.nyc.gov email and an authorized account.';
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { status } = useSession();
  const overview = usePublicOverview();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const callbackUrl = useMemo(
    () => safeCallbackUrl(searchParams.get('callbackUrl')),
    [searchParams]
  );

  useEffect(() => {
    const fromAuth = authErrorMessage(searchParams.get('error'));
    if (fromAuth) setError(fromAuth);
  }, [searchParams]);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError('');
      await signIn('google', { callbackUrl });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  if (status === 'loading' || status === 'authenticated') {
    return (
      <Column
        className="once-ui-root"
        fillWidth
        minHeight="100"
        background="page"
        horizontal="center"
        vertical="center"
        gap="16"
        style={{ minHeight: '100vh' }}
      >
        <Spinner size="l" />
        <Text onBackground="neutral-weak">
          {status === 'authenticated' ? 'Opening your dashboard…' : 'Checking your session…'}
        </Text>
      </Column>
    );
  }

  const features = [
    {
      icon: Copy,
      title: 'Copy last year',
      body: `Start the ${overview.currentYear} plan from your ${overview.previousYear} answers.`,
    },
    {
      icon: Columns,
      title: 'Compare and update',
      body: 'Review attendance, temporary housing, and counseling side by side.',
    },
    {
      icon: Archive,
      title: 'Submit the new year',
      body: `${overview.previousYear} stays on file. New work happens in ${overview.currentYear}.`,
    },
  ];

  return (
    <Column
      className="once-ui-root"
      fillWidth
      background="page"
      style={{ minHeight: '100vh' }}
    >
      <Row
        as="header"
        fillWidth
        horizontal="between"
        vertical="center"
        paddingX="24"
        paddingY="16"
        gap="16"
        wrap
        style={{ borderBottom: '1px solid var(--neutral-alpha-medium)' }}
      >
        <Row gap="12" vertical="center" href="/" as="a" style={{ textDecoration: 'none' }}>
          <Image
            src="/images/d79logo.png"
            alt="District 79"
            width={40}
            height={40}
            style={{ width: 'auto', height: 'auto', objectFit: 'contain' }}
            priority
          />
          <Column gap="2">
            <Text variant="label-strong-m">District 79 Directory</Text>
            <Text variant="label-default-s" onBackground="neutral-weak">
              NYC Alternative Schools
            </Text>
          </Column>
        </Row>
        <Row gap="8" vertical="center" wrap>
          <Tag size="s" variant="brand" label={overview.currentYear} />
          <Button size="s" variant="tertiary" href="/">
            Home
          </Button>
          <Button size="s" variant="tertiary" href="/about">
            About
          </Button>
        </Row>
      </Row>

      <Column as="main" fillWidth flex={1} paddingX="24" paddingY="32" gap="24" vertical="center">
        <Grid columns="2" s={{ columns: '1' }} gap="24" fillWidth style={{ maxWidth: 1080, margin: '0 auto' }}>
          <Column gap="24" vertical="center">
            <Column gap="12">
              <Row gap="8" wrap>
                <Tag size="s" variant="success" label={`Open ${overview.currentYear}`} />
                <Tag size="s" variant="neutral" label={`${overview.previousYear} archived`} />
              </Row>
              <Heading as="h1" variant="display-strong-l">
                Consolidated School Plan
              </Heading>
              <Text variant="body-default-l" onBackground="neutral-weak">
                Sign in with your NYC Public Schools account to copy last year’s answers, compare
                years, and submit the {overview.currentYear} plan.
              </Text>
            </Column>

            <Column gap="12">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Row key={feature.title} gap="12" vertical="start">
                    <Flex
                      padding="8"
                      background="brand-alpha-weak"
                      radius="m"
                      vertical="center"
                      horizontal="center"
                      style={{ flexShrink: 0, minWidth: 36 }}
                    >
                      <Icon size={16} strokeWidth={1.75} />
                    </Flex>
                    <Column gap="2">
                      <Text variant="label-strong-s">{feature.title}</Text>
                      <Text variant="body-default-s" onBackground="neutral-weak">
                        {feature.body}
                      </Text>
                    </Column>
                  </Row>
                );
              })}
            </Column>
          </Column>

          <Card padding="32" fillWidth radius="l">
            <Column gap="24">
              <Column gap="12" horizontal="center">
                <Flex padding="12" background="brand-alpha-weak" radius="l">
                  <Shield size={24} strokeWidth={1.75} />
                </Flex>
                <Column gap="4" horizontal="center">
                  <Heading as="h2" variant="heading-strong-l">
                    Secure access
                  </Heading>
                  <Text variant="body-default-s" onBackground="neutral-weak" style={{ textAlign: 'center' }}>
                    Continue with your @schools.nyc.gov Google account
                  </Text>
                </Column>
              </Column>

              {error && (
                <Column gap="4" padding="16" background="danger-alpha-weak" radius="m">
                  <Text variant="label-strong-s" onBackground="danger-strong">
                    Sign-in did not complete
                  </Text>
                  <Text variant="body-default-s">{error}</Text>
                </Column>
              )}

              <Button
                size="l"
                variant="secondary"
                fillWidth
                onClick={handleGoogleSignIn}
                disabled={isLoading}
              >
                <Row gap="8" vertical="center" horizontal="center">
                  {isLoading ? <Spinner size="s" /> : <GoogleMark />}
                  <Text variant="label-strong-s">
                    {isLoading ? 'Redirecting to Google…' : 'Continue with Google'}
                  </Text>
                </Row>
              </Button>

              <Row gap="12" vertical="start" padding="16" background="neutral-alpha-weak" radius="l">
                <Flex padding="8" background="warning-alpha-weak" radius="m" style={{ flexShrink: 0 }}>
                  <Lock size={18} strokeWidth={1.75} />
                </Flex>
                <Column gap="4">
                  <Text variant="label-strong-s">Authorized staff only</Text>
                  <Text variant="body-default-s" onBackground="neutral-weak">
                    Restricted to principals and school administrators with verified{' '}
                    <Text as="span" variant="label-strong-s">
                      @schools.nyc.gov
                    </Text>{' '}
                    email addresses.
                  </Text>
                </Column>
              </Row>

              <Text variant="label-default-s" onBackground="neutral-weak" style={{ textAlign: 'center' }}>
                By signing in, you agree to use this system for official school business. Activity is
                logged for security.
              </Text>
            </Column>
          </Card>
        </Grid>
      </Column>

      <AppFooter compact schoolYear={overview.currentYear} />
    </Column>
  );
}
