export type SymptomInput = {
  name: string;
  severity: number;
  started_on?: string;
  frequency: string;
  notes: string;
};

export type MedicationInput = {
  name: string;
  dosage: string;
  schedule: string;
  reason: string;
};

export type VisitQuestionInput = {
  text: string;
  priority: "High" | "Normal" | "Low";
};

export type VisitCreate = {
  patient_name: string;
  appointment_date: string;
  clinician_type: string;
  main_concern: string;
  symptoms: SymptomInput[];
  medications: MedicationInput[];
  questions: VisitQuestionInput[];
  additional_notes: string;
};

export type VisitReadiness = {
  score: number;
  completed_items: string[];
  missing_items: string[];
  rules: VisitReadinessRule[];
};

export type VisitReadinessRule = {
  key: string;
  label: string;
  points: number;
  status: "complete" | "missing";
};

export type VisitBrief = {
  title: string;
  opening_line: string;
  key_points: string[];
  questions_for_visit: string[];
  preparation_checklist: string[];
  safety_note: string;
  safety_flags: string[];
  readiness: VisitReadiness;
  generated_at: string;
};

export type VisitRecord = {
  id: number;
  payload: VisitCreate;
  brief: VisitBrief;
  created_at: string;
};

export type VisitListItem = {
  id: number;
  patient_name: string;
  appointment_date: string;
  clinician_type: string;
  main_concern: string;
  symptom_count: number;
  question_count: number;
  readiness_score: number;
  created_at: string;
};

export type PrivacyStatus = {
  storage: string;
  analytics_enabled: boolean;
  external_api_calls: boolean;
  notes: string[];
};

export type BriefPanelState =
  | {
      mode: "preview";
      brief: VisitBrief;
    }
  | {
      mode: "saved";
      record: VisitRecord;
    };
