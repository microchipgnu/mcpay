// API Response types
export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  details?: unknown
}

export interface ApiError extends Error {
  status?: number
  details?: unknown
}


