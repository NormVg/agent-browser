# Data Directory

This directory stores persistent data for the AI agent.

## Files

- `memory-nodes.json` - Knowledge graph nodes (memories)
- `memory-edges.json` - Knowledge graph edges (relationships)

## Memory Structure

### Nodes
Each node represents a stored memory:
```json
{
  "id": "unique-id",
  "type": "note | person | task | concept | event",
  "content": "the actual memory content",
  "meta": {
    "created_at": "ISO datetime",
    "updated_at": "ISO datetime",
    "tags": ["optional", "tags"]
  }
}
```

### Edges
Each edge represents a relationship between nodes:
```json
{
  "id": "unique-id",
  "from": "source-node-id",
  "to": "target-node-id",
  "label": "related | parent | child | cause | belongs_to"
}
```

## Privacy

This directory is listed in `.gitignore` to keep your AI's memories private.
