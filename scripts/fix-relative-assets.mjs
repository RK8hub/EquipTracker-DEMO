// Astro con assetsPrefix "." deja las fuentes como url(./_astro/...) dentro de
// un CSS que ya vive en _astro/. Se corrige a url(./...) para que funcionen
// tanto en la raíz del dominio como en /EquipTracker-DEMO/.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = "dist/_astro";
for (const file of readdirSync(dir).filter((name) => name.endsWith(".css"))) {
  const path = join(dir, file);
  const css = readFileSync(path, "utf8")
    .replaceAll("url(./_astro/", "url(./")
    .replaceAll("url(/_astro/", "url(./");
  writeFileSync(path, css);
}
