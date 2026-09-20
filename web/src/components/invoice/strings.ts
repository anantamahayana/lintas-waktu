/** Everything printed on an invoice / quotation, in the client's language. */
export type Lang = "en" | "id";

export const STR = {
  en: {
    invoice: "Invoice", quotation: "Quotation", for: "for", no: "no.", issued: "Issued", due: "Due", validUntil: "Valid until", paidOn: "Paid",
    description: "Description", qty: "Qty", unit: "Unit", amount: "Amount", subtotal: "Subtotal", discount: "Discount", tax: "Tax", total: "Total",
    received: "Received", balanceDue: "Balance due", payment: "Payment", notes: "Notes", terms: "Terms", stampPaid: "Paid", stampVoid: "Void", stampBalance: "Balance due",
    verification: "Verification", code: "Code", verifyHint: "scan, or check at", verifyBody: "A genuine document matches this number and code there, together with our official payment details. We never change bank accounts by chat — pay only to the account shown on the verified page.",
    print: "Print / Save as PDF", questions: (kind: string) => `Questions about this ${kind === "quote" ? "quotation" : "invoice"}? Reply to the message you received it in.`,
    locale: "en-GB",
  },
  id: {
    invoice: "Invoice", quotation: "Penawaran", for: "untuk", no: "no.", issued: "Diterbitkan", due: "Jatuh tempo", validUntil: "Berlaku sampai", paidOn: "Dibayar",
    description: "Keterangan", qty: "Jml", unit: "Harga satuan", amount: "Jumlah", subtotal: "Subtotal", discount: "Diskon", tax: "Pajak", total: "Total",
    received: "Sudah diterima", balanceDue: "Sisa tagihan", payment: "Pembayaran", notes: "Catatan", terms: "Ketentuan", stampPaid: "Lunas", stampVoid: "Batal", stampBalance: "Sisa tagihan",
    verification: "Verifikasi", code: "Kode", verifyHint: "pindai, atau cek di", verifyBody: "Dokumen asli cocok dengan nomor dan kode ini di sana, beserta rekening resmi kami. Kami tidak pernah mengganti rekening lewat chat — bayar hanya ke rekening yang tampil di halaman terverifikasi.",
    print: "Cetak / Simpan PDF", questions: (kind: string) => `Ada pertanyaan tentang ${kind === "quote" ? "penawaran" : "invoice"} ini? Balas pesan tempat Anda menerimanya.`,
    locale: "id-ID",
  },
} as const;

export const VERIFY = {
  en: {
    title: "Document verification", lead: "Enter the number and the verification code printed at the bottom of the invoice or quotation.", number: "Number", code: "Verification code", check: "Verify", checking: "Checking…",
    genuine: (kind: string) => `Genuine ${kind === "quote" ? "quotation" : "invoice"}`, issuedBy: (name: string) => `This document was issued by ${name} and the details below are the current, official ones.`,
    for: "For", total: "Total", issued: "Issued", status: "Status", paid: "Paid", awaiting: "Issued — awaiting payment", bank: "Official payment details",
    altered: (contact: string) => `If the document you hold shows a different amount, name or bank account, it has been altered — do not pay it. Contact ${contact} to confirm.`,
    cancelledTitle: "This document was cancelled", notVerified: "Not verified",
    voidBody: "This number was issued and later voided. It is no longer payable — a replacement carries a new number.",
    unknownBody: "We have no issued document with this number. Check the number, or ask us directly before paying anything.",
    noMatchBody: "The code does not match this number. Either the document was altered after we issued it, or it is an older version that has since been corrected. Ask us for the current one before paying.",
    us: "us",
  },
  id: {
    title: "Verifikasi dokumen", lead: "Masukkan nomor dan kode verifikasi yang tercetak di bagian bawah invoice atau penawaran.", number: "Nomor", code: "Kode verifikasi", check: "Verifikasi", checking: "Memeriksa…",
    genuine: (kind: string) => `${kind === "quote" ? "Penawaran" : "Invoice"} asli`, issuedBy: (name: string) => `Dokumen ini diterbitkan oleh ${name} dan rincian di bawah adalah yang resmi dan terkini.`,
    for: "Untuk", total: "Total", issued: "Diterbitkan", status: "Status", paid: "Lunas", awaiting: "Diterbitkan — menunggu pembayaran", bank: "Rekening resmi",
    altered: (contact: string) => `Jika dokumen yang Anda pegang menunjukkan jumlah, nama, atau rekening yang berbeda, dokumen itu telah diubah — jangan dibayar. Hubungi ${contact} untuk memastikan.`,
    cancelledTitle: "Dokumen ini dibatalkan", notVerified: "Tidak terverifikasi",
    voidBody: "Nomor ini pernah diterbitkan lalu dibatalkan. Tidak perlu dibayar — penggantinya memakai nomor baru.",
    unknownBody: "Tidak ada dokumen terbit dengan nomor ini. Periksa nomornya, atau tanyakan langsung ke kami sebelum membayar apa pun.",
    noMatchBody: "Kode tidak cocok dengan nomor ini. Dokumen mungkin diubah setelah kami terbitkan, atau ini versi lama yang sudah dikoreksi. Minta versi terbaru ke kami sebelum membayar.",
    us: "kami",
  },
} as const;
