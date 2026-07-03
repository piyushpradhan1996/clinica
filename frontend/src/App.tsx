import { FormEvent, useEffect, useMemo, useState } from "react";
import { createVisit, exportVisitUrl, listVisits, previewVisit, readVisit } from "./api";
import type {
  BriefPanelState,
  MedicationInput,
  SymptomInput,
  VisitCreate,
  VisitListItem,
  VisitQuestionInput
} from "./types";

const today = new Date().toISOString().slice(0, 10);

const emptySymptom = (): SymptomInput => ({
  name: "",
  severity: 5,
  started_on: "",
  frequency: "",
  notes: ""
});

const emptyMedication = (): MedicationInput => ({
  name: "",
  dosage: "",
  schedule: "",
  reason: ""
});

const emptyQuestion = (): VisitQuestionInput => ({
  text: "",
  priority: "Normal"
});

const emptyVisit = (): VisitCreate => ({
  patient_name: "",
  appointment_date: today,
  clinician_type: "Primary care",
  main_concern: "",
  symptoms: [emptySymptom()],
  medications: [emptyMedication()],
  questions: [emptyQuestion()],
  additional_notes: ""
});

const sampleVisit = (): VisitCreate => ({
  patient_name: "Maya Sharma",
  appointment_date: "2026-07-12",
  clinician_type: "Primary care",
  main_concern: "Recurring headaches after long workdays",
  symptoms: [
    {
      name: "Headache",
      severity: 7,
      started_on: "2026-07-01",
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
});

function App() {
  const [form, setForm] = useState<VisitCreate>(() => emptyVisit());
  const [activeBrief, setActiveBrief] = useState<BriefPanelState | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitListItem[]>([]);
  const [pendingAction, setPendingAction] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState("");

  const isPreviewing = pendingAction === "preview";
  const isSaving = pendingAction === "save";

  const canSubmit = useMemo(() => {
    return form.patient_name.trim().length > 1 && form.main_concern.trim().length > 7 && form.appointment_date;
  }, [form]);

  useEffect(() => {
    void loadRecentVisits();
  }, []);

  async function loadRecentVisits() {
    try {
      setRecentVisits(await listVisits());
    } catch {
      setRecentVisits([]);
    }
  }

  async function previewBrief() {
    setError("");
    setPendingAction("preview");

    try {
      const brief = await previewVisit(buildPayload(form));
      setActiveBrief({ mode: "preview", brief });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not preview this visit.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveVisit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingAction("save");

    try {
      const record = await createVisit(buildPayload(form));
      setActiveBrief({ mode: "saved", record });
      await loadRecentVisits();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not save this visit.");
    } finally {
      setPendingAction(null);
    }
  }

  async function openVisit(visitId: number) {
    setError("");

    try {
      const record = await readVisit(visitId);
      setActiveBrief({ mode: "saved", record });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not open this visit.");
    }
  }

  return (
    <main className="appShell">
      <aside className="sidebar">
        <div className="brand">
          <img src="/clinica-mark.svg" alt="" className="brandMark" />
          <div>
            <h1>Clinica</h1>
            <p>Visit briefs for better appointments.</p>
          </div>
        </div>

        <section className="recentBlock" aria-labelledby="recent-title">
          <div className="sectionHeader">
            <h2 id="recent-title">Recent</h2>
            <button type="button" className="ghostButton" onClick={loadRecentVisits}>
              Refresh
            </button>
          </div>
          <div className="recentList">
            {recentVisits.length === 0 ? (
              <p className="muted">No saved visits yet.</p>
            ) : (
              recentVisits.map((visit) => (
                <button
                  type="button"
                  key={visit.id}
                  className="recentItem"
                  onClick={() => void openVisit(visit.id)}
                >
                  <span>{visit.patient_name}</span>
                  <small>{visit.appointment_date}</small>
                </button>
              ))
            )}
          </div>
        </section>
      </aside>

      <section className="workspace" aria-label="Visit workspace">
        <form className="visitForm" onSubmit={saveVisit}>
          <div className="formTopline">
            <div>
              <p className="eyebrow">Appointment Prep</p>
              <h2>New Visit Brief</h2>
            </div>
            <div className="actionGroup">
              <button type="button" className="secondaryButton" onClick={() => setForm(sampleVisit())}>
                Load sample
              </button>
              <button
                type="button"
                className="secondaryButton"
                disabled={!canSubmit || pendingAction !== null}
                onClick={previewBrief}
              >
                {isPreviewing ? "Previewing" : "Preview"}
              </button>
              <button
                type="button"
                className="secondaryButton"
                onClick={() => {
                  setForm(emptyVisit());
                  setActiveBrief(null);
                  setError("");
                }}
              >
                Clear
              </button>
              <button type="submit" className="primaryButton" disabled={!canSubmit || isSaving}>
                {isSaving ? "Saving" : "Save brief"}
              </button>
            </div>
          </div>

          {error ? <p className="errorText">{error}</p> : null}

          <div className="formGrid">
            <label>
              <span>Patient name</span>
              <input
                value={form.patient_name}
                onChange={(event) => updateForm("patient_name", event.target.value)}
                required
              />
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

          <DynamicSection title="Symptoms" onAdd={() => setForm({ ...form, symptoms: [...form.symptoms, emptySymptom()] })}>
            {form.symptoms.map((symptom, index) => (
              <div className="entryGrid symptomGrid" key={`symptom-${index}`}>
                <div className="entryHeader">Symptom {index + 1}</div>
                <label>
                  <span>Name</span>
                  <input
                    value={symptom.name}
                    onChange={(event) => updateSymptom(index, "name", event.target.value)}
                  />
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
                  <input
                    value={symptom.frequency}
                    onChange={(event) => updateSymptom(index, "frequency", event.target.value)}
                  />
                </label>
                <label className="wideField">
                  <span>Notes</span>
                  <input value={symptom.notes} onChange={(event) => updateSymptom(index, "notes", event.target.value)} />
                </label>
                <button type="button" className="smallButton" onClick={() => removeSymptom(index)}>
                  Remove
                </button>
              </div>
            ))}
          </DynamicSection>

          <DynamicSection
            title="Medications"
            onAdd={() => setForm({ ...form, medications: [...form.medications, emptyMedication()] })}
          >
            {form.medications.map((medication, index) => (
              <div className="entryGrid medicationGrid" key={`medication-${index}`}>
                <div className="entryHeader">Medication {index + 1}</div>
                <label>
                  <span>Name</span>
                  <input
                    value={medication.name}
                    onChange={(event) => updateMedication(index, "name", event.target.value)}
                  />
                </label>
                <label>
                  <span>Dosage</span>
                  <input
                    value={medication.dosage}
                    onChange={(event) => updateMedication(index, "dosage", event.target.value)}
                  />
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
                  <input
                    value={medication.reason}
                    onChange={(event) => updateMedication(index, "reason", event.target.value)}
                  />
                </label>
                <button type="button" className="smallButton" onClick={() => removeMedication(index)}>
                  Remove
                </button>
              </div>
            ))}
          </DynamicSection>

          <DynamicSection title="Questions" onAdd={() => setForm({ ...form, questions: [...form.questions, emptyQuestion()] })}>
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
                <button type="button" className="smallButton" onClick={() => removeQuestion(index)}>
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

        <BriefPanel state={activeBrief} />
      </section>
    </main>
  );

  function updateForm<Key extends keyof VisitCreate>(key: Key, value: VisitCreate[Key]) {
    setForm({ ...form, [key]: value });
  }

  function updateSymptom<Key extends keyof SymptomInput>(index: number, key: Key, value: SymptomInput[Key]) {
    setForm({
      ...form,
      symptoms: form.symptoms.map((symptom, symptomIndex) =>
        symptomIndex === index ? { ...symptom, [key]: value } : symptom
      )
    });
  }

  function updateMedication<Key extends keyof MedicationInput>(index: number, key: Key, value: MedicationInput[Key]) {
    setForm({
      ...form,
      medications: form.medications.map((medication, medicationIndex) =>
        medicationIndex === index ? { ...medication, [key]: value } : medication
      )
    });
  }

  function updateQuestion<Key extends keyof VisitQuestionInput>(index: number, key: Key, value: VisitQuestionInput[Key]) {
    setForm({
      ...form,
      questions: form.questions.map((question, questionIndex) =>
        questionIndex === index ? { ...question, [key]: value } : question
      )
    });
  }

  function removeSymptom(index: number) {
    setForm({ ...form, symptoms: keepAtLeastOne(form.symptoms, index, emptySymptom) });
  }

  function removeMedication(index: number) {
    setForm({ ...form, medications: keepAtLeastOne(form.medications, index, emptyMedication) });
  }

  function removeQuestion(index: number) {
    setForm({ ...form, questions: keepAtLeastOne(form.questions, index, emptyQuestion) });
  }
}

function DynamicSection({
  title,
  children,
  onAdd
}: {
  title: string;
  children: React.ReactNode;
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

function BriefPanel({ state }: { state: BriefPanelState | null }) {
  if (!state) {
    return (
      <aside className="briefPanel">
        <p className="eyebrow">Brief</p>
        <h2>Ready when previewed or saved</h2>
        <div className="emptyPreview">
          <span>Clinica</span>
        </div>
      </aside>
    );
  }

  const brief = state.mode === "saved" ? state.record.brief : state.brief;

  return (
    <aside className="briefPanel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{state.mode === "saved" ? "Saved Brief" : "Preview Brief"}</p>
          <h2>{brief.title}</h2>
        </div>
        {state.mode === "saved" ? (
          <a className="secondaryButton" href={exportVisitUrl(state.record.id)} target="_blank" rel="noreferrer">
            Export
          </a>
        ) : null}
      </div>

      <p className="openingLine">{brief.opening_line}</p>

      <div className="readinessBlock" aria-label="Visit readiness">
        <div className="readinessTopline">
          <span>Readiness</span>
          <strong>{brief.readiness.score}/100</strong>
        </div>
        <div className="readinessTrack">
          <span style={{ width: `${brief.readiness.score}%` }} />
        </div>
      </div>

      <BriefList title="Key Points" items={brief.key_points} />
      <BriefList title="Questions" items={brief.questions_for_visit} />
      <BriefList title="Checklist" items={brief.preparation_checklist} />
      {brief.readiness.missing_items.length > 0 ? (
        <BriefList title="Useful To Add" items={brief.readiness.missing_items} />
      ) : null}

      <p className="safetyNote">{brief.safety_note}</p>
    </aside>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="briefList">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}

function buildPayload(form: VisitCreate): VisitCreate {
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

function keepAtLeastOne<T>(items: T[], removeIndex: number, createEmpty: () => T): T[] {
  const nextItems = items.filter((_, index) => index !== removeIndex);
  return nextItems.length > 0 ? nextItems : [createEmpty()];
}

export default App;
