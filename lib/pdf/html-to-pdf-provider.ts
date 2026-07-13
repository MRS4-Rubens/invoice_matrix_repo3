import { Buffer } from 'buffer';

const API_KEY = process.env.HTML_TO_PDF_API_KEY;

if (!API_KEY) {
  throw new Error('Missing HTML_TO_PDF_API_KEY environment variable');
}

/**
 * This is the ONLY place in the codebase that knows which third-party PDF rendering vendor is in use.
 * If CustomJS ever needs to be replaced, only this file's internals should need to change — 
 * the function signature (a URL in, a PDF Buffer out) must stay the same for every caller.
 * 
 * Fetches the provided URL using CustomJS and renders it as an A4 PDF.
 */
export async function renderUrlToPdfBuffer(url: string): Promise<Buffer> {
  const response = await fetch('https://e.customjs.io/html2pdf', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY as string,
    },
    body: JSON.stringify({
      input: { url },
      config: {
        pdfWidthMm: 210,
        pdfHeightMm: 297,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`PDF rendering failed (${response.status}): ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
