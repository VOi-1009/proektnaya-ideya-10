import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import Icon from "@/components/ui/icon";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";

const inputCls =
  "w-full bg-rail rounded px-3 h-10 text-sm text-white outline-none border border-transparent focus:border-primary placeholder:text-muted-foreground";

const AuthDialog = () => {
  const { authOpen, setAuthOpen, auth } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr("Укажите корректную почту");
    if (password.length < 6) return setErr("Пароль должен быть не короче 6 символов");
    setErr("");
    setLoading(true);
    try {
      await auth(mode, email.trim(), password);
      setAuthOpen(false);
      setPassword("");
      toast({ title: mode === "login" ? "С возвращением!" : "Аккаунт создан", description: "Портфель теперь сохраняется в вашем аккаунте." });
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === "login" ? "register" : "login"));
    setErr("");
  };

  return (
    <Dialog open={authOpen} onOpenChange={setAuthOpen}>
      <DialogContent className="bg-card border-border text-foreground sm:max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mx-auto mb-2">
            <Icon name="Wallet" size={22} />
          </div>
          <DialogTitle className="text-white text-center text-xl">
            {mode === "login" ? "Вход в аккаунт" : "Регистрация"}
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Портфель будет доступен с любого устройства
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3" noValidate>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Почта</label>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={`${inputCls} mt-1`}
            />
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Пароль</label>
            <input
              type="password"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Не короче 6 символов"
              className={`${inputCls} mt-1`}
            />
          </div>
          {err && <div className="text-down text-sm">{err}</div>}
          <Button type="submit" disabled={loading} className="w-full h-10 font-semibold">
            {loading && <Icon name="Loader2" size={16} className="mr-2 animate-spin" />}
            {mode === "login" ? "Войти" : "Создать аккаунт"}
          </Button>
          <div className="text-sm text-muted-foreground text-center">
            {mode === "login" ? "Нет аккаунта?" : "Уже есть аккаунт?"}{" "}
            <button type="button" onClick={switchMode} className="text-primary hover:underline">
              {mode === "login" ? "Зарегистрироваться" : "Войти"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;