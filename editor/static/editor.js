const state = {
  image: null,
  polygons: [],
  manualPolygons: [],
  connections: [],
  annotations: {
    polygon_layers: {},
    hidden_polygon_ids: [],
    manual_edits: [],
    manual_merges: [],
    manual_connections: [],
    manual_walls: [],
    layer_alignment_pairs: [],
  },
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isPanning: false,
  lastMouse: null,
  hoveredId: null,
  selectedId: null,
  showIds: false,
  showConnections: false,
  showHidden: false,
  previewFinal: false,
  exportedFinalPolygons: null,
  loadedFinalWorkingSet: false,
  tool: "select",
  merge: {
    active: false,
    sourcePolygonIds: [],
    bridgePoints: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    removePaths: {
      polygon_a: null,
      polygon_b: null,
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
  },
  straighten: {
    active: false,
    polygonId: null,
    vertexIndices: [],
    removePath: null,
    hoverVertex: null,
  },
  move: {
    active: false,
    polygonId: null,
    hoverVertex: null,
    draggingVertex: null,
    dragPoint: null,
  },
  insertVertex: {
    active: false,
    polygonId: null,
    hoverEdge: null,
  },
  keep: {
    active: false,
    polygonId: null,
    selectedVertexIndices: [],
    hoverVertex: null,
  },
  autoMerge: {
    active: false,
    selectedIds: [],
  },
  addPolygon: {
    active: false,
    points: [],
    colorSourceId: null,
  },
  cutHole: {
    active: false,
    polygonId: null,
    points: [],
  },
  layerAlign: {
    active: false,
    label: "elevator_A",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
  },
  sharedEdge: {
    active: false,
    sourcePolygonIds: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
    dragStart: null,
    dragCurrent: null,
    rangeDirections: {
      polygon_a: "forward",
      polygon_b: "forward",
    },
    replacementOrder: "auto",
  },
};

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const selectedInfo = document.getElementById("selectedInfo");
const layerInput = document.getElementById("layerInput");
const saveResult = document.getElementById("saveResult");
const mergeStatus = document.getElementById("mergeStatus");
const autoMergeStatus = document.getElementById("autoMergeStatus");
const straightenStatus = document.getElementById("straightenStatus");
const moveStatus = document.getElementById("moveStatus");
const insertVertexStatus = document.getElementById("insertVertexStatus");
const deleteStatus = document.getElementById("deleteStatus");
const sharedEdgeStatus = document.getElementById("sharedEdgeStatus");
const addPolygonStatus = document.getElementById("addPolygonStatus");
const cutHoleStatus = document.getElementById("cutHoleStatus");
const layerAlignStatus = document.getElementById("layerAlignStatus");
const alignLabelInput = document.getElementById("alignLabelInput");
const keepStatus = document.getElementById("keepStatus");

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  canvas.width = Math.max(1, Math.floor(rect.width * window.devicePixelRatio));
  canvas.height = Math.max(1, Math.floor(rect.height * window.devicePixelRatio));
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
  draw();
}

function canvasSize() {
  return {
    width: canvas.width / window.devicePixelRatio,
    height: canvas.height / window.devicePixelRatio,
  };
}

function screenToWorld(x, y) {
  return {
    x: (x - state.offsetX) / state.scale,
    y: (y - state.offsetY) / state.scale,
  };
}

function worldToScreen(point) {
  return {
    x: point[0] * state.scale + state.offsetX,
    y: point[1] * state.scale + state.offsetY,
  };
}

