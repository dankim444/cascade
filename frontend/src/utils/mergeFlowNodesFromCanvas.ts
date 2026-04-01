import type { Node as FlowNode } from 'reactflow';

function isEmptyPlainObject(v: unknown): boolean {
  return (
    typeof v === 'object' &&
    v !== null &&
    !Array.isArray(v) &&
    Object.keys(v as object).length === 0
  );
}

/**
 * React Flow sometimes propagates node objects whose `data` omits keys the store still has
 * (e.g. after position/dimension updates). Merge so we do not drop `data.config` and other fields.
 */
export function mergeFlowNodesFromCanvas(
  previous: FlowNode[],
  fromCanvas: FlowNode[],
): FlowNode[] {
  return fromCanvas.map((node) => {
    const prev = previous.find((p) => p.id === node.id);
    if (!prev) return node;

    const pData = (prev.data || {}) as Record<string, unknown>;
    const nData = (node.data || {}) as Record<string, unknown>;
    const mergedData: Record<string, unknown> = { ...pData, ...nData };

    if (!Object.prototype.hasOwnProperty.call(nData, 'config') && 'config' in pData) {
      mergedData.config = pData.config;
    } else if (
      Object.prototype.hasOwnProperty.call(nData, 'config') &&
      isEmptyPlainObject(nData.config) &&
      'config' in pData &&
      !isEmptyPlainObject(pData.config)
    ) {
      mergedData.config = pData.config;
    }

    return { ...node, data: mergedData };
  });
}
