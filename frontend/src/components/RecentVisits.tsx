import type { VisitListItem } from "../types";

type RecentVisitsProps = {
  visits: VisitListItem[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => void;
  onOpen: (visitId: number) => void;
};

export function RecentVisits({ visits, searchTerm, onSearchChange, onRefresh, onOpen }: RecentVisitsProps) {
  return (
    <section className="recentBlock" aria-labelledby="recent-title">
      <div className="sectionHeader">
        <h2 id="recent-title">Recent</h2>
        <button type="button" className="ghostButton" onClick={onRefresh}>
          Refresh
        </button>
      </div>

      <label className="sidebarSearch">
        <span>Search</span>
        <input value={searchTerm} onChange={(event) => onSearchChange(event.target.value)} />
      </label>

      <div className="recentList">
        {visits.length === 0 ? (
          <p className="muted">No saved visits yet.</p>
        ) : (
          visits.map((visit) => (
            <button type="button" key={visit.id} className="recentItem" onClick={() => onOpen(visit.id)}>
              <span>{visit.patient_name}</span>
              <small>{visit.appointment_date} · {visit.readiness_score}/100 ready</small>
            </button>
          ))
        )}
      </div>
    </section>
  );
}
