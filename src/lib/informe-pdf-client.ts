const MAX_CANVAS_HEIGHT = 14_000;

function prepareCloneForCapture(clonedDoc: Document): void {
  clonedDoc.querySelectorAll<HTMLElement>('[data-informe-chrome]').forEach((el) => {
    el.style.display = 'none';
  });

  clonedDoc.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src');
    if (src?.startsWith('/_next/image')) {
      const url = new URL(src, window.location.origin);
      const original = url.searchParams.get('url');
      if (original) img.setAttribute('src', decodeURIComponent(original));
    }
    img.setAttribute('crossorigin', 'anonymous');
  });
}

async function captureElement(
  element: HTMLElement,
  html2canvas: typeof import('html2canvas')['default'],
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale: 1,
    useCORS: true,
    allowTaint: false,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
    onclone: (clonedDoc) => prepareCloneForCapture(clonedDoc),
  });
}

export async function downloadInformePdfFromDom(filename: string): Promise<void> {
  const article = document.querySelector('article');
  if (!article) {
    throw new Error('No se encontró el contenido del informe.');
  }

  const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
    import('html2canvas'),
    import('jspdf'),
  ]);

  const chrome = document.querySelector('[data-informe-chrome]');
  const prevVisibility = chrome instanceof HTMLElement ? chrome.style.visibility : '';
  if (chrome instanceof HTMLElement) {
    chrome.style.visibility = 'hidden';
  }

  try {
    const sections = Array.from(article.querySelectorAll<HTMLElement>('section'));
    const targets = sections.length > 0 ? sections : [article as HTMLElement];

    const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait', compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let firstPage = true;

    for (const target of targets) {
      const canvas = await captureElement(target, html2canvas);
      if (canvas.height > MAX_CANVAS_HEIGHT) {
        throw new Error('El informe es demasiado largo para exportar en el navegador.');
      }

      const imgData = canvas.toDataURL('image/jpeg', 0.92);
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      let offsetY = 0;

      while (offsetY < imgHeight) {
        if (!firstPage) pdf.addPage();
        firstPage = false;
        pdf.addImage(imgData, 'JPEG', 0, -offsetY, pageWidth, imgHeight, undefined, 'FAST');
        offsetY += pageHeight;
      }
    }

    pdf.save(filename);
  } finally {
    if (chrome instanceof HTMLElement) {
      chrome.style.visibility = prevVisibility;
    }
  }
}
