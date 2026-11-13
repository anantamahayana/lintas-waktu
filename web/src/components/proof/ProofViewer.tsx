"use client";

/**
 * Album proof for the client (/p/[slug]); design in the album-app Figma file, page "10 · Proof klien (web)".
 * PIN → the album spread by spread → notes per spread (optionally pointing at a spot) → approve.
 * A short tour runs once per device; the ? button replays it. Images come signed from the API.
 */
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import clsx from "clsx";
import { Logo } from "@/components/brand/Logo";
import { myNotes, papi, ProofError, proofToken, store, type PNote, type ProofData, type ProofMeta } from "@/lib/proof-api";

type Lang = "en" | "id";
const GOLD = "#c8832f";

const T = {
  en: {
    proof: "Album proof", yourProof: "Your album proof", enterPin: "Enter the 4-digit PIN from our message.", open: "Open album",
    pinHelp: "The PIN is in the WhatsApp message from us. This device stays unlocked for 7 days.",
    expired: "This proof link has closed.", expiredBody: "Ask us to reopen it if you still need it.", missing: "This link is not valid.",
    pages: (l: string) => (/\d/.test(l) ? `Pages ${l}` : l), spreadOf: (i: number, n: number) => `Spread ${i} of ${n}`,
    notesFor: (l: string) => (/\d/.test(l) ? `Notes for pages ${l}` : `Notes for the ${l.toLowerCase()}`), notesSub: "We read every note before we print. English or Indonesian is fine.",
    noNotes: "No notes on these pages yet.", writePh: (l: string) => (/\d/.test(l) ? `Write a note for pages ${l}…` : `Write a note for the ${l.toLowerCase()}…`), pointing: "Pointing at a spot", unpoint: "Remove",
    name: "Your name", add: "Add note", tapHint: "Tap a photo to point at it", approve: "Approve album", approvedOn: (d: string) => `Approved ${d}`,
    approveTitle: "Approve this album?", approveBody: "We'll print these pages and the cover exactly as you see them. Changes after approval can delay the album by a few days.",
    openNotes: (n: number) => `${n} note${n > 1 ? "s are" : " is"} still waiting for us.`, notYet: "Not yet", approveYes: "Approve & send to print",
    thanks: (n: string) => `Thank you, ${n}`, thanksBody: (d: string) => `Album approved on ${d}. We'll send it to print and message you when it ships.`,
    view: "View the album", notes: "Notes", preview: "Photographer preview: notes and approval are turned off.", remove: "Remove", done: "Done",
    older: (v: number) => `Version ${v}`, rotate: "Turn your phone for a bigger view", swipe: "Swipe for the next spread", help: "How it works",
    noteFail: "The note could not be saved. Check your connection and try again.", saving: "Saving…",
    viewPage: "Page", viewSpread: "Spread", seen: (a: number, b: number) => `Viewed ${a} of ${b}`, allSeen: "All spreads viewed",
    writeNote: "Write a note", approveAfter: (a: number, b: number) => `Approve · ${a}/${b}`, page: (p: string) => `Page ${p}`, nextPage: (p: string) => `swipe for page ${p} →`,
    summary: (n: number) => (n ? `${n} note${n > 1 ? "s" : ""} for us to look at. Approve when the album feels right.` : "No notes so far. Approve when the album feels right."),
    chips: ["Swap this photo", "Brighter", "Move it", "Remove this photo"], noteHere: (l: string) => (/\d/.test(l) ? `Note for pages ${l}` : `Note for the ${l.toLowerCase()}`),
    pinch: "Pinch to zoom", close: "Close", lastPage: "Last page", frontCover: "Front cover", swipeOn: "swipe to open →",
    tour: {
      welcome: (n: string) => `Welcome, ${n}`, intro: "This is your album before it goes to print. Look through every page, leave notes where you'd like changes, and approve when it feels right.",
      tiles: ["Flip through", "Point & note", "Approve"], tilesSub: ["Every page, as it will be printed.", "Tell us what you'd like changed.", "When everything feels right."],
      showMe: "Show me how (30 sec)", skipLook: "Skip, I'll look around", again: "You can open this again anytime with the ? button.",
      step: (i: number, n: number) => `Step ${i} of ${n}`, skip: "Skip", back: "Back", next: "Next", gotIt: "Got it",
      steps: (mobile: boolean) => [
        mobile ? ["Swipe through your album", "Swipe left or right, or use ‹ ›. Pinch to zoom in on a photo."] : ["Flip through your album", "Use the arrows, your keyboard (← →), or the pages along the bottom."],
        [mobile ? "Tap a photo to point at it" : "Point at a photo", "Then write your note. A number marks the spot, so we know exactly which photo you mean."],
        mobile ? ["Your notes", "All notes for this spread are here. The number shows how many you've written."] : ["Your notes, page by page", "Everything you write shows up here, sorted by page. We read every note before we print."],
        ["Happy with it? Approve", "Nothing is printed before you approve. Want this tour again? Tap ?"],
      ],
    },
  },
  id: {
    proof: "Proof album", yourProof: "Proof album Anda", enterPin: "Masukkan PIN 4 angka dari pesan kami.", open: "Buka album",
    pinHelp: "PIN ada di pesan WhatsApp dari kami. Perangkat ini tetap terbuka selama 7 hari.",
    expired: "Link proof ini sudah ditutup.", expiredBody: "Minta kami membukanya lagi kalau masih diperlukan.", missing: "Link ini tidak valid.",
    pages: (l: string) => (/\d/.test(l) ? `Halaman ${l}` : l), spreadOf: (i: number, n: number) => `Spread ${i} dari ${n}`,
    notesFor: (l: string) => (/\d/.test(l) ? `Catatan halaman ${l}` : `Catatan ${l.toLowerCase()}`), notesSub: "Setiap catatan kami baca sebelum dicetak. Boleh bahasa Indonesia atau Inggris.",
    noNotes: "Belum ada catatan di halaman ini.", writePh: (l: string) => (/\d/.test(l) ? `Tulis catatan untuk halaman ${l}…` : `Tulis catatan untuk ${l.toLowerCase()}…`), pointing: "Menunjuk satu titik", unpoint: "Hapus",
    name: "Nama Anda", add: "Tambah catatan", tapHint: "Ketuk foto untuk menunjuknya", approve: "Setujui album", approvedOn: (d: string) => `Disetujui ${d}`,
    approveTitle: "Setujui album ini?", approveBody: "Kami akan mencetak halaman dan sampul persis seperti yang Anda lihat. Perubahan setelah disetujui bisa membuat album mundur beberapa hari.",
    openNotes: (n: number) => `${n} catatan masih menunggu kami.`, notYet: "Belum", approveYes: "Setujui & kirim ke cetak",
    thanks: (n: string) => `Terima kasih, ${n}`, thanksBody: (d: string) => `Album disetujui ${d}. Kami kirim ke percetakan dan memberi kabar saat dikirim.`,
    view: "Lihat album", notes: "Catatan", preview: "Pratinjau fotografer: catatan dan persetujuan dimatikan.", remove: "Hapus", done: "Selesai",
    older: (v: number) => `Versi ${v}`, rotate: "Putar HP untuk tampilan lebih besar", swipe: "Geser untuk spread berikutnya", help: "Cara memakai",
    noteFail: "Catatan belum tersimpan. Periksa koneksi lalu coba lagi.", saving: "Menyimpan…",
    viewPage: "Halaman", viewSpread: "Spread", seen: (a: number, b: number) => `Dilihat ${a} dari ${b}`, allSeen: "Semua spread sudah dilihat",
    writeNote: "Tulis catatan", approveAfter: (a: number, b: number) => `Setujui · ${a}/${b}`, page: (p: string) => `Halaman ${p}`, nextPage: (p: string) => `geser untuk halaman ${p} →`,
    summary: (n: number) => (n ? `${n} catatan akan kami periksa. Setujui kalau album sudah pas.` : "Belum ada catatan. Setujui kalau album sudah pas."),
    chips: ["Ganti foto ini", "Lebih terang", "Geser posisi", "Hapus foto ini"], noteHere: (l: string) => (/\d/.test(l) ? `Catatan halaman ${l}` : `Catatan ${l.toLowerCase()}`),
    pinch: "Cubit untuk memperbesar", close: "Tutup", lastPage: "Halaman terakhir", frontCover: "Sampul depan", swipeOn: "geser untuk membuka →",
    tour: {
      welcome: (n: string) => `Selamat datang, ${n}`, intro: "Ini album Anda sebelum dicetak. Lihat setiap halaman, tulis catatan di bagian yang ingin diubah, lalu setujui kalau sudah pas.",
      tiles: ["Lihat halaman", "Tunjuk & catat", "Setujui"], tilesSub: ["Setiap halaman, seperti nanti dicetak.", "Ceritakan apa yang ingin diubah.", "Kalau semuanya sudah pas."],
      showMe: "Tunjukkan caranya (30 dtk)", skipLook: "Lewati, saya lihat sendiri", again: "Bisa dibuka lagi kapan saja lewat tombol ?.",
      step: (i: number, n: number) => `Langkah ${i} dari ${n}`, skip: "Lewati", back: "Kembali", next: "Lanjut", gotIt: "Mengerti",
      steps: (mobile: boolean) => [
        mobile ? ["Geser untuk melihat album", "Geser ke kiri atau kanan, atau pakai ‹ ›. Cubit untuk memperbesar foto."] : ["Lihat album Anda", "Pakai tombol panah, keyboard (← →), atau halaman di bagian bawah."],
        [mobile ? "Ketuk foto untuk menunjuknya" : "Tunjuk sebuah foto", "Lalu tulis catatan. Nomor menandai titiknya, jadi kami tahu foto mana yang Anda maksud."],
        mobile ? ["Catatan Anda", "Semua catatan untuk spread ini ada di sini. Angkanya menunjukkan jumlah catatan."] : ["Catatan, per halaman", "Semua yang Anda tulis tampil di sini menurut halaman. Kami membaca semuanya sebelum mencetak."],
        ["Sudah pas? Setujui", "Tidak ada yang dicetak sebelum Anda menyetujui. Mau lihat tur ini lagi? Ketuk ?"],
      ],
    },
  },
} as const;
type Dict = (typeof T)[Lang];

