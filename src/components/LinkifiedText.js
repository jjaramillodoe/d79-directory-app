'use client';

import { splitLinkifiedText } from '../lib/linkifyText';

export default function LinkifiedText({ text, suffix = null, labelFor = '' }) {
  const parts = splitLinkifiedText(text);

  if (!parts.length && !suffix) return null;

  return (
    <>
      {parts.map((part, index) => {
        if (part.type === 'url') {
          return (
            <a
              key={`url-${index}`}
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className="app-text-link"
              onClick={(event) => event.stopPropagation()}
            >
              {part.text}
            </a>
          );
        }

        if (labelFor) {
          return (
            <label key={`text-${index}`} htmlFor={labelFor} style={{ cursor: 'pointer' }}>
              {part.text}
            </label>
          );
        }

        return <span key={`text-${index}`}>{part.text}</span>;
      })}
      {suffix}
    </>
  );
}
