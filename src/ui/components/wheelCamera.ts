/** Wheel navigation math shared by canvas handlers and portable checks. Chromium sends trackpad
 * pinch as modifier-wheel input even when the canvas uses wheel navigation. That navigation
 * preference controls unmodified scrolling. */
/** Return the pointer-anchored camera, respecting line/page units and the caller's zoom ceiling. */
export function wheelCamera(camera: {x: number; y: number; scale: number}, event: {
  deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean;
}, point: {x: number; y: number}, trackpad: boolean, maxZoom: number, pageHeight: number, pinchSensitivity = 1) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  const modifiedZoom = event.ctrlKey || event.metaKey;
  if (trackpad && !modifiedZoom) {
    return {...camera, x: camera.x - event.deltaX * unit, y: camera.y - event.deltaY * unit};
  }
  const sensitivity = modifiedZoom && Number.isFinite(pinchSensitivity) && pinchSensitivity > 0
    ? pinchSensitivity : 1;
  const scale = Math.max(0.3, Math.min(maxZoom, camera.scale * Math.exp(-event.deltaY * (trackpad ? unit : 1) * 0.0015 * sensitivity)));
  return {scale, x: point.x - (point.x - camera.x) / camera.scale * scale,
    y: point.y - (point.y - camera.y) / camera.scale * scale};
}
