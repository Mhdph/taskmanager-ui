import { api } from './api';
import { projectPath } from './features-api';

export type DeliveryStatus = 'pending' | 'approved' | 'changes_requested' | 'withdrawn';
export type DeliveryDecision = 'approved' | 'changes_requested';
export interface Delivery {
  id: string;
  projectId: string;
  taskId: string;
  revision: number;
  submittedByUserId: string;
  reviewerUserId: string;
  body: string;
  outputUrl: string | null;
  status: DeliveryStatus;
  submittedAt: string;
  reviewedByUserId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
}
export interface DeliveryTask {
  assigneeUserId: string | null;
  createdByUserId: string;
  archivedAt?: string | null;
}
export interface DeliveryActor {
  userId: string;
  role?: string;
  hostedAdmin: boolean;
}
export const deliveryPath = (projectId: string, taskId: string, deliveryId?: string) =>
  `${projectPath(projectId)}/tasks/${encodeURIComponent(taskId)}/deliveries${deliveryId ? `/${encodeURIComponent(deliveryId)}` : ''}`;

export function deliveryPermissions(actor: DeliveryActor, task: DeliveryTask, delivery?: Delivery) {
  const manager = actor.hostedAdmin || actor.role === 'manager';
  const editor = manager || actor.role === 'member';
  const active = !!actor.userId && !task.archivedAt;
  return {
    submit: active && (manager || (actor.role === 'member' && actor.userId === (task.assigneeUserId ?? task.createdByUserId))),
    review: active && editor && delivery?.status === 'pending' && actor.userId === delivery.reviewerUserId && actor.userId !== delivery.submittedByUserId,
    withdraw: active && delivery?.status === 'pending' && (manager || (actor.role === 'member' && actor.userId === delivery.submittedByUserId)),
  };
}
export function eligibleReviewers(members: { userId: string; role: string }[], actor: DeliveryActor, task: DeliveryTask) {
  const owner = task.assigneeUserId ?? task.createdByUserId;
  return members.filter(member => ['manager', 'member'].includes(member.role) && member.userId !== actor.userId && member.userId !== owner);
}
export function deliveryOutputUrl(value: string) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || new TextEncoder().encode(value).length > 2048)
    throw new Error('پیوند خروجی باید HTTP یا HTTPS و حداکثر ۲۰۴۸ بایت باشد.');
  return value;
}
function validateText(value: string, max: number, required: boolean) {
  value = value.trim();
  if ((required && !value) || value.includes('\0') || [...value].length > max)
    throw new Error(required ? `متن الزامی و حداکثر ${max} نویسه است.` : `یادداشت باید حداکثر ${max} نویسه باشد.`);
  return value;
}
export function deliveryInput(reviewerUserId: string, body: string, outputUrl: string) {
  reviewerUserId = reviewerUserId.trim();
  if (!reviewerUserId || reviewerUserId.includes('\0')) throw new Error('بررسی‌کننده را انتخاب کنید.');
  body = validateText(body, 10000, true);
  outputUrl = outputUrl.trim();
  return { reviewerUserId, body, outputUrl: outputUrl ? deliveryOutputUrl(outputUrl) : null };
}
export function deliveryReviewInput(decision: DeliveryDecision, note: string) {
  if (decision !== 'approved' && decision !== 'changes_requested') throw new Error('نتیجه بررسی نامعتبر است.');
  if (decision === 'changes_requested' && !note.trim()) throw new Error('برای رد و درخواست اصلاح، دلیل را بنویسید.');
  return { decision, note: validateText(note, 2000, decision === 'changes_requested') };
}
export const submitDelivery = async (projectId: string, taskId: string, reviewer: string, body: string, url: string) =>
  (await api.post(deliveryPath(projectId, taskId), deliveryInput(reviewer, body, url))) as Delivery;
export const reviewDelivery = async (projectId: string, taskId: string, id: string, decision: DeliveryDecision, note: string) =>
  (await api.post(`${deliveryPath(projectId, taskId, id)}/review`, deliveryReviewInput(decision, note))) as Delivery;
export const withdrawDelivery = async (projectId: string, taskId: string, id: string, note: string) =>
  (await api.post(`${deliveryPath(projectId, taskId, id)}/withdraw`, { note: validateText(note, 2000, false) })) as Delivery;
