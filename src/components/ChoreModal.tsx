import { useEffect, useState } from 'react';
import { Modal, Form, Input, DatePicker, Typography, message } from 'antd';
import dayjs from 'dayjs';
import type { Chore, ChoreInput, RecurrenceRule } from '../types';
import { useStore } from '../store/useStore';
import { todayKey } from '../lib/dates';
import RecurrenceForm from './RecurrenceForm';
import MemberPicker from './MemberPicker';

const { Text } = Typography;

interface ChoreModalProps {
  open: boolean;
  onClose: () => void;
  /** 传入 Chore 为编辑，null 为新增 */
  editing?: Chore | null;
  /** 新增时预填的开始日期（日历点选） */
  defaultDate?: string;
}

interface FormValues {
  title: string;
  description?: string;
  startDate: dayjs.Dayjs;
  endDate?: dayjs.Dayjs;
  assigneeIds: string[];
}

/** 杂务新增/编辑弹窗 */
export default function ChoreModal({ open, onClose, editing, defaultDate }: ChoreModalProps) {
  const [form] = Form.useForm<FormValues>();
  const members = useStore((s) => s.members);
  const addChore = useStore((s) => s.addChore);
  const updateChore = useStore((s) => s.updateChore);

  // 重复规则独立于 antd Form 管理（复合受控组件）
  const [recurrence, setRecurrence] = useState<RecurrenceRule | null>(null);

  // 每次打开时重置
  useEffect(() => {
    if (open) {
      setRecurrence(editing?.isRecurring ? (editing.recurrence ?? null) : null);
      form.resetFields();
    }
  }, [open, editing, form]);

  const today = todayKey();
  const isRecurring = recurrence != null;

  const initialValues: Partial<FormValues> = {
    title: editing?.title ?? '',
    description: editing?.description ?? '',
    startDate: dayjs(editing?.startDate ?? defaultDate ?? today),
    endDate: editing?.recurrence?.endDate ? dayjs(editing.recurrence.endDate) : undefined,
    assigneeIds: editing?.assigneeIds ?? [],
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    if (!values.startDate) return;

    const startDate = values.startDate.format('YYYY-MM-DD');
    // 校验结束日期 >= 开始日期
    if (isRecurring && values.endDate) {
      const end = values.endDate.format('YYYY-MM-DD');
      if (end < startDate) {
        message.error('结束日期不能早于开始日期');
        return;
      }
      recurrence!.endDate = end;
    } else if (isRecurring && recurrence) {
      recurrence.endDate = undefined;
    }

    const input: ChoreInput = {
      title: values.title,
      description: values.description || undefined,
      startDate,
      isRecurring,
      recurrence: isRecurring ? { ...recurrence! } : undefined,
      assigneeIds: values.assigneeIds ?? [],
    };

    if (editing) {
      updateChore(editing.id, input);
      message.success('已保存修改');
    } else {
      addChore(input);
      message.success('已创建任务');
    }
    onClose();
  };

  return (
    <Modal
      title={editing ? '编辑杂务' : '新建杂务'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      okText="保存"
      cancelText="取消"
      destroyOnHidden
      width={560}
    >
      <Form form={form} layout="vertical" initialValues={initialValues}>
        <Form.Item
          name="title"
          label="标题"
          rules={[{ required: true, message: '请输入标题' }]}
        >
          <Input placeholder="例如：倒垃圾" maxLength={50} />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="补充说明（可选）" rows={2} maxLength={200} />
        </Form.Item>

        <Form.Item label="重复" style={{ marginBottom: 8 }}>
          <RecurrenceForm value={recurrence} onChange={setRecurrence} startDate={defaultDate} />
        </Form.Item>

        <Form.Item
          name="startDate"
          label={isRecurring ? '开始日期（循环基准日）' : '截止日期'}
          rules={[{ required: true, message: '请选择日期' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        {isRecurring && (
          <Form.Item name="endDate" label="结束日期（可选）">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
        )}

        <Form.Item name="assigneeIds" label="负责人">
          <MemberPicker members={members} />
        </Form.Item>

        {!members.length && (
          <Text type="warning">当前没有成员，请先到「团队」页添加成员。</Text>
        )}
      </Form>
    </Modal>
  );
}
