/** Wheel navigation math shared by the canvas handler and portable behavioral checks. */
export function wheelCamera(camera: {x: number; y: number; scale: number}, event: {
  deltaX: number; deltaY: number; deltaMode: number; ctrlKey: boolean; metaKey: boolean;
}, point: {x: number; y: number}, trackpad: boolean, maxZoom: number, pageHeight: number) {
  const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? pageHeight : 1;
  if (trackpad && !event.ctrlKey && !event.metaKey) {
    return {...camera, x: camera.x - event.deltaX * unit, y: camera.y - event.deltaY * unit};
  }
  const scale = Math.max(0.3, Math.min(maxZoom, camera.scale * Math.exp(-event.deltaY * (trackpad ? unit : 1) * 0.0015)));
  return {scale, x: point.x - (point.x - camera.x) / camera.scale * scale,
    y: point.y - (point.y - camera.y) / camera.scale * scale};
}
