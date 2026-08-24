'use client';

import { splitFormattedText } from '../lib/linkifyText';

export default function LinkifiedText({ text, suffix = null, labelFor = '' }) {
  const parts = splitFormattedText(text);

  if (!parts.length && !suffix) return null;

  return (
    <>
      {parts.map((part, index) => {
        const content =
          part.type === 'url' ? (
            <a
              href={part.href}
              target="_blank"
              rel="noopener noreferrer"
              className="app-text-link"
              onClick={(event) => event.stopPropagation()}
            >
              {part.text}
            </a>
          ) : labelFor ? (
            <label htmlFor={labelFor} style={{ cursor: 'pointer' }}>
              {part.text}
            </label>
          ) : (
            part.text
          );

        if (part.bold) {
          return <strong key={`part-${index}`}>{content}</strong>;
        }

        if (part.type === 'url' || labelFor) {
          return <span key={`part-${index}`}>{content}</span>;
        }

        return <span key={`part-${index}`}>{content}</span>;
      })}
      {suffix}
    </>
  );
}
