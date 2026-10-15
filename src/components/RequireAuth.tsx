import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useAuth, type DahiraRole } from "@/lib/auth";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, profile, loading, configurationMissing, signOut } = useAuth();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && !configurationMissing && !user) {
      void navigate({ to: "/connexion", search: { mode: undefined } });
    }
  }, [loading, configurationMissing, user, navigate]);

  if (configurationMissing) return <SetupNotice />;
  if (loading || !user) return <div className="grid min-h-screen place-items-center p-6 text-center text-muted-foreground">Vérification de votre session…</div>;
  if (profile?.status === "suspended") return <div className="mx-auto grid min-h-screen max-w-md content-center gap-3 p-6 text-center"><h1 className="text-2xl font-bold">Compte suspendu</h1><p className="text-muted-foreground">L'accès à l'application est suspendu. Contactez un administrateur de votre dahira.</p><button className="rounded-xl border p-3 font-semibold" onClick={() => void signOut()}>Se déconnecter</button></div>;
  return <>{children}</>;
}

export function RequireRole({ roles, children }: { roles: DahiraRole[]; children: ReactNode }) {
  const { profile, loading, user } = useAuth();
  if (loading) return <div className="p-8 text-center text-muted-foreground">Vérification des autorisations…</div>;
  if (!user || !profile) return <div className="p-8 text-center">Profil introuvable. Déconnectez-vous puis reconnectez-vous.</div>;
  if (!roles.includes(profile.role)) {
    return <div className="mx-auto max-w-md p-8 text-center"><h1 className="text-xl font-bold">Accès refusé</h1><p className="mt-2 text-muted-foreground">Votre compte n'a pas les autorisations nécessaires.</p><Link to="/accueil" className="mt-5 inline-block font-semibold text-primary">Retour à l'accueil</Link></div>;
  }
  return <>{children}</>;
}

function SetupNotice() {
  return <div className="mx-auto grid min-h-screen max-w-md content-center gap-3 p-6"><h1 className="text-2xl font-bold text-primary">Configuration requise</h1><p className="text-muted-foreground">Supabase n'est pas encore configuré. Copiez <code>.env.example</code> vers <code>.env</code>, puis renseignez l'URL du projet et la clé publique anon.</p><p className="text-sm text-muted-foreground">Ne mettez jamais une clé service_role dans une variable VITE_ ou dans le navigateur.</p></div>;
}
