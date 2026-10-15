import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { meta } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import type { FormEvent } from "react";

export const Route = createFileRoute("/connexion")({
  validateSearch: (s: Record<string, unknown>) => ({ mode: s["mode"] === "inscription" ? "inscription" : undefined }) as { mode?: "inscription" | undefined },
  head: () => meta("Connexion", "Connectez-vous ou créez votre compte membre de la dahira."),
  component: Connexion,
});

const field = "w-full rounded-xl border bg-card px-4 py-4 text-base outline-none focus:ring-2 focus:ring-ring";

function Connexion() {
  const { mode } = Route.useSearch();
  const inscription = mode === "inscription";
  const nav = useNavigate();
  const { client, configurationMissing } = useAuth();
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [telephone, setTelephone] = useState("");
  const [email, setEmail] = useState("");
  const [section, setSection] = useState("");
  const [password, setPassword] = useState("");
  const [identifiant, setIdentifiant] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(""); setMessage("");
    if (!client) { setError("Supabase n'est pas configuré. Consultez le fichier README."); return; }
    setBusy(true);
    try {
      if (inscription) {
        if (!prenom.trim() || !nom.trim() || !telephone.trim() || !section) {
          setError("Remplissez tous les champs obligatoires."); return;
        }
        if (password.length < 8) { setError("Le mot de passe doit contenir au moins 8 caractères."); return; }
        if (!email.trim()) { setError("Utilisez une adresse e-mail valide pour créer le compte."); return; }
        const { data, error: signUpError } = await client.auth.signUp({
          email: email.trim().toLowerCase(),
          password,
          options: { data: { full_name: `${prenom.trim()} ${nom.trim()}`, phone: telephone.trim(), section } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setMessage("Compte créé. Vérifiez votre e-mail pour confirmer l'inscription avant de vous connecter.");
          return;
        }
        await nav({ to: "/accueil" });
      } else {
        const emailValue = identifiant.trim().toLowerCase();
        if (!emailValue.includes("@")) {
          setError("La connexion utilise actuellement l'e-mail. Saisissez l'adresse e-mail associée au compte."); return;
        }
        const { error: signInError } = await client.auth.signInWithPassword({ email: emailValue, password });
        if (signInError) throw signInError;
        await nav({ to: "/accueil" });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword() {
    setError(""); setMessage("");
    if (!client) { setError("Supabase n'est pas configuré."); return; }
    const target = inscription ? email.trim() : identifiant.trim();
    if (!target.includes("@")) { setError("Saisissez d'abord votre adresse e-mail."); return; }
    const { error: resetError } = await client.auth.resetPasswordForEmail(target, { redirectTo: `${window.location.origin}/connexion` });
    if (resetError) setError(resetError.message);
    else setMessage("Si cette adresse est associée à un compte, un lien de réinitialisation a été envoyé.");
  }

  return (
    <div className="mx-auto min-h-screen max-w-md px-6 py-10">
      <Link to="/" className="text-sm font-medium text-muted-foreground">← Retour</Link>
      <h1 className="mt-6 text-4xl font-semibold text-primary">{inscription ? "Créer un compte" : "Connexion"}</h1>
      <p className="mt-2 text-muted-foreground">{inscription ? "Rejoignez votre dahira en quelques secondes." : "Connectez-vous avec votre adresse e-mail."}</p>
      {configurationMissing && <p className="mt-4 rounded-xl bg-warning/15 p-3 text-sm">Supabase doit être configuré avant de pouvoir créer un compte ou se connecter.</p>}
      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        {inscription && <>
          <div className="grid grid-cols-2 gap-3">
            <input className={field} placeholder="Prénom" value={prenom} onChange={(e) => setPrenom(e.target.value)} autoComplete="given-name" required />
            <input className={field} placeholder="Nom" value={nom} onChange={(e) => setNom(e.target.value)} autoComplete="family-name" required />
          </div>
          <input className={field} placeholder="Téléphone" value={telephone} onChange={(e) => setTelephone(e.target.value)} autoComplete="tel" required />
        </>}
        {inscription ? <input className={field} type="email" placeholder="Adresse e-mail" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required /> : <input className={field} type="email" placeholder="Adresse e-mail" value={identifiant} onChange={(e) => setIdentifiant(e.target.value)} autoComplete="username" required />}
        {inscription && <select className={field} value={section} onChange={(e) => setSection(e.target.value)} required><option value="" disabled>Choisir votre section</option><option value="Section Médina">Section Médina</option><option value="Section Parcelles">Section Parcelles</option><option value="Section Thiès">Section Thiès</option></select>}
        <input className={field} type="password" placeholder="Mot de passe (8 caractères minimum)" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={inscription ? "new-password" : "current-password"} minLength={8} required />
        {inscription && <label className="flex items-start gap-3 text-sm text-muted-foreground"><input type="checkbox" className="mt-1 h-5 w-5 accent-primary" required />J'accepte les conditions d'utilisation et la politique de confidentialité.</label>}
        {error && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
        {message && <p role="status" className="rounded-xl bg-success/10 p-3 text-sm">{message}</p>}
        <button disabled={busy || configurationMissing} className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-50">{busy ? "Veuillez patienter…" : inscription ? "Créer mon compte" : "Se connecter"}</button>
        {!inscription && <button type="button" onClick={() => void resetPassword()} className="w-full py-2 text-sm font-medium text-primary">Mot de passe oublié ?</button>}
      </form>
      <p className="mt-8 text-center text-muted-foreground">{inscription ? "Déjà membre ? " : "Pas encore de compte ? "}<Link to="/connexion" search={{ mode: inscription ? undefined : "inscription" }} className="font-bold text-primary">{inscription ? "Se connecter" : "S'inscrire"}</Link></p>
    </div>
  );
}
