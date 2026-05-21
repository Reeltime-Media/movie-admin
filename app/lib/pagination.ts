export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
};

export type PaginationQuery = {
  page?: number;
  pageSize?: number;
  status?: string;
};

export function paginationQuery(params: PaginationQuery = {}): string {
  const search = new URLSearchParams();
  if (params.page != null) search.set("page", String(params.page));
  if (params.pageSize != null) search.set("page_size", String(params.pageSize));
  if (params.status) search.set("status", params.status);
  const q = search.toString();
  return q ? `?${q}` : "";
}

export async function fetchAllPages<T>(
  fetchPage: (page: number, pageSize: number) => Promise<PaginatedResponse<T>>,
  pageSize = 100,
): Promise<T[]> {
  const all: T[] = [];
  let page = 1;
  let pages = 1;
  const maxPages = 100;

  do {
    const res = await fetchPage(page, pageSize);
    all.push(...res.items);
    pages = res.pages;
    page += 1;
  } while (page <= pages && page <= maxPages);

  return all;
}
