export interface AgentData {
  id: string
  agent_key: string
  display_name?: string
  owner_id?: string
  provider: string
  model: string
  context_window?: number
  max_tool_iterations?: number
  agent_type: 'open' | 'predefined'
  is_default?: boolean
  status?: string // "active" | "summoning" | "summon_failed" | "idle" | "running"
  frontmatter?: string
  other_config?: {
    emoji?: string
    description?: string
    self_evolve?: boolean
    [key: string]: unknown
  }
  tools_config?: Record<string, unknown> | null
  memory_config?: Record<string, unknown> | null
  compaction_config?: Record<string, unknown> | null
  created_at?: string
  updated_at?: string
}

export interface AgentInput {
  agent_key: string
  display_name?: string
  provider: string
  model: string
  agent_type: 'open' | 'predefined'
  is_default?: boolean
  other_config?: Record<string, unknown>
}
