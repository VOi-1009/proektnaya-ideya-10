import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { DonateSettings, donateRequest, useDonate } from "@/lib/donate";
import DonationRequests from "./DonationRequests";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const DonateManager = ({ token }: { token: string | null }) => {
  const qc = useQueryClient();
  const { data } = useDonate();
  const [form, setForm] = useState<DonateSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && !form) setForm(data);
  }, [data, form]);

  const save = async () => {
    if (!form) return;
    setSaving(true);
    try {
      const { donate } = await donateRequest<{ donate: DonateSettings }>(token, form);
      qc.setQueryData(["donate"], donate);
      setForm(donate);
      toast({ title: "Настройки доната сохранены" });
    } catch (e) {
      toast({ title: "Не получилось сохранить", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (!form) return <p className="text-muted-foreground text-sm">Загружаю…</p>;

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl text-white">Донаты</h1>
        <p className="text-muted-foreground text-sm max-w-2xl">Зелёная кнопка в шапке сайта и окно с QR-кодом для перевода.</p>
      </div>
      <DonationRequests token={token} />
      <div className="grid lg:grid-cols-[1fr_260px] gap-4">
        <div className="bg-card border border-border rounded-lg p-4 space-y-3">
          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer">
            <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
            Показывать кнопку на сайте
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Текст кнопки</span>
            <input className={inputCls} value={form.buttonText} maxLength={40} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Заголовок окна</span>
            <input className={inputCls} value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Текст обращения</span>
            <textarea
              className={`${inputCls} h-28 py-2 resize-y`}
              value={form.text}
              maxLength={1500}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
            />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Ссылка для перевода (из неё строится QR-код)</span>
            <input className={inputCls} value={form.url} maxLength={1000} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." />
          </label>
          <label className="space-y-1 block">
            <span className="text-xs text-muted-foreground">Реквизиты (необязательно): номер карты, телефон для СБП, банк</span>
            <textarea
              className={`${inputCls} h-20 py-2 resize-y font-mono`}
              value={form.details}
              maxLength={1000}
              onChange={(e) => setForm({ ...form, details: e.target.value })}
            />
          </label>
          <Button onClick={save} disabled={saving} className="font-semibold">
            {saving && <Icon name="Loader2" size={16} className="mr-1.5 animate-spin" />}
            Сохранить
          </Button>
        </div>
        <div className="bg-card border border-border rounded-lg p-4 flex flex-col items-center gap-2 self-start">
          <span className="text-xs text-muted-foreground">Предпросмотр QR-кода</span>
          {form.url ? (
            <div className="bg-white p-2 rounded-lg">
              <QRCodeSVG value={form.url} size={180} />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground text-center py-8">Укажите ссылку</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default DonateManager;
