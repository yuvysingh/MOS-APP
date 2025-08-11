import { v1 as documentai } from "@google-cloud/documentai";

export const runtime = "nodejs"; // make sure we're not on Edge

const projectId   = process.env.DOC_AI_PROJECT_ID!;
const locationRaw = process.env.DOC_AI_LOCATION!;     // should be "us" or "eu"
const processorId = process.env.DOC_AI_PROCESSOR_ID!;

import { parseTicket } from "./parser";
import type { Parsed } from "./parser";

// Normalize: some folks put "europe-west2" — DocAI needs "eu" or "us"
const location = /^(eu|us)$/.test(locationRaw) ? locationRaw : (
  locationRaw.toLowerCase().includes("eu") ? "eu" :
  locationRaw.toLowerCase().includes("us") ? "us" : locationRaw
);

export async function POST(req: Request) {
  // ---- 1) Ingest upload and sanity-check bytes ----
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ error: "no file" }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());
  const mimeFromForm = file.type || "";

  // sniff magic bytes
  const first8 = buf.subarray(0, 8);
  const isPdf  = first8.subarray(0,4).toString() === "%PDF";
  const isPng  = first8.equals(Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]));
  const isJpg  = buf[0] === 0xff && buf[1] === 0xd8;

  const mimeType =
    isPdf ? "application/pdf" :
    isPng ? "image/png" :
    isJpg ? "image/jpeg" :
    mimeFromForm === "image/tiff" ? "image/tiff" :
    mimeFromForm === "application/pdf" || mimeFromForm === "image/png" || mimeFromForm === "image/jpeg"
      ? mimeFromForm
      : "unsupported";

  if (mimeType === "unsupported") {
    return Response.json(
      { error: `Unsupported file type (${mimeFromForm || "unknown"}). Use PDF, JPG/JPEG, PNG, or TIFF.` },
      { status: 400 }
    );
  }

  // ---- 2) Init client with the correct regional endpoint ----
  const apiEndpoint = `${location}-documentai.googleapis.com`;
  const client = new documentai.DocumentProcessorServiceClient({ apiEndpoint });

  // Build processor path; location must be "us" or "eu"
  const name = client.processorPath(projectId, location, processorId);

  

  // ---- 3) Call processDocument with BYTES (not base64) ----
  try {
    const [result] = await client.processDocument({
      name,
      rawDocument: { content: buf, mimeType }, // <-- Buffer + correct mime
    });

    const doc = result.document;
    console.log(doc?.text)
    // check for barcodes
    const barcodes =(doc?.pages ?? []).flatMap(p => p.detectedBarcodes ?? []);
    const barcodeExists = barcodes.length > 0;

    const parsedTicket: Parsed = parseTicket(doc?.text!!)


    return Response.json({
      ok: true,
      barcodeExists: barcodeExists,
      parsedTicket: parsedTicket
    });



  } catch (e: any) {
    console.error("DOC AI ERROR", {
      message: e.message,
      code: e.code,
      details: e.details,
      // these are often empty, but log anyway
      statusDetails: e.statusDetails?.map((d: any) => ({
        typeUrl: d.typeUrl,
        value: d.value?.toString?.(),
      })),
    });


    return Response.json({ error: e.details || e.message }, { status: 500 });
  }
}
