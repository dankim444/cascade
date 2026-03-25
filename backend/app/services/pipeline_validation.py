"""
Full-graph pipeline validation using the same executor path as /api/transformations/run.
"""
import os
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.models.user import User
from app.services.pipeline_data_resolution import resolve_data_connections_for_user
from app.services.pipeline_graph import (
    definition_to_data_connections_raw,
    flow_to_executor_nodes,
)
from app.transformations.executor_fixed import TransformationExecutor


def prepare_pipeline_for_execution(
    db: Session,
    current_user: User,
    pipeline: Dict[str, Any],
) -> Tuple[
    List[Dict[str, Any]],
    List[Dict[str, Any]],
    List[str],
    Optional[List[Dict[str, str]]],
]:
    """
    Resolve datasets, build executor nodes, run validate_pipeline_graph.
    Returns (nodes, data_connections, temp_files, validation_errors).
    validation_errors is None when the graph is valid; otherwise a list of { nodeId, message }.
    Caller must delete temp_files when done (including after failed validation).
    """
    temp_files: List[str] = []
    dcr = pipeline.get("dataConnections") or []
    if not dcr and pipeline.get("datasets"):
        dcr = definition_to_data_connections_raw(pipeline)

    if "flowNodes" in pipeline and pipeline.get("flowNodes") is not None:
        flow_nodes = pipeline.get("flowNodes") or []
        flow_edges = pipeline.get("flowEdges") or []
        if not flow_nodes:
            return [], [], temp_files, None
        if not dcr:
            return (
                [],
                [],
                temp_files,
                [{"nodeId": "", "message": "No datasets or data connections in pipeline"}],
            )
        resolved, err = resolve_data_connections_for_user(
            db, current_user, dcr, temp_files
        )
        if err:
            return [], [], temp_files, [{"nodeId": "", "message": err}]
        nodes = flow_to_executor_nodes(flow_nodes, flow_edges, resolved)
        data_connections = list(resolved)
    else:
        nodes = pipeline.get("nodes") or []
        resolved, err = resolve_data_connections_for_user(
            db, current_user, dcr, temp_files
        )
        if err:
            return [], [], temp_files, [{"nodeId": "", "message": err}]
        data_connections = list(resolved)

    executor = TransformationExecutor(data_connections)
    result = executor.validate_pipeline_graph(nodes, data_connections)
    if not result.get("valid"):
        return (
            nodes,
            data_connections,
            temp_files,
            result.get("errors") or [{"nodeId": "", "message": "Validation failed"}],
        )
    return nodes, data_connections, temp_files, None


def validate_pipeline_payload(
    db: Session,
    current_user: User,
    pipeline: Dict[str, Any],
) -> Tuple[bool, List[Dict[str, str]]]:
    """
    Returns (valid, errors). Cleans up temp DB files after validation.
    Skips validation when the payload has no graph (nothing to check).
    """
    if "flowNodes" not in pipeline and "nodes" not in pipeline:
        return True, []

    temp_files: List[str] = []
    try:
        nodes, _dc, temp_files, verrs = prepare_pipeline_for_execution(
            db, current_user, pipeline
        )
        if verrs is not None:
            return False, verrs
        if not nodes:
            return True, []
        return True, []
    finally:
        for p in temp_files:
            try:
                if os.path.exists(p):
                    os.unlink(p)
            except OSError:
                pass