function polygonColor(poly, alpha = 0.38) {
  const rgb = poly.color_rgb || [180, 180, 180];
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

function hiddenIds() {
  return new Set(state.annotations.hidden_polygon_ids || []);
}

function allPolygons() {
  if (state.exportedFinalPolygons) return state.exportedFinalPolygons;
  const polygons = [...state.polygons, ...state.manualPolygons];
  const hidden = hiddenIds();
  if (!state.previewFinal && state.showHidden) return polygons;
  return polygons.filter((poly) => !hidden.has(poly.polygon_id));
}

function finalWorkingPolygons() {
  const hidden = hiddenIds();
  const visible = (polygons) => polygons.filter((poly) => !hidden.has(poly.polygon_id));
  if (state.loadedFinalWorkingSet) return visible(state.polygons);
  return [...visible(state.polygons), ...visible(state.manualPolygons)];
}

function drawPolygon(poly) {
  const points = poly.points_source;
  if (!points || points.length < 3) return;
  const hidden = hiddenIds().has(poly.polygon_id);
  const selected = state.selectedId === poly.polygon_id;
  const hovered = state.hoveredId === poly.polygon_id;
  const keepActive = state.keep.active && state.keep.polygonId === poly.polygon_id;
  const autoMergeSelected = state.autoMerge.active && state.autoMerge.selectedIds.includes(poly.polygon_id);
  const previewActive = state.previewFinal;

  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
  for (const hole of poly.holes_source || []) {
    if (!hole || hole.length < 3) continue;
    hole.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.closePath();
  }
  ctx.fillStyle = hidden && !previewActive ? "rgba(120,120,120,0.08)" : polygonColor(poly, selected ? 0.62 : 0.35);
  ctx.strokeStyle = previewActive ? "rgba(20,20,20,0.85)" : autoMergeSelected ? "#7b2cff" : keepActive ? "#00c853" : selected ? "#ff2d2d" : hovered ? "#ffd400" : "rgba(30,30,30,0.55)";
  ctx.lineWidth = previewActive ? 2 : autoMergeSelected ? 4 : keepActive ? 4 : selected ? 3 : hovered ? 2 : 1;
  ctx.fill("evenodd");
  ctx.stroke();

  if (state.showIds) {
    const c = poly.centroid_source;
    if (c) {
      const screen = worldToScreen(c);
      ctx.fillStyle = "#111";
      ctx.font = "11px Arial";
      ctx.fillText(poly.polygon_id, screen.x + 3, screen.y - 3);
    }
  }
}

function drawConnections() {
  if (!state.showConnections) return;
  ctx.save();
  ctx.strokeStyle = "rgba(255, 0, 120, 0.55)";
  ctx.fillStyle = "rgba(255, 0, 120, 0.75)";
  ctx.lineWidth = 1;
  for (const conn of state.connections) {
    const c = conn.centroid_source || conn.centroid_transformed;
    if (!c) continue;
    const center = worldToScreen(c);
    ctx.beginPath();
    ctx.arc(center.x, center.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function cyclicPath(points, startIndex, endIndex) {
  if (startIndex <= endIndex) return points.slice(startIndex, endIndex + 1);
  return points.slice(startIndex).concat(points.slice(0, endIndex + 1));
}

function directedPath(points, startIndex, endIndex, direction = "forward") {
  if (direction === "forward") return cyclicPath(points, startIndex, endIndex);
  return cyclicPath(points, endIndex, startIndex);
}

function drawPath(points, color, width = 4) {
  if (!points || points.length < 2) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    if (index === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

function titleCase(value) {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function drawCanvasLabel(point, text, color, dx = 8, dy = -8) {
  const screen = worldToScreen(point);
  ctx.save();
  ctx.font = "12px Arial";
  const metrics = ctx.measureText(text);
  const x = screen.x + dx;
  const y = screen.y + dy;
  ctx.fillStyle = "rgba(255, 255, 255, 0.88)";
  ctx.fillRect(x - 3, y - 13, metrics.width + 6, 17);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

function drawPathArrow(points, color) {
  if (!points || points.length < 2) return;
  const segmentIndex = Math.max(0, Math.min(points.length - 2, Math.floor((points.length - 1) / 2)));
  const from = worldToScreen(points[segmentIndex]);
  const to = worldToScreen(points[segmentIndex + 1]);
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length < 1) return;
  const mid = {
    x: (from.x + to.x) / 2,
    y: (from.y + to.y) / 2,
  };
  const size = 10;
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(mid.x + Math.cos(angle) * size, mid.y + Math.sin(angle) * size);
  ctx.lineTo(mid.x + Math.cos(angle + 2.45) * size, mid.y + Math.sin(angle + 2.45) * size);
  ctx.lineTo(mid.x + Math.cos(angle - 2.45) * size, mid.y + Math.sin(angle - 2.45) * size);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function activeMergeCandidatePaths() {
  return mergeCandidatePathsForSlot(state.merge.activePolygonSlot);
}

function mergePolygonForSlot(slot) {
  const ids = state.merge.sourcePolygonIds;
  const polygonId = slot === "polygon_a" ? ids[0] : ids[1];
  if (!polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === polygonId) || null;
}

function mergeCandidatePathsForSlot(slot) {
  const poly = mergePolygonForSlot(slot);
  if (!poly) return null;
  const selected = state.merge.vertexIndices[slot] || [];
  if (selected.length !== 2) return null;
  const points = poly.points_source || [];
  return {
    forward: cyclicPath(points, selected[0], selected[1]),
    backward: cyclicPath(points, selected[1], selected[0]),
  };
}

function drawMergeCandidatePathsForSlot(slot) {
  const candidatePaths = mergeCandidatePathsForSlot(slot);
  if (!candidatePaths) return;
  const selectedRemove = state.merge.removePaths[slot];
  drawPath(candidatePaths.forward, selectedRemove === "forward" ? "rgba(255, 70, 0, 0.95)" : "rgba(255, 140, 0, 0.65)", selectedRemove === "forward" ? 7 : 4);
  drawPath(candidatePaths.backward, selectedRemove === "backward" ? "rgba(0, 120, 255, 0.95)" : "rgba(0, 120, 255, 0.65)", selectedRemove === "backward" ? 7 : 4);
}

function straightenPolygon() {
  if (!state.straighten.polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.straighten.polygonId) || null;
}

function movePolygon() {
  if (!state.move.polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.move.polygonId) || null;
}

function insertVertexPolygon() {
  if (!state.insertVertex.polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.insertVertex.polygonId) || null;
}

function keepPolygon() {
  if (!state.keep.polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.keep.polygonId) || null;
}

function sharedEdgePolygonForSlot(slot) {
  const ids = state.sharedEdge.sourcePolygonIds;
  const polygonId = slot === "polygon_a" ? ids[0] : ids[1];
  if (!polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === polygonId) || null;
}

function activeSharedEdgePolygon() {
  return sharedEdgePolygonForSlot(state.sharedEdge.activePolygonSlot);
}

function straightenCandidatePaths() {
  const poly = straightenPolygon();
  const selected = state.straighten.vertexIndices;
  if (!poly || selected.length !== 2) return null;
  const points = poly.points_source || [];
  return {
    forward: cyclicPath(points, selected[0], selected[1]),
    backward: cyclicPath(points, selected[1], selected[0]),
  };
}

function drawMergePreview() {
  if (!state.merge.active) return;
  const points = state.merge.bridgePoints;
  ctx.save();
  ctx.fillStyle = "rgba(255, 210, 0, 0.28)";
  ctx.strokeStyle = "#ff6600";
  ctx.lineWidth = 2;

  if (points.length > 0) {
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    if (points.length === 4) ctx.closePath();
    if (points.length >= 3) ctx.fill();
    ctx.stroke();
  }

  for (const point of points) {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff3300";
    ctx.fill();
  }

  drawMergeCandidatePathsForSlot("polygon_a");
  drawMergeCandidatePathsForSlot("polygon_b");

  const activePolygon = activeMergePolygon();
  if (activePolygon) {
    const selectedSet = new Set(selectedVertexIndicesForActiveSlot());
    const vertices = activePolygon.points_source || [];
    vertices.forEach((point, index) => {
      const screen = worldToScreen(point);
      const hovered = state.merge.hoverVertex && state.merge.hoverVertex.polygonId === activePolygon.polygon_id && state.merge.hoverVertex.index === index;
      const selected = selectedSet.has(index);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, hovered || selected ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ff3300" : hovered ? "#00aaff" : "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawStraightenPreview() {
  if (!state.straighten.active) return;
  const poly = straightenPolygon();
  if (!poly) return;

  ctx.save();
  const candidatePaths = straightenCandidatePaths();
  if (candidatePaths) {
    const selectedRemove = state.straighten.removePath;
    drawPath(candidatePaths.forward, selectedRemove === "forward" ? "rgba(255, 70, 0, 0.95)" : "rgba(255, 140, 0, 0.65)", selectedRemove === "forward" ? 7 : 4);
    drawPath(candidatePaths.backward, selectedRemove === "backward" ? "rgba(0, 120, 255, 0.95)" : "rgba(0, 120, 255, 0.65)", selectedRemove === "backward" ? 7 : 4);
  }

  const selectedSet = new Set(state.straighten.vertexIndices);
  (poly.points_source || []).forEach((point, index) => {
    const screen = worldToScreen(point);
    const hovered = state.straighten.hoverVertex && state.straighten.hoverVertex.index === index;
    const selected = selectedSet.has(index);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, hovered || selected ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#ff3300" : hovered ? "#00aaff" : "#ffffff";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawMovePreview() {
  if (!state.move.active) return;
  const poly = movePolygon();
  if (!poly) return;
  const points = (poly.points_source || []).map((point) => [point[0], point[1]]);
  const holes = (poly.holes_source || []).map((hole) => hole.map((point) => [point[0], point[1]]));
  if (state.move.draggingVertex !== null && state.move.dragPoint) {
    const dragging = state.move.draggingVertex;
    if (dragging.holeIndex === null || dragging.holeIndex === undefined) {
      points[dragging.index] = [state.move.dragPoint.x, state.move.dragPoint.y];
    } else if (holes[dragging.holeIndex]) {
      holes[dragging.holeIndex][dragging.index] = [state.move.dragPoint.x, state.move.dragPoint.y];
    }
    ctx.save();
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.closePath();
    holes.forEach((hole) => {
      hole.forEach((point, index) => {
        const screen = worldToScreen(point);
        if (index === 0) ctx.moveTo(screen.x, screen.y);
        else ctx.lineTo(screen.x, screen.y);
      });
      ctx.closePath();
    });
    ctx.fillStyle = "rgba(0, 170, 255, 0.18)";
    ctx.strokeStyle = "#00aaff";
    ctx.lineWidth = 3;
    ctx.fill("evenodd");
    ctx.stroke();
    ctx.restore();
  }

  ctx.save();
  const drawVertex = (point, index, holeIndex = null) => {
    const draggingMatch = state.move.draggingVertex &&
      state.move.draggingVertex.index === index &&
      state.move.draggingVertex.holeIndex === holeIndex;
    const hoverMatch = state.move.hoverVertex &&
      state.move.hoverVertex.index === index &&
      state.move.hoverVertex.holeIndex === holeIndex;
    const currentPoint = draggingMatch && state.move.dragPoint
      ? [state.move.dragPoint.x, state.move.dragPoint.y]
      : point;
    const screen = worldToScreen(currentPoint);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, hoverMatch || draggingMatch ? 6 : 3, 0, Math.PI * 2);
    ctx.fillStyle = draggingMatch ? "#ff3300" : hoverMatch ? "#00aaff" : "#ffffff";
    ctx.strokeStyle = holeIndex === null ? "#111111" : "#d00000";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  };
  (poly.points_source || []).forEach((point, index) => {
    drawVertex(point, index, null);
  });
  (poly.holes_source || []).forEach((hole, holeIndex) => {
    hole.forEach((point, index) => {
      drawVertex(point, index, holeIndex);
    });
  });
  ctx.restore();
}

function drawInsertVertexPreview() {
  if (!state.insertVertex.active) return;
  const poly = insertVertexPolygon();
  if (!poly) return;
  const points = poly.points_source || [];

  ctx.save();
  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
    if (state.showIds) {
      ctx.fillStyle = "#111111";
      ctx.font = "10px Arial";
      ctx.fillText(index, screen.x + 4, screen.y - 4);
    }
  });

  const edge = state.insertVertex.hoverEdge;
  if (edge && points.length >= 2) {
    const nextIndex = (edge.index + 1) % points.length;
    drawPath([points[edge.index], points[nextIndex]], "rgba(0, 200, 83, 0.95)", 6);
    const screen = worldToScreen(edge.point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#00c853";
    ctx.strokeStyle = "#003d1c";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(edge.point, `insert after ${edge.index}`, "#00a040", 10, -10);
  }
  ctx.restore();
}

function drawKeepPreview() {
  if (!state.keep.active) return;
  const poly = keepPolygon();
  if (!poly) return;
  const points = poly.points_source || [];
  const selectedSet = new Set(state.keep.selectedVertexIndices);
  const keptPoints = points.filter((_, index) => selectedSet.has(index));

  ctx.save();
  if (keptPoints.length >= 2) {
    ctx.beginPath();
    keptPoints.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    if (keptPoints.length >= 3) ctx.closePath();
    ctx.strokeStyle = "#00c853";
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    const selected = selectedSet.has(index);
    const hovered = state.keep.hoverVertex && state.keep.hoverVertex.index === index;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, hovered || selected ? 5 : 3, 0, Math.PI * 2);
    ctx.fillStyle = selected ? "#00c853" : hovered ? "#00aaff" : "#ffffff";
    ctx.strokeStyle = selected ? "#003d1c" : "#111111";
    ctx.lineWidth = selected ? 2 : 1;
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawSharedEdgePreview() {
  if (!state.sharedEdge.active) return;
  ctx.save();
  ["polygon_a", "polygon_b"].forEach((slot) => {
    const poly = sharedEdgePolygonForSlot(slot);
    if (!poly) return;
    const selected = state.sharedEdge.vertexIndices[slot] || [];
    const color = slot === "polygon_a" ? "#0078ff" : "#ff4600";
    const labelPrefix = slot === "polygon_a" ? "A" : "B";
    if (selected.length === 2) {
      const path = directedPath(poly.points_source, selected[0], selected[1], state.sharedEdge.rangeDirections[slot]);
      drawPath(path, color, 6);
      drawPathArrow(path, color);
      drawCanvasLabel(path[0], `${labelPrefix} start`, color);
      drawCanvasLabel(path[path.length - 1], `${labelPrefix} end`, color, 8, 18);
    }
    const selectedSet = new Set(selected);
    (poly.points_source || []).forEach((point, index) => {
      const active = slot === state.sharedEdge.activePolygonSlot;
      const hovered = active && state.sharedEdge.hoverVertex && state.sharedEdge.hoverVertex.index === index;
      const isSelected = selectedSet.has(index);
      if (!active && !isSelected) return;
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, hovered || isSelected ? 5 : 3, 0, Math.PI * 2);
      ctx.fillStyle = isSelected ? (slot === "polygon_a" ? "#0078ff" : "#ff4600") : hovered ? "#00aaff" : "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
  });
  const polyB = sharedEdgePolygonForSlot("polygon_b");
  const bSelected = state.sharedEdge.vertexIndices.polygon_b || [];
  if (polyB && bSelected.length === 2) {
    const bPath = directedPath(
      polyB.points_source,
      bSelected[0],
      bSelected[1],
      state.sharedEdge.rangeDirections.polygon_b,
    );
    const labelPoint = bPath[Math.floor((bPath.length - 1) / 2)];
    drawCanvasLabel(labelPoint, `replace: ${state.sharedEdge.replacementOrder}`, "#7b2cff", 12, -24);
  }
  if (state.sharedEdge.dragStart && state.sharedEdge.dragCurrent) {
    const start = worldToScreen([state.sharedEdge.dragStart.x, state.sharedEdge.dragStart.y]);
    const current = worldToScreen([state.sharedEdge.dragCurrent.x, state.sharedEdge.dragCurrent.y]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(current.x, current.y);
    ctx.strokeStyle = "rgba(0, 200, 255, 0.9)";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

function drawAddPolygonPreview() {
  if (!state.addPolygon.active) return;
  const points = state.addPolygon.points;
  ctx.save();

  if (points.length > 0) {
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    if (points.length >= 3) ctx.closePath();
    ctx.fillStyle = points.length >= 3 ? "rgba(0, 200, 83, 0.18)" : "transparent";
    ctx.strokeStyle = "#00c853";
    ctx.lineWidth = 3;
    if (points.length >= 3) ctx.fill();
    ctx.stroke();
  }

  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = index === points.length - 1 ? "#ff3300" : "#00c853";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawCutHolePreview() {
  if (!state.cutHole.active) return;
  const points = state.cutHole.points;
  ctx.save();
  const target = allPolygons().find((poly) => poly.polygon_id === state.cutHole.polygonId);
  if (target) {
    const c = target.centroid_source;
    if (c) drawCanvasLabel(c, `hole target: ${target.polygon_id}`, "#d00000", 8, -16);
  }
  if (points.length > 0) {
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    if (points.length >= 3) ctx.closePath();
    ctx.fillStyle = points.length >= 3 ? "rgba(255, 255, 255, 0.72)" : "transparent";
    ctx.strokeStyle = "#d00000";
    ctx.lineWidth = 3;
    ctx.setLineDash([6, 4]);
    if (points.length >= 3) ctx.fill();
    ctx.stroke();
    ctx.setLineDash([]);
  }
  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = index === points.length - 1 ? "#ff3300" : "#ffffff";
    ctx.strokeStyle = "#d00000";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  });
  ctx.restore();
}

function drawLayerAlignPreview() {
  ctx.save();
  for (const pair of state.annotations.layer_alignment_pairs || []) {
    if (!pair.from_point_source || !pair.to_point_source) continue;
    drawPath([pair.from_point_source, pair.to_point_source], "rgba(123, 44, 255, 0.75)", 3);
    drawCanvasLabel(pair.from_point_source, `${pair.from_layer} ${pair.label || ""}`, "#7b2cff", 8, -8);
    drawCanvasLabel(pair.to_point_source, `${pair.to_layer} ${pair.label || ""}`, "#7b2cff", 8, 18);
  }
  if (state.layerAlign.active) {
    const points = [state.layerAlign.fromPoint, state.layerAlign.toPoint].filter(Boolean);
    if (points.length === 2) drawPath(points, "rgba(0, 180, 255, 0.95)", 4);
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#00aaff" : "#7b2cff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    if (state.layerAlign.fromPoint && state.layerAlign.fromLayer) {
      drawCanvasLabel(state.layerAlign.fromPoint, `${state.layerAlign.fromLayer} ${state.layerAlign.fromPolygonId}`, "#00aaff", 8, -8);
    }
    if (state.layerAlign.toPoint && state.layerAlign.toLayer) {
      drawCanvasLabel(state.layerAlign.toPoint, `${state.layerAlign.toLayer} ${state.layerAlign.toPolygonId}`, "#7b2cff", 8, 18);
    }
  }
  ctx.restore();
}

function draw() {
  const size = canvasSize();
  ctx.clearRect(0, 0, size.width, size.height);
  if (!state.image) return;

  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(
    state.image,
    state.offsetX,
    state.offsetY,
    state.image.width * state.scale,
    state.image.height * state.scale,
  );

  for (const poly of allPolygons()) {
    drawPolygon(poly);
  }
  drawConnections();
  drawMergePreview();
  drawStraightenPreview();
  drawMovePreview();
  drawInsertVertexPreview();
  drawKeepPreview();
  drawAddPolygonPreview();
  drawCutHolePreview();
  drawLayerAlignPreview();
  drawSharedEdgePreview();
}

function fitView() {
  if (!state.image) return;
  const size = canvasSize();
  const scaleX = size.width / state.image.width;
  const scaleY = size.height / state.image.height;
  state.scale = Math.min(scaleX, scaleY) * 0.96;
  state.offsetX = (size.width - state.image.width * state.scale) / 2;
  state.offsetY = (size.height - state.image.height * state.scale) / 2;
  draw();
}

function pointInPolygon(point, polygon) {
  const pts = polygon.points_source || [];
  if (!pointInPolygonPoints(point, pts)) return false;
  for (const hole of polygon.holes_source || []) {
    if (hole && hole.length >= 3 && pointInPolygonPoints(point, hole)) return false;
  }
  return true;
}

function pointInPolygonPoints(point, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i][0], yi = pts[i][1];
    const xj = pts[j][0], yj = pts[j][1];
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function findPolygonAt(world) {
  const matches = [];
  const hidden = hiddenIds();
  for (const poly of allPolygons()) {
    if (hidden.has(poly.polygon_id)) continue;
    if (pointInPolygon(world, poly)) matches.push(poly);
  }
  matches.sort((a, b) => (a.area_source || 0) - (b.area_source || 0));
  return matches[0] || null;
}

function selectedPolygon() {
  return allPolygons().find((poly) => poly.polygon_id === state.selectedId) || null;
}

function updateSelectedInfo() {
  const poly = selectedPolygon();
  if (!poly) {
    selectedInfo.innerHTML = "<dt>polygon</dt><dd>-</dd><dt>cluster</dt><dd>-</dd><dt>area</dt><dd>-</dd>";
    layerInput.value = "";
    updateDeleteStatus();
    return;
  }
  const layer = state.annotations.polygon_layers?.[poly.polygon_id] || poly.semantic?.layer || "";
  layerInput.value = layer;
  selectedInfo.innerHTML = `
    <dt>polygon</dt><dd>${poly.polygon_id}</dd>
    <dt>cluster</dt><dd>${poly.color_cluster ?? "-"}</dd>
    <dt>area</dt><dd>${Math.round(poly.area_source || 0)}</dd>
    <dt>layer</dt><dd>${layer || "-"}</dd>
  `;
  updateDeleteStatus();
}

function updateDeleteStatus(message = null) {
  const hiddenCount = (state.annotations.hidden_polygon_ids || []).length;
  deleteStatus.textContent = [
    message,
    `selected: ${state.selectedId || "-"}`,
    `hidden: ${hiddenCount}`,
  ].filter(Boolean).join("\n");
}

function syncLayerAnnotationsFromPolygons() {
  state.annotations.polygon_layers = state.annotations.polygon_layers || {};
  for (const poly of [...state.polygons, ...state.manualPolygons]) {
    const layer = poly.semantic?.layer;
    if (layer && !state.annotations.polygon_layers[poly.polygon_id]) {
      state.annotations.polygon_layers[poly.polygon_id] = layer;
    }
  }
}

function saveAnnotations() {
  syncLayerAnnotationsFromPolygons();
  return fetch("/api/annotations", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(state.annotations),
  }).then((response) => response.json());
}

function workingPolygonsPayload() {
  return finalWorkingPolygons();
}

function remainingHiddenSourceIds() {
  const hidden = new Set();
  for (const merge of state.annotations.manual_merges || []) {
    for (const polygonId of merge.source_polygon_ids || []) {
      hidden.add(polygonId);
    }
  }
  for (const edit of state.annotations.manual_edits || []) {
    if (edit.source_polygon_id) hidden.add(edit.source_polygon_id);
    for (const polygonId of edit.source_polygon_ids || []) {
      hidden.add(polygonId);
    }
  }
  return hidden;
}

function syncHiddenIdsFromManualRecords() {
  state.annotations.hidden_polygon_ids = Array.from(remainingHiddenSourceIds());
}

function applySingleEditedPolygon(data) {
  state.annotations.manual_edits = state.annotations.manual_edits || [];
  state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];
  state.annotations.manual_polygons = state.annotations.manual_polygons || [];
  state.annotations.manual_edits.push(data.edit_record);

  if (state.loadedFinalWorkingSet) {
    const sourceId = data.edit_record.source_polygon_id;
    let replaced = false;
    state.polygons = state.polygons.map((poly) => {
      if (poly.polygon_id !== sourceId) return poly;
      replaced = true;
      return data.edited_polygon;
    });
    if (!replaced) {
      state.polygons.push(data.edited_polygon);
    }
    state.manualPolygons = [];
  } else {
    state.annotations.manual_polygons.push(data.edited_polygon);
    const hidden = new Set(state.annotations.hidden_polygon_ids || []);
    hidden.add(data.edit_record.source_polygon_id);
    state.annotations.hidden_polygon_ids = Array.from(hidden);
    state.manualPolygons = state.annotations.manual_polygons;
  }

  state.selectedId = data.edited_polygon.polygon_id;
  updateSelectedInfo();
}

function deleteSelectedPolygon() {
  if (!canEdit()) return;
  const polygonId = state.selectedId;
  if (!polygonId || !selectedPolygon()) {
    updateDeleteStatus("Select a polygon first.");
    return;
  }
  state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];
  state.annotations.manual_edits = state.annotations.manual_edits || [];
  const hidden = new Set(state.annotations.hidden_polygon_ids);
  if (hidden.has(polygonId)) {
    updateDeleteStatus("Already deleted.");
    return;
  }
  hidden.add(polygonId);
  state.annotations.hidden_polygon_ids = Array.from(hidden);
  state.annotations.manual_edits.push({
    edit_id: `edit_${state.annotations.manual_edits.length + 1}`.replace(/(\d+)$/, (value) => value.padStart(3, "0")),
    type: "delete_polygon",
    source_polygon_id: polygonId,
  });
  state.selectedId = null;
  updateSelectedInfo();
  updateDeleteStatus(`Deleted ${polygonId}.`);
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    draw();
  });
}

function undoLastDeletePolygon() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "delete_polygon");
  if (index < 0) {
    updateDeleteStatus("No delete edit to undo.");
    return;
  }
  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  state.annotations.manual_edits = edits;
  syncHiddenIdsFromManualRecords();
  state.selectedId = removedEdit.source_polygon_id || null;
  updateSelectedInfo();
  updateDeleteStatus(`Restored ${removedEdit.source_polygon_id}.`);
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    draw();
  });
}

function updateKeepStatus(message = null) {
  if (!state.keep.active) {
    keepStatus.textContent = "inactive";
    return;
  }
  keepStatus.textContent = [
    message,
    "mode: simple keep",
    `polygon: ${state.keep.polygonId || "-"}`,
    `kept vertices: ${state.keep.selectedVertexIndices.length}`,
    state.keep.polygonId ? "Click vertices to keep" : "Click one polygon",
  ].filter(Boolean).join("\n");
}

function canEdit(message = "Exit Final Preview before editing.") {
  if (!state.previewFinal) return true;
  saveResult.textContent = message;
  return false;
}

function updateSharedEdgeButtons() {
  const aButton = document.getElementById("toggleSharedEdgeADirectionBtn");
  const bButton = document.getElementById("toggleSharedEdgeBDirectionBtn");
  const orderButton = document.getElementById("cycleSharedEdgeOrderBtn");
  if (aButton) aButton.textContent = `A Range: ${titleCase(state.sharedEdge.rangeDirections.polygon_a)} (G)`;
  if (bButton) bButton.textContent = `B Range: ${titleCase(state.sharedEdge.rangeDirections.polygon_b)} (H)`;
  if (orderButton) orderButton.textContent = `Replace: ${titleCase(state.sharedEdge.replacementOrder)} (V)`;
}

function updateSharedEdgeStatus(message = null) {
  updateSharedEdgeButtons();
  if (!state.sharedEdge.active) {
    sharedEdgeStatus.textContent = "inactive";
    return;
  }
  const ids = state.sharedEdge.sourcePolygonIds;
  const aCount = state.sharedEdge.vertexIndices.polygon_a.length;
  const bCount = state.sharedEdge.vertexIndices.polygon_b.length;
  const next = ids.length < 1
    ? "Click polygon A"
    : aCount < 2
      ? "Click 2 vertices on polygon A edge"
      : ids.length < 2
        ? "Click polygon B"
        : bCount < 2
          ? "Click 2 vertices on polygon B edge"
          : "Ready to apply";
  sharedEdgeStatus.textContent = [
    message,
    "mode: shared edge",
    `polygons: ${ids.join(", ") || "-"}`,
    `vertices: A ${aCount}/2, B ${bCount}/2`,
    `range: A ${state.sharedEdge.rangeDirections.polygon_a}, B ${state.sharedEdge.rangeDirections.polygon_b}`,
    `replace: ${state.sharedEdge.replacementOrder}`,
    next,
  ].filter(Boolean).join("\n");
}

function startSharedEdge() {
  if (!canEdit()) return;
  state.tool = "sharedEdge";
  state.sharedEdge = {
    active: true,
    sourcePolygonIds: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
    dragStart: null,
    dragCurrent: null,
    rangeDirections: {
      polygon_a: "forward",
      polygon_b: "forward",
    },
    replacementOrder: "auto",
  };
  updateSharedEdgeStatus();
  draw();
}

function resetSharedEdge() {
  state.tool = "select";
  state.sharedEdge = {
    active: false,
    sourcePolygonIds: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
    dragStart: null,
    dragCurrent: null,
    rangeDirections: {
      polygon_a: "forward",
      polygon_b: "forward",
    },
    replacementOrder: "auto",
  };
  updateSharedEdgeStatus();
  draw();
}

function addSharedEdgeVertex(world, poly) {
  if (!state.sharedEdge.active) return;
  const ids = state.sharedEdge.sourcePolygonIds;
  if (ids.length === 0) {
    if (!poly) {
      updateSharedEdgeStatus("Click polygon A first.");
      return;
    }
    ids.push(poly.polygon_id);
    state.sharedEdge.activePolygonSlot = "polygon_a";
    updateSharedEdgeStatus("Polygon A selected.");
    draw();
    return;
  }

  const slot = state.sharedEdge.activePolygonSlot;
  if (slot === "polygon_b" && ids.length < 2) {
    if (!poly) {
      updateSharedEdgeStatus("Click polygon B.");
      return;
    }
    if (poly.polygon_id === ids[0]) {
      updateSharedEdgeStatus("Polygon B must be different from polygon A.");
      return;
    }
    ids.push(poly.polygon_id);
    updateSharedEdgeStatus("Polygon B selected.");
    draw();
    return;
  }

  const activePoly = activeSharedEdgePolygon();
  const selected = state.sharedEdge.vertexIndices[slot];
  if (selected.length >= 2) {
    updateSharedEdgeStatus("Already has 2 vertices. Apply or reset.");
    return;
  }
  const vertex = nearestVertexForPolygon(activePoly, world);
  if (!vertex) {
    updateSharedEdgeStatus("Click a visible vertex point.");
    return;
  }
  if (selected.includes(vertex.index)) {
    updateSharedEdgeStatus("Choose a different vertex.");
    return;
  }
  selected.push(vertex.index);
  if (slot === "polygon_a" && selected.length === 2) {
    state.sharedEdge.activePolygonSlot = "polygon_b";
    state.sharedEdge.hoverVertex = null;
  }
  updateSharedEdgeStatus();
  draw();
}

function toggleSharedEdgeDirection(slot) {
  if (!state.sharedEdge.active) {
    updateSharedEdgeStatus("Start Shared Edge first.");
    return;
  }
  const current = state.sharedEdge.rangeDirections[slot];
  state.sharedEdge.rangeDirections[slot] = current === "forward" ? "backward" : "forward";
  updateSharedEdgeStatus(`${slot === "polygon_a" ? "A" : "B"} range direction changed.`);
  draw();
}

function cycleSharedEdgeReplacementOrder() {
  if (!state.sharedEdge.active) {
    updateSharedEdgeStatus("Start Shared Edge first.");
    return;
  }
  const order = ["auto", "keep", "reverse"];
  const currentIndex = order.indexOf(state.sharedEdge.replacementOrder);
  state.sharedEdge.replacementOrder = order[(currentIndex + 1) % order.length];
  updateSharedEdgeStatus("Replacement order changed.");
  draw();
}

function setSharedEdgeRange(startWorld, endWorld) {
  if (!state.sharedEdge.active) return false;
  const activePoly = activeSharedEdgePolygon();
  if (!activePoly) return false;
  const startVertex = nearestVertexForPolygon(activePoly, startWorld, 30);
  const endVertex = nearestVertexForPolygon(activePoly, endWorld, 30);
  if (!startVertex || !endVertex) {
    updateSharedEdgeStatus("Drag must start/end near visible vertices.");
    return false;
  }
  if (startVertex.index === endVertex.index) {
    updateSharedEdgeStatus("Drag across at least 2 vertices.");
    return false;
  }
  const slot = state.sharedEdge.activePolygonSlot;
  state.sharedEdge.vertexIndices[slot] = [startVertex.index, endVertex.index];
  if (slot === "polygon_a") {
    state.sharedEdge.activePolygonSlot = "polygon_b";
    state.sharedEdge.hoverVertex = null;
  }
  updateSharedEdgeStatus("Range selected by drag.");
  draw();
  return true;
}

function applySharedEdge() {
  if (!canEdit()) return;
  if (
    !state.sharedEdge.active ||
    state.sharedEdge.sourcePolygonIds.length !== 2 ||
    state.sharedEdge.vertexIndices.polygon_a.length !== 2 ||
    state.sharedEdge.vertexIndices.polygon_b.length !== 2
  ) {
    updateSharedEdgeStatus("Need 2 polygons and 2 vertices on each polygon.");
    return;
  }
  fetch("/api/shared_edge", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      source_polygon_ids: state.sharedEdge.sourcePolygonIds,
      vertex_indices: state.sharedEdge.vertexIndices,
      range_directions: state.sharedEdge.rangeDirections,
      replacement_order: state.sharedEdge.replacementOrder,
      working_polygons: workingPolygonsPayload(),
      height: 1.0,
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "shared edge failed");
      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];
      state.annotations.manual_walls = state.annotations.manual_walls || [];

      state.annotations.manual_polygons.push(...data.edited_polygons);
      state.annotations.manual_edits.push(data.edit_record);
      state.annotations.manual_walls.push(data.wall_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      for (const polygonId of data.edit_record.source_polygon_ids || []) {
        hidden.add(polygonId);
      }
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.edited_polygons[0].polygon_id;
      updateSelectedInfo();
      resetSharedEdge();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateSharedEdgeStatus(String(error));
      draw();
    });
}

function undoLastSharedEdge() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "shared_edge_snap");
  if (index < 0) {
    updateSharedEdgeStatus("No shared edge edit to undo.");
    return;
  }

  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  const createdIds = new Set(removedEdit.created_polygon_ids || []);
  state.annotations.manual_edits = edits;
  state.annotations.manual_polygons = (state.annotations.manual_polygons || []).filter(
    (poly) => !createdIds.has(poly.polygon_id),
  );
  state.annotations.manual_walls = (state.annotations.manual_walls || []).filter(
    (wall) => wall.wall_id !== removedEdit.wall_id,
  );
  state.manualPolygons = state.annotations.manual_polygons;
  syncHiddenIdsFromManualRecords();

  if (createdIds.has(state.selectedId)) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetSharedEdge();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    sharedEdgeStatus.textContent = `Undid ${removedEdit.edit_id || removedEdit.wall_id}.`;
    draw();
  });
}

