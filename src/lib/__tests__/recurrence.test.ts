/**
 * recurrence 引擎单元测试 —— 锁定重复规则的核心逻辑。
 * 纯函数测试，node 环境，无需 jsdom。
 */
import { describe, it, expect } from 'vitest';
import type { Chore, RecurrenceRule } from '../../types';
import {
  ruleToRRule,
  generateOccurrences,
  generateInstances,
  computeCoverageTarget,
  planInstancesForChore,
  rulesEqual,
  describeRule,
} from '../recurrence';
import { dateToLocalNoon, dateToUtcNoon } from '../dates';

const occurrenceDates = (rule: RecurrenceRule, s: string, from: string, to: string) =>
  generateOccurrences(rule, s, from, to);

describe('每天 daily', () => {
  it('间隔 1 → 连续每天', () => {
    const rule: RecurrenceRule = { freq: 'daily', interval: 1 };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-03');
    expect(days).toEqual(['2026-08-01', '2026-08-02', '2026-08-03']);
  });

  it('间隔 2 → 隔天', () => {
    const rule: RecurrenceRule = { freq: 'daily', interval: 2 };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-06');
    expect(days).toEqual(['2026-08-01', '2026-08-03', '2026-08-05']);
  });

  it('受 from/to 范围过滤', () => {
    const rule: RecurrenceRule = { freq: 'daily', interval: 1 };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-05', '2026-08-06');
    expect(days).toEqual(['2026-08-05', '2026-08-06']);
  });
});

describe('每周 weekly', () => {
  it('每周一（weekdays=[0]）全落在周一', () => {
    const rule: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0] };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-31');
    expect(days).toEqual(['2026-08-03', '2026-08-10', '2026-08-17', '2026-08-24', '2026-08-31']);
    // 全部是周一：2026-08-03 是周一
    expect(days.every((d) => dateToLocalNoon(d).getDay() === 1)).toBe(true);
  });

  it('startDate 非周一 → 首个发生日期为 startDate 之后的第一个周一', () => {
    const rule: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0] };
    const days = occurrenceDates(rule, '2026-08-05', '2026-08-05', '2026-08-20');
    expect(days).toEqual(['2026-08-10', '2026-08-17']);
  });

  it('每周一、周四（weekdays=[0,3]）', () => {
    const rule: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0, 3] };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-14');
    expect(days).toEqual(['2026-08-03', '2026-08-06', '2026-08-10', '2026-08-13']);
  });
});

describe('每月 monthly', () => {
  it('每月 15 日，间隔 1', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 1, dayOfMonth: 15 };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-10-31');
    expect(days).toEqual(['2026-08-15', '2026-09-15', '2026-10-15']);
  });

  it('每月 15 日，间隔 2', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 2, dayOfMonth: 15 };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2027-02-28');
    expect(days).toEqual(['2026-08-15', '2026-10-15', '2026-12-15', '2027-02-15']);
  });

  it('每月最后一天：跨 8/31、9/30、11/30', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 1, lastDayOfMonth: true };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-12-31');
    expect(days).toEqual(['2026-08-31', '2026-09-30', '2026-10-31', '2026-11-30', '2026-12-31']);
  });

  it('每月最后一天：2 月平年 28 日', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 1, lastDayOfMonth: true };
    const days = occurrenceDates(rule, '2027-01-01', '2027-01-01', '2027-03-31');
    expect(days).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });

  it('每月最后一天：2028 年闰年 2 月 29 日', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 1, lastDayOfMonth: true };
    const days = occurrenceDates(rule, '2028-01-01', '2028-01-01', '2028-03-31');
    expect(days).toEqual(['2028-01-31', '2028-02-29', '2028-03-31']);
  });
});

describe('结束日期 endDate', () => {
  it('endDate 含边界：最后一个实例 = endDate，之后无', () => {
    const rule: RecurrenceRule = {
      freq: 'weekly',
      interval: 1,
      weekdays: [0],
      endDate: '2026-08-17',
    };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-31');
    expect(days).toEqual(['2026-08-03', '2026-08-10', '2026-08-17']);
  });
});

describe('自定义 custom', () => {
  it('每 2 周的周一、周四（rrule 以开始日期所在周为锚点计间隔）', () => {
    const rule: RecurrenceRule = {
      freq: 'custom',
      baseFreq: 'weekly',
      interval: 2,
      weekdays: [0, 3],
    };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-08-31');
    // dtstart 2026-08-01 是周六，其所在周的周一/周四（7/27、7/30）在开始日期之前被跳过；
    // 间隔自该周起算，故首个窗口为 +2 周（8/10、8/13），再 +2 周（8/24、8/27）
    expect(days).toEqual(['2026-08-10', '2026-08-13', '2026-08-24', '2026-08-27']);
  });

  it('每月最后一天（自定义月度）', () => {
    const rule: RecurrenceRule = {
      freq: 'custom',
      baseFreq: 'monthly',
      interval: 1,
      lastDayOfMonth: true,
    };
    const days = occurrenceDates(rule, '2026-08-01', '2026-08-01', '2026-09-30');
    expect(days).toEqual(['2026-08-31', '2026-09-30']);
  });
});

