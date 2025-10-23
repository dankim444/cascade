# Quick Connection Guide 🔗

## How to Connect Nodes

### Method 1: Drag and Drop (Recommended)
1. **Hover** over the handle on the right side of a node (it will grow)
2. **Click and hold** the handle (it will start pulsing blue)
3. **Drag** to another node's left handle
   - Handle turns **GREEN** ✅ if connection is valid
   - Handle turns **RED** ❌ if connection is not allowed
4. **Release** to create the connection

### Method 2: Click to Connect
1. **Click** the output handle (right side) of source node
2. **Click** the input handle (left side) of target node
3. Connection created automatically!

## Handle Colors Guide

### 🔵 Blue Handles
- Found on **Data Source Nodes** (output)
- Connect TO transformation nodes

### ⚫ Gray Handles
- Found on **Transform Nodes** (input & output)
- **Left side**: Input (receives data)
- **Right side**: Output (sends data)

## Connection Rules ✅❌

### ✅ Valid Connections
- Data Node → Transform Node
- Transform Node → Transform Node
- Any output → Any input

### ❌ Invalid Connections
- Input → Output (wrong direction)
- Output → Output (no input)
- Input → Input (no output)
- Self-connections (node to itself)

## Visual Feedback

### While Connecting
- **Bright blue line** follows your cursor
- **Pulsing animation** on source handle
- **Smooth curve** shows connection path

### When Hovering Target
- **Green glow** = Can connect here ✅
- **Red glow** = Cannot connect here ❌
- **Size grows** = Ready to receive connection

### After Connected
- **Animated arrow** shows data flow direction
- **Gray line** indicates established connection
- **Hover** makes line blue temporarily

## Pro Tips 💡

1. **Hover First**: Always hover to see handles grow before clicking
2. **Follow the Blue**: The bright blue line guides you
3. **Trust the Colors**: Green = go, Red = stop
4. **Use Grid**: Nodes snap to grid for aligned connections
5. **Zoom In**: If having trouble, zoom in for precision

## Keyboard Shortcuts

- **Delete** - Remove selected edge
- **Escape** - Cancel active connection
- **Space + Drag** - Pan canvas while connecting

## Common Patterns

### Linear Pipeline
```
[Data] → [Filter] → [Select] → [Sort]
```

### Fan-Out (One to Many)
```
[Data] → [Filter A]
      → [Filter B]
      → [Filter C]
```

### Chain with Join
```
[Data A] → [Filter] ─┐
                      ├→ [Join] → [Results]
[Data B] ────────────┘
```

## Troubleshooting

**Q: Handle won't connect?**
- A: Make sure you're connecting output (right) to input (left)

**Q: Can't see handles?**
- A: Hover over the edge of the node - they'll appear and grow

**Q: Connection line is red?**
- A: You're trying an invalid connection - check direction and node types

**Q: Accidentally connected wrong nodes?**
- A: Click the edge and press Delete, or select and use delete button

## Quick Reference

| Action | Result |
|--------|--------|
| Hover handle | Grows & glows |
| Click handle | Starts connection mode |
| Drag from handle | Shows blue line |
| Hover valid target | Target glows green |
| Hover invalid target | Target glows red |
| Release on valid | Creates connection |
| Release on invalid | Cancels connection |

---

**Practice makes perfect! The more you connect, the faster you'll get.** 🚀

