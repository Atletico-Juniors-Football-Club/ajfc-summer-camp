import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve(process.cwd(), 'ajfc.sqlite');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_name TEXT NOT NULL,
    parent_phone TEXT,
    parent_email TEXT,
    child_name TEXT NOT NULL,
    child_age INTEGER,
    notes TEXT,
    active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id INTEGER NOT NULL,
    day TEXT NOT NULL,
    time_slot TEXT NOT NULL,
    FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE
  );
`);

export interface Submission {
  id?: number;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  child_name: string;
  child_age: number;
  notes: string;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Availability {
  id?: number;
  submission_id?: number;
  day: string;
  time_slot: string;
}

export interface ChildData extends Submission {
  availability: Availability[];
}

export const insertSubmission = db.prepare(`
  INSERT INTO submissions (parent_name, parent_phone, parent_email, child_name, child_age, notes, active)
  VALUES (@parent_name, @parent_phone, @parent_email, @child_name, @child_age, @notes, 1)
`);

export const updateSubmissionInfo = db.prepare(`
  UPDATE submissions 
  SET parent_name = @parent_name, parent_phone = @parent_phone, parent_email = @parent_email, child_name = @child_name, child_age = @child_age, notes = @notes, updated_at = CURRENT_TIMESTAMP
  WHERE id = @id
`);

export const deleteSubmissionAvailability = db.prepare(`
  DELETE FROM availability WHERE submission_id = @submission_id
`);

export const insertAvailability = db.prepare(`
  INSERT INTO availability (submission_id, day, time_slot)
  VALUES (@submission_id, @day, @time_slot)
`);

export const getSubmissions = db.prepare(`
  SELECT * FROM submissions WHERE active = 1 ORDER BY created_at DESC
`);

export const getSubmissionById = db.prepare(`
  SELECT * FROM submissions WHERE id = ?
`);

export const getAvailabilityBySubmissionId = db.prepare(`
  SELECT * FROM availability WHERE submission_id = ?
`);

export const deactivateSubmission = db.prepare(`
  UPDATE submissions SET active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?
`);

export const deleteSubmission = db.prepare(`
  DELETE FROM submissions WHERE id = ?
`);

// Transaction to save a full submission
export const saveChildData = db.transaction((data: ChildData) => {
  // Option: invalidate existing active submissions for the exact same child name to prevent duplicates causing double counting
  // We'll mark previous as inactive if they have the same child_name
  db.prepare('UPDATE submissions SET active = 0 WHERE LOWER(child_name) = ?').run(data.child_name.toLowerCase());

  const info = insertSubmission.run({
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    parent_email: data.parent_email,
    child_name: data.child_name,
    child_age: data.child_age,
    notes: data.notes || '',
  });

  const submission_id = info.lastInsertRowid as number;

  for (const slot of data.availability) {
    if (slot.day === 'Not available') continue;
    insertAvailability.run({
      submission_id,
      day: slot.day,
      time_slot: slot.time_slot
    });
  }

  return submission_id;
});

// Transaction to update a full submission
export const updateChildData = db.transaction((data: ChildData) => {
  if (!data.id) throw new Error('ID required for update');

  updateSubmissionInfo.run({
    id: data.id,
    parent_name: data.parent_name,
    parent_phone: data.parent_phone,
    parent_email: data.parent_email,
    child_name: data.child_name,
    child_age: data.child_age,
    notes: data.notes || '',
  });

  deleteSubmissionAvailability.run({ submission_id: data.id });

  for (const slot of data.availability) {
    if (slot.day === 'Not available') continue;
    insertAvailability.run({
      submission_id: data.id,
      day: slot.day,
      time_slot: slot.time_slot
    });
  }

  return data.id;
});

export function getAllActiveData(): ChildData[] {
  const subs = getSubmissions.all() as Submission[];
  return subs.map(sub => {
    const avail = getAvailabilityBySubmissionId.all(sub.id) as Availability[];
    return { ...sub, availability: avail };
  });
}

// Optional: Mock data seed logic has been removed as per user request.

export default db;
