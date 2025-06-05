export interface MindMapNode {
  id: string;
  label: string;
  color: string;
  parent?: string;
  level?: number;
}

export interface MindMapData {
  central: MindMapNode;
  nodes: MindMapNode[];
}

export interface MindMapResponse {
  mindMap: MindMapData;
}

export interface MindMapRequest {
  explanation: string;
  topic: string;
} 