export function shouldShowListControls(total) {
  return Number(total || 0) > 10;
}
