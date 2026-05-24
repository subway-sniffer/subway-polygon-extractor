const state = {
  image: null,
  polygons: [],
  manualPolygons: [],
  connections: [],
  icons: [],
  annotations: {
    polygon_layers: {},
    polygon_z_offsets: {},
    polygon_z_values: {},
    hidden_polygon_ids: [],
    manual_edits: [],
    manual_merges: [],
    manual_connections: [],
    manual_walls: [],
    manual_assets: [],
    layer_alignment_pairs: [],
    polygon_axis_corrections: {},
    scale_calibration: null,
  },
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  isPanning: false,
  lastMouse: null,
  hoveredId: null,
  selectedId: null,
  selectedIds: [],
  selectedStairId: null,
  selectedStairIds: [],
  selectedSubwayId: null,
  showIds: false,
  showConnections: false,
  showIcons: false,
  showCorrections: true,
  showMarkers: true,
  showHidden: false,
  previewFinal: false,
  exportedFinalPolygons: null,
  loadedFinalWorkingSet: false,
  tool: "select",
  marker: {
    active: false,
    points: [],
  },
  crop: {
    active: false,
    start: null,
    current: null,
    rect: null,
  },
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
    selectedVertices: [],
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
  splitPolygon: {
    active: false,
    polygonId: null,
    vertexIndices: [],
    hoverVertex: null,
  },
  layerAlign: {
    active: false,
    label: "align_A",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverPoint: null,
  },
  selectedLayerAlignIndex: null,
  scaleCalibration: {
    active: false,
    points: [],
  },
  localAxis: {
    active: false,
    polygonId: null,
    points: [],
  },
  stair: {
    active: false,
    label: "",
    fromPoints: [],
    toPoints: [],
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverVertex: null,
  },
  subway: {
    active: false,
    label: "",
    points: [],
    polygonId: null,
    layer: null,
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
const zOverrideInput = document.getElementById("zOverrideInput");
const showIconsToggle = document.getElementById("showIconsToggle");
const showCorrectionsToggle = document.getElementById("showCorrectionsToggle");
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
const splitPolygonStatus = document.getElementById("splitPolygonStatus");
const layerAlignStatus = document.getElementById("layerAlignStatus");
const alignLabelInput = document.getElementById("alignLabelInput");
const alignModeInput = document.getElementById("alignModeInput");
const scaleLengthInput = document.getElementById("scaleLengthInput");
const scaleStatus = document.getElementById("scaleStatus");
const localAxisStatus = document.getElementById("localAxisStatus");
const stairStatus = document.getElementById("stairStatus");
const stairLabelInput = document.getElementById("stairLabelInput");
const connectionTypeInput = document.getElementById("connectionTypeInput");
const subwayStatus = document.getElementById("subwayStatus");
const subwayLabelInput = document.getElementById("subwayLabelInput");
const manualAssetTypeInput = document.getElementById("manualAssetTypeInput");
const keepStatus = document.getElementById("keepStatus");
const imageSelect = document.getElementById("imageSelect");
const uploadImageInput = document.getElementById("uploadImageInput");
const pipelineStatus = document.getElementById("pipelineStatus");
const clusterList = document.getElementById("clusterList");
const pipelineKInput = document.getElementById("pipelineKInput");
const pipelineClustersInput = document.getElementById("pipelineClustersInput");
const pipelineMinAreaInput = document.getElementById("pipelineMinAreaInput");
const pipelineEpsilonInput = document.getElementById("pipelineEpsilonInput");
const pipelineBridgeClustersInput = document.getElementById("pipelineBridgeClustersInput");
const pipelineGroupingToggle = document.getElementById("pipelineGroupingToggle");
const iconThresholdInput = document.getElementById("iconThresholdInput");
const groupingLayerCountInput = document.getElementById("groupingLayerCountInput");
const groupingMinContactAreaInput = document.getElementById("groupingMinContactAreaInput");
const groupingStatus = document.getElementById("groupingStatus");

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
  const multiSelected = state.selectedIds.includes(poly.polygon_id);
  const hovered = state.hoveredId === poly.polygon_id;
  const keepSourceIds = new Set((state.keep.selectedVertices || []).map((item) => item.polygonId));
  const keepActive = state.keep.active && (
    state.keep.polygonId === poly.polygon_id || keepSourceIds.has(poly.polygon_id)
  );
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
  ctx.fillStyle = hidden && !previewActive ? "rgba(120,120,120,0.08)" : polygonColor(poly, selected || multiSelected ? 0.62 : 0.35);
  ctx.strokeStyle = previewActive ? "rgba(20,20,20,0.85)" : autoMergeSelected ? "#7b2cff" : keepActive ? "#00c853" : multiSelected ? "#00aaff" : selected ? "#ff2d2d" : hovered ? "#ffd400" : "rgba(30,30,30,0.55)";
  ctx.lineWidth = previewActive ? 2 : autoMergeSelected ? 4 : keepActive ? 4 : multiSelected ? 4 : selected ? 3 : hovered ? 2 : 1;
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

function drawIcons() {
  if (!state.showIcons) return;
  ctx.save();
  const typeColors = new Map();
  const palette = ["#00c2ff", "#ff4db8", "#ffcc00", "#56d364", "#b083ff", "#ff7b00"];
  for (const icon of state.icons || []) {
    const bbox = icon.bbox;
    const center = icon.center || icon.center_source;
    if (!bbox && !center) continue;
    const type = icon.type || "icon";
    if (!typeColors.has(type)) typeColors.set(type, palette[typeColors.size % palette.length]);
    const color = typeColors.get(type);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (bbox) {
      const topLeft = worldToScreen([bbox[0], bbox[1]]);
      const bottomRight = worldToScreen([bbox[0] + bbox[2], bbox[1] + bbox[3]]);
      ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    }
    if (center) {
      const screen = worldToScreen(center);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
      ctx.fill();
      drawCanvasLabel(center, `${icon.icon_id || ""} ${type}`.trim(), color, 6, -6);
    }
  }
  ctx.restore();
}

function drawStairConnections() {
  ctx.save();
  const selectedStairIds = new Set([state.selectedStairId, ...(state.selectedStairIds || [])].filter(Boolean));
  for (const conn of state.annotations.manual_connections || []) {
    if (!["stair", "escalator"].includes(conn.type) || !conn.from_point_source || !conn.to_point_source) continue;
    const connectionId = conn.connection_id || conn.label;
    const isSelected = selectedStairIds.has(connectionId);
    const baseColor = conn.type === "escalator" ? "rgba(0, 180, 120, 0.95)" : "rgba(255, 132, 0, 0.95)";
    const pointColor = conn.type === "escalator" ? "#00b878" : "#ff8400";
    const lineColor = isSelected ? "rgba(0, 92, 255, 0.95)" : baseColor;
    const startLine = connectionLinePoints(conn, "from");
    const endLine = connectionLinePoints(conn, "to");
    if (startLine && endLine) {
      drawPath(startLine, lineColor, isSelected ? 7 : 4);
      drawPath(endLine, lineColor, isSelected ? 7 : 4);
      drawPath([midpoint(startLine[0], startLine[1]), midpoint(endLine[0], endLine[1])], lineColor, isSelected ? 4 : 2);
    } else {
      drawPath(
        [conn.from_point_source, conn.to_point_source],
        lineColor,
        isSelected ? 7 : 4,
      );
    }
    const sourcePoints = [...(startLine || [conn.from_point_source]), ...(endLine || [conn.to_point_source])];
    ctx.fillStyle = isSelected ? "#005cff" : pointColor;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1;
    for (const point of sourcePoints) {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const labelPoint = midpoint(conn.from_point_source, conn.to_point_source);
    drawCanvasLabel(labelPoint, conn.connection_id || conn.label || conn.type, isSelected ? "#005cff" : pointColor, 8, -8);
  }
  if (state.stair.active) {
    const fromPoints = state.stair.fromPoints || [];
    const toPoints = state.stair.toPoints || [];
    if (fromPoints.length === 2) drawPath(fromPoints, "rgba(0, 170, 255, 0.95)", 4);
    if (toPoints.length === 2) drawPath(toPoints, "rgba(255, 132, 0, 0.95)", 4);
    if (fromPoints.length === 2 && toPoints.length >= 1) {
      drawPath([midpoint(fromPoints[0], fromPoints[1]), toPoints.length === 2 ? midpoint(toPoints[0], toPoints[1]) : toPoints[0]], "rgba(0, 180, 255, 0.6)", 2);
    }
    [...fromPoints, ...toPoints].forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = index < fromPoints.length ? "#00aaff" : "#ff8400";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    if (state.stair.fromPoint && state.stair.fromLayer) {
      drawCanvasLabel(state.stair.fromPoint, `${state.stair.fromLayer} ${state.stair.fromPolygonId}`, "#00aaff", 8, -8);
    }
    if (state.stair.toPoint && state.stair.toLayer) {
      drawCanvasLabel(state.stair.toPoint, `${state.stair.toLayer} ${state.stair.toPolygonId}`, "#ff8400", 8, 18);
    }
    if (state.stair.hoverVertex) {
      const screen = worldToScreen(state.stair.hoverVertex.point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 9, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 11, 0, Math.PI * 2);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.stroke();
      drawCanvasLabel(state.stair.hoverVertex.point, "snap", "#ffffff", 10, -10);
    }
  }
  ctx.restore();
}

function drawManualAssets() {
  ctx.save();
  for (const asset of state.annotations.manual_assets || []) {
    if (!["subway", "moving_walkway"].includes(asset.type) || !asset.point_source) continue;
    const selected = (asset.asset_id || asset.label) === state.selectedSubwayId;
    const baseColor = asset.type === "moving_walkway" ? "rgba(0, 190, 140, 0.88)" : "rgba(0, 120, 255, 0.85)";
    const selectedColor = "rgba(255, 210, 0, 0.95)";
    const labelColor = asset.type === "moving_walkway" ? "#00a878" : "#0078ff";
    if (asset.start_point_source && asset.end_point_source) {
      drawPath([asset.start_point_source, asset.end_point_source], selected ? selectedColor : baseColor, selected ? 5 : 3);
    }
    const screen = worldToScreen(asset.point_source);
    ctx.beginPath();
    ctx.rect(screen.x - 9, screen.y - 5, 18, 10);
    ctx.fillStyle = selected ? selectedColor : baseColor;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(asset.point_source, asset.asset_id || asset.label || asset.type, selected ? "#ffd200" : labelColor, 10, -10);
  }
  if (state.subway.active) {
    const points = state.subway.points || [];
    const color = state.subway.assetType === "moving_walkway" ? "rgba(0, 190, 140, 0.95)" : "rgba(0, 120, 255, 0.95)";
    if (points.length === 2) drawPath(points, color, 4);
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = state.subway.assetType === "moving_walkway"
        ? (index === 0 ? "#00d29a" : "#00a878")
        : (index === 0 ? "#00aaff" : "#0078ff");
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawManualMarkerPreview() {
  if (!state.showMarkers) return;
  if (!state.marker.active && state.marker.points.length === 0) return;
  ctx.save();
  const labels = ["1", "2", "3", "4"];
  if (state.marker.points.length > 1) drawPath(state.marker.points, "rgba(255, 0, 180, 0.9)", 3);
  state.marker.points.forEach((point, index) => {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = "#ff00b4";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(point, `marker ${labels[index]}`, "#ff00b4", 10, -10);
  });
  ctx.restore();
}

function normalizedCropRect() {
  if (state.crop.rect) return state.crop.rect;
  const start = state.crop.start;
  const end = state.crop.current;
  if (!start || !end) return null;
  const x1 = Math.max(0, Math.min(start.x, end.x));
  const y1 = Math.max(0, Math.min(start.y, end.y));
  const x2 = Math.min(state.image?.width || Infinity, Math.max(start.x, end.x));
  const y2 = Math.min(state.image?.height || Infinity, Math.max(start.y, end.y));
  return {
    x: x1,
    y: y1,
    width: Math.max(0, x2 - x1),
    height: Math.max(0, y2 - y1),
  };
}

function drawCropPreview() {
  if (!state.crop.active && !state.crop.rect) return;
  const rect = normalizedCropRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return;
  const topLeft = worldToScreen([rect.x, rect.y]);
  const bottomRight = worldToScreen([rect.x + rect.width, rect.y + rect.height]);
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.14)";
  ctx.fillRect(state.offsetX, state.offsetY, state.image.width * state.scale, state.image.height * state.scale);
  ctx.drawImage(
    state.image,
    rect.x,
    rect.y,
    rect.width,
    rect.height,
    topLeft.x,
    topLeft.y,
    bottomRight.x - topLeft.x,
    bottomRight.y - topLeft.y,
  );
  ctx.strokeStyle = "#00d4ff";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 5]);
  ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  ctx.setLineDash([]);
  ctx.fillStyle = "#00d4ff";
  ctx.font = "12px system-ui, sans-serif";
  ctx.fillText(
    `${Math.round(rect.width)} x ${Math.round(rect.height)}`,
    topLeft.x + 8,
    Math.max(16, topLeft.y - 8),
  );
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

function splitPolygonTarget() {
  if (!state.splitPolygon.polygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.splitPolygon.polygonId) || null;
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
  const selectedVertices = state.keep.selectedVertices || [];
  const keptPoints = selectedVertices.map((item) => item.point);

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

  const selectedKeys = new Set(selectedVertices.map((item) => `${item.polygonId}:${item.index}`));
  for (const poly of allPolygons()) {
    (poly.points_source || []).forEach((point, index) => {
      const key = `${poly.polygon_id}:${index}`;
      const screen = worldToScreen(point);
      const selected = selectedKeys.has(key);
      const hovered = state.keep.hoverVertex
        && state.keep.hoverVertex.polygonId === poly.polygon_id
        && state.keep.hoverVertex.index === index;
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, hovered || selected ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#00c853" : hovered ? "#00aaff" : "rgba(255,255,255,0.72)";
      ctx.strokeStyle = selected ? "#003d1c" : hovered ? "#111111" : "rgba(0,0,0,0.45)";
      ctx.lineWidth = selected || hovered ? 2 : 1;
      ctx.fill();
      ctx.stroke();
    });
  }
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
  if (!state.showCorrections && !state.layerAlign.active) return;
  ctx.save();
  if (state.showCorrections) {
    (state.annotations.layer_alignment_pairs || []).forEach((pair, index) => {
      if (!pair.from_point_source || !pair.to_point_source) return;
      const selected = index === state.selectedLayerAlignIndex;
      const color = selected ? "rgba(255, 210, 0, 0.95)" : "rgba(123, 44, 255, 0.75)";
      drawPath([pair.from_point_source, pair.to_point_source], color, selected ? 5 : 3);
      drawCanvasLabel(pair.from_point_source, `${pair.from_layer} ${pair.label || ""}`, selected ? "#ffd200" : "#7b2cff", 8, -8);
      drawCanvasLabel(pair.to_point_source, `${pair.to_layer} ${pair.label || ""}`, selected ? "#ffd200" : "#7b2cff", 8, 18);
    });
  }
  if (state.layerAlign.active) {
    const previewToPoint = state.layerAlign.toPoint || state.layerAlign.hoverPoint;
    const points = [state.layerAlign.fromPoint, previewToPoint].filter(Boolean);
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

function drawScaleCalibrationPreview() {
  ctx.save();
  const calibration = state.annotations.scale_calibration;
  if (calibration?.points_source?.length === 2) {
    drawPath(calibration.points_source, "rgba(0, 180, 120, 0.95)", 4);
    calibration.points_source.forEach((point) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#00b878";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    const labelPoint = [
      (calibration.points_source[0][0] + calibration.points_source[1][0]) / 2,
      (calibration.points_source[0][1] + calibration.points_source[1][1]) / 2,
    ];
    drawCanvasLabel(labelPoint, `${calibration.real_length} ${calibration.unit || ""}`.trim(), "#00b878", 8, -8);
  }
  if (state.scaleCalibration.active && state.scaleCalibration.points.length > 0) {
    if (state.scaleCalibration.points.length === 2) {
      drawPath(state.scaleCalibration.points, "rgba(0, 92, 255, 0.95)", 4);
    }
    state.scaleCalibration.points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#005cff" : "#00b878";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawSplitPolygonPreview() {
  if (!state.splitPolygon.active) return;
  const poly = splitPolygonTarget();
  ctx.save();
  if (poly) {
    const selectedSet = new Set(state.splitPolygon.vertexIndices || []);
    const vertices = poly.points_source || [];
    if (state.splitPolygon.vertexIndices.length === 1) {
      const start = vertices[state.splitPolygon.vertexIndices[0]];
      const end = state.splitPolygon.hoverVertex?.point;
      if (start && end) drawPath([start, end], "rgba(255, 0, 90, 0.8)", 4);
    } else if (state.splitPolygon.vertexIndices.length === 2) {
      drawPath(
        [
          vertices[state.splitPolygon.vertexIndices[0]],
          vertices[state.splitPolygon.vertexIndices[1]],
        ],
        "rgba(255, 0, 90, 0.95)",
        4,
      );
    }
    vertices.forEach((point, index) => {
      const screen = worldToScreen(point);
      const hovered = state.splitPolygon.hoverVertex && state.splitPolygon.hoverVertex.index === index;
      const selected = selectedSet.has(index);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, hovered || selected ? 6 : 3, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ff005a" : hovered ? "#00aaff" : "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawLocalAxisCorrections() {
  if (!state.showCorrections && !state.localAxis.active) return;
  ctx.save();
  if (state.showCorrections) {
    for (const [polygonId, correction] of Object.entries(state.annotations.polygon_axis_corrections || {})) {
      const points = [correction.origin, correction.x_axis_point, correction.y_axis_point].filter(Boolean);
      if (points.length !== 3) continue;
      drawPath([points[0], points[1]], "rgba(0, 170, 255, 0.9)", 4);
      drawPath([points[0], points[2]], "rgba(0, 210, 110, 0.9)", 4);
      drawCanvasLabel(points[0], `${polygonId} O`, "#222222", 8, -8);
      drawCanvasLabel(points[1], "X", "#00aaff", 8, -8);
      drawCanvasLabel(points[2], "Y", "#00b878", 8, 18);
    }
  }
  if (state.localAxis.active) {
    const points = state.localAxis.points;
    if (points.length >= 2) drawPath(points.slice(0, 2), "rgba(0, 170, 255, 0.95)", 5);
    if (points.length >= 3) drawPath([points[0], points[2]], "rgba(0, 210, 110, 0.95)", 5);
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#ffffff" : index === 1 ? "#00aaff" : "#00b878";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(point, ["O", "X", "Y"][index], ctx.fillStyle, 8, -8);
    });
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
  drawIcons();
  drawStairConnections();
  drawManualAssets();
  drawManualMarkerPreview();
  drawCropPreview();
  drawMergePreview();
  drawStraightenPreview();
  drawMovePreview();
  drawInsertVertexPreview();
  drawKeepPreview();
  drawAddPolygonPreview();
  drawCutHolePreview();
  drawSplitPolygonPreview();
  drawLayerAlignPreview();
  drawScaleCalibrationPreview();
  drawLocalAxisCorrections();
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

function selectedLayerPolygonIds() {
  return state.selectedIds.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
}

function clearMultiSelection() {
  state.selectedIds = [];
}

function toggleMultiSelectedPolygon(poly) {
  if (!poly) return;
  const selected = new Set(state.selectedIds);
  if (selected.has(poly.polygon_id)) selected.delete(poly.polygon_id);
  else selected.add(poly.polygon_id);
  state.selectedIds = Array.from(selected);
  state.selectedId = poly.polygon_id;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedSubwayId = null;
  state.selectedLayerAlignIndex = null;
  updateSelectedInfo();
  updateLayerAlignStatus();
  updateSubwayStatus();
  updateStairStatus();
  updateDeleteStatus();
  draw();
}

function updateSelectedInfo() {
  const poly = selectedPolygon();
  if (state.selectedIds.length > 1) {
    const layers = new Set(
      state.selectedIds
        .map((polygonId) => state.annotations.polygon_layers?.[polygonId])
        .filter(Boolean),
    );
    selectedInfo.innerHTML = `
      <dt>polygons</dt><dd>${state.selectedIds.length}</dd>
      <dt>selected</dt><dd>${state.selectedIds.join(", ")}</dd>
      <dt>layers</dt><dd>${Array.from(layers).join(", ") || "-"}</dd>
    `;
    zOverrideInput.value = "";
    updateDeleteStatus();
    return;
  }
  if (!poly) {
    selectedInfo.innerHTML = "<dt>polygon</dt><dd>-</dd><dt>cluster</dt><dd>-</dd><dt>area</dt><dd>-</dd>";
    layerInput.value = "";
    zOverrideInput.value = "";
    updateDeleteStatus();
    return;
  }
  const layer = state.annotations.polygon_layers?.[poly.polygon_id] || poly.semantic?.layer || "";
  const zOffset = state.annotations.polygon_z_offsets?.[poly.polygon_id];
  const zOverride = state.annotations.polygon_z_values?.[poly.polygon_id];
  layerInput.value = layer;
  zOverrideInput.value = zOffset ?? "";
  selectedInfo.innerHTML = `
    <dt>polygon</dt><dd>${poly.polygon_id}</dd>
    <dt>cluster</dt><dd>${poly.color_cluster ?? "-"}</dd>
    <dt>area</dt><dd>${Math.round(poly.area_source || 0)}</dd>
    <dt>layer</dt><dd>${layer || "-"}</dd>
    <dt>z offset</dt><dd>${zOffset ?? "-"}</dd>
    <dt>absolute z</dt><dd>${zOverride ?? "-"}</dd>
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
    "mode: simple keep / merge vertices",
    `source polygons: ${Array.from(new Set((state.keep.selectedVertices || []).map((item) => item.polygonId))).join(", ") || "-"}`,
    `kept vertices: ${(state.keep.selectedVertices || []).length}`,
    "Click existing vertices in final polygon order. Shift applies.",
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

function updateSplitPolygonStatus(message = null) {
  if (!state.splitPolygon.active) {
    splitPolygonStatus.textContent = "inactive";
    return;
  }
  splitPolygonStatus.textContent = [
    message,
    "mode: split by existing vertices",
    `polygon: ${state.splitPolygon.polygonId || "-"}`,
    `vertices: ${state.splitPolygon.vertexIndices.length}/2`,
    state.splitPolygon.polygonId ? "Click two existing vertices." : "Click a polygon vertex.",
  ].filter(Boolean).join("\n");
}

function startSplitPolygon() {
  if (!canEdit()) return;
  state.tool = "splitPolygon";
  state.splitPolygon = {
    active: true,
    polygonId: null,
    vertexIndices: [],
    hoverVertex: null,
  };
  updateSplitPolygonStatus();
  draw();
}

function resetSplitPolygon() {
  state.tool = "select";
  state.splitPolygon = {
    active: false,
    polygonId: null,
    vertexIndices: [],
    hoverVertex: null,
  };
  updateSplitPolygonStatus();
  draw();
}

function addSplitPolygonPoint(world, poly) {
  if (!state.splitPolygon.active) return;
  const targetPoly = state.splitPolygon.polygonId ? splitPolygonTarget() : poly;
  const vertex = nearestVertexForPolygon(targetPoly, world, 16);
  if (!targetPoly || !vertex) {
    updateSplitPolygonStatus("Click near an existing polygon vertex.");
    return;
  }
  if (!state.splitPolygon.polygonId) {
    state.splitPolygon.polygonId = targetPoly.polygon_id;
    state.selectedId = targetPoly.polygon_id;
    updateSelectedInfo();
  } else if (targetPoly.polygon_id !== state.splitPolygon.polygonId) {
    updateSplitPolygonStatus(`Keep both vertices on ${state.splitPolygon.polygonId}.`);
    return;
  }
  if (state.splitPolygon.vertexIndices.includes(vertex.index)) {
    updateSplitPolygonStatus("Select a different vertex.");
    return;
  }
  state.splitPolygon.vertexIndices.push(vertex.index);
  if (state.splitPolygon.vertexIndices.length >= 2) {
    applySplitPolygon();
    return;
  }
  updateSplitPolygonStatus();
  draw();
}

function undoSplitPolygonPoint() {
  if (!state.splitPolygon.active) return;
  if (state.splitPolygon.vertexIndices.length === 0) {
    updateSplitPolygonStatus("No split point to undo.");
    return;
  }
  state.splitPolygon.vertexIndices.pop();
  updateSplitPolygonStatus();
  draw();
}

function applySplitPolygon() {
  if (!canEdit()) return;
  if (!state.splitPolygon.active || !state.splitPolygon.polygonId || state.splitPolygon.vertexIndices.length !== 2) {
    updateSplitPolygonStatus("Choose target polygon and two vertices.");
    return;
  }
  fetch("/api/split_polygon", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.splitPolygon.polygonId,
      vertex_indices: state.splitPolygon.vertexIndices,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "split polygon failed");
      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];
      state.annotations.manual_polygons.push(...data.edited_polygons);
      state.annotations.manual_edits.push(data.edit_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      hidden.add(data.edit_record.source_polygon_id);
      state.annotations.hidden_polygon_ids = Array.from(hidden);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.edited_polygons[0]?.polygon_id || null;
      updateSelectedInfo();
      resetSplitPolygon();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify(result, null, 2);
      });
    })
    .catch((error) => {
      updateSplitPolygonStatus(String(error));
      draw();
    });
}

function undoLastSplitPolygon() {
  const edits = state.annotations.manual_edits || [];
  const index = [...edits].reverse().findIndex((edit) => edit.type === "split_polygon");
  if (index < 0) {
    updateSplitPolygonStatus("No split edit to undo.");
    return;
  }
  const editIndex = edits.length - 1 - index;
  const removedEdit = edits.splice(editIndex, 1)[0];
  const createdIds = new Set(removedEdit.created_polygon_ids || []);
  state.annotations.manual_edits = edits;
  state.annotations.manual_polygons = (state.annotations.manual_polygons || []).filter(
    (poly) => !createdIds.has(poly.polygon_id),
  );
  state.manualPolygons = state.annotations.manual_polygons;
  syncHiddenIdsFromManualRecords();
  if (createdIds.has(state.selectedId)) {
    state.selectedId = null;
    updateSelectedInfo();
  }
  resetSplitPolygon();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    splitPolygonStatus.textContent = `Undid ${removedEdit.edit_id || "split"}.`;
    draw();
  });
}

function updateLayerAlignStatus(message = null) {
  if (!state.layerAlign.active) {
    layerAlignStatus.textContent = [
      message,
      `pairs: ${(state.annotations.layer_alignment_pairs || []).length}`,
      state.selectedLayerAlignIndex !== null ? `selected: ${state.selectedLayerAlignIndex + 1}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const next = !state.layerAlign.fromPoint
    ? "Click first correction point on a layered polygon"
    : !state.layerAlign.toPoint
      ? "Click matching correction point on another layered polygon"
      : "Pair ready";
  layerAlignStatus.textContent = [
    message,
    `correction mode: ${state.layerAlign.alignMode || "same_xy"}`,
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
    label: alignLabelInput.value.trim() || "align_A",
    alignMode: alignModeInput?.value || "same_xy",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverPoint: null,
  };
  updateLayerAlignStatus();
  draw();
}

function resetLayerAlign() {
  state.tool = "select";
  state.layerAlign = {
    active: false,
    label: alignLabelInput.value.trim() || "align_A",
    alignMode: alignModeInput?.value || "same_xy",
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverPoint: null,
  };
  updateLayerAlignStatus();
  draw();
}

function polygonLayerValue(poly) {
  if (!poly) return null;
  return state.annotations.polygon_layers?.[poly.polygon_id] || poly.semantic?.layer || null;
}

function verticalLayerAlignPoint(world) {
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if ((state.layerAlign.alignMode || "same_xy") === "vertical_y" && state.layerAlign.fromPoint) {
    point[0] = state.layerAlign.fromPoint[0];
  }
  return point;
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
  const point = verticalLayerAlignPoint(world);
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
    mode: state.layerAlign.alignMode || "same_xy",
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetLayerAlign();
    updateLayerAlignStatus("Alignment pair saved.");
  });
}

function nearestLayerAlignPair(world, maxScreenDistance = 12) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.layer_alignment_pairs || []).forEach((pair, index) => {
    if (!pair.from_point_source || !pair.to_point_source) return;
    const projected = projectPointToSegment(world, pair.from_point_source, pair.to_point_source);
    const projectedScreen = worldToScreen(projected);
    const lineDistance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
    const fromScreen = worldToScreen(pair.from_point_source);
    const toScreen = worldToScreen(pair.to_point_source);
    const endpointDistance = Math.min(
      Math.hypot(fromScreen.x - mouseScreen.x, fromScreen.y - mouseScreen.y),
      Math.hypot(toScreen.x - mouseScreen.x, toScreen.y - mouseScreen.y),
    );
    const distance = Math.min(lineDistance, endpointDistance);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {index, distance};
    }
  });
  return best;
}

function selectLayerAlignPair(world) {
  const hit = nearestLayerAlignPair(world);
  if (!hit) {
    state.selectedLayerAlignIndex = null;
    updateLayerAlignStatus();
    draw();
    return false;
  }
  state.selectedLayerAlignIndex = hit.index;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedId = null;
  updateSelectedInfo();
  updateLayerAlignStatus(`Selected correction pair ${hit.index + 1}.`);
  draw();
  return true;
}

function deleteSelectedLayerAlignPair() {
  if (state.selectedLayerAlignIndex === null) {
    updateLayerAlignStatus("Select a correction pair first.");
    return;
  }
  state.annotations.layer_alignment_pairs = state.annotations.layer_alignment_pairs || [];
  if (state.selectedLayerAlignIndex < 0 || state.selectedLayerAlignIndex >= state.annotations.layer_alignment_pairs.length) {
    state.selectedLayerAlignIndex = null;
    updateLayerAlignStatus("Selected correction pair is missing.");
    draw();
    return;
  }
  const removed = state.annotations.layer_alignment_pairs.splice(state.selectedLayerAlignIndex, 1)[0];
  state.selectedLayerAlignIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerAlignStatus(`Deleted ${removed.label || "correction pair"}.`);
    draw();
  });
}

function deleteAllLayerAlignPairs() {
  state.annotations.layer_alignment_pairs = state.annotations.layer_alignment_pairs || [];
  const removed = state.annotations.layer_alignment_pairs.length;
  state.annotations.layer_alignment_pairs = [];
  state.selectedLayerAlignIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerAlignStatus(`Deleted ${removed} correction pairs.`);
    draw();
  });
}

