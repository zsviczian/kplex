/** Deterministic measured three-to-twelve-region packing around one attention/editor envelope. Existing host
 * owners retain clipping/reflow/resizing/camera. Guides remain decorative without endpoints. */
import type {PlexProjection, PlexMeasurement, PlexViewLayout, PlexArea, PlexDecoration, ViewRect, CanvasViewText, PlexDecorationTextSize} from "../contracts";
import type {FacetPreset, FacetCanvasState} from "./contracts";
import {measuredAreaGrid, measuredAreaColumns} from "../areaLayout";
import {nodeBadgeBounds, nodeBadgeInsets} from "../decorations";
import {facetCategoryLabel, facetHasWuXingPhases, facetRelativeLabel, FACET_WUXING_CYCLE} from "./labels";
import {facetAreaId, facetCombinedAreaId} from "./projection";
import {facetPresetAssignments} from "./assignment";
import {facetDiagnostics, facetLayout, facetLayoutOrder} from "./presentation";
import {FACET_LIMITS} from "./validation";
import {facetCategoryFrames} from "./layoutStrategies";
import {layoutFacetFlows} from "./flow";

/** Reuse the shared measured grid/reflow for every area member, including opted-in attention.
 * Empty regions retain their visible bounds and controls; classification/identity never changes. */
function pack(id: string, bounds: ViewRect, projection: PlexProjection, measured: ReadonlyMap<string, PlexMeasurement>,
  positions: Map<string, ViewRect>, label: CanvasViewText, editable: boolean, described = false, partitionOrder?: readonly string[], content = bounds): PlexArea {
  const occurrences = projection.occurrences.filter(row => row.areaId === id);
  if (partitionOrder) occurrences.sort(/** Diagnostic rows follow stable status identity, never translated text. */ (a, b) => partitionOrder.indexOf(a.groupingPartition ?? "") - partitionOrder.indexOf(b.groupingPartition ?? ""));
  const items = occurrences.flatMap(/** Missing measurements cannot invent a displayable occurrence. */ row => {const value = measured.get(row.id);return value ? [value] : [];});
  const cells = items.map(/** Badges occupy measured space without replacing canonical card dimensions. */ item => ({...item, insets: nodeBadgeInsets(item, item.badge)}));
  const columns = measuredAreaColumns(cells, content.width, 18), grid = measuredAreaGrid(cells, columns, 18, 18, 24, 18, 18), header = described ? 78 : 54, top = content.y + header;
  for (const [key, rect] of grid.positions) positions.set(key, {...rect, x: content.x + (content.width - grid.width) / 2 + rect.x, y: top + rect.y});
  return {id, bounds, labelKey: "key" in label ? label.key : "", ...("literal" in label ? {label: label.literal} : {}),
    ...(editable ? {resizeEdge: "bottom", heightPreference: {key: id, minimum: 160, maximum: Math.max(1200, bounds.height)},
      widthResizeEdge: "right", widthPreference: {key: id, minimum: 200, maximum: Math.max(2400, bounds.width), value: bounds.width}} : {}),
    viewport: {x: content.x, y: top, width: content.width, height: content.height - header, contentTop: top,
      contentHeight: Math.max(content.height - header, grid.height), initialScrollTop: 0},
    reflow: {columns, columnGap: 18, rowGap: 18, paddingTop: 18, paddingBottom: 18, autoColumns: true}};
}
/** Ring radius separates neighboring region diagonals and reserves the center's actual editor
 * plus badge envelope. Preset-scoped area overrides never leak to another preset/category. */
