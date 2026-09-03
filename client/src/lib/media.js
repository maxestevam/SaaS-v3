/** Processamento local de mídias antes do upload. Nenhum arquivo original é alterado sem confirmação. */
export async function compressImage(file, crop = {}) {
  const image = await readImage(file);
  const aspect = Number(crop.aspect) > 0 ? Number(crop.aspect) : 1;
  const rawArea = crop.croppedAreaPixels;
  const source = rawArea ? { x: Math.max(0, Math.round(rawArea.x)), y: Math.max(0, Math.round(rawArea.y)), width: Math.min(image.width, Math.round(rawArea.width)), height: Math.min(image.height, Math.round(rawArea.height)) } : fallbackCrop(image, aspect);
  const outputWidth = Math.min(1600, Math.max(720, Math.round(source.width)));
  const outputHeight = Math.max(1, Math.round(outputWidth / aspect));
  const canvas = document.createElement("canvas");
  canvas.width = outputWidth; canvas.height = outputHeight;
  canvas.getContext("2d").drawImage(image, source.x, source.y, source.width, source.height, 0, 0, outputWidth, outputHeight);
  const blob = await new Promise((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Não foi possível comprimir a imagem.")), "image/webp", 0.84));
  return new File([blob], `${safeBaseName(file.name)}.webp`, { type: "image/webp", lastModified: Date.now() });
}

function fallbackCrop(image, aspect) { const width = Math.min(image.width, image.height * aspect); const height = width / aspect; return { x: Math.round((image.width - width) / 2), y: Math.round((image.height - height) / 2), width: Math.round(width), height: Math.round(height) }; }

export async function compressVideo(file, cropOrProgress = {}, maybeProgress = () => {}) {
  const crop = typeof cropOrProgress === "function" ? {} : cropOrProgress;
  const onProgress = typeof cropOrProgress === "function" ? cropOrProgress : maybeProgress;
  if (file.type !== "video/mp4" && file.type !== "video/webm") throw new Error("Selecione um vídeo MP4 ou WebM.");
  const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
  const ffmpeg = new FFmpeg();
  ffmpeg.on("progress", ({ progress }) => onProgress(Math.max(0, Math.min(0.99, progress))));
  const base = "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/umd";
  try {
    await ffmpeg.load({ coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"), wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm") });
    const inputName = `source.${file.type === "video/webm" ? "webm" : "mp4"}`;
    const outputName = "compressed.mp4";
    await ffmpeg.writeFile(inputName, await fetchFile(file));
    const area = crop.croppedAreaPixels;
    const cropFilter = area ? `crop=${even(area.width)}:${even(area.height)}:${even(area.x)}:${even(area.y)},` : "";
    await ffmpeg.exec(["-i", inputName, "-vf", `${cropFilter}scale='min(1280,iw)':-2`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-movflags", "+faststart", outputName]);
    const data = await ffmpeg.readFile(outputName);
    onProgress(1);
    return new File([data], `${safeBaseName(file.name)}.mp4`, { type: "video/mp4", lastModified: Date.now() });
  } catch {
    throw new Error("Não foi possível comprimir este vídeo neste navegador. Tente um arquivo menor em MP4 ou WebM.");
  } finally { ffmpeg.terminate(); }
}

function even(value) { return Math.max(2, Math.floor(Number(value || 0) / 2) * 2); }

function readImage(file) { return new Promise((resolve, reject) => { const image = new Image(); const url = URL.createObjectURL(file); image.onload = () => { URL.revokeObjectURL(url); resolve(image); }; image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível ler a imagem.")); }; image.src = url; }); }
function safeBaseName(value) { return String(value || "imagem").replace(/\.[^.]+$/, "").replace(/[^a-z0-9-_]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "arquivo"; }
