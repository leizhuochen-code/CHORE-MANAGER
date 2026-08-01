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
import { normalizeDateKey } from '../lib/dates';
import type { Chore } from '../types';
import ChoreModal from '../components/ChoreModal';
import ChoreDetailDrawer from '../components/ChoreDetailDrawer';

interface ModalState {
  open: boolean;
  editing?: Chore | null;
  defaultDate?: string;
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
      const firstAssignee = chore ? memberById.get(chore.assigneeIds[0] ?? '') : undefined;
      const t = i.dueTime ?? chore?.dueTime;
      return {
        id: i.id,
        title: chore?.title ?? '未知任务',
        start: t ? `${i.dueDate}T${t}:00` : i.dueDate,
        allDay: !t,
        backgroundColor: i.completed ? undefined : firstAssignee?.avatarColor,
        borderColor: i.completed ? undefined : firstAssignee?.avatarColor,
        classNames: i.completed ? ['fc-event-completed'] : [],
      };
    });
  }, [instances, chores, members]);

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
        datesSet={handleDatesSet}
        dayMaxEvents={3}
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