export function layoutFacets(projection: PlexProjection, measured: readonly PlexMeasurement[], presetId: string, preset: FacetPreset,
  areaHeights: Readonly<Record<string, number>> = {}, editable = true, areaWidths: Readonly<Record<string, number>> = {}, state?: FacetCanvasState | null,
  decorationMeasurements?: ReadonlyMap<string, PlexDecorationTextSize>): PlexViewLayout {
  const measurements = new Map(measured.map(row => [row.id, row])), attention = measurements.get(projection.entry);
  const assignments = new Set(editable ? facetPresetAssignments(presetId, preset).map(target => target.id) : []);
  if (!attention || preset.order.length < 3 || preset.order.length > FACET_LIMITS.categories) throw new Error("Invalid Facets center/categories");
  const entry = projection.occurrences.find(row => row.id === projection.entry);
  const contained = !!entry?.areaId && preset.order.some(id => entry.areaId === facetAreaId(presetId, "category", id));
  /** Each area owns only its actual card envelopes; unrelated long notes cannot enlarge it. */
  const dimensions = (id: string, fallback = preset.regionHeight): {width: number; height: number} => {
    const category = preset.order.find(/** Stable category IDs never alias diagnostic size defaults. */ key => facetAreaId(presetId, "category", key) === id);
    const diagnostic = ["unassigned", "conflicting", "checking", "unresolved"].find(/** Separate statuses retain independent defaults across combined-mode toggles. */ key => facetAreaId(presetId, "status", key) === id);
    const defaults = category ? preset.areaSizes?.categories?.[category] : preset.areaSizes?.diagnostics?.[diagnostic ?? "combined"];
    let width = Math.max(200, Math.min(2400, areaWidths[id] ?? defaults?.width ?? preset.regionWidth)), height = Math.max(160, Math.min(1200, areaHeights[id] ?? defaults?.height ?? fallback));
    for (const occurrence of projection.occurrences) if (occurrence.areaId === id) {
      const item = measurements.get(occurrence.id);if (!item) continue;
      const insets = nodeBadgeInsets(item, item.badge);
      width = Math.max(width, item.width + (insets?.right ?? 0) + 48);height = Math.max(height, item.height + (insets?.top ?? 0) + 114);
    }
    return {width, height};
  };
  const order = facetLayoutOrder(preset), layout = facetLayout(preset, presetId, state), badge = !contained && attention.badge
    ? nodeBadgeBounds({x: 0, y: 0, width: attention.width, height: attention.height}, attention.badge) : undefined;
  // A contained editor belongs to its measured area. Reserving its old central envelope would
  // stretch every category and diagnostic dock around a nonexistent second attention node.
  const centralSize = contained ? {width: 0, height: 0} : attention;
  const strategy = facetCategoryFrames(order.map(/** Each area owns its actual measured size. */ id => dimensions(facetAreaId(presetId, "category", id))),
    {x: 0, y: 0, width: centralSize.width, height: centralSize.height}, badge, preset.spacing, layout.effective, preset.focusAnchor);
  const {radius, diagonal, centers} = strategy;
  const positions = new Map<string, ViewRect>(contained ? [] : [[projection.entry, {x: 0, y: 0, width: attention.width, height: attention.height}]]);
  const areas: PlexArea[] = [], decorations: PlexDecoration[] = [];
  const focusPartition = projection.occurrences.find(row => row.id === projection.entry)?.groupingPartition;
  const focus = preset.order.find(id => focusPartition === facetAreaId(presetId, "category", id));
  for (let index = 0; index < order.length; index++) {
    const categoryId = order[index], id = facetAreaId(presetId, "category", categoryId), category = preset.categories[categoryId];
    const frame = strategy.frames[index], region = frame.bounds, label = facetCategoryLabel(category, categoryId);
    const description = facetRelativeLabel(preset, focus, categoryId);
    areas.push({...pack(id, region, projection, measurements, positions, label, editable, !!description, undefined, frame.content),
      ...(frame.shape ? {shape: frame.shape, ...(editable ? {resizeEdge: "top" as const,
        heightPreference: {key: id, minimum: 160, maximum: Math.max(1200, frame.height), value: frame.height},
        widthPreference: {key: id, minimum: 200, maximum: Math.max(2400, frame.width), value: frame.width}} : {})} : {}),
      ...(assignments.has(id) ? {dropTarget: {kind: "property" as const, assignmentId: id}} : {})});
    decorations.push({id, kind: "region", bounds: region, labelKey: "key" in label ? label.key : "", ...("literal" in label ? {label: label.literal} : {}),
      areaId: id, count: true, ...(frame.shape ? {shape: frame.shape} : {}), ...(description ? {description} : {}), ...(preset.tints ? {color: category.color} : {})});
  }
  const wuxing = preset.interpretation === "wuxing" && facetHasWuXingPhases(preset);
  decorations.push(...layoutFacetFlows(preset, order, strategy.frames, layout.effective, decorationMeasurements));
  const cycle: readonly string[] = wuxing ? FACET_WUXING_CYCLE : order;
  if (preset.guides && layout.effective === "circular") for (const step of wuxing && preset.regulatingGuides ? [1, 2] : [1]) for (let index = 0; index < cycle.length; index++) {
    const aIndex = order.indexOf(cycle[index]), bIndex = order.indexOf(cycle[(index + step) % cycle.length]);
    const a = centers[aIndex], b = centers[bIndex], distance = Math.hypot(b.x - a.x, b.y - a.y), inset = diagonal / 2;
    const dx = (b.x - a.x) / distance, dy = (b.y - a.y) / distance;
    // Regulating and reordered non-adjacent cycles route outside all regions and the native
    // attention editor. Bounded samples carry no semantic endpoints or relationship authority.
    const outer = step === 2 || wuxing && ![1, order.length - 1].includes((bIndex - aIndex + order.length) % order.length);
    const points = outer ? (() => {
      const angle = -Math.PI / 2 + aIndex * Math.PI * 2 / order.length;
      const sweep = (bIndex - aIndex + order.length) % order.length * Math.PI * 2 / order.length;
      const outerRadius = radius + diagonal + preset.spacing * step;
      return [{x: a.x * (radius + inset) / radius, y: a.y * (radius + inset) / radius},
        ...Array.from({length: 17}, (_, n) => ({x: Math.cos(angle + sweep * n / 16) * outerRadius, y: Math.sin(angle + sweep * n / 16) * outerRadius})),
        {x: b.x * (radius + inset) / radius, y: b.y * (radius + inset) / radius}];
    })() : [{x: a.x + dx * inset, y: a.y + dy * inset}, {x: b.x - dx * inset, y: b.y - dy * inset}];
    decorations.push({id: `facets-guide-${step}-${cycle[index]}-${cycle[(index + step) % cycle.length]}`, kind: "guide", points,
      ...(wuxing ? {directed: true, variant: step === 2 ? "regulating" as const : "generating" as const} : {})});
  }
  // Dock outside the complete measured category/focus/guide footprint. Empty outer guide
  // routes are decorative, but still occupy space and must not run through diagnostic cards.
  const diagnostics = facetDiagnostics(preset, presetId, state), centerBounds = {x: -attention.width / 2, y: -attention.height / 2, width: attention.width, height: attention.height};
  const footprint = [...areas.map(/** Area rectangles include contained focus/editor and their bounded scroll surfaces. */ area => area.bounds),
    ...(!contained ? [centerBounds] : []), ...(badge ? [badge] : [])];
  for (const mark of decorations) if (mark.kind === "guide") {
    if (mark.stroke !== "none") for (const point of mark.points) footprint.push({x: point.x - 12, y: point.y - 12, width: 24, height: 24});
    if (mark.caption) footprint.push(mark.caption.bounds);
  }
  const left = Math.min(...footprint.map(rect => rect.x)), right = Math.max(...footprint.map(rect => rect.x + rect.width));
  const top = Math.min(...footprint.map(rect => rect.y)), bottom = Math.max(...footprint.map(rect => rect.y + rect.height));
  const combinedId = facetCombinedAreaId(presetId), combinedVisible = diagnostics.showEmpty !== false || projection.occurrences.some(row => row.areaId === combinedId);
  const diagnosticIds = diagnostics.combined ? combinedVisible ? [combinedId] : [] : diagnostics.order.flatMap(/** Empty primary statuses retain the old separate-mode default unless explicitly configured. */ status => {
    const id = facetAreaId(presetId, "status", status), populated = projection.occurrences.some(row => row.areaId === id);
    return populated || diagnostics.showEmpty === true || diagnostics.showEmpty !== false && (status === "unassigned" || status === "conflicting") ? [id] : [];
  });
  const horizontal = !diagnostics.combined && diagnostics.orientation === "horizontal", sizes = diagnosticIds.map(/** Each diagnostic surface retains its own dimension identity. */ id => dimensions(id, 220));
  const dockWidth = horizontal ? sizes.reduce((sum, size) => sum + size.width, 0) + Math.max(0, sizes.length - 1) * 20 : Math.max(0, ...sizes.map(size => size.width));
  const dockHeight = horizontal ? Math.max(0, ...sizes.map(size => size.height)) : sizes.reduce((sum, size) => sum + size.height, 0) + Math.max(0, sizes.length - 1) * 20;
  const gap = Math.max(160, preset.spacing * 2);
  let dockX = diagnostics.side === "right" ? right + gap : diagnostics.side === "left" ? left - gap - dockWidth : (left + right - dockWidth) / 2;
  let dockY = diagnostics.side === "top" ? top - gap - dockHeight : diagnostics.side === "bottom" ? bottom + gap : (top + bottom - dockHeight) / 2;
  for (const [index, id] of diagnosticIds.entries()) {
    const region = {x: dockX, y: dockY, ...sizes[index]}, status = diagnostics.order.find(value => facetAreaId(presetId, "status", value) === id);
    const label = {key: diagnostics.combined ? "facets.diagnostics" : status === "unresolved" ? "facets.cannotClassify" : `facets.${status}`};
    areas.push({...pack(id, region, projection, measurements, positions, label, editable, false,
      diagnostics.combined ? diagnostics.order.map(value => facetAreaId(presetId, "status", value)) : undefined),
      ...(!diagnostics.combined && assignments.has(id) ? {dropTarget: {kind: "property" as const, assignmentId: id}} : {})});
    decorations.push({id, kind: "region", bounds: region, labelKey: label.key, areaId: id, count: true,
      ...(status === "unassigned" ? {color: preset.unassignedColor} : status === "conflicting" ? {color: preset.conflictingColor} : {})});
    if (horizontal) dockX += region.width + 20;else dockY += region.height + 20;
  }
  if (positions.size !== measured.length) throw new Error("Invalid Facets membership geometry");
  return {positions, areas, decorations};
}
