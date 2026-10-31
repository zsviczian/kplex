/** Native document geometry lives outside the scaled graph. Expanded frames belong to the
 * visible canvas, so camera changes cannot strand their close/restore controls behind chrome. */
export function editorOverlayFrame(node: {x: number; y: number; width: number; height: number},
  camera: {x: number; y: number; scale: number}, viewport: {width: number; height: number}, maximized: boolean
): {left: number; top: number; width: number; height: number} {
  if (maximized) return {left: 12, top: 38, width: Math.max(1, viewport.width - 24), height: Math.max(1, viewport.height - 50)};
  return {left: camera.x + (node.x - node.width / 2) * camera.scale,
    top: camera.y + (node.y - node.height / 2) * camera.scale,
    width: Math.max(1, node.width * camera.scale), height: Math.max(1, node.height * camera.scale)};
}
