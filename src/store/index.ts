import { create } from 'zustand';
import type { AppState, Lecture, Course } from '../types';

export const useStore = create<AppState & { currentMonth: Date; setCurrentMonth: (date: Date) => void }>((set) => ({
  courses: [],
  lectures: [],
  selectedDate: new Date(),
  selectedLecture: null,
  isRecording: false,
  currentCourse: 'Classes',
  datesWithLectures: [],
  view: 'calendar',
  currentMonth: new Date(),

  setCourses: (courses: Course[]) => set({ courses }),
  setLectures: (lectures: Lecture[]) => set({ lectures }),
  setSelectedDate: (date: Date) => set({ selectedDate: date }),
  setSelectedLecture: (lecture: Lecture | null) => set({ selectedLecture: lecture }),
  setIsRecording: (recording: boolean) => set({ isRecording: recording }),
  setCurrentCourse: (course: string) => set({ currentCourse: course }),
  setDatesWithLectures: (dates: string[]) => set({ datesWithLectures: dates }),
  setView: (view: 'calendar' | 'lecture' | 'study-hub') => set({ view }),
  setCurrentMonth: (date: Date) => set({ currentMonth: date }),
  addLecture: (lecture: Lecture) => set((state) => ({ 
    lectures: [...state.lectures, lecture] 
  })),
  updateLecture: (updated: Lecture) => set((state) => ({
    lectures: state.lectures.map(l => l.id === updated.id ? updated : l),
    selectedLecture: state.selectedLecture?.id === updated.id ? updated : state.selectedLecture
  })),
  removeLecture: (id: string) => set((state) => ({
    lectures: state.lectures.filter(l => l.id !== id),
    selectedLecture: state.selectedLecture?.id === id ? null : state.selectedLecture
  })),
}));
