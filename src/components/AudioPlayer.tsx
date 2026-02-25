import { useState, useRef, useEffect } from 'react';
import { useStore } from '../store';
import { formatTime } from '../utils/date';
import { convertFileSrc } from '@tauri-apps/api/core';
import { deleteLectureFiles } from '../services/storage';

export function AudioPlayer() {
  const { selectedLecture, setView, removeLecture } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (!selectedLecture?.audioPath) return;
    
    const audio = audioRef.current;
    if (!audio) return;

    const src = convertFileSrc(selectedLecture.audioPath);
    audio.src = src;
    audio.load();

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedLecture?.audioPath]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleDelete = async () => {
    if (!selectedLecture) return;
    
    if (confirmDelete) {
      await deleteLectureFiles(selectedLecture.audioPath, selectedLecture.courseName);
      removeLecture(selectedLecture.id);
      setView('calendar');
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000); // reset after 3s
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    audio.currentTime = percentage * duration;
  };

  const displayDuration = (isFinite(duration) && duration > 0) ? duration : (selectedLecture?.duration || 0);
  const progress = displayDuration ? (currentTime / displayDuration) * 100 : 0;

  if (!selectedLecture) {
    return (
      <div className="empty-state">
        <h3>No lecture selected</h3>
        <p>Select a lecture from the list to play it.</p>
      </div>
    );
  }

  return (
    <div className="audio-player">
      <div className="audio-player-header">
        <span className="audio-player-title">{selectedLecture.title}</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
          {selectedLecture.courseName}
        </span>
      </div>
      
      <div className="audio-controls">
        <button className="play-btn" onClick={togglePlay}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" fill="white" />
              <rect x="14" y="4" width="4" height="16" fill="white" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" fill="white" />
            </svg>
          )}
        </button>
        
        <div className="progress-bar" onClick={handleSeek}>
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progress}%` }}
          />
        </div>
        
        <span className="time-display">
          {formatTime(currentTime)} / {formatTime(displayDuration)}
        </span>
      </div>
      
      <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center' }}>
        <button 
          className="btn btn-primary"
          onClick={() => setView('study-hub')}
        >
          Create Notes
        </button>
        <button className="btn btn-secondary">
          Edit Details
        </button>
        <button 
          onClick={handleDelete}
          style={{
            marginLeft: 'auto',
            background: confirmDelete ? 'var(--accent)' : 'transparent',
            color: confirmDelete ? 'white' : 'var(--text-secondary)',
            border: confirmDelete ? 'none' : '1px solid var(--border)',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            transition: 'all 0.2s ease'
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
          </svg>
          {confirmDelete ? 'Confirm Delete' : ''}
        </button>
      </div>
      
      <audio ref={audioRef} />
    </div>
  );
}
