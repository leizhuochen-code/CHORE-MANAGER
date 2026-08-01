/** 全局常量 */

export const APP_TITLE = '办公室杂务管理';

/** 新建循环杂务时物化未来实例的默认范围（天） */
export const MATERIALIZE_HORIZON_DAYS = 730;

/** 自动扩展的硬上限（天），防止无限生成 */
export const AUTO_EXTEND_CAP_DAYS = 3650;

/** 星期标签，索引 = rrule 约定 0=周一 .. 6=周日 */
export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'] as const;

/** 预设头像底色 */
export const AVATAR_COLORS = [
  '#1677ff',
  '#52c41a',
  '#fa8c16',
  '#eb2f96',
  '#722ed1',
  '#13c2c2',
  '#fa541c',
  '#2f54eb',
] as const;

/** 预设头像 emoji */
export const AVATAR_EMOJIS = ['🧑‍💼', '👩‍💼', '🙋', '🧑‍🔧', '🕵️', '🧙', '👨‍🔬', '👩‍🏫'] as const;
