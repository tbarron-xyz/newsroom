"use client";

import React, { useCallback, useEffect, useState, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
  addEdge,
  useReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  applyEdgeChanges
} from "@xyflow/react";
import type { Connection } from "@xyflow/system";
import ArtifactNode from "./ArtifactNode";
import { apiService } from "../services/api.service";

interface ArtifactInput {
  name: string;
  source: "artifacts" | "external";
  type?: string;
}

interface Artifact extends Record<string, unknown> {
  id: string;
  type: string;
  status: string;
  inputs: ArtifactInput[];
  prompt_system: string;
  prompt_user_template: string;
  output_schema: Record<string, unknown>;
  output?: string;
  metadata?: {
    model_name?: string;
    reporterId?: string;
    generated_at?: number;
    status: string;
    error_message?: string;
  };
}

interface FlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Artifact;
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

interface Job {
  id: string;
  type: string;
  status: string;
  inputs: any[];
  prompt_system: string;
  prompt_user_template: string;
  output_schema: any;
  output?: string;
}

interface Job {
  id: string;
  artifactId?: string;
  status: string;
  output?: string;
}

const initialNodes: FlowNode[] = [];
const initialEdges: FlowEdge[] = [];

const nodeTypes = {
  artifact: ArtifactNode
};

const STORAGE_KEY_NODES = "reactflow-artifacts-nodes";
const STORAGE_KEY_EDGES = "reactflow-artifacts-edges";

function getInitialPosition(type: string, index = 0) {
  const typeOffsets: Record<string, number> = {
    event: 0,
    article: 400,
    edition: 800
  };
  const baseY = typeOffsets[type] || 0;
  return {
    x: index * 500,
    y: baseY + Math.random() * 100 // Slight stagger
  };
}

function FlowPage() {
  const [nodes, setNodes, onNodesChange] =
    useNodesState<FlowNode>(initialNodes);
  const [edges, setEdges, onEdgesChange] =
    useEdgesState<FlowEdge>(initialEdges);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const rfInstance = useReactFlow();
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadArtifacts = useCallback(async () => {
    try {
      const artifacts: Artifact[] = await apiService.get("/api/artifacts");
      let newNodes: FlowNode[] = artifacts.map((artifact, index) => ({
        id: artifact.id,
        type: "artifact",
        position: getInitialPosition(artifact.type, index),
        data: artifact
      }));

      // Override with saved positions
      const savedNodes = localStorage.getItem(STORAGE_KEY_NODES);
      if (savedNodes) {
        try {
          const parsedNodes: FlowNode[] = JSON.parse(savedNodes);
          newNodes = newNodes.map((node) => {
            const saved = parsedNodes.find((n) => n.id === node.id);
            return saved ? { ...node, position: saved.position } : node;
          });
        } catch {}
      }

      setNodes(newNodes);
    } catch (error) {
      console.error("Failed to load artifacts", error);
    }
  }, [setNodes]);

  const loadJobs = useCallback(async () => {
    try {
      const jobsData: Job[] = await apiService.get("/api/artifacts/jobs");
      setJobs(jobsData);

      // Update node statuses from jobs
      jobsData.forEach((job) => {
        if (job.artifactId) {
          setNodes((nds) =>
            nds.map((node) =>
              node.id === job.artifactId
                ? {
                    ...node,
                    data: {
                      ...node.data,
                      status: job.status,
                      output: job.output || node.data.output
                    }
                  }
                : node
            )
          );
        }
      });
    } catch (error) {
      console.error("Failed to load jobs", error);
    }
  }, [setJobs, setNodes]);

  // Load on mount
  useEffect(() => {
    loadArtifacts();

    // Load saved edges
    const savedEdges = localStorage.getItem(STORAGE_KEY_EDGES);
    if (savedEdges) {
      try {
        setEdges(JSON.parse(savedEdges));
      } catch {}
    }

    // Poll jobs
    loadJobs();
    pollInterval.current = setInterval(loadJobs, 5000);

    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
    };
  }, [loadArtifacts, loadJobs, setEdges]);

  // Save positions and edges on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_NODES, JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_EDGES, JSON.stringify(edges));
  }, [edges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      const newEdge = addEdge(connection, edges);

      // Update target inputs
      const targetNode = nodes.find((n) => n.id === connection.target);
      const sourceNode = nodes.find((n) => n.id === connection.source);
      if (targetNode?.data && sourceNode?.data) {
        const newInput = {
          name: `${sourceNode.data.type}#${connection.source.slice(-4)}`,
          source: "artifacts" as const,
          type: sourceNode.data.type
        };
        const newData = {
          ...targetNode.data,
          inputs: [...(targetNode.data.inputs || []), newInput]
        };
        setNodes((nds) =>
          nds.map((node) =>
            node.id === connection.target ? { ...node, data: newData } : node
          )
        );
      }

      setEdges(newEdge);
    },
    [edges, nodes, setNodes, setEdges]
  );

  const onNodeDragStop = useCallback(() => {
    rfInstance.fitView();
  }, [rfInstance]);

  const handleRefresh = () => {
    loadArtifacts();
    loadJobs();
  };

  const handleNew = () => {
    setShowCreateModal(true);
  };

  // Create modal placeholder (expand later)
  const handleCreate = async (
    formData: Omit<Artifact, "id" | "status" | "output">
  ) => {
    try {
      const newArtifact = await apiService.post<Artifact>(
        "/api/artifacts",
        formData
      );
      setNodes((nds) => [
        ...nds,
        {
          id: newArtifact.id,
          type: "artifact",
          position: { x: Math.random() * 400, y: Math.random() * 400 },
          data: newArtifact
        } as FlowNode
      ]);
      setShowCreateModal(false);
    } catch (error) {
      alert("Create failed");
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <header className="bg-white border-b p-4 flex justify-between items-center shadow-sm">
        <h1 className="text-2xl font-bold">Artifact Flow</h1>
        <div className="space-x-2">
          <button
            onClick={handleNew}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            +New
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Refresh
          </button>
        </div>
      </header>
      <div className="flex-1">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeDragStop={onNodeDragStop}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.2}
          maxZoom={2}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background />
          <Controls />
          <MiniMap />
          <Panel position="top-right">
            Nodes: {nodes.length} | Edges: {edges.length}
          </Panel>
        </ReactFlow>
      </div>

      {/* Create Modal - Simplified form */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4 max-h-[80vh] overflow-auto">
            <h2 className="text-xl font-bold mb-4">New Artifact</h2>
            {/* Add form fields similar to node */}
            <div className="space-y-4">
              <input
                placeholder="Type"
                id="type"
                className="w-full p-2 border rounded"
              />
              <textarea
                placeholder="System Prompt"
                className="w-full p-2 border rounded h-20"
              />
              <textarea
                placeholder="User Template"
                className="w-full p-2 border rounded h-20"
              />
              <textarea
                placeholder="Output Schema JSON"
                className="w-full p-2 border rounded h-24 text-sm"
              />
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-full px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleCreate({
                    /* form data */
                  })
                }
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FlowPageWrapper() {
  return (
    <ReactFlowProvider>
      <FlowPage />
    </ReactFlowProvider>
  );
}