const fmtDate = (s: string | null, lang: Lang) => (s ? new Date(s).toLocaleDateString(lang === "id" ? "id-ID" : "en-GB", { day: "numeric", month: "short", year: "numeric" }) : "");

/** desk: computer/tablet · portrait: phone upright · land: phone on its side (short and wide). */
type Mode = "desk" | "portrait" | "land";
function useMode(): Mode {
  const [m, setM] = useState<Mode>("desk");
  useEffect(() => {
    const land = matchMedia("(max-height: 500px) and (orientation: landscape)"), narrow = matchMedia("(max-width: 767px)");
    const on = () => setM(land.matches ? "land" : narrow.matches ? "portrait" : "desk");
    on(); land.addEventListener("change", on); narrow.addEventListener("change", on);
    return () => { land.removeEventListener("change", on); narrow.removeEventListener("change", on); };
  }, []);
  return m;
}

export function ProofViewer({ slug }: { slug: string }) {
  const [meta, setMeta] = useState<ProofMeta | null>(null);
  const [data, setData] = useState<ProofData | null>(null);
  const [state, setState] = useState<"loading" | "pin" | "ready" | "expired" | "missing">("loading");
  const [lang, setLang] = useState<Lang>("en");
  const t = T[lang];

  const load = useCallback(async () => {
    try {
      const d = await papi.load(slug);
      setData(d); setState("ready");
    } catch (e) {
      if (e instanceof ProofError && e.status === 401) { proofToken.clear(slug); setState("pin"); }
      else if (e instanceof ProofError && e.status === 410) setState("expired");
      else setState("missing");
    }
  }, [slug]);

  useEffect(() => {
    papi.meta(slug).then((m) => {
      setMeta(m); setLang(m.lang);
      if (m.expired) setState("expired");
      else if (!m.locked || proofToken.get(slug)) void load();
      else setState("pin");
    }).catch(() => setState("missing"));
  }, [slug, load]);

  if (state === "loading") return <div className="min-h-dvh" aria-busy />;
  if (state === "missing") return <Screen><Logo size={44} stacked /><p className="t-statement">{t.missing}</p></Screen>;
  if (state === "expired") return <Screen><Logo size={44} stacked /><p className="t-statement">{t.expired}</p><p className="t-small text-mute">{t.expiredBody}</p></Screen>;
  if (state === "pin" || !data) return <PinGate slug={slug} t={t} client={meta?.client_name ?? ""} onUnlocked={load} lang={lang} setLang={setLang} />;
  return <Viewer slug={slug} data={data} setData={setData} lang={lang} setLang={setLang} />;
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="relative min-h-dvh flex flex-col items-center justify-center text-center gap-5 px-8 bg-white">{children}</div>;
}

function LangSwitch({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <span className="t-mono flex items-center gap-1.5 text-faint" role="group" aria-label="Language">
      {(["en", "id"] as const).map((l, i) => (
        <span key={l} className="flex items-center gap-1.5">{i > 0 && "/"}
          <button type="button" onClick={() => setLang(l)} aria-pressed={lang === l} className={clsx("py-2", lang === l && "text-ink font-medium")}>{l.toUpperCase()}</button>
        </span>
      ))}
    </span>
  );
}

