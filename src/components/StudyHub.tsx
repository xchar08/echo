import { useState, useEffect } from 'react';
import { useStore } from '../store';
import type { Flashcard, QuizQuestion } from '../types';

import { generateRNNSummary, generateFlashcards, generateQuiz } from '../services/ai';
import { saveLectureMetadata, deleteLectureFiles } from '../services/storage';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Mermaid } from './Mermaid';

type Tab = 'transcript' | 'notes' | 'flashcards' | 'quiz';

export function StudyHub() {
  const { selectedLecture, setView, updateLecture, removeLecture } = useStore();
  const [activeTab, setActiveTab] = useState<Tab>('notes');
  const [transcript, setTranscript] = useState('');
  const [aiNotes, setAiNotes] = useState('');
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (selectedLecture) {
      setTranscript(selectedLecture.transcript || '');
      setAiNotes(selectedLecture.aiNotes || '');
      setEditedNotes(selectedLecture.aiNotes || '');
      setFlashcards(selectedLecture.flashcards || []);
      setQuizQuestions(selectedLecture.quizQuestions || []);
    }
  }, [selectedLecture]);

  const generateContent = async () => {
    setIsGenerating(true);
    setTranscript("Mock transcript loading...");

    try {
      const transcriptText = selectedLecture?.transcript || 'Could you provide a brief overview of the key concepts from this lecture?';
      
      setTranscript(transcriptText);

      // Generate notes
      setAiNotes("Generating notes via Nebius...");
      const finalNotes = await generateRNNSummary(transcriptText, (current, total) => {
        setAiNotes(prev => prev + `\n\n[Processing chunk ${current} of ${total}...]`);
      });
      setAiNotes(finalNotes);

      // Generate flashcards & quizzes based on generated notes
      const cards = await generateFlashcards(finalNotes);
      setFlashcards(cards);

      const quiz = await generateQuiz(finalNotes);
      setQuizQuestions(quiz);

      // Persist generated content to backend JSON
      if (selectedLecture) {
        const updatedLecture = {
          ...selectedLecture,
          transcript: transcriptText,
          aiNotes: finalNotes,
          flashcards: cards,
          quizQuestions: quiz
        };
        updateLecture(updatedLecture);
        await saveLectureMetadata(updatedLecture);
      }

    } catch (e) {
      console.error("AI Generation Error:", e);
      setAiNotes("Failed to generate content: " + (e as Error).message);
    } finally {
      setIsGenerating(false);
    }
  };


  const saveNotes = async () => {
    setAiNotes(editedNotes);
    setEditingNotes(false);
    
    if (selectedLecture) {
      const updatedLecture = {
        ...selectedLecture,
        aiNotes: editedNotes
      };
      updateLecture(updatedLecture);
      await saveLectureMetadata(updatedLecture);
    }
  };

  const flipCard = () => {
    setShowAnswer(!showAnswer);
  };

  const nextCard = () => {
    setShowAnswer(false);
    setCurrentCardIndex((currentCardIndex + 1) % flashcards.length);
  };

  const markCardKnown = () => {
    const updated = [...flashcards];
    updated[currentCardIndex].known = true;
    setFlashcards(updated);
    nextCard();
  };

  const handleQuizAnswer = (index: number) => {
    setSelectedQuizAnswer(index);
    setShowQuizResult(true);
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'transcript':
        return (
          <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8' }}>
            {transcript || 'No transcript available. Generate notes to create a transcript.'}
          </div>
        );
      
      case 'notes':
        return (
          <div>
            {editingNotes ? (
              <textarea
                style={{
                  width: '100%',
                  minHeight: '400px',
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  padding: '16px',
                  fontSize: '14px',
                  lineHeight: '1.8',
                  fontFamily: 'inherit'
                }}
                value={editedNotes}
                onChange={e => setEditedNotes(e.target.value)}
              />
            ) : (
              <div className="markdown-body" style={{ background: 'var(--surface)', padding: '24px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                {aiNotes ? (
                  <ReactMarkdown 
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code(props) {
                        const {children, className, ...rest} = props;
                        const match = /language-(\w+)/.exec(className || '');
                        if (match && match[1] === 'mermaid') {
                          return <Mermaid chart={String(children).replace(/\n$/, '')} />;
                        }
                        return <code {...rest} className={className}>{children}</code>;
                      }
                    }}
                  >
                    {aiNotes}
                  </ReactMarkdown>
                ) : (
                  'Click "Generate Notes" to create AI-powered notes with Mermaid diagrams.'
                )}
              </div>
            )}
            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              {isGenerating ? (
                <button className="btn btn-secondary" disabled>
                  Generating...
                </button>
              ) : (
                <button className="btn btn-primary" onClick={generateContent}>
                  Generate Notes
                </button>
              )}
              {aiNotes && (
                editingNotes ? (
                  <button className="btn btn-primary" onClick={saveNotes}>
                    Save
                  </button>
                ) : (
                  <button className="btn btn-secondary" onClick={() => setEditingNotes(true)}>
                    Edit
                  </button>
                )
              )}
            </div>
          </div>
        );
      
      case 'flashcards':
        return (
          <div>
            {flashcards.length === 0 ? (
              <div className="empty-state">
                <p>Generate notes first to create flashcards.</p>
              </div>
            ) : (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <div style={{ textAlign: 'center', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                  Card {currentCardIndex + 1} of {flashcards.length} • Known: {flashcards.filter(f => f.known).length}
                </div>
                <div 
                  className="lecture-card"
                  style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                  onClick={flipCard}
                >
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px' }}>
                      {flashcards[currentCardIndex].term}
                    </div>
                    {showAnswer && (
                      <div style={{ color: 'var(--text-secondary)', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
                        {flashcards[currentCardIndex].definition}
                      </div>
                    )}
                    {!showAnswer && (
                      <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Click to reveal answer
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginTop: '16px' }}>
                  <button className="btn btn-secondary" onClick={nextCard}>
                    Skip
                  </button>
                  <button className="btn btn-primary" onClick={markCardKnown}>
                    I Know This
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      
      case 'quiz':
        return (
          <div>
            {quizQuestions.length === 0 ? (
              <div className="empty-state">
                <p>Generate notes first to create a quiz.</p>
              </div>
            ) : (
              <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                {quizQuestions.map((q, qIndex) => (
                  <div key={q.id} className="lecture-card" style={{ marginBottom: '16px' }}>
                    <div style={{ fontWeight: '600', marginBottom: '12px' }}>
                      {qIndex + 1}. {q.question}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {q.options.map((option, oIndex) => (
                        <button
                          key={oIndex}
                          className={`btn ${selectedQuizAnswer === oIndex ? (oIndex === q.correctAnswer ? 'btn-primary' : 'btn-secondary') : 'btn-secondary'}`}
                          style={{ 
                            textAlign: 'left',
                            opacity: showQuizResult && selectedQuizAnswer !== null && oIndex !== q.correctAnswer ? 0.5 : 1
                          }}
                          onClick={() => handleQuizAnswer(oIndex)}
                          disabled={showQuizResult && selectedQuizAnswer !== null}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    {showQuizResult && selectedQuizAnswer === q.correctAnswer && (
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(74, 222, 128, 0.1)', borderRadius: '8px', color: 'var(--success)' }}>
                        ✓ Correct! {q.explanation}
                      </div>
                    )}
                    {showQuizResult && selectedQuizAnswer !== null && selectedQuizAnswer !== q.correctAnswer && (
                      <div style={{ marginTop: '12px', padding: '12px', background: 'rgba(233, 69, 96, 0.1)', borderRadius: '8px', color: 'var(--accent)' }}>
                        ✗ Incorrect. {q.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
    }
  };

  if (!selectedLecture) {
    return (
      <div className="empty-state">
        <h3>No lecture selected</h3>
        <p>Select a lecture to view its study hub.</p>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <h2>{selectedLecture.title}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px' }}>{selectedLecture.courseName}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={handleDelete}
            title="Delete this lecture"
            style={{
              background: confirmDelete ? 'var(--accent)' : 'var(--surface)',
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
          
          <button className="btn btn-secondary" onClick={() => setView('lecture')}>
            ← Back
          </button>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={`tab ${activeTab === 'transcript' ? 'active' : ''}`}
          onClick={() => setActiveTab('transcript')}
        >
          Transcript
        </button>
        <button 
          className={`tab ${activeTab === 'notes' ? 'active' : ''}`}
          onClick={() => setActiveTab('notes')}
        >
          Notes
        </button>
        <button 
          className={`tab ${activeTab === 'flashcards' ? 'active' : ''}`}
          onClick={() => setActiveTab('flashcards')}
        >
          Flashcards
        </button>
        <button 
          className={`tab ${activeTab === 'quiz' ? 'active' : ''}`}
          onClick={() => setActiveTab('quiz')}
        >
          Quiz
        </button>
      </div>
      
      <div className="content-body">
        {renderTabContent()}
      </div>
    </div>
  );
}
