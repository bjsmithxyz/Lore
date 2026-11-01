import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type Connection,
  type Edge as FlowEdge,
  type Node as FlowNode,
} from '@xyflow/react'
import LoreNode, { type NodeData } from './LoreNode'
import { downloadFile, listProjects, loadProject, saveProject } from './persistence'
import { projectToMarkdown } from './export'
import { NODE_KINDS, type LoreEdge, type LoreNode as LoreNodeModel, type NodeKind, type Project, type Selection } from './types'

const nodeTypes = { lore: LoreNode }
const THEMES = [
  { id: 'dracula', label: 'Dracula' },
  { id: 'cursor', label: 'Cursor' },
  { id: 'claude', label: 'Claude' },
  { id: 'catppuccin', label: 'Catppuccin' },
  { id: 'tokyo-night', label: 'Tokyo Night' },
  { id: 'nord', label: 'Nord' },
  { id: 'gruvbox', label: 'Gruvbox' },
  { id: 'one-dark', label: 'One Dark' },
] as const
const now = () => new Date().toISOString()
const uid = () => crypto.randomUUID()

function createProject(title = 'Untitled story world'): Project {
  const timestamp = now()
  return {
    id: uid(),
    schema_version: 1,
    title,
    created_at: timestamp,
    updated_at: timestamp,
    nodes: [],
    edges: [],
  }
}

function toFlowNodes(nodes: LoreNodeModel[], visibleIds: Set<string>, selected: Selection, connectSourceId: string | null): FlowNode<NodeData>[] {
  return nodes
    .filter((node) => visibleIds.has(node.id))
    .map((node) => ({
      id: node.id,
      type: 'lore',
      position: node.position,
      data: { label: node.name, kind: node.kind, summary: node.summary, connectSource: node.id === connectSourceId },
      selected: selected?.type === 'node' && selected.id === node.id,
    }))
}

function toFlowEdges(edges: LoreEdge[], visibleIds: Set<string>, selected: Selection, showRelationshipLabels: boolean): FlowEdge[] {
  return edges
    .filter((edge) => visibleIds.has(edge.from_id) && visibleIds.has(edge.to_id))
    .map((edge) => ({
      id: edge.id,
      source: edge.from_id,
      target: edge.to_id,
      label: showRelationshipLabels ? edge.label || 'related to' : undefined,
      animated: selected?.type === 'edge' && selected.id === edge.id,
      markerEnd: edge.directed ? { type: 'arrowclosed' as const, color: '#d8a85b' } : undefined,
      style: { stroke: selected?.type === 'edge' && selected.id === edge.id ? '#d8a85b' : '#52616b', strokeWidth: selected?.type === 'edge' && selected.id === edge.id ? 2.5 : 1.5 },
      labelStyle: { fill: '#d7dee2', fontSize: 11, fontWeight: 600 },
      labelBgStyle: { fill: '#1a2226', fillOpacity: 0.9 },
    }))
}

