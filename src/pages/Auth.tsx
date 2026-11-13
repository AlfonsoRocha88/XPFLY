import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { GlassCard, GlassItem } from "@/components/auth/GlassCard";
import { GlassInput } from "@/components/auth/GlassInput";
import { GlassButton } from "@/components/auth/GlassButton";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

/** Large serif wordmark with a soft, cold starlight glow. */
const Wordmark = () => (
  <div className="text-center">
    <h1 className="font-serif text-6xl font-normal tracking-tight text-white [font-variation-settings:'SOFT'_100] [text-shadow:0_0_18px_rgba(186,230,253,0.45),0_0_56px_rgba(167,139,250,0.4)]">
      XPFly
    </h1>
    <p className="mt-2 text-sm font-medium tracking-wide text-white/70">Sube de nivel en tu vida real</p>
  </div>
);

/** Hairline of light separating the brand from the form. */
const Divider = () => <div aria-hidden className="mx-auto h-px w-2/3 bg-gradient-to-r from-transparent via-white/30 to-transparent" />;

/** Supabase auth errors in plain Spanish (the API returns English). */
function authErrorEs(error: { code?: string; message: string }): string {
  switch (error.code) {
    case "email_not_confirmed": return "Confirma tu correo antes de entrar: abre el correo más reciente de XPFly.";
    case "invalid_credentials": return "Correo o contraseña incorrectos.";
    case "user_already_exists":
    case "email_exists": return "Ya existe una cuenta con ese correo. Inicia sesión.";
    case "over_email_send_rate_limit": return "Ya te enviamos un correo hace un momento. Espera un minuto antes de pedir otro.";
    case "weak_password": return "Elige una contraseña más segura.";
    default: return error.message;
  }
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
  // Set after sign-up (or a login on an unconfirmed account): replaces the form with "check your email".
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(t);
  }, [resendIn]);

  // Came back from an email link that no longer works.
  useEffect(() => {
    let code: string | null = null;
    try { code = sessionStorage.getItem("authLinkError"); sessionStorage.removeItem("authLinkError"); } catch { /* ignore */ }
    if (code) {
      toast.error(
        code === "otp_expired"
          ? "Ese enlace ya no sirve. Si pediste varios correos, solo funciona el más reciente. Inicia sesión y te enviamos uno nuevo."
          : "No se pudo confirmar con ese enlace. Inicia sesión para recibir uno nuevo.",
        { duration: 8000 },
      );
    }
  }, []);

  const resendConfirmation = async () => {
    if (!pendingEmail || resendIn > 0) return;
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail, options: { emailRedirectTo: window.location.origin } });
    if (error) toast.error(authErrorEs(error));
    else { toast.success("Te enviamos un correo nuevo. Usa ese y no los anteriores."); setResendIn(60); }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (isLogin) {
      const loginEmail = email;
      if (!useEmailLogin) {
        // Sign in through the backend so usernames never expose account emails.
        const { data, error: fnError } = await supabase.functions.invoke("resolve-username", {
          body: { username: identifier.trim(), password },
        });
        if (data?.code === "email_not_confirmed" && data.email) {
          setPendingEmail(data.email as string);
          setLoading(false);
          return;
        }
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
      if (error?.code === "email_not_confirmed") {
        setPendingEmail(loginEmail);
      } else if (error) {
        toast.error(authErrorEs(error));
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
        toast.error(authErrorEs(error));
      } else {
        // Show the "check your email" screen instead of leaving the form up: tapping
        // "Crear cuenta" again would send a new email and void the first link.
        setPendingEmail(email);
        setResendIn(60);
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

  if (pendingEmail) {
    return (
      <AuthScreen>
        <GlassCard className="space-y-5 text-center">
          <GlassItem className="space-y-2">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-white [text-shadow:0_0_24px_rgba(186,230,253,0.35)]">Confirma tu correo</h1>
            <p className="text-sm leading-relaxed text-white/75">
              Te enviamos un enlace a <span className="break-all font-semibold text-white">{pendingEmail}</span>. Ábrelo para activar tu cuenta y luego vuelve aquí para entrar.
            </p>
          </GlassItem>
          <GlassItem>
            <p className="text-sm text-white/60">
              Si no lo ves, revisa Spam o Promociones. Si pides otro, usa solo el más reciente.
            </p>
          </GlassItem>
          <GlassItem className="space-y-3">
            <GlassButton type="button" variant="secondary" disabled={resendIn > 0} onClick={resendConfirmation}>
              {resendIn > 0 ? `Reenviar correo (${resendIn} s)` : "Reenviar correo"}
            </GlassButton>
            <GlassButton type="button" onClick={() => { setPendingEmail(null); setIsLogin(true); }}>
              Ya lo confirmé, entrar
            </GlassButton>
          </GlassItem>
        </GlassCard>
      </AuthScreen>
    );
  }

  if (showReset) {
    return (
      <AuthScreen>
        <GlassCard className="space-y-5">
          <GlassItem className="space-y-2 text-center">
            <h1 className="font-serif text-3xl font-normal tracking-tight text-white [text-shadow:0_0_24px_rgba(186,230,253,0.35)]">Restablecer contraseña</h1>
            <p className="text-sm text-white/70">Ingresa tu email para recibir un enlace</p>
          </GlassItem>
          <form onSubmit={handleResetPassword} className="space-y-3">
            <GlassItem>
              <GlassInput type="email" placeholder="tu@email.com" aria-label="Correo" autoComplete="email" autoCapitalize="none" enterKeyHint="send" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </GlassItem>
            <GlassItem className="space-y-3 pt-1">
              <GlassButton type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar enlace"}
              </GlassButton>
              <GlassButton type="button" variant="secondary" onClick={() => setShowReset(false)}>
                Volver
              </GlassButton>
            </GlassItem>
          </form>
        </GlassCard>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen>
      <GlassCard className="space-y-6">
        <GlassItem>
          <Wordmark />
        </GlassItem>
        <GlassItem className="space-y-4">
          <Divider />
          <div className="space-y-1 text-center">
            <h2 className="font-serif text-2xl font-normal text-white">
              {isLogin ? "Inicia sesión" : "Crea tu cuenta"}
            </h2>
            <p className="text-sm text-white/65">
              {isLogin ? "Qué bueno verte de nuevo" : "Organiza tu día y mide tu progreso"}
            </p>
          </div>
        </GlassItem>
        <form onSubmit={handleAuth} className="space-y-3">
          {!isLogin && (
            <>
              <GlassItem>
                <GlassInput
                  placeholder="Tu nombre"
                  aria-label="Tu nombre"
                  autoComplete="name"
                  enterKeyHint="next"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                />
              </GlassItem>
              <GlassItem>
                <GlassInput
                  placeholder="Usuario (para iniciar sesión)"
                  aria-label="Usuario"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  minLength={3}
                />
              </GlassItem>
            </>
          )}
          <GlassItem>
            {isLogin && !useEmailLogin ? (
              <GlassInput
                placeholder="Usuario"
                aria-label="Usuario"
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                autoCapitalize="none"
                autoCorrect="off"
              />
            ) : (
              <GlassInput type="email" placeholder="tu@email.com" aria-label="Correo" autoComplete="email" autoCapitalize="none" enterKeyHint="next" value={email} onChange={(e) => setEmail(e.target.value)} required />
            )}
          </GlassItem>
          <GlassItem className="space-y-3">
            <GlassInput type="password" placeholder="Contraseña" aria-label="Contraseña" autoComplete={isLogin ? "current-password" : "new-password"} enterKeyHint="go" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
            {(!isLogin || password.length > 0) && password.length > 0 && (
              <PasswordStrength value={password} showError={!isLogin} />
            )}
          </GlassItem>
          <GlassItem className="pt-2">
            <GlassButton
              type="submit"
              disabled={loading || (!isLogin && password.length > 0 && password.length < 6)}
            >
              {loading ? "Cargando..." : isLogin ? "Ingresar" : "Crear cuenta"}
            </GlassButton>
          </GlassItem>
          <GlassItem className="flex flex-col items-center gap-2 pt-2">
            {isLogin && (
              <GlassButton type="button" variant="pill" onClick={() => setUseEmailLogin(!useEmailLogin)}>
                {useEmailLogin ? "Usar usuario en su lugar" : "¿Olvidaste tu usuario? Usar correo"}
              </GlassButton>
            )}
            <GlassButton type="button" variant="pill" className="text-white/90" onClick={() => setIsLogin(!isLogin)}>
              {isLogin ? "¿Nuevo aquí? Crear cuenta" : "¿Ya tienes cuenta? Entrar"}
            </GlassButton>
            {isLogin && (
              <GlassButton type="button" variant="pill" onClick={() => setShowReset(true)}>
                ¿Olvidaste tu contraseña?
              </GlassButton>
            )}
          </GlassItem>
        </form>
      </GlassCard>
    </AuthScreen>
  );
};

export default Auth;