function updateAddPolygonStatus(message = null) {
  if (!state.addPolygon.active) {
    addPolygonStatus.textContent = "inactive";
    return;
  }
  addPolygonStatus.textContent = [
    message,
    "mode: add polygon",
    `points: ${state.addPolygon.points.length}`,
    state.addPolygon.colorSourceId ? `color: ${state.addPolygon.colorSourceId}` : "color: default",
    "Click points. Shift applies.",
  ].filter(Boolean).join("\n");
}

function startAddPolygon() {
  if (!canEdit()) return;
  state.tool = "addPolygon";
  state.addPolygon = {
    active: true,
    points: [],
    colorSourceId: state.selectedId,
  };
  updateAddPolygonStatus();
  draw();
}

function resetAddPolygon() {
  state.tool = "select";
  state.addPolygon = {
    active: false,
    points: [],
    colorSourceId: null,
  };
  updateAddPolygonStatus();
  draw();
}

function addPolygonPoint(world) {
  if (!state.addPolygon.active) return;
  state.addPolygon.points.push([
    Number(world.x.toFixed(2)),
    Number(world.y.toFixed(2)),
  ]);
  updateAddPolygonStatus();
  draw();
}

function undoAddPolygonPoint() {
  if (!state.addPolygon.active) return;
  if (state.addPolygon.points.length === 0) {
    updateAddPolygonStatus("No point to undo.");
    return;
  }
  state.addPolygon.points.pop();
  updateAddPolygonStatus();
  draw();
}