function App() {
  const [project, setProject] = useState<Project>(createProject)
  const [hydrated, setHydrated] = useState(false)
  const [selection, setSelection] = useState<Selection>(null)
  const [query, setQuery] = useState('')
  const [kindFilter, setKindFilter] = useState('All types')
  const [focusId, setFocusId] = useState<string | null>(null)
  const [quickKind, setQuickKind] = useState<NodeKind>('Character')
  const [quickKindOpen, setQuickKindOpen] = useState(false)
  const [history, setHistory] = useState<Project[]>([])
  const [future, setFuture] = useState<Project[]>([])
  const [connectMode, setConnectMode] = useState(false)
  const [connectSourceId, setConnectSourceId] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [nodeBackgrounds, setNodeBackgrounds] = useState(() => localStorage.getItem('lore-node-backgrounds') !== 'false')
  const [showRelationshipLabels, setShowRelationshipLabels] = useState(() => localStorage.getItem('lore-relationship-labels') !== 'false')
  const [snapToGrid, setSnapToGrid] = useState(() => localStorage.getItem('lore-snap-to-grid') === 'true')
  const [confirmDeletes, setConfirmDeletes] = useState(() => localStorage.getItem('lore-confirm-deletes') === 'true')
  const [reduceMotion, setReduceMotion] = useState(() => localStorage.getItem('lore-reduce-motion') === 'true')
  const [autosaveDelay, setAutosaveDelay] = useState(() => Number(localStorage.getItem('lore-autosave-delay') || '350'))
  const [themeOpen, setThemeOpen] = useState(false)
  const [showSettingsPanel, setShowSettingsPanel] = useState(false)
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('lore-theme')
    return saved && THEMES.some((candidate) => candidate.id === saved) ? saved : 'dracula'
  })
  const [brandAnimation, setBrandAnimation] = useState('')
  const [brandAnimationKey, setBrandAnimationKey] = useState(0)
  const [saveState, setSaveState] = useState('Loading local world…')
  const menuRef = useRef<HTMLDivElement>(null)
  const themeRef = useRef<HTMLDivElement>(null)
  const settingsPanelRef = useRef<HTMLDivElement>(null)
  const quickKindRef = useRef<HTMLDivElement>(null)
  const [showNewProject, setShowNewProject] = useState(false)
  const [showOpenProject, setShowOpenProject] = useState(false)
  const [recentProjects, setRecentProjects] = useState<Project[]>([])
  const [newProjectTitle, setNewProjectTitle] = useState('')
  const importRef = useRef<HTMLInputElement>(null)
  const triggerBrandAnimation = () => {
    const animations = ['brand-spin', 'brand-pulse', 'brand-wobble', 'brand-shimmer']
    setBrandAnimation(animations[Math.floor(Math.random() * animations.length)])
    setBrandAnimationKey((key) => key + 1)
  }

  useEffect(() => {
    let timer: number
    const scheduleAnimation = () => {
      timer = window.setTimeout(() => {
        triggerBrandAnimation()
        scheduleAnimation()
      }, 6500 + Math.random() * 11500)
    }
    scheduleAnimation()
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    Promise.all([loadProject(), listProjects()]).then(([saved, projects]) => {
      if (saved) setProject(saved)
      setRecentProjects(projects)
      setHydrated(true)
      setSaveState(saved ? 'Restored from local storage' : 'Local world ready')
    }).catch(() => {
      setHydrated(true)
      setSaveState('Local storage unavailable')
    })
  }, [])

  useEffect(() => {
    if (!hydrated) return
    setSaveState('Saving…')
    const timer = window.setTimeout(() => {
      saveProject(project).then(() => {
        setSaveState('Saved locally')
        listProjects().then(setRecentProjects).catch(() => undefined)
      }).catch(() => setSaveState('Save failed'))
    }, autosaveDelay)
    return () => window.clearTimeout(timer)
  }, [project, hydrated, autosaveDelay])

  useEffect(() => {
    if (!menuOpen && !themeOpen && !showSettingsPanel && !quickKindOpen) return
    const closeMenus = (event: MouseEvent) => {
      const target = event.target as Node
      if (menuRef.current && !menuRef.current.contains(target)) setMenuOpen(false)
      if (themeRef.current && !themeRef.current.contains(target)) setThemeOpen(false)
      if (settingsPanelRef.current && !settingsPanelRef.current.contains(target)) setShowSettingsPanel(false)
      if (quickKindRef.current && !quickKindRef.current.contains(target)) setQuickKindOpen(false)
    }
    document.addEventListener('mousedown', closeMenus)
    return () => document.removeEventListener('mousedown', closeMenus)
  }, [menuOpen, themeOpen, showSettingsPanel, quickKindOpen])

  useEffect(() => {
    localStorage.setItem('lore-theme', theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem('lore-node-backgrounds', String(nodeBackgrounds))
    localStorage.setItem('lore-relationship-labels', String(showRelationshipLabels))
    localStorage.setItem('lore-snap-to-grid', String(snapToGrid))
    localStorage.setItem('lore-confirm-deletes', String(confirmDeletes))
    localStorage.setItem('lore-reduce-motion', String(reduceMotion))
    localStorage.setItem('lore-autosave-delay', String(autosaveDelay))
  }, [nodeBackgrounds, showRelationshipLabels, snapToGrid, confirmDeletes, reduceMotion, autosaveDelay])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement
      const editing = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT'
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setThemeOpen(false)
        setShowSettingsPanel(false)
        setQuickKindOpen(false)
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        document.querySelector<HTMLInputElement>('.search-box input')?.focus()
      } else if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z' && !editing) {
        event.preventDefault()
        event.shiftKey ? redo() : undo()
      } else if (event.key === 'Delete' && !editing && selection) {
        event.preventDefault()
        deleteSelection()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const visibleIds = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    const matching = project.nodes.filter((node) => {
      const kindMatches = kindFilter === 'All types' || node.kind === kindFilter
      const searchText = [node.name, ...node.aliases, node.summary, node.notes, ...node.tags].join(' ').toLowerCase()
      return kindMatches && (!normalized || searchText.includes(normalized))
    })
    const ids = new Set(matching.map((node) => node.id))
    if (focusId && ids.has(focusId)) {
      for (const edge of project.edges) {
        if (edge.from_id === focusId) ids.add(edge.to_id)
        if (edge.to_id === focusId) ids.add(edge.from_id)
      }
    }
    return ids
  }, [project.nodes, project.edges, query, kindFilter, focusId])

  const visibleNodes = useMemo(() => project.nodes.filter((node) => visibleIds.has(node.id)), [project.nodes, visibleIds])
  const selectedNode = selection?.type === 'node' ? project.nodes.find((node) => node.id === selection.id) : undefined
  const selectedEdge = selection?.type === 'edge' ? project.edges.find((edge) => edge.id === selection.id) : undefined
  const connectedEdges = selectedNode ? project.edges.filter((edge) => edge.from_id === selectedNode.id || edge.to_id === selectedNode.id) : []
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<FlowNode<NodeData>>([])
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<FlowEdge>([])

  useEffect(() => {
    setFlowNodes(toFlowNodes(project.nodes, visibleIds, selection, connectSourceId))
    setFlowEdges(toFlowEdges(project.edges, visibleIds, selection, showRelationshipLabels))
  }, [project.nodes, project.edges, visibleIds, selection, connectSourceId, showRelationshipLabels, setFlowNodes, setFlowEdges])

  const commit = (next: Project) => {
    setHistory((items) => [...items.slice(-39), project])
    setFuture([])
    setProject({ ...next, updated_at: now() })
  }

  const updateNode = (id: string, patch: Partial<LoreNodeModel>) => {
    commit({ ...project, nodes: project.nodes.map((node) => node.id === id ? { ...node, ...patch, updated_at: now() } : node) })
  }

  const updateEdge = (id: string, patch: Partial<LoreEdge>) => {
    commit({ ...project, edges: project.edges.map((edge) => edge.id === id ? { ...edge, ...patch } : edge) })
  }

  const duplicateNode = (node: LoreNodeModel) => {
    const timestamp = now()
    const copy: LoreNodeModel = {
      ...node,
      id: uid(),
      name: `${node.name} copy`,
      aliases: [...node.aliases],
      tags: [...node.tags],
      position: { x: node.position.x + 36, y: node.position.y + 36 },
      created_at: timestamp,
      updated_at: timestamp,
    }
    commit({ ...project, nodes: [...project.nodes, copy] })
    setSelection({ type: 'node', id: copy.id })
  }

  const addNode = () => {
    const timestamp = now()
    const node: LoreNodeModel = {
      id: uid(), kind: quickKind, name: `New ${quickKind.toLowerCase()}`, aliases: [], summary: '', notes: '', tags: [],
      position: { x: 80 + (project.nodes.length % 4) * 220, y: 80 + Math.floor(project.nodes.length / 4) * 150 },
      created_at: timestamp, updated_at: timestamp,
    }
    commit({ ...project, nodes: [...project.nodes, node] })
    setSelection({ type: 'node', id: node.id })
  }

  const deleteSelection = () => {
    if (!selection) return
    if (confirmDeletes && !window.confirm(`Delete this ${selection.type}?`)) return
    if (selection.type === 'node') {
      commit({ ...project, nodes: project.nodes.filter((node) => node.id !== selection.id), edges: project.edges.filter((edge) => edge.from_id !== selection.id && edge.to_id !== selection.id) })
    } else if (selection?.type === 'edge') {
      commit({ ...project, edges: project.edges.filter((edge) => edge.id !== selection.id) })
    }
    setSelection(null)
  }

  const onConnect = (connection: Connection) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return
    const edge: LoreEdge = { id: uid(), from_id: connection.source, to_id: connection.target, label: 'related to', directed: true, notes: '', created_at: now() }
    commit({ ...project, edges: [...project.edges, edge] })
    setSelection({ type: 'edge', id: edge.id })
    setConnectMode(false)
    setConnectSourceId(null)
  }

  const handleCanvasNodeClick = (nodeId: string) => {
    if (!connectMode) {
      setSelection({ type: 'node', id: nodeId })
      return
    }
    if (!connectSourceId) {
      setConnectSourceId(nodeId)
      setSelection({ type: 'node', id: nodeId })
      return
    }
    if (connectSourceId !== nodeId) onConnect({ source: connectSourceId, target: nodeId, sourceHandle: null, targetHandle: null })
  }

  const toggleConnectMode = () => {
    setConnectMode((enabled) => !enabled)
    setConnectSourceId(null)
    setSelection(null)
  }

  const undo = () => {
    const previous = history[history.length - 1]
    if (!previous) return
    setHistory((items) => items.slice(0, -1))
    setFuture((items) => [...items, project])
    setProject(previous)
  }

  const redo = () => {
    const next = future[future.length - 1]
    if (!next) return
    setFuture((items) => items.slice(0, -1))
    setHistory((items) => [...items, project])
    setProject(next)
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as Project
        if (!parsed.title || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) throw new Error('Invalid project')
        commit({ ...parsed, schema_version: parsed.schema_version || 1 })
        setSelection(null)
        setSaveState('Imported project')
      } catch {
        setSaveState('Could not import that JSON file')
      }
      event.target.value = ''
    }
    reader.readAsText(file)
  }

  const exportJson = () => downloadFile(`${project.title.replace(/\s+/g, '-').toLowerCase() || 'lore-layer'}.json`, JSON.stringify(project, null, 2))
  const exportMarkdown = () => downloadFile(`${project.title.replace(/\s+/g, '-').toLowerCase() || 'story-bible'}.md`, projectToMarkdown(project), 'text/markdown')
  const openProject = (nextProject: Project) => {
    setProject(nextProject)
    setSelection(null)
    setQuery('')
    setKindFilter('All types')
    setFocusId(null)
    setHistory([])
    setFuture([])
    setShowOpenProject(false)
    setSaveState('Opened local project')
  }

  const createNewProject = () => {
    const title = newProjectTitle.trim() || 'Untitled story world'
    setHistory((items) => [...items.slice(-39), project])
    setFuture([])
    setProject(createProject(title))
    setSelection(null)
    setQuery('')
    setKindFilter('All types')
    setFocusId(null)
    setNewProjectTitle('')
    setShowNewProject(false)
  }

  const resetSettings = () => {
    setTheme('dracula')
    setNodeBackgrounds(true)
    setShowRelationshipLabels(true)
    setSnapToGrid(false)
    setConfirmDeletes(false)
    setReduceMotion(false)
    setAutosaveDelay(350)
  }

  return (
    <ReactFlowProvider>
      <div className={`app-shell theme-${theme} ${nodeBackgrounds ? 'node-colors-on' : 'node-colors-off'} ${reduceMotion ? 'reduce-motion' : ''}`}>
        <header className="topbar">
          <div className="brand"><span key={brandAnimationKey} className={`brand-mark ${brandAnimation}`} role="button" tabIndex={0} aria-label="Animate Lore mark" onClick={triggerBrandAnimation} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); triggerBrandAnimation() } }}>✦</span><span>Lore</span></div>
          <div className="project-title-wrap"><div className="title-edit"><input className="project-title" aria-label="Project title" size={Math.max(1, Math.min(project.title.length + 1, 32))} value={project.title} onChange={(event) => setProject({ ...project, title: event.target.value, updated_at: now() })} /></div></div>
          <div className="top-actions">
            <span className="save-status"><span className="status-dot" />{saveState}</span>
            <div className="settings-menu" ref={menuRef}>
              <button className="button settings-button" aria-label="Settings" title="Settings" aria-expanded={menuOpen} onClick={() => { setMenuOpen((open) => !open); setThemeOpen(false) }}><span className="settings-icon">⚙</span></button>
              {menuOpen && <div className="menu-dropdown" role="menu">
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setShowNewProject(true) }}><span>＋</span>New project</button>
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setShowOpenProject(true) }}><span>◫</span>Open project</button>
                <div className="menu-divider" />
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); undo() }} disabled={!history.length}><span>↶</span>Undo <kbd>⌘ Z</kbd></button>
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); redo() }} disabled={!future.length}><span>↷</span>Redo <kbd>⇧⌘ Z</kbd></button>
                <div className="menu-divider" />
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); importRef.current?.click() }}><span>↥</span>Import JSON</button>
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); exportJson() }}><span>↓</span>Export JSON</button>
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); exportMarkdown() }}><span>☷</span>Export story bible</button>
                <div className="menu-divider" />
                <button className="menu-item" role="menuitem" onClick={() => { setMenuOpen(false); setShowSettingsPanel(true) }}><span>⚙</span>Settings</button>
              </div>}
            </div>
            <div className="theme-menu" ref={themeRef}>
              <button className="button theme-button" aria-label="Themes" title="Themes" aria-expanded={themeOpen} onClick={() => { setThemeOpen((open) => !open); setMenuOpen(false) }}><span className="theme-icon" aria-hidden="true" /></button>
              {themeOpen && <div className="menu-dropdown theme-dropdown" role="menu">{THEMES.map(({ id, label }) => <button key={id} className={`menu-item theme-option ${theme === id ? 'selected' : ''}`} role="menuitemradio" aria-checked={theme === id} onClick={() => { setTheme(id); setThemeOpen(false) }}><span className={`theme-swatch swatch-${id}`} />{label}{theme === id && <b>✓</b>}</button>)}</div>}
            </div>
            <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={handleImport} />
          </div>
        </header>

        <main className="workspace">
          <aside className="left-panel panel">
            <div className="quick-add"><div className="kind-picker" ref={quickKindRef}><button type="button" className="kind-picker-button" aria-expanded={quickKindOpen} onClick={() => setQuickKindOpen((open) => !open)}><span className={`type-dot kind-${quickKind.toLowerCase()}`} /><span>{quickKind}</span><span className="kind-picker-chevron">⌄</span></button>{quickKindOpen && <div className="kind-picker-menu">{NODE_KINDS.map((kind) => <button type="button" className="kind-picker-option" key={kind} onClick={() => { setQuickKind(kind); setQuickKindOpen(false) }}><span className={`type-dot kind-${kind.toLowerCase()}`} />{kind}</button>)}</div>}</div><button className="button add-button" onClick={addNode}>＋ Add node</button></div>
            <label className="search-box"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="" /><kbd>⌘ K</kbd></label>
            <div className="filter-row type-filter-row"><button type="button" aria-label="All types" data-tooltip="All types" className={`type-filter all-types ${kindFilter === 'All types' ? 'active' : ''}`} onClick={() => setKindFilter('All types')}><span className="filter-swatch" /></button>{NODE_KINDS.map((kind) => <button type="button" aria-label={kind} data-tooltip={kind} key={kind} className={`type-filter kind-${kind.toLowerCase()} ${kindFilter === kind ? 'active' : ''}`} onClick={() => setKindFilter(kind)}><span className="filter-swatch" /></button>)}</div>{focusId && <div className="focus-row"><button className="clear-focus" onClick={() => setFocusId(null)}>Clear focus</button></div>}
            <div className="node-list">{visibleNodes.length ? visibleNodes.map((node) => <button key={node.id} className={`node-list-item ${selection?.type === 'node' && selection.id === node.id ? 'selected' : ''}`} onClick={() => setSelection({ type: 'node', id: node.id })}><span className={`type-dot kind-${node.kind.toLowerCase()}`} /><span className="list-copy"><strong>{node.name}</strong></span></button>) : <div className="empty-list"><strong>No matching lore</strong><span>Try another search or add a new node.</span></div>}</div>
            <div className="sidebar-footer"><span>{visibleNodes.length} shown</span><span>·</span><span>{project.edges.length} relationships</span></div>
          </aside>

          <section className="canvas-panel">
            <div className="graph-wrap"><ReactFlow nodes={flowNodes} edges={flowEdges} nodeTypes={nodeTypes} snapToGrid={snapToGrid} snapGrid={[20, 20]} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} onNodeDragStop={(_, node) => { const current = project.nodes.find((candidate) => candidate.id === node.id); if (current && (current.position.x !== node.position.x || current.position.y !== node.position.y)) updateNode(node.id, { position: node.position }) }} onNodeClick={(_, node) => handleCanvasNodeClick(node.id)} onEdgeClick={(_, edge) => setSelection({ type: 'edge', id: edge.id })} onPaneClick={() => { if (connectMode) setConnectSourceId(null); setSelection(null) }} fitView minZoom={0.2} maxZoom={2} defaultEdgeOptions={{ type: 'default' }}><Background variant={BackgroundVariant.Dots} color="#3a464b" gap={22} size={1.4} /><Controls showInteractive={false} /></ReactFlow>{!project.nodes.length && <div className="canvas-empty"><div className="empty-glyph">✦</div><h2>Begin your story world</h2><p>Add a character, place, or idea to start building the layer beneath your story.</p><button className="button accent" onClick={addNode}>＋ Add your first node</button></div>}</div>
          </section>

          <aside className="right-panel panel">{selectedNode ? <NodeInspector node={selectedNode} edges={connectedEdges} project={project} updateNode={updateNode} setSelection={setSelection} deleteSelection={deleteSelection} duplicateNode={duplicateNode} setFocusId={setFocusId} /> : selectedEdge ? <EdgeInspector edge={selectedEdge} project={project} updateEdge={updateEdge} deleteSelection={deleteSelection} setSelection={setSelection} /> : <div className="inspector-empty"><div className="inspector-icon">◈</div><h2>Nothing selected</h2><p>Select a node or relationship to inspect and edit its details.</p><div className="shortcut-list"><span><kbd>⌘ K</kbd> Search the world</span><span><kbd>⌘ Z</kbd> Undo an edit</span><span><kbd>Delete</kbd> Remove selection</span></div></div>}</aside>
        </main>
        {showNewProject && <div className="modal-backdrop" onMouseDown={() => setShowNewProject(false)}><div className="modal-card" role="dialog" aria-modal="true" aria-labelledby="new-project-title" onMouseDown={(event) => event.stopPropagation()}><span className="eyebrow">NEW PROJECT</span><h2 id="new-project-title">Name your story world</h2><p>Start with a blank graph. Your current world is already saved locally.</p><input autoFocus value={newProjectTitle} onChange={(event) => setNewProjectTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') createNewProject(); if (event.key === 'Escape') setShowNewProject(false) }} placeholder="The Glass Kingdom" /><div className="modal-actions"><button className="button ghost" onClick={() => setShowNewProject(false)}>Cancel</button><button className="button accent" onClick={createNewProject}>Create project</button></div></div></div>}
        {showOpenProject && <div className="modal-backdrop" onMouseDown={() => setShowOpenProject(false)}><div className="modal-card project-picker" role="dialog" aria-modal="true" aria-labelledby="open-project-title" onMouseDown={(event) => event.stopPropagation()}><span className="eyebrow">LOCAL PROJECTS</span><h2 id="open-project-title">Open a story world</h2>{recentProjects.length ? <div className="recent-project-list">{recentProjects.map((recent) => <button className={`recent-project ${recent.id === project.id ? 'current' : ''}`} key={recent.id} onClick={() => openProject(recent)}><span><strong>{recent.title}</strong><small>{recent.nodes.length} nodes · {recent.edges.length} relationships</small></span><time>{new Date(recent.updated_at).toLocaleDateString()}</time></button>)}</div> : <p>No local projects yet. Create your first world to see it here.</p>}<div className="modal-actions"><button className="button ghost" onClick={() => setShowOpenProject(false)}>Close</button></div></div></div>}
        {showSettingsPanel && <div className="settings-overlay" ref={settingsPanelRef} role="dialog" aria-modal="false" aria-labelledby="settings-title" onMouseDown={(event) => event.stopPropagation()}><div className="settings-overlay-header"><div><span className="eyebrow">PREFERENCES</span><h2 id="settings-title">Settings</h2></div><button className="icon-button" aria-label="Close settings" onClick={() => setShowSettingsPanel(false)}>×</button></div><div className="settings-list"><SettingToggle label="Node background" description="Tint nodes by their type" checked={nodeBackgrounds} onChange={setNodeBackgrounds} /><SettingToggle label="Relationship labels" description="Show labels on graph edges" checked={showRelationshipLabels} onChange={setShowRelationshipLabels} /><SettingToggle label="Snap to grid" description="Align dragged nodes to a 20px grid" checked={snapToGrid} onChange={setSnapToGrid} /><SettingToggle label="Confirm before deleting" description="Ask before removing nodes or relationships" checked={confirmDeletes} onChange={setConfirmDeletes} /><SettingToggle label="Reduce motion" description="Disable interface animations" checked={reduceMotion} onChange={setReduceMotion} /><SettingSelect label="Autosave delay" description="Wait before saving after an edit" value={autosaveDelay} onChange={setAutosaveDelay} options={[[350, 'Fast'], [1000, 'Balanced'], [2000, 'Relaxed']]} /></div><button className="text-button reset-settings" onClick={resetSettings}>Reset preferences</button></div>}
      </div>
    </ReactFlowProvider>
  )
}

