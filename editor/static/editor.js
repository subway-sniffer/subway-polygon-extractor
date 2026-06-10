const state = {
  image: null,
  polygons: [],
  manualPolygons: [],
  connections: [],
  icons: [],
  stationOptions: [],
  annotations: {
    polygon_layers: {},
    polygon_z_offsets: {},
    polygon_z_values: {},
    hidden_polygon_ids: [],
    manual_edits: [],
    manual_merges: [],
    manual_connections: [],
    manual_walls: [],
    manual_zones: [],
    manual_assets: [],
    manual_platforms: [],
    manual_elevator_points: [],
    layer_alignment_pairs: [],
    local_shift_corrections: [],
    polygon_axis_corrections: {},
    scale_calibration: null,
    scene_height: {
      floor_height: 5,
      default_z: 0,
      layer_z: {},
    },
    station_metadata: {},
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
  selectedWallId: null,
  selectedZoneId: null,
  selectedPlatformId: null,
  selectedPlatformIds: [],
  selectedElevatorPointId: null,
  selectedElevatorPointIds: [],
  showIds: false,
  showConnections: false,
  showIcons: false,
  showCorrections: true,
  showMarkers: true,
  showZones: true,
  showPlatforms: false,
  showNavigationNodes: false,
  showHidden: false,
  previewFinal: false,
  exportedFinalPolygons: null,
  loadedFinalWorkingSet: false,
  tool: "select",
  marker: {
    active: false,
    mode: "3point",
    points: [],
    autoPoint: null,
  },
  crop: {
    active: false,
    start: null,
    current: null,
    rect: null,
    previousImagePath: null,
  },
  regionPick: {
    active: false,
    drawing: false,
    strokes: [],
    currentStroke: [],
    brushSize: 34,
    sourcePolygonId: null,
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
  selectedLocalShiftIndex: null,
  localShift: {
    active: false,
    label: "",
    applyToPolygonIds: [],
    movingPoint: null,
    movingPolygonId: null,
    movingLayer: null,
    referencePoint: null,
    referencePolygonId: null,
    referenceLayer: null,
    movingVertexIndex: null,
    movingHoleIndex: null,
  },
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
    nextPolygonId: null,
    pickingPolygon: false,
  },
  wall: {
    active: false,
    label: "",
    height: 1.0,
    points: [],
    layer: null,
    polygonId: null,
    hoverSnap: null,
  },
  zone: {
    active: false,
    zoneType: "paid",
    points: [],
    polygonId: null,
    layer: null,
  },
  subway: {
    active: false,
    label: "",
    assetType: "subway",
    points: [],
    polygonId: null,
    layer: null,
    gateCount: 1,
  },
  platform: {
    active: false,
    mode: "line",
    point: null,
    facingPoint: null,
    lineStart: null,
    lineEnd: null,
    anchors: [],
    quickExitRows: [],
    stationName: "",
    lineId: "",
    direction: "",
    carCount: 10,
    doorsPerCar: 4,
    label: "",
    polygonId: null,
    layer: null,
  },
  elevatorPoint: {
    active: false,
    elevatorId: "",
    label: "",
    isExit: false,
    exitNumber: "",
    point: null,
    facingPoint: null,
    directionVertices: [],
    directionVertexRefs: [],
    hoverVertex: null,
    polygonId: null,
    layer: null,
  },
  elevatorLink: {
    active: false,
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
  route: {
    result: null,
    sourcePoints: [],
  },
  navigationNodes: [],
};

const canvas = document.getElementById("editorCanvas");
const ctx = canvas.getContext("2d");
const statusEl = document.getElementById("status");
const modeBadge = document.getElementById("modeBadge");
const selectionSummary = document.getElementById("selectionSummary");
const sidebarTabs = document.getElementById("sidebarTabs");
const selectedInfo = document.getElementById("selectedInfo");
const layerInput = document.getElementById("layerInput");
const zOverrideInput = document.getElementById("zOverrideInput");
const showIconsToggle = document.getElementById("showIconsToggle");
const showCorrectionsToggle = document.getElementById("showCorrectionsToggle");
const markerModeInput = document.getElementById("markerModeInput");
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
const localShiftStatus = document.getElementById("localShiftStatus");
const localShiftLabelInput = document.getElementById("localShiftLabelInput");
const scaleLengthInput = document.getElementById("scaleLengthInput");
const scaleStatus = document.getElementById("scaleStatus");
const localAxisStatus = document.getElementById("localAxisStatus");
const stairStatus = document.getElementById("stairStatus");
const stairLabelInput = document.getElementById("stairLabelInput");
const connectionTypeInput = document.getElementById("connectionTypeInput");
const exitNumberInput = document.getElementById("exitNumberInput");
const exitLengthInput = document.getElementById("exitLengthInput");
const exitRiseInput = document.getElementById("exitRiseInput");
const wallStatus = document.getElementById("wallStatus");
const wallLabelInput = document.getElementById("wallLabelInput");
const wallHeightInput = document.getElementById("wallHeightInput");
const zoneStatus = document.getElementById("zoneStatus");
const zoneTypeInput = document.getElementById("zoneTypeInput");
const showZonesToggle = document.getElementById("showZonesToggle");
const showPlatformsToggle = document.getElementById("showPlatformsToggle");
const showNavigationNodesToggle = document.getElementById("showNavigationNodesToggle");
const toggleZonesBtn = document.getElementById("toggleZonesBtn");
const layerHeightStatus = document.getElementById("layerHeightStatus");
const floorHeightInput = document.getElementById("floorHeightInput");
const defaultZInput = document.getElementById("defaultZInput");
const layerZInputs = {
  B1: document.getElementById("layerZB1Input"),
  B2: document.getElementById("layerZB2Input"),
  B3: document.getElementById("layerZB3Input"),
  B4: document.getElementById("layerZB4Input"),
};
const subwayStatus = document.getElementById("subwayStatus");
const subwayLabelInput = document.getElementById("subwayLabelInput");
const manualAssetTypeInput = document.getElementById("manualAssetTypeInput");
const gateCountInput = document.getElementById("gateCountInput");
const manualExitNumberInput = document.getElementById("manualExitNumberInput");
const toiletGenderInput = document.getElementById("toiletGenderInput");
const platformStatus = document.getElementById("platformStatus");
const quickExitStatus = document.getElementById("quickExitStatus");
const platformStationInput = document.getElementById("platformStationInput");
const platformStationOptions = document.getElementById("platformStationOptions");
const platformLineInput = document.getElementById("platformLineInput");
const platformDirectionInput = document.getElementById("platformDirectionInput");
const platformCarCountInput = document.getElementById("platformCarCountInput");
const platformDoorsPerCarInput = document.getElementById("platformDoorsPerCarInput");
const platformLabelInput = document.getElementById("platformLabelInput");
const elevatorStatus = document.getElementById("elevatorStatus");
const elevatorIdInput = document.getElementById("elevatorIdInput");
const elevatorLabelInput = document.getElementById("elevatorLabelInput");
const elevatorExitToggle = document.getElementById("elevatorExitToggle");
const elevatorExitNumberInput = document.getElementById("elevatorExitNumberInput");
const routeStartInput = document.getElementById("routeStartInput");
const routeGoalInput = document.getElementById("routeGoalInput");
const routeStartSelect = document.getElementById("routeStartSelect");
const routeGoalSelect = document.getElementById("routeGoalSelect");
const routePaidFreePenaltyInput = document.getElementById("routePaidFreePenaltyInput");
const routeZonePenaltyInput = document.getElementById("routeZonePenaltyInput");
const routePreferenceInput = document.getElementById("routePreferenceInput");
const routeToiletToggle = document.getElementById("routeToiletToggle");
const routeToiletGenderInput = document.getElementById("routeToiletGenderInput");
const routeEdgeStationInput = document.getElementById("routeEdgeStationInput");
const routeServerUrlInput = document.getElementById("routeServerUrlInput");
const routeServerTokenInput = document.getElementById("routeServerTokenInput");
const routeServerVersionInput = document.getElementById("routeServerVersionInput");
const routeServerSceneToggle = document.getElementById("routeServerSceneToggle");
const routeStatus = document.getElementById("routeStatus");
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
const stationIdInput = document.getElementById("stationIdInput");
const stationNameInput = document.getElementById("stationNameInput");
const stationLinesInput = document.getElementById("stationLinesInput");
const stationFloorsInput = document.getElementById("stationFloorsInput");
const stationMapIdInput = document.getElementById("stationMapIdInput");
const stationStatus = document.getElementById("stationStatus");
const validateStatus = document.getElementById("validateStatus");
const regionPickStatus = document.getElementById("regionPickStatus");
const regionBrushSizeInput = document.getElementById("regionBrushSizeInput");
const regionToleranceInput = document.getElementById("regionToleranceInput");
const regionCloseKernelInput = document.getElementById("regionCloseKernelInput");
const regionOpenKernelInput = document.getElementById("regionOpenKernelInput");
const regionEpsilonInput = document.getElementById("regionEpsilonInput");
const MANUAL_ASSET_TYPES = ["subway", "moving_walkway", "ticket_gate", "exit", "toilet"];
const VERTICAL_CONNECTION_TYPES = ["stair", "escalator", "exit_stair", "exit_escalator"];
const DEFAULT_PLATFORM_LINES = [
  "1호선",
  "2호선",
  "3호선",
  "4호선",
  "5호선",
  "6호선",
  "7호선",
  "8호선",
  "9호선",
  "공항철도",
  "경의중앙선",
  "수인분당선",
  "신분당선",
];
const SIDEBAR_PANELS = [
  {id: "setup", label: "Setup", titles: new Set(["Station Info", "View"])},
  {id: "extract", label: "Extract", titles: new Set(["Batch Pipeline", "Region Pick"])},
  {id: "polygons", label: "Polygons", titles: new Set(["Selected", "Layer Grouping", "Simple Keep", "Straighten Edge", "Move Vertex", "Insert Vertex", "Add Polygon", "Cut Hole", "Split Polygon"])},
  {id: "calibrate", label: "Calibrate", titles: new Set(["XY Correction", "Scale Calibration", "Local Axis Correction"])},
  {id: "nav", label: "Navigation", titles: new Set(["Vertical Connection", "Wall Path", "Map Asset", "Platform Point", "Elevator Point"])},
  {id: "export", label: "Export", titles: new Set(["Save"])},
];

function sectionTitle(section) {
  return section.querySelector("h2")?.textContent?.trim() || "";
}

function setActiveSidebarPanel(panelId) {
  document.querySelectorAll(".sidebar section").forEach((section) => {
    section.classList.toggle("active-panel", section.dataset.panel === panelId);
  });
  sidebarTabs?.querySelectorAll("button").forEach((button) => {
    button.classList.toggle("active", button.dataset.panel === panelId);
  });
  try {
    localStorage.setItem("subwayEditorPanel", panelId);
  } catch {
    // Ignore storage errors in restricted browser contexts.
  }
}

function setupSidebarTabs() {
  if (!sidebarTabs) return;
  const panelForTitle = new Map();
  SIDEBAR_PANELS.forEach((panel) => {
    panel.titles.forEach((title) => panelForTitle.set(title, panel.id));
  });
  document.querySelectorAll(".sidebar section").forEach((section) => {
    section.dataset.panel = panelForTitle.get(sectionTitle(section)) || "setup";
  });
  sidebarTabs.innerHTML = "";
  SIDEBAR_PANELS.forEach((panel) => {
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.panel = panel.id;
    button.textContent = panel.label;
    button.addEventListener("click", () => setActiveSidebarPanel(panel.id));
    sidebarTabs.appendChild(button);
  });
  let initialPanel = "setup";
  try {
    initialPanel = localStorage.getItem("subwayEditorPanel") || initialPanel;
  } catch {
    initialPanel = "setup";
  }
  if (!SIDEBAR_PANELS.some((panel) => panel.id === initialPanel)) initialPanel = "setup";
  setActiveSidebarPanel(initialPanel);
}

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

function currentModeLabel() {
  const labels = {
    select: "Select",
    marker: "Manual Marker",
    crop: "Crop",
    regionPick: "Region Pick",
    keep: "Simple Keep",
    straighten: "Straighten",
    move: "Move Vertex",
    insertVertex: "Insert Vertex",
    addPolygon: "Add Polygon",
    cutHole: "Cut Hole",
    splitPolygon: "Split Polygon",
    layerAlign: "XY Correction",
    localAxis: "Local Axis",
    scaleCalibration: "Scale Calibration",
    stair: "Vertical Connection",
    wall: "Wall Path",
    zone: "Zone Region",
    subway: "Map Asset",
    platform: "Platform Point",
    elevatorPoint: "Elevator Point",
    elevatorLink: "Elevator Link",
    localShift: "Local Shift",
  };
  return labels[state.tool] || state.tool || "Select";
}

function selectionSummaryText() {
  const parts = [];
  if (state.selectedId) parts.push(`polygon ${state.selectedId}`);
  if ((state.selectedIds || []).length > 1) parts.push(`${state.selectedIds.length} polygons`);
  if (state.selectedStairId) parts.push(`connection ${state.selectedStairId}`);
  if (state.selectedWallId) parts.push(`wall ${state.selectedWallId}`);
  if (state.selectedZoneId) parts.push(`zone ${state.selectedZoneId}`);
  if (state.selectedSubwayId) parts.push(`asset ${state.selectedSubwayId}`);
  const platformIds = typeof selectedPlatformIds === "function" ? selectedPlatformIds() : [];
  if (platformIds.length) parts.push(`${platformIds.length} platform point(s)`);
  const elevatorIds = typeof selectedElevatorPointIds === "function" ? selectedElevatorPointIds() : [];
  if (elevatorIds.length) parts.push(`${elevatorIds.length} elevator point(s)`);
  if (state.selectedLayerAlignIndex !== null && state.selectedLayerAlignIndex !== undefined) {
    parts.push(`xy correction ${state.selectedLayerAlignIndex + 1}`);
  }
  if (state.selectedLocalShiftIndex !== null && state.selectedLocalShiftIndex !== undefined) {
    parts.push(`local shift ${state.selectedLocalShiftIndex + 1}`);
  }
  return parts.length ? parts.join(" | ") : "-";
}

function updateModeSummary() {
  if (modeBadge) modeBadge.textContent = `Mode: ${currentModeLabel()}`;
  if (selectionSummary) selectionSummary.textContent = `Selected: ${selectionSummaryText()}`;
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

function zoneColor(zoneType, alpha = 0.24) {
  if (zoneType === "public") return `rgba(40, 145, 255, ${alpha})`;
  if (zoneType === "outside") return `rgba(120, 120, 120, ${alpha})`;
  if (zoneType === "transfer") return `rgba(160, 90, 255, ${alpha})`;
  return `rgba(255, 80, 40, ${alpha})`;
}

function zoneStrokeColor(zoneType) {
  if (zoneType === "public") return "#2891ff";
  if (zoneType === "outside") return "#777777";
  if (zoneType === "transfer") return "#a05aff";
  return "#ff5028";
}

function drawZoneRegions() {
  if (!state.showZones) return;
  ctx.save();
  for (const zone of state.annotations.manual_zones || []) {
    const points = zone.points_source || [];
    if (points.length < 3) continue;
    const selected = (zone.zone_id || zone.label) === state.selectedZoneId;
    ctx.beginPath();
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.closePath();
    ctx.fillStyle = zoneColor(zone.zone_type, selected ? 0.38 : 0.22);
    ctx.strokeStyle = selected ? "#ffd200" : zoneStrokeColor(zone.zone_type);
    ctx.lineWidth = selected ? 4 : 2;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(points[0], `${zone.zone_id || "zone"} ${zone.zone_type || "paid"}`, ctx.strokeStyle, 8, -8);
  }
  if (state.zone.active) {
    const points = state.zone.points || [];
    if (points.length > 1) drawPath(points, zoneStrokeColor(state.zone.zoneType), 4);
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? zoneStrokeColor(state.zone.zoneType) : "#ffffff";
      ctx.strokeStyle = zoneStrokeColor(state.zone.zoneType);
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    });
  }
  ctx.restore();
}

function drawStairConnections() {
  ctx.save();
  const selectedStairIds = new Set([state.selectedStairId, ...(state.selectedStairIds || [])].filter(Boolean));
  for (const conn of state.annotations.manual_connections || []) {
    if (!VERTICAL_CONNECTION_TYPES.includes(conn.type) || !conn.from_point_source || !conn.to_point_source) continue;
    const connectionId = conn.connection_id || conn.label;
    const isSelected = selectedStairIds.has(connectionId);
    const baseColor = conn.type === "escalator"
      ? "rgba(0, 180, 120, 0.95)"
      : conn.type === "exit_escalator"
        ? "rgba(0, 120, 255, 0.95)"
        : conn.type === "exit_stair"
          ? "rgba(150, 70, 255, 0.95)"
        : "rgba(255, 132, 0, 0.95)";
    const pointColor = conn.type === "escalator"
      ? "#00b878"
      : conn.type === "exit_escalator"
        ? "#0078ff"
        : conn.type === "exit_stair"
          ? "#9646ff"
          : "#ff8400";
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
    const label = isExitConnectionType(conn.type) && conn.exit_number
      ? `exit ${conn.exit_number}`
      : conn.connection_id || conn.label || conn.type;
    drawCanvasLabel(labelPoint, label, isSelected ? "#005cff" : pointColor, 8, -8);
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
    const fixedPoly = stairNextPointPolygon();
    if (fixedPoly?.points_source?.length) {
      drawPath(fixedPoly.points_source, "rgba(255, 132, 0, 0.95)", 4);
      drawCanvasLabel(averagePoint(fixedPoly.points_source), `next ${fixedPoly.polygon_id}`, "#ff8400", 10, -10);
    }
  }
  ctx.restore();
}

function drawWallPaths() {
  ctx.save();
  for (const wall of state.annotations.manual_walls || []) {
    const points = wall.points_source || [];
    if (points.length < 2) continue;
    const selected = (wall.wall_id || wall.label) === state.selectedWallId;
    drawPath(points, selected ? "rgba(255, 210, 0, 0.95)" : "rgba(92, 52, 28, 0.95)", selected ? 7 : 5);
    points.forEach((point) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ffd200" : "#5c341c";
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = selected ? 2 : 1;
      ctx.fill();
      ctx.stroke();
    });
    drawCanvasLabel(points[Math.floor(points.length / 2)], wall.label || wall.wall_id || "wall", selected ? "#b88600" : "#5c341c", 8, -8);
  }
  if (state.wall.active) {
    const points = state.wall.points || [];
    if (points.length > 1) drawPath(points, "rgba(255, 120, 0, 0.95)", 4);
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#ff7800" : "#ffb15c";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    if (state.wall.hoverSnap) {
      const screen = worldToScreen(state.wall.hoverSnap.point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, state.wall.hoverSnap.source === "vertex" ? 9 : 7, 0, Math.PI * 2);
      ctx.fillStyle = state.wall.hoverSnap.source === "vertex" ? "rgba(0, 180, 255, 0.35)" : "rgba(255, 180, 0, 0.35)";
      ctx.strokeStyle = state.wall.hoverSnap.source === "vertex" ? "#00b4ff" : "#ffb000";
      ctx.lineWidth = 3;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(state.wall.hoverSnap.point, state.wall.hoverSnap.source, ctx.strokeStyle, 8, -10);
    }
  }
  ctx.restore();
}

function drawManualAssets() {
  ctx.save();
  for (const asset of state.annotations.manual_assets || []) {
    if (!MANUAL_ASSET_TYPES.includes(asset.type) || !asset.point_source) continue;
    const selected = (asset.asset_id || asset.label) === state.selectedSubwayId;
    const baseColor = manualAssetColor(asset.type, 0.88);
    const selectedColor = "rgba(255, 210, 0, 0.95)";
    const labelColor = manualAssetLabelColor(asset.type);
    const directionPoints = asset.type === "toilet" ? (asset.direction_points_source || null) : null;
    const assetPath = asset.points_source
      || (asset.start_point_source && asset.end_point_source ? [asset.start_point_source, asset.end_point_source] : null)
      || (directionPoints?.length >= 2 ? directionPoints : null)
      || (asset.point_source && asset.facing_point_source ? [asset.point_source, asset.facing_point_source] : null);
    if (assetPath && assetPath.length >= 2) {
      drawPath(assetPath, selected ? selectedColor : baseColor, selected ? 5 : 3);
      if (directionPoints?.length >= 2 && asset.point_source) {
        const facing = perpendicularFacingFromLine(asset.point_source, directionPoints[0], directionPoints[1], 50);
        if (facing) {
          drawPath([asset.point_source, facing.point], selected ? selectedColor : baseColor, selected ? 5 : 3);
          drawPathArrow([asset.point_source, facing.point], selected ? selectedColor : baseColor);
        }
      } else if (asset.facing_point_source) {
        drawPathArrow(assetPath, selected ? selectedColor : baseColor);
      }
    }
    const screen = worldToScreen(asset.point_source);
    ctx.beginPath();
    if (asset.type === "exit") {
      ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
    } else {
      ctx.rect(screen.x - 9, screen.y - 5, 18, 10);
    }
    ctx.fillStyle = selected ? selectedColor : baseColor;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = selected ? 3 : 1;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(asset.point_source, asset.asset_id || asset.label || asset.type, selected ? "#ffd200" : labelColor, 10, -10);
  }
  if (state.subway.active) {
    const points = state.subway.points || [];
    const color = manualAssetColor(state.subway.assetType, 0.95);
    const directionVertices = state.subway.assetType === "toilet" ? (state.subway.directionVertices || []) : [];
    if (directionVertices.length >= 2 && points.length >= 1) {
      drawPath(directionVertices, "rgba(160, 120, 255, 0.9)", 4);
      const facing = perpendicularFacingFromLine(points[0], directionVertices[0], directionVertices[1], 50);
      if (facing) {
        drawPath([points[0], facing.point], color, 4);
        drawPathArrow([points[0], facing.point], color);
      }
    } else if (points.length >= 2) {
      drawPath(points, color, 4);
    }
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = manualAssetPointColor(state.subway.assetType, index);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
    });
    directionVertices.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#b39cff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(point, `dir ${index + 1}/2`, "#7846ff", 8, 16);
    });
    if (state.subway.assetType === "toilet" && state.subway.hoverVertex) {
      const screen = worldToScreen(state.subway.hoverVertex.point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.stroke();
      drawCanvasLabel(state.subway.hoverVertex.point, "vertex", "#ffffff", 10, -10);
    }
  }
  ctx.restore();
}

