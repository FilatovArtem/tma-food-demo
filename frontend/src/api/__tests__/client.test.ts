import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, request, setInitDataRaw } from '../client';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  setInitDataRaw('');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('request', () => {
  it('returns parsed JSON on success', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(200, { id: 1, name: 'Pizza' })),
    );
    const result = await request<{ id: number; name: string }>('/dishes/1');
    expect(result).toEqual({ id: 1, name: 'Pizza' });
  });

  it('returns undefined for a 204 response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    const result = await request<void>('/orders/1', { method: 'DELETE' });
    expect(result).toBeUndefined();
  });

  it('throws ApiError with the detail from a JSON error body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(401, { detail: 'init data expired' })),
    );
    await expect(request('/orders')).rejects.toMatchObject({
      status: 401,
      detail: 'init data expired',
    });
  });

  it('falls back to statusText when the error body is not JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('<html>502</html>', { status: 502, statusText: 'Bad Gateway' }),
      ),
    );
    await expect(request('/orders')).rejects.toMatchObject({
      status: 502,
      detail: 'Bad Gateway',
    });
  });

  it('rejects with an instance of ApiError, not a generic Error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(jsonResponse(500, { detail: 'boom' })),
    );
    await expect(request('/orders')).rejects.toBeInstanceOf(ApiError);
  });

  it('sends an Authorization header once initDataRaw is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    setInitDataRaw('user=abc&hash=def');
    await request('/categories');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBe('tma user=abc&hash=def');
  });

  it('omits the Authorization header when initDataRaw is empty', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal('fetch', fetchMock);

    await request('/categories');

    const [, opts] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = opts.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});
