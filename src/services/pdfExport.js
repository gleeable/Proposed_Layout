import { jsPDF } from 'jspdf';

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export async function saveImageAsPdf(imageDataUrl, fileName) {
  const img = await loadImage(imageDataUrl);
  const orientation = img.width >= img.height ? 'landscape' : 'portrait';
  const pdf = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const scale = Math.min(pageWidth / img.width, pageHeight / img.height);
  const width = img.width * scale;
  const height = img.height * scale;
  const x = (pageWidth - width) / 2;
  const y = (pageHeight - height) / 2;

  pdf.addImage(imageDataUrl, 'PNG', x, y, width, height);
  pdf.save(fileName);
}
