import type { VisitBrief, VisitCreate, VisitListItem, VisitRecord } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export async function listVisits(): Promise<VisitListItem[]> {
  return requestJson<VisitListItem[]>("/api/visits");
}

export async function readVisit(visitId: number): Promise<VisitRecord> {
  return requestJson<VisitRecord>(`/api/visits/${visitId}`);
}

export async function previewVisit(payload: VisitCreate): Promise<VisitBrief> {
  return requestJson<VisitBrief>("/api/visits/preview", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function createVisit(payload: VisitCreate): Promise<VisitRecord> {
  return requestJson<VisitRecord>("/api/visits", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function exportVisitUrl(visitId: number): string {
  return `${API_URL}/api/visits/${visitId}/export`;
}

async function requestJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const requestOptions = buildRequestOptions(options);
  const url = `${API_URL}${path}`;
  const response =
    Object.keys(requestOptions).length > 0 ? await fetch(url, requestOptions) : await fetch(url);

  if (!response.ok) {
    throw new Error(await getErrorMessage(response));
  }

  return response.json() as Promise<T>;
}

function buildRequestOptions(options: RequestInit): RequestInit {
  const requestOptions: RequestInit = { ...options };
  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (Array.from(headers.keys()).length > 0) {
    requestOptions.headers = Object.fromEntries(headers.entries());
  } else {
    delete requestOptions.headers;
  }

  return requestOptions;
}

async function getErrorMessage(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { detail?: string };
    if (body.detail) {
      return body.detail;
    }
  } catch {
    return "Clinica could not complete this request.";
  }

  return "Clinica could not complete this request.";
}
