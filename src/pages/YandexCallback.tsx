import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import Icon from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const YandexCallback = () => {
  const { finishYandex } = useAuth();
  const navigate = useNavigate();
  const [err, setErr] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) {
      setErr(params.get("error_description") || "Вход отменён");
      return;
    }
    finishYandex(code, params.get("state"))
      .then(() => {
        toast({ title: "Вы вошли через Яндекс", description: "Портфель теперь сохраняется в вашем аккаунте." });
        navigate("/", { replace: true });
      })
      .catch((e) => setErr((e as Error).message));
  }, [finishYandex, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-xl p-8 max-w-sm w-full text-center">
        {err ? (
          <>
            <Icon name="CircleAlert" size={36} className="mx-auto mb-3 text-down" />
            <div className="text-white font-semibold mb-1">Не получилось войти</div>
            <div className="text-muted-foreground text-sm mb-5">{err}</div>
            <Button onClick={() => navigate("/", { replace: true })} className="w-full font-semibold">
              Вернуться на сайт
            </Button>
          </>
        ) : (
          <>
            <Icon name="Loader2" size={36} className="mx-auto mb-3 text-primary animate-spin" />
            <div className="text-white font-semibold">Входим через Яндекс…</div>
          </>
        )}
      </div>
    </div>
  );
};

export default YandexCallback;
