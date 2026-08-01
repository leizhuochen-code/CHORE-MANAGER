/**
 * 数据模型定义 —— 全应用的数据契约。
 * 所有日期一律以 'YYYY-MM-DD' 字符串存储，避免时区/夏令时导致的日期偏移。
 */

/** 团队成员 */
export interface Member {
  id: string;
  name: string;
  role?: string;
  avatarColor: string; // 头像底色
  avatarEmoji?: string; // 头像 emoji
  createdAt: string; // ISO 时间
}

/** 重复频率（rrule 语义：0=周一 .. 6=周日，注意不是 JS 的 getDay()） */
export type Freq = 'daily' | 'weekly' | 'monthly' | 'custom';
export type BaseFreq = 'daily' | 'weekly' | 'monthly';

/** 重复规则 */
export interface RecurrenceRule {
  freq: Freq;
  /** 仅当 freq === 'custom' 时必须提供，用于区分自定义的基础单位 */
  baseFreq?: BaseFreq;
  interval: number; // 每 N 天/周/月，>= 1
  weekdays?: number[]; // 每周几，0=周一 .. 6=周日（weekly / 自定义周）
  dayOfMonth?: number; // 每月几号 1..31（monthly）
  lastDayOfMonth?: boolean; // 每月最后一天（如「每月最后一天整理文件」）
  endDate?: string; // 可选结束日期（含）
}

/** 杂务任务（模板） */
export interface Chore {
  id: string;
  title: string;
  description?: string;
  isRecurring: boolean;
  recurrence?: RecurrenceRule;
  assigneeIds: string[];
  startDate: string; // 开始日期
  startTime: string; // 起始时刻 'HH:mm'，实例缺省继承
  durationMinutes: number; // 持续时间（分钟），实例缺省继承
  createdAt: string; // ISO 时间
  /** 已物化实例覆盖到的最后日期（仅循环任务），自动扩展的依据 */
  generatedThrough?: string;
}

/** 任务实例（物化）—— 只存骨架，标题/负责人渲染时 join Chore */
export interface ChoreInstance {
  id: string;
  choreId: string;
  dueDate: string; // 发生日期 YYYY-MM-DD
  /** 单次改期的起始时刻覆盖 'HH:mm'；缺省继承 chore.startTime */
  startTime?: string;
  /** 单次改期的持续分钟覆盖；缺省继承 chore.durationMinutes */
  durationMinutes?: number;
  completed: boolean;
  completedBy?: string; // 成员 id
  completedAt?: string; // ISO 时间
}

/** 新增/编辑杂务的输入 */
export interface ChoreInput {
  title: string;
  description?: string;
  isRecurring: boolean;
  recurrence?: RecurrenceRule;
  assigneeIds: string[];
  startDate: string;
  startTime: string; // 'HH:mm'
  durationMinutes: number; // 分钟
}
