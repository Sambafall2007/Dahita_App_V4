import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/profil")({
  head: () => meta("Profil et carte", "Votre carte de membre numérique et vos informations personnelles."),
  component: Profil,
});

function Profil() {
  const { user, profile, signOut } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function handleSignOut() {
    setBusy(true); setError("");
    try { await signOut(); await nav({ to: "/connexion" }); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Déconnexion impossible."); }
    finally { setBusy(false); }
  }
  const name = profile?.full_name || user?.user_metadata?.full_name || "Membre";
  const since = profile?.created_at ? new Date(profile.created_at).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }) : "—";
  const roleLabel: Record<string, string> = { member: "Membre", treasurer: "Trésorier", manager: "Responsable", admin: "Administrateur" };
  return (
    <AppShell title="Mon profil">
      <div className="bg-hero pattern relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-card">
        <div className="bg-gold-grad absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-70" />
        <p className="text-sm uppercase tracking-widest opacity-80">Carte de membre</p>
        <p className="mt-6 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>{name}</p>
        <p className="opacity-85">{profile?.section || "Section non définie"}</p>
        <div className="mt-6 flex items-end justify-between gap-4">
          <div><p className="text-xs opacity-70">N° de carte</p><p className="font-mono text-lg font-bold">{profile?.member_number || "En attente"}</p></div>
          <div className="text-right"><p className="text-xs opacity-70">Membre depuis</p><p className="font-bold capitalize">{since}</p></div>
        </div>
      </div>
      <Card className="mt-6 space-y-4">
        {[["Téléphone", profile?.phone || "Non renseigné"], ["E-mail", user?.email || "Non renseigné"], ["Section", profile?.section || "Non définie"], ["Rôle", roleLabel[profile?.role || "member"]], ["Statut", profile?.status === "suspended" ? "Suspendu" : "Actif"]].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><span className="text-muted-foreground">{k}</span><span className="text-right font-semibold">{v}</span></div>
        ))}
      </Card>
      {profile && ["admin", "manager", "treasurer"].includes(profile.role) && <Link to="/admin" className="mt-6 block rounded-2xl bg-secondary py-4 text-center font-bold text-secondary-foreground">Espace administration</Link>}
      {error && <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>}
      <button disabled={busy} onClick={() => void handleSignOut()} className="mt-4 w-full rounded-2xl border border-destructive py-4 font-bold text-destructive disabled:opacity-50">{busy ? "Déconnexion…" : "Se déconnecter"}</button>
    </AppShell>
  );
}
