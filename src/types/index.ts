export interface Lecture {
  id: string;
  courseId: string;
  courseName: string;
  date: string;
  title: string;
  audioPath: string;
  duration: number;
  transcript?: string;
  aiNotes?: string;
  flashcards?: Flashcard[];
  quizQuestions?: QuizQuestion[];
  createdAt: string;
}

export interface Flashcard {
  id: string;
  term: string;
  definition: string;
  known: boolean;
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface Course {
  id: string;
  name: string;
}

export interface AppState {
  courses: Course[];
  lectures: Lecture[];
  selectedDate: Date;
  selectedLecture: Lecture | null;
  isRecording: boolean;
  currentCourse: string;
  datesWithLectures: string[];
  view: 'calendar' | 'lecture' | 'study-hub';
  
  setCourses: (courses: Course[]) => void;
  setLectures: (lectures: Lecture[]) => void;
  setSelectedDate: (date: Date) => void;
  setSelectedLecture: (lecture: Lecture | null) => void;
  setIsRecording: (recording: boolean) => void;
  setCurrentCourse: (course: string) => void;
  setDatesWithLectures: (dates: string[]) => void;
  setView: (view: 'calendar' | 'lecture' | 'study-hub') => void;
  addLecture: (lecture: Lecture) => void;
  updateLecture: (lecture: Lecture) => void;
  removeLecture: (id: string) => void;
}