function addPolygonColor() {
  const source = allPolygons().find((poly) => poly.polygon_id === state.addPolygon.colorSourceId);
  return source?.color_rgb || [180, 180, 180];
}

function applyAddPolygon() {
  if (!canEdit()) return;
  if (!state.addPolygon.active || state.addPolygon.points.length < 3) {
    updateAddPolygonStatus("Add at least 3 points.");
    return;
  }
  fetch("/api/add_polygon", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      points_source: state.addPolygon.points,
      source_polygon_id: state.addPolygon.colorSourceId,
      color_rgb: addPolygonColor(),
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "add polygon failed");

      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];

      state.annotations.manual_polygons.push(data.added_polygon);
      state.annotations.manual_edits.push(data.edit_record);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.added_polygon.polygon_id;
      updateSelectedInfo();
      resetAddPolygon();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateAddPolygonStatus(String(error));
      draw();
    });
}

function updateCutHoleStatus(message = null) {
  if (!state.cutHole.active) {
    cutHoleStatus.textContent = "inactive";
    return;
  }
  cutHoleStatus.textContent = [
    message,
    "mode: cut hole",
    `polygon: ${state.cutHole.polygonId || "-"}`,
    `hole points: ${state.cutHole.points.length}`,
    state.cutHole.polygonId ? "Click inner hole points. Shift applies." : "Click target polygon first.",
  ].filter(Boolean).join("\n");
}

function startCutHole() {
  if (!canEdit()) return;
  state.tool = "cutHole";
  state.cutHole = {
    active: true,
    polygonId: null,
    points: [],
  };
  updateCutHoleStatus();
  draw();
}

function resetCutHole() {
  state.tool = "select";
  state.cutHole = {
    active: false,
    polygonId: null,
    points: [],
  };
  updateCutHoleStatus();
  draw();
}

function addCutHolePoint(world, poly) {
  if (!state.cutHole.active) return;
  if (!state.cutHole.polygonId) {
    if (!poly) {
      updateCutHoleStatus("Click target polygon first.");
      return;
    }
    state.cutHole.polygonId = poly.polygon_id;
    state.selectedId = poly.polygon_id;
    updateSelectedInfo();
    updateCutHoleStatus("Target polygon selected.");
    draw();
    return;
  }
  state.cutHole.points.push([
    Number(world.x.toFixed(2)),
    Number(world.y.toFixed(2)),
  ]);
  updateCutHoleStatus();
  draw();
}

function undoCutHolePoint() {
  if (!state.cutHole.active) return;
  if (state.cutHole.points.length === 0) {
    updateCutHoleStatus("No hole point to undo.");
    return;
  }
  state.cutHole.points.pop();
  updateCutHoleStatus();
  draw();
}

function applyCutHole() {
  if (!canEdit()) return;
  if (!state.cutHole.active || !state.cutHole.polygonId || state.cutHole.points.length < 3) {
    updateCutHoleStatus("Choose target polygon and at least 3 hole points.");
    return;
  }
  fetch("/api/cut_hole", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.cutHole.polygonId,
      hole_points_source: state.cutHole.points,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "cut hole failed");
      applySingleEditedPolygon(data);
      resetCutHole();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateCutHoleStatus(String(error));
      draw();
    });
}

function undoLastCutHole() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "cut_hole");
  if (index < 0) {
    updateCutHoleStatus("No cut hole edit to undo.");
    return;
  }
  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  const removedPolygonId = removedEdit.created_polygon_id;
  state.annotations.manual_edits = edits;
  state.annotations.manual_polygons = (state.annotations.manual_polygons || []).filter(
    (poly) => poly.polygon_id !== removedPolygonId,
  );
  state.manualPolygons = state.annotations.manual_polygons;
  syncHiddenIdsFromManualRecords();
  if (state.selectedId === removedPolygonId) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetCutHole();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    cutHoleStatus.textContent = `Undid ${removedEdit.edit_id || removedPolygonId}.`;
    draw();
  });
}