describe('时区安全 timezone', () => {
  it('ruleToRRule 生成的发生日期为 UTC 正午（夏令时免疫）', () => {
    const rule: RecurrenceRule = { freq: 'daily', interval: 1 };
    const r = ruleToRRule(rule, '2026-08-01');
    const occ = r.after(dateToUtcNoon('2026-07-31'), true)!;
    expect(occ.getUTCDate()).toBe(1);
    expect(occ.getUTCHours()).toBe(12);
  });

  it('跨夏令时边界的月末日期不丢失（UTC 与本地时区一致）', () => {
    const rule: RecurrenceRule = { freq: 'monthly', interval: 1, lastDayOfMonth: true };
    // dtstart 与边界都走 UTC 正午，即使本地有夏令时（如欧洲/伦敦）也不会漂移
    const days = occurrenceDates(rule, '2027-01-01', '2027-01-01', '2027-03-31');
    expect(days).toEqual(['2027-01-31', '2027-02-28', '2027-03-31']);
  });
});

describe('generateInstances / planInstancesForChore', () => {
  it('按 existing 日期去重', () => {
    const chore: Chore = {
      id: 'c1',
      title: '倒垃圾',
      isRecurring: true,
      recurrence: { freq: 'daily', interval: 1 },
      assigneeIds: [],
      startDate: '2026-08-01',
      startTime: '09:00',
      durationMinutes: 30,
      createdAt: '',
    };
    const existing = new Set(['2026-08-01', '2026-08-03']);
    const insts = generateInstances(chore, '2026-08-01', '2026-08-04', existing);
    expect(insts.map((i) => i.dueDate)).toEqual(['2026-08-02', '2026-08-04']);
    expect(insts.every((i) => i.completed === false && i.id.length > 0)).toBe(true);
  });

  it('非循环杂务恰好一个实例', () => {
    const chore: Chore = {
      id: 'c2',
      title: '报销',
      isRecurring: false,
      assigneeIds: [],
      startDate: '2026-08-15',
      startTime: '10:00',
      durationMinutes: 60,
      createdAt: '',
    };
    const { instances, generatedThrough } = planInstancesForChore(chore, new Set());
    expect(instances).toHaveLength(1);
    expect(instances[0].dueDate).toBe('2026-08-15');
    expect(generatedThrough).toBe('2026-08-15');
  });
});

describe('computeCoverageTarget', () => {
  it('generatedThrough 已覆盖目标 → 返回 null（无需扩展）', () => {
    const rule: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0] };
    const t = computeCoverageTarget(rule, '2026-08-01', '2026-12-31', '2026-09-30');
    expect(t).toBeNull();
  });

  it('目标被 endDate 截断', () => {
    const rule: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0], endDate: '2026-09-10' };
    const t = computeCoverageTarget(rule, '2026-08-01', undefined, '2026-12-31');
    expect(t).toBe('2026-09-10');
  });
});

describe('rulesEqual', () => {
  it('等价规则比较', () => {
    const a: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0, 3] };
    const b: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0, 3] };
    const c: RecurrenceRule = { freq: 'weekly', interval: 1, weekdays: [0, 4] };
    expect(rulesEqual(a, b)).toBe(true);
    expect(rulesEqual(a, c)).toBe(false);
    expect(rulesEqual(undefined, undefined)).toBe(true);
    expect(rulesEqual(a, undefined)).toBe(false);
  });
});

describe('describeRule 文案', () => {
  it('中文描述', () => {
    expect(describeRule({ freq: 'daily', interval: 1 })).toBe('每天');
    expect(describeRule({ freq: 'daily', interval: 2 })).toBe('每2天');
    expect(describeRule({ freq: 'weekly', interval: 1, weekdays: [0] })).toBe('每周周一');
    expect(describeRule({ freq: 'weekly', interval: 2, weekdays: [0, 3] })).toBe('每2周周一、周四');
    expect(describeRule({ freq: 'monthly', interval: 1, dayOfMonth: 15 })).toBe('每月15日');
    expect(describeRule({ freq: 'monthly', interval: 1, lastDayOfMonth: true })).toBe('每月最后一天');
    expect(describeRule({ freq: 'custom', baseFreq: 'monthly', interval: 2, dayOfMonth: 1 })).toBe('每2个月1日');
    expect(describeRule({ freq: 'weekly', interval: 1, weekdays: [0], endDate: '2026-12-31' })).toBe('每周周一（至 2026-12-31）');
  });
});
