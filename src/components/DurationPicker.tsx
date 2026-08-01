import { useState, useEffect } from 'react';
import { Segmented, InputNumber, Space, Typography } from 'antd';

const { Text } = Typography;

interface DurationPickerProps {
  value?: number; // 分钟
  onChange?: (minutes: number) => void;
}

const PRESETS = [
  { label: '30分钟', minutes: 30 },
  { label: '1小时', minutes: 60 },
  { label: '1.5小时', minutes: 90 },
  { label: '2小时', minutes: 120 },
];

/** 持续时间选择器：常用档位 + 自定义（分钟） */
export default function DurationPicker({ value, onChange }: DurationPickerProps) {
  const v = value ?? 60;
  const preset = PRESETS.find((p) => p.minutes === v);
  const [custom, setCustom] = useState(!preset);

  useEffect(() => {
    setCustom(!PRESETS.some((p) => p.minutes === v));
  }, [v]);

  const pick = (minutes: number) => {
    setCustom(!PRESETS.some((p) => p.minutes === minutes));
    onChange?.(minutes);
  };

  return (
    <Space wrap>
      <Segmented
        options={PRESETS.map((p) => p.label)}
        value={preset?.label}
        onChange={(label) => pick(PRESETS.find((p) => p.label === label)?.minutes ?? 60)}
      />
      {custom && (
        <Space>
          <Text type="secondary">自定义</Text>
          <InputNumber
            min={5}
            max={1440}
            step={5}
            value={v}
            onChange={(n) => n && onChange?.(n)}
            addonAfter="分钟"
            style={{ width: 120 }}
          />
        </Space>
      )}
    </Space>
  );
}
