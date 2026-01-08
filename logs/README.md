# Logs Directory

This directory contains conversation logs from the AI assistant.

## File Types

### `.log` files
Human-readable formatted logs with:
- Timestamps
- User messages
- Assistant responses
- Tool calls and results
- Errors
- System events

Example: `session-1767856789123.log`

### `.json` files
Machine-readable structured logs in JSON format.
Contains the complete conversation history.

Example: `session-1767856789123.json`

## Format

Logs include:
- Session ID and timestamps
- Formatted sections for readability
- Complete conversation history
- Tool execution details
- Error traces

## Privacy

These files are gitignored to keep your conversations private.

## Cleanup

Old logs can be safely deleted if no longer needed.
