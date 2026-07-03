import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import App from "./App";

describe("Clinica app", () => {
  it("renders the visit workspace", async () => {
    mockApi();

    render(<App />);

    expect(screen.getByRole("heading", { name: "Clinica" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "New Visit Brief" })).toBeTruthy();
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/visits"));
    expect(await screen.findByText("Analytics: Off")).toBeTruthy();
  });

  it("adds symptom rows", async () => {
    mockApi();

    render(<App />);
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/visits"));

    fireEvent.click(screen.getByRole("button", { name: "Add symptom" }));

    expect(screen.getByText("Symptom 2")).toBeTruthy();
  });

  it("saves a sample visit and displays the generated brief", async () => {
    mockApi();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Load sample" }));
    fireEvent.click(screen.getByRole("button", { name: "Save brief" }));

    await waitFor(() => {
      expect(screen.getByText("Primary care visit brief for 2026-07-12")).toBeTruthy();
    });
    expect(screen.getByText("Most intense symptom: Headache (7/10), started 2026-07-01, frequency: Most evenings")).toBeTruthy();
    expect(screen.getByText("100/100")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Update brief" })).toBeTruthy();
  });

  it("previews a sample visit without saving it", async () => {
    mockApi();

    render(<App />);
    fireEvent.click(screen.getByRole("button", { name: "Load sample" }));
    fireEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => {
      expect(screen.getByText("Preview Brief")).toBeTruthy();
    });
    expect(fetch).toHaveBeenCalledWith(
      "http://localhost:8000/api/visits/preview",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("opens, duplicates, deletes, and clears visits", async () => {
    mockApi({ visits: [mockVisitListItem()] });

    render(<App />);
    fireEvent.click(await screen.findByRole("button", { name: /Maya Sharma/ }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Edit Visit Brief" })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole("button", { name: "Duplicate" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/visits/1/duplicate", expect.anything()));

    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/visits/2", expect.anything()));

    fireEvent.click(screen.getByRole("button", { name: "Clear all data" }));
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("http://localhost:8000/api/visits", expect.objectContaining({ method: "DELETE" })));
  });
});

function mockApi({ visits = [] }: { visits?: unknown[] } = {}) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);

      if (url.endsWith("/api/privacy")) {
        return jsonResponse({
          storage: "Local SQLite database configured by CLINICA_DB_PATH.",
          analytics_enabled: false,
          external_api_calls: false,
          notes: ["No external API calls"]
        });
      }

      if (url.endsWith("/api/visits/preview") && init?.method === "POST") {
        return jsonResponse(mockBrief());
      }

      if (url.endsWith("/api/visits") && init?.method === "POST") {
        const payload = JSON.parse(String(init.body));
        return jsonResponse({
          id: 1,
          payload,
          created_at: "2026-07-03T09:00:00Z",
          brief: mockBrief()
        });
      }

      if (url.match(/\/api\/visits\/\d+$/) && init?.method === "PUT") {
        const payload = JSON.parse(String(init.body));
        return jsonResponse({
          id: 1,
          payload,
          created_at: "2026-07-03T09:00:00Z",
          brief: mockBrief()
        });
      }

      if (url.endsWith("/api/visits/1/duplicate") && init?.method === "POST") {
        return jsonResponse({ ...mockRecord(), id: 2 });
      }

      if (url.match(/\/api\/visits\/\d+$/) && init?.method === "DELETE") {
        return jsonResponse({ deleted_count: 1 });
      }

      if (url.endsWith("/api/visits") && init?.method === "DELETE") {
        return jsonResponse({ deleted_count: 1 });
      }

      if (url.endsWith("/api/visits/1")) {
        return jsonResponse(mockRecord());
      }

      if (url.endsWith("/api/visits")) {
        return jsonResponse(visits);
      }

      return jsonResponse({}, 404);
    })
  );
}

function mockBrief() {
  return {
    title: "Primary care visit brief for 2026-07-12",
    opening_line: "Maya Sharma is preparing to discuss: Recurring headaches after long workdays",
    key_points: [
      "Main concern: Recurring headaches after long workdays",
      "Most intense symptom: Headache (7/10), started 2026-07-01, frequency: Most evenings"
    ],
    questions_for_visit: ["Should I track screen time or blood pressure?"],
    preparation_checklist: ["Track symptom timing, severity, triggers, and what helps before the visit."],
    safety_note: "This brief is for appointment preparation only and does not replace medical advice.",
    safety_flags: [],
    readiness: {
      score: 100,
      completed_items: ["Questions are ready for the appointment."],
      missing_items: [],
      rules: [
        {
          key: "questions_ready",
          label: "Questions are ready for the appointment.",
          points: 15,
          status: "complete"
        }
      ]
    },
    generated_at: "2026-07-03T09:00:00Z"
  };
}

function mockRecord() {
  return {
    id: 1,
    payload: {
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
      questions: [{ text: "Should I track screen time or blood pressure?", priority: "High" }],
      additional_notes: "No recent injury."
    },
    brief: mockBrief(),
    created_at: "2026-07-03T09:00:00Z"
  };
}

function mockVisitListItem() {
  return {
    id: 1,
    patient_name: "Maya Sharma",
    appointment_date: "2026-07-12",
    clinician_type: "Primary care",
    main_concern: "Recurring headaches after long workdays",
    symptom_count: 1,
    question_count: 1,
    readiness_score: 100,
    created_at: "2026-07-03T09:00:00Z"
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