function drawPlatforms() {
  if (!state.showPlatforms && !state.platform.active) return;
  ctx.save();
  const selectedIds = new Set(selectedPlatformIds());
  for (const platform of state.annotations.manual_platforms || []) {
    const entries = platformDisplayEntries(platform);
    const points = entries.map((entry) => entry.point).filter(Boolean);
    if (points.length < 1) continue;
    const platformId = platform.platform_id || platform.label;
    const selected = selectedIds.has(platformId);
    const color = selected ? "rgba(255, 210, 0, 0.95)" : "rgba(155, 80, 255, 0.9)";
    if (points.length >= 2) {
      drawPath(points, color, selected ? 6 : 4);
      drawPathArrow(points, color);
    }
    entries.forEach((entry, index) => {
      const point = entry.point;
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, selected ? 7 : 5, 0, Math.PI * 2);
      ctx.fillStyle = selected ? "#ffd200" : (index === 0 ? "#7b2cff" : "#c49cff");
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      if (state.showPlatforms && entry.label) {
        drawCanvasLabel(point, entry.label, selected ? "#ffd200" : "#7b2cff", 8, index % 2 === 0 ? -8 : 16);
      }
    });
    const labelPoint = points[0];
    drawCanvasLabel(
      labelPoint,
      platform.label || [platform.station_name, platform.line_id, platform.direction, platform.car_range].filter(Boolean).join(" "),
      selected ? "#ffd200" : "#7b2cff",
      10,
      -10,
    );
  }
  if (state.platform.active) {
    const points = state.platform.mode === "line"
      ? [state.platform.lineStart, state.platform.lineEnd].filter(Boolean)
      : [state.platform.point, state.platform.facingPoint].filter(Boolean);
    if (points.length >= 2) {
      drawPath(points, "rgba(155, 80, 255, 0.95)", 4);
      drawPathArrow(points, "rgba(155, 80, 255, 0.95)");
    }
    if (state.platform.mode === "line") {
      (state.platform.anchors || []).forEach((anchor) => {
        const screen = worldToScreen(anchor.point_source);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, 6, 0, Math.PI * 2);
        ctx.fillStyle = "#ffb000";
        ctx.strokeStyle = "#111111";
        ctx.lineWidth = 1;
        ctx.fill();
        ctx.stroke();
        drawCanvasLabel(anchor.point_source, anchor.car_door || `${anchor.car}-${anchor.door}`, "#ffb000", 8, -8);
      });
    }
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#c49cff" : "#7b2cff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(point, state.platform.mode === "line" ? (index === 0 ? "1호차/front" : "tail") : (index === 0 ? "platform" : "facing"), "#7b2cff", 8, 16);
    });
  }
  ctx.restore();
}

function nextElevatorPointId() {
  const numbers = (state.annotations.manual_elevator_points || [])
    .map((point) => {
      const match = String(point.elevator_point_id || "").match(/^elevator_point_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `elevator_point_${String(next).padStart(3, "0")}`;
}

function nextElevatorId() {
  const numbers = (state.annotations.manual_elevator_points || [])
    .map((point) => {
      const match = String(point.elevator_id || "").match(/^EV_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `EV_${String(next).padStart(3, "0")}`;
}

function selectedElevatorPointIds() {
  const ids = new Set(state.selectedElevatorPointIds || []);
  if (state.selectedElevatorPointId) ids.add(state.selectedElevatorPointId);
  return Array.from(ids);
}

function selectedPolygonIds() {
  const ids = new Set(state.selectedIds || []);
  if (state.selectedId) ids.add(state.selectedId);
  return Array.from(ids);
}

function drawElevatorPoints() {
  ctx.save();
  const selectedIds = new Set(selectedElevatorPointIds());
  for (const item of state.annotations.manual_elevator_points || []) {
    if (!item.point_source) continue;
    const itemId = item.elevator_point_id || item.label;
    const selected = selectedIds.has(itemId);
    const isExit = Boolean(item.exit);
    const color = selected ? "rgba(255, 210, 0, 0.95)" : (isExit ? "rgba(255, 120, 40, 0.92)" : "rgba(20, 170, 255, 0.9)");
    const directionPoints = item.direction_points_source || null;
    const points = directionPoints ? [item.point_source, ...directionPoints].filter(Boolean) : [item.point_source, item.facing_point_source].filter(Boolean);
    if (directionPoints?.length >= 2) {
      drawPath(directionPoints, "rgba(160, 120, 255, 0.8)", selected ? 5 : 3);
      const facing = perpendicularFacingFromLine(item.point_source, directionPoints[0], directionPoints[1], 50);
      if (facing) {
        drawPath([item.point_source, facing.point], color, selected ? 6 : 4);
        drawPathArrow([item.point_source, facing.point], color);
      }
    } else if (points.length >= 2) {
      drawPath(points, color, selected ? 6 : 4);
      drawPathArrow(points, color);
    }
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.rect(screen.x - 6, screen.y - 6, 12, 12);
      ctx.fillStyle = selected ? "#ffd200" : (isExit ? (index === 0 ? "#ff7828" : "#ffb077") : (index === 0 ? "#14aaff" : "#8bdcff"));
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = selected ? 3 : 1;
      ctx.fill();
      ctx.stroke();
    });
    drawCanvasLabel(
      item.point_source,
      [item.elevator_id, item.label || item.elevator_point_id, item.exit ? `exit ${item.exit_number || ""}` : null].filter(Boolean).join(" "),
      selected ? "#ffd200" : (isExit ? "#ff7828" : "#14aaff"),
      10,
      -10,
    );
  }
  if (state.elevatorPoint.active) {
    const directionVertices = state.elevatorPoint.directionVertices || [];
    const points = [state.elevatorPoint.point, ...directionVertices].filter(Boolean);
    if (directionVertices.length >= 2) {
      drawPath(directionVertices, "rgba(160, 120, 255, 0.9)", 4);
      const facing = perpendicularFacingFromLine(state.elevatorPoint.point, directionVertices[0], directionVertices[1], 50);
      if (facing) {
        drawPath([state.elevatorPoint.point, facing.point], "rgba(20, 170, 255, 0.95)", 4);
        drawPathArrow([state.elevatorPoint.point, facing.point], "rgba(20, 170, 255, 0.95)");
      }
    }
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.rect(screen.x - 7, screen.y - 7, 14, 14);
      ctx.fillStyle = index === 0 ? "#14aaff" : "#8bdcff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(point, index === 0 ? "elevator" : `dir ${index}/2`, "#14aaff", 8, 16);
    });
    if (state.elevatorPoint.hoverVertex) {
      const screen = worldToScreen(state.elevatorPoint.hoverVertex.point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 10, 0, Math.PI * 2);
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 12, 0, Math.PI * 2);
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1;
      ctx.stroke();
      drawCanvasLabel(state.elevatorPoint.hoverVertex.point, "vertex", "#ffffff", 10, -10);
    }
  }
  ctx.restore();
}

function drawRouteOverlay() {
  const points = state.route?.sourcePoints || [];
  if (!points.length) return;
  ctx.save();
  if (points.length >= 2) {
    drawPath(points, "rgba(255, 214, 0, 0.95)", 8);
    drawPath(points, "rgba(30, 30, 30, 0.9)", 3);
    drawPathArrow(points, "rgba(255, 214, 0, 0.95)");
  }
  const nodes = state.route?.result?.nodes || [];
  points.forEach((point, index) => {
    const screen = worldToScreen(point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = index === 0 ? "#00d084" : (index === points.length - 1 ? "#ff4d5f" : "#ffd600");
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    const node = nodes[index] || {};
    drawCanvasLabel(
      point,
      `${node.node_key_str || node.node_key || index + 1} ${node.type || ""}`,
      "#ffd600",
      10,
      -14,
    );
  });
  ctx.restore();
}

function navigationNodeSourcePoint(node) {
  const point = node?.source_position || node?.point_source || node?.center_source;
  if (!Array.isArray(point) || point.length < 2) return null;
  const x = Number(point[0]);
  const y = Number(point[1]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return [x, y];
}

function navigationNodeColor(node) {
  const type = node?.type || node?.node_type;
  if (type === "platform") return "#00b7ff";
  if (type === "exit") return "#ff4d5f";
  if (type === "gate") return "#b26cff";
  if (type === "stair" || type === "escalator") return "#ff9f1c";
  if (type === "elevator") return "#00d084";
  if (node?.poi_type === "toilet") return "#35d0ba";
  return "#ffd600";
}

function drawNavigationNodes() {
  if (!state.showNavigationNodes) return;
  const nodes = state.navigationNodes || [];
  if (!nodes.length) return;
  ctx.save();
  nodes.forEach((node) => {
    const point = navigationNodeSourcePoint(node);
    if (!point) return;
    const screen = worldToScreen(point);
    const color = navigationNodeColor(node);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(
      point,
      `${node.node_key_str || node.node_key || node.node_id || ""} ${node.type || node.node_type || ""}`.trim(),
      color,
      7,
      -9,
    );
  });
  ctx.restore();
}

function drawManualMarkerPreview() {
  if (!state.showMarkers) return;
  if (!state.marker.active && state.marker.points.length === 0 && !state.marker.autoPoint) return;
  ctx.save();
  const labels = ["1", "2", "3", "4"];
  const markerPoints = manualMarkerPointsForSave();
  if (markerPoints.length > 1) drawPath(markerPoints, "rgba(255, 0, 180, 0.9)", 3);
  markerPoints.forEach((point, index) => {
    const screen = worldToScreen(point);
    const isAuto = index === 3 && state.marker.autoPoint;
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = isAuto ? "#ffb3ec" : "#ff00b4";
    ctx.strokeStyle = "#111111";
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
    drawCanvasLabel(point, `marker ${labels[index]}${isAuto ? " auto" : ""}`, "#ff00b4", 10, -10);
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

function drawRegionPickPreview() {
  if (!state.regionPick.active && !(state.regionPick.strokes || []).length) return;
  const strokes = [...(state.regionPick.strokes || [])];
  if ((state.regionPick.currentStroke || []).length) strokes.push(state.regionPick.currentStroke);
  if (!strokes.length) return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(255, 0, 180, 0.38)";
  ctx.fillStyle = "rgba(255, 0, 180, 0.24)";
  const brushWidth = Math.max(1, Number(state.regionPick.brushSize || selectedRegionBrushSize()) * state.scale);
  ctx.lineWidth = brushWidth;
  for (const stroke of strokes) {
    if (!stroke.length) continue;
    if (stroke.length === 1) {
      const screen = worldToScreen(stroke[0]);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, brushWidth / 2, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    ctx.beginPath();
    stroke.forEach((point, index) => {
      const screen = worldToScreen(point);
      if (index === 0) ctx.moveTo(screen.x, screen.y);
      else ctx.lineTo(screen.x, screen.y);
    });
    ctx.stroke();
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

function splitListInput(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function stationMetadataFromInputs() {
  const stationId = stationIdInput.value.trim();
  const stationName = stationNameInput.value.trim();
  const resolvedStationId = stationId || stationName;
  const lines = splitListInput(stationLinesInput.value);
  const floors = splitListInput(stationFloorsInput.value);
  const mapId = stationMapIdInput.value.trim();
  return {
    station_id: resolvedStationId || null,
    station_name: stationName || null,
    lines: lines.map((line) => ({line_id: line, line_name: line})),
    line_ids: lines,
    floors,
    map_id: mapId || null,
  };
}

function populateStationInputs(metadata = {}) {
  const lines = metadata.line_ids || (metadata.lines || []).map((line) => line.line_id || line.line_name || line).filter(Boolean);
  stationIdInput.value = metadata.station_id || "";
  stationNameInput.value = metadata.station_name || "";
  stationLinesInput.value = lines.join(",");
  stationFloorsInput.value = (metadata.floors || []).join(",");
  stationMapIdInput.value = metadata.map_id || "";
  updateStationStatus();
}

function updateStationStatus(message = null) {
  const metadata = state.annotations.station_metadata || {};
  const parts = [
    message,
    metadata.station_name ? `station: ${metadata.station_name}` : null,
    metadata.station_id ? `id: ${metadata.station_id}` : null,
    metadata.line_ids?.length ? `lines: ${metadata.line_ids.join(", ")}` : null,
    metadata.floors?.length ? `floors: ${metadata.floors.join(", ")}` : null,
  ].filter(Boolean);
  stationStatus.textContent = parts.join("\n") || "inactive";
}

function saveStationInfo() {
  state.annotations.station_metadata = stationMetadataFromInputs();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateStationStatus("Station info saved.");
  });
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

function drawLocalShiftCorrections() {
  if (!state.showCorrections && !state.localShift.active) return;
  ctx.save();
  if (state.showCorrections) {
    (state.annotations.local_shift_corrections || []).forEach((correction, index) => {
      const moving = correction.moving?.point_source;
      const reference = correction.reference?.point_source;
      if (!moving || !reference) return;
      const selected = index === state.selectedLocalShiftIndex;
      const color = selected ? "rgba(255, 210, 0, 0.95)" : "rgba(255, 70, 150, 0.8)";
      drawPath([moving, reference], color, selected ? 6 : 3);
      drawPathArrow([moving, reference], color);
      drawCanvasLabel(moving, `${correction.label || correction.correction_id || "shift"} move`, selected ? "#ffd200" : "#ff4696", 8, -8);
      drawCanvasLabel(reference, "ref", selected ? "#ffd200" : "#ff4696", 8, 18);
    });
  }
  if (state.localShift.active) {
    const points = [state.localShift.movingPoint, state.localShift.referencePoint].filter(Boolean);
    if (points.length === 2) {
      drawPath(points, "rgba(255, 70, 150, 0.95)", 5);
      drawPathArrow(points, "rgba(255, 70, 150, 0.95)");
    }
    points.forEach((point, index) => {
      const screen = worldToScreen(point);
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
      ctx.fillStyle = index === 0 ? "#ff4696" : "#ffd200";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
      drawCanvasLabel(point, index === 0 ? "moving" : "reference", ctx.fillStyle, 8, -8);
    });
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
  updateModeSummary();
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
  drawZoneRegions();
  drawStairConnections();
  drawWallPaths();
  drawManualAssets();
  drawPlatforms();
  drawElevatorPoints();
  drawNavigationNodes();
  drawRouteOverlay();
  drawManualMarkerPreview();
  drawCropPreview();
  drawRegionPickPreview();
  drawMergePreview();
  drawStraightenPreview();
  drawMovePreview();
  drawInsertVertexPreview();
  drawKeepPreview();
  drawAddPolygonPreview();
  drawCutHolePreview();
  drawSplitPolygonPreview();
  drawLayerAlignPreview();
  drawLocalShiftCorrections();
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

function selectedLocalAxisTargetIds(basePolygonId) {
  const existingIds = new Set(allPolygons().map((poly) => poly.polygon_id));
  const selectedIds = state.selectedIds || [];
  const targets = new Set();
  if (selectedIds.length) {
    selectedIds.forEach((polygonId) => {
      if (existingIds.has(polygonId)) targets.add(polygonId);
    });
  }
  if (basePolygonId && existingIds.has(basePolygonId)) targets.add(basePolygonId);
  return Array.from(targets);
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
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedSubwayId = null;
  state.selectedWallId = null;
  state.selectedZoneId = null;
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

function defaultSceneHeight() {
  return {
    floor_height: 5,
    default_z: 0,
    layer_z: {},
  };
}

function sceneHeightFromInputs() {
  const floorHeight = Number(floorHeightInput?.value);
  const defaultZ = Number(defaultZInput?.value);
  const layerZ = {};
  for (const [layer, input] of Object.entries(layerZInputs)) {
    if (!input || input.value === "") continue;
    const value = Number(input.value);
    if (Number.isFinite(value)) layerZ[layer] = value;
  }
  return {
    floor_height: Number.isFinite(floorHeight) ? floorHeight : 5,
    default_z: Number.isFinite(defaultZ) ? defaultZ : 0,
    layer_z: layerZ,
  };
}

function populateSceneHeightInputs(sceneHeight = null) {
  const values = {...defaultSceneHeight(), ...(sceneHeight || {})};
  const layerZ = values.layer_z || {};
  if (floorHeightInput) floorHeightInput.value = values.floor_height ?? 5;
  if (defaultZInput) defaultZInput.value = values.default_z ?? 0;
  for (const [layer, input] of Object.entries(layerZInputs)) {
    if (!input) continue;
    input.value = layerZ[layer] ?? "";
  }
  updateLayerHeightStatus();
}

function updateLayerHeightStatus(message = null) {
  const sceneHeight = state.annotations.scene_height || defaultSceneHeight();
  const layerZ = sceneHeight.layer_z || {};
  const parts = Object.keys(layerZ).sort().map((layer) => `${layer}=${layerZ[layer]}`);
  layerHeightStatus.textContent = [
    message,
    `floor height: ${sceneHeight.floor_height ?? 5}`,
    `default z: ${sceneHeight.default_z ?? 0}`,
    parts.length ? `layer z: ${parts.join(", ")}` : "layer z: default by floor height",
  ].filter(Boolean).join("\n");
}

function saveLayerHeights() {
  state.annotations.scene_height = sceneHeightFromInputs();
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerHeightStatus("Layer heights saved.");
  });
}

function resetLayerHeights() {
  state.annotations.scene_height = defaultSceneHeight();
  populateSceneHeightInputs(state.annotations.scene_height);
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLayerHeightStatus("Layer heights reset.");
  });
}

function selectedZoneType() {
  return zoneTypeInput?.value || "paid";
}

function nextZoneId() {
  const numbers = (state.annotations.manual_zones || [])
    .map((zone) => {
      const match = String(zone.zone_id || "").match(/^zone_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `zone_${String(next).padStart(3, "0")}`;
}

function updateZoneStatus(message = null) {
  const count = (state.annotations.manual_zones || []).length;
  if (!state.zone.active) {
    zoneStatus.textContent = [
      message,
      "default: public",
      `zones: ${count}`,
      state.selectedZoneId ? `selected: ${state.selectedZoneId}` : null,
    ].filter(Boolean).join("\n");
    return;
  }
  zoneStatus.textContent = [
    message,
    `type: ${state.zone.zoneType}`,
    `points: ${(state.zone.points || []).length}`,
    state.zone.polygonId ? `polygon: ${state.zone.polygonId}` : "Click points around the zone. Shift applies.",
  ].filter(Boolean).join("\n");
}

function updateZoneVisibilityControls() {
  if (showZonesToggle) showZonesToggle.checked = state.showZones;
  if (toggleZonesBtn) toggleZonesBtn.textContent = state.showZones ? "Hide Zones" : "Show Zones";
}

function setShowZones(show) {
  state.showZones = Boolean(show);
  if (!state.showZones) state.selectedZoneId = null;
  updateZoneVisibilityControls();
  updateZoneStatus();
  draw();
}

function startZoneRegion() {
  if (!canEdit()) return;
  state.tool = "zone";
  state.zone = {
    active: true,
    zoneType: selectedZoneType(),
    points: [],
    polygonId: null,
    layer: null,
  };
  updateZoneStatus();
  draw();
}

function resetZoneRegion() {
  state.tool = "select";
  state.zone = {
    active: false,
    zoneType: selectedZoneType(),
    points: [],
    polygonId: null,
    layer: null,
  };
  updateZoneStatus();
  draw();
}

function zoneRecordFromPoints(points, zoneType, polygonId = null, layer = null, source = "manual_region") {
  const zoneId = nextZoneId();
  return {
    zone_id: zoneId,
    type: "zone_region",
    zone_type: zoneType || "paid",
    default_outside_zone_type: "public",
    label: zoneId,
    polygon_id: polygonId,
    layer,
    points_source: points.map((point) => [Number(point[0].toFixed(2)), Number(point[1].toFixed(2))]),
    source,
  };
}

function addZonePoint(world, poly) {
  if (!state.zone.active) return;
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if (!state.zone.points.length && poly) {
    state.zone.polygonId = poly.polygon_id;
    state.zone.layer = polygonLayerValue(poly);
  }
  state.zone.points.push(point);
  updateZoneStatus();
  draw();
}

function applyZoneRegion() {
  if (!state.zone.active || (state.zone.points || []).length < 3) {
    updateZoneStatus("Zone needs at least 3 points.");
    return;
  }
  state.annotations.manual_zones = state.annotations.manual_zones || [];
  const zone = zoneRecordFromPoints(
    state.zone.points,
    state.zone.zoneType,
    state.zone.polygonId,
    state.zone.layer,
    "manual_region",
  );
  state.annotations.manual_zones.push(zone);
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetZoneRegion();
    updateZoneStatus(`${zone.zone_id} saved.`);
  });
}

function undoZonePoint() {
  if (!state.zone.active || !(state.zone.points || []).length) return;
  state.zone.points.pop();
  if (!state.zone.points.length) {
    state.zone.polygonId = null;
    state.zone.layer = null;
  }
  updateZoneStatus();
  draw();
}

function setSelectedPolygonZone() {
  const polygonIds = selectedLayerPolygonIds();
  if (!polygonIds.length) {
    updateZoneStatus("Select polygon(s) first.");
    return;
  }
  state.annotations.manual_zones = state.annotations.manual_zones || [];
  const zoneType = selectedZoneType();
  for (const polygonId of polygonIds) {
    const poly = [...state.polygons, ...state.manualPolygons].find((item) => item.polygon_id === polygonId);
    if (!poly || !poly.points_source || poly.points_source.length < 3) continue;
    state.annotations.manual_zones.push(
      zoneRecordFromPoints(
        poly.points_source,
        zoneType,
        polygonId,
        polygonLayerValue(poly),
        "full_polygon",
      ),
    );
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateZoneStatus(`Set ${polygonIds.length} polygon zone(s) to ${zoneType}.`);
    draw();
  });
}

function nearestZoneRegion(world, maxScreenDistance = 12) {
  if (!state.showZones) return null;
  const mouse = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_zones || []).forEach((zone, index) => {
    const points = zone.points_source || [];
    if (points.length < 3) return;
    const edges = points.map((point, pointIndex) => [point, points[(pointIndex + 1) % points.length]]);
    const distance = Math.min(...edges.map(([start, end]) => {
      const projected = projectPointToSegment(world, start, end);
      const screen = worldToScreen(projected);
      return Math.hypot(screen.x - mouse.x, screen.y - mouse.y);
    }));
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {index, zoneId: zone.zone_id || zone.label || `zone_${index + 1}`, distance};
    }
  });
  return best;
}

function selectZoneRegion(world) {
  if (!state.showZones) return false;
  const hit = nearestZoneRegion(world);
  if (!hit) {
    state.selectedZoneId = null;
    updateZoneStatus();
    draw();
    return false;
  }
  state.selectedZoneId = hit.zoneId;
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedWallId = null;
  state.selectedSubwayId = null;
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  updateSelectedInfo();
  updateZoneStatus(`Selected ${hit.zoneId}.`);
  draw();
  return true;
}

function deleteSelectedZone() {
  if (!state.selectedZoneId) {
    updateZoneStatus("Select a zone first.");
    return;
  }
  const before = (state.annotations.manual_zones || []).length;
  state.annotations.manual_zones = (state.annotations.manual_zones || []).filter(
    (zone) => (zone.zone_id || zone.label) !== state.selectedZoneId,
  );
  const removed = before - state.annotations.manual_zones.length;
  state.selectedZoneId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateZoneStatus(`Deleted ${removed} zone(s).`);
    draw();
  });
}

function deleteAllZones() {
  const removed = (state.annotations.manual_zones || []).length;
  state.annotations.manual_zones = [];
  state.selectedZoneId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateZoneStatus(`Deleted ${removed} zone(s).`);
    draw();
  });
}

function undoLastZone() {
  state.annotations.manual_zones = state.annotations.manual_zones || [];
  const removed = state.annotations.manual_zones.pop();
  if (!removed) {
    updateZoneStatus("No zone to undo.");
    return;
  }
  state.selectedZoneId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateZoneStatus(`Removed ${removed.zone_id || removed.label}.`);
    draw();
  });
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
  state.annotations.station_metadata = stationMetadataFromInputs();
  state.annotations.scene_height = sceneHeightFromInputs();
  return fetch("/api/annotations", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(state.annotations),
  }).then((response) => response.json());
}