function undoLastLayerAlignPair() {
  state.annotations.layer_alignment_pairs = state.annotations.layer_alignment_pairs || [];
  const removed = state.annotations.layer_alignment_pairs.pop();
  if (!removed) {
    updateLayerAlignStatus("No alignment pair to undo.");
    return;
  }
  state.selectedLayerAlignIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerAlignStatus(`Removed ${removed.from_layer}->${removed.to_layer}.`);
    draw();
  });
}

function updateLocalAxisStatus(message = null) {
  const count = Object.keys(state.annotations.polygon_axis_corrections || {}).length;
  if (!state.localAxis.active) {
    localAxisStatus.textContent = [
      message,
      `saved: ${count}`,
      state.selectedId ? `selected: ${state.selectedId}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const next = !state.localAxis.polygonId
    ? "Click origin point inside a polygon"
    : state.localAxis.points.length === 1
      ? "Click X-axis point"
      : state.localAxis.points.length === 2
        ? "Click Y-axis point"
        : "Axis ready";
  localAxisStatus.textContent = [
    message,
    `polygon: ${state.localAxis.polygonId || "-"}`,
    `points: ${state.localAxis.points.length}/3`,
    next,
  ].filter(Boolean).join("\n");
}

function startLocalAxisCorrection() {
  if (!canEdit()) return;
  state.tool = "localAxis";
  state.localAxis = {
    active: true,
    polygonId: null,
    points: [],
  };
  updateLocalAxisStatus();
  draw();
}

function resetLocalAxisCorrection() {
  state.tool = "select";
  state.localAxis = {
    active: false,
    polygonId: null,
    points: [],
  };
  updateLocalAxisStatus();
  draw();
}

function addLocalAxisPoint(world, poly) {
  if (!state.localAxis.active) return;
  const targetPoly = state.localAxis.polygonId
    ? allPolygons().find((item) => item.polygon_id === state.localAxis.polygonId)
    : poly;
  const snap = nearestConnectionVertex(world, targetPoly || poly, 16);
  const clickedPoly = snap?.poly || poly;
  if (!clickedPoly) {
    updateLocalAxisStatus("Click inside a polygon.");
    return;
  }
  if (!state.localAxis.polygonId) {
    state.localAxis.polygonId = clickedPoly.polygon_id;
  } else if (clickedPoly.polygon_id !== state.localAxis.polygonId) {
    updateLocalAxisStatus(`Keep all 3 points on ${state.localAxis.polygonId}.`);
    return;
  }
  const point = snap && snap.polygonId === state.localAxis.polygonId
    ? snap.point
    : [world.x, world.y];
  state.localAxis.points.push([Number(point[0].toFixed(2)), Number(point[1].toFixed(2))]);
  if (state.localAxis.points.length < 3) {
    updateLocalAxisStatus(snap ? `Snapped vertex ${snap.index}.` : null);
    draw();
    return;
  }
  const [origin, xAxisPoint, yAxisPoint] = state.localAxis.points;
  state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
  state.annotations.polygon_axis_corrections[state.localAxis.polygonId] = {
    type: "orthogonal_3point",
    origin,
    x_axis_point: xAxisPoint,
    y_axis_point: yAxisPoint,
    target_angle_degrees: 90,
  };
  const polygonId = state.localAxis.polygonId;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetLocalAxisCorrection();
    updateLocalAxisStatus(`Saved local axis for ${polygonId}.`);
  });
}

function deleteSelectedLocalAxisCorrection() {
  if (!state.selectedId) {
    updateLocalAxisStatus("Select a polygon first.");
    return;
  }
  state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
  if (!state.annotations.polygon_axis_corrections[state.selectedId]) {
    updateLocalAxisStatus(`No local axis on ${state.selectedId}.`);
    return;
  }
  delete state.annotations.polygon_axis_corrections[state.selectedId];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalAxisStatus(`Deleted local axis for ${state.selectedId}.`);
    draw();
  });
}

function deleteAllLocalAxisCorrections() {
  const count = Object.keys(state.annotations.polygon_axis_corrections || {}).length;
  state.annotations.polygon_axis_corrections = {};
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalAxisStatus(`Deleted ${count} local axes.`);
    draw();
  });
}

function undoLastLocalAxisCorrection() {
  state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
  const ids = Object.keys(state.annotations.polygon_axis_corrections);
  const polygonId = ids[ids.length - 1];
  if (!polygonId) {
    updateLocalAxisStatus("No local axis to undo.");
    return;
  }
  delete state.annotations.polygon_axis_corrections[polygonId];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalAxisStatus(`Removed local axis for ${polygonId}.`);
    draw();
  });
}

function updateScaleCalibrationStatus(message = null) {
  const calibration = state.annotations.scale_calibration;
  if (!state.scaleCalibration.active) {
    scaleStatus.textContent = [
      message,
      calibration?.real_length ? `saved: ${calibration.real_length} ${calibration.unit || ""}`.trim() : "saved: -",
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  scaleStatus.textContent = [
    message,
    "mode: scale calibration",
    `points: ${state.scaleCalibration.points.length}/2`,
    `real length: ${scaleLengthInput.value || "-"}`,
    state.scaleCalibration.points.length < 2 ? "Click two endpoints of a known length" : "Ready to apply",
  ].filter(Boolean).join("\n");
}

function startScaleCalibration() {
  if (!canEdit()) return;
  state.tool = "scaleCalibration";
  state.scaleCalibration = {
    active: true,
    points: [],
  };
  updateScaleCalibrationStatus();
  draw();
}

function resetScaleCalibration() {
  state.tool = "select";
  state.scaleCalibration = {
    active: false,
    points: [],
  };
  updateScaleCalibrationStatus();
  draw();
}

function addScaleCalibrationPoint(world) {
  if (!state.scaleCalibration.active || state.scaleCalibration.points.length >= 2) return;
  state.scaleCalibration.points.push([Number(world.x.toFixed(2)), Number(world.y.toFixed(2))]);
  updateScaleCalibrationStatus();
  draw();
}

function undoScaleCalibrationPoint() {
  if (!state.scaleCalibration.active || state.scaleCalibration.points.length === 0) return;
  state.scaleCalibration.points.pop();
  updateScaleCalibrationStatus();
  draw();
}

function applyScaleCalibration() {
  if (!state.scaleCalibration.active || state.scaleCalibration.points.length !== 2) {
    updateScaleCalibrationStatus("Need two points first.");
    return;
  }
  const realLength = Number(scaleLengthInput.value);
  if (!Number.isFinite(realLength) || realLength <= 0) {
    updateScaleCalibrationStatus("Enter a positive real length.");
    return;
  }
  state.annotations.scale_calibration = {
    mode: "line_length",
    points_source: state.scaleCalibration.points,
    real_length: realLength,
    unit: "m",
  };
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetScaleCalibration();
    updateScaleCalibrationStatus("Scale calibration saved.");
  });
}

function clearScaleCalibration() {
  state.annotations.scale_calibration = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateScaleCalibrationStatus("Scale calibration cleared.");
    draw();
  });
}

function selectedConnectionType() {
  return connectionTypeInput?.value || "stair";
}

function stairConnectionId(conn, fallbackIndex = 0) {
  return conn.connection_id || conn.label || `connection_${fallbackIndex + 1}`;
}

function selectedStairConnectionIds() {
  const ids = new Set(state.selectedStairIds || []);
  if (state.selectedStairId) ids.add(state.selectedStairId);
  return Array.from(ids);
}

function midpoint(a, b) {
  return [
    (Number(a[0]) + Number(b[0])) / 2,
    (Number(a[1]) + Number(b[1])) / 2,
  ];
}

function validLinePoints(points) {
  return Array.isArray(points) && points.length === 2 && points.every((point) => Array.isArray(point) && point.length >= 2);
}

function connectionLinePoints(connection, side) {
  const key = side === "from" ? "from_points_source" : "to_points_source";
  return validLinePoints(connection[key]) ? connection[key] : null;
}

function parallelLineThroughCenter(referenceLine, centerPoint) {
  const dx = Number(referenceLine[1][0]) - Number(referenceLine[0][0]);
  const dy = Number(referenceLine[1][1]) - Number(referenceLine[0][1]);
  return [
    [
      Number((Number(centerPoint[0]) - dx / 2).toFixed(2)),
      Number((Number(centerPoint[1]) - dy / 2).toFixed(2)),
    ],
    [
      Number((Number(centerPoint[0]) + dx / 2).toFixed(2)),
      Number((Number(centerPoint[1]) + dy / 2).toFixed(2)),
    ],
  ];
}

function nextTypedConnectionId(type) {
  const prefix = type || "stair";
  const numbers = (state.annotations.manual_connections || [])
    .filter((conn) => conn.type === prefix)
    .map((conn) => {
      const match = String(conn.connection_id || "").match(new RegExp(`^${prefix}_(\\d+)$`));
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}_${String(next).padStart(3, "0")}`;
}

function updateStairStatus(message = null) {
  const stairCount = (state.annotations.manual_connections || []).filter((conn) => conn.type === "stair").length;
  const escalatorCount = (state.annotations.manual_connections || []).filter((conn) => conn.type === "escalator").length;
  const currentType = state.stair.active ? state.stair.connectionType : selectedConnectionType();
  const selectedIds = selectedStairConnectionIds();
  if (!state.stair.active) {
    stairStatus.textContent = [
      message,
      `stairs: ${stairCount}`,
      `escalators: ${escalatorCount}`,
      selectedIds.length ? `selected ${selectedIds.length}: ${selectedIds.join(", ")}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const fromCount = (state.stair.fromPoints || []).length;
  const toCount = (state.stair.toPoints || []).length;
  const next = fromCount < 2
    ? `Click ${currentType} start line point ${fromCount + 1}/2`
    : `Click ${currentType} end center point`;
  stairStatus.textContent = [
    message,
    `mode: ${currentType} connection`,
    "schema: start line + end center",
    `start line: ${fromCount}/2`,
    `end line: ${toCount ? "auto" : "-"}`,
    `from: ${state.stair.fromLayer || "-"} (${state.stair.fromPolygonId || "-"})`,
    `to: ${state.stair.toLayer || "-"} (${state.stair.toPolygonId || "-"})`,
    `label: ${state.stair.label || "auto"}`,
    `stairs: ${stairCount}`,
    `escalators: ${escalatorCount}`,
    next,
  ].filter(Boolean).join("\n");
}

function startStairConnection() {
  if (!canEdit()) return;
  state.tool = "stair";
  state.stair = {
    active: true,
    label: stairLabelInput.value.trim(),
    connectionType: selectedConnectionType(),
    fromPoints: [],
    toPoints: [],
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverVertex: null,
  };
  updateStairStatus();
  draw();
}

function resetStairConnection() {
  state.tool = "select";
  state.stair = {
    active: false,
    label: stairLabelInput.value.trim(),
    connectionType: selectedConnectionType(),
    fromPoints: [],
    toPoints: [],
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverVertex: null,
  };
  updateStairStatus();
  draw();
}

function addStairPoint(world, poly) {
  if (!state.stair.active) return;
  const snap = nearestConnectionVertex(world, poly, 14);
  if (snap) {
    poly = snap.poly;
  }
  if (!poly) {
    updateStairStatus("Click inside a polygon.");
    return;
  }
  const layer = polygonLayerValue(poly);
  if (!layer) {
    updateStairStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  const rawPoint = snap ? snap.point : [world.x, world.y];
  const point = [Number(rawPoint[0].toFixed(2)), Number(rawPoint[1].toFixed(2))];
  state.stair.fromPoints = state.stair.fromPoints || [];
  state.stair.toPoints = state.stair.toPoints || [];
  if (state.stair.fromPoints.length < 2) {
    state.stair.fromPoints.push(point);
    state.stair.fromPoint = state.stair.fromPoints.length === 2
      ? midpoint(state.stair.fromPoints[0], state.stair.fromPoints[1])
      : point;
    state.stair.fromLayer = layer;
    state.stair.fromPolygonId = poly.polygon_id;
    updateStairStatus();
    draw();
    return;
  }
  const connectionType = state.stair.connectionType || selectedConnectionType();
  const connectionId = nextTypedConnectionId(connectionType);
  state.stair.toLayer = layer;
  state.stair.toPolygonId = poly.polygon_id;
  state.stair.toPoint = point;
  state.stair.toPoints = parallelLineThroughCenter(state.stair.fromPoints, point);
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  state.annotations.manual_connections.push({
    connection_id: connectionId,
    type: connectionType,
    asset_type: connectionType,
    connection_schema: "start_line_end_center_v3",
    label: state.stair.label || connectionId,
    from_polygon_id: state.stair.fromPolygonId,
    to_polygon_id: state.stair.toPolygonId,
    from_layer: state.stair.fromLayer,
    to_layer: state.stair.toLayer,
    from_point_source: state.stair.fromPoint,
    to_point_source: state.stair.toPoint,
    from_points_source: state.stair.fromPoints,
    to_points_source: state.stair.toPoints,
    to_point_mode: "center_generated_parallel_line",
    bidirectional: true,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetStairConnection();
    updateStairStatus(`${connectionId} saved.`);
  });
}

function nearestStairConnection(world, maxScreenDistance = 12) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_connections || []).forEach((conn, index) => {
    if (!["stair", "escalator"].includes(conn.type) || !conn.from_point_source || !conn.to_point_source) return;
    const projected = projectPointToSegment(world, conn.from_point_source, conn.to_point_source);
    const projectedScreen = worldToScreen(projected);
    const lineDistance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
    const fromScreen = worldToScreen(conn.from_point_source);
    const toScreen = worldToScreen(conn.to_point_source);
    const endpointDistance = Math.min(
      Math.hypot(fromScreen.x - mouseScreen.x, fromScreen.y - mouseScreen.y),
      Math.hypot(toScreen.x - mouseScreen.x, toScreen.y - mouseScreen.y),
    );
    const distance = Math.min(lineDistance, endpointDistance);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {
        index,
        connectionId: conn.connection_id || conn.label || `stair_${index + 1}`,
        distance,
      };
    }
  });
  return best;
}

function selectStairConnection(world, event = null) {
  const hit = nearestStairConnection(world);
  if (!hit) {
    state.selectedStairId = null;
    if (!event?.ctrlKey && !event?.metaKey) state.selectedStairIds = [];
    updateStairStatus();
    draw();
    return false;
  }
  if (event?.ctrlKey || event?.metaKey) {
    const selected = new Set(state.selectedStairIds || []);
    if (selected.has(hit.connectionId)) selected.delete(hit.connectionId);
    else selected.add(hit.connectionId);
    state.selectedStairIds = Array.from(selected);
    state.selectedStairId = state.selectedStairIds[state.selectedStairIds.length - 1] || null;
  } else {
    state.selectedStairId = hit.connectionId;
    state.selectedStairIds = [hit.connectionId];
  }
  state.selectedId = null;
  updateSelectedInfo();
  updateStairStatus(`Selected ${selectedStairConnectionIds().length} connection(s).`);
  draw();
  return true;
}

function deleteSelectedStairConnection() {
  const selectedIds = selectedStairConnectionIds();
  if (!selectedIds.length) {
    updateStairStatus("Select a stair connection first.");
    return;
  }
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  const selected = new Set(selectedIds);
  const before = state.annotations.manual_connections.length;
  state.annotations.manual_connections = state.annotations.manual_connections.filter(
    (conn, index) => !["stair", "escalator"].includes(conn.type) || !selected.has(stairConnectionId(conn, index)),
  );
  const removedCount = before - state.annotations.manual_connections.length;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateStairStatus(`Deleted ${removedCount} connection(s).`);
    draw();
  });
}

function setSelectedStairConnectionType() {
  const selectedIds = selectedStairConnectionIds();
  if (!selectedIds.length) {
    updateStairStatus("Select stair/escalator connections first.");
    return;
  }
  const targetType = selectedConnectionType();
  if (!["stair", "escalator"].includes(targetType)) {
    updateStairStatus("Target type must be stair or escalator.");
    return;
  }
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  const selected = new Set(selectedIds);
  let changed = 0;
  const updatedSelection = [];
  for (const [index, conn] of state.annotations.manual_connections.entries()) {
    if (!["stair", "escalator"].includes(conn.type)) continue;
    const oldId = stairConnectionId(conn, index);
    if (!selected.has(oldId)) continue;
    const oldType = conn.type;
    const nextId = oldType === targetType ? oldId : nextTypedConnectionId(targetType);
    conn.type = targetType;
    conn.asset_type = targetType;
    conn.blend = targetType === "escalator" ? "Escalator.blend" : "Stair.blend";
    conn.connection_id = nextId;
    if (!conn.label || conn.label === oldId) conn.label = nextId;
    updatedSelection.push(nextId);
    changed += 1;
  }
  state.selectedStairIds = updatedSelection;
  state.selectedStairId = updatedSelection[updatedSelection.length - 1] || null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateStairStatus(`Changed ${changed} connection(s) to ${targetType}.`);
    draw();
  });
}

function deleteAllStairConnections() {
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  const before = state.annotations.manual_connections.length;
  state.annotations.manual_connections = state.annotations.manual_connections.filter((conn) => !["stair", "escalator"].includes(conn.type));
  const removed = before - state.annotations.manual_connections.length;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateStairStatus(`Deleted ${removed} vertical connections.`);
    draw();
  });
}

function undoLastStairConnection() {
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  for (let index = state.annotations.manual_connections.length - 1; index >= 0; index -= 1) {
    if (!["stair", "escalator"].includes(state.annotations.manual_connections[index].type)) continue;
    const removed = state.annotations.manual_connections.splice(index, 1)[0];
    saveAnnotations().then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
      updateStairStatus(`Removed ${removed.connection_id || removed.label}.`);
      draw();
    });
    return;
  }
  updateStairStatus("No stair connection to undo.");
}

function nextManualAssetId(type) {
  const prefix = type || "asset";
  const numbers = (state.annotations.manual_assets || [])
    .filter((asset) => asset.type === prefix)
    .map((asset) => {
      const match = String(asset.asset_id || "").match(new RegExp(`^${prefix}_(\\d+)$`));
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `${prefix}_${String(next).padStart(3, "0")}`;
}

function selectedManualAssetType() {
  return manualAssetTypeInput?.value || "subway";
}

function manualAssetBlend(type) {
  if (type === "moving_walkway") return "MovingWalkway.blend";
  return "Subway.blend";
}

function manualAssetDisplayName(type) {
  if (type === "moving_walkway") return "moving walkway";
  return "subway train";
}

function updateSubwayStatus(message = null) {
  const subwayCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "subway").length;
  const walkwayCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "moving_walkway").length;
  const currentType = state.subway.active ? state.subway.assetType : selectedManualAssetType();
  if (!state.subway.active) {
    subwayStatus.textContent = [
      message,
      `subways: ${subwayCount}`,
      `moving walkways: ${walkwayCount}`,
      state.selectedSubwayId ? `selected: ${state.selectedSubwayId}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  subwayStatus.textContent = [
    message,
    `mode: ${manualAssetDisplayName(currentType)}`,
    `label: ${state.subway.label || "auto"}`,
    `points: ${(state.subway.points || []).length}/2`,
    (state.subway.points || []).length < 1 ? "Click asset start point" : "Click asset end point",
  ].filter(Boolean).join("\n");
}

function startSubwayPlacement() {
  if (!canEdit()) return;
  state.tool = "subway";
  state.subway = {
    active: true,
    label: subwayLabelInput.value.trim(),
    assetType: selectedManualAssetType(),
    points: [],
    polygonId: null,
    layer: null,
  };
  updateSubwayStatus();
  draw();
}

function resetSubwayPlacement() {
  state.tool = "select";
  state.subway = {
    active: false,
    label: subwayLabelInput.value.trim(),
    assetType: selectedManualAssetType(),
    points: [],
    polygonId: null,
    layer: null,
  };
  updateSubwayStatus();
  draw();
}

function addSubwayAsset(world, poly) {
  if (!state.subway.active) return;
  if (!poly) {
    updateSubwayStatus("Click inside a polygon.");
    return;
  }
  const layer = polygonLayerValue(poly);
  if (!layer) {
    updateSubwayStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  state.subway.points = state.subway.points || [];
  if (state.subway.points.length < 1) {
    state.subway.points.push(point);
    state.subway.polygonId = poly.polygon_id;
    state.subway.layer = layer;
    updateSubwayStatus();
    draw();
    return;
  }
  const start = state.subway.points[0];
  const end = point;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const scaleX = Math.hypot(dx, dy);
  if (scaleX <= 0) {
    updateSubwayStatus("Click a different end point.");
    return;
  }
  const rotationZ = Math.atan2(dy, dx) * 180 / Math.PI;
  const center = [
    Number(((start[0] + end[0]) / 2).toFixed(2)),
    Number(((start[1] + end[1]) / 2).toFixed(2)),
  ];
  const assetType = state.subway.assetType || selectedManualAssetType();
  const assetId = nextManualAssetId(assetType);
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  state.annotations.manual_assets.push({
    asset_id: assetId,
    type: assetType,
    blend: manualAssetBlend(assetType),
    label: state.subway.label || assetId,
    polygon_id: state.subway.polygonId,
    layer: state.subway.layer,
    point_source: center,
    start_point_source: start,
    end_point_source: end,
    rotation_z: rotationZ,
    scale: [scaleX, 1.0, 1.0],
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetSubwayPlacement();
    updateSubwayStatus(`${assetId} saved.`);
  });
}

function nearestSubwayAsset(world, maxScreenDistance = 14) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_assets || []).forEach((asset, index) => {
    if (!["subway", "moving_walkway"].includes(asset.type) || !asset.point_source) return;
    const screen = worldToScreen(asset.point_source);
    const distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {index, assetId: asset.asset_id || asset.label || `subway_${index + 1}`, distance};
    }
  });
  return best;
}

function selectSubwayAsset(world) {
  const hit = nearestSubwayAsset(world);
  if (!hit) {
    state.selectedSubwayId = null;
    updateSubwayStatus();
    draw();
    return false;
  }
  state.selectedSubwayId = hit.assetId;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedLayerAlignIndex = null;
  state.selectedId = null;
  updateSelectedInfo();
  updateSubwayStatus(`Selected ${hit.assetId}.`);
  draw();
  return true;
}

function deleteSelectedSubwayAsset() {
  if (!state.selectedSubwayId) {
    updateSubwayStatus("Select a subway first.");
    return;
  }
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  const index = state.annotations.manual_assets.findIndex(
    (asset) => ["subway", "moving_walkway"].includes(asset.type) && (asset.asset_id || asset.label) === state.selectedSubwayId,
  );
  if (index < 0) {
    state.selectedSubwayId = null;
    updateSubwayStatus("Selected subway is missing.");
    draw();
    return;
  }
  const removed = state.annotations.manual_assets.splice(index, 1)[0];
  state.selectedSubwayId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateSubwayStatus(`Deleted ${removed.asset_id || removed.label}.`);
    draw();
  });
}

