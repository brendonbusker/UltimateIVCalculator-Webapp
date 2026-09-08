/** Share in-flight/successful requests, evict failures, and bound session memory. */
export function memoRequest<T>(
  cache: Map<string, Promise<T>>,
  key: string,
  request: () => Promise<T>,
): Promise<T> {
  const existing = cache.get(key);
  if (existing) return existing;
  const pending = request().catch((error: unknown) => {
    if (cache.get(key) === pending) cache.delete(key);
    throw error;
  });
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(key, pending);
  return pending;
}

const jsonCache = new Map<string, Promise<unknown>>();
export function cachedJson<T>(url: string): Promise<T> {
  return memoRequest(jsonCache, url, async () => {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok)
      throw new Error(
        `Could not load data (HTTP ${response.status}). Please retry.`,
      );
    return response.json();
  }) as Promise<T>;
}
