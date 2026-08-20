'use client';

import { Row, Text, Button } from '@once-ui-system/core';
import { Trash2 } from 'lucide-react';
import {
  gridToTable,
  isTableAnswered,
  normalizeColumnDefs,
  normalizeTable,
  textLooksLikeGrid,
} from '../../lib/tableAnswer';

function parseHtmlTable(html) {
  if (!html || typeof window === 'undefined' || !/<table/i.test(html)) return null;
  try {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const table = doc.querySelector('table');
    if (!table) return null;
    const rows = [];
    table.querySelectorAll('tr').forEach((tr) => {
      const cells = [...tr.querySelectorAll('th, td')].map((cell) =>
        (cell.innerText || cell.textContent || '').replace(/\u00a0/g, ' ').trim()
      );
      if (cells.length) rows.push(cells);
    });
    return rows.length ? rows : null;
  } catch {
    return null;
  }
}

function selectOptions(columnDef, cell) {
  const options = columnDef?.options || [];
  if (cell && !options.some((option) => option === cell)) {
    return [cell, ...options];
  }
  return options;
}

function TableCell({ columnDef, cell, readOnly, rowIndex, columnIndex, onChange }) {
  if (readOnly) return cell || '';
  if (columnDef?.type === 'select' && columnDef.options?.length) {
    const options = selectOptions(columnDef, cell);
    return (
      <select
        value={cell}
        aria-label={`Row ${rowIndex + 1}, ${columnDef.header || `column ${columnIndex + 1}`}`}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">Select one</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }
  return (
    <input
      value={cell}
      aria-label={`Row ${rowIndex + 1}, column ${columnIndex + 1}`}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

function TableGrid({ table, columnDefs = [], readOnly, onHeaderChange, onCellChange, onRemoveRow }) {
  return (
    <div className="app-table-wrap">
      <table className={`app-table${readOnly ? ' app-table-readonly' : ''}`}>
        <thead>
          <tr>
            {table.headers.map((header, columnIndex) => (
              <th key={`h-${columnIndex}`}>
                {readOnly || !onHeaderChange ? (
                  header
                ) : (
                  <input
                    value={header}
                    aria-label={`Column ${columnIndex + 1} header`}
                    onChange={(event) => onHeaderChange(columnIndex, event.target.value)}
                  />
                )}
              </th>
            ))}
            {!readOnly && onRemoveRow ? <th className="app-table-actions"> </th> : null}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={`r-${rowIndex}`}>
              {row.map((cell, columnIndex) => (
                <td key={`c-${rowIndex}-${columnIndex}`}>
                  <TableCell
                    columnDef={columnDefs[columnIndex]}
                    cell={cell}
                    readOnly={readOnly}
                    rowIndex={rowIndex}
                    columnIndex={columnIndex}
                    onChange={(nextValue) => onCellChange(rowIndex, columnIndex, nextValue)}
                  />
                </td>
              ))}
              {!readOnly && onRemoveRow ? (
                <td className="app-table-actions">
                  <button
                    type="button"
                    className="app-table-remove"
                    aria-label={`Remove row ${rowIndex + 1}`}
                    onClick={() => onRemoveRow(rowIndex)}
                    disabled={table.rows.length <= 1}
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function TableDisplay({ value, columns }) {
  const columnDefs = normalizeColumnDefs(columns);
  const table = normalizeTable(value, { columns });
  if (!isTableAnswered(table)) {
    return <Text onBackground="neutral-weak">No response provided</Text>;
  }
  return <TableGrid table={table} columnDefs={columnDefs} readOnly />;
}

export default function TableAnswerField({
  value,
  columns,
  placeholder,
  readOnly = false,
  onChange,
}) {
  const columnDefs = normalizeColumnDefs(columns);
  const lockedColumns = columnDefs.length ? columns : undefined;
  const hasSelectColumns = columnDefs.some((column) => column.type === 'select');
  const table = normalizeTable(value, { columns: lockedColumns });

  const emit = (next) => {
    if (readOnly || !onChange) return;
    onChange(normalizeTable(next, { columns: lockedColumns }));
  };

  const handlePaste = (event) => {
    if (readOnly) return;
    const html = event.clipboardData?.getData('text/html') || '';
    const text = event.clipboardData?.getData('text/plain') || '';
    const htmlGrid = parseHtmlTable(html);
    if (!htmlGrid && !textLooksLikeGrid(text)) return;
    event.preventDefault();
    const grid = htmlGrid || text.split(/\r\n|\n|\r/).map((line) => line.split('\t'));
    emit(gridToTable(grid, { columns: lockedColumns }));
  };

  const updateHeader = (columnIndex, nextValue) => {
    const headers = table.headers.map((header, index) => (index === columnIndex ? nextValue : header));
    emit({ headers, rows: table.rows });
  };

  const updateCell = (rowIndex, columnIndex, nextValue) => {
    const rows = table.rows.map((row, index) =>
      index === rowIndex ? row.map((cell, cellIndex) => (cellIndex === columnIndex ? nextValue : cell)) : row
    );
    emit({ headers: table.headers, rows });
  };

  const addRow = () => {
    emit({
      headers: table.headers,
      rows: [...table.rows, table.headers.map(() => '')],
    });
  };

  const removeRow = (rowIndex) => {
    if (table.rows.length <= 1) return;
    emit({
      headers: table.headers,
      rows: table.rows.filter((_, index) => index !== rowIndex),
    });
  };

  const addColumn = () => {
    const headers = [...table.headers, `Column ${table.headers.length + 1}`];
    emit({
      headers,
      rows: table.rows.map((row) => [...row, '']),
    });
  };

  const clearTable = () => {
    emit(gridToTable([], { columns: lockedColumns }));
  };

  if (readOnly) {
    return <TableDisplay value={value} columns={lockedColumns} />;
  }

  return (
    <div className="app-table-field" onPaste={handlePaste}>
      <Text variant="body-default-s" onBackground="neutral-weak">
        {placeholder ||
          (hasSelectColumns
            ? 'Paste from Excel or Google Sheets. Text columns keep what you typed; dropdown columns keep a matching choice.'
            : 'Paste a table from Excel or Google Sheets. Columns stay in columns — do not paste into a single cell.')}
      </Text>
      <TableGrid
        table={table}
        columnDefs={columnDefs}
        onHeaderChange={lockedColumns ? undefined : updateHeader}
        onCellChange={updateCell}
        onRemoveRow={removeRow}
      />
      <Row gap="8" wrap>
        <Button size="s" variant="secondary" onClick={addRow}>
          Add row
        </Button>
        {!lockedColumns && (
          <Button size="s" variant="secondary" onClick={addColumn}>
            Add column
          </Button>
        )}
        <Button size="s" variant="tertiary" onClick={clearTable}>
          Clear table
        </Button>
      </Row>
    </div>
  );
}