function deleteAllSubwayAssets() {
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  const before = state.annotations.manual_assets.length;
  state.annotations.manual_assets = state.annotations.manual_assets.filter((asset) => !["subway", "moving_walkway"].includes(asset.type));
  const removed = before - state.annotations.manual_assets.length;
  state.selectedSubwayId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateSubwayStatus(`Deleted ${removed} linear assets.`);
    draw();
  });
}

function undoLastSubwayAsset() {
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  for (let index = state.annotations.manual_assets.length - 1; index >= 0; index -= 1) {
    if (!["subway", "moving_walkway"].includes(state.annotations.manual_assets[index].type)) continue;
    const removed = state.annotations.manual_assets.splice(index, 1)[0];
    state.selectedSubwayId = null;
    saveAnnotations().then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
      updateSubwayStatus(`Removed ${removed.asset_id || removed.label}.`);
      draw();
    });
    return;
  }
  updateSubwayStatus("No linear asset to undo.");
}

function startSimpleKeep() {
  if (!canEdit()) return;
  state.tool = "keep";
  state.keep = {
    active: true,
    polygonId: null,
    selectedVertexIndices: [],
    selectedVertices: [],
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
    selectedVertices: [],
    hoverVertex: null,
  };
  updateKeepStatus();
  draw();
}