type NodeInspectorProps = { node: LoreNodeModel; edges: LoreEdge[]; project: Project; updateNode: (id: string, patch: Partial<LoreNodeModel>) => void; setSelection: (selection: Selection) => void; deleteSelection: () => void; duplicateNode: (node: LoreNodeModel) => void; setFocusId: (id: string | null) => void }
function NodeInspector({ node, edges, project, updateNode, setSelection, deleteSelection, duplicateNode, setFocusId }: NodeInspectorProps) {
  const relatedName = (edge: LoreEdge) => project.nodes.find((candidate) => candidate.id === (edge.from_id === node.id ? edge.to_id : edge.from_id))?.name || 'Unknown node'
  const isCustomType = !NODE_KINDS.includes(node.kind as typeof NODE_KINDS[number])
  return <div className="inspector"><div className="inspector-header"><div><span className={`type-pill kind-${node.kind.toLowerCase()}`}>{node.kind}</span><h2>{node.name}</h2></div><div className="inspector-actions"><button className="icon-button" onClick={() => duplicateNode(node)} title="Duplicate node">⧉</button><button className="icon-button danger" onClick={deleteSelection} title="Delete node">⌫</button></div></div><div className="form-stack"><Field label="Name"><input value={node.name} onChange={(event) => updateNode(node.id, { name: event.target.value })} /></Field><Field label="Type"><select value={isCustomType ? 'Custom' : node.kind} onChange={(event) => updateNode(node.id, { kind: event.target.value === 'Custom' ? (isCustomType ? node.kind : 'Custom type') : event.target.value })}>{NODE_KINDS.map((kind) => <option key={kind}>{kind}</option>)}</select></Field>{(isCustomType || node.kind === 'Custom') && <Field label="Custom type" hint="Project-specific"><input value={node.kind === 'Custom' ? '' : node.kind} onChange={(event) => updateNode(node.id, { kind: event.target.value.trim() || 'Custom' })} placeholder="Creature, Timeline, Rumour…" /></Field>}<Field label="Aliases" hint="Comma separated"><input value={node.aliases.join(', ')} onChange={(event) => updateNode(node.id, { aliases: splitList(event.target.value) })} placeholder="Other names…" /></Field><Field label="Summary"><textarea rows={3} value={node.summary} onChange={(event) => updateNode(node.id, { summary: event.target.value })} placeholder="A concise description…" /></Field><Field label="Tags" hint="Comma separated"><input value={node.tags.join(', ')} onChange={(event) => updateNode(node.id, { tags: splitList(event.target.value) })} placeholder="plot, north, secret…" /></Field><Field label="Notes" hint="Markdown supported"><textarea className="notes-area" rows={8} value={node.notes} onChange={(event) => updateNode(node.id, { notes: event.target.value })} placeholder="Write the details you need to remember…" /></Field></div><div className="inspector-section"><div className="section-title">Relationships <span>{edges.length}</span></div>{edges.length ? <div className="relationship-list">{edges.map((edge) => <button className="relationship" key={edge.id} onClick={() => setSelection({ type: 'edge', id: edge.id })}><span className="relationship-arrow">{edge.from_id === node.id ? '→' : '←'}</span><span><strong>{edge.label || 'related to'}</strong><small>{relatedName(edge)}</small></span></button>)}</div> : <p className="muted">Connect this node to another on the canvas.</p>}<button className="text-button" onClick={() => setFocusId(node.id)}>Focus neighbourhood →</button></div><div className="metadata">Created {new Date(node.created_at).toLocaleDateString()}<br />Updated {new Date(node.updated_at).toLocaleDateString()}</div></div>
}