function workingPolygonsPayload() {
  return finalWorkingPolygons();
}

function routeSourcePoints(route) {
  return (route?.nodes || [])
    .map((node) => node.source_position || node.point_source || node.center_source)
    .filter((point) => Array.isArray(point) && point.length >= 2)
    .map((point) => [Number(point[0]), Number(point[1])]);
}

function updateRouteStatus(message = null) {
  const route = state.route?.result;
  routeStatus.textContent = [
    message,
    route ? `cost: ${Number(route.total_cost || 0).toFixed(3)}` : null,
    route ? `nodes: ${route.node_count}, edges: ${route.edge_count}` : null,
    route ? `preference: ${route.metadata?.route_preference || "none"}` : null,
    route?.metadata?.waypoint_node_key_str ? `waypoint: ${route.metadata.waypoint_node_key_str} ${route.metadata.waypoint_label || ""} (${route.metadata.waypoint_toilet_gender || "toilet"})` : null,
    route ? `zones: ${(route.zone_sequence || []).join(" -> ")}` : null,
    route ? `path: ${(route.node_ids || []).join(" -> ")}` : null,
  ].filter(Boolean).join("\n") || "inactive";
}

function routeNodeLabel(node) {
  return [
    node.node_key_str || node.node_key,
    node.type,
    node.exit_number ? `exit ${node.exit_number}` : null,
    node.poi_type === "toilet" ? `toilet ${node.toilet_gender || "both"}` : null,
    node.layer,
    [node.zone_type, node.zone_id].filter(Boolean).join(":"),
    node.label,
    node.node_id,
  ].filter(Boolean).join(" | ");
}

function populateRouteNodeSelects(nodes) {
  const previousStart = routeStartInput.value || routeStartSelect.value;
  const previousGoal = routeGoalInput.value || routeGoalSelect.value;
  for (const select of [routeStartSelect, routeGoalSelect]) {
    select.innerHTML = "";
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = nodes.length ? "select node" : "no nodes";
    select.appendChild(empty);
    for (const node of nodes) {
      const option = document.createElement("option");
      option.value = node.node_key_str || node.node_id;
      option.textContent = routeNodeLabel(node);
      option.dataset.nodeId = node.node_id || "";
      select.appendChild(option);
    }
  }
  if (previousStart) routeStartSelect.value = previousStart;
  if (previousGoal) routeGoalSelect.value = previousGoal;
}

function loadRouteNodesFromUi() {
  updateRouteStatus("Loading route nodes...");
  saveAnnotations()
    .then(() => fetch("/api/navigation/nodes", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        working_polygons: workingPolygonsPayload(),
      }),
    }))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "node loading failed");
      state.navigationNodes = data.nodes || [];
      populateRouteNodeSelects(data.nodes || []);
      updateRouteStatus(`Loaded ${data.node_count || 0} nodes.`);
      draw();
    })
    .catch((error) => {
      updateRouteStatus(String(error));
    });
}

function findRouteFromUi() {
  const start = (routeStartInput.value || routeStartSelect.value || "").trim();
  const goal = (routeGoalInput.value || routeGoalSelect.value || "").trim();
  if (!start || !goal) {
    updateRouteStatus("Start and goal are required.");
    return;
  }
  updateRouteStatus("Finding route...");
  saveAnnotations()
    .then(() => fetch("/api/navigation/route", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        start,
        goal,
        working_polygons: workingPolygonsPayload(),
        synthetic_mode: "same-polygon",
        paid_free_penalty: Number(routePaidFreePenaltyInput.value || 1000),
        zone_change_penalty: Number(routeZonePenaltyInput.value || 100),
        route_preference: routePreferenceInput.value || "none",
        include_toilet: routeToiletToggle.checked,
        toilet_gender: routeToiletGenderInput.value || "any",
      }),
    }))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "route failed");
      state.route.result = data.route;
      state.route.sourcePoints = routeSourcePoints(data.route);
      updateRouteStatus(state.route.sourcePoints.length >= 2 ? "Route found." : "Route found, but source positions are incomplete.");
      draw();
    })
    .catch((error) => {
      state.route.result = null;
      state.route.sourcePoints = [];
      updateRouteStatus(String(error));
      draw();
    });
}

function exportRoutePathFromUi() {
  if (!state.route?.result) {
    updateRouteStatus("Find a route first.");
    return;
  }
  updateRouteStatus("Exporting route path...");
  fetch("/api/navigation/export_path", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      route: state.route.result,
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "route path export failed");
      updateRouteStatus(`Route path exported.\noutput: ${data.output}\nexample: ${data.example_output}`);
    })
    .catch((error) => {
      updateRouteStatus(String(error));
    });
}

function buildRouteEdgesFromUi() {
  updateRouteStatus("Building route video edges...");
  saveAnnotations()
    .then(() => fetch("/api/navigation/route_edges", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(routeEdgeRequestPayload()),
    }))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "route edge export failed");
      const counts = data.counts || {};
      updateRouteStatus([
        "Route video edges exported.",
        `output: ${data.output}`,
        `platform car nodes: ${counts.platform_car_node_count || 0}`,
        `exit nodes: ${counts.exit_node_count || 0}`,
        `OD pairs: ${counts.od_pair_count || 0}`,
        `route success/failure: ${counts.route_success_count || 0}/${counts.route_failure_count || 0}`,
        `toilet route success: ${counts.toilet_route_success_count || 0}`,
        `unique video edges: ${counts.unique_edge_count || 0}`,
      ].join("\n"));
    })
    .catch((error) => {
      updateRouteStatus(String(error));
    });
}

function routeEdgeRequestPayload(extra = {}) {
  const stationMetadata = stationMetadataFromInputs();
  return {
    working_polygons: workingPolygonsPayload(),
    station_name: (routeEdgeStationInput.value || stationMetadata.station_name || "").trim(),
    no_platform_platform: false,
    include_same_platform: false,
    directed: true,
    include_toilet_routes: true,
    toilet_genders: ["male", "female"],
    synthetic_mode: "same-polygon",
    paid_free_penalty: Number(routePaidFreePenaltyInput.value || 1000),
    zone_change_penalty: Number(routeZonePenaltyInput.value || 100),
    route_preference: routePreferenceInput.value || "none",
    ...extra,
  };
}

function uploadRoutePackageToServer() {
  const metadata = stationMetadataFromInputs();
  const serverUrl = (routeServerUrlInput.value || "").trim();
  if (!metadata.station_name) {
    updateRouteStatus("Station name을 먼저 입력하세요. Station ID는 비어 있으면 역명으로 자동 지정됩니다.");
    saveResult.textContent = "Station name을 먼저 입력하세요. Station ID는 비어 있으면 역명으로 자동 지정됩니다.";
    return;
  }
  if (!serverUrl) {
    updateRouteStatus("Route server URL을 입력하세요.");
    saveResult.textContent = "Route server URL을 입력하세요.";
    return;
  }
  updateRouteStatus("Exporting and uploading route package...");
  saveResult.textContent = "Exporting scene/navigation, building route video edges, and uploading route package...";
  state.annotations.station_metadata = metadata;
  saveAnnotations()
    .then(() => fetch("/api/route_server/upload", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(routeEdgeRequestPayload({
        metadata,
        server_url: serverUrl,
        admin_token: routeServerTokenInput.value || "",
        version: (routeServerVersionInput.value || "v001").trim(),
        include_scene_planes: routeServerSceneToggle.checked,
      })),
    }))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || data.detail || "route server upload failed");
      const imported = data.import_response || {};
      const counts = data.route_video_edges?.counts || {};
      updateRouteStatus([
        "Route package uploaded.",
        `station: ${imported.station_id || metadata.station_id}`,
        `version: ${imported.version || routeServerVersionInput.value || "v001"}`,
        `server: ${data.server_url}`,
        `navigation nodes/edges: ${data.navigation_node_count || 0}/${data.navigation_edge_count || 0}`,
        `unique video edges: ${counts.unique_edge_count || 0}`,
        `local output: ${data.outputs?.navigation_graph || ""}`,
      ].filter(Boolean).join("\n"));
      saveResult.textContent = JSON.stringify(data, null, 2);
    })
    .catch((error) => {
      updateRouteStatus(String(error));
      saveResult.textContent = String(error);
    });
}

function clearRouteOverlay() {
  state.route.result = null;
  state.route.sourcePoints = [];
  updateRouteStatus();
  draw();
}

