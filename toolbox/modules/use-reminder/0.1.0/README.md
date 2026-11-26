<!-- SPDX-License-Identifier: MIT. Copyright (c) 2026 David H. Silver / Lacuna. Snapshot of lacuna-components useReminder at 4cddd6c. -->

> `@lacuna/use-reminder` `0.1.0`. To use it in an app: add `"@lacuna/use-reminder": "workspace:0.1.0"` to `dependencies` in the app's `package.json`, add `"@lacuna/use-reminder": "0.1.0"` to `requires.modules` in `lacuna.app.json`, run `pnpm install`, then `import { ... } from '@lacuna/use-reminder'`.

# useReminder

A React hook that schedules a local due-time alert using the Notification API when permission is granted, falling back to an in-app state flag when it is not. It is meant for apps like a study planner, medication reminder, or birthday reminder that need to nudge a user at a specific local date and time. One hook instance tracks one due time; repeating reminders, snooze, and persistence are out of scope.

## Signature

```ts
import type { ReminderOptions, ReminderState } from './types';

/**
 * Options accepted by useReminder.
 */
export interface ReminderOptions {
  /** ISO 8601 date-time string for when the reminder fires. */
  dueAt: string;
  /** Title shown in the notification or in-app alert. */
  title: string;
  /** Body text shown in the notification or in-app alert. */
  body?: string;
  /** If true, request Notification permission on mount (default true). */
  requestPermission?: boolean;
}

/**
 * State returned by useReminder.
 */
export interface ReminderState {
  /** True once the due time has been reached and the alert has fired. */
  fired: boolean;
  /** True if the browser Notification API is available and permission is granted. */
  usingNotification: boolean;
  /** True if the in-app fallback alert is active. */
  inAppAlert: boolean;
  /** Dismiss the in-app alert (no-op if not using fallback). */
  dismiss: () => void;
  /** Cancel the scheduled reminder and reset state. */
  cancel: () => void;
}

/**
 * Schedule a local due-time alert.
 *
 * @param options - Reminder configuration.
 * @returns Current reminder state and control functions.
 */
export function useReminder(options: ReminderOptions): ReminderState;
```

## Usage

```tsx
import { useEffect, useState } from 'react';
import { useReminder } from '@lacuna/use-reminder';

export function StudyPlannerNudge({ dueAt }: { dueAt: string }) {
  const [due, setDue] = useState(dueAt);
  const { fired, inAppAlert, dismiss } = useReminder({
    dueAt: due,
    title: 'Study session due',
    body: 'Time to start your planned review.',
  });

  useEffect(() => {
    if (!inAppAlert) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [inAppAlert, dismiss]);

  if (inAppAlert) return <div role="alert">Study session due — press Escape to dismiss</div>;
  return <p>{fired ? 'Reminder fired' : `Reminder set for ${due}`}</p>;
}
```
