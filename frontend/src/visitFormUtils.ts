import type { MedicationInput, SymptomInput, VisitCreate, VisitQuestionInput } from "./types";

export const today = new Date().toISOString().slice(0, 10);

export const emptySymptom = (): SymptomInput => ({
  name: "",
  severity: 5,
  started_on: "",
  frequency: "",
  notes: ""
});

export const emptyMedication = (): MedicationInput => ({
  name: "",
  dosage: "",
  schedule: "",
  reason: ""
});

export const emptyQuestion = (): VisitQuestionInput => ({
  text: "",
  priority: "Normal"
});

export const emptyVisit = (): VisitCreate => ({
  patient_name: "",
  appointment_date: today,
  clinician_type: "Primary care",
  main_concern: "",
  symptoms: [emptySymptom()],
  medications: [emptyMedication()],
  questions: [emptyQuestion()],
  additional_notes: ""
});

export const sampleVisit = (): VisitCreate => {
  const appointmentDate = offsetDate(7);
  const startedOn = offsetDate(-2);

  return {
    patient_name: "Maya Sharma",
    appointment_date: appointmentDate,
    clinician_type: "Primary care",
    main_concern: "Recurring headaches after long workdays",
    symptoms: [
      {
        name: "Headache",
        severity: 7,
        started_on: startedOn,
        frequency: "Most evenings",
        notes: "Improves after sleep"
      },
      {
        name: "Eye strain",
        severity: 5,
        started_on: "",
        frequency: "After screen time",
        notes: "Worse after meetings"
      }
    ],
    medications: [
      {
        name: "Ibuprofen",
        dosage: "200 mg",
        schedule: "As needed",
        reason: "Headache relief"
      }
    ],
    questions: [
      { text: "Should I track screen time or blood pressure?", priority: "High" },
      { text: "When should I follow up?", priority: "Normal" }
    ],
    additional_notes: "No recent injury."
  };
};

function offsetDate(days: number): string {
  const value = new Date();
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

export function buildPayload(form: VisitCreate): VisitCreate {
  return {
    ...form,
    symptoms: form.symptoms
      .filter((symptom) => symptom.name.trim())
      .map((symptom) => ({
        ...symptom,
        started_on: symptom.started_on || undefined
      })),
    medications: form.medications.filter((medication) => medication.name.trim()),
    questions: form.questions.filter((question) => question.text.trim())
  };
}

export function keepAtLeastOne<T>(items: T[], removeIndex: number, createEmpty: () => T): T[] {
  const nextItems = items.filter((_, index) => index !== removeIndex);
  return nextItems.length > 0 ? nextItems : [createEmpty()];
}
