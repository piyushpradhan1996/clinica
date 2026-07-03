import type { FormEvent, ReactNode } from "react";
import type { MedicationInput, SymptomInput, VisitCreate, VisitQuestionInput } from "../types";
import {
  emptyMedication,
  emptyQuestion,
  emptySymptom,
  sampleVisit,
  keepAtLeastOne
} from "../visitFormUtils";

type VisitFormProps = {
  form: VisitCreate;
  editingVisitId: number | null;
  pendingAction: "preview" | "save" | null;
  canSubmit: boolean;
  error: string;
  onChange: (form: VisitCreate) => void;
  onPreview: () => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export function VisitForm({
  form,
  editingVisitId,
  pendingAction,
  canSubmit,
  error,
  onChange,
  onPreview,
  onSave,
  onClear
}: VisitFormProps) {
  const isPreviewing = pendingAction === "preview";
  const isSaving = pendingAction === "save";

  function updateForm<Key extends keyof VisitCreate>(key: Key, value: VisitCreate[Key]) {
    onChange({ ...form, [key]: value });
  }

  function updateSymptom<Key extends keyof SymptomInput>(index: number, key: Key, value: SymptomInput[Key]) {
    onChange({
      ...form,
      symptoms: form.symptoms.map((symptom, symptomIndex) =>
        symptomIndex === index ? { ...symptom, [key]: value } : symptom
      )
    });
  }

  function updateMedication<Key extends keyof MedicationInput>(index: number, key: Key, value: MedicationInput[Key]) {
    onChange({
      ...form,
      medications: form.medications.map((medication, medicationIndex) =>
        medicationIndex === index ? { ...medication, [key]: value } : medication
      )
    });
  }

  function updateQuestion<Key extends keyof VisitQuestionInput>(index: number, key: Key, value: VisitQuestionInput[Key]) {
    onChange({
      ...form,
      questions: form.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [key]: value } : question
      )
    });
  }

  return (
    <form className="visitForm" onSubmit={onSave}>
      <div className="formTopline">
        <div>
          <p className="eyebrow">Appointment Prep</p>
          <h2>{editingVisitId ? "Edit Visit Brief" : "New Visit Brief"}</h2>
        </div>
        <div className="actionGroup">
          <button type="button" className="secondaryButton" onClick={() => onChange(sampleVisit())}>
            Load sample
          </button>
          <button
            type="button"
            className="secondaryButton"
            disabled={!canSubmit || pendingAction !== null}
            onClick={onPreview}
          >
            {isPreviewing ? "Previewing" : "Preview"}
          </button>
          <button type="button" className="secondaryButton" onClick={onClear}>
            Clear
          </button>
          <button type="submit" className="primaryButton" disabled={!canSubmit || isSaving}>
            {isSaving ? "Saving" : editingVisitId ? "Update brief" : "Save brief"}
          </button>
        </div>
      </div>

      {error ? <p className="errorText">{error}</p> : null}

      <div className="formGrid">
        <label>
          <span>Patient name</span>
          <input value={form.patient_name} onChange={(event) => updateForm("patient_name", event.target.value)} required />
        </label>
        <label>
          <span>Appointment date</span>
          <input
            type="date"
            value={form.appointment_date}
            onChange={(event) => updateForm("appointment_date", event.target.value)}
            required
          />
        </label>
        <label>
          <span>Clinician type</span>
          <select value={form.clinician_type} onChange={(event) => updateForm("clinician_type", event.target.value)}>
            <option>Primary care</option>
            <option>Specialist</option>
            <option>Urgent care</option>
            <option>Therapist</option>
            <option>Dentist</option>
          </select>
        </label>
      </div>

      <label>
        <span>Main concern</span>
        <textarea
          value={form.main_concern}
          onChange={(event) => updateForm("main_concern", event.target.value)}
          rows={3}
          required
        />
      </label>

      <DynamicSection title="Symptoms" onAdd={() => onChange({ ...form, symptoms: [...form.symptoms, emptySymptom()] })}>
        {form.symptoms.map((symptom, index) => (
          <div className="entryGrid symptomGrid" key={`symptom-${index}`}>
            <div className="entryHeader">Symptom {index + 1}</div>
            <label>
              <span>Name</span>
              <input value={symptom.name} onChange={(event) => updateSymptom(index, "name", event.target.value)} />
            </label>
            <label>
              <span>Severity</span>
              <input
                type="number"
                min={1}
                max={10}
                value={symptom.severity}
                onChange={(event) => updateSymptom(index, "severity", Number(event.target.value))}
              />
            </label>
            <label>
              <span>Started</span>
              <input
                type="date"
                value={symptom.started_on ?? ""}
                onChange={(event) => updateSymptom(index, "started_on", event.target.value)}
              />
            </label>
            <label>
              <span>Frequency</span>
              <input value={symptom.frequency} onChange={(event) => updateSymptom(index, "frequency", event.target.value)} />
            </label>
            <label className="wideField">
              <span>Notes</span>
              <input value={symptom.notes} onChange={(event) => updateSymptom(index, "notes", event.target.value)} />
            </label>
            <button
              type="button"
              className="smallButton"
              onClick={() => onChange({ ...form, symptoms: keepAtLeastOne(form.symptoms, index, emptySymptom) })}
            >
              Remove
            </button>
          </div>
        ))}
      </DynamicSection>

      <DynamicSection
        title="Medications"
        onAdd={() => onChange({ ...form, medications: [...form.medications, emptyMedication()] })}
      >
        {form.medications.map((medication, index) => (
          <div className="entryGrid medicationGrid" key={`medication-${index}`}>
            <div className="entryHeader">Medication {index + 1}</div>
            <label>
              <span>Name</span>
              <input value={medication.name} onChange={(event) => updateMedication(index, "name", event.target.value)} />
            </label>
            <label>
              <span>Dosage</span>
              <input value={medication.dosage} onChange={(event) => updateMedication(index, "dosage", event.target.value)} />
            </label>
            <label>
              <span>Schedule</span>
              <input
                value={medication.schedule}
                onChange={(event) => updateMedication(index, "schedule", event.target.value)}
              />
            </label>
            <label>
              <span>Reason</span>
              <input value={medication.reason} onChange={(event) => updateMedication(index, "reason", event.target.value)} />
            </label>
            <button
              type="button"
              className="smallButton"
              onClick={() => onChange({ ...form, medications: keepAtLeastOne(form.medications, index, emptyMedication) })}
            >
              Remove
            </button>
          </div>
        ))}
      </DynamicSection>

      <DynamicSection title="Questions" onAdd={() => onChange({ ...form, questions: [...form.questions, emptyQuestion()] })}>
        {form.questions.map((question, index) => (
          <div className="entryGrid questionGrid" key={`question-${index}`}>
            <div className="entryHeader">Question {index + 1}</div>
            <label className="wideField">
              <span>Question</span>
              <input value={question.text} onChange={(event) => updateQuestion(index, "text", event.target.value)} />
            </label>
            <label>
              <span>Priority</span>
              <select
                value={question.priority}
                onChange={(event) => updateQuestion(index, "priority", event.target.value as VisitQuestionInput["priority"])}
              >
                <option>High</option>
                <option>Normal</option>
                <option>Low</option>
              </select>
            </label>
            <button
              type="button"
              className="smallButton"
              onClick={() => onChange({ ...form, questions: keepAtLeastOne(form.questions, index, emptyQuestion) })}
            >
              Remove
            </button>
          </div>
        ))}
      </DynamicSection>

      <label>
        <span>Additional notes</span>
        <textarea
          value={form.additional_notes}
          onChange={(event) => updateForm("additional_notes", event.target.value)}
          rows={3}
        />
      </label>
    </form>
  );
}

function DynamicSection({
  title,
  children,
  onAdd
}: {
  title: string;
  children: ReactNode;
  onAdd: () => void;
}) {
  return (
    <section className="dynamicSection" aria-labelledby={`${title.toLowerCase()}-title`}>
      <div className="sectionHeader">
        <h3 id={`${title.toLowerCase()}-title`}>{title}</h3>
        <button type="button" className="secondaryButton" onClick={onAdd}>
          Add {title.slice(0, -1).toLowerCase()}
        </button>
      </div>
      <div className="entryStack">{children}</div>
    </section>
  );
}
