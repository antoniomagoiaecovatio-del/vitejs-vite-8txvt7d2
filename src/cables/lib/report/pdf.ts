// Genera el PDF del informe y lo descarga directamente (sin pasar por el diálogo de impresión).
// El HTML del informe se dibuja en un iframe oculto, se captura como imagen y se arma el PDF A4.
// Las librerías se cargan recién al tocar el botón.

const PAGE_W = 794; // A4 a 96 dpi
const PAGE_H = 1123;
const MARGIN = 30; // ≈ 8 mm
const SCALE = 2.5;

const nombreArchivo = (proyecto: string) => {
  const base = proyecto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 50);
  const d = new Date();
  const f = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return `Dimensionamiento_conductores${base ? "_" + base : ""}_${f}.pdf`;
};

function cargarIframe(html: string): Promise<HTMLIFrameElement> {
  return new Promise((resolve, reject) => {
    const fr = document.createElement("iframe");
    fr.setAttribute("aria-hidden", "true");
    fr.style.cssText = `position:fixed;left:-10000px;top:0;width:${PAGE_W}px;height:${PAGE_H * 3}px;border:0;visibility:hidden`;
    fr.onload = () => resolve(fr);
    fr.onerror = () => reject(new Error("No se pudo preparar el informe."));
    fr.srcdoc = html;
    document.body.appendChild(fr);
  });
}

export async function descargarInformePdf(html: string, proyecto: string): Promise<void> {
  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
  const fr = await cargarIframe(html);
  try {
    const doc = fr.contentDocument!;
    const body = doc.body;
    // Espera a que carguen las fuentes del sistema.
    await (doc as Document & { fonts?: { ready: Promise<unknown> } }).fonts?.ready;
    await new Promise((r) => setTimeout(r, 150));

    const alto = () => Math.ceil(body.getBoundingClientRect().height);
    // Si no entra en una hoja, los pasos pasan a una sola columna para poder cortar entre pasos.
    if (alto() > PAGE_H) doc.querySelector(".pasos")?.classList.add("una-col");
    const total = alto();

    // Posiciones (en px del documento) donde se puede cortar sin partir un bloque.
    const top = body.getBoundingClientRect().top;
    const cortes = [...body.querySelectorAll(".top,.kpis,.grid,.paso,.specs,.al,.consideracion,.pie,.sec-t")]
      .map((e) => Math.floor(e.getBoundingClientRect().bottom - top))
      .sort((a, b) => a - b);

    const canvas = await html2canvas(body, {
      scale: SCALE,
      backgroundColor: "#ffffff",
      width: PAGE_W,
      height: total,
      windowWidth: PAGE_W,
      windowHeight: total,
      logging: false,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const mmPorPx = 210 / PAGE_W;

    // Reparto en páginas.
    const tramos: [number, number][] = [];
    if (total <= PAGE_H) {
      tramos.push([0, total]);
    } else {
      let y = 0;
      while (y < total - 1) {
        const util = y === 0 ? PAGE_H - MARGIN : PAGE_H - 2 * MARGIN;
        if (y + util >= total) {
          tramos.push([y, total]);
          break;
        }
        const limite = y + util;
        const cand = cortes.filter((c) => c > y + util * 0.45 && c <= limite);
        const corte = cand.length ? cand[cand.length - 1] : limite;
        tramos.push([y, corte]);
        y = corte;
      }
    }

    tramos.forEach(([y0, y1], i) => {
      if (i > 0) pdf.addPage();
      const alt = y1 - y0;
      const pagina = document.createElement("canvas");
      pagina.width = canvas.width;
      pagina.height = Math.round(alt * SCALE);
      const ctx = pagina.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, pagina.width, pagina.height);
      ctx.drawImage(canvas, 0, Math.round(y0 * SCALE), canvas.width, pagina.height, 0, 0, canvas.width, pagina.height);
      const img = pagina.toDataURL("image/jpeg", 0.9);
      const offset = i === 0 ? 0 : MARGIN;
      pdf.addImage(img, "JPEG", 0, offset * mmPorPx, 210, alt * mmPorPx);
    });

    pdf.setProperties({ title: `Dimensionamiento de conductores${proyecto ? " - " + proyecto : ""}`, author: "Ecovatio", creator: "Panel de Obras Solares" });
    pdf.save(nombreArchivo(proyecto));
  } finally {
    fr.remove();
  }
}
