import { exportVisitUrl } from "../api";
import type { BriefPanelState, VisitBrief } from "../types";

type BriefPanelProps = {
  state: BriefPanelState | null;
  onDuplicate: () => void;
  onDelete: () => void;
};

export function BriefPanel({ state, onDuplicate, onDelete }: BriefPanelProps) {
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
      <ReadinessBlock brief={brief} />

      <BriefList title="Key Points" items={brief.key_points} />
      <BriefList title="Questions" items={brief.questions_for_visit} />
      <BriefList title="Checklist" items={brief.preparation_checklist} />
      {brief.readiness.missing_items.length > 0 ? (
        <BriefList title="Useful To Add" items={brief.readiness.missing_items} />
      ) : null}

      {brief.safety_flags.length > 0 ? <BriefList title="Safety Flags" items={brief.safety_flags} /> : null}
      <p className="safetyNote">{brief.safety_note}</p>

      {state.mode === "saved" ? (
        <div className="briefActions">
          <button type="button" className="secondaryButton" onClick={onDuplicate}>
            Duplicate
          </button>
          <button type="button" className="smallButton" onClick={onDelete}>
            Delete
          </button>
        </div>
      ) : null}
    </aside>
  );
}

function ReadinessBlock({ brief }: { brief: VisitBrief }) {
  return (
    <div className="readinessBlock" aria-label="Visit readiness">
      <div className="readinessTopline">
        <span>Readiness</span>
        <strong>{brief.readiness.score}/100</strong>
      </div>
      <div className="readinessTrack">
        <span style={{ width: `${brief.readiness.score}%` }} />
      </div>
      <div className="ruleList">
        {brief.readiness.rules.map((rule) => (
          <span key={rule.key} className={rule.status === "complete" ? "ruleComplete" : "ruleMissing"}>
            {rule.label}
          </span>
        ))}
      </div>
    </div>
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
