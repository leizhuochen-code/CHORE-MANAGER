/**
 * due.ts 单元测试 —— 日程状态引擎（四态：未到时/进行中/已完成/已逾期）。
 * 纯函数测试，node 环境，无需 jsdom。
 */
import { describe, it, expect } from 'vitest';
import type { Chore, ChoreInstance } from '../../types';
import { status, isOverdue, startKey, endKey, formatWindow, effectiveStartTime, effectiveDuration } from '../due';

const chore = (over: Partial<Chore>): Chore => ({
  id: 'c',
  title: 't',
  isRecurring: false,
  assigneeIds: [],
  startDate: '2026-08-01',
  startTime: '09:00',
  durationMinutes: 60,
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

const at = (date: string, time: string): Date => new Date(`${date}T${time}:00`);

describe('effectiveStartTime / effectiveDuration', () => {
  it('实例覆盖优先于模板', () => {
    expect(effectiveStartTime(inst({ startTime: '10:00' }), chore({ startTime: '09:30' }))).toBe('10:00');
    expect(effectiveDuration(inst({ durationMinutes: 30 }), chore({ durationMinutes: 90 }))).toBe(30);
  });

  it('缺省继承模板，防御兜底', () => {
    expect(effectiveStartTime(inst({}), chore({}))).toBe('09:00');
    expect(effectiveDuration(inst({}), chore({}))).toBe(60);
  });
});

describe('startKey / endKey / formatWindow', () => {
  it('起始键 = 日期 + 起始时刻', () => {
    expect(startKey(inst({}), chore({}))).toBe('2026-08-01 09:00');
  });

  it('结束键 = 起始 + 持续分钟', () => {
    expect(endKey(inst({}), chore({ durationMinutes: 90 }))).toBe('2026-08-01 10:30');
  });

  it('跨天：23:00 持续 90 分钟 → 次日 00:30', () => {
    expect(
      endKey(inst({ dueDate: '2026-08-01', startTime: '23:00' }), chore({ durationMinutes: 90 })),
    ).toBe('2026-08-02 00:30');
  });

  it('formatWindow 常规：同一天只显示一次日期', () => {
    expect(formatWindow(inst({}), chore({ durationMinutes: 30 }))).toBe('2026-08-01 09:00–09:30');
  });

  it('formatWindow 跨天：补完整结束日期', () => {
    expect(formatWindow(inst({ startTime: '23:00' }), chore({ durationMinutes: 90 }))).toBe(
      '2026-08-01 23:00–2026-08-02 00:30',
    );
  });
});

describe('status 四态', () => {
  const now = at('2026-08-01', '10:00'); // 09:00-10:00 窗口已结束，进入 1h 宽限

  it('已完成恒为 completed', () => {
    expect(status(inst({ completed: true, dueDate: '2026-07-01' }), chore({}), now)).toBe('completed');
  });

  it('起始前 → upcoming', () => {
    expect(status(inst({ dueDate: '2026-08-02' }), chore({}), now)).toBe('upcoming');
  });

  it('窗口内 → inProgress', () => {
    expect(status(inst({}), chore({ durationMinutes: 120 }), at('2026-08-01', '10:00'))).toBe('inProgress');
  });

  it('结束 + 1h 宽限内 → inProgress', () => {
    // 09:00-10:00，宽限到 11:00；10:30 仍进行中
    expect(status(inst({}), chore({ durationMinutes: 60 }), at('2026-08-01', '10:30'))).toBe('inProgress');
  });

  it('超过结束 + 1h 宽限 → overdue', () => {
    expect(status(inst({}), chore({ durationMinutes: 60 }), at('2026-08-01', '11:01'))).toBe('overdue');
  });

  it('实例覆盖时间/时长参与状态判断', () => {
    // 实例改为 14:00-15:00，10:30 时仍未到时
    expect(
      status(
        inst({ startTime: '14:00', durationMinutes: 60 }),
        chore({ startTime: '09:00' }),
        at('2026-08-01', '10:30'),
      ),
    ).toBe('upcoming');
  });

  it('isOverdue 与 status 一致', () => {
    expect(isOverdue(inst({}), chore({ durationMinutes: 60 }), at('2026-08-01', '11:01'))).toBe(true);
    expect(isOverdue(inst({}), chore({ durationMinutes: 60 }), at('2026-08-01', '10:30'))).toBe(false);
    expect(isOverdue(inst({ completed: true }), chore({}), at('2026-08-02', '10:00'))).toBe(false);
  });
});