function validateScene() {
  const issues = [];
  const warnings = [];
  const visiblePolygons = workingPolygonsPayload().filter((poly) => !(state.annotations.hidden_polygon_ids || []).includes(poly.polygon_id));
  const polygonIds = new Set(visiblePolygons.map((poly) => poly.polygon_id));
  const layerByPolygon = new Map(visiblePolygons.map((poly) => [poly.polygon_id, polygonLayerValue(poly)]));

  if (!visiblePolygons.length) issues.push("No visible polygons in the working set.");
  visiblePolygons.forEach((poly) => {
    if (!polygonLayerValue(poly)) warnings.push(`${poly.polygon_id}: layer is missing.`);
    if (!poly.points_source || poly.points_source.length < 3) issues.push(`${poly.polygon_id}: polygon has fewer than 3 points.`);
  });

  (state.annotations.manual_connections || []).forEach((connection) => {
    const id = connection.connection_id || connection.label || "connection";
    if (!connection.from_polygon_id || !polygonIds.has(connection.from_polygon_id)) warnings.push(`${id}: from polygon is missing or hidden.`);
    if (!connection.to_polygon_id || !polygonIds.has(connection.to_polygon_id)) warnings.push(`${id}: to polygon is missing or hidden.`);
    if (!connection.from_layer || !connection.to_layer) warnings.push(`${id}: layer is missing.`);
    if (!connection.from_point_source || !connection.to_point_source) issues.push(`${id}: endpoint point is missing.`);
  });

  const elevatorGroups = new Map();
  (state.annotations.manual_elevator_points || []).forEach((point) => {
    const id = point.elevator_point_id || point.label || "elevator point";
    if (!point.point_source) issues.push(`${id}: point is missing.`);
    if (!point.facing_point_source) warnings.push(`${id}: facing direction is missing.`);
    if (!point.layer) warnings.push(`${id}: layer is missing.`);
    if (!point.polygon_id || !polygonIds.has(point.polygon_id)) warnings.push(`${id}: polygon is missing or hidden.`);
    if (point.elevator_id) {
      elevatorGroups.set(point.elevator_id, (elevatorGroups.get(point.elevator_id) || 0) + 1);
    } else {
      warnings.push(`${id}: elevator link is not assigned.`);
    }
  });
  elevatorGroups.forEach((count, elevatorId) => {
    if (count < 2) warnings.push(`${elevatorId}: only one elevator point is linked.`);
  });

  (state.annotations.manual_platforms || []).forEach((platform) => {
    const id = platform.platform_id || platform.label || "platform";
    if (platform.type === "platform_point" || platform.point_source) {
      if (!platform.point_source) issues.push(`${id}: platform point is missing.`);
      if (!platform.facing_point_source) warnings.push(`${id}: facing direction is missing.`);
      if (!platform.layer) warnings.push(`${id}: layer is missing.`);
      if (!platform.station_name) warnings.push(`${id}: station name is missing.`);
      if (!platform.line_id) warnings.push(`${id}: line is missing.`);
      if (!platform.direction) warnings.push(`${id}: direction is missing.`);
    }
  });

  const lines = [
    issues.length ? `Errors: ${issues.length}` : "Errors: 0",
    warnings.length ? `Warnings: ${warnings.length}` : "Warnings: 0",
    ...issues.map((item) => `ERROR ${item}`),
    ...warnings.map((item) => `WARN ${item}`),
  ];
  validateStatus.textContent = lines.join("\n");
  saveResult.textContent = JSON.stringify({valid: issues.length === 0, errors: issues, warnings}, null, 2);
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
  if (!sharedEdgeStatus) return;
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

function selectedRegionBrushSize() {
  const value = Number(regionBrushSizeInput?.value || 34);
  return Number.isFinite(value) && value > 0 ? value : 34;
}

function selectedRegionNumber(input, fallback) {
  const value = Number(input?.value ?? fallback);
  return Number.isFinite(value) ? value : fallback;
}

function updateRegionPickStatus(message = null) {
  if (!state.regionPick.active) {
    regionPickStatus.textContent = message || "inactive";
    return;
  }
  const strokeCount = (state.regionPick.strokes || []).length + ((state.regionPick.currentStroke || []).length ? 1 : 0);
  const pointCount = [...(state.regionPick.strokes || []), state.regionPick.currentStroke || []]
    .reduce((total, stroke) => total + (stroke || []).length, 0);
  regionPickStatus.textContent = [
    message,
    "mode: brush region pick",
    `brush: ${state.regionPick.brushSize}px`,
    `strokes: ${strokeCount}`,
    `points: ${pointCount}`,
    state.regionPick.sourcePolygonId ? `source: ${state.regionPick.sourcePolygonId}` : "source: auto",
    "Paint the target floor. Shift applies.",
  ].filter(Boolean).join("\n");
}

function startRegionPick() {
  if (!canEdit()) return;
  state.tool = "regionPick";
  state.regionPick = {
    active: true,
    drawing: false,
    strokes: [],
    currentStroke: [],
    brushSize: selectedRegionBrushSize(),
    sourcePolygonId: state.selectedId,
  };
  updateRegionPickStatus();
  draw();
}

function resetRegionPick() {
  state.tool = "select";
  state.regionPick = {
    active: false,
    drawing: false,
    strokes: [],
    currentStroke: [],
    brushSize: selectedRegionBrushSize(),
    sourcePolygonId: null,
  };
  updateRegionPickStatus();
  draw();
}

function addRegionPickPoint(world) {
  if (!state.regionPick.active || !state.regionPick.drawing) return;
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  const stroke = state.regionPick.currentStroke || [];
  const last = stroke[stroke.length - 1];
  if (!last || Math.hypot(last[0] - point[0], last[1] - point[1]) >= 1.5) {
    stroke.push(point);
    state.regionPick.currentStroke = stroke;
    updateRegionPickStatus();
    draw();
  }
}

function finishRegionPickStroke() {
  if (!state.regionPick.active || !state.regionPick.drawing) return;
  state.regionPick.drawing = false;
  if ((state.regionPick.currentStroke || []).length) {
    state.regionPick.strokes = state.regionPick.strokes || [];
    state.regionPick.strokes.push(state.regionPick.currentStroke);
  }
  state.regionPick.currentStroke = [];
  updateRegionPickStatus();
  draw();
}

function undoRegionStroke() {
  if (!state.regionPick.active) return;
  if ((state.regionPick.currentStroke || []).length) {
    state.regionPick.currentStroke = [];
  } else if ((state.regionPick.strokes || []).length) {
    state.regionPick.strokes.pop();
  } else {
    updateRegionPickStatus("No stroke to undo.");
    return;
  }
  updateRegionPickStatus();
  draw();
}

function regionPickColor() {
  const source = allPolygons().find((poly) => poly.polygon_id === state.regionPick.sourcePolygonId);
  return source?.color_rgb || [180, 180, 180];
}

function applyRegionPick() {
  if (!canEdit()) return;
  if (!state.regionPick.active || !(state.regionPick.strokes || []).length) {
    updateRegionPickStatus("Paint at least one stroke.");
    return;
  }
  updateRegionPickStatus("extracting region...");
  fetch("/api/region_pick", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      strokes: state.regionPick.strokes,
      brush_size: state.regionPick.brushSize,
      lab_tolerance: selectedRegionNumber(regionToleranceInput, 18),
      close_kernel: selectedRegionNumber(regionCloseKernelInput, 7),
      open_kernel: selectedRegionNumber(regionOpenKernelInput, 3),
      epsilon_ratio: selectedRegionNumber(regionEpsilonInput, 0.003),
      source_polygon_id: state.regionPick.sourcePolygonId,
      color_rgb: regionPickColor(),
      working_polygons: workingPolygonsPayload(),
    }),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "region pick failed");
      state.annotations.manual_polygons = state.annotations.manual_polygons || [];
      state.annotations.manual_edits = state.annotations.manual_edits || [];
      state.annotations.manual_polygons.push(data.added_polygon);
      state.annotations.manual_edits.push(data.edit_record);
      state.manualPolygons = state.annotations.manual_polygons;
      state.selectedId = data.added_polygon.polygon_id;
      updateSelectedInfo();
      resetRegionPick();
      saveAnnotations().then((result) => {
        saveResult.textContent = JSON.stringify({...result, region_pick: data.debug}, null, 2);
      });
    })
    .catch((error) => {
      updateRegionPickStatus(String(error));
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
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
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

function updateLocalShiftStatus(message = null) {
  const count = (state.annotations.local_shift_corrections || []).length;
  if (!state.localShift.active) {
    localShiftStatus.textContent = [
      message,
      `shifts: ${count}`,
      state.selectedLocalShiftIndex !== null ? `selected: ${state.selectedLocalShiftIndex + 1}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const next = !state.localShift.movingPoint
    ? "Click a vertex on a selected moving polygon"
    : !state.localShift.referencePolygonId
      ? "Click the reference polygon"
      : !state.localShift.referencePoint
      ? "Click the reference point. It can be outside polygons."
      : "Shift ready";
  localShiftStatus.textContent = [
    message,
    `label: ${state.localShift.label || "auto"}`,
    `apply polygons: ${state.localShift.applyToPolygonIds.length}`,
    `moving: ${state.localShift.movingPolygonId || "-"}`,
    `reference: ${state.localShift.referencePolygonId || "-"}`,
    next,
  ].filter(Boolean).join("\n");
}

function startLocalShift() {
  if (!canEdit()) return;
  const applyToPolygonIds = selectedPolygonIds();
  if (!applyToPolygonIds.length) {
    updateLocalShiftStatus("Select polygon(s) to shift first.");
    return;
  }
  state.tool = "localShift";
  state.localShift = {
    active: true,
    label: localShiftLabelInput.value.trim(),
    applyToPolygonIds,
    movingPoint: null,
    movingPolygonId: null,
    movingLayer: null,
    referencePoint: null,
    referencePolygonId: null,
    referenceLayer: null,
    movingVertexIndex: null,
    movingHoleIndex: null,
  };
  updateLocalShiftStatus();
  draw();
}

function resetLocalShift() {
  state.tool = "select";
  state.localShift = {
    active: false,
    label: localShiftLabelInput.value.trim(),
    applyToPolygonIds: [],
    movingPoint: null,
    movingPolygonId: null,
    movingLayer: null,
    referencePoint: null,
    referencePolygonId: null,
    referenceLayer: null,
    movingVertexIndex: null,
    movingHoleIndex: null,
  };
  updateLocalShiftStatus();
  draw();
}

function nearestLocalShiftMovingVertex(world, maxScreenDistance = 18) {
  const applyIds = new Set(state.localShift.applyToPolygonIds || []);
  let best = null;
  for (const poly of allPolygons()) {
    if (!applyIds.has(poly.polygon_id)) continue;
    const vertex = nearestConnectionVertex(world, poly, maxScreenDistance);
    if (!vertex || vertex.polygonId !== poly.polygon_id) continue;
    if (!best || vertex.distance < best.distance) best = vertex;
  }
  return best;
}

function addLocalShiftPoint(world, poly) {
  if (!state.localShift.active) return;
  if (!state.localShift.movingPoint) {
    const vertex = nearestLocalShiftMovingVertex(world);
    if (!vertex) {
      updateLocalShiftStatus("Click a vertex on one of the selected moving polygons.");
      return;
    }
    const vertexPoly = vertex.poly || allPolygons().find((item) => item.polygon_id === vertex.polygonId);
    const layer = polygonLayerValue(vertexPoly);
    if (!layer) {
      updateLocalShiftStatus(`Set layer first: ${vertex.polygonId}`);
      return;
    }
    state.localShift.movingPoint = [Number(vertex.point[0].toFixed(2)), Number(vertex.point[1].toFixed(2))];
    state.localShift.movingPolygonId = vertex.polygonId;
    state.localShift.movingLayer = layer;
    state.localShift.movingVertexIndex = vertex.index;
    state.localShift.movingHoleIndex = vertex.holeIndex;
    updateLocalShiftStatus();
    draw();
    return;
  }
  if (!state.localShift.referencePolygonId) {
    if (!poly) {
      updateLocalShiftStatus("Click the reference polygon first.");
      return;
    }
    const layer = polygonLayerValue(poly);
    if (!layer) {
      updateLocalShiftStatus(`Set layer first: ${poly.polygon_id}`);
      return;
    }
    state.localShift.referencePolygonId = poly.polygon_id;
    state.localShift.referenceLayer = layer;
    updateLocalShiftStatus("Reference polygon selected. Now click the reference point.");
    draw();
    return;
  }
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  state.localShift.referencePoint = point;
  state.annotations.local_shift_corrections = state.annotations.local_shift_corrections || [];
  const index = state.annotations.local_shift_corrections.length + 1;
  const correctionId = `shift_${String(index).padStart(3, "0")}`;
  state.annotations.local_shift_corrections.push({
    correction_id: correctionId,
    type: "local_shift",
    label: state.localShift.label || correctionId,
    reference: {
      polygon_id: state.localShift.referencePolygonId,
      layer: state.localShift.referenceLayer,
      point_source: state.localShift.referencePoint,
    },
    moving: {
      polygon_id: state.localShift.movingPolygonId,
      layer: state.localShift.movingLayer,
      point_source: state.localShift.movingPoint,
      vertex_index: state.localShift.movingVertexIndex,
      hole_index: state.localShift.movingHoleIndex,
    },
    apply_to_polygon_ids: state.localShift.applyToPolygonIds,
    move_attached_annotations: true,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetLocalShift();
    updateLocalShiftStatus(`${correctionId} saved.`);
  });
}

function nearestLocalShift(world, maxScreenDistance = 12) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.local_shift_corrections || []).forEach((correction, index) => {
    const from = correction.moving?.point_source;
    const to = correction.reference?.point_source;
    if (!from || !to) return;
    const projected = projectPointToSegment(world, from, to);
    const projectedScreen = worldToScreen(projected);
    const distance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {index, distance};
    }
  });
  return best;
}

function selectLocalShift(world) {
  const hit = nearestLocalShift(world);
  if (!hit) {
    state.selectedLocalShiftIndex = null;
    updateLocalShiftStatus();
    draw();
    return false;
  }
  state.selectedLocalShiftIndex = hit.index;
  state.selectedLayerAlignIndex = null;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedSubwayId = null;
  state.selectedId = null;
  state.selectedIds = [];
  updateSelectedInfo();
  updateLocalShiftStatus(`Selected local shift ${hit.index + 1}.`);
  draw();
  return true;
}

function deleteSelectedLocalShift() {
  if (state.selectedLocalShiftIndex === null) {
    updateLocalShiftStatus("Select a local shift first.");
    return;
  }
  state.annotations.local_shift_corrections = state.annotations.local_shift_corrections || [];
  if (state.selectedLocalShiftIndex < 0 || state.selectedLocalShiftIndex >= state.annotations.local_shift_corrections.length) {
    state.selectedLocalShiftIndex = null;
    updateLocalShiftStatus("Selected local shift is missing.");
    draw();
    return;
  }
  const removed = state.annotations.local_shift_corrections.splice(state.selectedLocalShiftIndex, 1)[0];
  state.selectedLocalShiftIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalShiftStatus(`Deleted ${removed.label || removed.correction_id || "local shift"}.`);
    draw();
  });
}

function deleteAllLocalShifts() {
  state.annotations.local_shift_corrections = state.annotations.local_shift_corrections || [];
  const removed = state.annotations.local_shift_corrections.length;
  state.annotations.local_shift_corrections = [];
  state.selectedLocalShiftIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalShiftStatus(`Deleted ${removed} local shift(s).`);
    draw();
  });
}

function undoLastLocalShift() {
  state.annotations.local_shift_corrections = state.annotations.local_shift_corrections || [];
  const removed = state.annotations.local_shift_corrections.pop();
  if (!removed) {
    updateLocalShiftStatus("No local shift to undo.");
    return;
  }
  state.selectedLocalShiftIndex = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalShiftStatus(`Removed ${removed.label || removed.correction_id || "local shift"}.`);
    draw();
  });
}

function updateLocalAxisStatus(message = null) {
  const count = Object.keys(state.annotations.polygon_axis_corrections || {}).length;
  const targetCount = state.localAxis.active && state.localAxis.polygonId
    ? selectedLocalAxisTargetIds(state.localAxis.polygonId).length
    : (state.selectedIds || []).length;
  if (!state.localAxis.active) {
    localAxisStatus.textContent = [
      message,
      `saved: ${count}`,
      targetCount > 1 ? `selected targets: ${targetCount}` : null,
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
    targetCount > 1 ? `targets: ${targetCount}` : null,
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
  const sourcePolygonId = state.localAxis.polygonId;
  const targetPolygonIds = selectedLocalAxisTargetIds(sourcePolygonId);
  targetPolygonIds.forEach((polygonId) => {
    state.annotations.polygon_axis_corrections[polygonId] = {
      type: "orthogonal_3point",
      source_polygon_id: sourcePolygonId,
      origin,
      x_axis_point: xAxisPoint,
      y_axis_point: yAxisPoint,
      target_angle_degrees: 90,
    };
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetLocalAxisCorrection();
    updateLocalAxisStatus(`Saved local axis for ${targetPolygonIds.length} polygon(s).`);
  });
}

function deleteSelectedLocalAxisCorrection() {
  const targetIds = state.selectedIds.length ? state.selectedIds : (state.selectedId ? [state.selectedId] : []);
  if (!targetIds.length) {
    updateLocalAxisStatus("Select a polygon first.");
    return;
  }
  state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
  const deletedIds = targetIds.filter((polygonId) => state.annotations.polygon_axis_corrections[polygonId]);
  if (!deletedIds.length) {
    updateLocalAxisStatus(`No local axis on selected polygon(s).`);
    return;
  }
  deletedIds.forEach((polygonId) => {
    delete state.annotations.polygon_axis_corrections[polygonId];
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateLocalAxisStatus(`Deleted local axis for ${deletedIds.length} polygon(s).`);
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

function selectedExitNumber() {
  return exitNumberInput?.value?.trim() || "";
}

function isExitConnectionType(type) {
  return type === "exit_stair" || type === "exit_escalator";
}

function nextExitNumber() {
  const numbers = (state.annotations.manual_connections || [])
    .filter((conn) => isExitConnectionType(conn.type))
    .map((conn) => {
      const match = String(conn.exit_number || "").match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    });
  return String(Math.max(0, ...numbers) + 1);
}

function selectedOrNextExitNumber() {
  return selectedExitNumber() || nextExitNumber();
}

function selectedExitLength() {
  const value = Number(exitLengthInput?.value || 100);
  return Number.isFinite(value) && value > 0 ? value : 100;
}

function selectedExitRise() {
  const value = Number(exitRiseInput?.value || 5);
  return Number.isFinite(value) ? value : 5;
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

function averagePoint(points) {
  const valid = (points || []).filter((point) => point && point.length >= 2);
  if (!valid.length) return [0, 0];
  const sum = valid.reduce((acc, point) => [acc[0] + Number(point[0]), acc[1] + Number(point[1])], [0, 0]);
  return [sum[0] / valid.length, sum[1] / valid.length];
}

function perpendicularFacingFromLine(anchorPoint, lineStart, lineEnd, length = 50) {
  const dx = Number(lineEnd[0]) - Number(lineStart[0]);
  const dy = Number(lineEnd[1]) - Number(lineStart[1]);
  const lineLength = Math.hypot(dx, dy);
  if (!Number.isFinite(lineLength) || lineLength <= 1e-6) return null;
  const normalA = [-dy / lineLength, dx / lineLength];
  const normalB = [dy / lineLength, -dx / lineLength];
  const lineCenter = midpoint(lineStart, lineEnd);
  const toAnchor = [
    Number(anchorPoint[0]) - Number(lineCenter[0]),
    Number(anchorPoint[1]) - Number(lineCenter[1]),
  ];
  const dotA = (normalA[0] * toAnchor[0]) + (normalA[1] * toAnchor[1]);
  const normal = dotA >= 0 ? normalA : normalB;
  const facingPoint = [
    Number((Number(anchorPoint[0]) + normal[0] * length).toFixed(2)),
    Number((Number(anchorPoint[1]) + normal[1] * length).toFixed(2)),
  ];
  return {
    point: facingPoint,
    angleDeg: Number((Math.atan2(normal[1], normal[0]) * 180 / Math.PI).toFixed(6)),
  };
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

function exitLineFromDirection(referenceLine, directionPoint, length) {
  const center = midpoint(referenceLine[0], referenceLine[1]);
  const dx = Number(directionPoint[0]) - Number(center[0]);
  const dy = Number(directionPoint[1]) - Number(center[1]);
  const distance = Math.hypot(dx, dy);
  if (!Number.isFinite(distance) || distance < 1e-6) return null;
  const endCenter = [
    Number((Number(center[0]) + (dx / distance) * Number(length)).toFixed(2)),
    Number((Number(center[1]) + (dy / distance) * Number(length)).toFixed(2)),
  ];
  return {
    center,
    endCenter,
    endLine: parallelLineThroughCenter(referenceLine, endCenter),
  };
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
  const exitStairCount = (state.annotations.manual_connections || []).filter((conn) => conn.type === "exit_stair").length;
  const exitEscalatorCount = (state.annotations.manual_connections || []).filter((conn) => conn.type === "exit_escalator").length;
  const currentType = state.stair.active ? state.stair.connectionType : selectedConnectionType();
  const selectedIds = selectedStairConnectionIds();
  if (!state.stair.active) {
    stairStatus.textContent = [
      message,
      `stairs: ${stairCount}`,
      `escalators: ${escalatorCount}`,
      `exit stairs: ${exitStairCount}`,
      `exit escalators: ${exitEscalatorCount}`,
      selectedIds.length ? `selected ${selectedIds.length}: ${selectedIds.join(", ")}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const fromCount = (state.stair.fromPoints || []).length;
  const toCount = (state.stair.toPoints || []).length;
  const next = fromCount < 2
    ? `Click ${currentType} start line point ${fromCount + 1}/2`
    : isExitConnectionType(currentType)
      ? `Click exit direction point`
      : `Click ${currentType} end center point`;
  stairStatus.textContent = [
    message,
    `mode: ${currentType} connection`,
    isExitConnectionType(currentType) ? "schema: start line + direction + length" : "schema: start line + end center",
    `start line: ${fromCount}/2`,
    `end line: ${toCount ? "auto" : "-"}`,
    `from: ${state.stair.fromLayer || "-"} (${state.stair.fromPolygonId || "-"})`,
    `to: ${state.stair.toLayer || "-"} (${state.stair.toPolygonId || "-"})`,
    state.stair.nextPolygonId ? `next point polygon: ${state.stair.nextPolygonId}` : null,
    state.stair.pickingPolygon ? "pick mode: click polygon for next point" : null,
    isExitConnectionType(currentType) ? `exit: ${state.stair.exitNumber || "auto"}` : null,
    isExitConnectionType(currentType) ? `length px: ${state.stair.exitLength}` : null,
    `label: ${state.stair.label || "auto"}`,
    `stairs: ${stairCount}`,
    `escalators: ${escalatorCount}`,
    `exit stairs: ${exitStairCount}`,
    `exit escalators: ${exitEscalatorCount}`,
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
    exitNumber: selectedOrNextExitNumber(),
    exitLength: selectedExitLength(),
    exitRise: selectedExitRise(),
    fromPoints: [],
    toPoints: [],
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverVertex: null,
    nextPolygonId: null,
    pickingPolygon: false,
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
    exitNumber: selectedOrNextExitNumber(),
    exitLength: selectedExitLength(),
    exitRise: selectedExitRise(),
    fromPoints: [],
    toPoints: [],
    fromPoint: null,
    fromLayer: null,
    fromPolygonId: null,
    toPoint: null,
    toLayer: null,
    toPolygonId: null,
    hoverVertex: null,
    nextPolygonId: null,
    pickingPolygon: false,
  };
  updateStairStatus();
  draw();
}

function stairNextPointPolygon() {
  if (!state.stair.nextPolygonId) return null;
  return allPolygons().find((poly) => poly.polygon_id === state.stair.nextPolygonId) || null;
}

function startStairPolygonPick() {
  if (!state.stair.active) {
    updateStairStatus("Start a connection first.");
    return;
  }
  state.stair.pickingPolygon = true;
  updateStairStatus("Click polygon to use for the next connection point.");
  draw();
}

function setStairNextPolygon(poly) {
  if (!state.stair.active) {
    updateStairStatus("Start a connection first.");
    return;
  }
  if (!poly) {
    updateStairStatus("Select or click a polygon first.");
    return;
  }
  state.stair.nextPolygonId = poly.polygon_id;
  state.stair.pickingPolygon = false;
  updateStairStatus(`Next point polygon fixed: ${poly.polygon_id}`);
  draw();
}

function useSelectedStairPolygon() {
  setStairNextPolygon(selectedPolygon());
}

function pickStairPolygonAt(world) {
  const poly = findPolygonAt(world);
  setStairNextPolygon(poly);
}

function addStairPoint(world, poly) {
  if (!state.stair.active) return;
  const connectionType = state.stair.connectionType || selectedConnectionType();
  const fixedPoly = stairNextPointPolygon();
  const targetPoly = fixedPoly || poly;
  const snap = nearestConnectionVertex(world, targetPoly, 14, Boolean(fixedPoly));
  if (snap) {
    poly = snap.poly;
  } else if (fixedPoly) {
    poly = fixedPoly;
  }
  const rawPoint = snap ? snap.point : [world.x, world.y];
  const point = [Number(rawPoint[0].toFixed(2)), Number(rawPoint[1].toFixed(2))];
  const clearNextPolygon = () => {
    state.stair.nextPolygonId = null;
    state.stair.pickingPolygon = false;
  };
  state.stair.fromPoints = state.stair.fromPoints || [];
  state.stair.toPoints = state.stair.toPoints || [];
  if (state.stair.fromPoints.length < 2) {
    if (!poly) {
      updateStairStatus("Click start line points inside a polygon.");
      return;
    }
    const layer = polygonLayerValue(poly);
    if (!layer) {
      updateStairStatus(`Set layer first: ${poly.polygon_id}`);
      return;
    }
    state.stair.fromPoints.push(point);
    state.stair.fromPoint = state.stair.fromPoints.length === 2
      ? midpoint(state.stair.fromPoints[0], state.stair.fromPoints[1])
      : point;
    state.stair.fromLayer = layer;
    state.stair.fromPolygonId = poly.polygon_id;
    clearNextPolygon();
    updateStairStatus();
    draw();
    return;
  }
  const connectionId = nextTypedConnectionId(connectionType);
  let record = null;
  if (isExitConnectionType(connectionType)) {
    const generated = exitLineFromDirection(state.stair.fromPoints, point, state.stair.exitLength || selectedExitLength());
    if (!generated) {
      updateStairStatus("Click a direction point away from the start line.");
      return;
    }
    state.stair.toLayer = "OUTSIDE";
    state.stair.toPolygonId = null;
    state.stair.toPoint = generated.endCenter;
    state.stair.toPoints = generated.endLine;
    const exitNumber = state.stair.exitNumber || selectedOrNextExitNumber();
    record = {
      connection_id: connectionId,
      type: connectionType,
      asset_type: connectionType === "exit_escalator" ? "escalator" : "stair",
      connection_schema: "start_line_direction_length_v1",
      label: state.stair.label || (exitNumber ? `exit_${exitNumber}` : connectionId),
      exit_number: exitNumber || null,
      exit_length_source: state.stair.exitLength || selectedExitLength(),
      exit_rise: state.stair.exitRise ?? selectedExitRise(),
      direction_point_source: point,
      from_polygon_id: state.stair.fromPolygonId,
      to_polygon_id: null,
      from_layer: state.stair.fromLayer,
      to_layer: "OUTSIDE",
      from_point_source: state.stair.fromPoint,
      to_point_source: state.stair.toPoint,
      from_points_source: state.stair.fromPoints,
      to_points_source: state.stair.toPoints,
      to_point_mode: "direction_length_generated_parallel_line",
      bidirectional: true,
    };
  } else {
    if (!poly) {
      updateStairStatus("Click end center inside a polygon.");
      return;
    }
    const layer = polygonLayerValue(poly);
    if (!layer) {
      updateStairStatus(`Set layer first: ${poly.polygon_id}`);
      return;
    }
    state.stair.toLayer = layer;
    state.stair.toPolygonId = poly.polygon_id;
    state.stair.toPoint = point;
    state.stair.toPoints = parallelLineThroughCenter(state.stair.fromPoints, point);
    record = {
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
    };
  }
  state.annotations.manual_connections = state.annotations.manual_connections || [];
  state.annotations.manual_connections.push(record);
  clearNextPolygon();
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
    if (!VERTICAL_CONNECTION_TYPES.includes(conn.type) || !conn.from_point_source || !conn.to_point_source) return;
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
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
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
    (conn, index) => !VERTICAL_CONNECTION_TYPES.includes(conn.type) || !selected.has(stairConnectionId(conn, index)),
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
  state.annotations.manual_connections = state.annotations.manual_connections.filter((conn) => !VERTICAL_CONNECTION_TYPES.includes(conn.type));
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
    if (!VERTICAL_CONNECTION_TYPES.includes(state.annotations.manual_connections[index].type)) continue;
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

function nextWallId() {
  const numbers = (state.annotations.manual_walls || [])
    .map((wall) => {
      const match = String(wall.wall_id || "").match(/^wall_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  return `wall_${String(Math.max(0, ...numbers) + 1).padStart(3, "0")}`;
}

function selectedWallHeight() {
  const value = Number(wallHeightInput?.value || 1);
  return Number.isFinite(value) && value >= 0 ? value : 1;
}

function updateWallStatus(message = null) {
  const count = (state.annotations.manual_walls || []).length;
  const sourceCount = new Set(state.wall.pointPolygonIds || []).size;
  if (!state.wall.active) {
    wallStatus.textContent = [
      message,
      `walls: ${count}`,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  wallStatus.textContent = [
    message,
    `label: ${state.wall.label || "auto"}`,
    `height: ${state.wall.height}`,
    `layer: ${state.wall.layer || "-"}`,
    `points: ${(state.wall.points || []).length}`,
    sourceCount > 1 ? `polygons: ${sourceCount}` : null,
    state.wall.lastSnap ? `snap: ${state.wall.lastSnap}` : null,
    "Click points to continue the wall path.",
  ].filter(Boolean).join("\n");
}

function startWallPath() {
  if (!canEdit()) return;
  state.tool = "wall";
  state.wall = {
    active: true,
    label: wallLabelInput.value.trim(),
    height: selectedWallHeight(),
    points: [],
    pointPolygonIds: [],
    pointLayers: [],
    layer: null,
    polygonId: null,
    hoverSnap: null,
  };
  updateWallStatus();
  draw();
}

function resetWallPath() {
  state.tool = "select";
  state.wall = {
    active: false,
    label: wallLabelInput.value.trim(),
    height: selectedWallHeight(),
    points: [],
    pointPolygonIds: [],
    pointLayers: [],
    layer: null,
    polygonId: null,
    hoverSnap: null,
  };
  updateWallStatus();
  draw();
}

function addWallPoint(world, poly) {
  if (!state.wall.active) return;
  const snap = snapWallPoint(world, poly);
  const point = [Number(snap.point[0].toFixed(2)), Number(snap.point[1].toFixed(2))];
  poly = snap.poly || poly;
  if ((state.wall.points || []).length === 0) {
    if (!poly) {
      updateWallStatus("First wall point must be inside a polygon.");
      return;
    }
    const layer = polygonLayerValue(poly);
    if (!layer) {
      updateWallStatus(`Set layer first: ${poly.polygon_id}`);
      return;
    }
    state.wall.layer = layer;
    state.wall.polygonId = poly.polygon_id;
  }
  if (!poly) {
    updateWallStatus("Click inside or near a polygon edge/vertex.");
    return;
  }
  const layer = polygonLayerValue(poly);
  if (!layer) {
    updateWallStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  state.wall.points = state.wall.points || [];
  state.wall.pointPolygonIds = state.wall.pointPolygonIds || [];
  state.wall.pointLayers = state.wall.pointLayers || [];
  state.wall.points.push(point);
  state.wall.pointPolygonIds.push(poly.polygon_id);
  state.wall.pointLayers.push(layer);
  state.wall.lastSnap = snap.source;
  updateWallStatus();
  draw();
}

function undoWallPoint() {
  if (!state.wall.active || !(state.wall.points || []).length) return;
  state.wall.points.pop();
  if (state.wall.pointPolygonIds) state.wall.pointPolygonIds.pop();
  if (state.wall.pointLayers) state.wall.pointLayers.pop();
  if (state.wall.points.length === 0) {
    state.wall.layer = null;
    state.wall.polygonId = null;
    state.wall.pointPolygonIds = [];
    state.wall.pointLayers = [];
  }
  updateWallStatus();
  draw();
}

function applyWallPath() {
  if (!state.wall.active) return;
  if ((state.wall.points || []).length < 2) {
    updateWallStatus("Wall path needs at least 2 points.");
    return;
  }
  const wallId = nextWallId();
  const pointPolygonIds = state.wall.pointPolygonIds || [];
  const pointLayers = state.wall.pointLayers || [];
  const sourcePolygonIds = Array.from(new Set(pointPolygonIds.filter(Boolean)));
  state.annotations.manual_walls = state.annotations.manual_walls || [];
  state.annotations.manual_walls.push({
    wall_id: wallId,
    type: "manual_wall_path",
    label: state.wall.label || wallId,
    height: state.wall.height,
    source_polygon_ids: sourcePolygonIds,
    point_polygon_ids: pointPolygonIds,
    point_layers: pointLayers,
    points_source: state.wall.points,
    semantic: {
      layer: state.wall.layer || null,
      line: null,
      zone_type: "wall",
      label: state.wall.label || wallId,
      confidence: 1.0,
    },
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetWallPath();
    updateWallStatus(`${wallId} saved.`);
  });
}

function deleteAllWalls() {
  state.annotations.manual_walls = state.annotations.manual_walls || [];
  const removed = state.annotations.manual_walls.length;
  state.annotations.manual_walls = [];
  state.selectedWallId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateWallStatus(`Deleted ${removed} walls.`);
    draw();
  });
}

function undoLastWall() {
  state.annotations.manual_walls = state.annotations.manual_walls || [];
  const removed = state.annotations.manual_walls.pop();
  if (!removed) {
    updateWallStatus("No wall to undo.");
    return;
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateWallStatus(`Removed ${removed.wall_id || removed.label}.`);
    draw();
  });
}

function nearestWallPath(world, maxScreenDistance = 12) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_walls || []).forEach((wall, index) => {
    const points = wall.points_source || [];
    if (points.length < 2) return;
    points.slice(0, -1).forEach((point, pointIndex) => {
      const projected = projectPointToSegment(world, point, points[pointIndex + 1]);
      const projectedScreen = worldToScreen(projected);
      const distance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {
          index,
          wallId: wall.wall_id || wall.label || `wall_${index + 1}`,
          distance,
        };
      }
    });
  });
  return best;
}

function selectWallPath(world) {
  const hit = nearestWallPath(world);
  if (!hit) {
    state.selectedWallId = null;
    updateWallStatus();
    draw();
    return false;
  }
  state.selectedWallId = hit.wallId;
  state.selectedId = null;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedSubwayId = null;
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  updateSelectedInfo();
  updateWallStatus(`Selected ${hit.wallId}.`);
  draw();
  return true;
}

function deleteSelectedWallPath() {
  if (!state.selectedWallId) {
    updateWallStatus("Select a wall first.");
    return;
  }
  state.annotations.manual_walls = state.annotations.manual_walls || [];
  const before = state.annotations.manual_walls.length;
  state.annotations.manual_walls = state.annotations.manual_walls.filter(
    (wall, index) => (wall.wall_id || wall.label || `wall_${index + 1}`) !== state.selectedWallId,
  );
  const removed = before - state.annotations.manual_walls.length;
  const removedId = state.selectedWallId;
  state.selectedWallId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateWallStatus(`Deleted ${removedId} (${removed}).`);
    draw();
  });
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

function selectedGateCount() {
  const value = Number(gateCountInput?.value || 2);
  return Number.isFinite(value) && value >= 2 ? Math.round(value) : 2;
}

function selectedPlatformMode() {
  return "line";
}

function selectedPlatformCarCount() {
  const value = Number(platformCarCountInput?.value || 10);
  return Number.isFinite(value) && value >= 1 ? Math.round(value) : 10;
}

function selectedPlatformDoorsPerCar() {
  const value = Number(platformDoorsPerCarInput?.value || 4);
  return Number.isFinite(value) && value >= 1 ? Math.round(value) : 4;
}

function manualAssetBlend(type) {
  if (type === "ticket_gate") return "TicketGate.blend";
  if (type === "moving_walkway") return "MovingWalkway.blend";
  if (type === "exit") return "Exit.blend";
  if (type === "toilet") return "Toilet.blend";
  return "Subway.blend";
}

function manualAssetDisplayName(type) {
  if (type === "ticket_gate") return "ticket gate";
  if (type === "moving_walkway") return "moving walkway";
  if (type === "exit") return "exit point";
  if (type === "toilet") return "toilet point";
  return "subway train";
}

function manualAssetColor(type, alpha = 0.9) {
  if (type === "ticket_gate") return `rgba(210, 31, 60, ${alpha})`;
  if (type === "moving_walkway") return `rgba(0, 190, 140, ${alpha})`;
  if (type === "exit") return `rgba(255, 176, 0, ${alpha})`;
  if (type === "toilet") return `rgba(120, 70, 255, ${alpha})`;
  return `rgba(0, 120, 255, ${alpha})`;
}

function manualAssetLabelColor(type) {
  if (type === "ticket_gate") return "#d21f3c";
  if (type === "moving_walkway") return "#00a878";
  if (type === "exit") return "#c47b00";
  if (type === "toilet") return "#7846ff";
  return "#0078ff";
}

function manualAssetPointColor(type, index) {
  if (type === "ticket_gate") return index === 0 ? "#ff5a6f" : "#d21f3c";
  if (type === "moving_walkway") return index === 0 ? "#00d29a" : "#00a878";
  if (type === "exit") return "#ffb000";
  if (type === "toilet") return index === 0 ? "#7846ff" : "#b39cff";
  return index === 0 ? "#00aaff" : "#0078ff";
}

function pathCenter(points) {
  if (!points || !points.length) return null;
  if (points.length === 1) return points[0];
  const totalLength = points.slice(0, -1).reduce((total, point, index) => {
    const next = points[index + 1];
    return total + Math.hypot(next[0] - point[0], next[1] - point[1]);
  }, 0);
  if (totalLength <= 0) return points[0];
  const target = totalLength / 2;
  let walked = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index];
    const end = points[index + 1];
    const length = Math.hypot(end[0] - start[0], end[1] - start[1]);
    if (walked + length >= target) {
      const ratio = length > 0 ? (target - walked) / length : 0;
      return [
        Number((start[0] + (end[0] - start[0]) * ratio).toFixed(2)),
        Number((start[1] + (end[1] - start[1]) * ratio).toFixed(2)),
      ];
    }
    walked += length;
  }
  return points[points.length - 1];
}

function pathRotationDegrees(points) {
  if (!points || points.length < 2) return 0.0;
  const start = points[0];
  const end = points[points.length - 1];
  return Math.atan2(end[1] - start[1], end[0] - start[0]) * 180 / Math.PI;
}

function selectedManualExitNumber() {
  return manualExitNumberInput?.value?.trim() || "";
}

function nextManualExitNumber() {
  const connectionNumbers = (state.annotations.manual_connections || [])
    .filter((conn) => isExitConnectionType(conn.type))
    .map((conn) => {
      const match = String(conn.exit_number || "").match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    });
  const assetNumbers = (state.annotations.manual_assets || [])
    .filter((asset) => asset.type === "exit")
    .map((asset) => {
      const match = String(asset.exit_number || asset.number || asset.label || "").match(/(\d+)/);
      return match ? Number(match[1]) : 0;
    });
  return String(Math.max(0, ...connectionNumbers, ...assetNumbers) + 1);
}

function selectedOrNextManualExitNumber() {
  return selectedManualExitNumber() || nextManualExitNumber();
}

function updateSubwayStatus(message = null) {
  const subwayCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "subway").length;
  const walkwayCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "moving_walkway").length;
  const gateCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "ticket_gate").length;
  const exitCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "exit").length;
  const toiletCount = (state.annotations.manual_assets || []).filter((asset) => asset.type === "toilet").length;
  const currentType = state.subway.active ? state.subway.assetType : selectedManualAssetType();
  if (!state.subway.active) {
    subwayStatus.textContent = [
      message,
      `subways: ${subwayCount}`,
      `moving walkways: ${walkwayCount}`,
      `ticket gates: ${gateCount}`,
      `exits: ${exitCount}`,
      `toilets: ${toiletCount}`,
      state.selectedSubwayId ? `selected: ${state.selectedSubwayId}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  const pointOnly = currentType === "exit";
  const facingPointAsset = currentType === "toilet";
  const pathAsset = currentType === "ticket_gate";
  const toiletDirectionCount = (state.subway.directionVertices || []).length;
  subwayStatus.textContent = [
    message,
    `mode: ${manualAssetDisplayName(currentType)}`,
    `label: ${state.subway.label || "auto"}`,
    pathAsset ? `gate count: ${state.subway.gateCount || selectedGateCount()}` : null,
    pointOnly ? `exit: ${state.subway.exitNumber || selectedOrNextManualExitNumber()}` : null,
    facingPointAsset ? `toilet: ${toiletGenderInput?.value || "both"}` : null,
    `points: ${(state.subway.points || []).length}/${pointOnly ? 1 : (pathAsset ? "path" : 2)}`,
    facingPointAsset && (state.subway.points || []).length >= 1 ? `direction vertices: ${toiletDirectionCount}/2` : null,
    pathAsset
      ? "Click gate path points. Shift applies."
      : facingPointAsset
      ? ((state.subway.points || []).length < 1 ? "Click toilet point inside a polygon" : `Click existing polygon vertex for direction ${toiletDirectionCount + 1}/2.`)
      : pointOnly
      ? "Click exit point inside a polygon"
      : ((state.subway.points || []).length < 1 ? "Click asset start point" : "Click asset end point"),
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
    gateCount: selectedGateCount(),
    exitNumber: selectedOrNextManualExitNumber(),
    directionVertices: [],
    directionVertexRefs: [],
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
    gateCount: selectedGateCount(),
    exitNumber: selectedOrNextManualExitNumber(),
    directionVertices: [],
    directionVertexRefs: [],
  };
  updateSubwayStatus();
  draw();
}

function addSubwayAsset(world, poly) {
  if (!state.subway.active) return;
  const assetType = state.subway.assetType || selectedManualAssetType();
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  state.subway.points = state.subway.points || [];
  const selectingToiletDirection = assetType === "toilet" && state.subway.points.length >= 1;
  if (!poly && !selectingToiletDirection) {
    updateSubwayStatus("Click inside a polygon.");
    return;
  }
  const layer = poly ? polygonLayerValue(poly) : state.subway.layer;
  if (!layer && !selectingToiletDirection) {
    updateSubwayStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  if (assetType === "ticket_gate") {
    state.subway.points.push(point);
    if (!state.subway.polygonId) state.subway.polygonId = poly.polygon_id;
    if (!state.subway.layer) state.subway.layer = layer;
    updateSubwayStatus();
    draw();
    return;
  }
  if (assetType === "exit") {
    const assetId = nextManualAssetId(assetType);
    const exitNumber = state.subway.exitNumber || selectedOrNextManualExitNumber();
    state.annotations.manual_assets = state.annotations.manual_assets || [];
    state.annotations.manual_assets.push({
      asset_id: assetId,
      type: assetType,
      blend: manualAssetBlend(assetType),
      label: state.subway.label || (exitNumber ? `exit_${exitNumber}` : assetId),
      exit_number: exitNumber || null,
      number: exitNumber || null,
      polygon_id: poly.polygon_id,
      layer,
      point_source: point,
      start_point_source: null,
      end_point_source: null,
      rotation_z: 0.0,
      scale: [1.0, 1.0, 1.0],
      navigation: {node_type: "exit", access_transition: "outside", cost: 0},
    });
    saveAnnotations().then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
      resetSubwayPlacement();
      updateSubwayStatus(`${assetId} saved.`);
    });
    return;
  }
  if (assetType === "toilet") {
    if (state.subway.points.length < 1) {
      state.subway.points.push(point);
      state.subway.polygonId = poly.polygon_id;
      state.subway.layer = layer;
      updateSubwayStatus();
      draw();
      return;
    }
    const start = state.subway.points[0];
    const hover = nearestConnectionVertex(world, poly, 18);
    if (!hover) {
      updateSubwayStatus("Click near an existing polygon vertex for toilet direction.");
      return;
    }
    state.subway.directionVertices = state.subway.directionVertices || [];
    state.subway.directionVertexRefs = state.subway.directionVertexRefs || [];
    state.subway.directionVertices.push([
      Number(hover.point[0].toFixed(2)),
      Number(hover.point[1].toFixed(2)),
    ]);
    state.subway.directionVertexRefs.push({
      polygon_id: hover.polygonId,
      hole_index: hover.holeIndex,
      vertex_index: hover.index,
    });
    if (state.subway.directionVertices.length < 2) {
      updateSubwayStatus("Direction vertex 1 set. Click direction vertex 2/2.");
      draw();
      return;
    }
    const directionStart = state.subway.directionVertices[0];
    const directionEnd = state.subway.directionVertices[1];
    const perpendicularFacing = perpendicularFacingFromLine(start, directionStart, directionEnd, 50);
    if (!perpendicularFacing) {
      state.subway.directionVertices.pop();
      state.subway.directionVertexRefs.pop();
      updateSubwayStatus("Direction vertices must be different.");
      draw();
      return;
    }
    const assetId = nextManualAssetId(assetType);
    state.annotations.manual_assets = state.annotations.manual_assets || [];
    state.annotations.manual_assets.push({
      asset_id: assetId,
      type: assetType,
      blend: manualAssetBlend(assetType),
      label: state.subway.label || assetId,
      polygon_id: state.subway.polygonId,
      layer: state.subway.layer,
      point_source: start,
      facing_point_source: perpendicularFacing.point,
      facing_angle_deg: perpendicularFacing.angleDeg,
      direction_points_source: state.subway.directionVertices,
      direction_vertex_refs: state.subway.directionVertexRefs,
      facing_mode: "perpendicular_to_existing_vertex_line",
      toilet_gender: toiletGenderInput?.value || "both",
      rotation_z: perpendicularFacing.angleDeg,
      scale: [1.0, 1.0, 1.0],
      navigation: {node_type: "poi", poi_type: "toilet", cost: 0},
    });
    saveAnnotations().then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
      resetSubwayPlacement();
      updateSubwayStatus(`${assetId} saved.`);
    });
    return;
  }
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
    gate_type: assetType === "ticket_gate" ? "ticket_gate" : null,
    navigation: assetType === "ticket_gate"
      ? {node_type: "gate", access_transition: "public_paid", cost: 10}
      : null,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetSubwayPlacement();
    updateSubwayStatus(`${assetId} saved.`);
  });
}

function applySubwayPlacement() {
  if (!canEdit()) return;
  const assetType = state.subway.assetType || selectedManualAssetType();
  if (!state.subway.active || assetType !== "ticket_gate") return;
  const points = state.subway.points || [];
  if (points.length < 2) {
    updateSubwayStatus("Ticket gate needs at least 2 path points.");
    return;
  }
  const assetId = nextManualAssetId(assetType);
  const center = pathCenter(points);
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  state.annotations.manual_assets.push({
    asset_id: assetId,
    type: assetType,
    blend: manualAssetBlend(assetType),
    label: state.subway.label || assetId,
    polygon_id: state.subway.polygonId,
    layer: state.subway.layer,
    point_source: center,
    points_source: points,
    start_point_source: points[0],
    end_point_source: points[points.length - 1],
    rotation_z: pathRotationDegrees(points),
    scale: [1.0, 1.0, 1.0],
    gate_count: state.subway.gateCount || selectedGateCount(),
    gate_width: 1.0,
    passage_width: 1.0,
    gate_type: "ticket_gate",
    navigation: {node_type: "gate", access_transition: "public_paid", cost: 10},
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetSubwayPlacement();
    updateSubwayStatus(`${assetId} saved.`);
  });
}

function undoSubwayPoint() {
  if (!state.subway.active || !(state.subway.points || []).length) return;
  state.subway.points.pop();
  if (!state.subway.points.length) {
    state.subway.polygonId = null;
    state.subway.layer = null;
  }
  updateSubwayStatus();
  draw();
}

function nearestSubwayAsset(world, maxScreenDistance = 14) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_assets || []).forEach((asset, index) => {
    if (!MANUAL_ASSET_TYPES.includes(asset.type) || !asset.point_source) return;
    let distance;
    const assetPath = asset.points_source || (asset.start_point_source && asset.end_point_source ? [asset.start_point_source, asset.end_point_source] : null);
    if (assetPath && assetPath.length >= 2) {
      distance = Math.min(...assetPath.slice(0, -1).map((point, pointIndex) => {
        const projected = projectPointToSegment(world, point, assetPath[pointIndex + 1]);
        const projectedScreen = worldToScreen(projected);
        return Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
      }));
    } else {
      const screen = worldToScreen(asset.point_source);
      distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
    }
    if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
      best = {index, assetId: asset.asset_id || asset.label || `${asset.type}_${index + 1}`, distance};
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
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedWallId = null;
  state.selectedLayerAlignIndex = null;
  state.selectedId = null;
  updateSelectedInfo();
  updateSubwayStatus(`Selected ${hit.assetId}.`);
  draw();
  return true;
}

function deleteSelectedSubwayAsset() {
  if (!state.selectedSubwayId) {
    updateSubwayStatus("Select a map asset first.");
    return;
  }
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  const index = state.annotations.manual_assets.findIndex(
    (asset) => MANUAL_ASSET_TYPES.includes(asset.type) && (asset.asset_id || asset.label) === state.selectedSubwayId,
  );
  if (index < 0) {
    state.selectedSubwayId = null;
    updateSubwayStatus("Selected map asset is missing.");
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
  state.annotations.manual_assets = state.annotations.manual_assets.filter((asset) => !MANUAL_ASSET_TYPES.includes(asset.type));
  const removed = before - state.annotations.manual_assets.length;
  state.selectedSubwayId = null;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateSubwayStatus(`Deleted ${removed} map assets.`);
    draw();
  });
}

function undoLastSubwayAsset() {
  state.annotations.manual_assets = state.annotations.manual_assets || [];
  for (let index = state.annotations.manual_assets.length - 1; index >= 0; index -= 1) {
    if (!MANUAL_ASSET_TYPES.includes(state.annotations.manual_assets[index].type)) continue;
    const removed = state.annotations.manual_assets.splice(index, 1)[0];
    state.selectedSubwayId = null;
    saveAnnotations().then((result) => {
      saveResult.textContent = JSON.stringify(result, null, 2);
      updateSubwayStatus(`Removed ${removed.asset_id || removed.label}.`);
      draw();
    });
    return;
  }
  updateSubwayStatus("No map asset to undo.");
}

function nextPlatformId() {
  const numbers = (state.annotations.manual_platforms || [])
    .map((platform) => {
      const match = String(platform.platform_id || "").match(/^platform_(\d+)$/);
      return match ? Number(match[1]) : 0;
    });
  const next = Math.max(0, ...numbers) + 1;
  return `platform_${String(next).padStart(3, "0")}`;
}

function parseCarDoor(value) {
  const match = String(value || "").match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return null;
  return {car: Number(match[1]), door: Number(match[2]), carDoor: `${Number(match[1])}-${Number(match[2])}`};
}

function carDoorOrdinal(car, door, doorsPerCar = 4) {
  return (Number(car) - 1) * Number(doorsPerCar) + Number(door);
}

function sortedQuickExitRowsForDirection(rows, direction, doorsPerCar = 4) {
  const needle = String(direction || "").replace(/\s*방면\s*$/, "").trim();
  return (rows || [])
    .filter((row) => {
      if (!needle) return true;
      return String(row.toward || row.direction || "").includes(needle)
        || String(row.up_down || "").includes(needle);
    })
    .map((row) => {
      const parsed = parseCarDoor(row.door_no);
      return parsed ? {...row, car: parsed.car, door: parsed.door, car_door: parsed.carDoor, ordinal: carDoorOrdinal(parsed.car, parsed.door, doorsPerCar)} : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.ordinal - b.ordinal);
}

function normalizeStationDisplayName(name) {
  const value = String(name || "").trim();
  if (!value) return "";
  return value.endsWith("역") ? value : `${value}역`;
}

function populateStationOptions(stations) {
  state.stationOptions = stations || [];
  if (!platformStationOptions) return;
  platformStationOptions.innerHTML = "";
  for (const item of state.stationOptions) {
    const option = document.createElement("option");
    option.value = item.station;
    platformStationOptions.appendChild(option);
  }
}

function linesForStation(stationName) {
  const station = normalizeStationDisplayName(stationName);
  const item = (state.stationOptions || []).find((candidate) => candidate.station === station);
  return item?.lines || [];
}

function populatePlatformLineOptions() {
  const previous = platformLineInput.value;
  const localLines = linesForStation(platformStationInput.value);
  const lines = localLines.length ? localLines : DEFAULT_PLATFORM_LINES;
  platformLineInput.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = localLines.length ? "select line" : "select line (manual fallback)";
  platformLineInput.appendChild(empty);
  for (const line of lines) {
    const option = document.createElement("option");
    option.value = line;
    option.textContent = line;
    platformLineInput.appendChild(option);
  }
  if (lines.includes(previous)) platformLineInput.value = previous;
  else if (lines.length === 1) platformLineInput.value = lines[0];
}

function populatePlatformDirectionOptions(rows) {
  const previous = platformDirectionInput.value;
  const directions = Array.from(new Set((rows || []).map((row) => row.toward).filter(Boolean))).sort();
  platformDirectionInput.innerHTML = "";
  const empty = document.createElement("option");
  empty.value = "";
  empty.textContent = directions.length ? "select direction" : "no direction data";
  platformDirectionInput.appendChild(empty);
  for (const direction of directions) {
    const option = document.createElement("option");
    option.value = direction;
    option.textContent = `${direction} 방면`;
    platformDirectionInput.appendChild(option);
  }
  if (directions.includes(previous)) platformDirectionInput.value = previous;
  else if (directions.length === 1) platformDirectionInput.value = directions[0];
}

function loadStationOptions() {
  fetch("/api/stations")
    .then((response) => response.json())
    .then((data) => {
      populateStationOptions(data.stations || []);
      populatePlatformLineOptions();
    })
    .catch((error) => {
      quickExitStatus.textContent = `stations: ${error.message || error}`;
    });
}

function projectedPointOnPlatformLine(world) {
  if (!state.platform.lineStart || !state.platform.lineEnd) {
    return [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  }
  const projected = projectPointToSegment(world, state.platform.lineStart, state.platform.lineEnd);
  return [Number(projected[0].toFixed(2)), Number(projected[1].toFixed(2))];
}

function platformDisplayPoints(platform) {
  return platformDisplayEntries(platform).map((entry) => entry.point);
}

function platformAnchorLabel(anchor) {
  if (!anchor) return "";
  if (anchor.car_door) return String(anchor.car_door);
  if (anchor.car && anchor.door) return `${anchor.car}-${anchor.door}`;
  if (anchor.door_no) return String(anchor.door_no);
  return "";
}

function platformDisplayEntries(platform) {
  if (platform.point_source) {
    return [
      {point: platform.point_source, label: platform.platform_id || platform.label || "platform"},
      platform.facing_point_source ? {point: platform.facing_point_source, label: "facing"} : null,
    ].filter(Boolean);
  }
  const doorsPerCar = Number(platform.doors_per_car || platform.doorsPerCar || 4);
  let anchors = (platform.anchors || [])
    .filter((anchor) => anchor.point_source)
    .map((anchor) => ({
      ...anchor,
      car: Number(anchor.car || 0),
      door: Number(anchor.door || 0),
      point_source: anchor.point_source,
      ordinal: anchor.ordinal || (((Number(anchor.car) || 1) - 1) * doorsPerCar) + (Number(anchor.door) || 1),
      near_connection_id: anchor.near_connection_id || null,
    }));
  if (!anchors.length && platform.start_point_source && platform.end_point_source) {
    const carCount = Number(platform.car_count || 10);
    anchors = [
      {car: 1, door: 1, point_source: platform.start_point_source, ordinal: 1, near_connection_id: null, car_door: "1-1"},
      {
        car: carCount,
        door: doorsPerCar,
        point_source: platform.end_point_source,
        ordinal: (carCount - 1) * doorsPerCar + doorsPerCar,
        near_connection_id: null,
        car_door: `${carCount}-${doorsPerCar}`,
      },
    ];
  }
  const anchorEntries = anchors
    .sort((a, b) => a.ordinal - b.ordinal)
    .map((anchor) => ({point: anchor.point_source, label: platformAnchorLabel(anchor)}));
  if (platform.start_point_source && platform.end_point_source) {
    return [
      {point: platform.start_point_source, label: "front"},
      ...anchorEntries,
      {point: platform.end_point_source, label: "tail"},
    ];
  }
  return anchorEntries;
}

function selectedPlatformIds() {
  const ids = new Set(state.selectedPlatformIds || []);
  if (state.selectedPlatformId) ids.add(state.selectedPlatformId);
  return Array.from(ids);
}

function updatePlatformStatus(message = null) {
  const count = (state.annotations.manual_platforms || []).length;
  const selectedIds = selectedPlatformIds();
  if (!state.platform.active) {
    platformStatus.textContent = [
      message,
      `platforms: ${count}`,
      selectedIds.length ? `selected ${selectedIds.length}: ${selectedIds.join(", ")}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  if (state.platform.mode === "line") {
    const rows = sortedQuickExitRowsForDirection(state.platform.quickExitRows, state.platform.direction, state.platform.doorsPerCar);
    platformStatus.textContent = [
      message,
      "mode: platform line",
      `station: ${state.platform.stationName || "-"}`,
      `line: ${state.platform.lineId || "-"}`,
      `direction: ${state.platform.direction || "-"}`,
      `line: ${state.platform.lineStart ? "start" : "-"} / ${state.platform.lineEnd ? "end" : "-"}`,
      `anchors: ${(state.platform.anchors || []).length}/${rows.length || "manual"}`,
      rows.length ? `next door: ${rows[(state.platform.anchors || []).length]?.door_no || "done"}` : null,
      !state.platform.lineStart
        ? "Click train-front point. This becomes car 1."
        : !state.platform.lineEnd
          ? "Click train-tail point."
          : "Click stair/access points in train-direction order. Shift saves.",
    ].filter(Boolean).join("\n");
    return;
  }
  platformStatus.textContent = [
    message,
    `mode: platform point`,
    `station: ${state.platform.stationName || "-"}`,
    `line: ${state.platform.lineId || "-"}`,
    `direction: ${state.platform.direction || "-"}`,
    `point: ${state.platform.point ? "set" : "-"}`,
    `facing: ${state.platform.facingPoint ? "set" : "-"}`,
    state.platform.point ? "Click facing direction." : "Click platform point.",
  ].filter(Boolean).join("\n");
}

function startPlatformLine() {
  if (!canEdit()) return;
  state.tool = "platform";
  state.platform = {
    active: true,
    mode: selectedPlatformMode(),
    point: null,
    facingPoint: null,
    lineStart: null,
    lineEnd: null,
    anchors: [],
    quickExitRows: state.platform.quickExitRows || [],
    stationName: normalizeStationDisplayName(platformStationInput.value),
    lineId: platformLineInput.value.trim(),
    direction: platformDirectionInput.value.trim(),
    carCount: selectedPlatformCarCount(),
    doorsPerCar: selectedPlatformDoorsPerCar(),
    label: platformLabelInput.value.trim(),
    polygonId: null,
    layer: null,
  };
  updatePlatformStatus();
  draw();
}

function resetPlatformLine() {
  state.tool = "select";
  state.platform = {
    active: false,
    mode: selectedPlatformMode(),
    point: null,
    facingPoint: null,
    lineStart: null,
    lineEnd: null,
    anchors: [],
    quickExitRows: state.platform.quickExitRows || [],
    stationName: normalizeStationDisplayName(platformStationInput.value),
    lineId: platformLineInput.value.trim(),
    direction: platformDirectionInput.value.trim(),
    carCount: selectedPlatformCarCount(),
    doorsPerCar: selectedPlatformDoorsPerCar(),
    label: platformLabelInput.value.trim(),
    polygonId: null,
    layer: null,
  };
  updatePlatformStatus();
  draw();
}

function addPlatformPoint(world, poly) {
  if (!state.platform.active) return;
  if (state.platform.mode === "line") {
    addPlatformLinePoint(world, poly);
    return;
  }
  if (!state.platform.point && !poly) {
    updatePlatformStatus("Click inside a platform polygon.");
    return;
  }
  const layer = poly ? polygonLayerValue(poly) : state.platform.layer;
  if (!state.platform.point && !layer) {
    updatePlatformStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if (!state.platform.point) {
    state.platform.point = point;
    state.platform.polygonId = poly.polygon_id;
    state.platform.layer = layer;
    updatePlatformStatus("Platform point set. Click facing direction.");
    draw();
    return;
  }
  state.platform.facingPoint = point;
  const platformId = nextPlatformId();
  const dx = state.platform.facingPoint[0] - state.platform.point[0];
  const dy = state.platform.facingPoint[1] - state.platform.point[1];
  const facingAngleDeg = Number((Math.atan2(dy, dx) * 180 / Math.PI).toFixed(6));
  state.annotations.manual_platforms = state.annotations.manual_platforms || [];
  state.annotations.manual_platforms.push({
    platform_id: platformId,
    type: "platform_point",
    label: state.platform.label || platformId,
    station_name: state.platform.stationName || null,
    line_id: state.platform.lineId || null,
    direction: state.platform.direction || null,
    polygon_id: state.platform.polygonId,
    layer: state.platform.layer,
    point_source: state.platform.point,
    facing_point_source: state.platform.facingPoint,
    facing_angle_deg: facingAngleDeg,
    bidirectional: false,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetPlatformLine();
    updatePlatformStatus(`${platformId} saved.`);
  });
}

function addPlatformLinePoint(world, poly) {
  if (!state.platform.lineStart && !poly) {
    updatePlatformStatus("Click the train-front point inside a platform polygon.");
    return;
  }
  const layer = poly ? polygonLayerValue(poly) : state.platform.layer;
  if (!state.platform.lineStart && !layer) {
    updatePlatformStatus(`Set layer first: ${poly.polygon_id}`);
    return;
  }
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if (!state.platform.lineStart) {
    state.platform.lineStart = point;
    state.platform.polygonId = poly.polygon_id;
    state.platform.layer = layer;
    updatePlatformStatus("Train-front point set. Click train-tail point.");
    draw();
    return;
  }
  if (!state.platform.lineEnd) {
    state.platform.lineEnd = point;
    updatePlatformStatus("Platform line set. Click access points to map quick-exit doors.");
    draw();
    return;
  }
  const rows = sortedQuickExitRowsForDirection(state.platform.quickExitRows, state.platform.direction, state.platform.doorsPerCar);
  const nextRow = rows[(state.platform.anchors || []).length] || null;
  const mappedPoint = projectedPointOnPlatformLine(world);
  const parsed = nextRow ? parseCarDoor(nextRow.door_no) : null;
  state.platform.anchors = state.platform.anchors || [];
  state.platform.anchors.push({
    point_source: mappedPoint,
    car: parsed ? parsed.car : 1,
    door: parsed ? parsed.door : state.platform.anchors.length + 1,
    car_door: parsed ? parsed.carDoor : null,
    quick_exit: nextRow,
    near_connection_id: null,
  });
  updatePlatformStatus(nextRow ? `Mapped ${nextRow.door_no}.` : "Anchor added without quick-exit door.");
  draw();
}

function applyPlatformLine() {
  if (!state.platform.active || state.platform.mode !== "line") return;
  if (!state.platform.lineStart || !state.platform.lineEnd) {
    updatePlatformStatus("Platform line needs start and end points.");
    return;
  }
  const platformId = nextPlatformId();
  const anchors = (state.platform.anchors || []).filter((anchor) => anchor.point_source && anchor.car && anchor.door);
  state.annotations.manual_platforms = state.annotations.manual_platforms || [];
  state.annotations.manual_platforms.push({
    platform_id: platformId,
    type: "platform_direction",
    label: state.platform.label || platformId,
    station_name: state.platform.stationName || null,
    line_id: state.platform.lineId || null,
    direction: state.platform.direction || null,
    polygon_id: state.platform.polygonId,
    layer: state.platform.layer,
    car_count: state.platform.carCount || selectedPlatformCarCount(),
    doors_per_car: state.platform.doorsPerCar || selectedPlatformDoorsPerCar(),
    car_order: "train_direction_front_is_car_1",
    start_point_source: state.platform.lineStart,
    end_point_source: state.platform.lineEnd,
    anchors,
    quick_exit_rows: state.platform.quickExitRows || [],
    bidirectional: false,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetPlatformLine();
    updatePlatformStatus(`${platformId} saved.`);
  });
}

function undoPlatformInputPoint() {
  if (!state.platform.active) return;
  if (state.platform.mode !== "line") {
    if (state.platform.facingPoint) state.platform.facingPoint = null;
    else if (state.platform.point) {
      state.platform.point = null;
      state.platform.polygonId = null;
      state.platform.layer = null;
    }
    updatePlatformStatus();
    draw();
    return;
  }
  if ((state.platform.anchors || []).length) {
    state.platform.anchors.pop();
  } else if (state.platform.lineEnd) {
    state.platform.lineEnd = null;
  } else if (state.platform.lineStart) {
    state.platform.lineStart = null;
    state.platform.polygonId = null;
    state.platform.layer = null;
  }
  updatePlatformStatus();
  draw();
}

function fetchQuickExitDoors() {
  const station = normalizeStationDisplayName(platformStationInput.value);
  const line = platformLineInput.value.trim();
  if (!station) {
    quickExitStatus.textContent = "quick exit: station is required";
    return;
  }
  if (!line) {
    fetchQuickExitLinesForStation(station);
    return;
  }
  fetchQuickExitForLine(station, line);
}

function quickExitUrl(station, line) {
  return `/api/quick_exit?station=${encodeURIComponent(station)}&line=${encodeURIComponent(line)}&facility=${encodeURIComponent("계단")}`;
}

function quickExitDoorSummary(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    const key = row.toward || row.up_down || "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Array.from(groups.entries()).map(([direction, items]) => {
    const sorted = sortedQuickExitRowsForDirection(items, "", selectedPlatformDoorsPerCar());
    const doors = sorted.map((row) => row.door_no).filter(Boolean).join(", ");
    return `${direction}: ${doors || "-"}`;
  });
}

