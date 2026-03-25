"""
Convert React Flow pipeline definitions (flowNodes, flowEdges) to executor node payloads.
Mirrors frontend/src/store/useWorkflowStore.ts executeToNode mapping.
"""
import json
from typing import Any, Dict, List, Optional


def _get_node(flow_nodes: List[Dict[str, Any]], node_id: str) -> Optional[Dict[str, Any]]:
    for n in flow_nodes:
        if n.get("id") == node_id:
            return n
    return None


def build_path_to_node(
    flow_nodes: List[Dict[str, Any]], flow_edges: List[Dict[str, Any]], target_id: str
) -> List[Dict[str, Any]]:
    path: List[Dict[str, Any]] = []
    visited = set()

    def traverse(node_id: str) -> None:
        if node_id in visited:
            return
        visited.add(node_id)
        for e in flow_edges:
            if e.get("target") == node_id:
                traverse(e.get("source"))
        node = _get_node(flow_nodes, node_id)
        if node:
            path.append(node)

    traverse(target_id)
    return path


def get_leaf_nodes(
    flow_nodes: List[Dict[str, Any]], flow_edges: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    has_out = {e.get("source") for e in flow_edges if e.get("source")}
    return [n for n in flow_nodes if n.get("id") not in has_out]


def flow_to_executor_nodes(
    flow_nodes: List[Dict[str, Any]],
    flow_edges: List[Dict[str, Any]],
    data_connections: List[Dict[str, Any]],
) -> List[Dict[str, Any]]:
    """
    Same scope as executePipeline: path from roots to last leaf, transform nodes only.
    """
    leaves = get_leaf_nodes(flow_nodes, flow_edges)
    if not leaves:
        return []
    target_id = leaves[-1]["id"]
    path = build_path_to_node(flow_nodes, flow_edges, target_id)
    transform_nodes = [
        n
        for n in path
        if n.get("type") in ("transformNode", "mlNode")
    ]
    return [_map_transform_node(n, flow_nodes, flow_edges, data_connections) for n in transform_nodes]


def _map_transform_node(
    node: Dict[str, Any],
    flow_nodes: List[Dict[str, Any]],
    flow_edges: List[Dict[str, Any]],
    data_connections: List[Dict[str, Any]],
) -> Dict[str, Any]:
    data = node.get("data") or {}
    operation = data.get("operation")

    if operation == "join":
        incoming = [e for e in flow_edges if e.get("target") == node["id"]]
        left_edge = next(
            (
                e
                for e in flow_edges
                if e.get("target") == node["id"] and e.get("targetHandle") == "input-left"
            ),
            None,
        )
        right_edge = next(
            (
                e
                for e in flow_edges
                if e.get("target") == node["id"] and e.get("targetHandle") == "input-right"
            ),
            None,
        )
        if not left_edge and len(incoming) >= 1:
            left_edge = incoming[0]
        if not right_edge and len(incoming) >= 2:
            right_edge = incoming[1]

        left_data_key = ""
        if left_edge:
            left_node = _get_node(flow_nodes, left_edge["source"])
            if left_node and left_node.get("type") == "dataNode":
                left_data_key = (left_node.get("data") or {}).get("dataKey", "")
            else:
                left_data_key = left_edge.get("source", "")

        right_data_key = ""
        if right_edge:
            right_node = _get_node(flow_nodes, right_edge["source"])
            if right_node and right_node.get("type") == "dataNode":
                right_data_key = (right_node.get("data") or {}).get("dataKey", "")
            else:
                right_data_key = right_edge.get("source", "")

        join_config = {**(data.get("config") or {}), "rightDataKey": right_data_key}

        return {
            "id": node["id"],
            "transform": {
                "operation": operation,
                "params": [json.dumps(join_config)],
            },
            "data": left_data_key,
            "parent": left_edge.get("source") if left_edge else None,
            "child": next(
                (e.get("target") for e in flow_edges if e.get("source") == node["id"]),
                None,
            ),
            "secondaryParent": right_edge.get("source") if right_edge else None,
        }

    parent_edge = next((e for e in flow_edges if e.get("target") == node["id"]), None)

    if parent_edge:
        parent_node = _get_node(flow_nodes, parent_edge["source"])
        if parent_node and parent_node.get("type") == "dataNode":
            input_data_key = (parent_node.get("data") or {}).get("dataKey", "")
        else:
            input_data_key = parent_edge.get("source", "")
    else:
        input_data_key = data_connections[0].get("dataKey", "") if data_connections else ""

    return {
        "id": node["id"],
        "transform": {
            "operation": operation,
            "params": [json.dumps(data.get("config") or {})],
        },
        "data": input_data_key,
        "parent": parent_edge.get("source") if parent_edge else None,
        "child": next(
            (e.get("target") for e in flow_edges if e.get("source") == node["id"]),
            None,
        ),
    }


def definition_to_data_connections_raw(definition: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Build dataConnections list from saved definition.datasets (matches client shape)."""
    datasets = definition.get("datasets") or []
    out: List[Dict[str, Any]] = []
    for ds in datasets:
        dk = ds.get("dataKey")
        if not dk:
            continue
        cols = ds.get("columns") or []
        out.append(
            {
                "dataKey": dk,
                "sqlConnection": f"data/{dk}.db",
                "schema": {"columns": cols},
                "rowCount": ds.get("rowCount", 0),
            }
        )
    return out
