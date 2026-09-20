/** Client-gallery copy, EN + ID. Kept local: the gallery lives outside the site's locale routing. */
export type Lang = "en" | "id";

export interface Dict {
  galleryFor: string; tapToEnter: string; privateGallery: string; enterPin: string; openGallery: string; pinHelp: string;
  expired: string; expiredBody: string; preview: string; photos: string; choose: string; upTo: string; until: string;
  howItWorks: string; guideTitle: string; guideIntro: (n: number, max: number, d: string | null) => string;
  steps: readonly (readonly [string, string])[]; gotIt: string; all: string; selected: string; marked: string;
  leftIn: (n: number) => string; tapToChoose: string; packageFull: string; overBy: (n: number) => string; quotaReached: string;
  send: string; sendSelection: string; overTitle: string; overBody: (n: number, max: number) => string; yesExtra: string; notNow: string;
  noteFor: string; notePh: string; chosen: string; chooseThis: string; mark: string; unmark: string; close: string;
  confirmTitle: (n: number) => string; confirmBody: (n: number, e: number, done: number) => string; confirmBodyNoExtra: (n: number) => string;
  back: string; confirmSend: (n: number) => string; sending: string; thanks: (name: string) => string;
  finalTitle: string; finalBody: (n: number, e: number) => string; finalNo: string; finalYes: string;
  saving: string; saved: string; offline: string;
  albumBtn: string; album: { title: string; sub: (n: number) => string; cover: string; end: string; endBody: string; close: string; shuffle: string; page: (a: number, b: number, n: number) => string; hint: string; };
  sentBody: (n: number, e: number) => string; locked: string; viewSelection: string; filterNone: string; extra: string;
}

const ph = (n: number) => `${n} photograph${n === 1 ? "" : "s"}`;