function toggleKeepVertex(world, poly) {
  if (!state.keep.active) return;
  const vertex = nearestConnectionVertex(world, poly, 14);
  if (!vertex) {
    updateKeepStatus("Click a visible vertex point.");
    return;
  }
  if (vertex.holeIndex !== null && vertex.holeIndex !== undefined) {
    updateKeepStatus("Hole vertices are not supported for Simple Keep yet.");
    return;
  }

  const selected = new Set((state.keep.selectedVertices || []).map((item) => `${item.polygonId}:${item.index}`));
  const key = `${vertex.polygonId}:${vertex.index}`;
  if (selected.has(key)) {
    updateKeepStatus("Already selected.");
    return;
  }
  state.keep.polygonId = state.keep.polygonId || vertex.polygonId;
  state.selectedId = vertex.polygonId;
  state.keep.selectedVertices = state.keep.selectedVertices || [];
  state.keep.selectedVertices.push({
    polygonId: vertex.polygonId,
    index: vertex.index,
    point: [Number(vertex.point[0].toFixed(2)), Number(vertex.point[1].toFixed(2))],
  });
  state.keep.selectedVertexIndices = state.keep.selectedVertices
    .filter((item) => item.polygonId === state.keep.polygonId)
    .map((item) => item.index);
  updateSelectedInfo();
  updateKeepStatus();
  draw();
}

