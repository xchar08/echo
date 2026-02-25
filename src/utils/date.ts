import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

export const formatDate = (date: Date): string => {
  return format(date, 'yyyy-MM-dd');
};

export const formatDisplayDate = (date: Date): string => {
  return format(date, 'MMMM d, yyyy');
};

export const formatMonthYear = (date: Date): string => {
  return format(date, 'MMMM yyyy');
};

export const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds) || isNaN(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const getCalendarDays = (date: Date): Date[] => {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  
  const days = eachDayOfInterval({ start, end });
  
  const startDay = start.getDay();
  for (let i = startDay - 1; i >= 0; i--) {
    days.unshift(new Date(start.getTime() - (i + 1) * 24 * 60 * 60 * 1000));
  }
  
  const endDay = end.getDay();
  for (let i = 1; i <= 6 - endDay; i++) {
    days.push(new Date(end.getTime() + i * 24 * 60 * 60 * 1000));
  }
  
  return days;
};

export const isToday = (date: Date): boolean => {
  return isSameDay(date, new Date());
};

export const isSelected = (date: Date, selectedDate: Date): boolean => {
  return isSameDay(date, selectedDate);
};

export const nextMonth = (date: Date): Date => {
  return addMonths(date, 1);
};

export const prevMonth = (date: Date): Date => {
  return subMonths(date, 1);
};

export const isCurrentMonth = (date: Date, currentMonth: Date): boolean => {
  return isSameMonth(date, currentMonth);
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
