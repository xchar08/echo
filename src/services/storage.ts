import { readTextFile, writeTextFile, remove } from '@tauri-apps/plugin-fs';
import type { Lecture } from '../types';
import { invoke } from '@tauri-apps/api/core';

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
