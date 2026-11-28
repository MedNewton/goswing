// preview/api/router.ts — tiny request router for the web preview's fake API.
export type MockRequest = Readonly<{
  method: string;
  path: string;
  query: URLSearchParams;
  params: ReadonlyArray<string>;
  body: unknown;
}>;

export type MockResult = { status?: number; json: unknown } | unknown;

export type MockHandler = Readonly<{
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  /** Matched against the path without query string, e.g. /^\/v1\/events\/([^/]+)$/ */
  path: RegExp;
  handle: (req: MockRequest) => MockResult;
}>;

export function isResult(x: MockResult): x is { status?: number; json: unknown } {
  return typeof x === 'object' && x !== null && 'json' in (x as Record<string, unknown>);
}
