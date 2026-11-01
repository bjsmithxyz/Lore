---
type: project
status: someday
tags:
  - dev
  - writing
  - tech
created: 2026-07-02
---
# Lore Layer — Design Document

> A local-first visual story bible for fiction writers. Authors manually create characters, places, objects, factions, events, and concepts, then connect them into an explorable world graph.

---

## Table of Contents

- [[#Overview]]
- [[#Product Thesis]]
- [[#Goals]]
- [[#Non-Goals]]
- [[#Target Users]]
- [[#Core User Experience]]
- [[#Feature Set]]
    - [[#Projects]]
    - [[#Nodes]]
    - [[#Edges]]
    - [[#Graph Canvas]]
    - [[#Inspector]]
    - [[#Search and Filtering]]
    - [[#Notes]]
    - [[#Persistence and Export]]
- [[#Architecture]]
    - [[#Application Structure]]
    - [[#Data Model]]
    - [[#Storage Strategy]]
    - [[#Technology Stack]]
- [[#MVP Scope]]
- [[#Phased Roadmap]]
- [[#Success Criteria]]
- [[#Open Questions]]
- [[#Risks and Mitigations]]
- [[#References]]

---

## Overview

**Project name:** Lore Layer  
**Type:** Local-first web application / installable PWA  
**Status:** Concept / pre-development  
**Last updated:** 2026-11-01

Lore Layer is a manual worldbuilding and story-planning tool. It gives fiction writers a visual canvas for building a persistent reference layer around their stories.

The author creates and maintains the information themselves:

```text
[Create node] → [Describe it] → [Connect it] → [Explore the world]
```

The first version deliberately does **not** read manuscripts, infer facts, call an LLM, or attempt to detect continuity errors. The product's first job is to make structured manual worldbuilding fast and pleasant.

The application runs in the browser, stores projects locally, and supports JSON import/export. This avoids an initial backend, account system, cloud storage, and desktop-platform compatibility burden.

---

## Product Thesis

Writers working on complex fiction need a reference tool that is:

- Faster to maintain than a traditional story bible.
- More structured than a folder of disconnected notes.
- More useful for relationships and spatial context than a document editor.
- Private by default for unpublished creative work.
- Flexible enough to support different genres and author workflows.

The graph is the organising surface, not the entire product. The core experience combines:

1. A visual graph for orientation and discovery.
2. An inspector for precise editing.
3. Search and lists for reliable retrieval.
4. Lightweight Markdown notes for context.

Lore Layer is not initially a manuscript editor. It is a visual world bible that can sit beside one.

---

## Goals

- Let a writer create a useful story graph in minutes.
- Make adding and connecting information extremely low-friction.
- Support characters, places, objects, factions, events, concepts, and custom node types.
- Allow relationships to use author-defined labels rather than a rigid ontology.
- Keep projects local and usable without an account.
- Make projects portable through JSON import/export.
- Provide a foundation for later features such as timelines, collaboration, and optional AI assistance.

## Non-Goals

The initial product will not:

- Automatically ingest or analyse manuscript files.
- Extract entities or relationships with AI.
- Detect continuity errors.
- Replace Word, Scrivener, Obsidian, or a full writing environment.
- Provide real-time collaboration or cloud sync.
- Require a backend, account, or subscription.
- Encode every possible relationship type into a fixed schema.

---

## Target Users

### Primary

Novelists, game writers, and other long-form fiction authors who need to track a growing cast, setting, and collection of story facts.

### Secondary

- Tabletop roleplaying campaign writers and game masters.
- Screenwriters planning complex casts and locations.
- Co-authors who want a shared reference format later.
- Worldbuilders who think spatially or relationally.

### Not initially targeting

- Users looking for a full manuscript editor.
- Users who only need a simple notes application.
- Large teams requiring permissions and concurrent editing.

---

## Core User Experience

### New project

1. Open Lore Layer.
2. Choose **New Project**.
3. Enter a project title.
4. See an empty graph canvas and an add-node action.

### Add a node

1. Press **Add Node** or use a keyboard shortcut.
2. Choose a node type or select **Custom**.
3. Enter the name immediately.
4. Add an optional summary, aliases, tags, and Markdown notes.
5. The node appears on the canvas and in the project list.

### Connect nodes

1. Select a node and choose **Connect**, or drag from one node to another.
2. Choose whether the relationship is directed.
3. Enter a relationship label such as `knows`, `located in`, `owns`, or `opposes`.
4. Add optional notes to the relationship.

### Explore

- Pan and zoom the canvas.
- Select a node to open its inspector.
- Focus on a node to hide unrelated nodes.
- Search for an entity by name, alias, tag, or type.
- Filter the graph by node type or tag.
- Jump from an inspector relationship to the connected node.

### Save and return

- Changes autosave locally.
- The project reopens in its previous state.
- The author can export a portable JSON file at any time.
- A Markdown story bible can be generated from the current graph.

---

## Feature Set

### Projects

A project is a self-contained story world.

**MVP capabilities:**

- Create a project.
- Open a recent local project.
- Rename a project.
- Import a JSON project file.
- Export a JSON project file.
- Export a Markdown story bible.

Cloud accounts, sharing, and synchronisation are out of scope initially.

### Nodes

Nodes represent things in the story world.

**Default node types:**

- Character
- Place
- Object
- Faction
- Event
- Concept
- Custom

**Node fields:**

- Name
- Type
- Aliases
- Summary
- Markdown notes
- Tags
- Canvas position
- Created and updated timestamps

Node types should be visually distinguishable but not hard-coded into the data model. Custom types should be supported without a schema migration.

### Edges

Edges represent relationships between nodes.

**Edge fields:**

- Source node
- Target node
- Relationship label
- Directed or undirected state
- Markdown notes
- Created timestamp

Relationship labels are freeform. The application may suggest common labels, but the writer owns the vocabulary.

Examples:

- `knows`
- `located in`
- `member of`
- `owns`
- `opposes`
- `was born in`
- `appears during`

The MVP should not attempt to model every temporal or conditional variation. Notes can capture nuance until a later version introduces richer relationship semantics.

### Graph Canvas

The graph canvas is the primary orientation and exploration view.

**MVP interactions:**

- Pan.
- Zoom.
- Select nodes and edges.
- Drag nodes.
- Create and delete edges.
- Fit the graph to the viewport.
- Focus on a selected node and its immediate connections.
- Show a minimap or overview control if provided by the graph library.

**Visual conventions:**

- Node colour or icon by type.
- Edge arrows for directed relationships.
- Labels visible on selected edges and optionally on all edges.
- Node size kept consistent initially to avoid implying unsupported semantics.

The graph should remain useful at small and medium project sizes. Large graphs require filtering, clustering, or alternate views in later phases.

### Inspector

The inspector is the main editing surface for reliable data entry.

For nodes:

- Name and type.
- Aliases.
- Summary.
- Tags.
- Markdown notes.
- Connected relationships.
- Created and updated timestamps.

For edges:

- Relationship label.
- Direction.
- Notes.
- Source and target nodes.

The inspector should support immediate editing, keyboard navigation, and clear delete actions.

### Search and Filtering

Search should operate across:

- Names.
- Aliases.
- Summaries.
- Tags.
- Notes.
- Relationship labels.

Filters should include:

- Node type.
- Tags.
- Connected/unconnected nodes.
- Focused neighbourhood.

The list view is important because a graph is not an efficient replacement for text search.

### Notes

Notes use Markdown or a deliberately simple Markdown-compatible text area.

The MVP needs only:

- Plain text entry.
- Basic Markdown preservation.
- Readable rendered output where useful.
- No complex rich-text editor.

The notes field is for world details, reminders, scene context, and author-defined facts. It is not intended to hold the full manuscript.

### Persistence and Export

The first version is local-first:

- Autosave to browser storage.
- JSON import/export for portability and backup.
- Markdown export for sharing or generating a traditional story bible.
- No server-side storage or telemetry by default.

The application should warn users when they have unsaved export-worthy changes, but local autosave should make ordinary use resilient.

---

## Architecture

### Application Structure

```text
React application
├── Project shell
│   ├── Recent projects
│   ├── New/open/import/export actions
│   └── Project settings
├── Graph workspace
│   ├── Graph canvas
│   ├── Toolbar and filters
│   ├── Search/list view
│   └── Inspector panel
├── Domain state
│   ├── Projects
│   ├── Nodes
│   ├── Edges
│   ├── Canvas layout
│   └── Undo/redo history
└── Persistence adapters
    ├── IndexedDB autosave
    └── JSON import/export
```

Keep the domain model independent from the graph library. The canvas library should render and manipulate the model, but it should not become the source of truth.

### Data Model

```text
Project
  id              UUID
  schema_version  INTEGER
  title           TEXT
  created_at      TIMESTAMP
  updated_at      TIMESTAMP
  nodes           Node[]
  edges           Edge[]

Node
  id              UUID
  kind            TEXT
  name            TEXT
  aliases         TEXT[]
  summary         TEXT
  notes           TEXT
  tags            TEXT[]
  position        { x: NUMBER, y: NUMBER }
  created_at      TIMESTAMP
  updated_at      TIMESTAMP

Edge
  id              UUID
  from_id         UUID
  to_id           UUID
  label           TEXT
  directed        BOOLEAN
  notes           TEXT
  created_at      TIMESTAMP
```

### Storage Strategy

Use a versioned JSON project model as the portable format and IndexedDB as the browser persistence layer.

**Why JSON first:**

- Easy to inspect and back up.
- Easy to import/export.
- No backend required.
- Suitable for the expected MVP project size.
- Allows future migrations through `schema_version`.

Use IndexedDB through a small persistence adapter rather than coupling domain code directly to browser APIs.

A database such as SQLite or a hosted PostgreSQL service should only be introduced when there is a concrete need for collaboration, large-scale search, history, or cloud synchronisation.

### Technology Stack

#### Frontend

- React
- TypeScript
- Vite

#### Graph

- `@xyflow/react` / React Flow

React Flow provides the core node-editor interactions: nodes, edges, selection, pan, zoom, controls, and graph-oriented UI primitives.

#### State

- React state for simple local state.
- A small dedicated state store such as Zustand if undo/redo and cross-panel synchronisation become cumbersome.

#### Persistence

- IndexedDB through Dexie or a similarly small wrapper.
- JSON import/export.

#### Markdown

- Plain textarea initially.
- CodeMirror or another lightweight editor only if editing needs justify it.

#### Distribution

- Static web deployment.
- Optional PWA packaging for installation and offline shell caching.
- Consider Tauri later if native menus, filesystem integration, or desktop distribution becomes valuable.

---

## MVP Scope

The MVP validates the core hypothesis: **writers will maintain a manually authored story graph when doing so is faster and more useful than maintaining disconnected notes.**

### In scope

- [ ] React/TypeScript/Vite application shell.
- [ ] Create and open local projects.
- [ ] Create, edit, duplicate, and delete nodes.
- [ ] Default and custom node types.
- [ ] Create, edit, and delete labeled edges.
- [ ] Directed and undirected relationships.
- [ ] Graph canvas with pan, zoom, selection, and node dragging.
- [ ] Node and edge inspector.
- [ ] Search and basic filters.
- [ ] Markdown notes field.
- [ ] Undo and redo for editing actions.
- [ ] Local autosave using IndexedDB.
- [ ] JSON import/export.
- [ ] Basic Markdown story-bible export.

### Explicitly out of scope

- [ ] AI-assisted extraction or writing.
- [ ] Manuscript ingestion.
- [ ] Automatic continuity checking.
- [ ] Timeline visualisation.
- [ ] Collaboration or cloud sync.
- [ ] User accounts and authentication.
- [ ] Rich manuscript editor.
- [ ] PDF export.
- [ ] Mobile-specific layout.
- [ ] Complex permissions or project sharing.

### MVP quality bar

A new user should be able to:

1. Create a project.
2. Add ten nodes in under ten minutes.
3. Connect those nodes with labeled relationships.
4. Close and reopen the project without losing work.
5. Find a node through search.
6. Export the graph as JSON and Markdown.

---

## Phased Roadmap

### Phase 1 — Vertical Slice

Build one complete, reliable loop:

- One project.
- One graph canvas.
- Node creation and editing.
- Edge creation and editing.
- Local save and reopen.

**Milestone:** A writer can create a small world graph and return to it the next day without friction.

### Phase 2 — Usable World Bible

- Search and filters.
- Tags and aliases.
- Markdown notes.
- Undo/redo.
- JSON import/export.
- Markdown story-bible export.
- Better focus and neighbourhood navigation.

**Milestone:** The app is useful for a real small writing project rather than only a technical demo.

### Phase 3 — Larger Worlds

- Grouping or clustering.
- Multiple graph views.
- Saved filters.
- Relationship and node templates.
- Timeline metadata.
- Attachments or reference images.
- Improved keyboard navigation.

**Milestone:** The tool remains usable for projects with hundreds of nodes.

### Phase 4 — Optional Platform Features

Only pursue these after the local-first workflow is validated:

- Optional cloud sync.
- Collaboration and sharing.
- Native desktop wrapper.
- AI-assisted suggestions or import.
- Continuity checking.
- External integrations.

---

## Success Criteria

### Product success

- Users can understand the interface without a tutorial.
- Adding a node takes only a few seconds.
- Users return to existing projects rather than abandoning them after initial setup.
- Writers report that the graph helps them answer questions about their story faster than searching notes manually.
- Projects remain portable and recoverable.

### Technical success

- No data loss during normal browser use or reloads.
- JSON exports can be imported into a fresh application instance.
- Schema migrations are versioned and tested.
- Graph interaction remains responsive for at least several hundred nodes.
- The domain model can be tested independently of the graph UI.

---

## Open Questions

- [ ] Should a project be a single JSON file, or should export produce a folder/bundle when attachments arrive?
- [ ] Should node types be globally configurable or project-specific?
- [ ] Should relationship labels be suggested from a small vocabulary or always freeform?
- [ ] How should duplicate node names be presented?
- [ ] What is the best interaction for creating an edge quickly from the keyboard?
- [ ] Should the graph support grouping or compound nodes in the MVP?
- [ ] How should the application behave when browser storage is cleared?
- [ ] Is PWA installation valuable before native packaging is considered?
- [ ] When should a local project be allowed to contain attachments?

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Graph becomes cluttered at scale | High | High | Search, filters, focus mode, list view, grouping, and alternate views |
| Manual data entry feels like administrative work | High | High | Immediate name focus, keyboard shortcuts, quick-connect, sensible defaults, low-friction inspector |
| Users do not know what relationships to create | Medium | Medium | Suggested labels, examples, templates, and optional starter nodes |
| Browser storage is lost or unavailable | Medium | High | JSON export, backup reminders, versioned portable format, storage-error messaging |
| Freeform labels become inconsistent | Medium | Medium | Allow flexibility but provide suggestions, autocomplete, and project-level label history |
| Scope expands into a full writing environment | High | High | Keep manuscript editing, AI, collaboration, and sync explicitly post-MVP |
| Web browser behaviour differs across platforms | Low | Medium | Target evergreen browsers, test Safari early, avoid browser-specific filesystem APIs in the core workflow |
| Product is useful but not differentiated | Medium | High | Focus on exceptional graph authoring speed, privacy, portability, and fiction-specific workflows |

---

## References

- [React Flow / XYFlow](https://reactflow.dev/) — React node-based editor framework.
- [Dexie](https://dexie.org/docs) — IndexedDB wrapper for local browser persistence.
- [Vite](https://vite.dev/guide/) — frontend build tooling.
- [Vite PWA](https://vite-pwa-org.netlify.app/frameworks/react) — optional installable/offline web-app support.
- [Tauri](https://v2.tauri.app/) — possible future native wrapper for the web frontend.
