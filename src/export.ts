import type { Project } from './types'

export function projectToMarkdown(project: Project): string {
  const nodes = [...project.nodes].sort((a, b) => a.name.localeCompare(b.name))
  const byId = new Map(project.nodes.map((node) => [node.id, node]))
  const lines = [`# ${project.title}`, '', `> Exported from Lore Layer on ${new Date().toLocaleDateString()}`, '']

  for (const node of nodes) {
    lines.push(`## ${node.name}`, '', `**Type:** ${node.kind}`)
    if (node.aliases.length) lines.push(`**Aliases:** ${node.aliases.join(', ')}`)
    if (node.tags.length) lines.push(`**Tags:** ${node.tags.map((tag) => `\`${tag}\``).join(' ')}`)
    if (node.summary) lines.push('', node.summary)
    if (node.notes) lines.push('', node.notes)
    const relationships = project.edges.filter((edge) => edge.from_id === node.id || edge.to_id === node.id)
    if (relationships.length) {
      lines.push('', '### Relationships')
      for (const edge of relationships) {
        const otherId = edge.from_id === node.id ? edge.to_id : edge.from_id
        const other = byId.get(otherId)
        if (!other) continue
        const prefix = edge.from_id === node.id ? '→' : '←'
        lines.push(`- ${prefix} **${edge.label || 'related to'}** ${other.name}`)
      }
    }
    lines.push('', '---', '')
  }

  return lines.join('\n')
}
