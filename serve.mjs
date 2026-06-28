// خادم ثابت بسيط لمعاينة dist محلياً فقط (ليس للإنتاج).
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(fileURLToPath(new URL(".", import.meta.url)), "dist");
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8" };
const port = 4178;

createServer(async (req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/" || p === "") p = "/index.html";
  try {
    const buf = await readFile(join(dir, p));
    res.writeHead(200, { "Content-Type": types[extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch {
    res.writeHead(404);
    res.end("not found");
  }
}).listen(port, () => console.log(`serving dist on http://localhost:${port}`));
