import { Handle, Position, type NodeProps, type Node as FlowNode } from '@xyflow/react'
import type { NodeKind } from './types'

export type NodeData = {
  label: string
  kind: NodeKind
  summary: string
  connectSource?: boolean
}

const kindClass = (kind: NodeKind) => kind.toLowerCase().replace(/\s+/g, '-')

export default function LoreNode({ data, selected }: NodeProps<FlowNode<NodeData>>) {
  return (
    <div className={`lore-node kind-${kindClass(data.kind)} ${selected ? 'is-selected' : ''} ${data.connectSource ? 'is-connect-source' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className="node-label">{data.label || 'Untitled'}</div>
      {data.summary && <div className="node-summary">{data.summary}</div>}
      <Handle type="source" position={Position.Right} />
    </div>
  )
}
