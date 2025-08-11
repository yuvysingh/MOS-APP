'use client'
import { useState, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useToast } from '@/app/context/ToastContext'
import Modal from "../private/purchase/modal";


type ParsedTicket = {
  ok: boolean;
  event_day: string | null; // ISO date
  price?: number | null;
  ticket_type?: "early" | "late" | "normal" | null;
  barcode_exists: boolean;
};

// used to find the type of file
function guessExt(file: File) {
  const byName = file.name.split(".").pop()?.toLowerCase();
  if (byName) return byName;
  if (file.type === "application/pdf") return "pdf";
  if (file.type.startsWith("image/")) return "jpg";
  return "bin";
}

export default function TicketUploader({ userId }: { userId: string }) {
    const [file, setFile] = useState<File | null>(null); // storing file
    const [preview, setPreview] = useState<string | null>(null); // storing local path for preview
    const [parsed, setParsed] = useState<ParsedTicket | null>(null); // recording the parsed image
    const [loading, setLoading] = useState<boolean>(false); 
    const ticketIdRef = useRef<string | null>(null); // stores the ticket id for storing in supabase
    const { showToast } = useToast();
    const [isModalOpen, setModalOpen] = useState(false);

    //TODO: api
    const onPick = async (e:React.ChangeEvent<HTMLInputElement>) => {
        const input = e.currentTarget;     // HTMLInputElement
        const file = input.files?.[0];     // File | undefined
        if (!file) return;

        const okType =
        file.type.startsWith("image/") || file.type === "application/pdf";
        
        if (!okType) {
        showToast("Please upload an image or PDF", { type: 'error' });
        e.target.value = ""; // allow re-selecting same file
        return;}

        setLoading(true);

        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/vision-validate", { method: "POST", body: form });
        const data2 = await res.json()
        console.log(data2)
        const data = {
            ok: data2.ok,
            event_day: data2.parsedTicket.event_day,
            price:data2.parsedTicket.face_value,
            ticket_type: data2.parsedTicket.entry_by,
            barcode_exists: data2.barcode_exists
        }
        

        setLoading(false);

        if (!data.ok) { 
            setFile(null);
            setParsed(null);
            setPreview(null);
            showToast("Invalid ticket image", { type: 'error' });
            return;
            }
        
        setParsed(data);
        setFile(file)
        setPreview(URL.createObjectURL(file))
        e.target.value = "";
    } 

    const remove = () => {
        if (preview) URL.revokeObjectURL(preview);
        setFile(null);
        setPreview(null);
        setParsed(null);
        setLoading(false);
        ticketIdRef.current = null;
    }

    const closeModal = () => {
        setModalOpen(false);
    }

    const handleUpload = async () => {
        setLoading(true)
        const supabase = await createClient();
        const ticketId = crypto.randomUUID();
        const ext = guessExt(file!!);
        const {data:{user}} = await supabase.auth.getUser();
        if (!user) throw new Error("Please log in first");
        const path = `${user.id}/${ticketId}.${ext}`;
        
        
        const { error: upErr } = await supabase.storage
        .from("tickets")
        .upload(path, file!!, {
        contentType: file!!.type || "application/pdf",
        upsert: false,
        });
        if (upErr) throw new Error(`Upload failed: ${upErr.message}`);
        console.log(parsed);
        const { error: rowErr } = await supabase.from("selling_tickets").insert({
            id: ticketId,
            seller_id: user.id,
            sale_date: parsed!!.event_day,
            sell_price: parsed!!.price,
            phase: parsed!!.ticket_type,
            path: path,

            });
        if (rowErr) {
    // optional cleanup if the row insert fails
        await supabase.storage.from("tickets").remove([path]).catch(() => {});
        throw new Error(`DB insert failed: ${rowErr.message}`);
    }
    closeModal();
    showToast("Success, ticket uploaded", { type: "success" });
    setLoading(false);
    
    }

    
    // space y-3 is the outer div
    return <div className="space-y-3">
        {!preview && (
        <input
          type="file"
          accept="image/*,.pdf"
          onChange={onPick}
          disabled={loading}
        />
      )}
      {preview && (
        <div className="flex items-center gap-3">
          <img src={preview} alt="ticket preview" className="h-24 w-auto rounded" />
          <div className="flex flex-col gap-2">
            {loading && <span>Checking…</span>}
            <div className="flex gap-2">
              <button onClick={remove}>Remove</button>
              <button onClick={() => setModalOpen(true)}>Submit</button>
            </div>
          </div>
        </div>
          
      )}
      
        
    <Modal open={isModalOpen} onClose={closeModal}>
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Confirm ticket</h2>

            <dl className="grid grid-cols-3 gap-2 text-sm">
                <dt className="text-gray-600">Date</dt>
                <dd className="col-span-2">{parsed?.event_day}</dd>

                <dt className="text-gray-600">Price</dt>
                <dd className="col-span-2">£{Number(parsed?.price ?? 0).toFixed(2)}</dd>

                <dt className="text-gray-600">Type</dt>
                <dd className="col-span-2">{parsed?.ticket_type}</dd>
            </dl>
            <button
            type="button"
            disabled={loading}
            onClick={handleUpload}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
            >
            {loading ? "Uploading…" : "Upload"}
            </button>
        </div> 
    </Modal>
    </div>;
}