// Stub — full implementation in Task 2.
import type React from 'react';

/** Props for the notification email template. */
export type NotificationEmailProps = {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  body?: string;
  link?: string;
};

/** Notification email sent alongside the in-app notification. */
export function NotificationEmail(_props: NotificationEmailProps): React.ReactElement | null {
  return null;
}
