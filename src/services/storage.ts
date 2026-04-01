import { readTextFile, writeTextFile, remove, copyFile } from '@tauri-apps/plugin-fs';
import type { Lecture } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { downloadDir, join } from '@tauri-apps/api/path';

export async function saveLectureMetadata(lecture: Lecture): Promise<void> {
  try {
    const basePath = await invoke<string>('get_base_path');
    const filename = lecture.audioPath.substring(lecture.audioPath.lastIndexOf('\\') + 1).replace('.webm', '');
    const jsonPath = `${basePath}\\${lecture.courseName}\\${filename}.json`;
    
    const dataToWrite = JSON.stringify(lecture, null, 2);
    await writeTextFile(jsonPath, dataToWrite);
  } catch (error) {
    console.error("Failed to save lecture metadata:", error);
  }
}

export async function loadLectureMetadata(audioPath: string, courseName: string): Promise<Lecture | null> {
  try {
    const basePath = await invoke<string>('get_base_path');
    const filename = audioPath.substring(audioPath.lastIndexOf('\\') + 1).replace('.webm', '');
    const jsonPath = `${basePath}\\${courseName}\\${filename}.json`;
    
    try {
      const content = await readTextFile(jsonPath);
      return JSON.parse(content) as Lecture;
    } catch (e) {
      return null;
    }
  } catch (error) {
    console.error("Failed to load lecture metadata:", error);
    return null;
  }
}

export async function deleteLectureFiles(audioPath: string, courseName: string): Promise<void> {
  try {
    const basePath = await invoke<string>('get_base_path');
    const filename = audioPath.substring(audioPath.lastIndexOf('\\') + 1).replace('.webm', '');
    
    try {
      await remove(`${basePath}\\${courseName}\\${filename}.json`);
    } catch(e) { /* ignore */ }
    
    try {
      await remove(`${basePath}\\${courseName}\\${filename}.webm`);
    } catch(e) { /* ignore */ }
    
  } catch (error) {
    console.error("Failed to delete lecture files:", error);
  }
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_');
}

export async function exportTranscript(lecture: Lecture): Promise<string> {
  try {
    const downloads = await downloadDir();
    const safeTitle = sanitizeFilename(lecture.title);
    const fileName = `${lecture.date}_${safeTitle}_Transcript.txt`;
    const destination = await join(downloads, fileName);
    
    await writeTextFile(destination, lecture.transcript || "");
    return fileName;
  } catch (error) {
    console.error("Failed to export transcript:", error);
    throw error;
  }
}

export async function exportNotes(lecture: Lecture): Promise<string> {
  try {
    const downloads = await downloadDir();
    const safeTitle = sanitizeFilename(lecture.title);
    const fileName = `${lecture.date}_${safeTitle}_Notes.md`;
    const destination = await join(downloads, fileName);
    
    await writeTextFile(destination, lecture.aiNotes || "");
    return fileName;
  } catch (error) {
    console.error("Failed to export notes:", error);
    throw error;
  }
}

export async function exportAudio(lecture: Lecture): Promise<string> {
  try {
    const downloads = await downloadDir();
    const safeTitle = sanitizeFilename(lecture.title);
    const extension = lecture.audioPath.split('.').pop() || 'webm';
    const fileName = `${lecture.date}_${safeTitle}_Audio.${extension}`;
    const destination = await join(downloads, fileName);
    
    await copyFile(lecture.audioPath, destination);
    return fileName;
  } catch (error) {
    console.error("Failed to export audio:", error);
    throw error;
  }
}
