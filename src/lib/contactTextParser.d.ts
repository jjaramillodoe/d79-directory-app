export interface ContactRecord {
  name: string;
  title: string;
  email: string;
  phone: string;
  unparsedNotes: string;
  confidence?: 'high' | 'medium' | 'low';
  rawSource?: string;
}

export interface ContactColumnDef {
  header: string;
  type?: 'text' | 'select';
  options?: string[];
}

export interface ContactTable {
  headers: string[];
  rows: string[][];
}

export const CONTACT_TABLE_HEADERS: string[];
export const CONTACT_TABLE_PRESET: ContactColumnDef[];
export const EMAIL_RE: RegExp;
export const PHONE_RE: RegExp;

export function emptyContact(): ContactRecord;
export function looksLikeContactColumns(columns?: Array<string | ContactColumnDef>): boolean;
export function parseContactsFromText(text: string): ContactRecord[];
export function parseContactsFromTextAsync(
  text: string,
  options?: { llm?: (raw: string, draft: ContactRecord[]) => Promise<ContactRecord[] | ContactRecord> }
): Promise<ContactRecord[]>;
export function parseContactsAsTable(
  text: string,
  options?: { headers?: string[]; columns?: Array<string | ContactColumnDef> }
): ContactTable;
export function notesForExport(contact: ContactRecord): string;
export function contactsToTable(
  contacts: ContactRecord[],
  options?: { headers?: string[]; columns?: Array<string | ContactColumnDef> }
): ContactTable;
export function mergeLlmEnrichment(parsed: ContactRecord[], enriched: ContactRecord[]): ContactRecord[];
export function normalizePhone(value: string): string;
export function isEmail(value: string): boolean;
export function isLikelyPersonName(value: string): boolean;
