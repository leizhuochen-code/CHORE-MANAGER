import { Select, Tag, Avatar } from 'antd';
import type { Member } from '../types';

interface MemberPickerProps {
  members: Member[];
  /** 由 Form.Item 注入；直接使用时可传 */
  value?: string[];
  onChange?: (ids: string[]) => void;
  disabled?: boolean;
}

/** 负责人多选：下拉与已选标签都显示头像 + 姓名 */
export default function MemberPicker({
  members,
  value = [],
  onChange = () => undefined,
  disabled,
}: MemberPickerProps) {
  const options = members.map((m) => ({
    value: m.id,
    label: m.name,
    color: m.avatarColor,
    emoji: m.avatarEmoji || m.name.slice(0, 1),
  }));

  return (
    <Select
      mode="multiple"
      allowClear
      placeholder="选择负责人"
      value={value}
      onChange={onChange}
      disabled={disabled}
      options={options}
      optionRender={(opt) => (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Avatar size={20} style={{ backgroundColor: opt.data.color }}>
            {opt.data.emoji}
          </Avatar>
          {opt.data.label}
        </span>
      )}
      tagRender={(props) => {
        // 选项来自同一 members，data 一定存在；找不到时退化为姓名标签
        const data = options.find((o) => o.value === props.value) ?? {
          value: props.value,
          label: props.value,
          color: '#999',
          emoji: '?',
        };
        return (
          <Tag
            closable={props.closable}
            onClose={props.onClose}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              marginInlineEnd: 8,
            }}
          >
            <Avatar size={16} style={{ backgroundColor: data.color }}>
              {data.emoji}
            </Avatar>
            {data.label}
          </Tag>
        );
      }}
    />
  );
}
