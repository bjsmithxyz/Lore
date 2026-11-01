export const NODE_KINDS = ['Character', 'Place', 'Object', 'Faction', 'Event', 'Concept', 'Custom'] as const
export type NodeKind = (typeof NODE_KINDS)[number] | string

export type Position = { x: number; y: number }

export type LoreNode = {
  id: string
  kind: NodeKind
  name: string
  aliases: string[]
  summary: string
  notes: string
  tags: string[]
  position: Position
  created_at: string
  updated_at: string
}

export type LoreEdge = {
  id: string
  from_id: string
  to_id: string
  label: string
  directed: boolean
  notes: string
  created_at: string
}

export type Project = {
  id: string
  schema_version: number
  title: string
  created_at: string
  updated_at: string
  nodes: LoreNode[]
  edges: LoreEdge[]
}

export type Selection =
  | { type: 'node'; id: string }
  | { type: 'edge'; id: string }
  | null
