declare module "pdf-parse/lib/pdf-parse.js" {
  type PdfResult = { numpages: number; text: string };
  export default function pdfParse(dataBuffer: Buffer): Promise<PdfResult>;
}
