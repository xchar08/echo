# echo - Lecture Recorder App Specification

## Project Overview

- **Name**: echo
- **Type**: Desktop Application (Tauri + React)
- **Core Functionality**: One-button lecture recording with AI-powered
  transcription, note generation, and study tools
- **Target Users**: Students who want to capture, organize, and study lecture
  content

## Tech Stack

- **Frontend**: React + TypeScript + Vite
- **Backend**: Tauri (Rust)
- **AI/ML**: Cloud APIs (OpenAI Whisper for transcription, GPT for note
  generation)
- **Storage**: Local file system with structured directories
- **Database**: SQLite via Tauri for metadata

## Feature Phases

### Phase 1 - MVP (This Implementation)

1. **Calendar UI** - Main widget showing monthly view with lecture indicators
2. **Recording** - One-button audio capture with live waveform visualization
3. **File Organization** - Auto-filing under
   `Classes/[Course]/[Date]/[Lecture Name].webm`
4. **Lecture List** - Click date to see that day's lectures
5. **Audio Player** - Play back recordings with seek functionality

### Phase 2 - Transcription & Study Hub

1. **Live Transcription** - Whisper API integration for real-time transcription
2. **Transcript View** - Full text with timestamp markers
3. **AI Notes Generation** - GPT-generated notes from transcript
4. **LaTeX Support** - KaTeX rendering for physics formulas

### Phase 3 - Learning Tools

1. **Flashcards** - Auto-generated from key terms
2. **Quiz Mode** - Auto-generated questions from lecture content
3. **Timestamp Verification** - Click note to jump to transcript timestamp

### Phase 4 - External Content

1. **Link Import** - Paste Echo360/Canvas links
2. **Content Scraping** - Extract video/audio from LMS
3. **Calendar Integration** - File imported content by date

### Phase 5 - Advanced Features

1. **Diagram Generation** - AI-generated visuals for complex concepts
2. **Cross-Reference** - Find topic connections across lectures
3. **Full Edit Control** - Edit all AI-generated content

## UI/UX Specification

### Color Palette

- **Primary**: #1a1a2e (Deep navy)
- **Secondary**: #16213e (Dark blue)
- **Accent**: #e94560 (Coral red - for record button)
- **Surface**: #0f0f23 (Near black)
- **Text Primary**: #eaeaea
- **Text Secondary**: #a0a0a0
- **Success**: #4ade80 (Green)
- **Warning**: #fbbf24 (Amber)

### Typography

- **Font Family**: Inter (UI), JetBrains Mono (timestamps/code)
- **Headings**: 24px (h1), 20px (h2), 16px (h3)
- **Body**: 14px
- **Small**: 12px

### Layout

- **Main Window**: 1200x800 minimum
- **Sidebar**: 280px (collapsible)
- **Content Area**: Flexible

### Components

#### 1. Calendar Widget

- Monthly grid view
- Dots indicate days with lectures
- Click date to expand lecture list
- Navigation arrows for month switching

#### 2. Record Button

- Large circular button (80px diameter)
- Pulsing animation when recording
- Red color (#e94560) with white mic icon
- Stop button appears during recording

#### 3. Lecture Card

- Course name, date, duration
- Play button, transcription status indicator
- Hover: slight elevation, show "Open Study Hub"

#### 4. Study Hub Page

- Split view: Transcript (left 40%), Notes (right 60%)
- Tab navigation: Transcript | Notes | Flashcards | Quiz
- Each note paragraph links to transcript timestamp

#### 5. Flashcard Mode

- Card flip animation
- Show term, reveal definition
- Mark as "known" or "review"

#### 6. Quiz Mode

- Multiple choice questions
- Show correct answer with explanation
- Link back to source transcript

## Data Schema

### SQLite Tables

```sql
-- Courses
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Lectures
CREATE TABLE lectures (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  date DATE NOT NULL,
  title TEXT,
  audio_path TEXT,
  duration_seconds INTEGER,
  transcript TEXT,
  ai_notes TEXT,
  flashcards TEXT, -- JSON array
  quiz_questions TEXT, -- JSON array
  diagrams TEXT, -- JSON array of image paths
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Topics (for cross-referencing)
CREATE TABLE topics (
  id TEXT PRIMARY KEY,
  lecture_id TEXT REFERENCES lectures(id),
  topic_name TEXT NOT NULL,
  keywords TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Edits (track modifications)
CREATE TABLE user_edits (
  id TEXT PRIMARY KEY,
  lecture_id TEXT REFERENCES lectures(id),
  edit_type TEXT, -- 'notes' | 'flashcard' | 'quiz'
  original_content TEXT,
  edited_content TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### File System Structure

```
Documents/
└── echo/
    └── Classes/
        ├── [Course Name]/
        │   ├── 2024-01-15_Lecture1.webm
        │   ├── 2024-01-15_Lecture1_transcript.txt
        │   ├── 2024-01-15_Lecture1_notes.md
        │   ├── 2024-01-17_Lecture2.webm
        │   └── ...
        └── config.json
```

## API Integrations

### OpenAI Whisper (Transcription)

- Endpoint: `https://api.openai.com/v1/audio/transcriptions`
- Model: `whisper-1`
- Language: auto-detect or user-specified

### OpenAI GPT (Notes/Quiz Generation)

- Endpoint: `https://api.openai.com/v1/chat/completions`
- Model: `gpt-4-turbo-preview`
- Functions: summarize, extract_terms, generate_quiz

### Link Scraping (Future)

- Echo360: Extract video metadata and download
- Canvas: Use API or scrape course pages

## Acceptance Criteria

### Phase 1

- [ ] App launches without errors
- [ ] Calendar displays current month
- [ ] Can navigate between months
- [ ] Record button starts audio capture
- [ ] Recording saves to correct folder structure
- [ ] Can play back recordings
- [ ] Clicking date shows lectures for that day
- [ ] UI matches color scheme