function applySimpleKeep() {
  if (!canEdit()) return;
  if (!state.keep.active) {
    updateKeepStatus("Start Simple Keep first.");
    return;
  }
  if ((state.keep.selectedVertices || []).length < 3) {
    updateKeepStatus("Choose at least 3 vertices.");
    return;
  }
  fetch("/api/simple_keep_vertices", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      polygon_id: state.keep.polygonId,
      kept_vertex_indices: state.keep.selectedVertexIndices,
      kept_vertices: state.keep.selectedVertices,
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "simple keep failed");

      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.hidden_polygon_ids = state.annotations.hidden_polygon_ids || [];

      state.annotations.manual_edits.push(data.edit_record);
      const hidden = new Set(state.annotations.hidden_polygon_ids || []);
      const sourceIds = data.edit_record.source_polygon_ids || [data.edit_record.source_polygon_id];
      for (const polygonId of sourceIds) {
        if (polygonId) hidden.add(polygonId);
      }
      state.annotations.hidden_polygon_ids = Array.from(hidden);

      if (state.loadedFinalWorkingSet) {
        const sourceIdSet = new Set(sourceIds.filter(Boolean));
        state.polygons = state.polygons.filter((poly) => !sourceIdSet.has(poly.polygon_id));
        state.polygons.push(data.edited_polygon);
        state.manualPolygons = [];
      } else {
        state.annotations.manual_polygons.push(data.edited_polygon);
        state.manualPolygons = state.annotations.manual_polygons;
      }
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

function nearestConnectionVertex(world, preferredPoly = null, maxScreenDistance = 12) {
  const candidates = preferredPoly ? [preferredPoly, ...allPolygons().filter((poly) => poly.polygon_id !== preferredPoly.polygon_id)] : allPolygons();
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  for (const poly of candidates) {
    const visit = (point, index, holeIndex = null) => {
      const screen = worldToScreen(point);
      const distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {poly, polygonId: poly.polygon_id, holeIndex, index, point, distance};
      }
    };
    (poly.points_source || []).forEach((point, index) => visit(point, index, null));
    (poly.holes_source || []).forEach((hole, holeIndex) => {
      (hole || []).forEach((point, index) => visit(point, index, holeIndex));
    });
  }
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
  state.annotations.polygon_z_offsets = {};
  state.annotations.polygon_z_values = {};
  state.annotations.manual_polygons = [];
  state.annotations.manual_edits = [];
  state.annotations.manual_merges = [];
  state.annotations.manual_connections = [];
  state.annotations.manual_walls = [];
  state.annotations.manual_assets = [];
  state.annotations.layer_alignment_pairs = [];
  state.annotations.polygon_axis_corrections = {};
  state.annotations.scale_calibration = null;
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
  resetSplitPolygon();
  resetStairConnection();
  resetSubwayPlacement();
  resetLayerAlign();
  resetLocalAxisCorrection();
  resetScaleCalibration();
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
      state.icons = project.icons?.icons || [];
      state.annotations = project.annotations || state.annotations;
      state.annotations.manual_connections = state.annotations.manual_connections || [];
      state.annotations.manual_assets = state.annotations.manual_assets || [];
      state.annotations.scale_calibration = state.annotations.scale_calibration || null;
      state.annotations.polygon_z_offsets = state.annotations.polygon_z_offsets || {};
      state.annotations.polygon_z_values = state.annotations.polygon_z_values || {};
      state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
      state.manualPolygons = state.annotations.manual_polygons || [];
      const image = new Image();
      image.onload = () => {
        state.image = image;
        statusEl.textContent = `${state.polygons.length} polygons, ${state.icons.length} icons`;
        fitView();
      };
      image.src = `${project.image.url}?t=${Date.now()}`;
    })
    .catch((error) => {
      statusEl.textContent = String(error);
    });
}

