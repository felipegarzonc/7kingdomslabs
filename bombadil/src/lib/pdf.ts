import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/** Extracts the text layer of a PDF. Scanned PDFs return little or no text. */
export async function pdfToText(bytes: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: true });
  return { text: text.replace(/[ \t]+\n/g, "\n").trim(), pages: totalPages };
}

/** Heuristic: fewer than ~40 characters per page means no usable text layer. */
export function looksScanned(text: string, pages: number): boolean {
  return text.replace(/\s/g, "").length < 40 * Math.max(1, pages);
}
