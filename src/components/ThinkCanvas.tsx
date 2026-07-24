"use client";

import { useState, useRef, useCallback } from "react";

type Direction =
  | "moreGeneral"
  | "adjacentSibling"
  | "consequence"
  | "moreSpecific";

interface ThinkSuggestion {
  moreGeneral: string;
  adjacentSibling: string;
  consequence: string;
  moreSpecific: string;
}

interface ThinkCanvasProps {
  suggestions: {
    round1: ThinkSuggestion;
    round2: Record<Direction, ThinkSuggestion>;
  } | null;
  loading: boolean;
}

const DIRECTION_LABELS: Record<Direction, { label: string; sub: string }> = {
  moreGeneral: { label: "More General", sub: "Zoom out" },
  adjacentSibling: { label: "Adjacent Sibling", sub: "Sibling" },
  consequence: { label: "Consequence", sub: "What happened next?" },
  moreSpecific: { label: "More Specific", sub: "Zoom in" }
};

const DIRECTIONS: Direction[] = [
  "moreGeneral",
  "adjacentSibling",
  "consequence",
  "moreSpecific"
];

const POSITIONS: Record<Direction, { x: number; y: number }> = {
  moreGeneral: { x: 0, y: -1 },
  adjacentSibling: { x: -1, y: 0 },
  consequence: { x: 1, y: 0 },
  moreSpecific: { x: 0, y: 1 }
};

const R1_DISTANCE = 110;
const SUB_DISTANCE = 60;

function RadialLine({
  dir,
  fromPos,
  length,
  color
}: {
  dir: Direction;
  fromPos: { x: number; y: number };
  length: number;
  color: string;
}) {
  const pos = POSITIONS[dir];
  const angle = Math.atan2(pos.y, pos.x) * (180 / Math.PI);
  return (
    <div
      className="absolute pointer-events-none"
      style={{
        zIndex: 1,
        width: length,
        height: 1,
        background: `repeating-linear-gradient(90deg, ${color} 0, ${color} 3px, transparent 3px, transparent 7px)`,
        transformOrigin: "0 0",
        transform: `rotate(${angle}deg)`,
        left: `calc(50% + ${fromPos.x * R1_DISTANCE}px)`,
        top: `calc(50% + ${fromPos.y * R1_DISTANCE}px)`
      }}
    />
  );
}

function ConnectorLines() {
  return (
    <>
      {DIRECTIONS.map((dir) => (
        <RadialLine
          key={dir}
          dir={dir}
          fromPos={{ x: 0, y: 0 }}
          length={R1_DISTANCE}
          color="var(--tui-border)"
        />
      ))}
    </>
  );
}

function NodeCircle({
  text,
  direction,
  isR2,
  hidden,
  onClick
}: {
  text: string;
  direction: Direction;
  isR2: boolean;
  hidden: boolean;
  onClick?: () => void;
}) {
  const dist = isR2 ? SUB_DISTANCE : R1_DISTANCE;
  const pos = POSITIONS[direction];
  const size = isR2 ? 90 : 128;
  const info = DIRECTION_LABELS[direction];

  return (
    <div
      onClick={onClick}
      className={`absolute flex flex-col items-center justify-center text-center transition-all duration-300 cursor-pointer select-none
        ${isR2 ? "text-[9px] leading-tight" : "text-xs leading-tight"}
        ${hidden ? "opacity-0 pointer-events-none scale-75" : "opacity-100 scale-100"}
      `}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: isR2
          ? "2px solid var(--tui-primary)"
          : "2px solid var(--tui-border)",
        backgroundColor: isR2
          ? "rgba(var(--tui-primary-rgb, 100, 200, 255), 0.08)"
          : "rgba(255, 255, 255, 0.03)",
        left: `calc(50% + ${pos.x * dist}px - ${size / 2}px)`,
        top: `calc(50% + ${pos.y * dist}px - ${size / 2}px)`,
        padding: isR2 ? "4px" : "10px"
      }}
    >
      <span className="font-semibold text-[var(--tui-primary)] mb-0.5 block leading-tight">
        {info.label}
      </span>
      <span
        className="text-[var(--tui-muted)] block leading-tight overflow-hidden text-ellipsis"
        style={{
          display: "-webkit-box",
          WebkitLineClamp: isR2 ? 3 : 4,
          WebkitBoxOrient: "vertical"
        }}
      >
        {text}
      </span>
    </div>
  );
}

