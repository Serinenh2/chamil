import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rest } from '@/services/api'

/** Liste paginée d'une ressource REST. */
export function useList(resource, params = {}, options = {}) {
  return useQuery({
    queryKey: [resource, params],
    queryFn: () => rest.list(resource, params),
    ...options,
  })
}

/** Détail d'un enregistrement. */
export function useDetail(resource, id, options = {}) {
  return useQuery({
    queryKey: [resource, id],
    queryFn: () => rest.get(resource, id),
    enabled: !!id,
    ...options,
  })
}

/** Création / mise à jour avec invalidation automatique du cache. */
export function useSave(resource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }) =>
      id ? rest.update(resource, id, payload) : rest.create(resource, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  })
}

export function useRemove(resource) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id) => rest.remove(resource, id),
    onSuccess: () => qc.invalidateQueries({ queryKey: [resource] }),
  })
}

/** Action métier (valider, transformer, appliquer au stock…). */
export function useAction(invalidate = []) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ path, payload }) => rest.action(path, payload),
    onSuccess: () => invalidate.forEach((key) => qc.invalidateQueries({ queryKey: [key] })),
  })
}

/** Endpoint personnalisé (tableaux de bord, agrégats). */
export function useEndpoint(path, params = {}, options = {}) {
  return useQuery({
    queryKey: [path, params],
    queryFn: () => rest.fetch(path, params),
    ...options,
  })
}