function applyQuickExitRows(line, rows) {
  platformLineInput.value = line;
  populatePlatformDirectionOptions(rows);
  const direction = platformDirectionInput.value;
  const directionRows = sortedQuickExitRowsForDirection(rows, direction, selectedPlatformDoorsPerCar());
  state.platform.quickExitRows = rows;
  const doors = directionRows.map((row) => row.door_no).join(", ");
  const summary = quickExitDoorSummary(rows);
  quickExitStatus.textContent = [
    `quick exit: ${rows.length} rows loaded`,
    `line: ${line}`,
    direction ? `${direction} 방면: ${directionRows.length} door(s)` : "select direction",
    doors || null,
    summary.length ? "all doors:" : null,
    ...summary,
  ].filter(Boolean).join("\n");
  updatePlatformStatus();
  draw();
}

function fetchQuickExitForLine(station, line) {
  quickExitStatus.textContent = "quick exit: loading...";
  fetch(quickExitUrl(station, line))
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "quick exit request failed");
      const rows = data.rows || [];
      applyQuickExitRows(line, rows);
    })
    .catch((error) => {
      quickExitStatus.textContent = `quick exit: ${error.message || error}`;
    });
}

function fetchQuickExitLinesForStation(station) {
  quickExitStatus.textContent = "quick exit: finding lines...";
  Promise.all(DEFAULT_PLATFORM_LINES.map((line) => (
    fetch(quickExitUrl(station, line))
      .then((response) => response.json().then((data) => ({ok: response.ok, line, data})))
      .catch((error) => ({ok: false, line, data: {error: String(error)}}))
  )))
    .then((results) => {
      const matches = results
        .filter((result) => result.ok && (result.data.rows || []).length)
        .map((result) => ({line: result.line, rows: result.data.rows || []}));
      if (!matches.length) {
        const errors = results
          .filter((result) => !result.ok && result.data?.error)
          .slice(0, 2)
          .map((result) => `${result.line}: ${result.data.error}`);
        quickExitStatus.textContent = [
          "quick exit: no line data found",
          errors.join("\n") || null,
        ].filter(Boolean).join("\n");
        return;
      }
      platformLineInput.innerHTML = "";
      const empty = document.createElement("option");
      empty.value = "";
      empty.textContent = "select line";
      platformLineInput.appendChild(empty);
      for (const match of matches) {
        const option = document.createElement("option");
        option.value = match.line;
        option.textContent = match.line;
        platformLineInput.appendChild(option);
      }
      applyQuickExitRows(matches[0].line, matches[0].rows);
      if (matches.length > 1) {
        quickExitStatus.textContent = [
          quickExitStatus.textContent,
          `found lines: ${matches.map((match) => match.line).join(", ")}`,
          "line can be changed from the dropdown.",
        ].join("\n");
      }
    })
    .catch((error) => {
      quickExitStatus.textContent = `quick exit: ${error.message || error}`;
    });
}

