import { useStore } from '../store';
import { 
  getCalendarDays, 
  formatMonthYear, 
  nextMonth, 
  prevMonth, 
  isToday, 
  isSelected, 
  isCurrentMonth,
  formatDate 
} from '../utils/date';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function Calendar() {
  const { selectedDate, setSelectedDate, datesWithLectures, currentMonth } = useStore();
  const currentMonthDate = currentMonth || selectedDate;
  
  const days = getCalendarDays(currentMonthDate);
  const monthYear = formatMonthYear(currentMonthDate);
  const datesSet = new Set(datesWithLectures);

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <div className="calendar-nav">
          <button onClick={() => useStore.setState({ currentMonth: prevMonth(currentMonthDate) })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <span className="calendar-title">{monthYear}</span>
          <button onClick={() => useStore.setState({ currentMonth: nextMonth(currentMonthDate) })}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
      </div>
      
      <div className="calendar-grid">
        {WEEKDAYS.map(day => (
          <div key={day} className="calendar-day-header">{day}</div>
        ))}
        
        {days.map((day, index) => {
          const dateStr = formatDate(day);
          const hasLecture = datesSet.has(dateStr);
          const isTodayDate = isToday(day);
          const isSelectedDate = isSelected(day, selectedDate);
          const inCurrentMonth = isCurrentMonth(day, currentMonthDate);
          
          return (
            <div
              key={index}
              className={`calendar-day ${isTodayDate ? 'today' : ''} ${isSelectedDate ? 'selected' : ''} ${!inCurrentMonth ? 'other-month' : ''} ${hasLecture ? 'has-lecture' : ''}`}
              onClick={() => setSelectedDate(day)}
            >
              {day.getDate()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
