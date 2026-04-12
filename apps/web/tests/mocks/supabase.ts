import { vi } from 'vitest'

export function makeMockClient(resolvedData: unknown, error: unknown = null) {
  const chain = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: resolvedData, error }),
    order: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: resolvedData, error }),
  }
  return {
    from: vi.fn().mockReturnValue(chain),
    _chain: chain,
  }
}

export function makeMultiTableClient(tableResponses: Record<string, { data: unknown; error: unknown }>) {
  function makeChain(response: { data: unknown; error: unknown }) {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue(response),
      order: vi.fn().mockResolvedValue(response),
      or: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(response),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
    }
  }
  return {
    from: vi.fn((table: string) => makeChain(tableResponses[table] ?? { data: [], error: null })),
  }
}
