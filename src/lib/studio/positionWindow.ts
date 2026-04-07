export interface WindowPlacement {
  top: number;
  left: number;
}

const EDGE_GAP = 10;

/**
 * Compute a fixed-position placement for a floating window anchored to a
 * DOM element. Chooses whether to open above or below the anchor based on
 * available viewport space, and clamps horizontally so the window stays on-screen.
 */
export function positionWindow(
  anchorRect: DOMRect,
  windowWidth: number,
  windowHeight: number,
  gap = 14
): WindowPlacement {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Horizontal: center on anchor, then clamp to [gap, vw-width-gap]
  const anchorCenterX = anchorRect.left + anchorRect.width / 2;
  let left = anchorCenterX - windowWidth / 2;
  const leftMin = EDGE_GAP;
  const leftMax = vw - windowWidth - EDGE_GAP;
  left = Math.max(leftMin, Math.min(left, leftMax));

  // Vertical: prefer above, then below, then centered
  let top: number;
  const spaceAbove = anchorRect.top - gap;
  const spaceBelow = vh - anchorRect.bottom - gap;

  if (spaceAbove >= windowHeight + EDGE_GAP) {
    top = anchorRect.top - windowHeight - gap;
  } else if (spaceBelow >= windowHeight + EDGE_GAP) {
    top = anchorRect.bottom + gap;
  } else {
    top = Math.max(EDGE_GAP, (vh - windowHeight) / 2);
  }

  // Final vertical clamp
  top = Math.max(EDGE_GAP, Math.min(top, vh - windowHeight - EDGE_GAP));

  return { top, left };
}
