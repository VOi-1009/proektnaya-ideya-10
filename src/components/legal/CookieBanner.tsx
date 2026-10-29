import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CONSENT_KEY, loadMetrika } from "@/lib/metrika";

const CookieBanner = () => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(CONSENT_KEY)) loadMetrika();
    else setShow(true);
  }, []);

  if (!show) return null;

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, new Date().toISOString());
    loadMetrika();
    setShow(false);
  };

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:max-w-md z-[100] bg-card border border-border rounded-xl shadow-2xl p-4 flex flex-col gap-3">
      <p className="text-sm text-foreground leading-relaxed">
        Сайт использует cookies и данные о посещениях (Яндекс.Метрика) для работы входа, портфеля и улучшения сайта. Продолжая пользоваться сайтом, вы соглашаетесь с{" "}
        <a href="/privacy" className="text-primary hover:underline">политикой обработки персональных данных</a>.
      </p>
      <Button onClick={accept} className="font-semibold self-end">Понятно</Button>
    </div>
  );
};

export default CookieBanner;
