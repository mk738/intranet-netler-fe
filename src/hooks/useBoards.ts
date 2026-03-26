import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import type { ApiResponse } from '@/types'

// ── Types ──────────────────────────────────────────────────────

export interface BoardComment {
  id:         string
  text:       string
  authorName: string
  createdAt:  string
}

export interface BoardCard {
  id:         string
  title:      string
  text:       string
  category:   string
  assignedTo: string | null
  position:   number
  createdAt:  string
  comments:   BoardComment[]
}

export interface BoardColumn {
  id:         string
  title:      string
  colorIndex: number
  position:   number
  cards:      BoardCard[]
}

export interface BoardDto {
  id:      string
  name:    string
  columns: BoardColumn[]
}

// ── Queries ────────────────────────────────────────────────────

export function useBoards() {
  return useQuery({
    queryKey: ['boards'],
    queryFn:  () =>
      api.get<ApiResponse<BoardDto[]>>('/api/boards').then(r => r.data.data),
  })
}

// ── Board mutations ────────────────────────────────────────────

export function useCreateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) =>
      api.post<ApiResponse<BoardDto>>('/api/boards', { name }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useUpdateBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.put<ApiResponse<BoardDto>>(`/api/boards/${id}`, { name }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useDeleteBoard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/boards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

// ── Column mutations ───────────────────────────────────────────

export function useCreateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, title, colorIndex, position }: { boardId: string; title: string; colorIndex: number; position: number }) =>
      api.post<ApiResponse<BoardColumn>>(`/api/boards/${boardId}/columns`, { title, colorIndex, position }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useUpdateColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, columnId, title, colorIndex, position }: { boardId: string; columnId: string; title: string; colorIndex: number; position: number }) =>
      api.put<ApiResponse<BoardColumn>>(`/api/boards/${boardId}/columns/${columnId}`, { title, colorIndex, position }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useDeleteColumn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ boardId, columnId }: { boardId: string; columnId: string }) =>
      api.delete(`/api/boards/${boardId}/columns/${columnId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

// ── Card mutations ─────────────────────────────────────────────

export function useCreateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, title, text, category, assignedTo, position }: { columnId: string; title: string; text: string; category: string; assignedTo: string | null; position: number }) =>
      api.post<ApiResponse<BoardCard>>(`/api/columns/${columnId}/cards`, { title, text, category, assignedTo, position }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useUpdateCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, cardId, title, text, category, assignedTo, position, targetColumnId }: {
      columnId: string; cardId: string; title: string; text: string
      category: string; assignedTo: string | null; position: number; targetColumnId?: string
    }) =>
      api.put<ApiResponse<BoardCard>>(`/api/columns/${columnId}/cards/${cardId}`, {
        title, text, category, assignedTo, position,
        columnId: targetColumnId ?? columnId,
      }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

export function useDeleteCard() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ columnId, cardId }: { columnId: string; cardId: string }) =>
      api.delete(`/api/columns/${columnId}/cards/${cardId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}

// ── Comment mutations ──────────────────────────────────────────

export function useCreateComment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ cardId, text }: { cardId: string; text: string }) =>
      api.post<ApiResponse<BoardComment>>(`/api/cards/${cardId}/comments`, { text }).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['boards'] }),
  })
}
