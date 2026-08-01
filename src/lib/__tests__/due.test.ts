/**
 * due.ts 单元测试 —— 到期时间辅助逻辑。
 * 纯函数测试，node 环境，无需 jsdom。
 */
import { describe, it, expect } from 'vitest';
import type { Chore, ChoreInstance } from '../../types';
import { effectiveDueKey, formatDue, isOverdue } from '../due';

const chore = (over: Partial<Chore>): Chore => ({
  id: 'c',
  title: 't',
  isRecurring: false,
  assigneeIds: [],
  startDate: '2026-08-01',
  createdAt: '',
  ...over,
});

const inst = (over: Partial<ChoreInstance>): ChoreInstance => ({
  id: 'i',
  choreId: 'c',
  dueDate: '2026-08-01',
  completed: false,
  ...over,
});

describe('effectiveDueKey / formatDue', () => {
  it('无时间 → 仅日期', () => {
    expect(effectiveDueKey(inst({}), chore({}))).toBe('2026-08-01');
    expect(formatDue(inst({}), chore({}))).toBe('2026-08-01');
  });

  it('实例覆盖优先于模板时间', () => {
    expect(effectiveDueKey(inst({ dueTime: '10:00' }), chore({ dueTime: '09:30' }))).toBe(
      '2026-08-01 10:00',
    );
  });

  it('缺省继承模板时间', () => {
    expect(effectiveDueKey(inst({}), chore({ dueTime: '09:30' }))).toBe('2026-08-01 09:30');
  });

  it('字典序排序：同一天全天排在有时间之前', () => {
    const allDay = effectiveDueKey(inst({ dueDate: '2026-08-03' }), chore({}));
    const timed = effectiveDueKey(
      inst({ dueDate: '2026-08-03', dueTime: '09:00' }),
      chore({}),
    );
    expect(allDay < timed).toBe(true);
  });
});

describe('isOverdue', () => {
  const noon = new Date(2026, 7, 3, 12, 0); // 本地 2026-08-03 12:00

  it('已完成永不逾期', () => {
    expect(isOverdue(inst({ completed: true, dueDate: '2026-08-01' }), chore({}), noon)).toBe(false);
  });

  it('全天：昨天逾期、今天不逾期、明天不逾期', () => {
    expect(isOverdue(inst({ dueDate: '2026-08-02' }), chore({}), noon)).toBe(true);
    expect(isOverdue(inst({ dueDate: '2026-08-03' }), chore({}), noon)).toBe(false);
    expect(isOverdue(inst({ dueDate: '2026-08-04' }), chore({}), noon)).toBe(false);
  });

  it('定时：今天时刻前=待办，时刻后=逾期', () => {
    expect(isOverdue(inst({ dueDate: '2026-08-03', dueTime: '09:00' }), chore({}), noon)).toBe(true);
    expect(isOverdue(inst({ dueDate: '2026-08-03', dueTime: '14:00' }), chore({}), noon)).toBe(false);
  });

  it('定时：昨天任意时刻均逾期', () => {
    expect(isOverdue(inst({ dueDate: '2026-08-02', dueTime: '23:59' }), chore({}), noon)).toBe(true);
  });

  it('继承模板时间判断', () => {
    expect(isOverdue(inst({ dueDate: '2026-08-03' }), chore({ dueTime: '09:00' }), noon)).toBe(true);
  });
});
