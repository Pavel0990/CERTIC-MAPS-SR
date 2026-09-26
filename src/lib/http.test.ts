import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const { httpStatusFor } = await import('./http');

describe('mapeo de reason a HTTP (DATABASE.md §2.2)', () => {
  it.each([
    ['not_authenticated', 401],
    ['forbidden', 403],
    ['own_request', 403],
    ['not_found', 404],
    ['stale_state', 409],
    ['version_conflict', 409],
    ['rate_limited', 429],
    ['invalid_description', 422],
    ['out_of_area', 422],
    ['bbox_too_large', 422],
  ])('%s → %i', (reason, status) => {
    expect(httpStatusFor(reason)).toBe(status);
  });
});
