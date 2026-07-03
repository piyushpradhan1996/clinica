import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  clearVisits,
  createVisit,
  deleteVisit,
  duplicateVisit,
  getPrivacyStatus,
  listVisits,
  previewVisit,
  readVisit,
  updateVisit
} from "./api";
import { BriefPanel } from "./components/BriefPanel";
import { PrivacyNotice } from "./components/PrivacyNotice";
import { RecentVisits } from "./components/RecentVisits";
import { VisitForm } from "./components/VisitForm";
import type { BriefPanelState, PrivacyStatus, VisitCreate, VisitListItem } from "./types";
import { buildPayload, emptyVisit } from "./visitFormUtils";

function App() {
  const [form, setForm] = useState<VisitCreate>(() => emptyVisit());
  const [activeBrief, setActiveBrief] = useState<BriefPanelState | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<number | null>(null);
  const [recentVisits, setRecentVisits] = useState<VisitListItem[]>([]);
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [pendingAction, setPendingAction] = useState<"preview" | "save" | null>(null);
  const [error, setError] = useState("");

  const canSubmit = useMemo(() => {
    return form.patient_name.trim().length > 1 && form.main_concern.trim().length > 7 && Boolean(form.appointment_date);
  }, [form]);

  const loadRecentVisits = useCallback(async () => {
    try {
      setRecentVisits(await listVisits(searchTerm));
    } catch {
      setRecentVisits([]);
    }
  }, [searchTerm]);

  useEffect(() => {
    void loadRecentVisits();
  }, [loadRecentVisits]);

  useEffect(() => {
    async function loadPrivacyStatus() {
      try {
        setPrivacyStatus(await getPrivacyStatus());
      } catch {
        setPrivacyStatus(null);
      }
    }

    void loadPrivacyStatus();
  }, []);

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
      const payload = buildPayload(form);
      const record = editingVisitId ? await updateVisit(editingVisitId, payload) : await createVisit(payload);
      setActiveBrief({ mode: "saved", record });
      setEditingVisitId(record.id);
      setForm(record.payload);
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
      setEditingVisitId(record.id);
      setForm(record.payload);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not open this visit.");
    }
  }

  async function duplicateActiveVisit() {
    if (activeBrief?.mode !== "saved") {
      return;
    }

    setError("");

    try {
      const record = await duplicateVisit(activeBrief.record.id);
      setActiveBrief({ mode: "saved", record });
      setEditingVisitId(record.id);
      setForm(record.payload);
      await loadRecentVisits();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not duplicate this visit.");
    }
  }

  async function deleteActiveVisit() {
    if (activeBrief?.mode !== "saved") {
      return;
    }

    setError("");

    try {
      await deleteVisit(activeBrief.record.id);
      resetWorkspace();
      await loadRecentVisits();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not delete this visit.");
    }
  }

  async function clearAllData() {
    setError("");

    try {
      await clearVisits();
      resetWorkspace();
      await loadRecentVisits();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Clinica could not clear saved visits.");
    }
  }

  function resetWorkspace() {
    setForm(emptyVisit());
    setActiveBrief(null);
    setEditingVisitId(null);
    setError("");
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

        <RecentVisits
          visits={recentVisits}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={loadRecentVisits}
          onOpen={(visitId) => void openVisit(visitId)}
        />

        <PrivacyNotice status={privacyStatus} onClearAll={() => void clearAllData()} />
      </aside>

      <section className="workspace" aria-label="Visit workspace">
        <VisitForm
          form={form}
          editingVisitId={editingVisitId}
          pendingAction={pendingAction}
          canSubmit={canSubmit}
          error={error}
          onChange={setForm}
          onPreview={() => void previewBrief()}
          onSave={saveVisit}
          onClear={resetWorkspace}
        />

        <BriefPanel
          state={activeBrief}
          onDuplicate={() => void duplicateActiveVisit()}
          onDelete={() => void deleteActiveVisit()}
        />
      </section>
    </main>
  );
}

export default App;