function PinGate({ slug, t, client, onUnlocked, lang, setLang }: { slug: string; t: Dict; client: string; onUnlocked: () => void; lang: Lang; setLang: (l: Lang) => void }) {
  const [pin, setPin] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const go = async (value = pin) => {
    if (value.length < 4) return;
    setBusy(true); setErr(null);
    try { const r = await papi.unlock(slug, value); proofToken.set(slug, r.token); onUnlocked(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Wrong PIN"); setPin(""); }
    finally { setBusy(false); }
  };
  const onChange = (raw: string) => { const v = raw.replace(/\D/g, "").slice(0, 4); setPin(v); if (v.length === 4) void go(v); };
  return (
    <Screen>
      <div className="absolute top-4 right-5"><LangSwitch lang={lang} setLang={setLang} /></div>
      <Logo size={44} stacked />
      <span className="t-mono text-mute">{t.proof}{client ? ` · ${client}` : ""}</span>
      <h1 className="font-serif text-[34px] leading-tight">{t.yourProof}</h1>
      <p className="t-small text-mute">{t.enterPin}</p>
      <div className="relative flex gap-3">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={clsx("h-14 w-14 flex items-center justify-center text-[26px] font-serif border border-line", pin.length === i && "border-ink")}>{pin[i] ? "•" : ""}</span>
        ))}
        <input autoFocus inputMode="numeric" pattern="\d*" maxLength={4} value={pin} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 opacity-0" aria-label="PIN" />
      </div>
      {err && <p className="t-small text-error">{err}</p>}
      <button type="button" onClick={() => void go()} disabled={busy || pin.length < 4} className="ink-btn w-full max-w-[300px] rounded-full">{t.open}</button>
      <p className="t-small text-mute max-w-[40ch]">{t.pinHelp}</p>
    </Screen>
  );
}

type Point = { x: number; y: number } | null;

