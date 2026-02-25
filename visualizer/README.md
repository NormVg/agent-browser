# Dual-Memory Visualizer

Real-time visualization of the dual-memory system with Short-Term Memory (STM) buffer and Long-Term Memory (LTM) knowledge graph.

## Features

- **STM Sidebar**: Live list of buffer entries
- **LTM Graph**: Interactive knowledge graph visualization
- **Color-Coded**: Nodes colored by type (person, skill, project, etc.)
- **Auto-Refresh**: Updates every 5 seconds
- **Dark Theme**: Shadcn-inspired aesthetic
- **Node Details**: Click any node to view metadata
- **Real-Time Stats**: STM count, LTM nodes, LTM edges

## Usage

### Start the visualizer:
```bash
node visualizer/server.js
```

### Open in browser:
```
http://localhost:3000
```

## API Endpoints

- `GET /api/stm` - Short-term memory entries
- `GET /api/ltm/nodes` - Long-term knowledge nodes
- `GET /api/ltm/edges` - Graph relationships

## Node Colors

- 🔵 **Person** - Blue
- 🟣 **Preference** - Purple
- 🟢 **Skill** - Green
- 🟠 **Project** - Orange
- 🟡 **Concept** - Yellow
- 🔷 **Fact** - Light blue
- 🔴 **Event** - Red

## Interaction

- **Click node** - View details
- **Click canvas** - Close details
- **Drag nodes** - Rearrange graph
- **Scroll** - Zoom in/out
- **Auto-refresh** - Data updates every 5s