function updateLayerAlignStatus(message = null) {
  if (!state.layerAlign.active) {
    layerAlignStatus.textContent = [
      message,
      `pairs: ${(state.annotations.layer_alignment_pairs || []).length}`,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const next = !state.layerAlign.fromPoint
    ? "Click first elevator point on a layered polygon"
    : !state.layerAlign.toPoint
      ? "Click matching elevator point on another layered polygon"
      : "Pair ready";
  layerAlignStatus.textContent = [
    message,
    "mode: layer align xy",
    `from: ${state.layerAlign.fromLayer || "-"} (${state.layerAlign.fromPolygonId || "-"})`,
    `to: ${state.layerAlign.toLayer || "-"} (${state.layerAlign.toPolygonId || "-"})`,
    `label: ${state.layerAlign.label}`,
    `pairs: ${(state.annotations.layer_alignment_pairs || []).length}`,
    next,
  ].filter(Boolean).join("\n");
}

function startLayerAlign() {
  if (!canEdit()) return;
  state.tool = "layerAlign";
  state.layerAlign = {
    active: true,
    label: alignLabelInput.value.trim() || "elevator_A",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
  };
  updateLayerAlignStatus();
  draw();
}

function resetLayerAlign() {
  state.tool = "select";
  state.layerAlign = {
    active: false,
    label: alignLabelInput.value.trim() || "elevator_A",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
  };
  updateLayerAlignStatus();
  draw();
}

function polygonLayerValue(poly) {
  if (!poly) return null;
  return state.annotations.polygon_layers?.[poly.polygon_id] || poly.semantic?.layer || null;
}

function addLayerAlignPoint(world, poly) {
  if (!state.layerAlign.active) return;
  if (!poly) {
    updateLayerAlignStatus("Click inside a polygon.");
    return;
  }
  const layer = polygonLayerValue(poly);
  if (!layer) {
    updateLayerAlignStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if (!state.layerAlign.fromPoint) {
    state.layerAlign.fromPoint = point;
    state.layerAlign.fromLayer = layer;
    state.layerAlign.fromPolygonId = poly.polygon_id;
    updateLayerAlignStatus();
    draw();
    return;
  }
  if (poly.polygon_id === state.layerAlign.fromPolygonId) {
    updateLayerAlignStatus("Click the matching point on another polygon/layer.");
    return;
  }
  state.layerAlign.toPoint = point;
  state.layerAlign.toLayer = layer;
  state.layerAlign.toPolygonId = poly.polygon_id;
  state.annotations.layer_alignment_pairs = state.annotations.layer_alignment_pairs || [];
  state.annotations.layer_alignment_pairs.push({
    from_layer: state.layerAlign.fromLayer,
    to_layer: state.layerAlign.toLayer,
    label: state.layerAlign.label,
    from_polygon_id: state.layerAlign.fromPolygonId,
    to_polygon_id: state.layerAlign.toPolygonId,
    from_point_source: state.layerAlign.fromPoint,
    to_point_source: state.layerAlign.toPoint,
    mode: "xy",
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetLayerAlign();
    updateLayerAlignStatus("Alignment pair saved.");
  });
}

function undoLastLayerAlignPair() {
  state.annotations.layer_alignment_pairs = state.annotations.layer_alignment_pairs || [];
  const removed = state.annotations.layer_alignment_pairs.pop();
  if (!removed) {
    updateLayerAlignStatus("No alignment pair to undo.");
    return;
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerAlignStatus(`Removed ${removed.from_layer}->${removed.to_layer}.`);
    draw();
  });
}

function startSimpleKeep() {
  if (!canEdit()) return;
  state.tool = "keep";
  state.keep = {
    active: true,
    polygonId: null,
    selectedVertexIndices: [],
    hoverVertex: null,
  };
  updateKeepStatus();
  draw();
}

function resetSimpleKeep() {
  state.tool = "select";
  state.keep = {
    active: false,
    polygonId: null,
    selectedVertexIndices: [],
    hoverVertex: null,
  };
  updateKeepStatus();
  draw();
}

function toggleKeepVertex(world, poly) {
  if (!state.keep.active) return;
  if (!state.keep.polygonId) {
    if (!poly) {
      updateKeepStatus("Click one polygon first.");
      return;
    }
    state.keep.polygonId = poly.polygon_id;
    state.selectedId = poly.polygon_id;
    state.keep.selectedVertexIndices = [];
    updateSelectedInfo();
    updateKeepStatus("Polygon selected. Click vertices to keep.");
    draw();
    return;
  }

  const activePoly = keepPolygon();
  const vertex = nearestVertexForPolygon(activePoly, world);
  if (!vertex) {
    updateKeepStatus("Click a visible vertex point.");
    return;
  }

  const selected = new Set(state.keep.selectedVertexIndices);
  if (selected.has(vertex.index)) {
    updateKeepStatus("Already selected.");
    return;
  }
  selected.add(vertex.index);
  state.keep.selectedVertexIndices = Array.from(selected).sort((a, b) => a - b);
  updateKeepStatus();
  draw();
}

function applySimpleKeep() {
  if (!canEdit()) return;
  if (!state.keep.active) {
    updateKeepStatus("Start Simple Keep first.");
    return;
  }
  if (!state.keep.polygonId || state.keep.selectedVertexIndices.length < 3) {
    updateKeepStatus("Choose one polygon and keep at least 3 vertices.");
    return;
  }
  fetch("/api/simple_keep_vertices", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.keep.polygonId,
      kept_vertex_indices: state.keep.selectedVertexIndices,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "simple keep failed");

      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_polygons.push(data.edited_polygon);
      state.annotations.manual_edits.push(data.edit_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      hidden.add(data.edit_record.source_polygon_id);
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.edited_polygon.polygon_id;
      updateSelectedInfo();
      resetSimpleKeep();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateKeepStatus(String(error));
      draw();
    });
}

function updateAutoMergeStatus(message = null) {
  if (!state.autoMerge.active) {
    autoMergeStatus.textContent = "inactive";
    return;
  }
  autoMergeStatus.textContent = [
    message,
    "mode: auto merge",
    `selected: ${state.autoMerge.selectedIds.length}`,
    state.autoMerge.selectedIds.join(", ") || "-",
    "Click polygons to add. Shift applies.",
  ].filter(Boolean).join("\n");
}

function startAutoMerge() {
  if (!canEdit()) return;
  state.tool = "autoMerge";
  state.autoMerge = {
    active: true,
    selectedIds: [],
  };
  updateAutoMergeStatus();
  draw();
}

function resetAutoMerge() {
  state.tool = "select";
  state.autoMerge = {
    active: false,
    selectedIds: [],
  };
  updateAutoMergeStatus();
  draw();
}

function toggleAutoMergePolygon(poly) {
  if (!state.autoMerge.active) return;
  if (!poly) {
    updateAutoMergeStatus("Click a polygon.");
    return;
  }
  const selected = new Set(state.autoMerge.selectedIds);
  if (selected.has(poly.polygon_id)) selected.delete(poly.polygon_id);
  else selected.add(poly.polygon_id);
  state.autoMerge.selectedIds = Array.from(selected);
  state.selectedId = poly.polygon_id;
  updateSelectedInfo();
  updateAutoMergeStatus();
  draw();
}

function applyAutoMerge() {
  if (!canEdit()) return;
  if (!state.autoMerge.active || state.autoMerge.selectedIds.length < 2) {
    updateAutoMergeStatus("Select at least 2 polygons.");
    return;
  }
  fetch("/api/auto_merge", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      source_polygon_ids: state.autoMerge.selectedIds,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "auto merge failed");

      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_merges = state.annotations.manual_merges || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_polygons.push(data.merged_polygon);
      state.annotations.manual_merges.push(data.merge_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      for (const polygonId of data.merge_record.source_polygon_ids || []) {
        hidden.add(polygonId);
      }
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.merged_polygon.polygon_id;
      updateSelectedInfo();
      resetAutoMerge();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateAutoMergeStatus(String(error));
      draw();
    });
}

function updateMergeStatus(message = null) {
  if (!state.merge.active) {
    mergeStatus.textContent = "inactive";
    return;
  }
  const ids = state.merge.sourcePolygonIds;
  const aCount = state.merge.vertexIndices.polygon_a.length;
  const bCount = state.merge.vertexIndices.polygon_b.length;
  const aRemove = state.merge.removePaths.polygon_a;
  const bRemove = state.merge.removePaths.polygon_b;
  const pathLabel = (value) => {
    if (value === "forward") return "Orange";
    if (value === "backward") return "Blue (default)";
    return "-";
  };
  const next = ids.length < 1
    ? "Click polygon A"
    : aCount < 2
      ? "Click 2 shown vertices on polygon A"
      : !aRemove
        ? "Blue is selected by default. Use Orange only if needed."
        : ids.length < 2
          ? "Click polygon B"
          : bCount < 2
            ? "Click 2 shown vertices on polygon B"
            : !bRemove
              ? "Blue is selected by default. Use Orange only if needed."
              : "Ready to apply";
  mergeStatus.textContent = [
    message,
    `mode: merge`,
    `polygons: ${ids.join(", ") || "-"}`,
    `vertices: A ${aCount}/2, B ${bCount}/2`,
    `remove: A ${pathLabel(aRemove)}, B ${pathLabel(bRemove)}`,
    next,
  ].filter(Boolean).join("\n");
}

function startMerge() {
  if (!canEdit()) return;
  state.tool = "merge";
  state.merge = {
    active: true,
    sourcePolygonIds: [],
    bridgePoints: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    removePaths: {
      polygon_a: null,
      polygon_b: null,
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
  };
  updateMergeStatus();
  draw();
}

function resetMerge() {
  state.tool = "select";
  state.merge = {
    active: false,
    sourcePolygonIds: [],
    bridgePoints: [],
    vertexIndices: {
      polygon_a: [],
      polygon_b: [],
    },
    removePaths: {
      polygon_a: null,
      polygon_b: null,
    },
    activePolygonSlot: "polygon_a",
    hoverVertex: null,
  };
  updateMergeStatus();
  draw();
}

function activeMergePolygon() {
  const ids = state.merge.sourcePolygonIds;
  const slot = state.merge.activePolygonSlot;
  const polygonId = slot === "polygon_a" ? ids[0] : ids[1];
  if (!polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === polygonId) || null;
}

function selectedVertexIndicesForActiveSlot() {
  return state.merge.vertexIndices[state.merge.activePolygonSlot] || [];
}

function nearestVertexForPolygon(poly, world, maxScreenDistance = 10) {
  if (!poly) return null;
  let best = null;
  const mouseScreen = worldToScreen([world.x, world.y]);
  (poly.points_source || []).forEach((point, index) => {
    const screen = worldToScreen(point);
    const distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {polygonId: poly.polygon_id, index, point, distance};
    }
  });
  return best;
}

function nearestMoveVertexForPolygon(poly, world, maxScreenDistance = 10) {
  if (!poly) return null;
  let best = nearestVertexForPolygon(poly, world, maxScreenDistance);
  const mouseScreen = worldToScreen([world.x, world.y]);
  (poly.holes_source || []).forEach((hole, holeIndex) => {
    (hole || []).forEach((point, index) => {
      const screen = worldToScreen(point);
      const distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {polygonId: poly.polygon_id, holeIndex, index, point, distance};
      }
    });
  });
  if (best && best.holeIndex === undefined) best.holeIndex = null;
  return best;
}

function projectPointToSegment(point, segA, segB) {
  const ax = segA[0];
  const ay = segA[1];
  const bx = segB[0];
  const by = segB[1];
  const abx = bx - ax;
  const aby = by - ay;
  const denom = abx * abx + aby * aby;
  if (denom === 0) return [ax, ay];
  const t = Math.max(0, Math.min(1, ((point.x - ax) * abx + (point.y - ay) * aby) / denom));
  return [ax + abx * t, ay + aby * t];
}

function nearestEdgeForPolygon(poly, world, maxScreenDistance = 14) {
  if (!poly) return null;
  const points = poly.points_source || [];
  if (points.length < 2) return null;
  let best = null;
  const mouseScreen = worldToScreen([world.x, world.y]);
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length];
    const projected = projectPointToSegment(world, point, next);
    const projectedScreen = worldToScreen(projected);
    const distance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {
        polygonId: poly.polygon_id,
        index,
        point: [Number(projected[0].toFixed(2)), Number(projected[1].toFixed(2))],
        distance,
      };
    }
  });
  return best;
}

