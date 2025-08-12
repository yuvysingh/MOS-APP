import { v1 as documentai } from "@google-cloud/documentai";

const projectId   = process.env.DOC_AI_PROJECT_ID!;
const geo    = process.env.DOC_AI_LOCATION!;           // "us" or "eu"
const processorId = process.env.DOC_AI_PROCESSOR_ID!;     // the one you just created


export const runtime = "nodejs";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return Response.json({ ok: false, error: "no file" }, { status: 400 });

  const bytes = Buffer.from(await file.arrayBuffer());
  const mime  = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");

  const client = new documentai.DocumentProcessorServiceClient({ apiEndpoint: `${geo}-documentai.googleapis.com`});
  const name = client.processorPath(projectId, geo, processorId);

  const [resp] = await client.processDocument({
    name,
    rawDocument: { content: bytes, mimeType: mime },
  });

  const doc = resp.document;
  const text = doc?.text ?? "";
  const pages = doc?.pages ?? [];
  

  // --- Map form fields by (normalized) key ---
  const fields = new Map<string, string>();
  for (const p of pages) {
    for (const f of p.formFields ?? []) {
      const k = getText(text, f.fieldName?.textAnchor).trim().toLowerCase();
      const v = getText(text, f.fieldValue?.textAnchor).trim();
      if (k) fields.set(k, v);
    }
  }

  // Pull values by fuzzy key match
  const startsVal   = findKV(fields, ["starts", "start time", "start"]);
  const endsVal     = findKV(fields, ["ends", "end time", "end"]);
  const faceValRaw  = findKV(fields, ["face value", "price"]);
  const locationVal = findKV(fields, ["location", "venue"]);
  const eventVal    = findKV(fields, ["event", "event name", "event title"]);

  // Fallbacks: if Form Parser didn’t emit a KV, you can still parse from full text.
  const face_value = money(faceValRaw) ?? money(afterLabel(text, /face\s*value/i));
  const event_day  = dateFrom(startsVal) ?? dateFrom(near(text, "Starts"));
  const end_time   = timeFrom(endsVal)   ?? timeFrom(near(text, "Ends"));
  const location   = locationVal ?? afterLabel(text, /^location$/i) ?? null;
  const event      = eventVal ?? afterLabel(text, /^event$/i) ?? null;

  // Ticket type + entry_by per your rules
  const ticket_type: "vip" | "standard" =
    /\bvip\b/i.test(text) ? "vip" : "standard";
  const entry_by: "early" | "normal" | "late" =
    /\bearly\s*entry\b/i.test(text) ? "early" :
    /\blate\s*entry\b/i.test(text)  ? "late"  :
    (/\b(normal|standard)\s*entry\b/i.test(text) ? "normal" : "normal");

  
            
  let barcode_exists = true;
  
  

  return Response.json({
    ok: true,
    face_value,
    location,
    event,
    event_day,
    ticket_type,
    entry_by,
    barcode_exists
  });
}

/* -------- helpers -------- */



function findKV(map: Map<string,string>, keys: string[]) {
  for (const [k, v] of map) {
    if (keys.some(kk => k.includes(kk))) return v;
  }
  return null;
}

function money(s?: string | null) {
  if (!s) return null;
  const m = s.match(/£?\s*([\d]{1,3}(?:,[\d]{3})*(?:\.[\d]{2})?)/);
  return m ? Number(m[1].replace(/,/g, "")) : null;
}

function afterLabel(text: string, label: RegExp): string | null {
  const lines = text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++){
    if (label.test(lines[i].trim())) {
      const same = lines[i].replace(label, "").trim();
      if (same) return same;
      for (let j=i+1;j<lines.length;j++){
        const v = lines[j].trim();
        if (v) return v;
      }
    }
  }
  return null;
}

function near(text: string, label: string, win=10): string | null {
  const lines = text.split(/\r?\n/).map(l=>l.trim());
  const idx = lines.findIndex(l => l.toLowerCase() === label.toLowerCase());
  if (idx === -1) return null;
  for (let i=1;i<=win;i++){
    const b = idx - i, f = idx + i;
    if (b>=0 && /\d{1,2}\s+[A-Za-z]{3,}/.test(lines[b])) return lines[b];
    if (f<lines.length && /\d{1,2}\s+[A-Za-z]{3,}/.test(lines[f])) return lines[f];
  }
  return null;
}

function dateFrom(s?: string | null): string | null {
  if (!s) return null;
  const m = s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/i);
  if (!m) return null;
  const day = Number(m[1]);
  const mon = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ").indexOf(m[2].slice(0,3).toLowerCase())+1;
  const yearHint = (s.match(/\b(20\d{2})\b/)?.[1]) ? Number(RegExp.$1) : undefined;
  let y = yearHint ?? new Date().getUTCFullYear();
  const iso = (yy:number)=> `${yy}-${String(mon).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  if (!yearHint) {
    const dt = new Date(`${iso(y)}T00:00:00Z`);
    if (dt.getTime() < Date.now() - 24*3600*1000) y += 1;
  }
  return iso(y);
}

function timeFrom(s?: string | null): string | null {
  if (!s) return null;
  const m = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (!m) return null;
  let h = Number(m[1]); const mm = m[2]; const mer = (m[3]||"").toLowerCase();
  if (mer === "pm" && h < 12) h += 12;
  if (mer === "am" && h === 12) h = 0;
  return `${String(h).padStart(2,"0")}:${mm}`;
}

function getText(
  full: string | undefined,
  anchor: any
): string {
  try {
    if (!full || !anchor?.textSegments?.length) return "";
    let out = "";
    for (const seg of anchor.textSegments) {
      const s = Number(seg.startIndex ?? 0);
      const e = Number(seg.endIndex ?? 0);
      out += full.slice(s, e);
    }
    return out;
  } catch {
    return "";
  }
}
