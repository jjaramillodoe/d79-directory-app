'use client';

import { useState, useEffect } from 'react';
import { IconButton } from '@once-ui-system/core';

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      setIsVisible(window.scrollY > 300);
    };
    toggleVisibility();
    window.addEventListener('scroll', toggleVisibility, { passive: true });
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  if (!isVisible) return null;

  return (
    <IconButton
      icon="chevronUp"
      variant="primary"
      size="l"
      rounded
      tooltip="Scroll to top"
      className="app-scroll-top"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Scroll to top of page"
    />
  );
}
