import { Tag } from 'antd';
import type { TaskStatus } from '../lib/due';

const MAP: Record<TaskStatus, { color: string; label: string }> = {
  upcoming: { color: 'blue', label: '未到时' },
  inProgress: { color: 'processing', label: '进行中' },
  completed: { color: 'green', label: '已完成' },
  overdue: { color: 'red', label: '已逾期' },
};

/** 任务四态标签：未到时/进行中/已完成/已逾期 */
export default function StatusTag({ status }: { status: TaskStatus }) {
  const { color, label } = MAP[status];
  return <Tag color={color}>{label}</Tag>;
}
