import { useMemo } from 'react';
import {
  Drawer,
  Descriptions,
  Tag,
  Space,
  Button,
  Checkbox,
  Select,
  DatePicker,
  Popconfirm,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';
import { useStore } from '../store/useStore';
import { describeRule } from '../lib/recurrence';
import { todayKey } from '../lib/dates';
import AvatarChip from './AvatarChip';

const { Text } = Typography;

interface ChoreDetailDrawerProps {
  /** 当前选中的实例 id；null 关闭 */
  instanceId: string | null;
  onClose: () => void;
  /** 打开编辑弹窗（传杂务 id） */
  onEdit: (choreId: string) => void;
}

/** 杂务详情抽屉：完成/改期/删除该次/编辑/删除任务 */
export default function ChoreDetailDrawer({
  instanceId,
  onClose,
  onEdit,
}: ChoreDetailDrawerProps) {
  const members = useStore((s) => s.members);
  const chores = useStore((s) => s.chores);
  const instances = useStore((s) => s.instances);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const setCompleter = useStore((s) => s.setCompleter);
  const updateInstanceDate = useStore((s) => s.updateInstanceDate);
  const deleteInstance = useStore((s) => s.deleteInstance);
  const deleteChore = useStore((s) => s.deleteChore);

  const inst = useMemo(
    () => instances.find((i) => i.id === instanceId) ?? null,
    [instances, instanceId],
  );
  const chore = inst ? chores.find((c) => c.id === inst.choreId) ?? null : null;
  const assignees = chore ? members.filter((m) => chore.assigneeIds.includes(m.id)) : [];

  const today = todayKey();
  const isOverdue = inst && !inst.completed && inst.dueDate < today;

  if (!inst || !chore) return null;

  const handleComplete = (checked: boolean, who?: string) => {
    toggleComplete(inst.id, checked ? who : undefined);
    if (checked) message.success('已标记完成');
  };

  return (
    <Drawer
      title={chore.title}
      open={!!instanceId}
      onClose={onClose}
      width={420}
      destroyOnHidden
    >
      <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
        <Descriptions.Item label="描述">
          {chore.description || <Text type="secondary">无</Text>}
        </Descriptions.Item>
        {chore.isRecurring && chore.recurrence && (
          <Descriptions.Item label="重复">
            <Tag color="blue">{describeRule(chore.recurrence)}</Tag>
          </Descriptions.Item>
        )}
        <Descriptions.Item label="截止日期">
          {inst.dueDate}
          {isOverdue && <Tag color="red" style={{ marginInlineStart: 8 }}>已逾期</Tag>}
          {inst.completed && <Tag color="green" style={{ marginInlineStart: 8 }}>已完成</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="负责人">
          <Space wrap size={4}>
            {assignees.length
              ? assignees.map((m) => (
                  <span key={m.id}>
                    <AvatarChip member={m} /> {m.name}
                  </span>
                ))
              : '未分配'}
          </Space>
        </Descriptions.Item>
      </Descriptions>

      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {/* 完成状态 */}
        <Space>
          <Checkbox
            checked={inst.completed}
            onChange={(e) => handleComplete(e.target.checked, assignees[0]?.id)}
          >
            已完成
          </Checkbox>
          {inst.completed && (
            <>
              <Text type="secondary">完成人</Text>
              <Select
                value={inst.completedBy ?? assignees[0]?.id}
                onChange={(id) => setCompleter(inst.id, id)}
                style={{ width: 140 }}
                options={members.map((m) => ({ value: m.id, label: m.name }))}
                placeholder="选择完成人"
              />
            </>
          )}
        </Space>

        {/* 单次改期（仅未完成） */}
        {!inst.completed && (
          <Space>
            <Text type="secondary">改期</Text>
            <DatePicker
              value={dayjs(inst.dueDate)}
              onChange={(d) => {
                if (d) {
                  updateInstanceDate(inst.id, d.format('YYYY-MM-DD'));
                  message.success('已改期');
                }
              }}
            />
          </Space>
        )}

        <Space wrap>
          {!inst.completed && (
            <Popconfirm
              title="删除这一次？"
              description={
                chore.isRecurring
                  ? '仅删除该次安排，其他实例不受影响。'
                  : '非重复任务可整体删除（见「删除任务」）。'
              }
              onConfirm={() => {
                if (!chore.isRecurring) {
                  message.warning('非重复任务请直接删除整个任务');
                  return;
                }
                deleteInstance(inst.id);
                message.success('已删除该次安排');
                onClose();
              }}
            >
              <Button size="small">删除该次</Button>
            </Popconfirm>
          )}
          <Button size="small" type="primary" onClick={() => onEdit(chore.id)}>
            编辑任务
          </Button>
          <Popconfirm
            title="删除整个任务？"
            description="该任务的全部实例（含已完成）将被删除，不可恢复。"
            okText="删除"
            okButtonProps={{ danger: true }}
            onConfirm={() => {
              deleteChore(chore.id);
              message.success('已删除任务');
              onClose();
            }}
          >
            <Button size="small" danger>
              删除任务
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    </Drawer>
  );
}
