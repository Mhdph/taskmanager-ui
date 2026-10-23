import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { configureQueryClient, createQueryClient } from '../src/lib/query-client';
import { featureKey, projectPath } from '../src/lib/features-api';
import {
  deliveryInput,
  deliveryPath,
  deliveryPermissions,
  deliveryReviewInput,
  eligibleReviewers,
  reviewDelivery,
  submitDelivery,
  withdrawDelivery,
  type Delivery,
  type DeliveryActor,
  type DeliveryTask,
} from '../src/lib/deliveries';
import { DeliveryCard, TaskDeliveries } from '../src/lib/components/TaskDeliveries';

vi.mock('../src/lib/state', () => ({ D: () => ({ members: [] }) }));
vi.mock('../src/lib/environment', () => ({ browser: true }));
const task: DeliveryTask = { assigneeUserId: 'alice', createdByUserId: 'creator', archivedAt: null };
const pending: Delivery = {
  id: 'd1',
  projectId: 'p1',
  taskId: 't1',
  revision: 1,
  submittedByUserId: 'alice',
  reviewerUserId: 'bob',
  body: '<output>',
  outputUrl: 'https://example.test/output',
  status: 'pending',
  submittedAt: '2026-10-23T12:00:00Z',
  reviewedByUserId: null,
  reviewNote: null,
  reviewedAt: null,
};
const actor = (userId: string, role = 'member', hostedAdmin = false): DeliveryActor => ({ userId, role, hostedAdmin });
let client: ReturnType<typeof createQueryClient>;
beforeEach(() => {
  client = createQueryClient();
  configureQueryClient(client);
});
afterEach(() => {
  client.clear();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function card(user: DeliveryActor, delivery = pending) {
  return renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(DeliveryCard, { actor: user, task, delivery })));
}

describe('delivery permissions match the API', () => {
  it('permits the assignee, unassigned task creator, and project or hosted managers to submit', () => {
    expect(deliveryPermissions(actor('alice'), task).submit).toBe(true);
    expect(deliveryPermissions(actor('creator'), task).submit).toBe(false);
    expect(deliveryPermissions(actor('creator'), { ...task, assigneeUserId: null }).submit).toBe(true);
    expect(deliveryPermissions(actor('manager', 'manager'), task).submit).toBe(true);
    expect(deliveryPermissions(actor('admin', undefined, true), task).submit).toBe(true);
    expect(deliveryPermissions(actor('alice', 'viewer'), task).submit).toBe(false);
    expect(deliveryPermissions(actor('alice'), { ...task, archivedAt: '2026-10-23' }).submit).toBe(false);
  });
  it('allows only the designated current reviewer to approve or request changes', () => {
    expect(deliveryPermissions(actor('bob'), task, pending).review).toBe(true);
    expect(deliveryPermissions(actor('bob', 'manager'), task, pending).review).toBe(true);
    expect(deliveryPermissions(actor('someone', 'manager'), task, pending).review).toBe(false);
    expect(deliveryPermissions(actor('someone', undefined, true), task, pending).review).toBe(false);
    expect(deliveryPermissions(actor('bob', 'viewer'), task, pending).review).toBe(false);
    expect(deliveryPermissions(actor('bob', 'none'), task, pending).review).toBe(false);
    expect(deliveryPermissions(actor('bob'), task, { ...pending, submittedByUserId: 'bob' }).review).toBe(false);
    for (const status of ['approved', 'changes_requested', 'withdrawn'] as const)
      expect(deliveryPermissions(actor('bob'), task, { ...pending, status }).review).toBe(false);
  });
  it('allows submitters and managers to withdraw, and excludes self, task owner, and viewers from reviewer choices', () => {
    expect(deliveryPermissions(actor('alice'), task, pending).withdraw).toBe(true);
    expect(deliveryPermissions(actor('manager', 'manager'), task, pending).withdraw).toBe(true);
    expect(deliveryPermissions(actor('bob'), task, pending).withdraw).toBe(false);
    expect(deliveryPermissions(actor('alice', 'viewer'), task, pending).withdraw).toBe(false);
    expect(
      eligibleReviewers(
        [
          { userId: 'admin', role: 'manager' },
          { userId: 'alice', role: 'member' },
          { userId: 'bob', role: 'manager' },
          { userId: 'carol', role: 'member' },
          { userId: 'viewer', role: 'viewer' },
        ],
        actor('admin', 'manager'),
        task,
      ).map(member => member.userId),
    ).toEqual(['bob', 'carol']);
  });
});

