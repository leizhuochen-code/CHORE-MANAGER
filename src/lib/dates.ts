/**
 * 日期工具 —— 时区防火墙。
 * 所有日期以 'YYYY-MM-DD' 字符串存储；与 Date 互转一律走「本地正午」，
 * 绝不用 toISOString()（避免中国 UTC+8 / 夏令时导致日期偏移 ±1）。
 */

/** Date -> 'YYYY-MM-DD'（本地时区） */
export const toDateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Date -> 本地 'HH:mm' */
export const toTimeKey = (d: Date): string =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Date -> 本地 'YYYY-MM-DD HH:mm'（字典序即时间序） */
export const toDateTimeKey = (d: Date): string => `${toDateKey(d)} ${toTimeKey(d)}`;

/** 当前本地 'YYYY-MM-DD HH:mm' */
export const nowDateTimeKey = (): string => toDateTimeKey(new Date());

/** 'YYYY-MM-DD' -> 本地正午 Date（供日历等本地场景使用） */
export const dateToLocalNoon = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

/**
 * 'YYYY-MM-DD' -> UTC 正午 Date（rrule 专用，夏令时免疫）。
 * rrule 内部用 UTC 时间算术，若 dtstart/boundary 用本地正午，跨夏令时
 * 会出现 1 小时漂移导致边界日期被排除（见 recurrence 测试的 3 月 31 日用例）。
 */
export const dateToUtcNoon = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12));
};

/** UTC Date -> 'YYYY-MM-DD'（读取 rrule 发生结果专用） */
export const fromUtcNoon = (d: Date): string => d.toISOString().slice(0, 10);

/** 今天（本地） */
export const todayKey = (): string => toDateKey(new Date());

/** 日期加减 N 天 */
export const addDaysKey = (key: string, days: number): string => {
  const d = dateToLocalNoon(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
};

/** 取较小/较大的日期（YYYY-MM-DD 可直接字典序比较） */
export const minKey = (a: string, b: string): string => (a <= b ? a : b);
export const maxKey = (a: string, b: string): string => (a >= b ? a : b);

/** 某日期所在月份的最后一天 */
export const lastDayKeyOfMonth = (key: string): string => {
  const d = dateToLocalNoon(key);
  d.setMonth(d.getMonth() + 1, 0); // 下个月第 0 天 = 本月最后一天
  return toDateKey(d);
};

/** 星期索引，0=周一 .. 6=周日（rrule 约定，非 JS getDay） */
export const weekdayFromKey = (key: string): number => {
  const d = dateToLocalNoon(key);
  return (d.getDay() + 6) % 7; // 把周日=0 的 JS 约定转成周一=0
};

/**
 * FullCalendar v7 回调里可能返回 Date / Temporal.PlainDate / 字符串 / 数组，
 * 统一归一化为 'YYYY-MM-DD'。
 */
export const normalizeDateKey = (x: unknown): string => {
  if (x instanceof Date) return toDateKey(x);
  // Temporal.PlainDate 与字符串的 toString() 都以 'YYYY-MM-DD' 开头
  const s = String(x);
  return s.slice(0, 10);
};

/** 生成唯一 ID，回退方案保证非安全上下文（如 file://）也可用 */
export const uuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
