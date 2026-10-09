/**
 * `npm run notify` — post the run summary to a chat channel.
 *
 * Two deliberate properties:
 *   • No webhook configured → writes reports/notification.json instead of failing.
 *     A broken notification must never turn a green build red.
 *   • Payload is size-capped: chat webhooks reject large bodies, so the failure
 *     list truncates and links out to the full report.
 *
 * Adding a channel is one function plus one case in `buildPayload`.
 */
import * as fs from 'fs';
import * as path from 'path';
import { request as pwRequest } from '@playwright/test';
import { notifyConfig } from '../config/notify.config';
import { env } from '../config/env';
import type { RunSummary } from './summarize';

const reportsDir = path.resolve(__dirname, '..', 'reports');

interface RunMeta {
  pipelineName: string;
  environment: string;
  branch: string;
  commit: string;
  profile: string;
  reportUrl?: string;
}

function readMeta(summary: RunSummary): RunMeta {
  return {
    pipelineName:
      process.env.BUILD_DEFINITIONNAME ?? process.env.GITHUB_WORKFLOW ?? 'automation',
    environment: process.env.AUTOMATION_ENV ?? 'QA',
    branch:
      process.env.BUILD_SOURCEBRANCHNAME ?? process.env.GITHUB_REF_NAME ?? 'local',
    commit: (process.env.BUILD_SOURCEVERSION ?? process.env.GITHUB_SHA ?? '').slice(0, 8),
    profile: summary.profile || env.profile,
    reportUrl: process.env.REPORT_URL,
  };
}

function summaryLines(summary: RunSummary, meta: RunMeta): string[] {
  const passRate = summary.total ? Math.round((summary.passed / summary.total) * 100) : 0;
  const lines = [
    `**${meta.pipelineName}** · ${meta.environment} · profile \`${meta.profile}\``,
    `${summary.passed}/${summary.total} passed (${passRate}%) · ${summary.failed} failed · ` +
      `${summary.skipped} skipped · ${summary.flaky} flaky · ${Math.round(summary.durationMs / 1000)}s`,
    `branch \`${meta.branch}\`${meta.commit ? ` · commit \`${meta.commit}\`` : ''}`,
  ];

  const shown = summary.failures.slice(0, notifyConfig.maxFailuresListed);
  if (shown.length) {
    lines.push('', '**Failures**');
    for (const f of shown) lines.push(`• ${f.title} — ${f.error}`);
    const hidden = summary.failures.length - shown.length;
    if (hidden > 0) lines.push(`…and ${hidden} more — see the full report.`);
  }
  if (meta.reportUrl) lines.push('', `[Full report](${meta.reportUrl})`);
  return lines;
}

function buildPayload(summary: RunSummary, meta: RunMeta): Record<string, unknown> {
  const text = summaryLines(summary, meta).join('\n');
  const colour = summary.failed > 0 ? 'D93F0B' : '2EA043';

  if (notifyConfig.channel === 'slack') {
    return { text, blocks: [{ type: 'section', text: { type: 'mrkdwn', text } }] };
  }

  // Teams (legacy MessageCard — accepted by both incoming-webhook flavours).
  return {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    themeColor: colour,
    summary: `${meta.pipelineName}: ${summary.passed}/${summary.total} passed`,
    title: `${summary.failed > 0 ? '❌' : '✅'} ${meta.pipelineName} — ${meta.environment}`,
    text: text.replace(/\n/g, '\n\n'),
  };
}

async function main(): Promise<void> {
  const summaryPath = path.join(reportsDir, 'summary.json');
  if (!fs.existsSync(summaryPath)) {
    console.warn('reports/summary.json not found — run `npm run report:summarize` first.');
    return;
  }
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8')) as RunSummary;

  if (notifyConfig.sendWhen === 'failures-only' && summary.failed === 0) {
    console.log('No failures and NOTIFY_WHEN=failures-only — nothing to send.');
    return;
  }

  const payload = buildPayload(summary, readMeta(summary));
  const webhook = env.notifyWebhookUrl;

  if (notifyConfig.channel === 'none' || !webhook) {
    const fallback = path.join(reportsDir, 'notification.json');
    fs.mkdirSync(reportsDir, { recursive: true });
    fs.writeFileSync(fallback, `${JSON.stringify(payload, null, 2)}\n`);
    console.log(`No webhook configured — payload written to ${fallback}`);
    return;
  }

  const ctx = await pwRequest.newContext();
  try {
    const res = await ctx.post(webhook, { data: payload });
    console.log(`[notify:${notifyConfig.channel}] ${res.status()} ${res.statusText()}`);
  } catch (err) {
    // A failed notification is never a failed build.
    console.warn(`[notify] send failed (ignored): ${(err as Error).message}`);
  } finally {
    await ctx.dispose();
  }
}

void main();