export const T: Record<Lang, Dict> = {
  en: {
    galleryFor: "A gallery for", tapToEnter: "Tap to enter",
    privateGallery: "Private gallery", enterPin: "Enter the 4-digit PIN from your message.", openGallery: "Open gallery",
    pinHelp: "Lost the PIN? Reply to the message you received and we’ll resend it. This device stays unlocked for 7 days.",
    expired: "This gallery has closed.", expiredBody: "The link is past its date. If you still need to choose, ask us to reopen it.",
    preview: "Photographer preview — nothing is saved and Send is disabled. To test as a client, open the link without ?preview=1.",
    photos: "photographs", choose: "choose", upTo: "up to", until: "until",
    howItWorks: "How it works", guideTitle: "Choosing your photos",
    guideIntro: (n: number, max: number, d: string | null) => `You can choose ${n} photographs in your package${max > n ? ` (up to ${max} with extras)` : ""}${d ? `, before ${d}` : ""}.`,
    steps: [
      ["Tap a photo to choose it", "Tap again to undo. Chosen photos get a gold frame."],
      ["Tap ⤢ to see it large", "Swipe left or right to move between photos."],
      ["Leave a note if you like", "“Crop tighter”, “black & white?” — we read every one."],
      ["Not sure yet? Mark it", "Marked photos stay in a separate list until you decide."],
      ["Send when you’re done", "Your picks save automatically, so you can continue later, even from another phone."],
    ],
    gotIt: "Got it",
    all: "All", selected: "Selected", marked: "Marked",
    leftIn: (n: number) => `${n} left in your package`, tapToChoose: "Tap a photo to choose", packageFull: "Package full", overBy: (n: number) => `${n} beyond the package`, quotaReached: "Maximum reached",
    send: "Send", sendSelection: "Send selection",
    overTitle: "Add this one as an extra?",
    overBody: (n: number, max: number) => `Your package includes ${n} photographs. Photos beyond that are marked EXTRA and charged per photo — you can choose up to ${max - n} more, and change which ones count as extras before sending.`,
    yesExtra: "Yes, add as extra", notNow: "Not now",
    noteFor: "Note for this photo", notePh: "Crop tighter, black & white, …", chosen: "Chosen — tap to undo", chooseThis: "Choose this photo", mark: "Mark", unmark: "Unmark", close: "Close",
    confirmTitle: (n: number) => `Send ${ph(n)}?`,
    confirmBody: (n: number, e: number, done: number) => `${n} in your package, ${e} extra${e === 1 ? "" : "s"}. Tap a photo to choose which ones count as extras (${done}/${e} marked).`,
    confirmBodyNoExtra: (n: number) => `${ph(n)}. After sending, the gallery locks — ask us if you need to change something later.`,
    back: "Back to gallery", confirmSend: (n: number) => `Send ${ph(n)}`, sending: "Sending…",
    finalTitle: "Send your selection?",
    finalBody: (n: number, e: number) => `${ph(n)}${e > 0 ? ` (${e} extra${e === 1 ? "" : "s"})` : ""} ${n === 1 ? "goes" : "go"} to the photographer for editing. After this the gallery locks and you can’t change your picks yourself.`,
    finalNo: "Not yet", finalYes: "Yes, send",
    saving: "saving…", saved: "saved ✓", offline: "offline — picks kept on this device",
    albumBtn: "Preview album",
    album: {
      title: "Album preview", sub: (n: number) => `${n} photograph${n === 1 ? "" : "s"}`, cover: "Cover", end: "The end", endBody: "An impression of how your album could feel. The real one is laid out by hand, with your notes in mind.",
      close: "Close", shuffle: "Shuffle layout", page: (a: number, b: number, n: number) => `Pages ${a}–${b} of ${n}`, hint: "Drag a page to turn it",
    },
    thanks: (name: string) => `Thank you, ${name}.`,
    sentBody: (n: number, e: number) => `${ph(n)} ${n === 1 ? "is" : "are"} on the way to the edit${e ? ` — ${n - e} in your package and ${e} extra${e === 1 ? "" : "s"}` : ""}. We’ll be in touch within a day about delivery.`,
    locked: "Your gallery stays open to view, but choices are now locked.", viewSelection: "View my selection",
    filterNone: "Nothing here yet.", extra: "Extra",
  },
  id: {
    galleryFor: "Galeri untuk", tapToEnter: "Ketuk untuk masuk",
    privateGallery: "Galeri privat", enterPin: "Masukkan PIN 4 digit dari pesanmu.", openGallery: "Buka galeri",
    pinHelp: "Lupa PIN? Balas pesan yang kamu terima, kami kirim ulang. Perangkat ini tetap terbuka selama 7 hari.",
    expired: "Galeri ini sudah ditutup.", expiredBody: "Tautannya sudah lewat tanggal. Kalau masih perlu memilih, minta kami membukanya lagi.",
    preview: "Pratinjau fotografer — tidak ada yang tersimpan dan tombol Kirim nonaktif. Untuk mencoba sebagai klien, buka link tanpa ?preview=1.",
    photos: "foto", choose: "pilih", upTo: "hingga", until: "sampai",
    howItWorks: "Cara kerja", guideTitle: "Memilih fotomu",
    guideIntro: (n: number, max: number, d: string | null) => `Kamu bisa memilih ${n} foto dalam paket${max > n ? ` (hingga ${max} dengan tambahan)` : ""}${d ? `, sebelum ${d}` : ""}.`,
    steps: [
      ["Ketuk foto untuk memilih", "Ketuk lagi untuk membatalkan. Foto pilihan diberi bingkai emas."],
      ["Ketuk ⤢ untuk melihat besar", "Geser kiri/kanan untuk pindah foto."],
      ["Tulis catatan jika perlu", "“Crop lebih ketat”, “hitam putih?” — semua kami baca."],
      ["Belum yakin? Tandai dulu", "Foto yang ditandai masuk daftar terpisah sampai kamu memutuskan."],
      ["Kirim kalau sudah selesai", "Pilihan tersimpan otomatis, jadi bisa dilanjutkan nanti, bahkan dari HP lain."],
    ],
    gotIt: "Mengerti",
    all: "Semua", selected: "Pilihan", marked: "Ditandai",
    leftIn: (n: number) => `Sisa ${n} foto dalam paket`, tapToChoose: "Ketuk foto untuk memilih", packageFull: "Paket terpenuhi", overBy: (n: number) => `${n} di luar paket`, quotaReached: "Batas maksimal tercapai",
    send: "Kirim", sendSelection: "Kirim pilihan",
    overTitle: "Tambahkan sebagai foto tambahan?",
    overBody: (n: number, max: number) => `Paketmu berisi ${n} foto. Foto di luar itu ditandai TAMBAHAN dan dikenakan biaya per foto — kamu bisa memilih hingga ${max - n} lagi, dan menentukan mana yang jadi tambahan sebelum mengirim.`,
    yesExtra: "Ya, tambahkan", notNow: "Nanti dulu",
    noteFor: "Catatan untuk foto ini", notePh: "Crop lebih ketat, hitam putih, …", chosen: "Dipilih — ketuk untuk batal", chooseThis: "Pilih foto ini", mark: "Tandai", unmark: "Hapus tanda", close: "Tutup",
    confirmTitle: (n: number) => `Kirim ${n} foto?`,
    confirmBody: (n: number, e: number, done: number) => `${n} dalam paket, ${e} tambahan. Ketuk foto untuk menentukan mana yang jadi tambahan (${done}/${e} ditandai).`,
    confirmBodyNoExtra: (n: number) => `${n} foto. Setelah dikirim, galeri terkunci — hubungi kami kalau perlu mengubah sesuatu.`,
    back: "Kembali ke galeri", confirmSend: (n: number) => `Kirim ${n} foto`, sending: "Mengirim…",
    finalTitle: "Kirim pilihan Anda?",
    finalBody: (n: number, e: number) => `${n} foto${e > 0 ? ` (${e} tambahan)` : ""} akan dikirim ke fotografer untuk diedit. Setelah ini galeri terkunci dan pilihan tidak bisa Anda ubah sendiri.`,
    finalNo: "Belum", finalYes: "Ya, kirim",
    saving: "menyimpan…", saved: "tersimpan ✓", offline: "offline — pilihan aman di perangkat ini",
    albumBtn: "Pratinjau album",
    album: {
      title: "Pratinjau album", sub: (n: number) => `${n} foto`, cover: "Sampul", end: "Selesai", endBody: "Gambaran bagaimana album Anda bisa terasa. Album aslinya kami tata dengan tangan, dengan catatan Anda dalam pertimbangan.",
      close: "Tutup", shuffle: "Acak tata letak", page: (a: number, b: number, n: number) => `Halaman ${a}–${b} dari ${n}`, hint: "Tarik halaman untuk membaliknya",
    },
    thanks: (name: string) => `Terima kasih, ${name}.`,
    sentBody: (n: number, e: number) => `${n} foto sedang menuju proses edit${e ? ` — ${n - e} dalam paket dan ${e} tambahan` : ""}. Kami hubungi dalam sehari soal pengiriman.`,
    locked: "Galerimu tetap bisa dilihat, tapi pilihan sudah terkunci.", viewSelection: "Lihat pilihanku",
    filterNone: "Belum ada di sini.", extra: "Tambahan",
  },
};
