import { api, Paginated } from "@/lib/api";

export interface ListParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  q?: string;
  [filter: string]: string | number | boolean | undefined;
}

export interface CrudService<T = Record<string, unknown>> {
  list(params?: ListParams): Promise<Paginated<T>>;
  get(id: string): Promise<T>;
  create(body: Partial<T>): Promise<T>;
  update(id: string, body: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

export function crud<T = Record<string, unknown>>(prefix: string): CrudService<T> {
  const base = prefix.startsWith("/") ? prefix : `/${prefix}`;
  return {
    list: (params) => api.get<Paginated<T>>(base, { query: params }),
    get: (id) => api.get<T>(`${base}/${id}`),
    create: (body) => api.post<T>(base, body),
    update: (id, body) => api.patch<T>(`${base}/${id}`, body),
    remove: (id) => api.delete<void>(`${base}/${id}`),
  };
}
