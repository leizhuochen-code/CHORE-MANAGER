import { useState, useEffect } from 'react';
import { Segmented, TimePicker, Select, Space } from 'antd';
import dayjs from 'dayjs';

interface GuidedTimePickerProps {
  value?: string; // 'HH:mm'
  onChange?: (time: string) => void;
}

const TIERS = [
  { label: '整点', step: 60 },
  { label: '半小时', step: 30 },
  { label: '10分钟', step: 10 },
  { label: '自定义', step: 1 },
] as const;

type MinuteStep = (typeof TIERS)[number]['step'];

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const v = String(h).padStart(2, '0');
  return { value: v, label: `${v}:00` };
});

/** 分档吸附时间选择器：整点/半小时/10分钟/自定义，选档后按该档吸附 */
export default function GuidedTimePicker({ value, onChange }: GuidedTimePickerProps) {
  const [step, setStep] = useState<MinuteStep>(30);

  // 值变化时若落在某档粒度上，自动切到该档
  useEffect(() => {
    if (!value) return;
    const minutes = Number(value.slice(3, 5));
    if (minutes === 0) setStep(60);
    else if (minutes % 30 === 0) setStep(30);
    else if (minutes % 10 === 0) setStep(10);
    else setStep(1);
  }, [value]);

  return (
    <Space.Compact block>
      <Segmented
        options={TIERS.map((t) => t.label)}
        value={TIERS.find((t) => t.step === step)?.label}
        onChange={(label) => setStep(TIERS.find((t) => t.label === label)?.step ?? 30)}
      />
      {step === 60 ? (
        <Select
          value={value ? value.slice(0, 2) : undefined}
          options={HOUR_OPTIONS}
          onChange={(h) => onChange?.(h ? `${h}:00` : '')}
          style={{ width: 140 }}
          placeholder="选择整点"
        />
      ) : (
        <TimePicker
          format="HH:mm"
          minuteStep={step}
          value={value ? dayjs(value, 'HH:mm') : null}
          onChange={(d) => onChange?.(d ? d.format('HH:mm') : '')}
          style={{ width: 140 }}
        />
      )}
    </Space.Compact>
  );
}
