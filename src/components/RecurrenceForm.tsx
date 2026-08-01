import { Radio, InputNumber, Checkbox, Select, Space, Typography } from 'antd';
import type { Freq, BaseFreq, RecurrenceRule } from '../types';
import { describeRule } from '../lib/recurrence';
import { weekdayFromKey } from '../lib/dates';
import { WEEKDAY_LABELS } from '../constants';

const { Text } = Typography;

const FREQ_OPTIONS = [
  { label: '不重复', value: 'none' },
  { label: '每天', value: 'daily' },
  { label: '每周', value: 'weekly' },
  { label: '每月', value: 'monthly' },
  { label: '自定义', value: 'custom' },
];

const WEEKDAY_OPTIONS = WEEKDAY_LABELS.map((label, i) => ({ label, value: i }));

interface RecurrenceFormProps {
  /** null 表示不重复 */
  value: RecurrenceRule | null;
  onChange: (r: RecurrenceRule | null) => void;
  /** 用于未指定周几/几号时取「开始日期」做默认值 */
  startDate?: string;
}

/** 从当前规则切换到新频率，尽量保留已设置的间隔/星期/几号 */
function switchFreq(
  freq: Freq,
  current: RecurrenceRule | null,
  startDate: string | undefined,
): RecurrenceRule {
  const base: BaseFreq =
    freq === 'custom'
      ? (current?.baseFreq ?? (current?.freq === 'daily' || current?.freq === 'weekly' || current?.freq === 'monthly' ? current.freq : 'weekly'))
      : freq;
  const wd = weekdayFromKey(startDate ?? '2026-01-05');
  const dom = startDate ? Number(startDate.slice(8, 10)) : 1;

  const rule: RecurrenceRule = {
    freq,
    interval: current?.interval ?? 1,
  };
  if (freq === 'custom') rule.baseFreq = base;

  if (base === 'weekly') rule.weekdays = current?.weekdays ?? [wd];
  else if (base === 'monthly') {
    rule.lastDayOfMonth = current?.lastDayOfMonth ?? false;
    rule.dayOfMonth = current?.dayOfMonth ?? dom;
  }
  return rule;
}

/** 重复规则表单（受控） */
export default function RecurrenceForm({
  value,
  onChange,
  startDate,
}: RecurrenceFormProps) {
  const freq: Freq | 'none' = value?.freq ?? 'none';
  const base = value?.baseFreq ?? (freq === 'custom' ? 'daily' : freq);

  const setRule = (patch: Partial<RecurrenceRule>) => {
    if (!value) return;
    onChange({ ...value, ...patch });
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size={8}>
      <Radio.Group
        options={FREQ_OPTIONS}
        value={freq}
        onChange={(e) => {
          const f = e.target.value as Freq | 'none';
          onChange(f === 'none' ? null : switchFreq(f, value, startDate));
        }}
      />

      {freq !== 'none' && (
        <Space wrap size={12}>
          <Space>
            <Text type="secondary">每</Text>
            <InputNumber
              min={1}
              max={99}
              value={value?.interval ?? 1}
              onChange={(n) => setRule({ interval: n ?? 1 })}
              style={{ width: 64 }}
            />
            <Text type="secondary">
              {base === 'daily' ? '天' : base === 'weekly' ? '周' : '个月'}
            </Text>
          </Space>

          {freq === 'custom' && (
            <Select<BaseFreq>
              value={base as BaseFreq}
              onChange={(b) => setRule({ baseFreq: b })}
              style={{ width: 96 }}
              options={[
                { label: '按天', value: 'daily' },
                { label: '按周', value: 'weekly' },
                { label: '按月', value: 'monthly' },
              ]}
            />
          )}

          {base === 'weekly' && (
            <Checkbox.Group
              options={WEEKDAY_OPTIONS}
              value={value?.weekdays ?? []}
              onChange={(vals) => setRule({ weekdays: vals as number[] })}
            />
          )}

          {base === 'monthly' && (
            <Space>
              <Checkbox
                checked={value?.lastDayOfMonth}
                onChange={(e) => setRule({ lastDayOfMonth: e.target.checked })}
              >
                每月最后一天
              </Checkbox>
              {!value?.lastDayOfMonth && (
                <Space>
                  <Text type="secondary">每月</Text>
                  <InputNumber
                    min={1}
                    max={31}
                    value={value?.dayOfMonth ?? 1}
                    onChange={(n) => setRule({ dayOfMonth: n ?? 1 })}
                    style={{ width: 64 }}
                  />
                  <Text type="secondary">日</Text>
                </Space>
              )}
            </Space>
          )}
        </Space>
      )}

      {freq !== 'none' && value && (
        <div>
          <Text type="secondary">重复：</Text>
          <Text strong>{describeRule(value)}</Text>
        </div>
      )}
    </Space>
  );
}
