export interface AgentData {
  id: string
  agent_key: string
  display_name?: string
  provider: string
  model: string
  agent_type: string
  is_default?: boolean
  other_config?: Record<string, unknown>
}
