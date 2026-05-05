export interface CloudflareEnv {
  DB: D1Database
  IMAGES: R2Bucket
}

export interface R2Bucket {
  put(key: string, value: Uint8Array, options?: R2PutOptions): Promise<void>
  get(key: string): Promise<R2Object | null>
  delete(key: string): Promise<void>
  list(options?: R2ListOptions): Promise<R2Objects>
  bucketName: string
  http: {
    binding: string
  }
}

export interface R2PutOptions {
  httpMetadata?: {
    contentType?: string
    cacheControl?: string
    contentEncoding?: string
    contentLanguage?: string
    contentDisposition?: string
  }
  customMetadata?: Record<string, string>
}

export interface R2Object {
  key: string
  size: number
  httpMetadata?: {
    contentType?: string
  }
  customMetadata?: Record<string, string>
  write: () => ReadableStream
}

export interface R2Objects {
  objects: Array<{
    key: string
    size: number
  }>
  truncated: boolean
}

export interface R2ListOptions {
  limit?: number
  prefix?: string
  cursor?: string
}

export interface D1Database {
  prepare(sql: string): D1PreparedStatement
  batch(statements: D1PreparedStatement[]): Promise<D1Result[]>
  exec(sql: string): Promise<D1Result>
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement
  first<T = unknown>(): Promise<T | null>
  all<T = unknown>(): Promise<{ results: T[]; success: boolean }>
  run(): Promise<D1Result>
}

export interface D1Result {
  success: boolean
  meta: {
    duration: number
    last_row_id: number
    changes: number
    served_by: string
  }
}
