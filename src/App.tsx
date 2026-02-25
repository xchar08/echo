import { useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "./store";
import {
  AudioPlayer,
  Calendar,
  LectureList,
  RecordButton,
  StudyHub,
} from "./components";
import { formatDisplayDate } from "./utils/date";
import "./index.css";

function App() {
  const { view, selectedDate, setDatesWithLectures, setCurrentCourse } =
    useStore();

  useEffect(() => {
    loadDatesWithLectures();
    initializeStorage();
  }, []);

  const loadDatesWithLectures = async () => {
    try {
      const dates = await invoke<string[]>("get_dates_with_lectures");
      setDatesWithLectures(dates);
    } catch (e) {
      console.error("Failed to load dates:", e);
    }
  };

  const initializeStorage = async () => {
    try {
      const basePath = await invoke<string>("get_base_path");
      setCurrentCourse(basePath.split("\\").pop() || "Classes");
    } catch (e) {
      console.error("Failed to initialize storage:", e);
    }
  };

  const renderMainContent = () => {
    switch (view) {
      case "calendar":
        return (
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "24px",
              }}
            >
              <div>
                <h3 style={{ marginBottom: "16px" }}>Calendar</h3>
                <Calendar />
              </div>
              <div>
                <h3 style={{ marginBottom: "16px" }}>
                  {formatDisplayDate(selectedDate)}
                </h3>
                <LectureList />
              </div>
            </div>
          </>
        );

      case "lecture":
        return <AudioPlayer />;

      case "study-hub":
        return <StudyHub />;
    }
  };

  return (
    <div className="app-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
            </svg>
          </div>
          <h1>echo</h1>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <RecordButton />

          <div style={{ marginTop: "24px" }}>
            <button
              className={`btn ${
                view === "calendar" ? "btn-primary" : "btn-secondary"
              }`}
              style={{ width: "100%", marginBottom: "8px" }}
              onClick={() => useStore.getState().setView("calendar")}
            >
              Calendar
            </button>

            <button
              className={`btn ${
                view === "lecture" ? "btn-primary" : "btn-secondary"
              }`}
              style={{ width: "100%", marginBottom: "8px" }}
              onClick={() => useStore.getState().setView("lecture")}
            >
              Playback
            </button>
          </div>

          <div
            style={{
              marginTop: "auto",
              padding: "16px",
              background: "var(--surface)",
              borderRadius: "8px",
            }}
          >
            <h4
              style={{
                fontSize: "12px",
                color: "var(--text-secondary)",
                marginBottom: "8px",
              }}
            >
              Quick Import
            </h4>
            <input
              type="text"
              placeholder="Paste Echo360 or Canvas link..."
              onKeyDown={async (e) => {
                if (e.key === 'Enter') {
                  const target = e.target as HTMLInputElement;
                  const url = target.value;
                  if (url.startsWith('http')) {
                    target.value = 'Importing...';
                    try {
                      const { scrapeLectureUrl } = await import('./services/scraper');
                      await scrapeLectureUrl(url, useStore.getState().currentCourse || 'General');
                      target.value = '';
                    } catch (err) {
                      console.error("Import failed:", err);
                      target.value = '';
                    }
                  }
                }
              }}
              style={{
                width: "100%",
                padding: "8px",
                background: "var(--primary)",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                color: "var(--text-primary)",
                fontSize: "12px",
              }}
            />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="content-header">
          <h2>
            {view === "calendar" && "Dashboard"}
            {view === "lecture" && "Now Playing"}
            {view === "study-hub" && "Study Hub"}
          </h2>
        </header>

        <div className="content-body">
          {renderMainContent()}
        </div>
      </main>
    </div>
  );
}

export default App;
