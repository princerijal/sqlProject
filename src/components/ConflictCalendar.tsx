import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { useMemo } from 'react';
import type { ChangeRequest } from '../lib/database.types';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const locales = {
  'en-US': require('date-fns/locale/en-US'),
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

interface ConflictCalendarProps {
  changes: ChangeRequest[];
}

export function ConflictCalendar({ changes }: ConflictCalendarProps) {
  const events = useMemo(() => {
    return changes
      .filter(change => change.status === 'scheduled' || change.status === 'approved')
      .map(change => ({
        id: change.id,
        title: change.title,
        start: new Date(change.start_date),
        end: new Date(change.end_date),
        resource: change,
      }));
  }, [changes]);

  const hasConflict = (date: Date) => {
    const changesOnDate = events.filter(event => {
      const eventStart = new Date(event.start);
      const eventEnd = new Date(event.end);
      eventStart.setHours(0, 0, 0, 0);
      eventEnd.setHours(23, 59, 59, 999);
      const checkDate = new Date(date);
      checkDate.setHours(12, 0, 0, 0);
      return checkDate >= eventStart && checkDate <= eventEnd;
    });

    const highPriorityCount = changesOnDate.filter(
      event => event.resource.priority === 'High'
    ).length;

    return highPriorityCount > 2;
  };

  const dayPropGetter = (date: Date) => {
    if (hasConflict(date)) {
      return {
        className: 'conflict-day',
        style: {
          backgroundColor: '#fee2e2',
        },
      };
    }
    return {};
  };

  const eventStyleGetter = (event: any) => {
    const priority = event.resource.priority;
    let backgroundColor = '#94a3b8';

    if (priority === 'High') {
      backgroundColor = '#ef4444';
    } else if (priority === 'Medium') {
      backgroundColor = '#f59e0b';
    } else if (priority === 'Low') {
      backgroundColor = '#10b981';
    }

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.9,
        color: 'white',
        border: '0',
        display: 'block',
      },
    };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Change Calendar</h3>
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-slate-600">High Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-500 rounded"></div>
            <span className="text-slate-600">Medium Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-slate-600">Low Priority</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-100 border border-red-300 rounded"></div>
            <span className="text-slate-600">Conflict (&gt;2 High Priority)</span>
          </div>
        </div>
      </div>
      <div style={{ height: '600px' }}>
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: '100%' }}
          dayPropGetter={dayPropGetter}
          eventPropGetter={eventStyleGetter}
          views={['month', 'week', 'day']}
          defaultView="month"
        />
      </div>
    </div>
  );
}