function Viewer({ slug, data, setData, lang, setLang }: { slug: string; data: ProofData; setData: (d: ProofData) => void; lang: Lang; setLang: (l: Lang) => void }) {
  const t = T[lang];
  const mode = useMode();
  const mobile = mode !== "desk";
  const n = data.spreads.length;
  const [i, setI] = useState(0);
  const [halfRaw, setHalf] = useState<0 | 1>(0);
  const [pageView, setPageView] = useState(true);
  const [drawer, setDrawer] = useState(false);
  // Spreads seen on this device, per version: Approve waits until every one has been looked at.
  const seenKey = `lw_p_seen_${slug}_${data.version}`;
  const [seen, setSeen] = useState<Set<number>>(() => {
    const set = new Set((store.get(seenKey) ?? "").split(",").filter(Boolean).map(Number));
    if (data.spreads[0]) set.add(data.spreads[0].index);
    return set;
  });
  const sp = data.spreads[Math.min(i, n - 1)];
  const label = sp?.label || String(i + 1);
  const approved = data.status === "approved";
  const canNote = data.allow_notes && !approved && !data.preview;
  const [point, setPoint] = useState<Point>(null);
  const [active, setActive] = useState<number | null>(null);
  const [text, setText] = useState("");
  const [name, setName] = useState(() => store.get("lw_p_name") ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [sheet, setSheet] = useState(false);
  const [ask, setAsk] = useState(false);
  const [thanks, setThanks] = useState(false);
  // First visit on this device: welcome + tour (not in the photographer's preview).
  const [tour, setTour] = useState<null | "welcome" | number>(() => (!data.preview && !store.get(`lw_p_tour_${slug}`) ? "welcome" : null));
  const mine = useMemo(() => myNotes.all(slug), [slug, data]); // eslint-disable-line react-hooks/exhaustive-deps
  const textRef = useRef<HTMLTextAreaElement>(null);

  const notesHere = data.notes.filter((x) => x.spread === sp?.index);
  const pins = notesHere.filter((x) => x.version === data.version && x.x !== null && x.y !== null);
  const counts = useMemo(() => { const m = new Map<number, number>(); for (const x of data.notes) if (!x.done) m.set(x.spread, (m.get(x.spread) ?? 0) + 1); return m; }, [data.notes]);
  const open = data.notes.filter((x) => !x.done).length;

  const go = useCallback((k: number, h: 0 | 1 = 0) => {
    const j = Math.max(0, Math.min(n - 1, k)), idx = data.spreads[j]?.index;
    setI(j); setHalf(h); setPoint(null); setActive(null);
    if (idx !== undefined) setSeen((old) => { if (old.has(idx)) return old; const next = new Set(old).add(idx); store.set(seenKey, [...next].join(",")); return next; });
  }, [n, data.spreads, seenKey]);
  const seenAll = data.spreads.every((x) => seen.has(x.index));
  const nums = label.match(/(\d+)\D+(\d+)/);
  // Upright phone: one page at a time, large; the cover and odd shapes stay whole.
  const single = mode === "portrait" && pageView && !!sp && sp.w / sp.h > 1.6;
  // The cover sheet (back · spine · front) shows its front in page view: one page, like the album in the hand.
  const cover = !nums;
  const half: 0 | 1 = single && cover ? 1 : halfRaw;
  const anyWide = data.spreads.some((x) => x.w / x.h > 1.6);
  const step = useCallback((d: 1 | -1) => {
    // The ends of the album stay put: no swipe past the last page or before the first.
    if (d > 0 && i >= n - 1 && (!single || half === 1)) return;
    if (d < 0 && i <= 0 && (!single || half === 0 || cover)) return;
    if (single) {
      if (d > 0 && half === 0) { setHalf(1); setPoint(null); return; }
      if (d < 0 && half === 1) { setHalf(0); setPoint(null); return; }
      if (d < 0) { if (i > 0) go(i - 1, 1); return; }
    }
    go(i + d);
  }, [single, half, cover, i, n, go]);

  const endTour = () => { setTour(null); store.set(`lw_p_tour_${slug}`, "1"); };

  // Keyboard: arrows flip spreads (the tour handles its own keys).
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (tour !== null || ask) return;
      const el = e.target as HTMLElement;
      if (el.closest("textarea, input")) return;
      if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [step, tour, ask]);

  // Preload the neighbouring spreads only.
  useEffect(() => {
    for (const k of [i - 1, i + 1]) { const s = data.spreads[k]; if (s) { const im = new Image(); im.src = papi.img(s.url); } }
  }, [i, data.spreads]);

  const swipe = useRef<{ x: number; y: number } | null>(null);
  const tapPhoto = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!canNote) return;
    const r = e.currentTarget.getBoundingClientRect();
    const lx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    setPoint({ x: single ? half * 0.5 + lx / 2 : lx, y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) });
    setActive(null);
    if (mode === "portrait") setSheet(true);
    if (mode === "land") setDrawer(true);
    setTimeout(() => textRef.current?.focus(), 60);
  };

  const add = async () => {
    const body = text.trim(), who = name.trim();
    if (!body || !who || !sp) return;
    setBusy(true); setErr("");
    try {
      const nn = await papi.addNote(slug, { spread: sp.index, x: point?.x ?? null, y: point?.y ?? null, author: who, text: body });
      myNotes.add(slug, nn.id, nn.key);
      store.set("lw_p_name", who);
      const { key: _k, ...note } = nn; void _k;
      setData({ ...data, notes: [...data.notes, note] });
      setText(""); setPoint(null); setActive(nn.id);
    } catch { setErr(t.noteFail); }
    finally { setBusy(false); }
  };
  const remove = async (x: PNote) => {
    const key = mine[x.id];
    if (!key) return;
    try { await papi.delNote(slug, x.id, key); setData({ ...data, notes: data.notes.filter((y) => y.id !== x.id) }); } catch { /* stays */ }
  };
  const approve = async () => {
    const who = name.trim() || data.client_name;
    setBusy(true);
    try { const d = await papi.approve(slug, who); setData(d); setAsk(false); setThanks(true); store.set("lw_p_name", who); }
    catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const helpBtn = (
    <button type="button" data-tour="help" onClick={() => setTour("welcome")} aria-label={t.help} title={t.help}
      className="h-8 w-8 shrink-0 rounded-full border border-line flex items-center justify-center text-[14px] font-medium hover:border-ink transition-colors">?</button>
  );
  const approveBtn = (cls = "") => approved
    ? <span className={clsx("t-mono text-mute", cls)}>{t.approvedOn(fmtDate(data.approved_at, lang))}</span>
    : <button type="button" data-tour="approve" disabled={data.preview} onClick={() => setAsk(true)}
        className={clsx("rounded-full px-5 py-2.5 text-[13px] font-medium text-white disabled:opacity-50", cls)} style={{ background: GOLD }}>{t.approve}</button>;

  const notesPanel = (
    <div className="flex flex-col gap-4 min-h-0 h-full">
      <h2 className="font-serif text-[26px] leading-tight">{t.notesFor(label)}</h2>
      <p className="t-small text-mute -mt-2">{t.notesSub}</p>
      <div className="flex flex-col gap-3 overflow-y-auto overscroll-contain min-h-0">
        {notesHere.length === 0 && <p className="t-small text-faint">{t.noNotes}</p>}
        {notesHere.map((x) => {
          const k = pins.indexOf(x);
          return (
            <div key={x.id} onClick={() => setActive(x.id)} className={clsx("border p-3.5 cursor-default", active === x.id ? "border-ink bg-[#f1efea]" : "border-line", x.done && "opacity-60")}>
              <div className="flex items-center gap-2 text-[13px]">
                {k >= 0 && <span className="h-5 w-5 rounded-full bg-ink text-white text-[10px] font-medium flex items-center justify-center">{k + 1}</span>}
                <span className="font-medium">{x.author}</span>
                <span className="text-faint text-[12px]">{fmtDate(x.created_at, lang)}{x.version !== data.version ? ` · ${t.older(x.version)}` : ""}</span>
                <span className="grow" />
                {x.done && <span className="t-mono text-[10px] text-mute">{t.done}</span>}
                {!x.done && !approved && mine[x.id] && <button type="button" className="text-[12px] text-faint hover:text-ink" onClick={(e) => { e.stopPropagation(); void remove(x); }}>{t.remove}</button>}
              </div>
              <p className="mt-1.5 text-[14px] leading-[1.5] whitespace-pre-wrap">{x.text}</p>
            </div>
          );
        })}
      </div>
      {canNote && (
        <div className="mt-auto border border-line p-3.5 flex flex-col gap-2.5 focus-within:border-ink transition-colors">
          {!store.get("lw_p_name") && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} maxLength={60} className="text-[14px] outline-none border-b border-line pb-1.5 bg-transparent" />}
          {mobile && !text && <div className="flex flex-wrap gap-1.5">{t.chips.map((c) => <button type="button" key={c} onClick={() => { setText(c + " "); textRef.current?.focus(); }} className="rounded-full border border-line bg-[#fbfaf7] px-3 py-1.5 text-[13px]">{c}</button>)}</div>}
          <textarea ref={textRef} value={text} onChange={(e) => setText(e.target.value)} placeholder={t.writePh(label)} maxLength={600} rows={2}
            className="resize-none text-[15px] leading-[1.5] outline-none bg-transparent" onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) void add(); }} />
          <div className="flex items-center gap-2">
            {point ? <span className="text-[12px] text-mute">{t.pointing} · <button type="button" className="underline" onClick={() => setPoint(null)}>{t.unpoint}</button></span>
              : <span className="text-[12px] text-faint">{t.tapHint}</span>}
            <span className="grow" />
            <button type="button" disabled={busy || !text.trim() || !name.trim()} onClick={() => void add()} className="rounded-full bg-ink text-white px-4 py-2 text-[13px] font-medium disabled:opacity-40">{busy ? t.saving : t.add}</button>
          </div>
          {err && <p className="t-small text-error">{err}</p>}
        </div>
      )}
    </div>
  );

  // The spread (or, upright on a phone, one page of it) with its pins; shared by every layout.
  const half0 = half * 0.5;
  const pinsShown = single ? pins.filter((x) => x.x! >= half0 && x.x! <= half0 + 0.5) : pins;
  const xOf = (x: number) => (single ? (x - half0) * 2 : x);
  const ratio = sp ? (single ? sp.w / 2 / sp.h : sp.w / sp.h) : 1;
  const figure = (style: CSSProperties) => sp && (
    <div data-tour="spread" className="relative bg-white shadow-[0_18px_40px_rgba(31,26,20,.18)] overflow-hidden" style={{ aspectRatio: String(ratio), ...style }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed private image, not for the optimiser */}
      <img key={sp.url} src={papi.img(sp.url)} alt={t.pages(label)} className="absolute top-0 h-full max-w-none object-cover select-none" draggable={false}
        style={single ? { width: "200%", left: half ? "-100%" : 0 } : { width: "100%", left: 0 }} />
      <div data-tour="photo" className={clsx("absolute inset-0", canNote && "cursor-crosshair")} onClick={tapPhoto} />
      {pinsShown.map((x) => {
        const k = pins.indexOf(x);
        return (
          <button type="button" key={x.id} onClick={() => { setActive(x.id); if (mode === "portrait") setSheet(true); if (mode === "land") setDrawer(true); }} aria-label={`${t.notes} ${k + 1}`}
            className={clsx("absolute -translate-x-1/2 -translate-y-1/2 h-[28px] w-[28px] rounded-full border-[1.5px] text-[12px] font-medium flex items-center justify-center shadow-md",
              active === x.id ? "bg-ink text-white border-white ring-4 ring-[rgba(200,131,47,.45)]" : "bg-white text-ink border-ink")} style={{ left: `${xOf(x.x!) * 100}%`, top: `${x.y! * 100}%` }}>{k + 1}</button>
        );
      })}
      {point && (!single || (point.x >= half0 && point.x <= half0 + 0.5)) && <span className="absolute -translate-x-1/2 -translate-y-1/2 h-[30px] w-[30px] rounded-full border-2 border-white bg-ink/85 shadow-md pointer-events-none ring-4 ring-[rgba(200,131,47,.45)]" style={{ left: `${xOf(point.x) * 100}%`, top: `${point.y * 100}%` }} />}
    </div>
  );
  const swipeProps = {
    onPointerDown: (e: React.PointerEvent) => { if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY }; },
    onPointerUp: (e: React.PointerEvent) => { const s0 = swipe.current; swipe.current = null; if (!s0) return; const dx = e.clientX - s0.x; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s0.y)) step(dx < 0 ? 1 : -1); },
  };
  const strip = (
    <nav className="flex gap-2.5 overflow-x-auto px-4 pt-3 pb-1" aria-label="Spreads">
      {data.spreads.map((s, k) => (
        <button type="button" key={s.index} onClick={() => go(k)} aria-current={k === i ? "true" : undefined} className="shrink-0 flex flex-col items-center gap-1">
          <span className={clsx("relative block h-[34px] shrink-0", k === i ? "outline outline-2 outline-ink" : seen.has(s.index) ? "outline outline-1 outline-line" : "outline outline-1 outline-dashed outline-faint opacity-70")} style={{ width: Math.round((34 * s.w) / s.h) }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- small signed thumbnail */}
            <img src={papi.img(s.url)} alt="" className="h-full w-full object-cover" />
            {(counts.get(s.index) ?? 0) > 0 && <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-1 rounded-full text-white text-[9px] font-semibold flex items-center justify-center" style={{ background: GOLD }}>{counts.get(s.index)}</span>}
          </span>
          <span className={clsx("text-[11px]", k === i ? "text-ink font-medium" : "text-faint")}>{s.label}</span>
        </button>
      ))}
    </nav>
  );
  const approveMobile = (cls: string) => approved
    ? <span className={clsx("t-mono text-mute text-center", cls)}>{t.approvedOn(fmtDate(data.approved_at, lang))}</span>
    : <button type="button" data-tour="approve" disabled={data.preview || !seenAll} onClick={() => setAsk(true)}
        className={clsx("rounded-full font-medium disabled:bg-[#e7e4dc] disabled:text-mute text-white", cls)} style={seenAll && !data.preview ? { background: GOLD } : undefined}>
        {seenAll ? t.approve : t.approveAfter(seen.size, n)}</button>;
  const preview = data.preview && <div className="bg-ink text-white text-center text-[12px] py-1.5 px-4 shrink-0">{t.preview}</div>;

  const overlays = (
    <>
      {mode === "portrait" && sheet && <Sheet onClose={() => setSheet(false)} closeLabel={t.close}>{notesPanel}</Sheet>}
      {ask && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-4 bg-ink/45 admin-fade" onMouseDown={(e) => { if (e.target === e.currentTarget) setAsk(false); }}>
          <div role="alertdialog" aria-modal="true" aria-labelledby="ap-t" className="admin-pop w-full max-w-[520px] max-h-[96dvh] overflow-y-auto bg-white p-8 flex flex-col gap-4">
            <h2 id="ap-t" className="font-serif text-[32px] leading-tight">{t.approveTitle}</h2>
            <p className="text-[15px] leading-[1.55] text-mute">{t.approveBody}</p>
            {open > 0 && <p className="font-serif italic text-[16px]">{t.openNotes(open)}</p>}
            {!store.get("lw_p_name") && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.name} maxLength={80} className="border border-line px-3 py-2.5 text-[14px] outline-none focus:border-ink" />}
            {err && <p className="t-small text-error">{err}</p>}
            <div className="flex gap-3 mt-1">
              <button type="button" className="flex-1 rounded-full border border-line py-3 text-[14px] font-medium" onClick={() => setAsk(false)}>{t.notYet}</button>
              <button type="button" disabled={busy} className="flex-1 rounded-full py-3 text-[14px] font-medium text-white disabled:opacity-50" style={{ background: GOLD }} onClick={() => void approve()}>{t.approveYes}</button>
            </div>
          </div>
        </div>
      )}
      {thanks && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center text-center gap-5 px-8 admin-fade">
          <Logo size={40} stacked />
          <span className="h-14 w-14 rounded-full" style={{ background: GOLD }} aria-hidden />
          <h2 className="font-serif text-[34px] leading-tight">{t.thanks(data.approved_by || data.client_name)}</h2>
          <p className="text-[15px] leading-[1.55] text-mute max-w-[38ch]">{t.thanksBody(fmtDate(data.approved_at, lang))}</p>
          <button type="button" className="rounded-full border border-ink px-8 py-3 text-[14px] font-medium" onClick={() => setThanks(false)}>{t.view}</button>
        </div>
      )}
      {tour === "welcome" && <Welcome t={t} mobile={mobile} name={data.client_name} onStart={() => setTour(0)} onSkip={endTour} />}
      {typeof tour === "number" && <Tour t={t} mobile={mobile} step={tour} setStep={setTour} onEnd={endTour} />}
    </>
  );

  if (mode === "portrait") {
    const pageNo = nums ? t.page(nums[half + 1]) : t.frontCover;
    return (
      <div className="h-dvh flex flex-col bg-[#fbfaf7] overflow-hidden">
        {preview}
        <header className="h-14 shrink-0 border-b border-line flex items-center gap-3 px-4">
          <div className="flex flex-col min-w-0 grow">
            <span className="t-mono text-[10px] text-faint">{t.proof} · v{data.version}</span>
            <span className="font-serif text-[22px] leading-[1.1] truncate">{data.client_name}</span>
          </div>
          <LangSwitch lang={lang} setLang={setLang} />
          {helpBtn}
        </header>
        <div className="shrink-0 px-4 pt-3 flex items-center gap-2">
          {anyWide && (
            <div role="group" aria-label={t.viewSpread} className="flex p-[3px] bg-[#efece5] rounded-[10px]">
              {([[true, t.viewPage], [false, t.viewSpread]] as const).map(([v, l]) => (
                <button type="button" key={l} aria-pressed={pageView === v} onClick={() => { setPageView(v); setHalf(0); }}
                  className={clsx("h-[30px] px-3 rounded-lg text-[12px] font-medium", pageView === v ? "bg-white shadow-sm text-ink" : "text-mute")}>{l}</button>
              ))}
            </div>
          )}
          <span className="grow" />
          <span className={clsx("text-[12px]", seenAll ? "text-[#3f6b3a] font-medium" : "text-mute")}>{seenAll ? `✓ ${t.allSeen}` : t.seen(seen.size, n)}</span>
        </div>
        <main className="flex-1 min-h-0 flex flex-col justify-center px-4 gap-3" {...swipeProps}>
          {figure({ width: `min(100%, calc((100dvh - 330px) * ${ratio}))`, alignSelf: "center" })}
          <div className="flex justify-between items-center text-[13px] text-mute">
            <span>{single ? pageNo : t.pages(label)}</span>
            {single && cover ? <span /> : single ? <span className="flex gap-1.5" aria-hidden><span className={clsx("h-1.5 w-1.5 rounded-full", half === 0 ? "bg-ink" : "bg-line")} /><span className={clsx("h-1.5 w-1.5 rounded-full", half === 1 ? "bg-ink" : "bg-line")} /></span> : <span>{t.spreadOf(i + 1, n)}</span>}
            <span>{i >= n - 1 && (!single || half === 1) ? t.lastPage : single && cover ? t.swipeOn : single && half === 0 ? t.nextPage(nums![2]) : !single ? t.pinch : ""}</span>
          </div>
        </main>
        <div className="shrink-0 border-t border-line bg-white">
          {strip}
          <div className="px-4 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] flex gap-2.5">
            {canNote || notesHere.length ? (
              <button type="button" data-tour="notes" onClick={() => setSheet(true)} className="flex-1 h-12 rounded-full border-[1.5px] border-ink bg-white text-[15px] font-medium flex items-center justify-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>
                {notesHere.length ? `${t.notes} · ${notesHere.length}` : t.writeNote}
              </button>
            ) : null}
            {approveMobile("flex-1 h-12 text-[15px]")}
          </div>
        </div>
        {overlays}
      </div>
    );
  }

  if (mode === "land") {
    return (
      <div className="h-dvh flex bg-[#1c1b19] overflow-hidden text-white">
        <div className="relative flex-1 min-w-0 flex items-center justify-center" {...swipeProps}>
          {figure({ width: drawer ? `min(100% - 32px, (100dvh - 96px) * ${ratio})` : `min(100% - 112px, (100dvh - 96px) * ${ratio})`, boxShadow: "0 20px 60px rgba(0,0,0,.5)" })}
          <div className="absolute inset-x-0 top-0 h-11 px-4 flex items-center gap-3 bg-gradient-to-b from-black/55 to-transparent pointer-events-none">
            <span className="font-serif text-[18px] truncate pointer-events-auto">{data.client_name}</span>
            <span className="text-[12px] text-white/75 whitespace-nowrap">{t.pages(label)} · {t.spreadOf(i + 1, n)}</span>
            <span className="grow" />
            {data.preview && <span className="text-[11px] text-white/75">{t.preview}</span>}
            {!drawer && <span className="pointer-events-auto [&_button]:text-white [&_button]:border-white/40">{helpBtn}</span>}
          </div>
          {!drawer && (
            <>
              <button type="button" aria-label="Previous" onClick={() => step(-1)} disabled={i === 0} className="absolute left-2 top-1/2 -translate-y-1/2 h-[60px] w-10 rounded-full bg-white/12 text-[20px] disabled:opacity-25">‹</button>
              <button type="button" aria-label="Next" onClick={() => step(1)} disabled={i >= n - 1} className="absolute right-2 top-1/2 -translate-y-1/2 h-[60px] w-10 rounded-full bg-white/12 text-[20px] disabled:opacity-25">›</button>
            </>
          )}
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5 pointer-events-none" aria-hidden>
            {data.spreads.map((s, k) => <span key={s.index} className={clsx("h-1 w-[18px] rounded-full", k === i ? "bg-white" : seen.has(s.index) ? "bg-white/35" : "bg-white/15")} />)}
          </div>
          {!drawer && (
            <div className="absolute right-4 bottom-2 flex gap-2">
              {!approved && seenAll && !data.preview && <button type="button" data-tour="approve" onClick={() => setAsk(true)} className="h-10 px-4 rounded-full text-[13px] font-medium text-white shadow-lg" style={{ background: GOLD }}>{t.approve}</button>}
              <button type="button" data-tour="notes" onClick={() => setDrawer(true)} className="h-10 px-4 rounded-full bg-white text-ink text-[13px] font-medium shadow-lg flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                {t.notes} · {notesHere.length}
              </button>
            </div>
          )}
        </div>
        {drawer && (
          <aside className="w-[min(340px,44vw)] shrink-0 bg-[#fbfaf7] text-ink border-l border-line flex flex-col admin-fade pb-[env(safe-area-inset-bottom)]" aria-label={t.notes}>
            <div className="flex justify-end px-2 pt-1 shrink-0">
              <button type="button" aria-label={t.close} onClick={() => setDrawer(false)} className="h-10 w-10 rounded-full flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 px-4 pb-3 -mt-2 [&_h2]:text-[22px]">{notesPanel}</div>
          </aside>
        )}
        {overlays}
      </div>
    );
  }

  const spreadStyle: CSSProperties = sp ? { aspectRatio: `${sp.w} / ${sp.h}`, width: mobile ? "100%" : `min(100%, calc((100dvh - 330px) * ${sp.w / sp.h}))` } : {};

  return (
    <div className="h-dvh flex flex-col bg-white overflow-hidden">
      {data.preview && <div className="bg-ink text-white text-center text-[12px] py-1.5 px-4">{t.preview}</div>}
      <header className="h-16 md:h-[72px] shrink-0 border-b border-line flex items-center gap-4 px-4 md:px-10">
        <span className="hidden md:block"><Logo size={26} /></span>
        <span className="md:hidden font-serif text-[22px]">{data.client_name}</span>
        <span className="grow" />
        <div className="hidden md:flex flex-col items-center absolute left-1/2 -translate-x-1/2">
          <span className="t-mono text-[10px] text-faint">{t.proof}</span>
          <span className="font-serif text-[24px] leading-tight">{data.client_name}</span>
        </div>
        <LangSwitch lang={lang} setLang={setLang} />
        {helpBtn}
        <span className="hidden md:block">{approveBtn()}</span>
      </header>

      <div className="flex-1 min-h-0 flex">
        <main className="flex-1 min-w-0 flex flex-col bg-[#f1efea]">
          <div className="flex-1 min-h-0 relative flex flex-col items-center justify-center px-4 md:px-20 py-4"
            onPointerDown={(e) => { if (e.pointerType !== "mouse") swipe.current = { x: e.clientX, y: e.clientY }; }}
            onPointerUp={(e) => { const s = swipe.current; swipe.current = null; if (!s) return; const dx = e.clientX - s.x; if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(i + (dx < 0 ? 1 : -1)); }}>
            {!mobile && canNote && <p className="font-serif italic text-[17px] text-mute absolute top-5">{t.tapHint}</p>}
            {sp && (
              <div data-tour="spread" className="relative bg-white shadow-[0_18px_40px_rgba(31,26,20,.18)]" style={spreadStyle}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed private image, not for the optimiser */}
                <img key={sp.url} src={papi.img(sp.url)} alt={t.pages(label)} className="absolute inset-0 h-full w-full object-cover select-none" draggable={false} />
                <div data-tour="photo" className={clsx("absolute inset-0", canNote && "cursor-crosshair")} onClick={tapPhoto} />
                {pins.map((x, k) => (
                  <button type="button" key={x.id} onClick={() => { setActive(x.id); if (mobile) setSheet(true); }} aria-label={`${t.notes} ${k + 1}`}
                    className={clsx("absolute -translate-x-1/2 -translate-y-1/2 h-[26px] w-[26px] rounded-full border-[1.5px] text-[12px] font-medium flex items-center justify-center shadow-md",
                      active === x.id ? "bg-ink text-white border-white" : "bg-white text-ink border-ink")} style={{ left: `${x.x! * 100}%`, top: `${x.y! * 100}%` }}>{k + 1}</button>
                ))}
                {point && <span className="absolute -translate-x-1/2 -translate-y-1/2 h-[26px] w-[26px] rounded-full border-2 border-white bg-ink/80 shadow-md pointer-events-none" style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }} />}
              </div>
            )}
            {sp && <div className="flex justify-between text-[12px] text-mute mt-4" style={{ width: spreadStyle.width as string }}><span>{t.pages(label)}</span><span>{t.spreadOf(i + 1, n)}</span></div>}
            {!mobile && (
              <>
                <button type="button" aria-label="Previous" onClick={() => go(i - 1)} disabled={i === 0} className="absolute left-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white border border-line text-[18px] disabled:opacity-30">‹</button>
                <button type="button" aria-label="Next" onClick={() => go(i + 1)} disabled={i >= n - 1} className="absolute right-6 top-1/2 -translate-y-1/2 h-11 w-11 rounded-full bg-white border border-line text-[18px] disabled:opacity-30">›</button>
              </>
            )}
          </div>
          {!mobile && (
            <nav className="h-[132px] shrink-0 bg-white border-t border-line flex items-center gap-3.5 px-10 overflow-x-auto" aria-label="Spreads">
              {data.spreads.map((s, k) => (
                <button type="button" key={s.index} onClick={() => go(k)} className="shrink-0 flex flex-col items-center gap-1.5">
                  <span className={clsx("relative block h-[60px] bg-[#eee]", k === i ? "outline outline-2 outline-ink" : "outline outline-1 outline-line")} style={{ aspectRatio: `${s.w} / ${s.h}` }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- small signed thumbnail */}
                    <img src={papi.img(s.url)} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {(counts.get(s.index) ?? 0) > 0 && <span className="absolute top-1 right-1 rounded-full bg-ink text-white text-[10px] font-medium px-1.5">{counts.get(s.index)}</span>}
                  </span>
                  <span className={clsx("text-[11px]", k === i ? "text-ink font-medium" : "text-faint")}>{s.label}</span>
                </button>
              ))}
            </nav>
          )}
        </main>
        {!mobile && <aside data-tour="notes" className="w-[380px] shrink-0 border-l border-line p-6 min-h-0 flex flex-col">{notesPanel}</aside>}
      </div>

      {overlays}
    </div>
  );
}

