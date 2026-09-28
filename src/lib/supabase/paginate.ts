const PAGE_SIZE = 1000;

/**
 * The API returns at most 1000 rows per request, whatever `.limit()` asks
 * for — a `.limit(5000)` silently comes back as 1000 rows. Anything that
 * needs a longer series has to read it page by page with a deterministic
 * order (callers must order by a unique key), which is what this does.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<{ data: T[] | null }>,
  maxRows = Number.POSITIVE_INFINITY,
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; rows.length < maxRows; from += PAGE_SIZE) {
    const { data } = await page(from, from + PAGE_SIZE - 1);
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;
  }
  return rows.length > maxRows ? rows.slice(0, maxRows) : rows;
}
