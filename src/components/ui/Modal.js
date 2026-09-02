'use client';

import { useCallback, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const SIZE_CLASS = {
  sm: '',
  md: 'app-modal-md',
  lg: 'app-modal-lg',
  xl: 'app-modal-xl',
  wide: 'app-modal-wide',
  full: 'app-modal-full',
};

/**
 * Accessible dialog wrapper for the `.app-modal-backdrop` pattern used across the app.
 *
 * Supplies what hand-rolled overlays were each missing: dialog semantics, a focus trap so
 * Tab cannot reach the page behind, Escape to dismiss, focus restoration to whatever opened
 * the dialog, and a scroll lock on the body.
 *
 * The dialog role sits on the backdrop element itself rather than an inner wrapper because
 * `.app-modal-backdrop > *` and `> .fill-width` in once-ui-scope.css size the panel by
 * direct-child selector; an extra wrapper would break every modal's width. The backdrop is
 * the dialog container in any case, so the semantics land in the right place.
 */
/**
 * @param {{
 *   onClose?: () => void,
 *   label?: string,
 *   labelledBy?: string,
 *   size?: string,
 *   variant?: string,
 *   closeOnBackdrop?: boolean,
 *   className?: string,
 *   children: any,
 * }} props
 */
export default function Modal({
  onClose,
  label,
  labelledBy,
  size = 'sm',
  variant = 'centered',
  closeOnBackdrop = true,
  className = '',
  children,
}) {
  const containerRef = useRef(null);
  const previouslyFocusedRef = useRef(null);

  const focusableNodes = useCallback(() => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(container.querySelectorAll(FOCUSABLE_SELECTOR)).filter(
      (node) => node.offsetParent !== null || node === document.activeElement
    );
  }, []);

  // Remember the opener and move focus inside, then hand focus back on close. Without the
  // restore step, dismissing a dialog dumps keyboard focus back to the top of the document.
  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement;
    const nodes = focusableNodes();
    (nodes[0] || containerRef.current)?.focus();

    return () => {
      const opener = previouslyFocusedRef.current;
      if (opener && typeof opener.focus === 'function' && document.contains(opener)) {
        opener.focus();
      }
    };
  }, [focusableNodes]);

  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose?.();
      return;
    }

    if (event.key !== 'Tab') return;

    const nodes = focusableNodes();
    if (nodes.length === 0) {
      event.preventDefault();
      return;
    }

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;

    // Wrap at both ends so Tab cycles within the dialog instead of escaping to the page.
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && (active === first || active === containerRef.current)) {
      event.preventDefault();
      last.focus();
    }
  };

  const handleMouseDown = (event) => {
    // Only a press on the backdrop itself dismisses. Comparing against currentTarget stops
    // a drag that ends outside the panel from closing the dialog mid-edit.
    if (!closeOnBackdrop) return;
    if (event.target === event.currentTarget) {
      onClose?.();
    }
  };

  const base = variant === 'drawer' ? 'app-modal-drawer' : 'app-modal-backdrop';
  const classes = [base, SIZE_CLASS[size] || '', className].filter(Boolean).join(' ');

  return (
    <div
      ref={containerRef}
      className={classes}
      role="dialog"
      aria-modal="true"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      onMouseDown={handleMouseDown}
    >
      {children}
    </div>
  );
}
