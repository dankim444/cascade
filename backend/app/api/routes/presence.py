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
        self._locks: Dict[str, Dict[str, Dict[str, str]]] = {}
        self._pipeline_status: Dict[str, Dict[str, Any]] = {}
        self._lock = asyncio.Lock()

    async def connect(self, project_id: str, user_info: Dict[str, Any], websocket: WebSocket) -> None:
        async with self._lock:
            room = self._rooms.setdefault(project_id, {})
            room[user_info["userId"]] = {
                "socket": websocket, "user": user_info}
            snapshot = [entry["user"] for entry in room.values()]
            locks = self._locks.get(project_id, {})
            pipeline_status = self._pipeline_status.get(
                project_id, {"status": "idle"})

        await websocket.send_json({
            "type": "presence.snapshot",
            "payload": {
                "users": snapshot,
                "locks": locks,
                "pipelineStatus": pipeline_status,
            },
        })
        await self._broadcast(project_id, {
            "type": "presence.join",
            "payload": {"user": user_info},
        }, exclude=user_info["userId"])

    async def disconnect(self, project_id: str, user_id: str) -> None:
        released_nodes = []
        async with self._lock:
            room = self._rooms.get(project_id)
            if not room or user_id not in room:
                return
            del room[user_id]
            if not room:
                del self._rooms[project_id]

            project_locks = self._locks.get(project_id, {})
            for node_id, holder in list(project_locks.items()):
                if holder.get("userId") == user_id:
                    released_nodes.append(node_id)
                    del project_locks[node_id]
            if not project_locks and project_id in self._locks:
                del self._locks[project_id]

        await self._broadcast(project_id, {
            "type": "presence.leave",
            "payload": {"userId": user_id},
        })
        for node_id in released_nodes:
            await self._broadcast(project_id, {
                "type": "lock.released",
                "payload": {"nodeId": node_id, "releasedBy": user_id},
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

    async def handle_lock_request(self, project_id: str, user_info: Dict[str, Any], node_id: str) -> Dict[str, Any]:
        async with self._lock:
            project_locks = self._locks.setdefault(project_id, {})
            current = project_locks.get(node_id)

            if current and current.get("userId") != user_info["userId"]:
                return {
                    "type": "lock.granted",
                    "payload": {
                        "nodeId": node_id,
                        "granted": False,
                        "holder": current,
                    },
                }

            project_locks[node_id] = {
                "userId": user_info["userId"],
                "fullName": user_info["fullName"],
            }

        await self._broadcast(project_id, {
            "type": "lock.granted",
            "payload": {
                "nodeId": node_id,
                "granted": True,
                "holder": project_locks[node_id],
            },
        })

        return {
            "type": "lock.granted",
            "payload": {
                "nodeId": node_id,
                "granted": True,
                "holder": project_locks[node_id],
            },
        }

    async def handle_lock_release(self, project_id: str, user_info: Dict[str, Any], node_id: str) -> None:
        async with self._lock:
            project_locks = self._locks.get(project_id, {})
            current = project_locks.get(node_id)
            if not current:
                return
            if current.get("userId") != user_info["userId"]:
                return
            del project_locks[node_id]
            if not project_locks and project_id in self._locks:
                del self._locks[project_id]

        await self._broadcast(project_id, {
            "type": "lock.released",
            "payload": {"nodeId": node_id, "releasedBy": user_info["userId"]},
        })

    async def set_pipeline_status(self, project_id: str, status: str, payload: Dict[str, Any]) -> None:
        async with self._lock:
            self._pipeline_status[project_id] = {"status": status, **payload}

        await self._broadcast(project_id, {
            "type": "pipeline.status",
            "payload": {"status": status, **payload},
        })

    async def broadcast_visualization_changed(
        self,
        project_id: str,
        action: str,
        graph_id: Optional[str] = None,
    ) -> None:
        await self._broadcast(project_id, {
            "type": "visualization.changed",
            "payload": {
                "projectId": project_id,
                "action": action,
                "graphId": graph_id,
            },
        })

    async def broadcast_permission_changed(
        self,
        project_id: str,
        changed_user_id: Optional[str] = None,
        permission: Optional[str] = None,
    ) -> None:
        await self._broadcast(project_id, {
            "type": "project.permission_changed",
            "payload": {
                "projectId": project_id,
                "changedUserId": changed_user_id,
                "permission": permission,
            },
        })


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

        project, is_owner, permission = check_project_access(
            project_id, user.id, db)
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
            elif msg_type == "lock.request":
                payload = data.get("payload", {})
                node_id = payload.get("nodeId")
                if isinstance(node_id, str):
                    response = await presence_manager.handle_lock_request(
                        project_id, user_info, node_id)
                    await websocket.send_json(response)
            elif msg_type == "lock.release":
                payload = data.get("payload", {})
                node_id = payload.get("nodeId")
                if isinstance(node_id, str):
                    await presence_manager.handle_lock_release(
                        project_id, user_info, node_id)
            elif msg_type == "node.update":
                payload = data.get("payload", {})
                node_id = payload.get("nodeId")
                timestamp = payload.get("timestamp")
                if isinstance(node_id, str) and isinstance(timestamp, (int, float)):
                    await presence_manager._broadcast(project_id, {
                        "type": "node.update",
                        "payload": payload,
                    }, exclude=user_info["userId"])
            elif msg_type == "edge.update":
                payload = data.get("payload", {})
                timestamp = payload.get("timestamp")
                if isinstance(timestamp, (int, float)):
                    await presence_manager._broadcast(project_id, {
                        "type": "edge.update",
                        "payload": payload,
                    }, exclude=user_info["userId"])
            elif msg_type == "pipeline.execute":
                if not (is_owner or permission == "admin"):
                    await websocket.send_json({
                        "type": "pipeline.status",
                        "payload": {
                            "status": "denied",
                            "message": "Only admins can execute pipelines.",
                        },
                    })
                    continue
                await presence_manager.set_pipeline_status(project_id, "running", {
                    "byUserId": user_info["userId"],
                    "byFullName": user_info["fullName"],
                })
            elif msg_type == "pipeline.status":
                payload = data.get("payload", {})
                status_value = payload.get("status")
                if isinstance(status_value, str):
                    await presence_manager.set_pipeline_status(project_id, status_value, {
                        "byUserId": user_info["userId"],
                        "byFullName": user_info["fullName"],
                        "message": payload.get("message"),
                    })
    except WebSocketDisconnect:
        pass
    except Exception:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
    finally:
        if user_id:
            await presence_manager.disconnect(project_id, user_id)
        db.close()
