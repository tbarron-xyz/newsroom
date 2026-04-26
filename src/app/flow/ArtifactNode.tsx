"use client";

import React, { useState, useCallback } from "react";
import { Handle, Position, NodeProps, useReactFlow } from "@xyflow/react";
import { apiService } from "../services/api.service";

interface ArtifactInput {
  name: string;
  source: "artifacts" | "external";
  type?: string;
}

interface ArtifactData {
  id: string;
  type: string;
  status: string;
  inputs: ArtifactInput[];
  prompt_system: string;
  prompt_user_template: string;
  output_schema: any;
  output?: string;
  metadata?: {
    model_name?: string;
    reporterId?: string;
    generated_at?: number;
    status: string;
    error_message?: string;
  };
}

type Props = NodeProps;

function getStatusColor(status: string) {
  switch (status) {
    case "completed":
      return "green";
    case "pending":
      return "yellow";
    case "running":
      return "blue";
    default:
      return "red";
  }
}

const ArtifactNode: React.FC<Props> = ({ id, data }) => {
  const [localData, setLocalData] = useState<any>(data);
  const reactFlow = useReactFlow();

  const updateNodeData = useCallback(
    (updates: any) => {
      const newData = { ...localData, ...updates };
      setLocalData(newData);
      reactFlow.setNodes((nds) =>
        nds.map((node) => (node.id === id ? { ...node, data: newData } : node))
      );
    },
    [id, localData, reactFlow]
  );

  const handleSave = async () => {
    try {
      await apiService.put(`/api/artifacts/${id}`, localData);
      alert("Saved");
    } catch (error) {
      alert("Save failed");
    }
  };

  const handleDelete = async () => {
    if (!confirm("Delete artifact?")) return;
    try {
      await apiService.delete(`/api/artifacts/${id}`);
      reactFlow.setNodes((nds) => nds.filter((n) => n.id !== id));
    } catch (error) {
      alert("Delete failed");
    }
  };

  const handleQueue = async () => {
    try {
      await apiService.post(`/api/artifacts/queue/${id}`);
      alert("Queued");
    } catch (error) {
      alert("Queue failed");
    }
  };

  const handleView = () => {
    if (localData.output) {
      alert(localData.output);
    } else {
      alert("No output");
    }
  };

  const addInput = () => {
    updateNodeData({
      inputs: [...localData.inputs, { name: "", source: "external", type: "" }]
    });
  };

  const updateInput = (
    index: number,
    field: keyof ArtifactInput,
    value: string
  ) => {
    const newInputs = [...localData.inputs];
    newInputs[index] = { ...newInputs[index], [field]: value };
    updateNodeData({ inputs: newInputs });
  };

  const statusColor = getStatusColor(localData.status);

  const inputHandleTop = 20;
  const handleSpacing = 40;

  return (
    <div className="bg-white border-2 border-gray-300 rounded-lg shadow-lg p-4 w-80 min-h-[300px] flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-center mb-3 p-2 bg-gray-50 rounded">
        <input
          value={localData.type}
          onChange={(e) => updateNodeData({ type: e.target.value })}
          className="font-bold text-lg text-gray-900 bg-transparent outline-none w-full placeholder-gray-400"
          placeholder="Type"
        />
        <div
          className="w-4 h-4 rounded-full"
          style={{
            backgroundColor:
              statusColor === "green"
                ? "#22c55e"
                : statusColor === "yellow"
                  ? "#eab308"
                  : statusColor === "blue"
                    ? "#3b82f6"
                    : "#ef4444"
          }}
          title={localData.status}
        />
      </div>

      {/* Inputs */}
      <div className="flex-1 mb-4">
        {localData.inputs.map((input: ArtifactInput, i: number) => (
          <div
            key={i}
            className="flex items-center mb-2 p-2 border rounded hover:bg-gray-50"
          >
            <Handle
              type="target"
              position={Position.Left}
              id={`input-${i}`}
              style={{ top: `${inputHandleTop + i * handleSpacing}px` }}
            />
            <select
              value={input.source}
              onChange={(e) =>
                updateInput(
                  i,
                  "source",
                  e.target.value as "artifacts" | "external"
                )
              }
              className="ml-2 p-1 border rounded text-xs text-gray-900"
            >
              <option value="artifacts">artifacts</option>
              <option value="external">external</option>
            </select>
            <input
              value={input.type}
              onChange={(e) => updateInput(i, "type", e.target.value)}
              className="ml-1 p-1 border rounded text-xs text-gray-900 w-16"
              placeholder="type"
            />
            <input
              value={input.name}
              onChange={(e) => updateInput(i, "name", e.target.value)}
              className="flex-1 ml-2 p-1 border rounded text-sm text-gray-900 placeholder-gray-400"
              placeholder="Input name"
            />
          </div>
        ))}
        <button
          onClick={addInput}
          className="text-blue-500 text-sm hover:underline mt-2"
        >
          + Add Input
        </button>
      </div>

      {/* Prompts/Schema */}
      <div className="space-y-2 flex-1">
        <textarea
          value={localData.prompt_system}
          onChange={(e) => updateNodeData({ prompt_system: e.target.value })}
          className="w-full p-2 border rounded resize-none h-20 text-sm text-gray-900 placeholder-gray-400"
          placeholder="System prompt"
        />
        <textarea
          value={localData.prompt_user_template}
          onChange={(e) =>
            updateNodeData({ prompt_user_template: e.target.value })
          }
          className="w-full p-2 border rounded resize-none h-20 text-sm text-gray-900 placeholder-gray-400"
          placeholder="User prompt template"
        />
        <textarea
          value={JSON.stringify(localData.output_schema, null, 2)}
          onChange={(e) => {
            try {
              updateNodeData({ output_schema: JSON.parse(e.target.value) });
            } catch {}
          }}
          className="w-full p-2 border rounded resize-none h-24 text-xs font-mono text-gray-900 placeholder-gray-400"
          placeholder='{ "type": "object", ... }'
        />
      </div>

      {/* Footer */}
      <div className="flex gap-1 mb-2 pt-2 border-t">
        <button
          onClick={handleSave}
          className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
        >
          Save
        </button>
        <button
          onClick={handleDelete}
          className="px-3 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
        >
          Del
        </button>
        <button
          onClick={handleQueue}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Queue
        </button>
        <button
          onClick={handleView}
          className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
        >
          View
        </button>
      </div>
      <input
        value={localData.metadata?.model_name || ""}
        onChange={(e) =>
          updateNodeData({
            metadata: { ...localData.metadata, model_name: e.target.value }
          })
        }
        className="w-full p-1 border rounded text-xs text-gray-900 placeholder-gray-400"
        placeholder="Model name (e.g., gpt-4o)"
      />
      <Handle type="source" position={Position.Right} id="output" />
      {localData.output && (
        <div className="text-xs text-gray-500 mt-1 p-1 bg-gray-100 rounded">
          Output: {localData.output.slice(0, 100)}...
        </div>
      )}
    </div>
  );
};

export default ArtifactNode;