function applyPlatformMetadataToSelected() {
  const ids = selectedPlatformIds();
  if (!ids.length) {
    updatePlatformStatus("Select platform point(s) first.");
    return;
  }
  const idSet = new Set(ids);
  for (const platform of state.annotations.manual_platforms || []) {
    const id = platform.platform_id || platform.label;
    if (!idSet.has(id)) continue;
    platform.station_name = platformStationInput.value.trim() || platform.station_name || null;
    platform.line_id = platformLineInput.value.trim() || platform.line_id || null;
    platform.direction = platformDirectionInput.value.trim() || platform.direction || null;
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updatePlatformStatus(`Updated ${ids.length} platform point(s).`);
    draw();
  });
}

function clearPlatformSelection() {
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  updatePlatformStatus();
  draw();
}

function nearestPlatform(world, maxScreenDistance = 14) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_platforms || []).forEach((platform, index) => {
    const points = platformDisplayPoints(platform);
    if (points.length < 1) return;
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex];
      const screen = worldToScreen(point);
      let distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
      if (pointIndex < points.length - 1) {
        const projected = projectPointToSegment(world, point, points[pointIndex + 1]);
        const projectedScreen = worldToScreen(projected);
        distance = Math.min(distance, Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y));
      }
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {index, platformId: platform.platform_id || platform.label || `platform_${index + 1}`, distance};
      }
    }
  });
  return best;
}

function selectPlatform(world, additive = false) {
  if (!state.showPlatforms) return false;
  const hit = nearestPlatform(world);
  if (!hit) {
    if (!additive) {
      state.selectedPlatformId = null;
      state.selectedPlatformIds = [];
    }
    updatePlatformStatus();
    draw();
    return false;
  }
  if (additive) {
    const ids = new Set(state.selectedPlatformIds || []);
    if (ids.has(hit.platformId)) ids.delete(hit.platformId);
    else ids.add(hit.platformId);
    state.selectedPlatformIds = Array.from(ids);
    state.selectedPlatformId = state.selectedPlatformIds[state.selectedPlatformIds.length - 1] || null;
  } else {
    state.selectedPlatformId = hit.platformId;
    state.selectedPlatformIds = [hit.platformId];
  }
  state.selectedId = null;
  state.selectedSubwayId = null;
  state.selectedWallId = null;
  state.selectedStairId = null;
  state.selectedStairIds = [];
  updateSelectedInfo();
  updatePlatformStatus(`Selected ${selectedPlatformIds().length} platform point(s).`);
  draw();
  return true;
}

function deleteSelectedPlatform() {
  const ids = selectedPlatformIds();
  if (!ids.length) {
    updatePlatformStatus("Select a platform first.");
    return;
  }
  state.annotations.manual_platforms = state.annotations.manual_platforms || [];
  const idSet = new Set(ids);
  const before = state.annotations.manual_platforms.length;
  state.annotations.manual_platforms = state.annotations.manual_platforms.filter(
    (platform) => !idSet.has(platform.platform_id || platform.label),
  );
  const removed = before - state.annotations.manual_platforms.length;
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updatePlatformStatus(`Deleted ${removed} platform point(s).`);
    draw();
  });
}

function deleteAllPlatforms() {
  state.annotations.manual_platforms = state.annotations.manual_platforms || [];
  const removed = state.annotations.manual_platforms.length;
  state.annotations.manual_platforms = [];
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updatePlatformStatus(`Deleted ${removed} platform(s).`);
    draw();
  });
}

function undoLastPlatform() {
  state.annotations.manual_platforms = state.annotations.manual_platforms || [];
  const removed = state.annotations.manual_platforms.pop();
  if (!removed) {
    updatePlatformStatus("No platform to undo.");
    return;
  }
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updatePlatformStatus(`Removed ${removed.platform_id || removed.label}.`);
    draw();
  });
}

function updateElevatorStatus(message = null) {
  const count = (state.annotations.manual_elevator_points || []).length;
  const selectedIds = selectedElevatorPointIds();
  if (state.elevatorLink.active) {
    elevatorStatus.textContent = [
      message,
      "mode: elevator link",
      `selected: ${selectedIds.length}`,
      selectedIds.length ? selectedIds.join(", ") : null,
      "Click elevator points, then Create/Update Link.",
    ].filter(Boolean).join("\n");
    return;
  }
  if (!state.elevatorPoint.active) {
    elevatorStatus.textContent = [
      message,
      `elevator points: ${count}`,
      selectedIds.length ? `selected ${selectedIds.length}: ${selectedIds.join(", ")}` : null,
    ].filter(Boolean).join("\n") || "inactive";
    return;
  }
  elevatorStatus.textContent = [
    message,
    "mode: elevator point",
    `elevator: ${state.elevatorPoint.elevatorId || "-"}`,
    `exit: ${state.elevatorPoint.isExit ? (state.elevatorPoint.exitNumber || "yes") : "no"}`,
    `point: ${state.elevatorPoint.point ? "set" : "-"}`,
    `direction vertices: ${(state.elevatorPoint.directionVertices || []).length}/2`,
    state.elevatorPoint.point
      ? `Click existing polygon vertex for direction ${(state.elevatorPoint.directionVertices || []).length + 1}/2.`
      : "Click elevator access point inside a polygon.",
  ].filter(Boolean).join("\n");
}