/** Bottom sheet: drag the handle down (or tap outside, or ✕) to close. While open, the page behind
 * cannot scroll or pull-to-refresh, so a downward swipe means "close", not "reload". */
function Sheet({ children, onClose, closeLabel }: { children: ReactNode; onClose: () => void; closeLabel: string }) {
  const [dy, setDy] = useState(0);
  const [dragging, setDragging] = useState(false);
  const start = useRef<number | null>(null);
  useEffect(() => {
    const html = document.documentElement, prev = [html.style.overscrollBehaviorY, document.body.style.overflow];
    html.style.overscrollBehaviorY = "none"; document.body.style.overflow = "hidden";
    return () => { html.style.overscrollBehaviorY = prev[0]; document.body.style.overflow = prev[1]; };
  }, []);
  const grab = {
    onPointerDown: (e: React.PointerEvent) => { start.current = e.clientY; setDragging(true); (e.currentTarget as Element).setPointerCapture(e.pointerId); },
    onPointerMove: (e: React.PointerEvent) => { if (start.current !== null) setDy(Math.max(0, e.clientY - start.current)); },
    onPointerUp: () => { start.current = null; setDragging(false); if (dy > 90) onClose(); else setDy(0); },
    onPointerCancel: () => { start.current = null; setDragging(false); setDy(0); },
  };
  return (
    <div className="fixed inset-0 z-30 flex items-end bg-ink/25 admin-fade overscroll-contain" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onTouchMove={(e) => { if (e.target === e.currentTarget) e.preventDefault(); }}>
      <div className="admin-pop w-full max-h-[78dvh] bg-white rounded-t-2xl px-5 pb-[max(20px,env(safe-area-inset-bottom))] flex flex-col overscroll-contain"
        style={{ transform: dy ? `translateY(${dy}px)` : undefined, transition: dragging ? "none" : "transform 200ms ease-out" }}>
        <div className="relative -mx-5 h-8 shrink-0 flex items-center justify-center touch-none cursor-grab" {...grab}>
          <span className="h-1 w-10 rounded-full bg-line" />
          <button type="button" aria-label={closeLabel} onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className="absolute right-2 top-1 h-10 w-10 rounded-full flex items-center justify-center text-mute">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- tour
function Welcome({ t, mobile, name, onStart, onSkip }: { t: Dict; mobile: boolean; name: string; onStart: () => void; onSkip: () => void }) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => { if (e.key === "Escape") onSkip(); };
    window.addEventListener("keydown", on);
    return () => window.removeEventListener("keydown", on);
  }, [onSkip]);
  const pic = (k: number) => (
    <span className="relative block h-[56px] w-[84px] md:h-[104px] md:w-[168px] shrink-0 rounded bg-[#f1efea] overflow-hidden" aria-hidden>
      {k === 0 && <><span className="absolute left-[18%] top-[22%] h-[56%] w-[30%] bg-[#cfc4b0]" /><span className="absolute left-[50%] top-[22%] h-[56%] w-[30%] bg-[#b9ad98]" /></>}
      {k === 1 && <><span className="absolute left-[12%] top-[16%] h-[66%] w-[56%] bg-[#c9bba4]" /><span className="absolute left-[58%] top-[20%] h-4 w-4 rounded-full bg-ink border border-white" /></>}
      {k === 2 && <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full px-3 py-1.5 text-[10px] md:text-[12px] text-white whitespace-nowrap" style={{ background: GOLD }}>{t.tour.tiles[2]}</span>}
    </span>
  );
  return (
    <div className={clsx("fixed inset-0 z-50 bg-[rgba(26,22,18,.55)] admin-fade flex", mobile ? "items-end" : "items-center justify-center p-6")} role="dialog" aria-modal="true" aria-labelledby="tour-w">
      <div className={clsx("admin-pop bg-white flex flex-col gap-4", mobile ? "w-full max-h-[100dvh] overflow-y-auto rounded-t-2xl px-6 pt-3 pb-[max(28px,env(safe-area-inset-bottom))]" : "w-full max-w-[640px] px-11 pt-10 pb-8 items-center text-center")}>
        {mobile && <span className="mx-auto h-1 w-9 rounded-full bg-line" />}
        <span className="t-mono text-[10px] text-faint">{t.proof}</span>
        <h2 id="tour-w" className="font-serif text-[32px] md:text-[38px] leading-tight -mt-2">{t.tour.welcome(name)}</h2>
        <p className="text-[15px] leading-[1.55] text-mute">{t.tour.intro}</p>
        <div className={clsx(mobile ? "flex flex-col gap-3" : "grid grid-cols-3 gap-4 py-2")}>
          {t.tour.tiles.map((title, k) => (
            <div key={k} className={clsx(mobile ? "flex items-center gap-3.5 text-left" : "flex flex-col items-center gap-2.5")}>
              {pic(k)}
              <span className="flex flex-col"><span className="text-[14px] md:text-[13px] font-medium">{k + 1}. {title}</span>{mobile && <span className="text-[13px] text-mute">{t.tour.tilesSub[k]}</span>}</span>
            </div>
          ))}
        </div>
        <div className={clsx("flex gap-3", mobile ? "flex-col-reverse" : "")}>
          <button type="button" className="rounded-full border border-line px-5 py-2.5 text-[13px] font-medium" onClick={onSkip}>{t.tour.skipLook}</button>
          <button type="button" autoFocus className="rounded-full bg-ink text-white px-5 py-2.5 text-[13px] font-medium" onClick={onStart}>{t.tour.showMe}</button>
        </div>
        <p className="font-serif italic text-[14px] text-mute text-center">{t.tour.again}</p>
      </div>
    </div>
  );
}

