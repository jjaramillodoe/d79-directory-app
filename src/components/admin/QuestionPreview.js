'use client';

export default function QuestionPreview({ question }) {
  if (!question) return null;

  const type = question.type || 'textarea';

  if (type === 'checkbox') {
    return (
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <input type="checkbox" disabled className="mt-1 w-4 h-4" />
        <label className="text-sm text-gray-700 whitespace-pre-line">{question.title || 'Checkbox question'}</label>
      </div>
    );
  }

  if (type === 'text') {
    return (
      <input
        type="text"
        disabled
        placeholder={question.placeholder || 'Short answer'}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-500"
      />
    );
  }

  if (type === 'select') {
    return (
      <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-500">
        <option>Select an option</option>
      </select>
    );
  }

  return (
    <textarea
      disabled
      rows={4}
      placeholder={question.placeholder || 'Long answer'}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-500 resize-none"
    />
  );
}
