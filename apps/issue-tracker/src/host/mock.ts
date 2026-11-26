import { createMockRecordStore } from '@lacuna/host-mock';

export const ISSUE_TYPES = ['Bug', 'Feature'] as const;
export const ISSUE_PRIORITIES = ['Low', 'Medium', 'High'] as const;
export const ISSUE_STATUSES = ['Open', 'In Progress', 'Done'] as const;

export type IssueType = (typeof ISSUE_TYPES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export interface Issue {
  id: string;
  title: string;
  type: IssueType;
  priority: IssuePriority;
  assignee: string;
  status: IssueStatus;
}

export function isIssue(value: unknown): value is Issue {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    (ISSUE_TYPES as readonly string[]).includes(v.type as string) &&
    (ISSUE_PRIORITIES as readonly string[]).includes(v.priority as string) &&
    typeof v.assignee === 'string' &&
    (ISSUE_STATUSES as readonly string[]).includes(v.status as string)
  );
}

// No `storage` option: the store reads and writes the browser's localStorage,
// so the issue list survives a page reload (A9).
export const issues = createMockRecordStore<Issue>({
  key: 'lacuna.issue-tracker.issues',
  validate: isIssue,
  idPrefix: 'issue-',
});
