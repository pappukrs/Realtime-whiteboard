# Realtime Collaborative Whiteboard

A production-grade real-time collaborative whiteboard web application similar to Google Docs + Canva + Miro, where multiple users can draw and edit a shared canvas in real time.

---

## Tech Stack

| Layer          | Technology                                    |
| -------------- | --------------------------------------------- |
| Frontend       | React + TypeScript, Vite, Konva.js, Zustand   |
| UI             | Tailwind CSS, Lucide Icons, Shadcn/ui         |
| Backend        | Node.js + Express (MVC), Socket.io            |
| Database       | MongoDB (via Mongoose)                        |
| Pub/Sub        | Redis (via ioredis + @socket.io/redis-adapter) |
| Infrastructure | Docker Compose (Redis, MongoDB)               |

---

## Project Structure

```
canva-miro/
├── docker-compose.yml          # Redis + MongoDB containers
│
├── backend/                    # Node.js Express Server (MVC)
│   ├── src/
│   │   ├── index.ts            # Entry point — bootstraps DB, Redis, Socket, Server
│   │   ├── app.ts              # Express app — middleware, routes
│   │   ├── config/
│   │   │   ├── database.ts     # MongoDB connection
│   │   │   └── redis.ts        # Redis pub/sub client setup
│   │   ├── models/
│   │   │   └── Board.ts        # Mongoose schema for Board (roomId + elements)
│   │   ├── services/
│   │   │   └── board.service.ts  # Business logic (getBoardState, saveBoardState)
│   │   ├── controllers/
│   │   │   └── board.controller.ts  # REST API handlers
│   │   ├── routes/
│   │   │   └── board.routes.ts  # Express route definitions
│   │   └── socket/
│   │       └── socket.handler.ts  # Socket.io event handlers
│   ├── tsconfig.json
│   └── package.json
│
└── frontend/                   # React + Vite Application
    ├── src/
    │   ├── main.tsx             # React DOM mount
    │   ├── App.tsx              # Root component with router
    │   ├── pages/
    │   │   └── Index.tsx        # Main page — room generation + Whiteboard mount
    │   ├── components/
    │   │   ├── canvas/
    │   │   │   └── Whiteboard.tsx  # Core canvas — drawing, tools, grid, zoom/pan
    │   │   └── toolbar/
    │   │       └── Toolbar.tsx  # Drawing tool palette + color pickers + undo/redo
    │   ├── hooks/
    │   │   └── useSocket.ts    # WebSocket connection hook (emit/receive events)
    │   ├── store/
    │   │   └── useBoardStore.ts  # Zustand state — elements, tools, history, view
    │   └── types/
    │       └── canvas.ts       # TypeScript types (ToolType, CanvasElement, Point, UserCursor)
    ├── index.html
    ├── vite.config.ts
    ├── tailwind.config.ts
    └── package.json
```

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React + Vite)                        │
│                                                                        │
│  ┌─────────┐    ┌──────────────┐    ┌────────────┐    ┌────────────┐  │
│  │ Index   │───▶│ Whiteboard   │───▶│ Toolbar    │    │ useSocket  │  │
│  │ (Page)  │    │ (Canvas)     │◀──▶│ (UI)       │    │ (Hook)     │  │
│  └─────────┘    └──────┬───────┘    └────────────┘    └─────┬──────┘  │
│                        │                                     │         │
│                        ▼                                     │         │
│               ┌──────────────┐                              │         │
│               │ useBoardStore│◀─────────────────────────────┘         │
│               │ (Zustand)    │                                        │
│               └──────────────┘                                        │
└──────────────────────────────┬────────────────────────────────────────┘
                               │ Socket.io (WebSocket)
                               ▼
┌──────────────────────────────────────────────────────────────────────┐
│                     BACKEND (Express + Socket.io)                    │
│                                                                      │
│  ┌──────────┐    ┌────────────────┐    ┌─────────────────────┐      │
│  │ index.ts │───▶│ app.ts         │───▶│ board.routes.ts     │      │
│  │ (Boot)   │    │ (Express App)  │    │ board.controller.ts │      │
│  └────┬─────┘    └────────────────┘    └──────────┬──────────┘      │
│       │                                            │                 │
│       ▼                                            ▼                 │
│  ┌─────────────────┐                    ┌─────────────────┐         │
│  │ socket.handler  │───────────────────▶│ board.service   │         │
│  │ (Realtime)      │                    │ (Business Logic)│         │
│  └────────┬────────┘                    └────────┬────────┘         │
│           │                                       │                  │
│           ▼                                       ▼                  │
│  ┌──────────────┐                       ┌──────────────┐            │
│  │ Redis Adapter│                       │ MongoDB      │            │
│  │ (Pub/Sub)    │                       │ (Persistence)│            │
│  └──────────────┘                       └──────────────┘            │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow

### 1. Room Joining
```
User opens app → Index.tsx generates/retrieves roomId from localStorage
                → Whiteboard mounts → useSocket connects to backend
                → socket.emit('join-room', roomId)
                → Server fetches stored board from MongoDB via BoardService
                → Server sends 'board-state' to the joining user
                → useBoardStore.setElements() renders all elements
```

### 2. Drawing Flow (Real-time)
```
User draws on canvas → handleMouseDown creates new CanvasElement
                     → addElement() updates Zustand store (local render)
                     → handleMouseUp → emitDraw(element) sends to server
                     → Server broadcasts 'draw-update' to other room users
                     → Other users' useSocket receives 'draw-update'
                     → addElement() renders the element on their canvas
```

