export interface ApiSuccessResponse<T> {
  success: true
  data: T
}

export interface ApiErrorDetail {
  field: string
  message: string
}

export interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: ApiErrorDetail[]
  }
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

export function isApiSuccess<T>(
  response: ApiResponse<T>
): response is ApiSuccessResponse<T> {
  return response.success === true
}

export function isApiError<T>(
  response: ApiResponse<T>
): response is ApiErrorResponse {
  return response.success === false
}