function addMergeVertex(world, poly) {
  if (!state.merge.active) return;
  const ids = state.merge.sourcePolygonIds;

  if (ids.length === 0) {
    if (!poly) {
      updateMergeStatus("Click polygon A first.");
      return;
    }
    ids.push(poly.polygon_id);
    state.merge.activePolygonSlot = "polygon_a";
    updateMergeStatus("Polygon A selected.");
    draw();
    return;
  }

  const slot = state.merge.activePolygonSlot;
  if (slot === "polygon_b" && ids.length < 2) {
    if (!state.merge.removePaths.polygon_a) {
      updateMergeStatus("Choose remove path for polygon A first.");
      return;
    }
    if (!poly) {
      updateMergeStatus("Click polygon B.");
      return;
    }
    if (poly.polygon_id === ids[0]) {
      updateMergeStatus("Polygon B must be different from polygon A.");
      return;
    }
    ids.push(poly.polygon_id);
    updateMergeStatus("Polygon B selected.");
    draw();
    return;
  }

  const activePoly = activeMergePolygon();
  const selected = state.merge.vertexIndices[slot];

  if (selected.length < 2) {
    const vertex = nearestVertexForPolygon(activePoly, world);
    if (!vertex) {
      updateMergeStatus("Click a visible vertex point.");
      return;
    }
    if (selected.includes(vertex.index)) {
      updateMergeStatus("Choose a different vertex.");
      return;
    }
    selected.push(vertex.index);
    state.merge.bridgePoints.push([Number(vertex.point[0].toFixed(2)), Number(vertex.point[1].toFixed(2))]);
    if (selected.length === 2 && !state.merge.removePaths[slot]) {
      state.merge.removePaths[slot] = "backward";
    }
    if (slot === "polygon_a" && selected.length === 2) {
      state.merge.activePolygonSlot = "polygon_b";
      state.merge.hoverVertex = null;
    }
    updateMergeStatus();
    draw();
  }
}

function chooseRemovePath(pathName) {
  if (!state.merge.active) return;
  const slot = state.merge.activePolygonSlot === "polygon_b" && state.merge.sourcePolygonIds.length < 2
    ? "polygon_a"
    : state.merge.activePolygonSlot;
  const selected = state.merge.vertexIndices[slot] || [];
  if (selected.length !== 2) {
    updateMergeStatus("Select 2 vertices before choosing a remove path.");
    return;
  }
  state.merge.removePaths[slot] = pathName;
  if (slot === "polygon_a" && state.merge.sourcePolygonIds.length < 2) {
    state.merge.activePolygonSlot = "polygon_b";
    state.merge.hoverVertex = null;
  }
  updateMergeStatus(`Remove ${pathName === "forward" ? "Orange" : "Blue"} selected.`);
  draw();
}

function isMergeReady() {
  return (
    state.merge.active &&
    state.merge.sourcePolygonIds.length === 2 &&
    state.merge.vertexIndices.polygon_a.length === 2 &&
    state.merge.vertexIndices.polygon_b.length === 2 &&
    state.merge.removePaths.polygon_a &&
    state.merge.removePaths.polygon_b
  );
}

function applyMerge() {
  if (
    !state.merge.active ||
    state.merge.sourcePolygonIds.length !== 2 ||
    state.merge.vertexIndices.polygon_a.length !== 2 ||
    state.merge.vertexIndices.polygon_b.length !== 2 ||
    !state.merge.removePaths.polygon_a ||
    !state.merge.removePaths.polygon_b
  ) {
    updateMergeStatus("Need 2 polygons, 2 vertices on each polygon, and remove paths.");
    return;
  }
  fetch("/api/merge", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      source_polygon_ids: state.merge.sourcePolygonIds,
      bridge_points_source: state.merge.bridgePoints,
      vertex_indices: state.merge.vertexIndices,
      remove_paths: state.merge.removePaths,
      working_polygons: workingPolygonsPayload(),
      epsilon_ratio: 0.003,
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "merge failed");

      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_merges = state.annotations.manual_merges || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_polygons.push(data.merged_polygon);
      state.annotations.manual_merges.push(data.merge_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      for (const polygonId of data.merge_record.source_polygon_ids || []) {
        hidden.add(polygonId);
      }
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.merged_polygon.polygon_id;
      updateSelectedInfo();
      resetMerge();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateMergeStatus(String(error));
    });
}

function undoLastMerge() {
  const merges = state.annotations.manual_merges || [];
  const manualPolygons = state.annotations.manual_polygons || [];
  if (merges.length === 0) {
    updateMergeStatus("No merge to undo.");
    return;
  }

  const removedMerge = merges.pop();
  const removedPolygonId = removedMerge.created_polygon_id;
  state.annotations.manual_merges = merges;
  state.annotations.manual_polygons = manualPolygons.filter((poly) => poly.polygon_id !== removedPolygonId);
  state.manualPolygons = state.annotations.manual_polygons;

  const stillHiddenByMerge = new Set();
  for (const merge of merges) {
    for (const polygonId of merge.source_polygon_ids || []) {
      stillHiddenByMerge.add(polygonId);
    }
  }
  for (const edit of state.annotations.manual_edits || []) {
    if (edit.source_polygon_id) stillHiddenByMerge.add(edit.source_polygon_id);
  }

  const removedSourceIds = new Set(removedMerge.source_polygon_ids || []);
  state.annotations.hidden_polygon_ids = (state.annotations.hidden_polygon_ids || []).filter((polygonId) => {
    if (!removedSourceIds.has(polygonId)) return true;
    return stillHiddenByMerge.has(polygonId);
  });

  if (state.selectedId === removedPolygonId) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetMerge();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    mergeStatus.textContent = `Undid ${removedMerge.merge_id || removedPolygonId}.`;
    draw();
  });
}

function updateStraightenStatus(message = null) {
  if (!state.straighten.active) {
    straightenStatus.textContent = "inactive";
    return;
  }
  const remove = state.straighten.removePath === "forward" ? "Orange" :
    state.straighten.removePath === "backward" ? "Blue (default)" : "-";
  const next = !state.straighten.polygonId
    ? "Click a polygon"
    : state.straighten.vertexIndices.length < 2
      ? "Click 2 shown vertices"
      : "Ready to apply";
  straightenStatus.textContent = [
    message,
    "mode: straighten",
    `polygon: ${state.straighten.polygonId || "-"}`,
    `vertices: ${state.straighten.vertexIndices.length}/2`,
    `remove: ${remove}`,
    next,
  ].filter(Boolean).join("\n");
}

function startStraighten() {
  if (!canEdit()) return;
  state.tool = "straighten";
  state.straighten = {
    active: true,
    polygonId: null,
    vertexIndices: [],
    removePath: null,
    hoverVertex: null,
  };
  updateStraightenStatus();
  draw();
}

function resetStraighten() {
  state.tool = "select";
  state.straighten = {
    active: false,
    polygonId: null,
    vertexIndices: [],
    removePath: null,
    hoverVertex: null,
  };
  updateStraightenStatus();
  draw();
}

function addStraightenVertex(world, poly) {
  if (!state.straighten.active) return;
  if (!state.straighten.polygonId) {
    if (!poly) {
      updateStraightenStatus("Click a polygon first.");
      return;
    }
    state.straighten.polygonId = poly.polygon_id;
    state.selectedId = poly.polygon_id;
    updateSelectedInfo();
    updateStraightenStatus("Polygon selected.");
    draw();
    return;
  }

  const activePoly = straightenPolygon();
  const vertex = nearestVertexForPolygon(activePoly, world);
  if (!vertex) {
    updateStraightenStatus("Click a visible vertex point.");
    return;
  }
  if (state.straighten.vertexIndices.includes(vertex.index)) {
    updateStraightenStatus("Choose a different vertex.");
    return;
  }
  if (state.straighten.vertexIndices.length >= 2) {
    updateStraightenStatus("Already has 2 vertices. Apply or reset.");
    return;
  }
  state.straighten.vertexIndices.push(vertex.index);
  if (state.straighten.vertexIndices.length === 2 && !state.straighten.removePath) {
    state.straighten.removePath = "backward";
  }
  updateStraightenStatus();
  draw();
}

function chooseStraightenOrangePath() {
  if (!state.straighten.active || state.straighten.vertexIndices.length !== 2) {
    updateStraightenStatus("Select 2 vertices first.");
    return;
  }
  state.straighten.removePath = "forward";
  updateStraightenStatus("Remove Orange selected.");
  draw();
}

function isStraightenReady() {
  return (
    state.straighten.active &&
    state.straighten.polygonId &&
    state.straighten.vertexIndices.length === 2 &&
    state.straighten.removePath
  );
}

function applyStraighten() {
  if (!canEdit()) return;
  if (
    !state.straighten.active ||
    !state.straighten.polygonId ||
    state.straighten.vertexIndices.length !== 2 ||
    !state.straighten.removePath
  ) {
    updateStraightenStatus("Need one polygon, 2 vertices, and a remove path.");
    return;
  }
  fetch("/api/straighten", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.straighten.polygonId,
      vertex_indices: state.straighten.vertexIndices,
      remove_path: state.straighten.removePath,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "straighten failed");
      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_polygons.push(data.edited_polygon);
      state.annotations.manual_edits.push(data.edit_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      hidden.add(data.edit_record.source_polygon_id);
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.edited_polygon.polygon_id;
      updateSelectedInfo();
      resetStraighten();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateStraightenStatus(String(error));
    });
}

function undoLastStraighten() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "straighten_edge");
  if (index < 0) {
    updateStraightenStatus("No straighten edit to undo.");
    return;
  }

  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  const removedPolygonId = removedEdit.created_polygon_id;
  state.annotations.manual_edits = edits;
  state.annotations.manual_polygons = (state.annotations.manual_polygons || []).filter(
    (poly) => poly.polygon_id !== removedPolygonId,
  );
  state.manualPolygons = state.annotations.manual_polygons;
  syncHiddenIdsFromManualRecords();

  if (state.selectedId === removedPolygonId) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetStraighten();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    straightenStatus.textContent = `Undid ${removedEdit.edit_id || removedPolygonId}.`;
    draw();
  });
}

function resetToInitialPolygons() {
  state.annotations.hidden_polygon_ids = [];
  state.annotations.manual_polygons = [];
  state.annotations.manual_edits = [];
  state.annotations.manual_merges = [];
  state.annotations.manual_walls = [];
  state.annotations.layer_alignment_pairs = [];
  state.manualPolygons = [];
  state.loadedFinalWorkingSet = false;
  state.selectedId = null;
  resetMerge();
  resetStraighten();
  resetMoveVertex();
  resetInsertVertex();
  resetSimpleKeep();
  resetAutoMerge();
  resetAddPolygon();
  resetCutHole();
  resetLayerAlign();
  resetSharedEdge();
  updateSelectedInfo();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    draw();
  });
}

function updateInsertVertexStatus(message = null) {
  if (!state.insertVertex.active) {
    insertVertexStatus.textContent = "inactive";
    return;
  }
  const next = !state.insertVertex.polygonId
    ? "Click a polygon"
    : "Click near an edge to insert a point";
  insertVertexStatus.textContent = [
    message,
    "mode: insert vertex",
    `polygon: ${state.insertVertex.polygonId || "-"}`,
    state.insertVertex.hoverEdge ? `edge: ${state.insertVertex.hoverEdge.index} -> ${(state.insertVertex.hoverEdge.index + 1) % (insertVertexPolygon()?.points_source?.length || 1)}` : null,
    next,
  ].filter(Boolean).join("\n");
}

function startInsertVertex() {
  if (!canEdit()) return;
  state.tool = "insertVertex";
  state.insertVertex = {
    active: true,
    polygonId: null,
    hoverEdge: null,
  };
  updateInsertVertexStatus();
  draw();
}

function resetInsertVertex() {
  state.tool = "select";
  state.insertVertex = {
    active: false,
    polygonId: null,
    hoverEdge: null,
  };
  updateInsertVertexStatus();
  draw();
}

