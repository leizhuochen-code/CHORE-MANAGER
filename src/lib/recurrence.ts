/**
 * 重复规则引擎 —— 全应用风险最高的逻辑，已用单元测试锁定。
 * 策略：物化实例（materialize）。创建/编辑循环杂务时用 rrule 生成具体实例，
 * 视图只按 dueDate 过滤实例，渲染零重复计算。
 */
import { RRule, type Options } from 'rrule';
import type { Chore, ChoreInstance, RecurrenceRule } from '../types';
import {
  dateToUtcNoon,
  fromUtcNoon,
  addDaysKey,
  todayKey,
  minKey,
  maxKey,
  uuid,
} from './dates';
import { MATERIALIZE_HORIZON_DAYS, AUTO_EXTEND_CAP_DAYS, WEEKDAY_LABELS } from '../constants';

const FREQ_MAP = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
} as const;

// 索引 0=周一 .. 6=周日（rrule 约定）
const DAY_MAP = [RRule.MO, RRule.TU, RRule.WE, RRule.TH, RRule.FR, RRule.SA, RRule.SU];

/** 把业务重复规则映射为 rrule 配置 */
export function ruleToRRule(rule: RecurrenceRule, startDate: string): RRule {
  const dtstart = dateToUtcNoon(startDate);
  const base = rule.freq === 'custom' ? rule.baseFreq ?? 'daily' : rule.freq;
  const interval = Math.max(1, Math.floor(rule.interval));

  const opts: Partial<Options> = {
    freq: FREQ_MAP[base],
    dtstart,
    interval,
  };

  if (base === 'weekly') {
    opts.byweekday = rule.weekdays?.length
      ? rule.weekdays.map((d) => DAY_MAP[d])
      : [DAY_MAP[dtstart.getDay()]];
  } else if (base === 'monthly') {
    // bymonthday: -1 表示每月最后一天
    opts.bymonthday = rule.lastDayOfMonth ? [-1] : [rule.dayOfMonth ?? dtstart.getDate()];
  }

  if (rule.endDate) {
    // until 用 UTC 正午，保证 endDate 当天包含在内（夏令时免疫）
    opts.until = dateToUtcNoon(rule.endDate);
  }

  return new RRule(opts);
}

/** 取 [fromKey, toKey]（含）内的所有发生日期 */
export function generateOccurrences(
  rule: RecurrenceRule,
  startDate: string,
  fromKey: string,
  toKey: string,
): string[] {
  const r = ruleToRRule(rule, startDate);
  return r.between(dateToUtcNoon(fromKey), dateToUtcNoon(toKey), true).map(fromUtcNoon);
}

/** 计算某循环杂务应物化到的目标日期；无需扩展时返回 null */
export function computeCoverageTarget(
  rule: RecurrenceRule,
  startDate: string,
  generatedThrough: string | undefined,
  requestedThrough: string,
): string | null {
  const today = todayKey();
  const cap = addDaysKey(today, AUTO_EXTEND_CAP_DAYS);
  let target = minKey(requestedThrough, cap);
  if (rule.endDate) target = minKey(target, rule.endDate);
  if (rule.endDate && rule.endDate < startDate) return null; // 表单已校验，防御兜底
  if (generatedThrough && generatedThrough >= target) return null;
  return target;
}

/** 生成实例（按 `existing` 中已占用的日期去重） */
export function generateInstances(
  chore: Chore,
  fromKey: string,
  toKey: string,
  existing?: ReadonlySet<string>,
): ChoreInstance[] {
  if (!chore.isRecurring || !chore.recurrence) {
    // 非循环：startDate 恰有一个实例
    if (chore.startDate >= fromKey && chore.startDate <= toKey && !existing?.has(chore.startDate)) {
      return [{ id: uuid(), choreId: chore.id, dueDate: chore.startDate, completed: false }];
    }
    return [];
  }
  return generateOccurrences(chore.recurrence, chore.startDate, fromKey, toKey)
    .filter((d) => !existing?.has(d))
    .map((dueDate) => ({ id: uuid(), choreId: chore.id, dueDate, completed: false }));
}

/**
 * 为某个杂务规划全部实例（新增/重建共用）。
 * 非循环 → 恰一个实例；循环 → 从 startDate 物化到 horizon 上限。
 */
export function planInstancesForChore(
  chore: Chore,
  existing: ReadonlySet<string>,
): { instances: ChoreInstance[]; generatedThrough?: string } {
  if (!chore.isRecurring || !chore.recurrence) {
    if (existing.has(chore.startDate)) {
      return { instances: [], generatedThrough: chore.startDate };
    }
    return {
      instances: [{ id: uuid(), choreId: chore.id, dueDate: chore.startDate, completed: false }],
      generatedThrough: chore.startDate,
    };
  }
  const target = computeCoverageTarget(
    chore.recurrence,
    chore.startDate,
    undefined,
    addDaysKey(chore.startDate, MATERIALIZE_HORIZON_DAYS),
  );
  if (!target) return { instances: [], generatedThrough: chore.startDate };
  return {
    instances: generateInstances(chore, chore.startDate, target, existing),
    generatedThrough: target,
  };
}

/** 两条重复规则是否等价（用于判断编辑是否触及循环本身） */
export function rulesEqual(a: RecurrenceRule | undefined, b: RecurrenceRule | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.freq === b.freq &&
    a.baseFreq === b.baseFreq &&
    a.interval === b.interval &&
    a.endDate === b.endDate &&
    a.lastDayOfMonth === b.lastDayOfMonth &&
    a.dayOfMonth === b.dayOfMonth &&
    JSON.stringify(a.weekdays ?? []) === JSON.stringify(b.weekdays ?? [])
  );
}

/** 人类可读的重复说明，如「每周一」「每月最后一天」 */
export function describeRule(rule: RecurrenceRule): string {
  const base = rule.freq === 'custom' ? rule.baseFreq ?? 'daily' : rule.freq;
  const interval = Math.max(1, Math.floor(rule.interval));
  const parts: string[] = [];

  if (base === 'daily') {
    parts.push(interval === 1 ? '每天' : `每${interval}天`);
  } else if (base === 'weekly') {
    parts.push(interval === 1 ? '每周' : `每${interval}周`);
    if (rule.weekdays?.length) {
      // 直接拼接出「每周一」「每2周周一、周四」的常见说法
      return (
        parts.join('') + rule.weekdays.map((d) => WEEKDAY_LABELS[d]).join('、') + (rule.endDate ? `（至 ${rule.endDate}）` : '')
      );
    }
  } else if (base === 'monthly') {
    parts.push(interval === 1 ? '每月' : `每${interval}个月`);
    parts.push(rule.lastDayOfMonth ? '最后一天' : `${rule.dayOfMonth ?? ''}日`);
  }

  const s = parts.join('');
  return rule.endDate ? `${s}（至 ${rule.endDate}）` : s;
}

/** 辅助：求两个日期中的较近者（导出给 store 用） */
export { maxKey };
