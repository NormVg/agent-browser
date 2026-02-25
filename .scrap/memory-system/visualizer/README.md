# Knowledge Graph Visualizer

A beautiful web-based visualizer for the AI's memory graph.

## Features

- 🎨 Beautiful gradient UI
- 🔄 Real-time auto-refresh (every 5 seconds)
- 📊 Interactive graph with physics simulation
- 🎯 Click nodes to see details
- 🎨 Color-coded by node type:
  - **Note** - Purple
  - **Person** - Pink
  - **Task** - Blue
  - **Concept** - Green
  - **Event** - Red

## Usage

1. **Start the visualizer server:**
   ```bash
   node visualizer/server.js
   ```

2. **Open your browser:**
   ```
   http://localhost:3000
   ```

3. **Interact with the graph:**
   - Click and drag nodes to rearrange
   - Click a node to see its full content
   - Use "Refresh" to manually update
   - Use "Fit View" to center the graph

## How It Works

The visualizer reads from the same memory files (`data/memory-nodes.json` and `data/memory-edges.json`) that the AI uses, displaying them as an interactive network graph using Vis.js.

Changes made by the AI appear automatically within 5 seconds.
