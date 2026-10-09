/** Notification behaviour, configured by env. Deterministic — CI never calls a model. */
export type NotifyChannel = 'teams' | 'slack' | 'none';

export interface NotifyConfig {
  channel: NotifyChannel;
  /** 'always' or 'failures-only'. */
  sendWhen: 'always' | 'failures-only';
  /** How many failing tests to list before truncating (payload size caps are real). */
  maxFailuresListed: number;
}

export const notifyConfig: NotifyConfig = {
  channel: (process.env.NOTIFY_CHANNEL as NotifyChannel) ?? 'none',
  sendWhen: (process.env.NOTIFY_WHEN as NotifyConfig['sendWhen']) ?? 'always',
  maxFailuresListed: Number(process.env.NOTIFY_MAX_FAILURES ?? '10'),
};
