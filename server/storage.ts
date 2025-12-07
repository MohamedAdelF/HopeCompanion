import { type User, type InsertUser, type Patient, type DiaryEntry, type RiskAssessmentResult, type CareAlert } from "@shared/schema";
import { randomUUID } from "crypto";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Patients
  listPatients(): Promise<Patient[]>;
  getPatient(id: string): Promise<Patient | undefined>;
  upsertPatient(patient: Omit<Patient, "id"> & { id?: string }): Promise<Patient>;

  // Diary
  listDiary(patientId: string): Promise<DiaryEntry[]>;
  addDiary(entry: Omit<DiaryEntry, "id"> & { id?: string }): Promise<DiaryEntry>;

  // Assessments
  addAssessment(result: Omit<RiskAssessmentResult, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<RiskAssessmentResult>;
  listAssessments(patientId: string): Promise<RiskAssessmentResult[]>;

  // Alerts
  listAlerts(): Promise<CareAlert[]>;
  addAlert(alert: Omit<CareAlert, "id" | "createdAt" | "status"> & { id?: string; createdAt?: string; status?: CareAlert["status"] }): Promise<CareAlert>;
  resolveAlert(id: string): Promise<CareAlert | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private patients: Map<string, Patient>;
  private diaryByPatient: Map<string, DiaryEntry[]>;
  private assessmentsByPatient: Map<string, RiskAssessmentResult[]>;
  private alerts: Map<string, CareAlert>;

  constructor() {
    this.users = new Map();
    this.patients = new Map();
    this.diaryByPatient = new Map();
    this.assessmentsByPatient = new Map();
    this.alerts = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async listPatients(): Promise<Patient[]> {
    return Array.from(this.patients.values());
  }

  async getPatient(id: string): Promise<Patient | undefined> {
    return this.patients.get(id);
  }

  async upsertPatient(patient: Omit<Patient, "id"> & { id?: string }): Promise<Patient> {
    const id = patient.id ?? randomUUID();
    const full: Patient = { id, ...patient } as Patient;
    this.patients.set(id, full);
    return full;
  }

  async listDiary(patientId: string): Promise<DiaryEntry[]> {
    return this.diaryByPatient.get(patientId) ?? [];
  }

  async addDiary(entry: Omit<DiaryEntry, "id"> & { id?: string }): Promise<DiaryEntry> {
    const id = entry.id ?? randomUUID();
    const full: DiaryEntry = { id, ...entry } as DiaryEntry;
    const list = this.diaryByPatient.get(full.patientId) ?? [];
    const updated = [full, ...list].sort((a, b) => b.date.localeCompare(a.date));
    this.diaryByPatient.set(full.patientId, updated);
    return full;
  }

  async addAssessment(result: Omit<RiskAssessmentResult, "id" | "createdAt"> & { id?: string; createdAt?: string }): Promise<RiskAssessmentResult> {
    const id = result.id ?? randomUUID();
    const createdAt = result.createdAt ?? new Date().toISOString();
    const full: RiskAssessmentResult = { id, createdAt, ...result } as RiskAssessmentResult;
    const list = this.assessmentsByPatient.get(full.patientId) ?? [];
    const updated = [full, ...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    this.assessmentsByPatient.set(full.patientId, updated);
    // also update cached patient risk level if exists
    const patient = this.patients.get(full.patientId);
    if (patient) {
      this.patients.set(full.patientId, { ...patient, riskLevel: full.level });
    }
    return full;
  }

  async listAssessments(patientId: string): Promise<RiskAssessmentResult[]> {
    return this.assessmentsByPatient.get(patientId) ?? [];
  }

  async listAlerts(): Promise<CareAlert[]> {
    return Array.from(this.alerts.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addAlert(alert: Omit<CareAlert, "id" | "createdAt" | "status"> & { id?: string; createdAt?: string; status?: CareAlert["status"] }): Promise<CareAlert> {
    const id = alert.id ?? randomUUID();
    const createdAt = alert.createdAt ?? new Date().toISOString();
    const status = alert.status ?? "open";
    const full: CareAlert = { id, createdAt, status, ...alert } as CareAlert;
    this.alerts.set(id, full);
    return full;
  }

  async resolveAlert(id: string): Promise<CareAlert | undefined> {
    const a = this.alerts.get(id);
    if (!a) return undefined;
    const updated = { ...a, status: "resolved" } as CareAlert;
    this.alerts.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
