export function maybeCelebrateCreation(random = Math.random) {
  if (typeof document === "undefined" || random() >= 0.4) return false;
  const layer = document.createElement("div");
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "pointer-events:none;position:fixed;inset:0;z-index:100;overflow:hidden";
  const colors = ["#FF32B2", "#F97316", "#2563EB", "#16A34A", "#EAB308", "#7C3AED"];
  for (let index = 0; index < 72; index += 1) {
    const piece = document.createElement("i");
    const angle = (Math.PI * 2 * index) / 72;
    const distance = 150 + (index % 7) * 24;
    const size = 6 + (index % 4) * 2;
    piece.style.cssText = `position:absolute;left:50%;top:46%;width:${size}px;height:${size * 1.7}px;border-radius:2px;background:${colors[index % colors.length]};transform:translate(-50%,-50%);animation:ld-confetti-${index} 920ms cubic-bezier(.23,1,.32,1) forwards`;
    const style = document.createElement("style");
    style.textContent = `@keyframes ld-confetti-${index}{to{transform:translate(calc(-50% + ${Math.cos(angle) * distance}px),calc(-50% + ${Math.sin(angle) * distance + 160}px)) rotate(${360 + index * 25}deg);opacity:0}}`;
    layer.append(style, piece);
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 1100);
  return true;
}