function selectedElevatorExitNumber() {
  return (elevatorExitNumberInput?.value || "").trim();
}

function startElevatorPoint() {
  if (!canEdit()) return;
  state.tool = "elevatorPoint";
  state.elevatorPoint = {
    active: true,
    elevatorId: elevatorIdInput.value.trim(),
    label: elevatorLabelInput.value.trim(),
    isExit: Boolean(elevatorExitToggle?.checked),
    exitNumber: selectedElevatorExitNumber(),
    point: null,
    facingPoint: null,
    directionVertices: [],
    directionVertexRefs: [],
    hoverVertex: null,
    polygonId: null,
    layer: null,
  };
  updateElevatorStatus();
  draw();
}

function resetElevatorPoint() {
  state.tool = "select";
  state.elevatorPoint = {
    active: false,
    elevatorId: elevatorIdInput.value.trim(),
    label: elevatorLabelInput.value.trim(),
    isExit: Boolean(elevatorExitToggle?.checked),
    exitNumber: selectedElevatorExitNumber(),
    point: null,
    facingPoint: null,
    directionVertices: [],
    directionVertexRefs: [],
    hoverVertex: null,
    polygonId: null,
    layer: null,
  };
  updateElevatorStatus();
  draw();
}

function startElevatorLink() {
  if (!canEdit()) return;
  state.tool = "elevatorLink";
  state.elevatorLink = {active: true};
  updateElevatorStatus();
  draw();
}

function resetElevatorLink() {
  state.tool = "select";
  state.elevatorLink = {active: false};
  updateElevatorStatus();
  draw();
}

function addElevatorPoint(world, poly) {
  if (!state.elevatorPoint.active) return;
  const point = [Number(world.x.toFixed(2)), Number(world.y.toFixed(2))];
  if (!state.elevatorPoint.point) {
    if (!poly) {
      updateElevatorStatus("Click the access point inside a polygon.");
      return;
    }
    const layer = polygonLayerValue(poly);
    if (!layer) {
      updateElevatorStatus(`Set layer first: ${poly.polygon_id}`);
      return;
    }
    state.elevatorPoint.point = point;
    state.elevatorPoint.polygonId = poly.polygon_id;
    state.elevatorPoint.layer = layer;
    updateElevatorStatus("Elevator point set. Click direction vertex 1/2.");
    draw();
    return;
  }
  const vertex = nearestConnectionVertex(world, poly, 18);
  if (!vertex) {
    updateElevatorStatus("Click near an existing polygon vertex for direction.");
    return;
  }
  state.elevatorPoint.directionVertices = state.elevatorPoint.directionVertices || [];
  state.elevatorPoint.directionVertexRefs = state.elevatorPoint.directionVertexRefs || [];
  state.elevatorPoint.directionVertices.push([
    Number(vertex.point[0].toFixed(2)),
    Number(vertex.point[1].toFixed(2)),
  ]);
  state.elevatorPoint.directionVertexRefs.push({
    polygon_id: vertex.polygonId,
    hole_index: vertex.holeIndex,
    vertex_index: vertex.index,
  });
  if (state.elevatorPoint.directionVertices.length < 2) {
    updateElevatorStatus("Direction vertex 1 set. Click direction vertex 2/2.");
    draw();
    return;
  }
  const directionStart = state.elevatorPoint.directionVertices[0];
  const directionEnd = state.elevatorPoint.directionVertices[1];
  const dx = directionEnd[0] - directionStart[0];
  const dy = directionEnd[1] - directionStart[1];
  if (Math.hypot(dx, dy) <= 1e-6) {
    state.elevatorPoint.directionVertices.pop();
    state.elevatorPoint.directionVertexRefs.pop();
    updateElevatorStatus("Direction vertices must be different.");
    draw();
    return;
  }
  const perpendicularFacing = perpendicularFacingFromLine(state.elevatorPoint.point, directionStart, directionEnd, 50);
  if (!perpendicularFacing) {
    state.elevatorPoint.directionVertices.pop();
    state.elevatorPoint.directionVertexRefs.pop();
    updateElevatorStatus("Direction line is invalid.");
    draw();
    return;
  }
  state.elevatorPoint.facingPoint = perpendicularFacing.point;
  const elevatorPointId = nextElevatorPointId();
  const facingAngleDeg = perpendicularFacing.angleDeg;
  state.annotations.manual_elevator_points = state.annotations.manual_elevator_points || [];
  state.annotations.manual_elevator_points.push({
    elevator_point_id: elevatorPointId,
    elevator_id: state.elevatorPoint.elevatorId || null,
    label: state.elevatorPoint.label || elevatorPointId,
    polygon_id: state.elevatorPoint.polygonId,
    layer: state.elevatorPoint.layer,
    point_source: state.elevatorPoint.point,
    facing_point_source: state.elevatorPoint.facingPoint,
    direction_points_source: state.elevatorPoint.directionVertices,
    direction_vertex_refs: state.elevatorPoint.directionVertexRefs,
    facing_mode: "perpendicular_to_existing_vertex_line",
    facing_angle_deg: facingAngleDeg,
    exit: state.elevatorPoint.isExit,
    exit_number: state.elevatorPoint.isExit ? state.elevatorPoint.exitNumber : null,
    access_transition: state.elevatorPoint.isExit ? "outside" : null,
  });
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    resetElevatorPoint();
    updateElevatorStatus(`${elevatorPointId} saved.`);
  });
}

function nearestElevatorPoint(world, maxScreenDistance = 14) {
  const mouseScreen = worldToScreen([world.x, world.y]);
  let best = null;
  (state.annotations.manual_elevator_points || []).forEach((item, index) => {
    if (!item.point_source) return;
    const points = [item.point_source, item.facing_point_source].filter(Boolean);
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const point = points[pointIndex];
      const screen = worldToScreen(point);
      let distance = Math.hypot(screen.x - mouseScreen.x, screen.y - mouseScreen.y);
      if (pointIndex < points.length - 1) {
        const projected = projectPointToSegment(world, point, points[pointIndex + 1]);
        const projectedScreen = worldToScreen(projected);
        distance = Math.min(distance, Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y));
      }
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {index, elevatorPointId: item.elevator_point_id || item.label || `elevator_point_${index + 1}`, distance};
      }
    }
  });
  return best;
}

function selectElevatorPoint(world, additive = false) {
  const hit = nearestElevatorPoint(world);
  if (!hit) {
    if (!additive) {
      state.selectedElevatorPointId = null;
      state.selectedElevatorPointIds = [];
    }
    updateElevatorStatus();
    draw();
    return false;
  }
  if (additive) {
    const ids = new Set(state.selectedElevatorPointIds || []);
    if (ids.has(hit.elevatorPointId)) ids.delete(hit.elevatorPointId);
    else ids.add(hit.elevatorPointId);
    state.selectedElevatorPointIds = Array.from(ids);
    state.selectedElevatorPointId = state.selectedElevatorPointIds[state.selectedElevatorPointIds.length - 1] || null;
  } else {
    state.selectedElevatorPointId = hit.elevatorPointId;
    state.selectedElevatorPointIds = [hit.elevatorPointId];
  }
  state.selectedId = null;
  state.selectedSubwayId = null;
  state.selectedWallId = null;
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedLayerAlignIndex = null;
  updateSelectedInfo();
  updateElevatorStatus(`Selected ${selectedElevatorPointIds().length} elevator point(s).`);
  draw();
  return true;
}

function deleteSelectedElevatorPoint() {
  const ids = selectedElevatorPointIds();
  if (!ids.length) {
    updateElevatorStatus("Select an elevator point first.");
    return;
  }
  state.annotations.manual_elevator_points = state.annotations.manual_elevator_points || [];
  const idSet = new Set(ids);
  const before = state.annotations.manual_elevator_points.length;
  state.annotations.manual_elevator_points = state.annotations.manual_elevator_points.filter(
    (item) => !idSet.has(item.elevator_point_id || item.label),
  );
  const removed = before - state.annotations.manual_elevator_points.length;
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Deleted ${removed} elevator point(s).`);
    draw();
  });
}

function deleteAllElevatorPoints() {
  state.annotations.manual_elevator_points = state.annotations.manual_elevator_points || [];
  const removed = state.annotations.manual_elevator_points.length;
  state.annotations.manual_elevator_points = [];
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Deleted ${removed} elevator point(s).`);
    draw();
  });
}

function undoLastElevatorPoint() {
  state.annotations.manual_elevator_points = state.annotations.manual_elevator_points || [];
  const removed = state.annotations.manual_elevator_points.pop();
  if (!removed) {
    updateElevatorStatus("No elevator point to undo.");
    return;
  }
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Removed ${removed.elevator_point_id || removed.label}.`);
    draw();
  });
}

function applyElevatorExitToSelected() {
  const ids = selectedElevatorPointIds();
  if (!ids.length) {
    updateElevatorStatus("Select elevator point(s) first.");
    return;
  }
  const idSet = new Set(ids);
  const isExit = Boolean(elevatorExitToggle?.checked);
  const exitNumber = selectedElevatorExitNumber();
  for (const item of state.annotations.manual_elevator_points || []) {
    if (idSet.has(item.elevator_point_id || item.label)) {
      item.exit = isExit;
      item.exit_number = isExit ? exitNumber : null;
      item.access_transition = isExit ? "outside" : null;
    }
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Updated exit metadata on ${ids.length} elevator point(s).`);
    draw();
  });
}