function selectInsertVertexPolygon(poly) {
  if (!poly) {
    updateInsertVertexStatus("Click a polygon first.");
    return;
  }
  state.insertVertex.polygonId = poly.polygon_id;
  state.selectedId = poly.polygon_id;
  state.insertVertex.hoverEdge = null;
  updateSelectedInfo();
  updateInsertVertexStatus("Polygon selected.");
  draw();
}

function applyInsertVertex(world) {
  if (!canEdit()) return;
  if (!state.insertVertex.active || !state.insertVertex.polygonId) return;
  const activePoly = insertVertexPolygon();
  const edge = nearestEdgeForPolygon(activePoly, world, 18);
  if (!edge) {
    updateInsertVertexStatus("Click closer to a polygon edge.");
    return;
  }
  fetch("/api/insert_vertex", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.insertVertex.polygonId,
      insert_after_index: edge.index,
      point: edge.point,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "insert vertex failed");
      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_polygons.push(data.edited_polygon);
      state.annotations.manual_edits.push(data.edit_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      hidden.add(data.edit_record.source_polygon_id);
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.edited_polygon.polygon_id;
      updateSelectedInfo();
      resetInsertVertex();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateInsertVertexStatus(String(error));
      draw();
    });
}

function undoLastInsertVertex() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "insert_vertex");
  if (index < 0) {
    updateInsertVertexStatus("No insert edit to undo.");
    return;
  }

  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  const removedPolygonId = removedEdit.created_polygon_id;
  state.annotations.manual_edits = edits;
  state.annotations.manual_polygons = (state.annotations.manual_polygons || []).filter(
    (poly) => poly.polygon_id !== removedPolygonId,
  );
  state.manualPolygons = state.annotations.manual_polygons;
  syncHiddenIdsFromManualRecords();

  if (state.selectedId === removedPolygonId) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetInsertVertex();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    insertVertexStatus.textContent = `Undid ${removedEdit.edit_id || removedPolygonId}.`;
    draw();
  });
}

function updateMoveStatus(message = null) {
  if (!state.move.active) {
    moveStatus.textContent = "inactive";
    return;
  }
  const next = !state.move.polygonId
    ? "Click a polygon"
    : "Drag one visible vertex";
  moveStatus.textContent = [
    message,
    "mode: move vertex",
    `polygon: ${state.move.polygonId || "-"}`,
    state.move.draggingVertex !== null
      ? `dragging: ${state.move.draggingVertex.holeIndex === null ? "outer" : `hole ${state.move.draggingVertex.holeIndex}`} vertex ${state.move.draggingVertex.index}`
      : null,
    next,
  ].filter(Boolean).join("\n");
}

function startMoveVertex() {
  if (!canEdit()) return;
  state.tool = "move";
  state.move = {
    active: true,
    polygonId: null,
    hoverVertex: null,
    draggingVertex: null,
    dragPoint: null,
  };
  updateMoveStatus();
  draw();
}

function resetMoveVertex() {
  state.tool = "select";
  state.move = {
    active: false,
    polygonId: null,
    hoverVertex: null,
    draggingVertex: null,
    dragPoint: null,
  };
  updateMoveStatus();
  draw();
}

function selectMovePolygon(poly) {
  if (!poly) {
    updateMoveStatus("Click a polygon first.");
    return;
  }
  state.move.polygonId = poly.polygon_id;
  state.selectedId = poly.polygon_id;
  updateSelectedInfo();
  updateMoveStatus("Polygon selected.");
  draw();
}

function finishMoveVertex() {
  if (!canEdit()) return;
  if (!state.move.active || !state.move.polygonId || state.move.draggingVertex === null || !state.move.dragPoint) {
    return;
  }
  const polygonId = state.move.polygonId;
  const vertex = state.move.draggingVertex;
  const vertexIndex = vertex.index;
  const holeIndex = vertex.holeIndex;
  const point = [Number(state.move.dragPoint.x.toFixed(2)), Number(state.move.dragPoint.y.toFixed(2))];

  state.move.draggingVertex = null;
  state.move.dragPoint = null;
  fetch("/api/move_vertex", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: polygonId,
      vertex_index: vertexIndex,
      hole_index: holeIndex,
      point,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "move vertex failed");
      applySingleEditedPolygon(data);
      resetMoveVertex();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateMoveStatus(String(error));
      draw();
    });
}

function loadProject() {
  fetch("/api/project")
    .then((response) => response.json())
    .then((project) => {
      state.loadedFinalWorkingSet = false;
      state.polygons = project.polygon_data.polygons || [];
      state.connections = project.connections?.connections || [];
      state.annotations = project.annotations || state.annotations;
      state.manualPolygons = state.annotations.manual_polygons || [];
      const image = new Image();
      image.onload = () => {
        state.image = image;
        statusEl.textContent = `${state.polygons.length} polygons`;
        fitView();
      };
      image.src = project.image.url;
    })
    .catch((error) => {
      statusEl.textContent = String(error);
    });
}

function togglePreviewFinal() {
  state.previewFinal = !state.previewFinal;
  state.exportedFinalPolygons = null;
  if (state.previewFinal) {
    state.tool = "select";
    resetMerge();
    resetAutoMerge();
    resetStraighten();
    resetMoveVertex();
    resetInsertVertex();
    resetSimpleKeep();
    resetLayerAlign();
  }
  const visibleCount = allPolygons().length;
  if (!state.previewFinal) {
    state.exportedFinalPolygons = null;
  }
  statusEl.textContent = state.previewFinal
    ? `Preview Final: ${visibleCount} polygons`
    : `${state.polygons.length} polygons`;
  document.getElementById("previewFinalBtn").textContent = state.previewFinal
    ? "Exit Final Preview"
    : "Preview Final";
  draw();
}

function loadExportedFinal() {
  fetch("/api/export/final_file")
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to load exported final");
      const polygons = data.polygons || [];
      state.polygons = polygons;
      state.manualPolygons = [];
      state.previewFinal = false;
      state.exportedFinalPolygons = null;
      state.loadedFinalWorkingSet = true;
      state.annotations = {
        polygon_layers: {},
        hidden_polygon_ids: [],
        manual_polygons: [],
        manual_edits: [],
        manual_merges: [],
        manual_connections: [],
        manual_walls: data.walls || [],
        layer_alignment_pairs: state.annotations.layer_alignment_pairs || [],
      };
      state.tool = "select";
      state.selectedId = null;
      resetMerge();
      resetAutoMerge();
      resetStraighten();
      resetMoveVertex();
      resetInsertVertex();
      resetSimpleKeep();
      resetAddPolygon();
      resetCutHole();
      resetLayerAlign();
      resetSharedEdge();
      updateSelectedInfo();
      statusEl.textContent = `Working Set: ${state.polygons.length} exported polygons`;
      document.getElementById("previewFinalBtn").textContent = "Preview Final";
      saveResult.textContent = JSON.stringify({
        loaded: true,
        source: data.source,
        working_set: true,
        polygon_count: state.polygons.length,
        wall_count: (data.walls || []).length,
      }, null, 2);
      draw();
    })
    .catch((error) => {
      saveResult.textContent = String(error);
    });
}

canvas.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  const before = screenToWorld(mouseX, mouseY);
  const zoom = event.deltaY < 0 ? 1.12 : 0.88;
  state.scale = Math.max(0.05, Math.min(20, state.scale * zoom));
  state.offsetX = mouseX - before.x * state.scale;
  state.offsetY = mouseY - before.y * state.scale;
  draw();
});

canvas.addEventListener("mousedown", (event) => {
  const rect = canvas.getBoundingClientRect();
  const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
  if (state.tool === "move" && state.move.active && state.move.polygonId) {
    const vertex = nearestMoveVertexForPolygon(movePolygon(), world);
    if (vertex) {
      state.move.draggingVertex = {
        index: vertex.index,
        holeIndex: vertex.holeIndex,
      };
      state.move.dragPoint = world;
      updateMoveStatus();
      draw();
      return;
    }
  }
  if (state.tool === "sharedEdge" && state.sharedEdge.active && activeSharedEdgePolygon()) {
    state.sharedEdge.dragStart = world;
    state.sharedEdge.dragCurrent = world;
    return;
  }
  state.isPanning = event.button === 1 || event.altKey;
  state.lastMouse = {x: event.clientX, y: event.clientY};
});

canvas.addEventListener("mousemove", (event) => {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  if (state.isPanning && state.lastMouse) {
    state.offsetX += event.clientX - state.lastMouse.x;
    state.offsetY += event.clientY - state.lastMouse.y;
    state.lastMouse = {x: event.clientX, y: event.clientY};
    draw();
    return;
  }

  const world = screenToWorld(x, y);
  if (state.tool === "sharedEdge" && state.sharedEdge.active && state.sharedEdge.dragStart) {
    state.sharedEdge.dragCurrent = world;
    draw();
    return;
  }
  if (state.tool === "move" && state.move.active) {
    if (state.move.draggingVertex !== null) {
      state.move.dragPoint = world;
      draw();
      return;
    }
    const activePoly = movePolygon();
    const nextVertex = nearestMoveVertexForPolygon(activePoly, world);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.move.hoverVertex);
    if (changed) {
      state.move.hoverVertex = nextVertex;
      draw();
    }
    return;
  }
  if (state.tool === "insertVertex" && state.insertVertex.active) {
    const activePoly = insertVertexPolygon();
    const nextEdge = nearestEdgeForPolygon(activePoly, world);
    const changed = JSON.stringify(nextEdge) !== JSON.stringify(state.insertVertex.hoverEdge);
    if (changed) {
      state.insertVertex.hoverEdge = nextEdge;
      updateInsertVertexStatus();
      draw();
    }
    return;
  }
  if (state.tool === "merge" && state.merge.active) {
    const activePoly = activeMergePolygon();
    const nextVertex = nearestVertexForPolygon(activePoly, world);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.merge.hoverVertex);
    if (changed) {
      state.merge.hoverVertex = nextVertex;
      draw();
    }
    return;
  }
  if (state.tool === "straighten" && state.straighten.active) {
    const activePoly = straightenPolygon();
    const nextVertex = nearestVertexForPolygon(activePoly, world);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.straighten.hoverVertex);
    if (changed) {
      state.straighten.hoverVertex = nextVertex;
      draw();
    }
    return;
  }
  if (state.tool === "keep" && state.keep.active) {
    const activePoly = keepPolygon();
    const nextVertex = nearestVertexForPolygon(activePoly, world);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.keep.hoverVertex);
    if (changed) {
      state.keep.hoverVertex = nextVertex;
      draw();
    }
    return;
  }
  if (state.tool === "sharedEdge" && state.sharedEdge.active) {
    const activePoly = activeSharedEdgePolygon();
    const nextVertex = nearestVertexForPolygon(activePoly, world);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.sharedEdge.hoverVertex);
    if (changed) {
      state.sharedEdge.hoverVertex = nextVertex;
      draw();
    }
    return;
  }

  const poly = findPolygonAt(world);
  const nextHover = poly?.polygon_id || null;
  if (nextHover !== state.hoveredId) {
    state.hoveredId = nextHover;
    draw();
  }
});