### 3. Eraser Flow
```
User selects Eraser → clicks on an element
                    → removeElement(id) removes from local store
                    → emitRemoveElement(id) sends to server
                    → Server broadcasts 'element-removed' to room
                    → Other users' removeElement(id) removes it
```

### 4. Text Tool Flow
```
User selects Text tool → clicks on canvas
                       → A textarea overlay appears at click position
                       → User types text and presses Enter
                       → handleTextSave() creates a CanvasElement of type 'text'
                       → addElement() + emitDraw() syncs to all users
```

### 5. Undo/Redo Flow
```
Every draw/erase/clear action → commitHistory() saves current elements[] snapshot
Ctrl+Z → undo() reverts to previous snapshot → emitSyncBoard(elements)
Ctrl+Y → redo() moves forward in history    → emitSyncBoard(elements)
Server broadcasts 'sync-board' → other users setElements()
```

---

## Socket Events Reference

| Event              | Direction         | Payload                          | Purpose                           |
| ------------------ | ----------------- | -------------------------------- | --------------------------------- |
| `join-room`        | Client → Server   | `roomId`                         | Join a whiteboard room            |
| `board-state`      | Server → Client   | `elements[]`                     | Initial board state on join       |
| `draw`             | Client → Server   | `{ roomId, element }`            | Send a new/updated element        |
| `draw-update`      | Server → Client   | `element`                        | Broadcast element to other users  |
| `remove-element`   | Client → Server   | `{ roomId, id }`                 | Remove a specific element         |
| `element-removed`  | Server → Client   | `id`                             | Broadcast element removal         |
| `clear-board`      | Client → Server   | `{ roomId }`                     | Clear entire board                |
| `board-cleared`    | Server → Client   | —                                | Broadcast board clear             |
| `sync-board`       | Bidirectional      | `{ roomId, elements[] }`         | Full state sync (undo/redo)       |
| `cursor-move`      | Client → Server   | `{ roomId, cursor: {x,y} }`     | Send cursor position              |
| `cursor-update`    | Server → Client   | `{ userId, cursor }`            | Broadcast cursor to others        |
| `save-board`       | Client → Server   | `{ roomId, elements[] }`         | Persist board to MongoDB          |

---

## Zustand Store (`useBoardStore`)

### State
| Property           | Type                          | Description                        |
| ------------------ | ----------------------------- | ---------------------------------- |
| `elements`         | `CanvasElement[]`             | All canvas elements                |
| `cursors`          | `Record<string, UserCursor>`  | Connected users' cursor positions  |
| `activeTool`       | `ToolType`                    | Currently selected tool            |
| `selectedElementId`| `string \| null`              | Currently selected element         |
| `strokeColor`      | `string`                      | Current stroke color               |
| `fillColor`        | `string`                      | Current fill color                 |
| `strokeWidth`      | `number`                      | Current stroke width               |
| `zoom`             | `number`                      | Canvas zoom level (0.1–5)          |
| `stagePos`         | `Point`                       | Canvas pan offset                  |
| `showGrid`         | `boolean`                     | Grid visibility                    |
| `history`          | `CanvasElement[][]`           | Undo/redo history snapshots        |
| `historyStep`      | `number`                      | Current position in history        |

### Available Tools
`select` · `pan` · `pencil` · `rectangle` · `circle` · `line` · `arrow` · `text` · `eraser`

---

## Canvas Features (Implemented)

- **Infinite Canvas** — Pan freely in any direction with the Hand tool or middle mouse button
- **Zoom** — Mouse wheel zoom anchored to cursor position (0.1x – 5x)
- **Grid System** — Dynamic grid that scales with zoom and extends with pan
- **Freehand Pen** — Smooth freehand drawing with customizable stroke
- **Shapes** — Rectangle, Circle, Line, Arrow with stroke + fill colors
- **Text Tool** — Click to place, type, and render text elements on canvas
- **Eraser** — Click on any element to remove it
- **Color Pickers** — Separate stroke color and fill color selection
- **Stroke Width** — Adjustable via range slider
- **Clear Canvas** — Remove all elements with one click
- **Undo / Redo** — Full history with Ctrl+Z / Ctrl+Y keyboard shortcuts
- **Real-time Sync** — All actions broadcast to room participants instantly
- **Cursor Presence** — See other users' cursors with labels in real-time
- **Board Persistence** — Save/load board state to/from MongoDB

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- Docker & Docker Compose

### 1. Start Infrastructure
```bash
docker compose up -d
```
This starts **Redis** (port 6379) and **MongoDB** (port 27017).

### 2. Start Backend
```bash
cd backend
npm install
npm run dev
```
Backend runs on `http://localhost:4000`.

### 3. Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Frontend runs on `http://localhost:5173`.

### 4. Open in Browser
Navigate to `http://localhost:5173`. A unique room ID is auto-generated. Share the same room ID (via localStorage) across tabs to test multi-user collaboration.

---

## Next Features to Build
Refer to `plan.md` for the full roadmap. Upcoming items include:
- Selection & Multi-select with bounding box
- Layer management (z-index ordering, lock, hide)
- Image upload support
- Sticky notes
- Export to PNG/PDF
- User authentication & room sharing via URL
- Reconnection handling with state reconciliation
