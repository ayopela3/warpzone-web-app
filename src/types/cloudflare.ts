export interface CloudflareEnv {
  DB: D1Database
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