canvas.addEventListener("mouseup", () => {
  if (state.tool === "sharedEdge" && state.sharedEdge.active && state.sharedEdge.dragStart) {
    const start = state.sharedEdge.dragStart;
    const end = state.sharedEdge.dragCurrent || start;
    state.sharedEdge.dragStart = null;
    state.sharedEdge.dragCurrent = null;
    const moved = Math.hypot(start.x - end.x, start.y - end.y);
    if (moved > 2) {
      setSharedEdgeRange(start, end);
      return;
    }
    draw();
  }
  if (state.tool === "move" && state.move.active && state.move.draggingVertex !== null) {
    finishMoveVertex();
    return;
  }
  state.isPanning = false;
  state.lastMouse = null;
});

canvas.addEventListener("click", (event) => {
  if (event.shiftKey || event.altKey) return;
  const rect = canvas.getBoundingClientRect();
  const world = screenToWorld(event.clientX - rect.left, event.clientY - rect.top);
  const poly = findPolygonAt(world);
  if (state.tool === "merge") {
    addMergeVertex(world, poly);
    return;
  }
  if (state.tool === "straighten") {
    addStraightenVertex(world, poly);
    return;
  }
  if (state.tool === "move") {
    selectMovePolygon(poly);
    return;
  }
  if (state.tool === "insertVertex") {
    if (!state.insertVertex.polygonId) selectInsertVertexPolygon(poly);
    else applyInsertVertex(world);
    return;
  }
  if (state.tool === "autoMerge") {
    toggleAutoMergePolygon(poly);
    return;
  }
  if (state.tool === "addPolygon") {
    addPolygonPoint(world);
    return;
  }
  if (state.tool === "cutHole") {
    addCutHolePoint(world, poly);
    return;
  }
  if (state.tool === "layerAlign") {
    addLayerAlignPoint(world, poly);
    return;
  }
  if (state.tool === "sharedEdge") {
    addSharedEdgeVertex(world, poly);
    return;
  }
  if (state.tool === "keep") {
    toggleKeepVertex(world, poly);
    return;
  }
  state.selectedId = poly?.polygon_id || null;
  updateSelectedInfo();
  updateDeleteStatus();
  draw();
});

document.getElementById("fitViewBtn").addEventListener("click", fitView);
document.getElementById("resetViewBtn").addEventListener("click", () => {
  state.scale = 1;
  state.offsetX = 0;
  state.offsetY = 0;
  draw();
});
document.getElementById("showIdsToggle").addEventListener("change", (event) => {
  state.showIds = event.target.checked;
  draw();
});
document.getElementById("showConnectionsToggle").addEventListener("change", (event) => {
  state.showConnections = event.target.checked;
  draw();
});
document.getElementById("showHiddenToggle").addEventListener("change", (event) => {
  state.showHidden = event.target.checked;
  draw();
});
document.getElementById("setLayerBtn").addEventListener("click", () => {
  if (!state.selectedId) return;
  state.annotations.polygon_layers = state.annotations.polygon_layers || {};
  const layer = layerInput.value.trim();
  state.annotations.polygon_layers[state.selectedId] = layer;
  const poly = selectedPolygon();
  if (poly) {
    poly.semantic = poly.semantic || {};
    poly.semantic.layer = layer || null;
  }
  updateSelectedInfo();
  draw();
});
document.getElementById("toggleHideBtn").addEventListener("click", () => {
  if (!state.selectedId) return;
  const hidden = new Set(state.annotations.hidden_polygon_ids || []);
  if (hidden.has(state.selectedId)) hidden.delete(state.selectedId);
  else hidden.add(state.selectedId);
  state.annotations.hidden_polygon_ids = Array.from(hidden);
  updateDeleteStatus();
  draw();
});
document.getElementById("deletePolygonBtn").addEventListener("click", deleteSelectedPolygon);
document.getElementById("undoDeletePolygonBtn").addEventListener("click", undoLastDeletePolygon);
document.getElementById("startKeepBtn").addEventListener("click", startSimpleKeep);
document.getElementById("applyKeepBtn").addEventListener("click", applySimpleKeep);
document.getElementById("resetKeepBtn").addEventListener("click", resetSimpleKeep);
document.getElementById("startAutoMergeBtn").addEventListener("click", startAutoMerge);
document.getElementById("applyAutoMergeBtn").addEventListener("click", applyAutoMerge);
document.getElementById("resetAutoMergeBtn").addEventListener("click", resetAutoMerge);
document.getElementById("startMergeBtn").addEventListener("click", startMerge);
document.getElementById("removeOrangePathBtn").addEventListener("click", () => chooseRemovePath("forward"));
document.getElementById("resetMergeBtn").addEventListener("click", resetMerge);
document.getElementById("applyMergeBtn").addEventListener("click", applyMerge);
document.getElementById("undoMergeBtn").addEventListener("click", undoLastMerge);
document.getElementById("startStraightenBtn").addEventListener("click", startStraighten);
document.getElementById("straightenOrangePathBtn").addEventListener("click", chooseStraightenOrangePath);
document.getElementById("applyStraightenBtn").addEventListener("click", applyStraighten);
document.getElementById("undoStraightenBtn").addEventListener("click", undoLastStraighten);
document.getElementById("resetStraightenBtn").addEventListener("click", resetStraighten);
document.getElementById("startMoveBtn").addEventListener("click", startMoveVertex);
document.getElementById("resetMoveBtn").addEventListener("click", resetMoveVertex);
document.getElementById("startInsertVertexBtn").addEventListener("click", startInsertVertex);
document.getElementById("undoInsertVertexBtn").addEventListener("click", undoLastInsertVertex);
document.getElementById("resetInsertVertexBtn").addEventListener("click", resetInsertVertex);
document.getElementById("startSharedEdgeBtn").addEventListener("click", startSharedEdge);
document.getElementById("toggleSharedEdgeADirectionBtn").addEventListener("click", () => toggleSharedEdgeDirection("polygon_a"));
document.getElementById("toggleSharedEdgeBDirectionBtn").addEventListener("click", () => toggleSharedEdgeDirection("polygon_b"));
document.getElementById("cycleSharedEdgeOrderBtn").addEventListener("click", cycleSharedEdgeReplacementOrder);
document.getElementById("applySharedEdgeBtn").addEventListener("click", applySharedEdge);
document.getElementById("undoSharedEdgeBtn").addEventListener("click", undoLastSharedEdge);
document.getElementById("resetSharedEdgeBtn").addEventListener("click", resetSharedEdge);
document.getElementById("startAddPolygonBtn").addEventListener("click", startAddPolygon);
document.getElementById("applyAddPolygonBtn").addEventListener("click", applyAddPolygon);
document.getElementById("undoAddPointBtn").addEventListener("click", undoAddPolygonPoint);
document.getElementById("resetAddPolygonBtn").addEventListener("click", resetAddPolygon);
document.getElementById("startCutHoleBtn").addEventListener("click", startCutHole);
document.getElementById("applyCutHoleBtn").addEventListener("click", applyCutHole);
document.getElementById("undoHolePointBtn").addEventListener("click", undoCutHolePoint);
document.getElementById("undoCutHoleBtn").addEventListener("click", undoLastCutHole);
document.getElementById("resetCutHoleBtn").addEventListener("click", resetCutHole);
document.getElementById("startLayerAlignBtn").addEventListener("click", startLayerAlign);
document.getElementById("undoLayerAlignBtn").addEventListener("click", undoLastLayerAlignPair);
document.getElementById("resetLayerAlignBtn").addEventListener("click", resetLayerAlign);
document.getElementById("resetAllBtn").addEventListener("click", resetToInitialPolygons);
document.getElementById("saveBtn").addEventListener("click", () => {
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
  });
});
document.getElementById("previewFinalBtn").addEventListener("click", togglePreviewFinal);
document.getElementById("loadExportedFinalBtn").addEventListener("click", loadExportedFinal);
document.getElementById("exportFinalBtn").addEventListener("click", () => {
  saveAnnotations()
    .then(() => fetch("/api/export/final", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        working_polygons: workingPolygonsPayload(),
      }),
    }))
    .then((response) => response.json())
    .then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
    });
});
document.getElementById("exportPlanesBtn").addEventListener("click", () => {
  saveAnnotations()
    .then(() => fetch("/api/export/planes", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        working_polygons: workingPolygonsPayload(),
      }),
    }))
    .then((response) => response.json())
    .then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
    });
});

function isTypingTarget(target) {
  const tagName = target?.tagName?.toLowerCase();
  return tagName === "input" || tagName === "textarea" || target?.isContentEditable;
}

document.addEventListener("keydown", (event) => {
  if (isTypingTarget(event.target)) return;

  const key = event.key.toLowerCase();
  if (key === "a") {
    event.preventDefault();
    startSimpleKeep();
  } else if (key === "q") {
    event.preventDefault();
    startMerge();
  } else if (key === "w") {
    event.preventDefault();
    startStraighten();
  } else if (key === "e") {
    event.preventDefault();
    startMoveVertex();
  } else if (key === "x") {
    event.preventDefault();
    startInsertVertex();
  } else if (key === "d") {
    event.preventDefault();
    startAddPolygon();
  } else if (key === "c") {
    event.preventDefault();
    startCutHole();
  } else if (key === "r") {
    event.preventDefault();
    startAutoMerge();
  } else if (key === "t") {
    event.preventDefault();
    startSharedEdge();
  } else if (key === "y") {
    event.preventDefault();
    startLayerAlign();
  } else if (key === "g") {
    event.preventDefault();
    toggleSharedEdgeDirection("polygon_a");
  } else if (key === "h") {
    event.preventDefault();
    toggleSharedEdgeDirection("polygon_b");
  } else if (key === "v") {
    event.preventDefault();
    cycleSharedEdgeReplacementOrder();
  } else if (key === "f") {
    event.preventDefault();
    if (state.tool === "merge") {
      chooseRemovePath("forward");
      if (isMergeReady()) applyMerge();
    } else if (state.tool === "straighten") {
      chooseStraightenOrangePath();
      if (isStraightenReady()) applyStraighten();
    }
  } else if (key === "z") {
    event.preventDefault();
    undoLastMerge();
  } else if (event.key === "Delete") {
    event.preventDefault();
    deleteSelectedPolygon();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    if (state.tool === "cutHole") undoCutHolePoint();
    else undoAddPolygonPoint();
  } else if (event.key === "Shift") {
    event.preventDefault();
    if (state.tool === "keep") applySimpleKeep();
    else if (state.tool === "addPolygon") applyAddPolygon();
    else if (state.tool === "cutHole") applyCutHole();
    else if (state.tool === "sharedEdge") applySharedEdge();
    else if (state.tool === "autoMerge") applyAutoMerge();
    else if (state.tool === "merge") applyMerge();
    else if (state.tool === "straighten") applyStraighten();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (state.tool === "keep") resetSimpleKeep();
    else if (state.tool === "addPolygon") resetAddPolygon();
    else if (state.tool === "cutHole") resetCutHole();
    else if (state.tool === "layerAlign") resetLayerAlign();
    else if (state.tool === "sharedEdge") resetSharedEdge();
    else if (state.tool === "autoMerge") resetAutoMerge();
    else if (state.tool === "merge") resetMerge();
    else if (state.tool === "straighten") resetStraighten();
    else if (state.tool === "move") resetMoveVertex();
    else if (state.tool === "insertVertex") resetInsertVertex();
  }
});

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
updateMergeStatus();
updateAutoMergeStatus();
updateStraightenStatus();
updateMoveStatus();
updateInsertVertexStatus();
updateDeleteStatus();
updateSharedEdgeStatus();
updateAddPolygonStatus();
updateCutHoleStatus();
updateLayerAlignStatus();
updateKeepStatus();
loadProject();