describe('delivery validation and HTTP contract', () => {
  it('requires a rejection reason and permits an optional approval note', () => {
    expect(() => deliveryReviewInput('changes_requested', '  ')).toThrow('دلیل');
    expect(deliveryReviewInput('approved', '')).toEqual({ decision: 'approved', note: '' });
    expect(deliveryReviewInput('changes_requested', ' Fix mobile layout ')).toEqual({ decision: 'changes_requested', note: 'Fix mobile layout' });
    expect(() => deliveryReviewInput('approved', 'x'.repeat(2001))).toThrow();
  });
  it('validates content and safe HTTP output links using the backend limits', () => {
    expect(deliveryInput(' bob ', ' Ready ', '')).toEqual({ reviewerUserId: 'bob', body: 'Ready', outputUrl: null });
    for (const url of ['javascript:alert(1)', 'ftp://example.test/file', 'https://user:pass@example.test', 'https://example.test/' + 'ا'.repeat(1100)])
      expect(() => deliveryInput('bob', 'Ready', url)).toThrow();
    expect(() => deliveryInput('bob', ' ', '')).toThrow();
    expect(() => deliveryInput('bob', 'x'.repeat(10001), '')).toThrow();
    expect(() => deliveryInput('', 'Ready', '')).toThrow();
    expect(() => deliveryInput('bob', 'bad\0text', '')).toThrow();
  });
  it('uses the delivery endpoints without sending task status or server-owned revision fields', async () => {
    const fetch = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify(pending))));
    vi.stubGlobal('fetch', fetch);
    await submitDelivery('p/1', 't/1', 'bob', ' Ready ', 'https://example.test/result');
    await reviewDelivery('p/1', 't/1', 'd/1', 'changes_requested', ' Fix layout ');
    await withdrawDelivery('p/1', 't/1', 'd/1', ' Different reviewer ');
    expect(fetch.mock.calls.map(call => [call[0], call[1].method, JSON.parse(call[1].body)])).toEqual([
      ['/api/projects/p%2F1/tasks/t%2F1/deliveries', 'POST', { reviewerUserId: 'bob', body: 'Ready', outputUrl: 'https://example.test/result' }],
      ['/api/projects/p%2F1/tasks/t%2F1/deliveries/d%2F1/review', 'POST', { decision: 'changes_requested', note: 'Fix layout' }],
      ['/api/projects/p%2F1/tasks/t%2F1/deliveries/d%2F1/withdraw', 'POST', { note: 'Different reviewer' }],
    ]);
  });
  it('preserves server conflict errors and never sends an invalid rejection', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('delivery has already been reviewed', { status: 409 }));
    vi.stubGlobal('fetch', fetch);
    await expect(reviewDelivery('p1', 't1', 'd1', 'changes_requested', '')).rejects.toThrow('دلیل');
    expect(fetch).not.toHaveBeenCalled();
    await expect(reviewDelivery('p1', 't1', 'd1', 'approved', '')).rejects.toMatchObject({ status: 409 });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

describe('approval UI', () => {
  it('shows reviewer decisions, read-only history, and safe output links', () => {
    const html = card(actor('bob'));
    expect(html).toContain('تأیید خروجی');
    expect(html).toContain('رد و درخواست اصلاح');
    expect(html).toContain('دلیل رد');
    expect(html).toContain('&lt;output&gt;');
    expect(html).toContain('rel="noopener noreferrer"');
    const manager = card(actor('manager', 'manager'));
    expect(manager).not.toContain('تأیید خروجی</button>');
    expect(manager).toContain('پس‌گرفتن تحویل');
    const viewer = card(actor('bob', 'viewer'));
    expect(viewer).not.toContain('<textarea');
    expect(viewer).not.toContain('<button');
  });
  it('preserves resolved versions and notes and hides invalid stored links', () => {
    const html = card(actor('bob'), {
      ...pending,
      status: 'changes_requested',
      reviewNote: '<fix>',
      reviewedAt: '2026-10-23T13:00:00Z',
      reviewedByUserId: 'bob',
      outputUrl: 'javascript:alert(1)',
    });
    expect(html).toContain('ردشده؛ نیاز به اصلاح');
    expect(html).toContain('&lt;fix&gt;');
    expect(html).not.toContain('<button');
    expect(html).not.toContain('href=');
  });
  it('blocks a second pending submission and renders the approval section from cached API data', () => {
    client.setQueryData(featureKey('/me'), { userId: 'alice', role: 'Member' });
    client.setQueryData(featureKey(`${projectPath('p1')}/members`), {
      items: [
        { userId: 'alice', role: 'member' },
        { userId: 'bob', role: 'manager' },
      ],
    });
    client.setQueryData(featureKey(`${projectPath('p1')}/tasks/t1`), task);
    client.setQueryData(featureKey(`${deliveryPath('p1', 't1')}?limit=20`), { pages: [{ items: [pending], nextCursor: '1' }], pageParams: [''] });
    const render = () => renderToStaticMarkup(createElement(QueryClientProvider, { client }, createElement(TaskDeliveries, { projectId: 'p1', taskId: 't1' })));
    const html = render();
    expect(html).toContain('یک نسخه در انتظار بررسی است');
    expect(html).not.toContain('ارسال خروجی برای بررسی</button>');
    expect(html).toContain('نسخه‌های قدیمی‌تر');
    expect(html).toContain('وضعیت انجام کار را تغییر نمی‌دهد');
    client.setQueryData(featureKey(`${deliveryPath('p1', 't1')}?limit=20`), {
      pages: [{ items: [{ ...pending, status: 'changes_requested' }], nextCursor: null }],
      pageParams: [''],
    });
    expect(render()).toContain('ارسال خروجی برای بررسی');
  });
});
