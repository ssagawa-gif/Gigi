// WhatsApp "Export chat → Attach media" gives a .zip with _chat.txt and the attachments.
// GiGi only takes the PDF attachments (lab reports) and reads them like any upload.
// The text of the conversation is never read or stored. Everything happens in the browser.
import { unzip } from 'fflate';

const isPdf = (name, bytes) => /\.pdf$/i.test(name) || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46); // %PDF
const isPhoto = (name) => /\.(jpe?g|png|heic|webp)$/i.test(name);

/** Returns { isChat, pdfs: File[], photos: number } — throws if the file isn't a zip. */
export async function unzipChat(file) {
  const buf = new Uint8Array(await file.arrayBuffer());
  let photos = 0, isChat = false;
  const entries = await new Promise((res, rej) => unzip(buf, {
    // decide from the name alone; only PDFs are unpacked (the chat text and photos never are)
    filter: (f) => {
      const name = f.name.split('/').pop() || '';
      if (f.name.startsWith('__MACOSX')) return false;
      if (/^_?chat\.txt$|^WhatsApp Chat/i.test(name)) { isChat = true; return false; }
      if (isPhoto(name)) { photos += 1; return false; }
      return /\.pdf$/i.test(name) && f.originalSize < 25 * 1024 * 1024;
    },
  }, (err, out) => (err ? rej(err) : res(out))));
  const pdfs = Object.entries(entries)
    .filter(([path, bytes]) => isPdf(path, bytes))
    .map(([path, bytes]) => new File([bytes], path.split('/').pop(), { type: 'application/pdf' }));
  return { isChat, pdfs, photos };
}

// The reports found in the last imported chat, kept in memory while she checks them one by one.
export const chatImport = { items: [], photos: 0 };
