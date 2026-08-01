/**
 * 日程状态引擎 —— 数据模型感知（Chore/ChoreInstance）。
 * 语义：实例起始时刻 = inst.startTime ?? chore.startTime（单次覆盖优先，缺省继承模板）；
 *      持续时间 = inst.durationMinutes ?? chore.durationMinutes。
 * 四态：未到时 upcoming / 进行中 inProgress / 已完成 completed / 已逾期 overdue。
 *      逾期 = 超过结束时间 + 1h 宽限仍未手动打点完成。
 * 纯函数，node 环境可测；不依赖 React/DOM。
 */
import type { Chore, ChoreInstance } from '../types';
import { toDateTimeKey, addMinutesToDateTime } from './dates';

/** 超过结束时间后未打点完成即逾期的宽限期（分钟） */
export const OVERDUE_GRACE_MINUTES = 60;

export type TaskStatus = 'upcoming' | 'inProgress' | 'completed' | 'overdue';

/** 实例起始时刻（覆盖优先，缺省继承模板；防御兜底 '09:00'） */
export const effectiveStartTime = (inst: ChoreInstance, chore: Chore): string =>
  inst.startTime ?? chore.startTime ?? '09:00';

/** 实例持续时间（分钟）（覆盖优先，缺省继承模板；防御兜底 60） */
export const effectiveDuration = (inst: ChoreInstance, chore: Chore): number =>
  inst.durationMinutes ?? chore.durationMinutes ?? 60;

/** 起始时刻键 'YYYY-MM-DD HH:mm'，字典序即时间序 */
export const startKey = (inst: ChoreInstance, chore: Chore): string =>
  `${inst.dueDate} ${effectiveStartTime(inst, chore)}`;

/** 结束时刻键 'YYYY-MM-DD HH:mm'（可跨天） */
export const endKey = (inst: ChoreInstance, chore: Chore): string =>
  addMinutesToDateTime(inst.dueDate, effectiveStartTime(inst, chore), effectiveDuration(inst, chore));

/** 显示文本：'YYYY-MM-DD HH:mm–HH:mm'（跨天时补结束日期） */
export const formatWindow = (inst: ChoreInstance, chore: Chore): string => {
  const start = startKey(inst, chore);
  const end = endKey(inst, chore);
  const startDate = inst.dueDate;
  const endDate = end.slice(0, 10);
  const endTime = end.slice(11);
  return endDate !== startDate ? `${start}–${endDate} ${endTime}` : `${start}–${endTime}`;
};

/**
 * 四态判断（now 可注入便于测试）：
 * completed → 已完成；now < start → 未到时；
 * now ≤ end + 宽限 → 进行中；否则 → 已逾期。
 */
export const status = (inst: ChoreInstance, chore: Chore, now: Date = new Date()): TaskStatus => {
  if (inst.completed) return 'completed';
  const nowKey = toDateTimeKey(now);
  if (nowKey < startKey(inst, chore)) return 'upcoming';
  const overdueAt = addMinutesToDateTime(
    inst.dueDate,
    effectiveStartTime(inst, chore),
    effectiveDuration(inst, chore) + OVERDUE_GRACE_MINUTES,
  );
  return nowKey <= overdueAt ? 'inProgress' : 'overdue';
};

/** 是否逾期（status === 'overdue'） */
export const isOverdue = (inst: ChoreInstance, chore: Chore, now: Date = new Date()): boolean =>
  status(inst, chore, now) === 'overdue';
