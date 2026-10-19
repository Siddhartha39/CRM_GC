import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { LeadCategoryBadge } from '../../components/ui/Badge';
import { CallModal } from '../calls/CallModal';
import { RescheduleModal } from './RescheduleModal';
import { getCalendarGrid, getKolkataTodayString, formatKolkataDate } from '../../utils/dates';
import { getFollowUpCountsForMonth } from '../../services/followUpService';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  Clock,
} from 'lucide-react';

/**
 * Neumorphic Soft UI Follow-Up Calendar
 * Monthly calendar grid with tactile day tiles, call density indicators, and selected date task queues.
 */
export function FollowUpCalendarPage() {
  const navigate = useNavigate();
  const todayStr = getKolkataTodayString();
  const [todayYear, todayMonth] = todayStr.split('-').map(Number);

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth - 1); // 0-indexed
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [monthCounts, setMonthCounts] = useState({});
  const [selectedDateTasks, setSelectedDateTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);

  // Modals
  const [callingCustomer, setCallingCustomer] = useState(null);
  const [reschedulingTask, setReschedulingTask] = useState(null);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const calendarDays = getCalendarGrid(currentYear, currentMonth);

  const loadMonthData = async () => {
    try {
      const counts = await getFollowUpCountsForMonth(currentYear, currentMonth);
      setMonthCounts(counts);
    } catch (e) {
      console.error('Calendar counts error:', e);
    }
  };

  const loadDateTasks = async (dateStr) => {
    setLoadingTasks(true);
    setSelectedDate(dateStr);
    try {
      const q = query(
        collection(db, 'followUps'),
        where('dueDate', '==', dateStr)
      );
      const snap = await getDocs(q);
      setSelectedDateTasks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error('Error fetching date tasks:', e);
      setSelectedDateTasks([]);
    } finally {
      setLoadingTasks(false);
    }
  };

  useEffect(() => {
    loadMonthData();
  }, [currentYear, currentMonth]);

  useEffect(() => {
    if (selectedDate) {
      loadDateTasks(selectedDate);
    }
  }, [selectedDate]);

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Calendar Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-6 sm:p-8 bg-background shadow-neu-flat rounded-[32px]">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-background shadow-neu-pressed flex items-center justify-center text-accent shrink-0">
            <Calendar className="w-6 h-6 stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-foreground tracking-tight">
              {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-sm font-body text-muted">
              Monthly follow-up scheduling and density overview
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="secondary" size="sm" icon={ChevronLeft} onClick={handlePrevMonth}>
            Prev
          </Button>
          <Button
            variant="muted"
            size="sm"
            onClick={() => {
              setCurrentYear(todayYear);
              setCurrentMonth(todayMonth - 1);
              setSelectedDate(todayStr);
            }}
          >
            Today
          </Button>
          <Button variant="secondary" size="sm" onClick={handleNextMonth}>
            Next <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>

      {/* Grid and Day List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Cols: Monthly Grid */}
        <div className="lg:col-span-2">
          <div className="p-6 bg-background shadow-neu-flat rounded-[32px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-2 text-center font-display font-bold text-xs uppercase tracking-wider text-muted pb-3 mb-3 border-b border-muted/20">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-2.5">
              {calendarDays.map((day) => {
                const countInfo = monthCounts[day.dateString];
                const total = countInfo ? countInfo.total : 0;
                const pending = countInfo ? countInfo.pending : 0;
                const isSelected = selectedDate === day.dateString;

                return (
                  <div
                    key={day.dateString}
                    onClick={() => loadDateTasks(day.dateString)}
                    className={`min-h-[76px] p-2.5 rounded-2xl cursor-pointer transition-all duration-300 flex flex-col justify-between ${
                      isSelected
                        ? 'shadow-neu-pressed bg-background ring-2 ring-accent'
                        : day.isToday
                        ? 'shadow-neu-flat-sm bg-background font-bold text-accent'
                        : day.isCurrentMonth
                        ? 'shadow-neu-flat-sm hover:shadow-neu-flat bg-background text-foreground'
                        : 'opacity-40 bg-background'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-display font-bold ${isSelected ? 'text-accent' : ''}`}>
                        {day.dayNumber}
                      </span>
                      {day.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                      )}
                    </div>

                    {total > 0 && (
                      <div className="mt-1 flex flex-col gap-1">
                        <span className="text-[10px] font-display font-semibold bg-accent text-white px-1.5 py-0.5 rounded-md text-center truncate shadow-sm">
                          {total} call{total > 1 ? 's' : ''}
                        </span>
                        {pending > 0 && (
                          <span className="text-[9px] font-bold text-amber-600 text-center">
                            {pending} pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Col: Selected Date Follow-Up Queue */}
        <div>
          <div className="p-6 bg-background shadow-neu-flat rounded-[32px] space-y-4">
            <div className="pb-3 border-b border-muted/20">
              <span className="text-xs font-display font-bold uppercase tracking-wider text-muted block">Selected Date Queue</span>
              <h3 className="text-xl font-display font-extrabold text-foreground tracking-tight mt-0.5">
                {formatKolkataDate(selectedDate)}
              </h3>
            </div>

            {loadingTasks ? (
              <div className="py-8 text-center text-xs font-body text-muted">
                Loading calls for {selectedDate}...
              </div>
            ) : selectedDateTasks.length === 0 ? (
              <div className="py-8 text-center text-sm font-body text-muted">
                No follow-up calls scheduled on this date.
              </div>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 bg-background shadow-neu-flat-sm rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-sm text-foreground">
                        {task.customerNameSnapshot}
                      </span>
                      <LeadCategoryBadge category={task.leadCategory} size="sm" />
                    </div>

                    <div className="text-xs text-muted">
                      📞 {task.customerPhoneSnapshot}
                    </div>

                    {task.purpose && (
                      <div className="text-xs text-foreground/80 font-medium bg-background shadow-neu-pressed-sm px-2.5 py-1 rounded-xl">
                        🎯 {task.purpose}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="primary"
                        icon={Phone}
                        onClick={() =>
                          setCallingCustomer({
                            id: task.customerId,
                            customerId: task.customerCustomId,
                            fullName: task.customerNameSnapshot,
                            phone: task.customerPhoneSnapshot,
                            leadCategory: task.leadCategory,
                            requirement: task.requirement,
                          })
                        }
                      >
                        Call
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setReschedulingTask(task)}
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <CallModal
        isOpen={Boolean(callingCustomer)}
        onClose={() => setCallingCustomer(null)}
        customer={callingCustomer}
        onCallLogged={() => loadDateTasks(selectedDate)}
      />

      <RescheduleModal
        isOpen={Boolean(reschedulingTask)}
        onClose={() => setReschedulingTask(null)}
        followUp={reschedulingTask}
        onRescheduled={() => {
          loadDateTasks(selectedDate);
          loadMonthData();
        }}
      />
    </div>
  );
}
