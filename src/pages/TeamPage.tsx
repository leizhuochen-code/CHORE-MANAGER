import { useMemo, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Avatar,
  Typography,
  Button,
  Space,
  Popconfirm,
  Drawer,
  List,
  Tag,
  message,
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined } from '@ant-design/icons';
import { useStore } from '../store/useStore';
import { describeRule } from '../lib/recurrence';
import { todayKey } from '../lib/dates';
import type { Member, Chore, ChoreInstance } from '../types';
import MemberModal from '../components/MemberModal';

const { Text, Title } = Typography;

/** 团队页：成员卡片增删改 + 点成员查看其全部任务 */
export default function TeamPage() {
  const members = useStore((s) => s.members);
  const chores = useStore((s) => s.chores);
  const instances = useStore((s) => s.instances);
  const removeMember = useStore((s) => s.removeMember);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [viewing, setViewing] = useState<Member | null>(null);

  const today = todayKey();
  const choreById = useMemo(() => new Map(chores.map((c) => [c.id, c])), [chores]);

  // 某成员承担的任务（实例 join 杂务）
  const memberTasks = useMemo(() => {
    if (!viewing) return [];
    return instances
      .map((i) => ({ inst: i, chore: choreById.get(i.choreId) }))
      .filter(
        (r): r is { inst: ChoreInstance; chore: Chore } =>
          !!r.chore && r.chore.assigneeIds.includes(viewing.id),
      )
      .sort((a, b) => {
        if (a.inst.completed !== b.inst.completed) return a.inst.completed ? 1 : -1;
        return a.inst.dueDate.localeCompare(b.inst.dueDate);
      });
  }, [viewing, instances, choreById]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0 }}>
          团队成员（{members.length}）
        </Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
        >
          添加成员
        </Button>
      </div>

      {members.length === 0 ? (
        <Text type="secondary">还没有成员，点击「添加成员」开始吧。</Text>
      ) : (
        <Row gutter={[16, 16]}>
          {members.map((m) => (
            <Col key={m.id} xs={24} sm={12} md={8} lg={6}>
              <Card hoverable onClick={() => setViewing(m)}>
                <Space direction="vertical" align="center" style={{ width: '100%' }}>
                  <Avatar size={56} style={{ backgroundColor: m.avatarColor }}>
                    {m.avatarEmoji || m.name.slice(0, 1)}
                  </Avatar>
                  <Space direction="vertical" align="center" size={0}>
                    <Text strong>{m.name}</Text>
                    {m.role && <Text type="secondary">{m.role}</Text>}
                  </Space>
                  <Space
                    onClick={(e) => e.stopPropagation()}
                    style={{ marginTop: 8 }}
                  >
                    <Button
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditing(m);
                        setModalOpen(true);
                      }}
                    />
                    <Popconfirm
                      title="删除该成员？"
                      description="其承担的任务将被取消分配。"
                      okText="删除"
                      okButtonProps={{ danger: true }}
                      onConfirm={() => {
                        removeMember(m.id);
                        message.success('已删除成员');
                      }}
                    >
                      <Button size="small" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <MemberModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editing={editing}
      />

      <Drawer
        title={
          <Space>
            <Avatar size={28} style={{ backgroundColor: viewing?.avatarColor }}>
              {viewing?.avatarEmoji || viewing?.name?.slice(0, 1) || <UserOutlined />}
            </Avatar>
            {viewing?.name} 的任务
          </Space>
        }
        open={!!viewing}
        onClose={() => setViewing(null)}
        width={460}
        destroyOnHidden
      >
        <List
          dataSource={memberTasks}
          renderItem={({ inst, chore }) => (
            <List.Item>
              <List.Item.Meta
                title={
                  <Space>
                    <Text delete={inst.completed}>{chore.title}</Text>
                    {inst.completed ? (
                      <Tag color="green">已完成</Tag>
                    ) : inst.dueDate < today ? (
                      <Tag color="red">已逾期</Tag>
                    ) : (
                      <Tag color="blue">待办</Tag>
                    )}
                  </Space>
                }
                description={
                  <Space wrap>
                    <Text type="secondary">{inst.dueDate}</Text>
                    {chore.isRecurring && chore.recurrence && (
                      <Tag color="blue">{describeRule(chore.recurrence)}</Tag>
                    )}
                  </Space>
                }
              />
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