function refreshImages() {
  return fetch("/api/images")
    .then((response) => response.json())
    .then((data) => {
      imageSelect.innerHTML = "";
      for (const image of data.images || []) {
        const option = document.createElement("option");
        option.value = image.path;
        const status = image.status || {};
        const flags = [
          status.marker ? "M" : "-",
          status.extracted ? "P" : "-",
          status.final ? "F" : "-",
        ].join("");
        option.textContent = `${image.relative_path} [${flags}]`;
        if (image.active) option.selected = true;
        imageSelect.appendChild(option);
      }
      pipelineStatus.textContent = `images: ${(data.images || []).length}`;
      return data;
    });
}

function resetProjectWorkingState(message) {
  state.polygons = [];
  state.manualPolygons = [];
  state.annotations = {
    polygon_layers: {},
    polygon_z_offsets: {},
    polygon_z_values: {},
    hidden_polygon_ids: [],
    manual_polygons: [],
    manual_edits: [],
    manual_merges: [],
    manual_connections: [],
    manual_walls: [],
    manual_assets: [],
    layer_alignment_pairs: [],
    polygon_axis_corrections: {},
    scale_calibration: null,
  };
  state.marker.points = [];
  state.crop = {active: false, start: null, current: null, rect: null};
  state.loadedFinalWorkingSet = false;
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedStairId = null;
  state.selectedStairIds = [];
  pipelineStatus.textContent = message;
  updateScaleCalibrationStatus();
  updateLocalAxisStatus();
}

