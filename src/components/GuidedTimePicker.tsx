import { TimePicker } from 'antd';
import dayjs from 'dayjs';

interface GuidedTimePickerProps {
  value?: string; // 'HH:mm'
  onChange?: (time: string) => void;
}

/** 起始时间选择器（自由分钟，不吸附档位） */
export default function GuidedTimePicker({ value, onChange }: GuidedTimePickerProps) {
  return (
    <TimePicker
      format="HH:mm"
      value={value ? dayjs(value, 'HH:mm') : null}
      onChange={(d) => onChange?.(d ? d.format('HH:mm') : '')}
      style={{ width: 140 }}
    />
  );
}
