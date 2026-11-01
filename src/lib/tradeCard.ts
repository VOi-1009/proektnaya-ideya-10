export interface TradeCardData {
  coinName: string;
  coinShort: string;
  coinColor: string;
  side: "long" | "short";
  leverage: number;
  entry: string;
  close: string;
  pct: number;
  pnl: string;
  date: string;
}

const UP = "#22C55E";
const DOWN = "#EA3943";
const BRAND = "#F97316";

const round = (c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
};

export const renderTradeCard = (d: TradeCardData): string => {
  const W = 1200;
  const H = 630;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const c = cv.getContext("2d");
  if (!c) throw new Error("Не удалось создать картинку");
  const win = d.pct >= 0;
  const main = win ? UP : DOWN;
  const font = "Inter, 'Segoe UI', Arial, sans-serif";

  const bg = c.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#1B1C20");
  bg.addColorStop(1, "#101114");
  c.fillStyle = bg;
  c.fillRect(0, 0, W, H);

  const glow = c.createRadialGradient(W - 180, 120, 10, W - 180, 120, 520);
  glow.addColorStop(0, win ? "rgba(34,197,94,0.28)" : "rgba(234,57,67,0.28)");
  glow.addColorStop(1, "rgba(0,0,0,0)");
  c.fillStyle = glow;
  c.fillRect(0, 0, W, H);

  c.fillStyle = main;
  c.fillRect(0, 0, 14, H);

  c.font = `700 30px ${font}`;
  c.textBaseline = "alphabetic";
  let lx = 70;
  for (const [part, col] of [["TRADER", "#FFFFFF"], ["KA", BRAND], [".RU", "#FFFFFF"]] as const) {
    c.fillStyle = col;
    c.fillText(part, lx, 78);
    lx += c.measureText(part).width;
  }
  c.fillStyle = "#8A8F98";
  c.font = `400 24px ${font}`;
  c.fillText("Тренировочная биржа · виртуальные USDT", lx + 20, 78);

  c.fillStyle = d.coinColor;
  c.beginPath();
  c.arc(118, 200, 48, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = "#fff";
  c.font = `700 ${d.coinShort.length > 3 ? 24 : 30}px ${font}`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(d.coinShort.slice(0, 5), 118, 202);
  c.textAlign = "left";
  c.textBaseline = "alphabetic";

  c.fillStyle = "#fff";
  c.font = `700 52px ${font}`;
  c.fillText(d.coinName, 188, 198);

  const tag = `${d.side === "long" ? "ЛОНГ" : "ШОРТ"}  x${d.leverage}`;
  c.font = `700 26px ${font}`;
  const tw = c.measureText(tag).width + 40;
  c.fillStyle = d.side === "long" ? "rgba(34,197,94,0.18)" : "rgba(234,57,67,0.18)";
  round(c, 190, 214, tw, 46, 12);
  c.fill();
  c.fillStyle = d.side === "long" ? UP : DOWN;
  c.fillText(tag, 210, 247);

  c.fillStyle = main;
  c.font = `800 150px ${font}`;
  c.fillText(`${d.pct > 0 ? "+" : d.pct < 0 ? "−" : ""}${Math.abs(d.pct).toFixed(1)}%`, 66, 440);

  c.fillStyle = "#B4B8C0";
  c.font = `500 34px ${font}`;
  c.fillText(d.pnl, 72, 490);

  c.fillStyle = "rgba(255,255,255,0.06)";
  round(c, 70, 520, W - 140, 2, 1);
  c.fill();

  c.fillStyle = "#8A8F98";
  c.font = `400 22px ${font}`;
  c.fillText("ВХОД", 72, 566);
  c.fillText("ВЫХОД", 420, 566);
  c.fillStyle = "#fff";
  c.font = `600 32px ${font}`;
  c.fillText(d.entry, 72, 604);
  c.fillText(d.close, 420, 604);

  c.fillStyle = "#6B7079";
  c.font = `400 22px ${font}`;
  c.textAlign = "right";
  c.fillText(d.date, W - 70, 604);
  c.textAlign = "left";

  return cv.toDataURL("image/png");
};
