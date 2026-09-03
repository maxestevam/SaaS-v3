import { useState } from "react";
import Cropper from "react-easy-crop";
import { Check, Move, ZoomIn } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function EasyImageCropper({ imageSrc, mediaType = "image", aspect = 1, open, onCancel, onConfirm, title = "Recortar imagem" }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const aspectLabel = aspect === 1 ? "1:1" : aspect < 1 ? "9:16" : "16:9";

  return <Dialog open={open} onOpenChange={(value) => !value && onCancel()} title={title} description={`Proporção ${aspectLabel}. Arraste ${mediaType === "video" ? "o vídeo" : "a imagem"} e use a rolagem ou o gesto de pinça para aproximar.`} fullscreen>
    <div className="flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6"><div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black"><Cropper {...(mediaType === "video" ? { video: imageSrc } : { image: imageSrc })} crop={crop} zoom={zoom} aspect={aspect} minZoom={1} maxZoom={3} zoomSpeed={0.15} cropShape="rect" showGrid onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={(_, areaPixels) => setCroppedAreaPixels(areaPixels)} /></div><div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Move className="size-3.5" />Arraste para posicionar</span><span className="inline-flex items-center gap-1.5"><ZoomIn className="size-3.5" />Role ou use pinça para zoom</span><strong className="text-foreground">Proporção {aspectLabel}</strong></div><div className="flex shrink-0 justify-end gap-2"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="button" onClick={() => croppedAreaPixels && onConfirm({ croppedAreaPixels, aspect })} disabled={!croppedAreaPixels}><Check className="size-4" />Aplicar recorte</Button></div></div>
  </Dialog>;
}
