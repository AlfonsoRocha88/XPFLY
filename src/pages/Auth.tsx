import pyroImg from "@/assets/pyro-mascot.png";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

import { WALLPAPERS } from "@/lib/wallpapers";
import { getThemeClass, THEME_CLASS_NAMES } from "@/lib/themes";

function PasswordStrength({ value, showError }: { value: string; showError?: boolean }) {
  const checks = [
    value.length >= 6,
    value.length >= 10,
    /[A-Z]/.test(value),
    /[0-9]/.test(value),
    /[^A-Za-z0-9]/.test(value),
  ];
  const score = checks.filter(Boolean).length;
  const labels = ["Muy débil", "Débil", "Aceptable", "Buena", "Fuerte", "Excelente"];
  const colors = [
    "bg-destructive",
    "bg-destructive",
    "bg-priority-medium",
    "bg-priority-medium",
    "bg-status-done",
    "bg-status-done",
  ];
  const tooShort = value.length > 0 && value.length < 6;
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < score ? colors[score] : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p
        className={`font-display text-xs ${
          tooShort && showError ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {tooShort && showError
          ? "Mínimo 6 caracteres"
          : `Fuerza: ${labels[score]}`}
      </p>
    </div>
  );
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [useEmailLogin, setUseEmailLogin] = useState(false);
  const [identifier, setIdentifier] = useState(""); // username for login
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const navigate = useNavigate();

  // Apply user's last-saved theme, mode and wallpaper (cached on previous logged-in session)
  const lastWallpaperId = (typeof window !== "undefined" && localStorage.getItem("lastWallpaper")) || "default";
  const lastTheme = (typeof window !== "undefined" && localStorage.getItem("lastTheme")) || undefined;
  const lastMode = (typeof window !== "undefined" && localStorage.getItem("lastMode")) || undefined;
  const lastAnims = (typeof window !== "undefined" && localStorage.getItem("lastBgAnimations")) !== "false";

  useEffect(() => {
    const root = document.documentElement;
    THEME_CLASS_NAMES.forEach((c) => root.classList.remove(c));
    root.classList.add(getThemeClass(lastTheme));
    if (lastMode === "light") root.classList.add("light");
    else root.classList.remove("light");
  }, [lastTheme, lastMode]);

  const wp = useMemo(() => WALLPAPERS.find(w => w.id === lastWallpaperId), [lastWallpaperId]);
  const wallpaperStyle: React.CSSProperties = wp?.background
    ? { background: wp.background, backgroundAttachment: "fixed" }
    : {};
  const wallpaperAnimated = lastAnims && !!wp?.background && wp.id !== "default";

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      let loginEmail = email;
      if (!useEmailLogin) {
        // Sign in through the backend so usernames never expose account emails.
        const { data, error: fnError } = await supabase.functions.invoke("resolve-username", {
          body: { username: identifier.trim(), password },
        });
        if (fnError || !data?.access_token || !data?.refresh_token) {
          toast.error(data?.error ?? "Usuario o contraseña inválidos");
          setLoading(false);
          return;
        }
        const { error } = await supabase.auth.setSession({
          access_token: data.access_token as string,
          refresh_token: data.refresh_token as string,
        });
        if (error) toast.error(error.message);
        else navigate("/");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password });
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
      }
    } else {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9_]/g, "");
      if (cleanUsername.length < 3) {
        toast.error("El usuario debe tener al menos 3 caracteres (letras, números, _)");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName, username: cleanUsername },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("¡Cuenta creada! Revisa tu correo para confirmar.");
      }
    }
    setLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Revisa tu correo para restablecer tu contraseña.");
    }
    setLoading(false);
  };

  if (showReset) {
    return (
      <div className={`flex min-h-screen items-center justify-center p-4 ${wallpaperAnimated ? "wp-animated" : ""}`} style={wallpaperStyle}>
        <Card className="w-full max-w-md border-2 border-primary/30">
          <CardHeader className="text-center">
            <CardTitle className="font-serif text-2xl font-medium">Restablecer contraseña</CardTitle>
            <CardDescription className="font-pixel text-xs">Ingresa tu email para recibir un enlace</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" className="w-full font-pixel text-xs" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </Button>
              <Button type="button" variant="ghost" className="w-full font-pixel text-xs" onClick={() => setShowReset(false)}>
                Volver
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`flex h-full items-center justify-center overflow-y-auto p-4 ${wallpaperAnimated ? "wp-animated" : ""}`} style={wallpaperStyle}>
      <Card className="w-full max-w-md rounded-3xl border-0 shadow-lift">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <img src={pyroImg} alt="" className="mx-auto mb-2 h-16 w-16 object-contain" />
            <h1 className="font-serif text-5xl font-semibold tracking-tight text-primary">XPFly</h1>
            <p className="mt-1 text-sm font-medium text-muted-foreground">Sube de nivel en tu vida real</p>
          </div>
          <CardTitle className="mt-4 font-serif text-2xl font-medium">
            {isLogin ? "Iniciar partida" : "Nuevo jugador"}
          </CardTitle>
          <CardDescription className="text-sm">
            {isLogin ? "Continúa tu aventura" : "Únete a la aventura"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAuth} className="space-y-4">
            {!isLogin && (
              <>
                <Input
                  placeholder="Nombre de héroe"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
                <Input
                  placeholder="Usuario (para iniciar sesión)"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </>
            )}
            {isLogin && !useEmailLogin ? (
              <Input
                placeholder="Usuario"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            ) : (
              <Input type="email" placeholder="tu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
            )}
            <Input type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {(!isLogin || password.length > 0) && password.length > 0 && (
              <PasswordStrength value={password} showError={!isLogin} />
            )}
            <Button
              type="submit"
              className="h-12 w-full text-base font-semibold"
              disabled={loading || (!isLogin && password.length > 0 && password.length < 6)}
            >
              {loading ? "Cargando..." : isLogin ? "Ingresar" : "🛡️ Crear cuenta"}
            </Button>
            <div className="flex flex-col gap-2 text-center">
              {isLogin && (
                <button type="button" className="font-pixel text-[11px] text-muted-foreground hover:text-primary transition-colors" onClick={() => setUseEmailLogin(!useEmailLogin)}>
                  {useEmailLogin ? "Usar usuario en su lugar" : "¿Olvidaste tu usuario? Usar correo"}
                </button>
              )}
              <button type="button" className="font-pixel text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? "¿Nuevo aquí? Crear cuenta" : "¿Ya tienes cuenta? Entrar"}
              </button>
              {isLogin && (
                <button type="button" className="font-pixel text-xs text-muted-foreground hover:text-primary transition-colors" onClick={() => setShowReset(true)}>
                  ¿Olvidaste tu contraseña?
                </button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
