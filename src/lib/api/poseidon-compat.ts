const LEGACY_POSEIDON_PREFIXES = ["/api/signals", "/api/backtest", "/api/strategies", "/api/autoresearch"] as const;

export function getLegacyPoseidonRetryPath(pathname: string) {
  for (const prefix of LEGACY_POSEIDON_PREFIXES) {
    const matchIndex = pathname.indexOf(prefix);

    if (matchIndex === -1) {
      continue;
    }

    const matchEnd = matchIndex + prefix.length;
    const nextCharacter = pathname[matchEnd];

    if (nextCharacter === undefined || nextCharacter === "/") {
      return `${pathname.slice(0, matchIndex)}${prefix.slice(4)}${pathname.slice(matchEnd)}`;
    }
  }

  return null;
}

export function createPoseidonCompatibilityFetch(fetchImpl: typeof fetch = globalThis.fetch) {
  return async (input: RequestInfo | URL, init?: RequestInit) => {
    const originalRequest = input instanceof Request ? input : new Request(input, init);
    const firstResponse = await fetchImpl(originalRequest.clone());

    if (firstResponse.status !== 404) {
      return firstResponse;
    }

    const originalUrl = new URL(originalRequest.url);
    const retryPath = getLegacyPoseidonRetryPath(originalUrl.pathname);

    if (!retryPath) {
      return firstResponse;
    }

    originalUrl.pathname = retryPath;

    return fetchImpl(new Request(originalUrl, originalRequest));
  };
}

export function isPoseidonNotFoundError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const candidate = error as {
    response?: {
      status?: unknown;
    };
    status?: unknown;
    status_code?: unknown;
  };

  return candidate.status_code === 404 || candidate.status === 404 || candidate.response?.status === 404;
}