type Box = { x: number; y: number; w: number; h: number };
const visible = (sel: string) => [...document.querySelectorAll<HTMLElement>(`[data-tour="${sel}"]`)].find((el) => el.getClientRects().length > 0);
const rectOf = (el: HTMLElement | undefined, pad: number): Box | null => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left - pad, y: r.top - pad, w: r.width + 2 * pad, h: r.height + 2 * pad }; };

function Tour({ t, mobile, step, setStep, onEnd }: { t: Dict; mobile: boolean; step: number; setStep: (s: number) => void; onEnd: () => void }) {
  const steps = t.tour.steps(mobile);
  const targets = ["spread", "photo", "notes", "approve"];
  const [box, setBox] = useState<Box | null>(null);
  const [extra, setExtra] = useState<Box | null>(null);
  const [vp, setVp] = useState({ w: 0, h: 0 });
  const card = useRef<HTMLDivElement>(null);
  const [ch, setCh] = useState(200);
  const measure = useCallback(() => {
    setVp({ w: innerWidth, h: innerHeight });
    const pad = step === 2 && !mobile ? -6 : 8;
    let b = rectOf(visible(targets[step]), pad);
    if (step === 1 && b) b = { x: b.x + b.w * 0.55, y: b.y + 8, w: b.w * 0.42, h: b.h * 0.5 }; // one photo, not the whole spread
    setBox(b);
    setExtra(step === 3 ? rectOf(visible("help"), 4) : null);
  }, [step, mobile]); // eslint-disable-line react-hooks/exhaustive-deps
  // Measured in a frame callback (once per step or resize), after layout has settled.
  useLayoutEffect(() => { const id = requestAnimationFrame(measure); return () => cancelAnimationFrame(id); }, [measure]);
  useLayoutEffect(() => { const id = requestAnimationFrame(() => { if (card.current) setCh(card.current.offsetHeight); }); return () => cancelAnimationFrame(id); }, [step, box]);
  useEffect(() => {
    addEventListener("resize", measure);
    const on = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEnd();
      else if (e.key === "ArrowRight" || e.key === "Enter") { e.preventDefault(); if (step < 3) setStep(step + 1); else onEnd(); }
      else if (e.key === "ArrowLeft" && step > 0) setStep(step - 1);
    };
    addEventListener("keydown", on);
    return () => { removeEventListener("resize", measure); removeEventListener("keydown", on); };
  }, [measure, step, setStep, onEnd]);

  const W = mobile ? Math.min(358, vp.w - 32) : 320, gap = 16;
  let pos: CSSProperties = { left: 16, top: 16, width: W };
  if (box) {
    const below = box.y + box.h + gap, above = box.y - gap - ch;
    if (!mobile && step === 2) pos = { left: box.x - gap - W, top: Math.max(16, Math.min(vp.h - ch - 16, box.y + box.h / 2 - ch / 2)), width: W };
    else if (!mobile && step === 1) pos = { left: Math.max(16, box.x - gap - W), top: Math.max(16, box.y), width: W };
    else {
      const top = below + ch < vp.h - 8 ? below : Math.max(16, above);
      pos = { left: mobile ? (vp.w - W) / 2 : Math.max(16, Math.min(vp.w - W - 16, box.x + box.w / 2 - W / 2)), top, width: W };
    }
  }
  const round = step === 3 ? 999 : 8;
  const last = step === 3;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-t" onClick={onEnd}>
      {box ? (
        <div className="absolute pointer-events-none border-2 border-white transition-[left,top,width,height] duration-300 motion-reduce:transition-none"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: round, boxShadow: "0 0 0 200vmax rgba(26,22,18,.55)" }} />
      ) : <div className="absolute inset-0 bg-[rgba(26,22,18,.55)]" />}
      {extra && <div className="absolute pointer-events-none border-2 border-white rounded-full bg-white/10" style={{ left: extra.x, top: extra.y, width: extra.w, height: extra.h }} />}
      <div ref={card} key={step} className="absolute bg-white rounded-md px-5 py-4 flex flex-col gap-2 shadow-[0_12px_32px_rgba(0,0,0,.25)] admin-fade" style={pos} onClick={(e) => e.stopPropagation()}>
        <span className="t-mono text-[10px] text-faint">{t.tour.step(step + 1, 4)}</span>
        <h2 id="tour-t" className="font-serif text-[24px] leading-[1.15]">{steps[step][0]}</h2>
        <p className="text-[14px] md:text-[14px] leading-[1.5] text-mute">{steps[step][1]}</p>
        <div className="flex items-center gap-2.5 pt-1.5">
          <span className="flex items-center gap-1.5" aria-hidden>{[0, 1, 2, 3].map((k) => <span key={k} className={clsx("h-1.5 rounded-full", k === step ? "w-[18px] bg-ink" : "w-1.5 bg-[#c0bdb5]")} />)}</span>
          <span className="grow" />
          {!last && <button type="button" className="text-[13px] font-medium text-faint px-1" onClick={onEnd}>{t.tour.skip}</button>}
          {step > 0 && !mobile && <button type="button" className="rounded-full border border-line px-4 py-2 text-[13px] font-medium" onClick={() => setStep(step - 1)}>{t.tour.back}</button>}
          <button type="button" autoFocus className="rounded-full bg-ink text-white px-4 py-2 text-[13px] font-medium" onClick={() => (last ? onEnd() : setStep(step + 1))}>{last ? t.tour.gotIt : t.tour.next}</button>
        </div>
      </div>
    </div>
  );
}
