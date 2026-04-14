"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Response envelope types (match API conventions from types/api.ts)
// ---------------------------------------------------------------------------

interface ListResponse<T> {
  data: T[];
  meta?: { total: number; limit: number; offset: number };
}

interface SingleResponse<T> {
  data: T;
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export function usePeople(filters?: {
  search?: string;
  sort?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.search) params.set("search", filters.search);
  if (filters?.sort) params.set("sort", filters.sort);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const qs = params.toString();

  return useQuery({
    queryKey: ["people", filters],
    queryFn: () => api.get<ListResponse<unknown>>(`/api/people${qs ? `?${qs}` : ""}`),
  });
}

export function usePerson(id: string | null) {
  return useQuery({
    queryKey: ["person", id],
    queryFn: () => api.get<SingleResponse<unknown>>(`/api/people/${id}`),
    enabled: !!id,
  });
}

export function useCreatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<SingleResponse<unknown>>("/api/people", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useUpdatePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string } & Record<string, unknown>) =>
      api.put<SingleResponse<unknown>>(`/api/people/${id}`, data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["people"] });
      qc.invalidateQueries({ queryKey: ["person", vars.id] });
    },
  });
}

export function useDeletePerson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<SingleResponse<unknown>>(`/api/people/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

export function useMergePeople() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      primaryPersonId: string;
      secondaryPersonId: string;
    }) => api.post<SingleResponse<unknown>>("/api/people/merge", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["people"] }),
  });
}

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------

export function useInteractions(filters?: {
  person_id?: string;
  source?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const params = new URLSearchParams();
  if (filters?.person_id) params.set("person_id", filters.person_id);
  if (filters?.source) params.set("source", filters.source);
  if (filters?.status) params.set("status", filters.status);
  if (filters?.limit) params.set("limit", String(filters.limit));
  if (filters?.offset) params.set("offset", String(filters.offset));
  const qs = params.toString();

  return useQuery({
    queryKey: ["interactions", filters],
    queryFn: () =>
      api.get<ListResponse<unknown>>(
        `/api/interactions${qs ? `?${qs}` : ""}`
      ),
  });
}

export function useInteraction(id: string | null) {
  return useQuery({
    queryKey: ["interaction", id],
    queryFn: () =>
      api.get<SingleResponse<unknown>>(`/api/interactions/${id}`),
    enabled: !!id,
  });
}

// ---------------------------------------------------------------------------
// Insights
// ---------------------------------------------------------------------------

export function useInsights(personId?: string) {
  const qs = personId ? `?person_id=${personId}` : "";
  return useQuery({
    queryKey: ["insights", personId],
    queryFn: () => api.get<SingleResponse<unknown[]>>(`/api/insights${qs}`),
  });
}

export function useGenerateInsight() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { person_id: string; type: string }) =>
      api.post<SingleResponse<unknown>>("/api/insights/generate", data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["insights", vars.person_id] });
      qc.invalidateQueries({ queryKey: ["person", vars.person_id] });
    },
  });
}

// ---------------------------------------------------------------------------
// Disambiguation
// ---------------------------------------------------------------------------

export function useDisambiguationQueue() {
  return useQuery({
    queryKey: ["disambiguation"],
    queryFn: () => api.get<SingleResponse<unknown[]>>("/api/disambiguation"),
  });
}

export function useResolveDisambiguation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: { id: string } & Record<string, unknown>) =>
      api.post<SingleResponse<unknown>>(
        `/api/disambiguation/${id}/resolve`,
        data
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["disambiguation"] });
      qc.invalidateQueries({ queryKey: ["people"] });
    },
  });
}

// ---------------------------------------------------------------------------
// Extracted Details
// ---------------------------------------------------------------------------

export function useExtractedDetails(filters?: {
  person_id?: string;
  interaction_id?: string;
  category?: string;
}) {
  const params = new URLSearchParams();
  if (filters?.person_id) params.set("person_id", filters.person_id);
  if (filters?.interaction_id)
    params.set("interaction_id", filters.interaction_id);
  if (filters?.category) params.set("category", filters.category);
  const qs = params.toString();

  return useQuery({
    queryKey: ["extracted-details", filters],
    queryFn: () =>
      api.get<SingleResponse<unknown[]>>(
        `/api/extracted-details${qs ? `?${qs}` : ""}`
      ),
    enabled: !!(filters?.person_id || filters?.interaction_id),
  });
}

// ---------------------------------------------------------------------------
// User Profile
// ---------------------------------------------------------------------------

export function useUserProfile() {
  return useQuery({
    queryKey: ["user-profile"],
    queryFn: () => api.get<SingleResponse<unknown>>("/api/user/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put<SingleResponse<unknown>>("/api/user/profile", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-profile"] }),
  });
}

export function useUpdateSettings() {
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.put<SingleResponse<unknown>>("/api/user/settings", data),
  });
}
