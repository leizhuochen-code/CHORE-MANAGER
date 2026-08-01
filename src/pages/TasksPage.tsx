import { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Space, Button, Select, DatePicker, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, UndoOutlined, PlusOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { describeRule } from '../lib/recurrence';
import { todayKey, addDaysKey } from '../lib/dates';
import { status as taskStatus, startKey, formatWindow } from '../lib/due';
import type { ChoreInstance, Chore } from '../types';
import AvatarChip from '../components/AvatarChip';
import ChoreDetailDrawer from '../components/ChoreDetailDrawer';
import ChoreModal from '../components/ChoreModal';
import StatusTag from '../components/StatusTag';

const { Text } = Typography;

interface Row {
  inst: ChoreInstance;
  chore: Chore;
}

type StatusFilter = 'all' | 'upcoming' | 'inProgress' | 'done' | 'overdue';

/** 任务列表页：全部实例表格 + 状态/负责人/日期筛选 + 标记完成 */
export default function TasksPage() {
  const chores = useStore((s) => s.chores);
  const instances = useStore((s) => s.instances);
  const members = useStore((s) => s.members);
  const toggleComplete = useStore((s) => s.toggleComplete);
  const ensureInstancesCovered = useStore((s) => s.ensureInstancesCovered);

  const [status, setStatus] = useState<StatusFilter>('all');
  const [assigneeId, setAssigneeId] = useState<string>('all');
  const [range, setRange] = useState<[string, string] | null>(null);
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Chore | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // 覆盖未来 180 天的实例
  useEffect(() => {
    ensureInstancesCovered(addDaysKey(todayKey(), 180));
  }, [ensureInstancesCovered]);

  const today = todayKey();
  const choreById = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores]);
  const memberById = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const rows = useMemo<Row[]>(() => {
    return instances
      .map((inst) => ({ inst, chore: choreById.get(inst.choreId) }))
      .filter((r): r is Row => !!r.chore)
      .filter((r) => {
        const st = taskStatus(r.inst, r.chore);
        if (status === 'done') return st === 'completed';
        if (status === 'upcoming') return st === 'upcoming';
        if (status === 'inProgress') return st === 'inProgress';
        if (status === 'overdue') return st === 'overdue';
        return true;
      })
      .filter((r) => {
        if (assigneeId === 'all') return true;
        return r.chore.assigneeIds.includes(assigneeId);
      })
      .filter((r) => {
        if (!range) return true;
        const [from, to] = range;
        return r.inst.dueDate >= from && r.inst.dueDate <= to;
      })
      .sort((a, b) => {
        if (a.inst.completed !== b.inst.completed) return a.inst.completed ? 1 : -1;
        return startKey(a.inst, a.chore).localeCompare(startKey(b.inst, b.chore));
      });
  }, [instances, choreById, status, assigneeId, range]);

  const columns: ColumnsType<Row> = [
    {
      title: '标题',
      dataIndex: ['chore', 'title'],
      render: (title: string, r) => (
        <Text delete={r.inst.completed} strong={r.inst.dueDate === today && !r.inst.completed}>
          {title}
        </Text>
      ),
    },
    {
      title: '负责人',
      render: (_, r) => (
        <Space size={4}>
          {r.chore.assigneeIds.map((id) => {
            const m = memberById.get(id);
            return m ? <AvatarChip key={id} member={m} size={22} /> : null;
          })}
        </Space>
      ),
    },
    {
      title: '时间',
      render: (_, r) => formatWindow(r.inst, r.chore),
      sorter: (a, b) => startKey(a.inst, a.chore).localeCompare(startKey(b.inst, b.chore)),
    },
    {
      title: '重复',
      render: (_, r) =>
        r.chore.isRecurring && r.chore.recurrence ? (
          <Tag color="blue">{describeRule(r.chore.recurrence)}</Tag>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    {
      title: '状态',
      render: (_, r) => <StatusTag status={taskStatus(r.inst, r.chore)} />,
    },
    {
      title: '操作',
      width: 120,
      render: (_, r) => (
        <Space>
          <Button
            size="small"
            type={r.inst.completed ? 'default' : 'primary'}
            icon={r.inst.completed ? <UndoOutlined /> : <CheckOutlined />}
            onClick={() => toggleComplete(r.inst.id, r.chore.assigneeIds[0])}
          >
            {r.inst.completed ? '撤销' : '完成'}
          </Button>
          <Button size="small" onClick={() => setSelectedInstanceId(r.inst.id)}>
            详情
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space wrap style={{ marginBottom: 16 }}>
        <Select
          value={status}
          onChange={setStatus}
          style={{ width: 120 }}
          options={[
            { value: 'all', label: '全部状态' },
            { value: 'upcoming', label: '未到时' },
            { value: 'inProgress', label: '进行中' },
            { value: 'done', label: '已完成' },
            { value: 'overdue', label: '已逾期' },
          ]}
        />
        <Select
          value={assigneeId}
          onChange={setAssigneeId}
          style={{ width: 140 }}
          options={[
            { value: 'all', label: '全部负责人' },
            ...members.map((m) => ({ value: m.id, label: m.name })),
          ]}
        />
        <DatePicker.RangePicker
          onChange={(dates) => {
            setRange(
              dates && dates[0] && dates[1]
                ? [dates[0].format('YYYY-MM-DD'), dates[1].format('YYYY-MM-DD')]
                : null,
            );
          }}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setEditOpen(true);
          }}
        >
          新建任务
        </Button>
      </Space>

      <Table<Row>
        rowKey={(r) => r.inst.id}
        columns={columns}
        dataSource={rows}
        size="medium"
        pagination={{ pageSize: 15, showSizeChanger: false }}
        onRow={(r) => ({
          onClick: () => setSelectedInstanceId(r.inst.id),
          style: { cursor: 'pointer' },
        })}
      />

      <ChoreDetailDrawer
        instanceId={selectedInstanceId}
        onClose={() => setSelectedInstanceId(null)}
        onEdit={(choreId) => {
          const chore = choreById.get(choreId);
          setEditing(chore ?? null);
          setEditOpen(true);
        }}
      />
      <ChoreModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        editing={editing}
      />
    </div>
  );
}
