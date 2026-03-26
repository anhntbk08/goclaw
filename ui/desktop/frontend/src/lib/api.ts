// HTTP API client for GoClaw REST endpoints

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

class ApiClient {
  private baseUrl: string
  private token: string

  constructor(baseUrl: string, token: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '')
    this.token = token
  }

  private headers(extra?: Record<string, string>): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      'Content-Type': 'application/json',
      'X-GoClaw-User-Id': 'system',
      ...extra,
    }
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    if (!res.ok) {
      let code: string | undefined
      let message = res.statusText
      try {
        const json = (await res.json()) as { error?: { code?: string; message?: string } }
        code = json.error?.code
        message = json.error?.message ?? message
      } catch {
        // non-JSON error body
      }
      throw new ApiError(message, res.status, code)
    }

    if (res.status === 204) return undefined as T
    return res.json() as Promise<T>
  }

  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  async uploadFile(path: string, file: File): Promise<{ url: string }> {
    const url = `${this.baseUrl}${path}`
    const form = new FormData()
    form.append('file', file)

    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}` },
      body: form,
    })

    if (!res.ok) {
      throw new ApiError(`Upload failed: ${res.statusText}`, res.status)
    }
    return res.json() as Promise<{ url: string }>
  }
}

// Singleton
let apiClient: ApiClient | null = null

export function getApiClient(): ApiClient {
  if (!apiClient) throw new Error('ApiClient not initialized — call initApiClient() first')
  return apiClient
}

export function initApiClient(baseUrl: string, token: string): ApiClient {
  apiClient = new ApiClient(baseUrl, token)
  return apiClient
}

export { ApiClient, ApiError }
