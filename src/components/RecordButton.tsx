import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store';
import { invoke } from '@tauri-apps/api/core';
import { formatDate, generateId } from '../utils/date';
import type { Lecture } from '../types';
import { saveLectureMetadata } from '../services/storage';

interface SpeechRecognitionEvent {
  results: {
    [index: number]: {
      [index: number]: { transcript: string };
      isFinal: boolean;
    };
    length: number;
  };
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
}

declare global {
  interface Window {
    SpeechRecognition: { new (): SpeechRecognition };
    webkitSpeechRecognition: { new (): SpeechRecognition };
  }
}

export function RecordButton() {
  const { isRecording, setIsRecording, selectedDate } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [lectureTitle, setLectureTitle] = useState('');
  const [courses, setCourses] = useState<string[]>(['Classes']);
  const [selectedCourse, setSelectedCourse] = useState('Classes');
  const [newCourse, setNewCourse] = useState('');
  const [addingCourse, setAddingCourse] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptPartsRef = useRef<string[]>([]);
  const recordingStartTimeRef = useRef<number>(0);
  const lockedDurationRef = useRef<number>(0);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    try {
      await invoke<string>('get_base_path');
      const courseList = await invoke<string[]>('list_courses');
      setCourses(['Classes', ...courseList]);
    } catch (e) {
      console.error('Failed to load courses:', e);
    }
  };

  const updateAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;
    
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    
    if (isRecording) {
      animationRef.current = requestAnimationFrame(updateAudioLevel);
    }
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 64;
      source.connect(analyser);
      analyserRef.current = analyser;
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      transcriptPartsRef.current = [];
      setLiveTranscript('');
      recordingStartTimeRef.current = Date.now();
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Set up Speech Recognition
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onresult = (event) => {
          const resultIndex = event.results.length - 1;
          const transcriptChunk = event.results[resultIndex][0].transcript.trim();
          
          if (transcriptChunk) {
            // Calculate relative timestamp in seconds
            const elapsedSeconds = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
            const minutes = Math.floor(elapsedSeconds / 60).toString().padStart(2, '0');
            const seconds = (elapsedSeconds % 60).toString().padStart(2, '0');
            const timestamp = `[${minutes}:${seconds}]`;
            const chunkText = `${timestamp} ${transcriptChunk}`;
            transcriptPartsRef.current.push(chunkText);
            setLiveTranscript(prev => prev ? prev + '\n' + chunkText : chunkText);
          }
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setLiveTranscript(prev => prev + `\n[STT Error: ${event.error}]`);
        };

        // Auto-restart if it stops unexpectedly while still recording
        recognition.onend = () => {
          if (useStore.getState().isRecording) {
            try {
              recognition.start();
            } catch (e) {
              console.error("Could not restart speech recognition", e);
            }
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
      } else {
        const errorMsg = "Native SpeechRecognition API is NOT supported in this Tauri Edge WebView2 container. Live transcription is disabled.";
        setLiveTranscript(`[System Warning]: ${errorMsg}`);
        console.warn(errorMsg);
      }
      
      mediaRecorder.start(1000);
      setIsRecording(true);
      updateAudioLevel();
    } catch (e) {
      console.error('Failed to start recording:', e);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    // Lock the integer duration instantly into a ref to bypass React State closure capture delays
    const finalDuration = Math.max(1, Math.floor((Date.now() - recordingStartTimeRef.current) / 1000));
    lockedDurationRef.current = finalDuration;
    
    setIsRecording(false);
    setShowModal(true);
  };

  const handleSaveLecture = async () => {
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const courseName = selectedCourse === 'Classes' ? 'General' : selectedCourse;
      const dateStr = formatDate(selectedDate);
      const title = lectureTitle || `Lecture_${Date.now()}`;
      const filename = `${dateStr}_${title.replace(/[^a-zA-Z0-9_\-\s]/g, '').replace(/\s+/g, '_')}`;
      
      await invoke('ensure_course_dir', { courseName });
      const basePath = await invoke<string>('get_base_path');
      const filePath = `${basePath}\\${courseName}\\${filename}.webm`;
      
      const arrayBuffer = await audioBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      await writeFile(filePath, uint8Array);
      
      const lecture: Lecture = {
        id: generateId(),
        courseId: courseName,
        courseName: courseName,
        date: dateStr,
        title: title,
        audioPath: filePath,
        duration: lockedDurationRef.current,
        transcript: transcriptPartsRef.current.join('\n\n'),
        createdAt: new Date().toISOString(),
      };
      
      // Save full rich metadata to backend JSON
      await saveLectureMetadata(lecture);

      useStore.getState().addLecture(lecture);
      
      if (!useStore.getState().datesWithLectures.includes(dateStr)) {
        useStore.getState().setDatesWithLectures([...useStore.getState().datesWithLectures, dateStr]);
      }
    } catch (e: any) {
      console.error('Failed to save recording:', e);
      alert(`Save failed: ${e.message || String(e)}`);
    } finally {
      setLectureTitle('');
      setShowModal(false);
    }
  };

  const handleAddCourse = () => {
    if (newCourse.trim()) {
      setCourses([...courses, newCourse.trim()]);
      setSelectedCourse(newCourse.trim());
      setNewCourse('');
      setAddingCourse(false);
    }
  };



  return (
    <div>
      <button 
        className={`record-button ${isRecording ? 'recording' : ''}`}
        onClick={isRecording ? stopRecording : startRecording}
      >
        {isRecording ? (
          <svg viewBox="0 0 24 24">
            <rect x="6" y="6" width="12" height="12" rx="2" fill="white" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>

      {isRecording && liveTranscript && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '8px',
          color: 'var(--text-secondary)',
          fontSize: '12px',
          maxHeight: '150px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>Live Transcript:</div>
          {liveTranscript}
        </div>
      )}
      
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Save Lecture</h3>
            <div className="form-group">
              <label>Course</label>
              {addingCourse ? (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={newCourse}
                    onChange={e => setNewCourse(e.target.value)}
                    placeholder="New course name"
                    autoFocus
                  />
                  <button className="btn btn-primary" onClick={handleAddCourse}>Add</button>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select 
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                  >
                    {courses.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => setAddingCourse(true)}
                  >
                    + New
                  </button>
                </div>
              )}
            </div>
            <div className="form-group">
              <label>Lecture Title (optional)</label>
              <input 
                type="text" 
                value={lectureTitle}
                onChange={e => setLectureTitle(e.target.value)}
                placeholder="e.g., Introduction to Physics"
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={handleSaveLecture}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