type EdgeInspectorProps = { edge: LoreEdge; project: Project; updateEdge: (id: string, patch: Partial<LoreEdge>) => void; deleteSelection: () => void; setSelection: (selection: Selection) => void }
function EdgeInspector({ edge, project, updateEdge, deleteSelection, setSelection }: EdgeInspectorProps) {
  const relationshipSuggestions = ['knows', 'located in', 'member of', 'owns', 'opposes', 'appears during']
  const from = project.nodes.find((node) => node.id === edge.from_id)
  const to = project.nodes.find((node) => node.id === edge.to_id)
  return <div className="inspector"><div className="inspector-header"><div><span className="eyebrow">RELATIONSHIP</span><h2>{edge.label || 'Related to'}</h2></div><button className="icon-button" onClick={deleteSelection} title="Delete relationship">⌫</button></div><div className="connection-preview"><span>{from?.name || 'Unknown'}</span><b>{edge.directed ? '→' : '↔'}</b><span>{to?.name || 'Unknown'}</span></div><div className="form-stack"><Field label="Relationship label"><input autoFocus value={edge.label} onChange={(event) => updateEdge(edge.id, { label: event.target.value })} placeholder="knows, owns, located in…" /><div className="suggestion-list">{relationshipSuggestions.map((suggestion) => <button type="button" className={`suggestion ${edge.label === suggestion ? 'active' : ''}`} key={suggestion} onClick={() => updateEdge(edge.id, { label: suggestion })}>{suggestion}</button>)}</div></Field><label className="toggle-row"><span><strong>Directed relationship</strong><small>Show an arrow toward the target</small></span><input type="checkbox" checked={edge.directed} onChange={(event) => updateEdge(edge.id, { directed: event.target.checked })} /></label><Field label="Notes" hint="Markdown supported"><textarea className="notes-area" rows={8} value={edge.notes} onChange={(event) => updateEdge(edge.id, { notes: event.target.value })} placeholder="What does this relationship mean?" /></Field></div><button className="text-button" onClick={() => setSelection({ type: 'node', id: edge.from_id })}>Open source node →</button><div className="metadata">Created {new Date(edge.created_at).toLocaleDateString()}</div></div>
}

function SettingToggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (checked: boolean) => void }) { return <label className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} /></label> }
function SettingSelect({ label, description, value, onChange, options }: { label: string; description: string; value: number; onChange: (value: number) => void; options: [number, string][] }) { return <label className="setting-row"><span><strong>{label}</strong><small>{description}</small></span><select value={value} onChange={(event) => onChange(Number(event.target.value))}>{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select></label> }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="field"><span className="field-label">{label}{hint && <small>{hint}</small>}</span>{children}</label> }
function splitList(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean) }

export default App
