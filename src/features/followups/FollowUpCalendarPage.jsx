import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../../components/ui/Card';
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
  CheckCircle,
} from 'lucide-react';

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
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-paper-white card-hand border-2 border-border">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sticky-yellow border-2 border-border rounded-lg shadow-hand-sm">
            <Calendar className="w-6 h-6 text-foreground stroke-[2]" />
          </div>
          <div>
            <h2 className="text-2xl font-heading font-bold text-foreground">
              Follow-Up Calendar — {monthNames[currentMonth]} {currentYear}
            </h2>
            <p className="text-sm font-body text-foreground/70">
              Click any calendar day to inspect and manage its scheduled follow-up queue
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="muted" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" /> Prev
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCurrentYear(todayYear);
              setCurrentMonth(todayMonth - 1);
              setSelectedDate(todayStr);
            }}
          >
            Today
          </Button>
          <Button variant="muted" size="sm" onClick={handleNextMonth}>
            Next <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Grid and Day List Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Monthly Grid */}
        <div className="lg:col-span-2">
          <Card className="border-2 border-border p-4">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1 text-center font-heading font-bold text-sm text-foreground/70 pb-2 border-b-2 border-border/30 mb-2">
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
              <span>Sun</span>
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {calendarDays.map((day) => {
                const countInfo = monthCounts[day.dateString];
                const total = countInfo ? countInfo.total : 0;
                const pending = countInfo ? countInfo.pending : 0;
                const isSelected = selectedDate === day.dateString;

                return (
                  <div
                    key={day.dateString}
                    onClick={() => loadDateTasks(day.dateString)}
                    className={`min-h-[70px] p-1.5 rounded-lg border-2 cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-sticky-yellow border-border shadow-hand-sm font-bold'
                        : day.isToday
                        ? 'bg-emerald-50 border-emerald-600'
                        : day.isCurrentMonth
                        ? 'bg-paper-white border-border/40 hover:bg-stone-50'
                        : 'bg-stone-100/50 border-transparent text-foreground/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-heading font-bold ${day.isToday ? 'text-emerald-700 font-extrabold' : ''}`}>
                        {day.dayNumber}
                      </span>
                      {day.isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                      )}
                    </div>

                    {total > 0 && (
                      <div className="mt-1 flex flex-col gap-0.5">
                        <span className="text-[10px] font-body bg-secondary-accent text-white px-1 py-0.2 rounded text-center truncate">
                          {total} call{total > 1 ? 's' : ''}
                        </span>
                        {pending > 0 && (
                          <span className="text-[9px] font-bold text-amber-800 text-center">
                            {pending} pending
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Right Col: Selected Date Follow-Up Queue */}
        <div>
          <Card className="border-2 border-border p-4 space-y-3" tape={true}>
            <div className="border-b-2 border-dashed border-border/40 pb-2">
              <span className="text-xs text-foreground/60 font-body block">Selected Date Queue</span>
              <h3 className="text-xl font-heading font-bold text-foreground">
                {formatKolkataDate(selectedDate)}
              </h3>
            </div>

            {loadingTasks ? (
              <div className="py-8 text-center text-xs font-body text-foreground/60">
                Loading calls for {selectedDate}...
              </div>
            ) : selectedDateTasks.length === 0 ? (
              <div className="py-8 text-center text-sm font-body text-foreground/60">
                No follow-up calls scheduled on this date.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {selectedDateTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-3 bg-stone-50 border-2 border-border rounded-lg text-xs font-body space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        onClick={() => task.customerId && navigate(`/leads/${task.customerId}`)}
                        className="font-heading font-bold text-sm text-secondary-accent hover:underline cursor-pointer"
                      >
                        {task.customerNameSnapshot}
                      </span>
                      <LeadCategoryBadge category={task.leadCategory} size="sm" />
                    </div>

                    <div className="text-foreground/80">
                      📞 {task.customerPhoneSnapshot}
                    </div>

                    {task.purpose && (
                      <div className="bg-white p-1.5 rounded border border-border/40 font-medium">
                        🎯 {task.purpose}
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-1">
                      <span className={`font-bold ${task.status === 'Completed' ? 'text-emerald-700' : 'text-amber-800'}`}>
                        {task.status}
                      </span>
                      {task.status === 'Pending' && (
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="primary"
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
                            variant="muted"
                            onClick={() => setReschedulingTask(task)}
                          >
                            Reschedule
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Modals */}
      <CallModal
        isOpen={Boolean(callingCustomer)}
        onClose={() => setCallingCustomer(null)}
        customer={callingCustomer}
        onCallLogged={() => {
          loadMonthData();
          if (selectedDate) loadDateTasks(selectedDate);
        }}
      />

      <RescheduleModal
        isOpen={Boolean(reschedulingTask)}
        onClose={() => setReschedulingTask(null)}
        followUp={reschedulingTask}
        onRescheduled={() => {
          loadMonthData();
          if (selectedDate) loadDateTasks(selectedDate);
        }}
      />
    </div>
  );
}
