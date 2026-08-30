import type { Page } from "../types";

export const emptyPage = <T,>(): Page<T> => ({
  items: [],
  meta: { page: 1, perPage: 24, total: 0, totalPages: 0 },
});
