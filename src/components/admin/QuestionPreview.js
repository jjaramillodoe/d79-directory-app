'use client';

import { normalizeColumnDefs } from '../../lib/tableAnswer';
import LinkifiedText from '../LinkifiedText';

export default function QuestionPreview({ question }) {
  if (!question) return null;

  const type = question.type || 'textarea';

  if (type === 'checkbox') {
    return (
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <input type="checkbox" disabled className="mt-1 w-4 h-4" />
        <label className="text-sm text-gray-700 whitespace-pre-line">
          <LinkifiedText text={question.title || 'Checkbox question'} />
        </label>
      </div>
    );
  }

  if (type === 'yesno') {
    return (
      <div className="flex flex-wrap gap-3">
        {['Yes', 'No'].map((option) => (
          <label
            key={option}
            className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white"
          >
            <input type="radio" disabled name="preview-yesno" />
            {option}
          </label>
        ))}
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

  if (type === 'table') {
    const defs = normalizeColumnDefs(question.columns);
    const columns = defs.length
      ? defs
      : [
          { header: 'Column 1', type: 'text', options: [] },
          { header: 'Column 2', type: 'text', options: [] },
          { header: 'Column 3', type: 'text', options: [] },
        ];
    return (
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-100">
            <tr>
              {columns.map((column, index) => (
                <th key={`${column.header}-${index}`} className="px-2 py-1 text-left font-medium text-gray-600">
                  {column.header}
                  {column.type === 'select' ? ' (dropdown)' : ''}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              {columns.map((column, index) => (
                <td key={`${column.header}-cell-${index}`} className="px-2 py-2 text-gray-400">
                  {column.type === 'select' ? (
                    <select disabled className="w-full bg-transparent text-gray-400">
                      <option>Select one</option>
                    </select>
                  ) : (
                    'Paste from Excel'
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
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