function loadSelectedImage() {
  const imagePath = imageSelect.value;
  if (!imagePath) return;
  fetch("/api/project/select", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({image_path: imagePath}),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to select image");
      resetProjectWorkingState(`selected: ${data.image}\noutput: ${data.output_dir}`);
      loadProject();
      refreshImages();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function uploadImageFile() {
  const file = uploadImageInput.files?.[0];
  if (!file) {
    pipelineStatus.textContent = "select an image file first.";
    return;
  }
  const formData = new FormData();
  formData.append("image", file);
  pipelineStatus.textContent = `uploading: ${file.name}`;
  fetch("/api/project/upload", {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to upload image");
      uploadImageInput.value = "";
      resetProjectWorkingState(`uploaded: ${data.image}\noutput: ${data.output_dir}`);
      loadProject();
      refreshImages();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function startCrop() {
  state.tool = "crop";
  state.crop = {
    active: true,
    start: null,
    current: null,
    rect: null,
  };
  pipelineStatus.textContent = "crop: drag a rectangle on the image";
  draw();
}

function resetCrop() {
  if (state.tool === "crop") state.tool = "select";
  state.crop = {
    active: false,
    start: null,
    current: null,
    rect: null,
  };
  pipelineStatus.textContent = "crop reset";
  draw();
}

function applyCrop() {
  const rect = normalizedCropRect();
  if (!rect || rect.width < 10 || rect.height < 10) {
    pipelineStatus.textContent = "crop: drag a larger rectangle first";
    return;
  }
  pipelineStatus.textContent = "cropping image...";
  fetch("/api/image/crop", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "crop failed");
      resetCrop();
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      loadProject();
      refreshImages();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function startManualMarker() {
  state.tool = "marker";
  state.marker = {
    active: true,
    points: [],
  };
  pipelineStatus.textContent = "manual marker: click 4 transform points";
  draw();
}

function addManualMarkerPoint(world) {
  if (!state.marker.active) return;
  if (state.marker.points.length >= 4) return;
  state.marker.points.push([Number(world.x.toFixed(2)), Number(world.y.toFixed(2))]);
  pipelineStatus.textContent = `manual marker: ${state.marker.points.length}/4`;
  if (state.marker.points.length === 4) {
    pipelineStatus.textContent = "manual marker ready: Save Marker";
  }
  draw();
}

function undoManualMarkerPoint() {
  if (state.marker.points.length > 0) {
    state.marker.points.pop();
    pipelineStatus.textContent = `manual marker: ${state.marker.points.length}/4`;
    draw();
  }
}

function saveManualMarker() {
  fetch("/api/marker/manual", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({points: state.marker.points}),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to save marker");
      state.marker.active = false;
      state.tool = "select";
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      refreshImages();
      draw();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function prepareMarkerImageFromUi() {
  pipelineStatus.textContent = "preparing marker-filled image...";
  fetch("/api/pipeline/marker-image", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      marker_color: "magenta",
      marker_radius: 10,
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "marker image failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function runKmeansFromUi() {
  const options = {
    kmeans_k: pipelineKInput.value,
  };
  pipelineStatus.textContent = "k-means running...";
  fetch("/api/pipeline/kmeans", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(options),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "k-means failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      refreshImages();
      loadClusters();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function detectIconsFromUi() {
  const options = {
    threshold: iconThresholdInput.value,
    include_flipped: true,
    use_edges: false,
  };
  pipelineStatus.textContent = "icon detection running...";
  fetch("/api/pipeline/icons", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(options),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "icon detection failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      loadProject();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function prepareIconImageFromUi() {
  const options = {
    padding: 0,
    dilate_kernel: 5,
    radius: 5,
    method: "directional",
    roi_padding: 15,
    min_score: iconThresholdInput.value,
  };
  pipelineStatus.textContent = "preparing icon-filled image...";
  fetch("/api/pipeline/icon-image", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(options),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "icon image failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function extractPolygonsFromUi() {
  const options = {
    kmeans_k: pipelineKInput.value,
    include_clusters: pipelineClustersInput.value.trim(),
    min_area: pipelineMinAreaInput.value,
    epsilon_ratio: pipelineEpsilonInput.value,
    bridge_clusters: pipelineBridgeClustersInput.value.trim(),
    run_grouping: pipelineGroupingToggle.checked,
    refresh_markers: false,
  };
  pipelineStatus.textContent = "polygon extraction running...";
  fetch("/api/pipeline/polygons", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(options),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "polygon extraction failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      loadProject();
      refreshImages();
      loadClusters();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function runPipelineFromUi() {
  const options = {
    mode: "kmeans",
    kmeans_k: pipelineKInput.value,
    include_clusters: pipelineClustersInput.value.trim(),
    min_area: pipelineMinAreaInput.value,
    epsilon_ratio: pipelineEpsilonInput.value,
    bridge_clusters: pipelineBridgeClustersInput.value.trim(),
    run_grouping: pipelineGroupingToggle.checked,
    refresh_markers: false,
  };
  pipelineStatus.textContent = "pipeline running...";
  fetch("/api/pipeline/run", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(options),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "pipeline failed");
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      loadProject();
      refreshImages();
      loadClusters();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function applyLayerAssignments(polygonLayers) {
  state.annotations.polygon_layers = state.annotations.polygon_layers || {};
  for (const [polygonId, layer] of Object.entries(polygonLayers || {})) {
    state.annotations.polygon_layers[polygonId] = layer;
    const poly = [...state.polygons, ...state.manualPolygons].find((item) => item.polygon_id === polygonId);
    if (poly) {
      poly.semantic = poly.semantic || {};
      poly.semantic.layer = layer || null;
    }
  }
  updateSelectedInfo();
  draw();
}

function runEditedGroupingFromUi() {
  const options = {
    working_polygons: workingPolygonsPayload(),
    target_layers: groupingLayerCountInput.value,
    min_contact_area: groupingMinContactAreaInput.value,
    target_group_strategy: "centroid_y",
  };
  groupingStatus.textContent = "grouping edited polygons...";
  saveAnnotations()
    .then(() => fetch("/api/grouping/edited", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(options),
    }))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "grouping failed");
      applyLayerAssignments(data.polygon_layers || {});
      groupingStatus.textContent = [
        `groups: ${data.group_count}`,
        `edges: ${data.edge_count}`,
        `output: ${data.output}`,
        `debug: ${data.debug_image}`,
      ].join("\n");
      saveResult.textContent = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      groupingStatus.textContent = String(error);
    });
}

function loadClusters() {
  fetch("/api/clusters")
    .then((response) => response.json())
    .then((data) => {
      clusterList.innerHTML = "";
      for (const cluster of data.clusters || []) {
        const item = document.createElement("div");
        item.className = "cluster-item";
        const title = document.createElement("div");
        title.textContent = `cluster ${cluster.id} pixels=${cluster.pixel_count} selected=${cluster.selected}`;
        item.appendChild(title);
        const imageUrl = cluster.selected_polygon_url || cluster.mask_url;
        if (imageUrl) {
          const img = document.createElement("img");
          img.src = imageUrl;
          img.alt = `cluster ${cluster.id}`;
          item.appendChild(img);
        }
        item.addEventListener("click", () => {
          const selected = new Set(
            pipelineClustersInput.value
              .split(",")
              .map((value) => value.trim())
              .filter(Boolean),
          );
          const id = String(cluster.id);
          if (selected.has(id)) selected.delete(id);
          else selected.add(id);
          pipelineClustersInput.value = Array.from(selected)
            .map(Number)
            .sort((a, b) => a - b)
            .join(",");
        });
        clusterList.appendChild(item);
      }
      pipelineStatus.textContent = `clusters: ${(data.clusters || []).length}`;
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
    resetStairConnection();
    resetSubwayPlacement();
    resetLayerAlign();
    resetScaleCalibration();
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

function applyExportedFinalPayload(data, sourceLabel = null) {
  const polygons = data.polygons || [];
  state.polygons = polygons;
  state.icons = data.icons || state.icons || [];
  state.manualPolygons = [];
  state.previewFinal = false;
  state.exportedFinalPolygons = null;
  state.loadedFinalWorkingSet = true;
  state.annotations = {
    polygon_layers: {},
    polygon_z_offsets: state.annotations.polygon_z_offsets || {},
    polygon_z_values: state.annotations.polygon_z_values || {},
    hidden_polygon_ids: [],
    manual_polygons: [],
    manual_edits: [],
    manual_merges: [],
    manual_connections: data.connections || [],
    manual_walls: data.walls || [],
    manual_assets: state.annotations.manual_assets || [],
    layer_alignment_pairs: state.annotations.layer_alignment_pairs || [],
    polygon_axis_corrections: state.annotations.polygon_axis_corrections || {},
    scale_calibration: state.annotations.scale_calibration || null,
  };
  state.tool = "select";
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedStairId = null;
  state.selectedStairIds = [];
  resetMerge();
  resetAutoMerge();
  resetStraighten();
  resetMoveVertex();
  resetInsertVertex();
  resetSimpleKeep();
  resetAddPolygon();
  resetCutHole();
  resetSplitPolygon();
  resetStairConnection();
  resetSubwayPlacement();
  resetLayerAlign();
  resetLocalAxisCorrection();
  resetScaleCalibration();
  resetSharedEdge();
  updateSelectedInfo();
  statusEl.textContent = `Working Set: ${state.polygons.length} exported polygons`;
  document.getElementById("previewFinalBtn").textContent = "Preview Final";
  saveResult.textContent = JSON.stringify({
    loaded: true,
    source: sourceLabel || data.source,
    working_set: true,
    polygon_count: state.polygons.length,
    wall_count: (data.walls || []).length,
  }, null, 2);
  draw();
}

function loadExportedFinal() {
  fetch("/api/export/final_file")
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to load exported final");
      applyExportedFinalPayload(data);
    })
    .catch((error) => {
      saveResult.textContent = String(error);
    });
}

function loadExportedFinalFromFile(file) {
  if (!file) return;
  file.text()
    .then((text) => JSON.parse(text))
    .then((data) => {
      applyExportedFinalPayload(data, file.name);
    })
    .catch((error) => {
      saveResult.textContent = `failed to load selected final json: ${error}`;
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
  if (state.tool === "crop" && state.crop.active) {
    state.crop.start = world;
    state.crop.current = world;
    state.crop.rect = null;
    pipelineStatus.textContent = "crop: dragging...";
    draw();
    return;
  }
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
  if (state.tool === "crop" && state.crop.active && state.crop.start) {
    state.crop.current = world;
    draw();
    return;
  }
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
    const activePoly = findPolygonAt(world);
    const nextVertex = nearestConnectionVertex(world, activePoly, 14);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.keep.hoverVertex);
    if (changed) {
      state.keep.hoverVertex = nextVertex;
      draw();
    }
    return;
  }
  if (state.tool === "splitPolygon" && state.splitPolygon.active) {
    const activePoly = splitPolygonTarget() || findPolygonAt(world);
    const nextVertex = nearestVertexForPolygon(activePoly, world, 16);
    const changed = JSON.stringify(nextVertex) !== JSON.stringify(state.splitPolygon.hoverVertex);
    if (changed) {
      state.splitPolygon.hoverVertex = nextVertex;
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
  if (state.tool === "layerAlign" && state.layerAlign.active && state.layerAlign.fromPoint && !state.layerAlign.toPoint) {
    const nextPoint = verticalLayerAlignPoint(world);
    const changed = JSON.stringify(nextPoint) !== JSON.stringify(state.layerAlign.hoverPoint);
    if (changed) {
      state.layerAlign.hoverPoint = nextPoint;
      draw();
    }
    return;
  }
  if (state.tool === "stair" && state.stair.active) {
    const hover = nearestConnectionVertex(world, findPolygonAt(world), 14);
    const nextHover = hover ? {
      polygonId: hover.polygonId,
      holeIndex: hover.holeIndex,
      index: hover.index,
      point: hover.point,
    } : null;
    const changed = JSON.stringify(nextHover) !== JSON.stringify(state.stair.hoverVertex);
    if (changed) {
      state.stair.hoverVertex = nextHover;
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
  if (state.tool === "crop" && state.crop.active && state.crop.start) {
    const rect = normalizedCropRect();
    state.crop.rect = rect;
    state.crop.start = null;
    state.crop.current = null;
    pipelineStatus.textContent = rect && rect.width >= 10 && rect.height >= 10
      ? `crop ready: ${Math.round(rect.width)} x ${Math.round(rect.height)}. Apply Crop to create a new image.`
      : "crop: selected area is too small";
    draw();
    return;
  }
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
  if (state.tool === "crop") return;
  if (state.tool === "marker") {
    addManualMarkerPoint(world);
    return;
  }
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
  if (state.tool === "splitPolygon") {
    addSplitPolygonPoint(world, poly);
    return;
  }
  if (state.tool === "layerAlign") {
    addLayerAlignPoint(world, poly);
    return;
  }
  if (state.tool === "localAxis") {
    addLocalAxisPoint(world, poly);
    return;
  }
  if (state.tool === "scaleCalibration") {
    addScaleCalibrationPoint(world);
    return;
  }
  if (state.tool === "subway") {
    addSubwayAsset(world, poly);
    return;
  }
  if (state.tool === "stair") {
    addStairPoint(world, poly);
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
  if (selectLayerAlignPair(world)) return;
  if (selectSubwayAsset(world)) return;
  if (selectStairConnection(world, event)) return;
  if (event.ctrlKey || event.metaKey) {
    toggleMultiSelectedPolygon(poly);
    return;
  }
  clearMultiSelection();
  state.selectedId = poly?.polygon_id || null;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedSubwayId = null;
  state.selectedLayerAlignIndex = null;
  updateSelectedInfo();
  updateLayerAlignStatus();
  updateSubwayStatus();
  updateStairStatus();
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
showIconsToggle.addEventListener("change", (event) => {
  state.showIcons = event.target.checked;
  draw();
});
showCorrectionsToggle.addEventListener("change", (event) => {
  state.showCorrections = event.target.checked;
  draw();
});
document.getElementById("showMarkersToggle").addEventListener("change", (event) => {
  state.showMarkers = event.target.checked;
  draw();
});
document.getElementById("showHiddenToggle").addEventListener("change", (event) => {
  state.showHidden = event.target.checked;
  draw();
});
document.getElementById("setLayerBtn").addEventListener("click", () => {
  const polygonIds = selectedLayerPolygonIds();
  if (!polygonIds.length) return;
  state.annotations.polygon_layers = state.annotations.polygon_layers || {};
  const layer = layerInput.value.trim();
  for (const polygonId of polygonIds) {
    state.annotations.polygon_layers[polygonId] = layer;
    const poly = [...state.polygons, ...state.manualPolygons].find((item) => item.polygon_id === polygonId);
    if (!poly) continue;
    poly.semantic = poly.semantic || {};
    poly.semantic.layer = layer || null;
  }
  updateSelectedInfo();
  draw();
});
document.getElementById("clearLayerSelectionBtn").addEventListener("click", () => {
  clearMultiSelection();
  updateSelectedInfo();
  draw();
});
document.getElementById("setZOverrideBtn").addEventListener("click", () => {
  if (!state.selectedId) return;
  const zOffset = Number(zOverrideInput.value);
  if (!Number.isFinite(zOffset)) {
    delete (state.annotations.polygon_z_offsets || {})[state.selectedId];
  } else {
    state.annotations.polygon_z_offsets = state.annotations.polygon_z_offsets || {};
    state.annotations.polygon_z_offsets[state.selectedId] = zOffset;
  }
  updateSelectedInfo();
  draw();
});
document.getElementById("clearZOverrideBtn").addEventListener("click", () => {
  if (!state.selectedId) return;
  state.annotations.polygon_z_offsets = state.annotations.polygon_z_offsets || {};
  delete state.annotations.polygon_z_offsets[state.selectedId];
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
document.getElementById("startSplitPolygonBtn").addEventListener("click", startSplitPolygon);
document.getElementById("undoSplitPointBtn").addEventListener("click", undoSplitPolygonPoint);
document.getElementById("undoSplitPolygonBtn").addEventListener("click", undoLastSplitPolygon);
document.getElementById("resetSplitPolygonBtn").addEventListener("click", resetSplitPolygon);
document.getElementById("startLayerAlignBtn").addEventListener("click", startLayerAlign);
document.getElementById("deleteLayerAlignBtn").addEventListener("click", deleteSelectedLayerAlignPair);
document.getElementById("deleteAllLayerAlignBtn").addEventListener("click", deleteAllLayerAlignPairs);
document.getElementById("undoLayerAlignBtn").addEventListener("click", undoLastLayerAlignPair);
document.getElementById("resetLayerAlignBtn").addEventListener("click", resetLayerAlign);
document.getElementById("startScaleBtn").addEventListener("click", startScaleCalibration);
document.getElementById("applyScaleBtn").addEventListener("click", applyScaleCalibration);
document.getElementById("clearScaleBtn").addEventListener("click", clearScaleCalibration);
document.getElementById("resetScaleBtn").addEventListener("click", resetScaleCalibration);
document.getElementById("startLocalAxisBtn").addEventListener("click", startLocalAxisCorrection);
document.getElementById("deleteLocalAxisBtn").addEventListener("click", deleteSelectedLocalAxisCorrection);
document.getElementById("deleteAllLocalAxisBtn").addEventListener("click", deleteAllLocalAxisCorrections);
document.getElementById("undoLocalAxisBtn").addEventListener("click", undoLastLocalAxisCorrection);
document.getElementById("resetLocalAxisBtn").addEventListener("click", resetLocalAxisCorrection);
document.getElementById("startStairBtn").addEventListener("click", startStairConnection);
document.getElementById("setConnectionTypeBtn").addEventListener("click", setSelectedStairConnectionType);
document.getElementById("deleteStairBtn").addEventListener("click", deleteSelectedStairConnection);
document.getElementById("deleteAllConnectionsBtn").addEventListener("click", deleteAllStairConnections);
document.getElementById("undoStairBtn").addEventListener("click", undoLastStairConnection);
document.getElementById("resetStairBtn").addEventListener("click", resetStairConnection);
document.getElementById("startSubwayBtn").addEventListener("click", startSubwayPlacement);
document.getElementById("deleteSubwayBtn").addEventListener("click", deleteSelectedSubwayAsset);
document.getElementById("deleteAllSubwayBtn").addEventListener("click", deleteAllSubwayAssets);
document.getElementById("undoSubwayBtn").addEventListener("click", undoLastSubwayAsset);
document.getElementById("resetSubwayBtn").addEventListener("click", resetSubwayPlacement);
document.getElementById("refreshImagesBtn").addEventListener("click", refreshImages);
document.getElementById("loadImageBtn").addEventListener("click", loadSelectedImage);
document.getElementById("uploadImageBtn").addEventListener("click", uploadImageFile);
document.getElementById("startCropBtn").addEventListener("click", startCrop);
document.getElementById("applyCropBtn").addEventListener("click", applyCrop);
document.getElementById("resetCropBtn").addEventListener("click", resetCrop);
document.getElementById("startMarkerBtn").addEventListener("click", startManualMarker);
document.getElementById("undoMarkerBtn").addEventListener("click", undoManualMarkerPoint);
document.getElementById("saveMarkerBtn").addEventListener("click", saveManualMarker);
document.getElementById("prepareMarkerImageBtn").addEventListener("click", prepareMarkerImageFromUi);
document.getElementById("detectIconsBtn").addEventListener("click", detectIconsFromUi);
document.getElementById("prepareIconImageBtn").addEventListener("click", prepareIconImageFromUi);
document.getElementById("runKmeansBtn").addEventListener("click", runKmeansFromUi);
document.getElementById("extractPolygonsBtn").addEventListener("click", extractPolygonsFromUi);
document.getElementById("runPipelineBtn").addEventListener("click", runPipelineFromUi);
document.getElementById("loadClustersBtn").addEventListener("click", loadClusters);
document.getElementById("runEditedGroupingBtn").addEventListener("click", runEditedGroupingFromUi);
document.getElementById("resetAllBtn").addEventListener("click", resetToInitialPolygons);
document.getElementById("saveBtn").addEventListener("click", () => {
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
  });
});
document.getElementById("previewFinalBtn").addEventListener("click", togglePreviewFinal);
document.getElementById("loadExportedFinalBtn").addEventListener("click", loadExportedFinal);
document.getElementById("loadFinalFileInput").addEventListener("change", (event) => {
  loadExportedFinalFromFile(event.target.files?.[0]);
  event.target.value = "";
});
document.getElementById("exportFinalBtn").addEventListener("click", () => {
  saveAnnotations()
    .then(() => fetch("/api/export/final", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        working_polygons: workingPolygonsPayload(),
        render_preview: document.getElementById("renderScenePreviewToggle").checked,
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
        render_preview: document.getElementById("renderScenePreviewToggle").checked,
      }),
    }))
    .then((response) => response.json())
    .then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
    });
});
document.getElementById("exportAssetsBtn").addEventListener("click", () => {
  saveAnnotations()
    .then(() => fetch("/api/export/assets", {
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
  } else if (key === "i") {
    event.preventDefault();
    startScaleCalibration();
  } else if (key === "l") {
    event.preventDefault();
    startLocalAxisCorrection();
  } else if (key === "u") {
    event.preventDefault();
    startStairConnection();
  } else if (key === "o") {
    event.preventDefault();
    startSubwayPlacement();
  } else if (key === "m") {
    event.preventDefault();
    startManualMarker();
  } else if (key === "p") {
    event.preventDefault();
    startCrop();
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
    if (state.selectedSubwayId) deleteSelectedSubwayAsset();
    else if (state.selectedLayerAlignIndex !== null) deleteSelectedLayerAlignPair();
    else if (state.selectedStairId) deleteSelectedStairConnection();
    else deleteSelectedPolygon();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    if (state.tool === "marker") undoManualMarkerPoint();
    else if (state.tool === "cutHole") undoCutHolePoint();
    else if (state.tool === "splitPolygon") undoSplitPolygonPoint();
    else if (state.tool === "scaleCalibration") undoScaleCalibrationPoint();
    else undoAddPolygonPoint();
  } else if (event.key === "Shift") {
    event.preventDefault();
    if (state.tool === "keep") applySimpleKeep();
    else if (state.tool === "addPolygon") applyAddPolygon();
    else if (state.tool === "cutHole") applyCutHole();
    else if (state.tool === "sharedEdge") applySharedEdge();
    else if (state.tool === "autoMerge") applyAutoMerge();
    else if (state.tool === "scaleCalibration") applyScaleCalibration();
    else if (state.tool === "crop") applyCrop();
    else if (state.tool === "merge") applyMerge();
    else if (state.tool === "straighten") applyStraighten();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (state.tool === "keep") resetSimpleKeep();
    else if (state.tool === "addPolygon") resetAddPolygon();
    else if (state.tool === "cutHole") resetCutHole();
    else if (state.tool === "splitPolygon") resetSplitPolygon();
    else if (state.tool === "layerAlign") resetLayerAlign();
    else if (state.tool === "localAxis") resetLocalAxisCorrection();
    else if (state.tool === "subway") resetSubwayPlacement();
    else if (state.tool === "scaleCalibration") resetScaleCalibration();
    else if (state.tool === "marker") {
      state.tool = "select";
      state.marker.active = false;
      draw();
    }
    else if (state.tool === "crop") resetCrop();
    else if (state.tool === "stair") resetStairConnection();
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
refreshImages();
updateMergeStatus();
updateAutoMergeStatus();
updateStraightenStatus();
updateMoveStatus();
updateInsertVertexStatus();
updateDeleteStatus();
updateSharedEdgeStatus();
updateAddPolygonStatus();
updateCutHoleStatus();
updateSplitPolygonStatus();
updateLayerAlignStatus();
updateScaleCalibrationStatus();
updateSubwayStatus();
updateKeepStatus();
loadProject();
