export type TriggerType = 'task_created' | 'task_assigned' | 'task_status_changed' | 'task_due';
export interface AutomationAction {
  type: 'set_assignee' | 'notify';
  assignee?: 'user' | 'creator';
  userId?: string;
  recipients?: string[];
  userIds?: string[];
  title?: string;
  body?: string;
}
export interface AutomationRule {
  id: string;
  name: string;
  triggerType: TriggerType;
  enabled: boolean;
  triggerConfig: { fromStatusId?: string; toStatusId?: string; hasAssignee?: boolean; toUserId?: string; daysBefore?: number };
  actions: AutomationAction[];
}
export function automationInput(rule: Omit<AutomationRule, 'id'>, updating = false) {
  if (!rule.name.trim()) throw new Error('نام قانون الزامی است.');
  if (rule.actions.length < 1 || rule.actions.length > 5) throw new Error('بین یک تا پنج عمل انتخاب کنید.');
  for (const action of rule.actions) {
    if (action.type === 'set_assignee' && action.assignee !== 'creator' && !action.userId) throw new Error('مسئول را انتخاب کنید.');
    if (action.type === 'notify' && !action.recipients?.length && !action.userIds?.length) throw new Error('گیرنده اعلان را انتخاب کنید.');
  }
  const config = rule.triggerType === 'task_due' ? { ...rule.triggerConfig, daysBefore: rule.triggerConfig.daysBefore ?? 1 } : rule.triggerConfig;
  if (rule.triggerType === 'task_due' && (!Number.isInteger(config.daysBefore) || config.daysBefore! < 1 || config.daysBefore! > 30))
    throw new Error('فاصله تا موعد باید بین ۱ و ۳۰ روز باشد.');
  return {
    name: rule.name.trim(),
    ...(!updating ? { triggerType: rule.triggerType } : {}),
    triggerConfig: config,
    actions: rule.actions,
    enabled: rule.enabled,
  };
}
export const triggerLabels: Record<TriggerType, string> = {
  task_created: 'ساخت کار',
  task_assigned: 'واگذاری کار',
  task_status_changed: 'تغییر وضعیت',
  task_due: 'نزدیک شدن موعد',
};
