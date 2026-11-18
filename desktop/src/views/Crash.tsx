import { Component, type ReactNode } from "react";
import { Btn } from "./Shell";

type Props = {
  children: ReactNode;
  /** Changes (e.g. the design after undo/redo) clear the error and try again. */
  resetKey?: unknown;
  onUndo?: () => void;
  onRedo?: () => void;
  onHome?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
};
type State = { error: Error | null; stack: string; copied: boolean };

/**
 * Catches a crash in one part of the app so the window never goes blank.
 * Shows what broke, lets the user step back (undo/redo) or go home; the project keeps saving.
 */
export class Crash extends Component<Props, State> {
  state: State = { error: null, stack: "", copied: false };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    console.error("LW Album crash", error, info.componentStack);
    this.setState({ stack: info.componentStack ?? "" });
  }

  componentDidUpdate(prev: Props) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.setState({ error: null, stack: "", copied: false });
  }

  render() {
    const { error, stack, copied } = this.state;
    if (!error) return this.props.children;
    const { onUndo, onRedo, onHome, canUndo, canRedo } = this.props;
    const detail = `${error.name}: ${error.message}\n${(error.stack ?? "").split("\n").slice(1, 6).join("\n")}\n${stack.trim().split("\n").slice(0, 6).join("\n")}`;
    const copy = () => { void navigator.clipboard?.writeText(detail).then(() => this.setState({ copied: true })).catch(() => {}); };
    const retry = () => this.setState({ error: null, stack: "", copied: false });
    return (
      <div className="work" role="alert">
        <div className="center"><div className="canvas" style={{ display: "flex" }}>
          <div className="dropzone" style={{ maxWidth: 520 }}>
            <strong>Bagian ini gagal ditampilkan</strong>
            <span>Pekerjaanmu tetap tersimpan. Coba kembalikan langkah tadi, atau tampilkan ulang. Kalau terulang, salin detailnya dan kirim ke kami.</span>
            <div className="two" style={{ flexWrap: "wrap" }}>
              {onRedo && canRedo && <Btn kind="primary" icon="redo-2" label="Kembalikan (Ulangi)" onClick={onRedo} />}
              {onUndo && canUndo && <Btn icon="undo-2" label="Urungkan lagi" onClick={onUndo} />}
              <Btn label="Tampilkan ulang" onClick={retry} />
              {onHome && <Btn label="Ke Beranda" onClick={onHome} />}
            </div>
            <pre className="caption" style={{ whiteSpace: "pre-wrap", textAlign: "left", maxHeight: 140, overflow: "auto", userSelect: "text", margin: 0 }}>{error.message}</pre>
            <Btn kind="ghost" label={copied ? "Detail tersalin" : "Salin detail galat"} onClick={copy} />
          </div>
        </div></div>
      </div>
    );
  }
}