function applyElevatorLink() {
  const ids = selectedElevatorPointIds();
  if (ids.length < 2) {
    updateElevatorStatus("Select at least two elevator points.");
    return;
  }
  const idSet = new Set(ids);
  const typedId = elevatorIdInput.value.trim();
  const existingId = (state.annotations.manual_elevator_points || [])
    .map((item) => idSet.has(item.elevator_point_id || item.label) ? item.elevator_id : null)
    .find(Boolean);
  const elevatorId = typedId || existingId || nextElevatorId();
  for (const item of state.annotations.manual_elevator_points || []) {
    if (idSet.has(item.elevator_point_id || item.label)) {
      item.elevator_id = elevatorId;
    }
  }
  elevatorIdInput.value = elevatorId;
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Linked ${ids.length} point(s) as ${elevatorId}.`);
    draw();
  });
}

function clearElevatorLinkFromSelected() {
  const ids = selectedElevatorPointIds();
  if (!ids.length) {
    updateElevatorStatus("Select elevator point(s) first.");
    return;
  }
  const idSet = new Set(ids);
  for (const item of state.annotations.manual_elevator_points || []) {
    if (idSet.has(item.elevator_point_id || item.label)) {
      item.elevator_id = null;
    }
  }
  saveAnnotations().then((result) => {
    saveResult.textContent = JSON.stringify(result, null, 2);
    updateElevatorStatus(`Cleared link from ${ids.length} point(s).`);
    draw();
  });
}

function selectSameElevatorLink() {
  const selectedId = selectedElevatorPointIds()[0];
  if (!selectedId) {
    updateElevatorStatus("Select one elevator point first.");
    return;
  }
  const source = (state.annotations.manual_elevator_points || []).find(
    (item) => (item.elevator_point_id || item.label) === selectedId,
  );
  if (!source?.elevator_id) {
    updateElevatorStatus("Selected point has no elevator link.");
    return;
  }
  state.selectedElevatorPointIds = (state.annotations.manual_elevator_points || [])
    .filter((item) => item.elevator_id === source.elevator_id)
    .map((item) => item.elevator_point_id || item.label)
    .filter(Boolean);
  state.selectedElevatorPointId = state.selectedElevatorPointIds[state.selectedElevatorPointIds.length - 1] || null;
  elevatorIdInput.value = source.elevator_id;
  updateElevatorStatus(`Selected ${state.selectedElevatorPointIds.length} point(s) for ${source.elevator_id}.`);
  draw();
}

function clearElevatorSelection() {
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  updateElevatorStatus();
  draw();
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
  if (!autoMergeStatus) return;
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
  if (!mergeStatus) return;
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

function nearestConnectionVertex(world, preferredPoly = null, maxScreenDistance = 12, strictPreferred = false) {
  const candidates = preferredPoly
    ? strictPreferred
      ? [preferredPoly]
      : [preferredPoly, ...allPolygons().filter((poly) => poly.polygon_id !== preferredPoly.polygon_id)]
    : allPolygons();
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
  let best = null;
  const mouseScreen = worldToScreen([world.x, world.y]);
  const visitRing = (points, holeIndex = null) => {
    if (!points || points.length < 2) return;
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const projected = projectPointToSegment(world, point, next);
      const projectedScreen = worldToScreen(projected);
      const distance = Math.hypot(projectedScreen.x - mouseScreen.x, projectedScreen.y - mouseScreen.y);
      if (distance <= maxScreenDistance && (!best || distance < best.distance)) {
        best = {
          polygonId: poly.polygon_id,
          holeIndex,
          index,
          point: [Number(projected[0].toFixed(2)), Number(projected[1].toFixed(2))],
          distance,
        };
      }
    });
  };
  visitRing(poly.points_source || [], null);
  (poly.holes_source || []).forEach((hole, holeIndex) => visitRing(hole || [], holeIndex));
  return best;
}

function nearestPolygonEdge(world, preferredPoly = null, maxScreenDistance = 14) {
  const candidates = preferredPoly ? [preferredPoly, ...allPolygons().filter((poly) => poly.polygon_id !== preferredPoly.polygon_id)] : allPolygons();
  let best = null;
  for (const poly of candidates) {
    const edge = nearestEdgeForPolygon(poly, world, maxScreenDistance);
    if (edge && (!best || edge.distance < best.distance)) {
      best = {...edge, poly};
    }
  }
  return best;
}

function snapWallPoint(world, preferredPoly = null) {
  const vertex = nearestConnectionVertex(world, preferredPoly, 30);
  if (vertex) {
    return {point: vertex.point, poly: vertex.poly, source: "vertex"};
  }
  const edge = nearestPolygonEdge(world, preferredPoly, 22);
  if (edge) {
    return {point: edge.point, poly: edge.poly, source: "edge"};
  }
  return {point: [world.x, world.y], poly: preferredPoly || null, source: "free"};
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
    const statusTarget = mergeStatus || autoMergeStatus;
    if (statusTarget) statusTarget.textContent = `Undid ${removedMerge.merge_id || removedPolygonId}.`;
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
  state.annotations.manual_platforms = [];
  state.annotations.manual_elevator_points = [];
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
  resetPlatformLine();
  resetElevatorPoint();
  resetElevatorLink();
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
      state.annotations.manual_platforms = state.annotations.manual_platforms || [];
      state.annotations.manual_elevator_points = state.annotations.manual_elevator_points || [];
      state.annotations.manual_zones = state.annotations.manual_zones || [];
      state.annotations.local_shift_corrections = state.annotations.local_shift_corrections || [];
      state.annotations.scale_calibration = state.annotations.scale_calibration || null;
      state.annotations.polygon_z_offsets = state.annotations.polygon_z_offsets || {};
      state.annotations.polygon_z_values = state.annotations.polygon_z_values || {};
      state.annotations.polygon_axis_corrections = state.annotations.polygon_axis_corrections || {};
      state.annotations.scene_height = state.annotations.scene_height || defaultSceneHeight();
      state.annotations.station_metadata = state.annotations.station_metadata || {};
      populateStationInputs(state.annotations.station_metadata);
      populateSceneHeightInputs(state.annotations.scene_height);
      updateZoneStatus();
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
    manual_zones: [],
    manual_assets: [],
    manual_platforms: [],
    manual_elevator_points: [],
    layer_alignment_pairs: [],
    local_shift_corrections: [],
    polygon_axis_corrections: {},
    scale_calibration: null,
    scene_height: defaultSceneHeight(),
    station_metadata: {},
  };
  state.marker.mode = markerModeInput?.value === "4point" ? "4point" : "3point";
  state.marker.points = [];
  state.marker.autoPoint = null;
  state.navigationNodes = [];
  state.regionPick = {active: false, drawing: false, strokes: [], currentStroke: [], brushSize: selectedRegionBrushSize(), sourcePolygonId: null};
  state.wall = {active: false, label: "", height: selectedWallHeight(), points: [], layer: null, polygonId: null, hoverSnap: null};
  state.zone = {active: false, zoneType: selectedZoneType(), points: [], polygonId: null, layer: null};
  state.crop = {active: false, start: null, current: null, rect: null, previousImagePath: state.crop.previousImagePath || null};
  state.loadedFinalWorkingSet = false;
  state.selectedId = null;
  state.selectedIds = [];
  state.selectedStairId = null;
  state.selectedStairIds = [];
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedZoneId = null;
  pipelineStatus.textContent = message;
  populateStationInputs(state.annotations.station_metadata);
  populateSceneHeightInputs(state.annotations.scene_height);
  updateScaleCalibrationStatus();
  updateLocalAxisStatus();
  updateRegionPickStatus();
  updateWallStatus();
  updateZoneStatus();
}

function selectImagePath(imagePath, messagePrefix = "selected") {
  if (!imagePath) return Promise.resolve(null);
  return fetch("/api/project/select", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({image_path: imagePath}),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to select image");
      resetProjectWorkingState(`${messagePrefix}: ${data.image}\noutput: ${data.output_dir}`);
      loadProject();
      refreshImages();
      return data;
    });
}

function loadSelectedImage() {
  const imagePath = imageSelect.value;
  if (!imagePath) return;
  selectImagePath(imagePath)
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
  const previousImagePath = state.crop.previousImagePath || null;
  state.crop = {
    active: true,
    start: null,
    current: null,
    rect: null,
    previousImagePath,
  };
  pipelineStatus.textContent = "crop: drag a rectangle on the image";
  draw();
}

function clearCropState(message = "crop cancelled") {
  if (state.tool === "crop") state.tool = "select";
  const previousImagePath = state.crop.previousImagePath || null;
  state.crop = {
    active: false,
    start: null,
    current: null,
    rect: null,
    previousImagePath,
  };
  pipelineStatus.textContent = message;
  draw();
}

function resetCrop() {
  if (state.crop.active || state.crop.rect) {
    clearCropState("crop cancelled");
    return;
  }
  if (state.crop.previousImagePath) {
    backToPreviousCropImage();
    return;
  }
  clearCropState("no previous crop source image.");
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
      const previous = data.source_image || state.crop.previousImagePath || null;
      clearCropState("crop applied");
      state.crop.previousImagePath = previous;
      pipelineStatus.textContent = JSON.stringify(data, null, 2);
      loadProject();
      refreshImages();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function backToPreviousCropImage() {
  const previous = state.crop.previousImagePath;
  if (!previous) {
    pipelineStatus.textContent = "no previous crop source image.";
    return;
  }
  fetch("/api/image/crop/revert", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({previous_image: previous}),
  })
    .then((response) => response.json().then((data) => ({ok: response.ok, data})))
    .then(({ok, data}) => {
      if (!ok) throw new Error(data.error || "failed to revert crop");
      state.crop.previousImagePath = null;
      resetProjectWorkingState(`reverted crop: ${data.image}\ndeleted: ${data.deleted_crop_image}`);
      loadProject();
      refreshImages();
    })
    .catch((error) => {
      pipelineStatus.textContent = String(error);
    });
}

function addClickListener(id, handler) {
  const element = document.getElementById(id);
  if (element) element.addEventListener("click", handler);
}

function startManualMarker() {
  const mode = markerModeInput?.value === "4point" ? "4point" : "3point";
  state.tool = "marker";
  state.marker = {
    active: true,
    mode,
    points: [],
    autoPoint: null,
  };
  pipelineStatus.textContent =
    mode === "4point"
      ? "manual marker: click 4 transform corner points"
      : "manual marker: click 3 adjacent transform points";
  draw();
}

function computeParallelogramMarkerPoint(points) {
  if (!points || points.length !== 3) return null;
  const [pointA, pointB, pointC] = points;
  return [
    Number((Number(pointA[0]) + Number(pointC[0]) - Number(pointB[0])).toFixed(2)),
    Number((Number(pointA[1]) + Number(pointC[1]) - Number(pointB[1])).toFixed(2)),
  ];
}

function manualMarkerPointsForSave() {
  if (state.marker.mode === "4point") return [...state.marker.points];
  return state.marker.autoPoint ? [...state.marker.points, state.marker.autoPoint] : [...state.marker.points];
}

function manualMarkerRequiredPointCount() {
  return state.marker.mode === "4point" ? 4 : 3;
}

function addManualMarkerPoint(world) {
  if (!state.marker.active) return;
  const requiredCount = manualMarkerRequiredPointCount();
  if (state.marker.points.length >= requiredCount) return;
  state.marker.points.push([Number(world.x.toFixed(2)), Number(world.y.toFixed(2))]);
  state.marker.autoPoint = null;
  pipelineStatus.textContent = `manual marker: ${state.marker.points.length}/${requiredCount}`;
  if (state.marker.mode !== "4point" && state.marker.points.length === 3) {
    state.marker.autoPoint = computeParallelogramMarkerPoint(state.marker.points);
    pipelineStatus.textContent = "manual marker ready: auto point added, Save Marker";
  } else if (state.marker.mode === "4point" && state.marker.points.length === 4) {
    pipelineStatus.textContent = "manual marker ready: 4 points selected, Save Marker";
  }
  draw();
}

function undoManualMarkerPoint() {
  if (state.marker.points.length > 0) {
    state.marker.autoPoint = null;
    state.marker.points.pop();
    pipelineStatus.textContent = `manual marker: ${state.marker.points.length}/${manualMarkerRequiredPointCount()}`;
    draw();
  }
}

function saveManualMarker() {
  const points = manualMarkerPointsForSave();
  if (points.length !== 4) {
    pipelineStatus.textContent = `manual marker needs 4 points before save: current ${points.length}/4`;
    return;
  }
  fetch("/api/marker/manual", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({points}),
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
    resetPlatformLine();
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
    manual_zones: data.zones || state.annotations.manual_zones || [],
    manual_assets: state.annotations.manual_assets || [],
    manual_platforms: state.annotations.manual_platforms || [],
    manual_elevator_points: state.annotations.manual_elevator_points || [],
    layer_alignment_pairs: state.annotations.layer_alignment_pairs || [],
    local_shift_corrections: state.annotations.local_shift_corrections || [],
    polygon_axis_corrections: state.annotations.polygon_axis_corrections || {},
    scale_calibration: state.annotations.scale_calibration || null,
    scene_height: state.annotations.scene_height || defaultSceneHeight(),
    station_metadata: data.station_metadata || state.annotations.station_metadata || {},
  };
  populateStationInputs(state.annotations.station_metadata);
  populateSceneHeightInputs(state.annotations.scene_height);
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
  resetPlatformLine();
  resetElevatorPoint();
  resetElevatorLink();
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
  if (state.tool === "regionPick" && state.regionPick.active && event.button === 0) {
    state.regionPick.drawing = true;
    state.regionPick.currentStroke = [];
    const poly = findPolygonAt(world);
    if (!state.regionPick.sourcePolygonId && poly?.polygon_id) {
      state.regionPick.sourcePolygonId = poly.polygon_id;
    }
    addRegionPickPoint(world);
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
  if (state.tool === "regionPick" && state.regionPick.active && state.regionPick.drawing) {
    addRegionPickPoint(world);
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
    const fixedPoly = stairNextPointPolygon();
    const hover = nearestConnectionVertex(world, fixedPoly || findPolygonAt(world), 14, Boolean(fixedPoly));
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
  if (state.tool === "elevatorPoint" && state.elevatorPoint.active && state.elevatorPoint.point) {
    const hover = nearestConnectionVertex(world, findPolygonAt(world), 18);
    const nextHover = hover ? {
      polygonId: hover.polygonId,
      holeIndex: hover.holeIndex,
      index: hover.index,
      point: hover.point,
    } : null;
    const changed = JSON.stringify(nextHover) !== JSON.stringify(state.elevatorPoint.hoverVertex);
    if (changed) {
      state.elevatorPoint.hoverVertex = nextHover;
      draw();
    }
    return;
  }
  if (state.tool === "subway" && state.subway.active && state.subway.assetType === "toilet" && (state.subway.points || []).length >= 1) {
    const hover = nearestConnectionVertex(world, findPolygonAt(world), 18);
    const nextHover = hover ? {
      polygonId: hover.polygonId,
      holeIndex: hover.holeIndex,
      index: hover.index,
      point: hover.point,
    } : null;
    const changed = JSON.stringify(nextHover) !== JSON.stringify(state.subway.hoverVertex);
    if (changed) {
      state.subway.hoverVertex = nextHover;
      draw();
    }
    return;
  }
  if (state.tool === "wall" && state.wall.active) {
    const hover = snapWallPoint(world, findPolygonAt(world));
    const nextHover = hover ? {
      point: [Number(hover.point[0].toFixed(2)), Number(hover.point[1].toFixed(2))],
      polygonId: hover.poly?.polygon_id || null,
      source: hover.source,
    } : null;
    const changed = JSON.stringify(nextHover) !== JSON.stringify(state.wall.hoverSnap);
    if (changed) {
      state.wall.hoverSnap = nextHover;
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
    if (rect && rect.width >= 10 && rect.height >= 10) {
      applyCrop();
    } else {
      pipelineStatus.textContent = "crop: selected area is too small";
      draw();
    }
    return;
  }
  if (state.tool === "regionPick" && state.regionPick.active && state.regionPick.drawing) {
    finishRegionPickStroke();
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
  if (state.tool === "regionPick") return;
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
  if (state.tool === "localShift") {
    addLocalShiftPoint(world, poly);
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
  if (state.tool === "wall") {
    addWallPoint(world, poly);
    return;
  }
  if (state.tool === "zone") {
    addZonePoint(world, poly);
    return;
  }
  if (state.tool === "subway") {
    addSubwayAsset(world, poly);
    return;
  }
  if (state.tool === "platform") {
    addPlatformPoint(world, poly);
    return;
  }
  if (state.tool === "elevatorPoint") {
    addElevatorPoint(world, poly);
    return;
  }
  if (state.tool === "elevatorLink") {
    selectElevatorPoint(world, true);
    return;
  }
  if (state.tool === "stair") {
    if (state.stair.pickingPolygon) {
      pickStairPolygonAt(world);
      return;
    }
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
  if (selectLocalShift(world)) return;
  if (selectSubwayAsset(world)) return;
  if (selectWallPath(world)) return;
  if (selectZoneRegion(world)) return;
  if (selectPlatform(world, event.shiftKey || event.ctrlKey || event.metaKey)) return;
  if (selectElevatorPoint(world, event.shiftKey || event.ctrlKey || event.metaKey)) return;
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
  state.selectedWallId = null;
  state.selectedZoneId = null;
  state.selectedPlatformId = null;
  state.selectedPlatformIds = [];
  state.selectedElevatorPointId = null;
  state.selectedElevatorPointIds = [];
  state.selectedLayerAlignIndex = null;
  updateSelectedInfo();
  updateLayerAlignStatus();
  updateSubwayStatus();
  updateWallStatus();
  updateZoneStatus();
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
showZonesToggle.addEventListener("change", (event) => {
  setShowZones(event.target.checked);
});
if (showPlatformsToggle) {
  showPlatformsToggle.addEventListener("change", (event) => {
    state.showPlatforms = event.target.checked;
    draw();
  });
}
if (showNavigationNodesToggle) {
  showNavigationNodesToggle.addEventListener("change", (event) => {
    state.showNavigationNodes = event.target.checked;
    if (state.showNavigationNodes && !(state.navigationNodes || []).length) {
      loadRouteNodesFromUi();
      return;
    }
    draw();
  });
}
toggleZonesBtn.addEventListener("click", () => {
  setShowZones(!state.showZones);
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
document.getElementById("saveLayerHeightsBtn").addEventListener("click", saveLayerHeights);
document.getElementById("resetLayerHeightsBtn").addEventListener("click", resetLayerHeights);
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
document.getElementById("startLocalShiftBtn").addEventListener("click", startLocalShift);
document.getElementById("deleteLocalShiftBtn").addEventListener("click", deleteSelectedLocalShift);
document.getElementById("deleteAllLocalShiftBtn").addEventListener("click", deleteAllLocalShifts);
document.getElementById("undoLocalShiftBtn").addEventListener("click", undoLastLocalShift);
document.getElementById("resetLocalShiftBtn").addEventListener("click", resetLocalShift);
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
document.getElementById("pickStairPolygonBtn").addEventListener("click", startStairPolygonPick);
document.getElementById("useSelectedStairPolygonBtn").addEventListener("click", useSelectedStairPolygon);
document.getElementById("setConnectionTypeBtn").addEventListener("click", setSelectedStairConnectionType);
document.getElementById("deleteStairBtn").addEventListener("click", deleteSelectedStairConnection);
document.getElementById("deleteAllConnectionsBtn").addEventListener("click", deleteAllStairConnections);
document.getElementById("undoStairBtn").addEventListener("click", undoLastStairConnection);
document.getElementById("resetStairBtn").addEventListener("click", resetStairConnection);
document.getElementById("startWallBtn").addEventListener("click", startWallPath);
document.getElementById("applyWallBtn").addEventListener("click", applyWallPath);
document.getElementById("undoWallPointBtn").addEventListener("click", undoWallPoint);
document.getElementById("deleteWallBtn").addEventListener("click", deleteSelectedWallPath);
document.getElementById("deleteAllWallsBtn").addEventListener("click", deleteAllWalls);
document.getElementById("undoWallBtn").addEventListener("click", undoLastWall);
document.getElementById("resetWallBtn").addEventListener("click", resetWallPath);
document.getElementById("setSelectedPolygonZoneBtn").addEventListener("click", setSelectedPolygonZone);
document.getElementById("startZoneRegionBtn").addEventListener("click", startZoneRegion);
document.getElementById("applyZoneRegionBtn").addEventListener("click", applyZoneRegion);
document.getElementById("undoZonePointBtn").addEventListener("click", undoZonePoint);
document.getElementById("deleteZoneBtn").addEventListener("click", deleteSelectedZone);
document.getElementById("deleteAllZonesBtn").addEventListener("click", deleteAllZones);
document.getElementById("undoZoneBtn").addEventListener("click", undoLastZone);
document.getElementById("resetZoneRegionBtn").addEventListener("click", resetZoneRegion);
document.getElementById("startSubwayBtn").addEventListener("click", startSubwayPlacement);
document.getElementById("applySubwayBtn").addEventListener("click", applySubwayPlacement);
document.getElementById("deleteSubwayBtn").addEventListener("click", deleteSelectedSubwayAsset);
document.getElementById("deleteAllSubwayBtn").addEventListener("click", deleteAllSubwayAssets);
document.getElementById("undoSubwayBtn").addEventListener("click", undoLastSubwayAsset);
document.getElementById("resetSubwayBtn").addEventListener("click", resetSubwayPlacement);
document.getElementById("fetchQuickExitBtn").addEventListener("click", fetchQuickExitDoors);
platformStationInput.addEventListener("change", () => {
  platformStationInput.value = normalizeStationDisplayName(platformStationInput.value);
  populatePlatformLineOptions();
  populatePlatformDirectionOptions([]);
  state.platform.quickExitRows = [];
  quickExitStatus.textContent = "quick exit: not loaded";
});
platformLineInput.addEventListener("change", () => {
  populatePlatformDirectionOptions([]);
  state.platform.quickExitRows = [];
  quickExitStatus.textContent = "quick exit: not loaded";
});
platformDirectionInput.addEventListener("change", () => {
  state.platform.direction = platformDirectionInput.value;
  const rows = sortedQuickExitRowsForDirection(state.platform.quickExitRows || [], platformDirectionInput.value, selectedPlatformDoorsPerCar());
  quickExitStatus.textContent = rows.length
    ? [`quick exit: ${(state.platform.quickExitRows || []).length} rows loaded`, `${platformDirectionInput.value} 방면: ${rows.length} door(s)`, rows.map((row) => row.door_no).join(", ")].join("\n")
    : "quick exit: no doors for selected direction";
  updatePlatformStatus();
});
document.getElementById("startPlatformBtn").addEventListener("click", startPlatformLine);
document.getElementById("applyPlatformLineBtn").addEventListener("click", applyPlatformLine);
document.getElementById("applyPlatformMetadataBtn").addEventListener("click", applyPlatformMetadataToSelected);
document.getElementById("clearPlatformSelectionBtn").addEventListener("click", clearPlatformSelection);
document.getElementById("deletePlatformBtn").addEventListener("click", deleteSelectedPlatform);
document.getElementById("deleteAllPlatformsBtn").addEventListener("click", deleteAllPlatforms);
document.getElementById("undoPlatformBtn").addEventListener("click", undoLastPlatform);
document.getElementById("resetPlatformBtn").addEventListener("click", resetPlatformLine);
document.getElementById("startElevatorBtn").addEventListener("click", startElevatorPoint);
document.getElementById("startElevatorLinkBtn").addEventListener("click", startElevatorLink);
document.getElementById("applyElevatorLinkBtn").addEventListener("click", applyElevatorLink);
document.getElementById("applyElevatorExitBtn").addEventListener("click", applyElevatorExitToSelected);
document.getElementById("selectSameElevatorBtn").addEventListener("click", selectSameElevatorLink);
document.getElementById("clearElevatorLinkBtn").addEventListener("click", clearElevatorLinkFromSelected);
document.getElementById("clearElevatorSelectionBtn").addEventListener("click", clearElevatorSelection);
document.getElementById("deleteElevatorBtn").addEventListener("click", deleteSelectedElevatorPoint);
document.getElementById("deleteAllElevatorsBtn").addEventListener("click", deleteAllElevatorPoints);
document.getElementById("undoElevatorBtn").addEventListener("click", undoLastElevatorPoint);
document.getElementById("resetElevatorBtn").addEventListener("click", resetElevatorPoint);
document.getElementById("loadRouteNodesBtn").addEventListener("click", loadRouteNodesFromUi);
routeStartSelect.addEventListener("change", () => {
  routeStartInput.value = routeStartSelect.value;
});
routeGoalSelect.addEventListener("change", () => {
  routeGoalInput.value = routeGoalSelect.value;
});
document.getElementById("findRouteBtn").addEventListener("click", findRouteFromUi);
document.getElementById("exportRoutePathBtn").addEventListener("click", exportRoutePathFromUi);
document.getElementById("buildRouteEdgesBtn").addEventListener("click", buildRouteEdgesFromUi);
document.getElementById("uploadRoutePackageBtn").addEventListener("click", uploadRoutePackageToServer);
document.getElementById("clearRouteBtn").addEventListener("click", clearRouteOverlay);
document.getElementById("refreshImagesBtn").addEventListener("click", refreshImages);
imageSelect.addEventListener("change", loadSelectedImage);
uploadImageInput.addEventListener("change", uploadImageFile);
addClickListener("setupLoadExportedFinalBtn", loadExportedFinal);
document.getElementById("startCropBtn").addEventListener("click", startCrop);
document.getElementById("resetCropBtn").addEventListener("click", resetCrop);
document.getElementById("startMarkerBtn").addEventListener("click", startManualMarker);
document.getElementById("undoMarkerBtn").addEventListener("click", undoManualMarkerPoint);
document.getElementById("saveMarkerBtn").addEventListener("click", saveManualMarker);
markerModeInput?.addEventListener("change", () => {
  state.marker.mode = markerModeInput.value === "4point" ? "4point" : "3point";
  state.marker.points = [];
  state.marker.autoPoint = null;
  if (state.tool === "marker") {
    pipelineStatus.textContent =
      state.marker.mode === "4point"
        ? "manual marker: click 4 transform corner points"
        : "manual marker: click 3 adjacent transform points";
  }
  draw();
});
document.getElementById("startRegionPickBtn").addEventListener("click", startRegionPick);
document.getElementById("applyRegionPickBtn").addEventListener("click", applyRegionPick);
document.getElementById("undoRegionStrokeBtn").addEventListener("click", undoRegionStroke);
document.getElementById("resetRegionPickBtn").addEventListener("click", resetRegionPick);
document.getElementById("prepareMarkerImageBtn").addEventListener("click", prepareMarkerImageFromUi);
document.getElementById("detectIconsBtn").addEventListener("click", detectIconsFromUi);
document.getElementById("prepareIconImageBtn").addEventListener("click", prepareIconImageFromUi);
document.getElementById("runKmeansBtn").addEventListener("click", runKmeansFromUi);
document.getElementById("extractPolygonsBtn").addEventListener("click", extractPolygonsFromUi);
document.getElementById("runPipelineBtn").addEventListener("click", runPipelineFromUi);
document.getElementById("loadClustersBtn").addEventListener("click", loadClusters);
document.getElementById("runEditedGroupingBtn").addEventListener("click", runEditedGroupingFromUi);
document.getElementById("saveStationInfoBtn").addEventListener("click", saveStationInfo);
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
document.getElementById("validateSceneBtn").addEventListener("click", validateScene);
function exportSceneOptionsPayload() {
  const wallHeightRaw = document.getElementById("exportWallHeightInput")?.value;
  const wallHeight = wallHeightRaw === "" || wallHeightRaw === null || wallHeightRaw === undefined
    ? null
    : Number(wallHeightRaw);
  return {
    wall_height_override: Number.isFinite(wallHeight) && wallHeight >= 0 ? wallHeight : null,
    stair_has_pillar: !document.getElementById("exportStairNoPillarToggle")?.checked,
  };
}

document.getElementById("exportPlanesBtn").addEventListener("click", () => {
  saveAnnotations()
    .then(() => fetch("/api/export/planes", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify({
        working_polygons: workingPolygonsPayload(),
        render_preview: document.getElementById("renderScenePreviewToggle").checked,
        ...exportSceneOptionsPayload(),
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
    startPlatformLine();
  } else if (key === "w") {
    event.preventDefault();
    startStraighten();
  } else if (key === "e") {
    event.preventDefault();
    startElevatorPoint();
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
    startMoveVertex();
  } else if (key === "s") {
    event.preventDefault();
    startLocalShift();
  } else if (key === "t") {
    event.preventDefault();
    startSubwayPlacement();
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
  } else if (key === "b") {
    event.preventDefault();
    startWallPath();
  } else if (key === "p") {
    event.preventDefault();
    startCrop();
  } else if (key === "n") {
    event.preventDefault();
    startRegionPick();
  } else if (key === "o") {
    event.preventDefault();
    startElevatorLink();
  } else if (key === "m") {
    event.preventDefault();
    startManualMarker();
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
    if (state.tool === "straighten") {
      chooseStraightenOrangePath();
      if (isStraightenReady()) applyStraighten();
    }
  } else if (key === "z") {
    event.preventDefault();
    undoLastMerge();
  } else if (event.key === "Delete") {
    event.preventDefault();
    if (state.selectedSubwayId) deleteSelectedSubwayAsset();
    else if (state.selectedWallId) deleteSelectedWallPath();
    else if (state.selectedZoneId) deleteSelectedZone();
    else if (selectedPlatformIds().length) deleteSelectedPlatform();
    else if (selectedElevatorPointIds().length) deleteSelectedElevatorPoint();
    else if (state.selectedLayerAlignIndex !== null) deleteSelectedLayerAlignPair();
    else if (state.selectedLocalShiftIndex !== null) deleteSelectedLocalShift();
    else if (state.selectedStairId) deleteSelectedStairConnection();
    else deleteSelectedPolygon();
  } else if (event.key === "Backspace") {
    event.preventDefault();
    if (state.tool === "marker") undoManualMarkerPoint();
    else if (state.tool === "regionPick") undoRegionStroke();
    else if (state.tool === "cutHole") undoCutHolePoint();
    else if (state.tool === "splitPolygon") undoSplitPolygonPoint();
    else if (state.tool === "scaleCalibration") undoScaleCalibrationPoint();
    else if (state.tool === "wall") undoWallPoint();
    else if (state.tool === "zone") undoZonePoint();
    else if (state.tool === "subway") undoSubwayPoint();
    else if (state.tool === "platform") undoPlatformInputPoint();
    else undoAddPolygonPoint();
  } else if (event.key === "Shift") {
    event.preventDefault();
    if (state.tool === "keep") applySimpleKeep();
    else if (state.tool === "regionPick") applyRegionPick();
    else if (state.tool === "addPolygon") applyAddPolygon();
    else if (state.tool === "cutHole") applyCutHole();
    else if (state.tool === "scaleCalibration") applyScaleCalibration();
    else if (state.tool === "crop") applyCrop();
    else if (state.tool === "straighten") applyStraighten();
    else if (state.tool === "wall") applyWallPath();
    else if (state.tool === "zone") applyZoneRegion();
    else if (state.tool === "subway") applySubwayPlacement();
    else if (state.tool === "platform") applyPlatformLine();
  } else if (event.key === "Escape") {
    event.preventDefault();
    if (state.tool === "keep") resetSimpleKeep();
    else if (state.tool === "regionPick") resetRegionPick();
    else if (state.tool === "addPolygon") resetAddPolygon();
    else if (state.tool === "cutHole") resetCutHole();
    else if (state.tool === "splitPolygon") resetSplitPolygon();
    else if (state.tool === "layerAlign") resetLayerAlign();
    else if (state.tool === "localShift") resetLocalShift();
    else if (state.tool === "localAxis") resetLocalAxisCorrection();
    else if (state.tool === "subway") resetSubwayPlacement();
    else if (state.tool === "platform") resetPlatformLine();
    else if (state.tool === "elevatorPoint") resetElevatorPoint();
    else if (state.tool === "elevatorLink") resetElevatorLink();
    else if (state.tool === "scaleCalibration") resetScaleCalibration();
    else if (state.tool === "wall") resetWallPath();
    else if (state.tool === "zone") resetZoneRegion();
    else if (state.tool === "marker") {
      state.tool = "select";
      state.marker.active = false;
      draw();
    }
    else if (state.tool === "crop") resetCrop();
    else if (state.tool === "stair") resetStairConnection();
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
updateRegionPickStatus();
updateWallStatus();
updateZoneStatus();
updateZoneVisibilityControls();
populateSceneHeightInputs(state.annotations.scene_height);
setupSidebarTabs();
updateModeSummary();
updateSharedEdgeStatus();
updateAddPolygonStatus();
updateCutHoleStatus();
updateSplitPolygonStatus();
updateLayerAlignStatus();
updateScaleCalibrationStatus();
updateSubwayStatus();
updateStairStatus();
updatePlatformStatus();
updateElevatorStatus();
updateRouteStatus();
updateStationStatus();
updateKeepStatus();
loadStationOptions();
loadProject();
