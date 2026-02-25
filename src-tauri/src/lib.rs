use std::fs;
use std::path::PathBuf;
use tauri::Manager;

fn get_documents_path() -> PathBuf {
    dirs::document_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("echo")
        .join("Classes")
}

#[tauri::command]
fn get_base_path() -> Result<String, String> {
    let path = get_documents_path();
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn ensure_course_dir(course_name: &str) -> Result<String, String> {
    let path = get_documents_path().join(course_name);
    fs::create_dir_all(&path).map_err(|e| e.to_string())?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
fn list_courses() -> Result<Vec<String>, String> {
    let base = get_documents_path();
    if !base.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&base).map_err(|e| e.to_string())?;
    let courses: Vec<String> = entries
        .filter_map(|e| e.ok())
        .filter(|e| e.path().is_dir())
        .filter_map(|e| e.file_name().to_str().map(String::from))
        .collect();

    Ok(courses)
}

#[tauri::command]
fn list_lectures(course_name: &str) -> Result<Vec<LectureInfo>, String> {
    let course_dir = get_documents_path().join(course_name);
    if !course_dir.exists() {
        return Ok(vec![]);
    }

    let entries = fs::read_dir(&course_dir).map_err(|e| e.to_string())?;
    let mut lectures: Vec<LectureInfo> = entries
        .filter_map(|e| e.ok())
        .filter(|e| {
            let path = e.path();
            path.is_file() && path.extension().map_or(false, |ext| ext == "webm")
        })
        .filter_map(|e| {
            let path = e.path();
            let name = path.file_stem()?.to_str()?.to_string();
            let parts: Vec<&str> = name.splitn(2, '_').collect();
            if parts.len() >= 1 {
                let filename = name.clone();
                Some(LectureInfo {
                    filename,
                    date: parts[0].to_string(),
                    title: parts.get(1).map(|s| s.to_string()).unwrap_or_default(),
                    path: path.to_string_lossy().to_string(),
                })
            } else {
                None
            }
        })
        .collect();

    lectures.sort_by(|a, b| b.date.cmp(&a.date));
    Ok(lectures)
}

#[derive(serde::Serialize)]
struct LectureInfo {
    filename: String,
    date: String,
    title: String,
    path: String,
}

#[tauri::command]
fn get_lectures_for_date(date: &str) -> Result<Vec<LectureInfo>, String> {
    let base = get_documents_path();
    if !base.exists() {
        return Ok(vec![]);
    }

    let mut all_lectures: Vec<LectureInfo> = vec![];

    for entry in fs::read_dir(&base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            let course_name = entry.file_name().to_string_lossy().to_string();
            let lectures = list_lectures(&course_name)?;
            for lecture in lectures {
                if lecture.date == date {
                    all_lectures.push(LectureInfo {
                        filename: lecture.filename,
                        date: lecture.date,
                        title: format!("{} - {}", course_name, lecture.title),
                        path: lecture.path,
                    });
                }
            }
        }
    }

    all_lectures.sort_by(|a, b| b.filename.cmp(&a.filename));
    Ok(all_lectures)
}

#[tauri::command]
fn get_dates_with_lectures() -> Result<Vec<String>, String> {
    let base = get_documents_path();
    if !base.exists() {
        return Ok(vec![]);
    }

    let mut dates: Vec<String> = vec![];

    for entry in fs::read_dir(&base).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().is_dir() {
            let course_name = entry.file_name().to_string_lossy().to_string();
            let lectures = list_lectures(&course_name)?;
            for lecture in lectures {
                if !dates.contains(&lecture.date) {
                    dates.push(lecture.date);
                }
            }
        }
    }

    Ok(dates)
}

#[tauri::command]
fn write_backend_file(path: &str, contents: Vec<u8>) -> Result<(), String> {
    fs::write(path, contents).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_backend_file(path: &str) -> Result<String, String> {
    fs::read_to_string(path).map_err(|e| e.to_string())
}

#[tauri::command]
fn remove_backend_file(path: &str) -> Result<(), String> {
    if std::path::Path::new(path).exists() {
        fs::remove_file(path).map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            get_base_path,
            ensure_course_dir,
            list_courses,
            list_lectures,
            get_lectures_for_date,
            get_dates_with_lectures,
            write_backend_file,
            read_backend_file,
            remove_backend_file
        ])
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();
            window.set_title("echo - Lecture Recorder").ok();
            window
                .set_size(tauri::Size::Physical(tauri::PhysicalSize {
                    width: 1200,
                    height: 800,
                }))
                .ok();
            window.center().ok();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
