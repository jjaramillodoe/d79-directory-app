'use client';

import { Column, Text } from '@once-ui-system/core';
import LinkifiedText from './LinkifiedText';
import { splitCopyBlocks } from '../lib/formattedCopy';

export default function FormattedCopy({ text, variant = 'body-default-m' }) {
  const blocks = splitCopyBlocks(text);
  if (!blocks.length) return null;

  return (
    <Column gap="12" fillWidth>
      {blocks.map((block, index) => {
        if (block.type === 'ul' || block.type === 'ol') {
          const List = block.type === 'ul' ? 'ul' : 'ol';
          return (
            <List key={`copy-${index}`} className="app-copy-list">
              {block.items.map((item, itemIndex) => (
                <li key={`copy-${index}-${itemIndex}`}>
                  <LinkifiedText text={item} />
                </li>
              ))}
            </List>
          );
        }

        return (
          <Text key={`copy-${index}`} variant={variant} style={{ whiteSpace: 'pre-line' }}>
            <LinkifiedText text={block.text} />
          </Text>
        );
      })}
    </Column>
  );
}
