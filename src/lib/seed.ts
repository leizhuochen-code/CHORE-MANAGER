/**
 * 示例数据 —— 首次打开应用时灌入，走真实的 store action 生成实例。
 * 刻意保持极简：1 个成员 + 1 个单次任务示例，其余由用户自行配置。
 */
import type { Member, ChoreInput } from '../types';
import { todayKey } from './dates';

/** 示例成员（id/createdAt 由 store 生成） */
export const seedMembers: Array<Omit<Member, 'id' | 'createdAt'>> = [
  { name: '张三', role: '行政', avatarColor: '#1677ff', avatarEmoji: '🧑‍💼' },
];

/** 根据已创建的成员构建示例杂务（引用成员 id） */
export function buildSeedChores(members: Member[]): ChoreInput[] {
  const byName = Object.fromEntries(members.map((m) => [m.name, m.id]));
  const today = todayKey();

  return [
    {
      title: '整理会议纪要',
      description: '单次任务示例',
      isRecurring: false,
      assigneeIds: [byName['张三']],
      startDate: today,
      startTime: '09:30',
      durationMinutes: 30,
    },
  ];
}
