from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional
import asyncio
import hashlib

from app.core.database import SessionLocal
from app.core.security import get_user_from_token
from app.core.project_access import check_project_access

router = APIRouter()


def _color_for_user(user_id: str) -> str:
    colors = [
        "#3B82F6",  # blue-500
        "#8B5CF6",  # violet-500
        "#10B981",  # emerald-500
        "#F59E0B",  # amber-500
        "#EF4444",  # red-500
        "#6366F1",  # indigo-500
        "#14B8A6",  # teal-500
        "#EC4899",  # pink-500
        "#F97316",  # orange-500
        "#22C55E",  # green-500
    ]
    idx = int(hashlib.sha256(user_id.encode(
        "utf-8")).hexdigest(), 16) % len(colors)
    return colors[idx]


class PresenceManager:
    def __init__(self) -> None:
        self._rooms: Dict[str, Dict[str, Dict[str, Any]]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, project_id: str, user_info: Dict[str, Any], websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.setdefault(project_id, {})
            room[user_info["userId"]] = {
                "socket": websocket, "user": user_info}
            snapshot = [entry["user"] for entry in room.values()]

        await websocket.send_json({
            "type": "presence.snapshot",
            "payload": {"users": snapshot},
        })
        await self._broadcast(project_id, {
            "type": "presence.join",
            "payload": {"user": user_info},
        }, exclude=user_info["userId"])

    async def disconnect(self, project_id: str, user_id: str) -> None:
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room or user_id not in room:
                return
            del room[user_id]
            if not room:
                del self._rooms[project_id]

        await self._broadcast(project_id, {
            "type": "presence.leave",
            "payload": {"userId": user_id},
        })

    async def broadcast_cursor(self, project_id: str, payload: Dict[str, Any]) -> None:
        await self._broadcast(project_id, {
            "type": "presence.cursor",
            "payload": payload,
        })

    async def _broadcast(self, project_id: str, message: Dict[str, Any], exclude: Optional[str] = None) -> None:
        async with self._lock:
            room = dict(self._rooms.get(project_id, {}))

        dead_users = []
        for user_id, entry in room.items():
            if exclude and user_id == exclude:
                continue
            try:
                await entry["socket"].send_json(message)
            except Exception:
                dead_users.append(user_id)

        if dead_users:
            async with self._lock:
                room = self._rooms.get(project_id, {})
                for user_id in dead_users:
                    room.pop(user_id, None)
                if not room and project_id in self._rooms:
                    del self._rooms[project_id]


presence_manager = PresenceManager()


@router.websocket("/ws/presence")
async def presence_ws(websocket: WebSocket):
    token = websocket.query_params.get("token")
    project_id = websocket.query_params.get("project_id")

    if not token or not project_id:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db: Session = SessionLocal()
    user_id: Optional[str] = None

    try:
        user = get_user_from_token(token, db)
        user_id = user.id

        project, _, _ = check_project_access(project_id, user.id, db)
        if not project:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await websocket.accept()

        full_name = user.full_name or user.email
        initial = (user.full_name or user.email or "U").strip()[:1].upper()
        user_info = {
            "userId": user.id,
            "fullName": full_name,
            "initial": initial,
            "color": _color_for_user(user.id),
        }

        await presence_manager.connect(project_id, user_info, websocket)

        while True:
            data = await websocket.receive_json()
            msg_type = data.get("type")
            if msg_type == "presence.cursor":
                payload = data.get("payload", {})
                x = payload.get("x")
                y = payload.get("y")
                tab = payload.get("tab")
                if isinstance(x, (int, float)) and isinstance(y, (int, float)):
                    await presence_manager.broadcast_cursor(project_id, {
                        "userId": user_info["userId"],
                        "fullName": user_info["fullName"],
                        "color": user_info["color"],
                        "x": x,
                        "y": y,
                        "tab": tab,
                    })
            elif msg_type == "presence.tab":
                payload = data.get("payload", {})
                tab = payload.get("tab")
                if isinstance(tab, str):
                    await presence_manager._broadcast(project_id, {
                        "type": "presence.tab",
                        "payload": {
                            "userId": user_info["userId"],
                            "tab": tab,
                        },
                    })
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        if user_id:
            await presence_manager.disconnect(project_id, user_id)
        db.close()
