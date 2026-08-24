const SHORT_HEADING = 120;

function splitQuestionCopy(title, description = '') {
  const helper = String(description || '').trim();
  const raw = String(title || '')
    .replace(/\r\n/g, '\n')
    .trim();

  if (!raw) return { heading: '', body: '', helper };

  const lines = raw.split('\n');
  const firstIndex = lines.findIndex((line) => line.trim());
  if (firstIndex >= 0) {
    const firstLine = lines[firstIndex].trim();
    const rest = lines
      .slice(firstIndex + 1)
      .join('\n')
      .trim();
    if (rest && firstLine.length <= SHORT_HEADING) {
      return { heading: firstLine, body: rest, helper };
    }
  }

  const sentenceMatch = raw.match(/^(.{1,120}?[.!?])\s+([\s\S]+)$/);
  if (sentenceMatch && sentenceMatch[2].trim().length > 30) {
    return {
      heading: sentenceMatch[1].trim(),
      body: sentenceMatch[2].trim(),
      helper,
    };
  }

  if (raw.length > 180) {
    return { heading: '', body: raw, helper };
  }

  return { heading: raw, body: '', helper };
}

function withNoteEmphasis(text) {
  return String(text || '').replace(/(^|\n)(\s*)(Please Note:)/gi, '$1$2**$3**');
}

module.exports = {
  splitQuestionCopy,
  withNoteEmphasis,
};