function CenterDot() {
  return (
    <div
      className="absolute"
      style={{
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "var(--tui-primary)",
        left: "calc(50% - 8px)",
        top: "calc(50% - 8px)",
        zIndex: 5
      }}
    />
  );
}

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-2 tui-spinner"></div>
    </div>
  );
}

export default function ThinkCanvas({
  suggestions,
  loading
}: ThinkCanvasProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [expandedDir, setExpandedDir] = useState<Direction | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.5, Math.min(3, z - e.deltaY * 0.002)));
  }, []);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(3, z * 1.25));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(0.5, z / 1.25));
  }, []);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    },
    [pan]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    },
    [isPanning, panStart]
  );

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleR1Click = useCallback((dir: Direction) => {
    setExpandedDir((prev) => (prev === dir ? null : dir));
  }, []);

  const handleCenterClick = useCallback(() => {
    setExpandedDir(null);
  }, []);

  if (!suggestions && !loading) return null;

  const round2Sub =
    expandedDir && suggestions ? suggestions.round2[expandedDir] : null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-80 border border-[var(--tui-border)] bg-black overflow-hidden select-none"
      style={{ cursor: isPanning ? "grabbing" : "grab" }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div
        className="absolute inset-0 transition-transform duration-75"
        style={{
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: "center center"
        }}
      >
        {loading && <LoadingSpinner />}

        {suggestions && (
          <div className="absolute inset-0">
            <ConnectorLines />
            <div onClick={handleCenterClick}>
              <CenterDot />
            </div>

            {DIRECTIONS.map((dir) => {
              const parentPos = POSITIONS[dir];
              return (
                <div key={dir}>
                  <NodeCircle
                    text={suggestions.round1[dir]}
                    direction={dir}
                    isR2={false}
                    hidden={false}
                    onClick={() => handleR1Click(dir)}
                  />

                  {round2Sub && expandedDir === dir && (
                    <>
                      {DIRECTIONS.map((subDir) => (
                        <RadialLine
                          key={subDir}
                          dir={subDir}
                          fromPos={parentPos}
                          length={SUB_DISTANCE}
                          color="var(--tui-primary)"
                        />
                      ))}
                      {DIRECTIONS.map((subDir) => (
                        <div
                          key={subDir}
                          className="absolute"
                          style={{
                            width: 90,
                            height: 90,
                            left: `calc(50% + ${parentPos.x * R1_DISTANCE + POSITIONS[subDir].x * SUB_DISTANCE}px - 45px)`,
                            top: `calc(50% + ${parentPos.y * R1_DISTANCE + POSITIONS[subDir].y * SUB_DISTANCE}px - 45px)`,
                            borderRadius: "50%",
                            border: "2px solid var(--tui-primary)",
                            backgroundColor:
                              "rgba(var(--tui-primary-rgb, 100, 200, 255), 0.08)",
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            justifyContent: "center",
                            textAlign: "center",
                            padding: "4px",
                            zIndex: 3
                          }}
                        >
                          <span className="text-[9px] font-semibold text-[var(--tui-primary)] mb-0.5 block leading-tight">
                            {DIRECTION_LABELS[subDir].label}
                          </span>
                          <span
                            className="text-[9px] text-[var(--tui-muted)] block leading-tight overflow-hidden text-ellipsis"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 3,
                              WebkitBoxOrient: "vertical"
                            }}
                          >
                            {round2Sub[subDir]}
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 right-3 flex gap-1 z-10">
        <button
          onClick={handleZoomIn}
          disabled={zoom >= 3}
          className="tui-btn text-sm px-2 py-0.5 leading-none"
          title="Zoom in"
        >
          +
        </button>
        <button
          onClick={handleZoomOut}
          disabled={zoom <= 0.5}
          className="tui-btn text-sm px-2 py-0.5 leading-none"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  );
}
