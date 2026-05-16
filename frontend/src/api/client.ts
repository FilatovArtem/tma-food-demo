import { API_URL } from '@/env';
import type { ApiErrorBody } from '@/types/api';

let initDataRaw = '';

export function setInitDataRaw(raw: string): void {
  initDataRaw = raw;
}

export class ApiError extends Error {
  status: number;
  detail: string;

  constructor(status: number, detail: string) {
    super(`API error ${status}: ${detail}`);
    this.status = status;
    this.detail = detail;
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(initDataRaw ? { Authorization: 'tma ' + initDataRaw } : {}),
    ...(opts.headers as Record<string, string> | undefined),
  };

  const response = await fetch(API_URL + path, { ...opts, headers });

  if (!response.ok) {
    let detail = response.statusText;
    try {
      const body = (await response.json()) as ApiErrorBody;
      if (body && typeof body.detail === 'string') {
        detail = body.detail;
      }
    } catch {
      // body wasn't JSON; keep statusText
    }
    throw new ApiError(response.status, detail);
  }

  if (response.status === 204) {
    return undefined as unknown as T;
  }

  return (await response.json()) as T;
}
