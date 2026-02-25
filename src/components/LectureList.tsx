import { useEffect, useState } from 'react';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { formatDate } from '../utils/date';

interface LectureInfo {
  filename: string;
  date: string;
  title: string;
  path: string;
}

export function LectureList() {
  const { selectedDate, setSelectedLecture, setView } = useStore();
  const [lectures, setLectures] = useState<LectureInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLectures();
  }, [selectedDate]);

  const loadLectures = async () => {
    setLoading(true);
    try {
      const dateStr = formatDate(selectedDate);
      const result = await invoke<LectureInfo[]>('get_lectures_for_date', { date: dateStr });
      setLectures(result);
    } catch (e) {
      console.error('Failed to load lectures:', e);
      setLectures([]);
    }
    setLoading(false);
  };

  const handleLectureClick = async (lectureInfo: LectureInfo, action: 'play' | 'study') => {
    // Basic fallback lecture object
    let lecture: any = {
      id: lectureInfo.filename,
      courseId: lectureInfo.title.split(' - ')[0] || 'Unknown',
      courseName: lectureInfo.title.split(' - ')[0] || 'Unknown',
      date: lectureInfo.date,
      title: lectureInfo.title.split(' - ')[1] || lectureInfo.filename,
      audioPath: lectureInfo.path,
      duration: 0,
      createdAt: new Date().toISOString(),
    };

    // Try to load rich metadata from the .json sidecar
    const { loadLectureMetadata } = await import('../services/storage');
    const enrichedLecture = await loadLectureMetadata(lectureInfo.path, lecture.courseName);
    
    if (enrichedLecture) {
      lecture = { ...lecture, ...enrichedLecture };
    }

    setSelectedLecture(lecture);
    setView(action === 'play' ? 'lecture' : 'study-hub');
  };

  if (loading) {
    return (
      <div className="empty-state">
        <p>Loading lectures...</p>
      </div>
    );
  }

  return (
    <div>
      
      {lectures.length === 0 ? (
        <div className="empty-state">
          <h3>No lectures</h3>
          <p>No recordings found for this date. Click the record button to start a new recording.</p>
        </div>
      ) : (
        <div className="lecture-list">
          {lectures.map((lecture, index) => (
            <div 
              key={index} 
              className="lecture-card"
            >
              <div className="lecture-card-header">
                <span className="lecture-card-title">
                  {lecture.title.split(' - ')[1] || lecture.filename}
                </span>
              </div>
              <div className="lecture-card-course">
                {lecture.title.split(' - ')[0] || 'General'}
              </div>
              <div className="lecture-card-actions">
                <button className="btn btn-primary" onClick={() => handleLectureClick(lecture, 'play')}>Play</button>
                <button className="btn btn-secondary" onClick={() => handleLectureClick(lecture, 'study')}>Study Hub</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
