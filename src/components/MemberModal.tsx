import { useEffect } from 'react';
import { Modal, Form, Input, Select, message, Space, Avatar } from 'antd';
import type { Member } from '../types';
import { useStore } from '../store/useStore';
import { AVATAR_COLORS, AVATAR_EMOJIS } from '../constants';

interface MemberModalProps {
  open: boolean;
  onClose: () => void;
  /** 传入 Member 为编辑，null 为新增 */
  editing?: Member | null;
}

interface FormValues {
  name: string;
  role?: string;
  avatarColor: string;
  avatarEmoji?: string;
}

/** 成员新增/编辑弹窗 */
export default function MemberModal({ open, onClose, editing }: MemberModalProps) {
  const [form] = Form.useForm<FormValues>();
  const addMember = useStore((s) => s.addMember);
  const updateMember = useStore((s) => s.updateMember);
  const members = useStore((s) => s.members);

  // 新建时自动分配一个未被现有成员使用的颜色，保证不同成员颜色不同
  const defaultColor =
    AVATAR_COLORS.find((c) => !members.some((m) => m.avatarColor === c)) ?? AVATAR_COLORS[0];

  useEffect(() => {
    if (open) form.resetFields();
  }, [open, editing, form]);

  // 预览头像用（Hooks 必须在组件顶层调用）
  const watchedName = Form.useWatch('name', form);
  const watchedColor = Form.useWatch('avatarColor', form);
  const watchedEmoji = Form.useWatch('avatarEmoji', form);

  const initialValues: Partial<FormValues> = {
    name: editing?.name ?? '',
    role: editing?.role ?? '',
    avatarColor: editing?.avatarColor ?? defaultColor,
    avatarEmoji: editing?.avatarEmoji ?? AVATAR_EMOJIS[0],
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name.trim(),
      role: values.role?.trim() || undefined,
      avatarColor: values.avatarColor,
      avatarEmoji: values.avatarEmoji,
    };
    if (editing) {
      updateMember(editing.id, payload);
      message.success('已保存修改');
    } else {
      addMember(payload);
      message.success('已添加成员');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? '编辑成员' : '添加成员'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      width={440}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item
          name="name"
          label="姓名"
          rules={[{ required: true, message: '请输入姓名' }]}
        >
          <Input maxLength={20} />
        </Form.Item>

        <Form.Item name="role" label="角色">
          <Input placeholder="例如：行政、财务" maxLength={20} />
        </Form.Item>

        <Form.Item name="avatarColor" label="头像颜色">
          <Select
            options={AVATAR_COLORS.map((c) => ({
              value: c,
              label: (
                <Avatar size={20} style={{ backgroundColor: c }} />
              ),
            }))}
          />
        </Form.Item>

        <Form.Item name="avatarEmoji" label="头像图标">
          <Select
            options={AVATAR_EMOJIS.map((e) => ({ value: e, label: e }))}
          />
        </Form.Item>

        <Form.Item label="预览">
          <Space>
            <Avatar size={40} style={{ backgroundColor: watchedColor }}>
              {watchedEmoji || watchedName?.slice(0, 1)}
            </Avatar>
            <span>{watchedName || '姓名'}</span>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
}
