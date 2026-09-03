import fs from "node:fs";

const bannerPath = "/home/ubuntu/saas-multi-loja-online/client/src/pages/BannersPage.jsx";
const categoryPath = "/home/ubuntu/saas-multi-loja-online/client/src/components/CategoryManager.jsx";

function replaceOrThrow(source, before, after, label) {
  if (!source.includes(before)) throw new Error(`Trecho não encontrado: ${label}`);
  return source.replaceAll(before, after);
}

let banners = fs.readFileSync(bannerPath, "utf8");
banners = banners.replace('import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";\n', "");
banners = banners.replaceAll('  const mobile = useMediaQuery("(max-width: 767px)");\n', "");
banners = replaceOrThrow(
  banners,
  '  if (mobile) return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="max-h-[94vh]">{open && <><DrawerHeader className="border-b"><DrawerTitle>{banner ? copy.editTitle : copy.createTitle}</DrawerTitle><p className="text-sm text-muted-foreground">{copy.editorDescription}</p></DrawerHeader>{content}</>}</DrawerContent></Drawer>;\n  return <Dialog open={open} onOpenChange={onOpenChange} title={banner ? copy.editTitle : copy.createTitle} description={copy.editorDescription} className="max-w-3xl">{content}</Dialog>;',
  '  return <Dialog open={open} onOpenChange={onOpenChange} title={banner ? copy.editTitle : copy.createTitle} description={copy.editorDescription} fullscreen>{content}</Dialog>;',
  "editor padrão e legado"
);
banners = replaceOrThrow(
  banners,
  '  if (mobile) return <Drawer open={open} onOpenChange={onOpenChange}><DrawerContent className="max-h-[94vh]"><DrawerHeader className="shrink-0 border-b"><DrawerTitle>{banner ? copy.editTitle : copy.createTitle}</DrawerTitle><p className="text-sm text-muted-foreground">Defina as regras primeiro e envie as mídias somente ao salvar o banner.</p></DrawerHeader>{content}</DrawerContent></Drawer>;\n  return <Dialog open={open} onOpenChange={onOpenChange} title={banner ? copy.editTitle : copy.createTitle} description="Defina as regras primeiro e envie as mídias somente ao salvar o banner." className="max-w-3xl">{content}</Dialog>;',
  '  return <Dialog open={open} onOpenChange={onOpenChange} title={banner ? copy.editTitle : copy.createTitle} description="Defina as regras primeiro e envie as mídias somente ao salvar o banner." fullscreen>{content}</Dialog>;',
  "editor final"
);
banners = banners.replace(/function useMediaQuery\([^)]*\) \{[^}]*\}\n/g, "");
fs.writeFileSync(bannerPath, banners);

let categories = fs.readFileSync(categoryPath, "utf8");
categories = categories.replace('import { Drawer, DrawerContent, DrawerFooter, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";\n', "");
categories = categories.replace('  const mobile = useMediaQuery("(max-width: 767px)");\n', "");
const start = categories.indexOf('{editor && (mobile ?');
const end = categories.indexOf(')}<AlertDialog', start);
if (start < 0 || end < 0) throw new Error("Trecho do editor de categoria não encontrado");
const replacement = '{editor && <Dialog open onOpenChange={(value) => !value && closeEditor()} title={`${editor.id ? "Editar" : "Nova"} ${tab === "subcategories" ? "subcategoria" : "categoria"}`} description="Defina nome, status, categoria principal e recorte padrão." fullscreen>{editorContent}</Dialog>}';
categories = `${categories.slice(0, start)}${replacement}${categories.slice(end + 2)}`;
categories = categories.replace('function useMediaQuery() { return false; }\n', "");
fs.writeFileSync(categoryPath, categories);
