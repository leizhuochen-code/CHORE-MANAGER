/**
 * 到期时间辅助 —— 数据模型感知（Chore/ChoreInstance）。
 * 时间语义：实例生效时刻 = inst.dueTime ?? chore.dueTime（单次覆盖优先，缺省继承模板）。
 * 纯函数，node 环境可测；不依赖 React/DOM。
 */
import type { Chore, ChoreInstance } from '../types';
import { toDateKey, toDateTimeKey } from './dates';

/** 实例生效时刻（覆盖优先，缺省继承模板时间） */
export const effectiveDueTime = (inst: ChoreInstance, chore: Chore): string | undefined =>
  inst.dueTime ?? chore.dueTime;

/** 排序/比较键：'YYYY-MM-DD' 或 'YYYY-MM-DD HH:mm'，字典序即可比较 */
export const effectiveDueKey = (inst: ChoreInstance, chore: Chore): string => {
  const t = effectiveDueTime(inst, chore);
  return t ? `${inst.dueDate} ${t}` : inst.dueDate;
};

/** 列表/抽屉显示文本（同 effectiveDueKey） */
export const formatDue = (inst: ChoreInstance, chore: Chore): string => effectiveDueKey(inst, chore);

/**
 * 逾期判断：已完成永不逾期。
 * 有生效时刻 → 按 'YYYY-MM-DD HH:mm' 与当前时刻比较；无时间 → 按天判断（今天不逾期）。
 */
export const isOverdue = (inst: ChoreInstance, chore: Chore, now: Date = new Date()): boolean => {
  if (inst.completed) return false;
  const t = effectiveDueTime(inst, chore);
  return t ? effectiveDueKey(inst, chore) < toDateTimeKey(now) : inst.dueDate < toDateKey(now);
};
