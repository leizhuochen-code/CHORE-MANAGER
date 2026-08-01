import { useMemo, useState, useEffect } from 'react';
import Calendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/react/daygrid';
import timeGridPlugin from '@fullcalendar/react/timegrid';
import interactionPlugin from '@fullcalendar/react/interaction';
import classicTheme from '@fullcalendar/react/themes/classic';
import '@fullcalendar/react/skeleton.css';
import '@fullcalendar/react/themes/classic/theme.css';
import '@fullcalendar/react/themes/classic/palette.css';
import zhCn from '@fullcalendar/react/locales/zh-cn';
import type { DateClickInfo, DatesSetInfo, EventClickInfo } from '@fullcalendar/react';
import { useStore } from '../store/useStore';
import { normalizeDateKey, addMinutesToDateTime } from '../lib/dates';
import type { Chore } from '../types';
import ChoreModal from '../components/ChoreModal';
import ChoreDetailDrawer from '../components/ChoreDetailDrawer';

interface ModalState {
  open: boolean;
  editing?: Chore | null;
  defaultDate?: string;
}

/** 多负责人色带：每位负责人各占一等宽色带；单色/无负责人返回 null（保持纯色） */
function buildMultiGradient(colors: string[]): string | null {
  const unique = [...new Set(colors)];
  if (unique.length < 2) return null;
  const n = unique.length;
  const stops = unique
    .map((c, i) => `${c} ${(i / n) * 100}% ${((i + 1) / n) * 100}%`)
    .join(', ');
  return `linear-gradient(90deg, ${stops})`;
}

/** 日历页：日/周/月三视图 + 点击新建/查看详情 + 自动扩展实例 */
export default function CalendarPage() {
  const chores = useStore((s) => s.chores);
  const instances = useStore((s) => s.instances);
  const members = useStore((s) => s.members);
  const ensureInstancesCovered = useStore((s) => s.ensureInstancesCovered);

  const [modal, setModal] = useState<ModalState>({ open: false });
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);

  // 日历高度自适应视口
  const [height, setHeight] = useState(() => window.innerHeight - 150);
  useEffect(() => {
    const onResize = () => setHeight(window.innerHeight - 150);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // 实例 -> FullCalendar 事件（瘦 join：标题/颜色实时从 Chore/Member 读取）
  const events = useMemo(() => {
    const choreById = new Map(chores.map((c) => [c.id, c]));
    const memberById = new Map(members.map((m) => [m.id, m]));
    return instances.map((i) => {
      const chore = choreById.get(i.choreId);
      // 所有负责人的颜色（多负责人时事件渲染为等宽色带，见 buildMultiGradient）
      const assigneeColors = (chore?.assigneeIds ?? [])
        .map((id) => memberById.get(id)?.avatarColor)
        .filter((c): c is string => !!c);
      // 时段块：起始 = 日期+起始时刻，结束 = 起始 + 持续分钟（可跨天）
      const startTime = i.startTime ?? chore?.startTime ?? '09:00';
      const duration = i.durationMinutes ?? chore?.durationMinutes ?? 60;
      const start = `${i.dueDate}T${startTime}:00`;
      const endKey = addMinutesToDateTime(i.dueDate, startTime, duration);
      const end = `${endKey.slice(0, 10)}T${endKey.slice(11)}:00`;
      return {
        id: i.id,
        title: chore?.title ?? '未知任务',
        start,
        end,
        allDay: false,
        backgroundColor: assigneeColors[0],
        borderColor: assigneeColors[0],
        classNames: i.completed ? ['fc-event-completed'] : [],
        extendedProps: { assigneeColors },
      };
    });
  }, [instances, chores, members]);

  // 多负责人事件挂载时叠加色带背景；单负责人/无负责人由 backgroundColor 纯色呈现
  const handleEventDidMount = ({ el, event }: { el: HTMLElement; event: { extendedProps: { assigneeColors?: string[] } } }) => {
    const gradient = buildMultiGradient(event.extendedProps.assigneeColors ?? []);
    if (gradient) el.style.backgroundImage = gradient;
  };

  const handleDatesSet = (info: DatesSetInfo) => {
    // 翻到已生成范围之外时自动补生成实例
    ensureInstancesCovered(normalizeDateKey(info.view.currentEnd));
  };

  const handleDateClick = (info: DateClickInfo) => {
    setModal({ open: true, editing: null, defaultDate: normalizeDateKey(info.date) });
  };

  const handleEventClick = (info: EventClickInfo) => {
    setSelectedInstanceId(info.event.id);
  };

  return (
    <div style={{ height }}>
      <Calendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, classicTheme]}
        initialView="dayGridMonth"
        locale="zh-cn"
        locales={[zhCn]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'timeGridDay,timeGridWeek,dayGridMonth',
        }}
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        eventDidMount={handleEventDidMount}
        datesSet={handleDatesSet}
        dayMaxEvents={3}
        slotDuration="00:10:00"
        height="100%"
      />

      <ChoreModal
        open={modal.open}
        onClose={() => setModal({ open: false })}
        editing={modal.editing}
        defaultDate={modal.defaultDate}
      />

      <ChoreDetailDrawer
        instanceId={selectedInstanceId}
        onClose={() => setSelectedInstanceId(null)}
        onEdit={(choreId) => {
          const chore = chores.find((c) => c.id === choreId);
          setModal({ open: true, editing: chore ?? null, defaultDate: undefined });
        }}
      />
    </div>
  );
}
