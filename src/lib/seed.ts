/**
 * 示例数据 —— 首次打开应用时灌入，走真实的 store action 生成实例。
 */
import type { Member, ChoreInput } from '../types';
import { todayKey, lastDayKeyOfMonth } from './dates';

/** 示例成员（id/createdAt 由 store 生成） */
export const seedMembers: Array<Omit<Member, 'id' | 'createdAt'>> = [
  { name: '张三', role: '行政', avatarColor: '#1677ff', avatarEmoji: '🧑‍💼' },
  { name: '李四', role: '财务', avatarColor: '#52c41a', avatarEmoji: '👩‍💼' },
  { name: '王五', role: '前台', avatarColor: '#fa8c16', avatarEmoji: '🙋' },
  { name: '赵六', role: '技术', avatarColor: '#722ed1', avatarEmoji: '🧑‍🔧' },
];

/** 根据已创建的成员构建示例杂务（引用成员 id） */
export function buildSeedChores(members: Member[]): ChoreInput[] {
  const byName = Object.fromEntries(members.map((m) => [m.name, m.id]));
  const today = todayKey();
  const lastDay = lastDayKeyOfMonth(today);

  return [
    {
      title: '倒垃圾',
      description: '每周一清倒办公室垃圾桶',
      isRecurring: true,
      recurrence: { freq: 'weekly', interval: 1, weekdays: [0] },
      assigneeIds: [byName['张三']],
      startDate: today,
    },
    {
      title: '整理文件',
      description: '每月最后一天整理归档文件',
      isRecurring: true,
      recurrence: { freq: 'monthly', interval: 1, lastDayOfMonth: true },
      assigneeIds: [byName['李四']],
      startDate: today,
    },
    {
      title: '采购办公用品',
      description: '每月 15 日清点并补充办公用品',
      isRecurring: true,
      recurrence: { freq: 'custom', baseFreq: 'monthly', interval: 1, dayOfMonth: 15 },
      assigneeIds: [byName['王五'], byName['赵六']],
      startDate: today,
    },
    {
      title: '月底报销',
      description: '本月费用报销单据提交',
      isRecurring: false,
      assigneeIds: [byName['李四']],
      startDate: lastDay,
    },
    {
      title: '检查会议室',
      description: '每天检查会议室设备与整洁',
      isRecurring: true,
      recurrence: { freq: 'daily', interval: 1 },
      assigneeIds: [byName['王五']],
      startDate: today,
    },
  ];
}
