import type { PrivacyStatus } from "../types";

type PrivacyNoticeProps = {
  status: PrivacyStatus | null;
  onClearAll: () => void;
};

export function PrivacyNotice({ status, onClearAll }: PrivacyNoticeProps) {
  return (
    <section className="privacyBlock" aria-labelledby="privacy-title">
      <div className="sectionHeader">
        <h2 id="privacy-title">Privacy</h2>
      </div>
      <p>{status?.storage ?? "Local storage status unavailable."}</p>
      <div className="privacyFacts">
        <span>Analytics: {status?.analytics_enabled ? "On" : "Off"}</span>
        <span>External calls: {status?.external_api_calls ? "On" : "Off"}</span>
      </div>
      <button type="button" className="ghostButton dangerGhost" onClick={onClearAll}>
        Clear all data
      </button>
    </section>
  );
}
