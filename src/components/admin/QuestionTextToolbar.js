'use client';

import { Bold, Link } from 'lucide-react';
import { wrapSelectionAsBold, wrapSelectionAsLink } from '../../lib/linkifyText';

const buttonClass =
  'inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-medium text-gray-700 hover:bg-gray-50';

export default function QuestionTextToolbar({ value, onChange, textareaRef }) {
  const restoreSelection = (range) => {
    requestAnimationFrame(() => {
      const el = textareaRef?.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(range.start, range.end);
    });
  };

  const selectionRange = () => {
    const el = textareaRef?.current;
    return {
      start: el?.selectionStart ?? 0,
      end: el?.selectionEnd ?? 0,
    };
  };

  const onBold = () => {
    const { start, end } = selectionRange();
    const result = wrapSelectionAsBold(value, start, end);
    onChange(result.text);
    restoreSelection(result);
  };

  const onLink = () => {
    const { start, end } = selectionRange();
    const from = Math.min(start, end);
    const to = Math.max(start, end);
    const selected = String(value || '').slice(from, to);
    let label = selected;
    if (!label.trim()) {
      label = window.prompt('Link text', "NYSED Commissioner's Regulation 100.2(j)") || '';
      if (!label.trim()) return;
    }
    const href = window.prompt('Paste the URL', 'https://') || '';
    if (!href.trim()) return;
    const result = wrapSelectionAsLink(value, start, end, href, label);
    onChange(result.text);
    restoreSelection(result);
  };

  return (
    <div className="mt-1 mb-1 flex items-center gap-1">
      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onBold}
      >
        <Bold className="h-3.5 w-3.5" />
        Bold
      </button>
      <button
        type="button"
        className={buttonClass}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onLink}
      >
        <Link className="h-3.5 w-3.5" />
        Link
      </button>
    </div>
  );
}
