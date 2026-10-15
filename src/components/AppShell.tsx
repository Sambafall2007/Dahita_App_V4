import { Link } from "@tanstack/react-router";
import { Home, Wallet, CalendarDays, Megaphone, User, ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { Statut } from "@/lib/mock";
import { RequireAuth } from "@/components/RequireAuth";

const nav = [
  { to: "/accueil", label: "Accueil", icon: Home },
  { to: "/cotisations", label: "Cotisations", icon: Wallet },
  { to: "/activites", label: "Activités", icon: CalendarDays },
  { to: "/annonces", label: "Annonces", icon: Megaphone },
  { to: "/profil", label: "Profil", icon: User },
] as const;

export function AppShell({ title, back, children }: { title?: string; back?: string; children: ReactNode }) {
  return (
    <RequireAuth>
    <div className="mx-auto min-h-screen max-w-md bg-background pb-28">
      {title && (
        <header className="sticky top-0 z-10 flex items-center gap-3 bg-background/90 px-5 py-4 backdrop-blur">
          {back && (
            <Link to={back} aria-label="Retour" className="grid h-11 w-11 place-items-center rounded-full bg-secondary text-secondary-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          )}
          <h1 className="text-2xl font-semibold text-primary">{title}</h1>
        </header>
      )}
      <main className="px-5">{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-md border-t bg-card px-2 pb-3 pt-2">
        <ul className="grid grid-cols-5">
          {nav.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex flex-col items-center gap-1 rounded-xl py-2 text-xs font-medium text-muted-foreground"
                activeProps={{ className: "text-primary bg-secondary" }}
              >
                <Icon className="h-6 w-6" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
    </RequireAuth>
  );
}

const statutStyle: Record<Statut, string> = {
  payé: "bg-success/15 text-success",
  "en attente": "bg-warning/20 text-accent-foreground",
  "à payer": "bg-secondary text-secondary-foreground",
  échoué: "bg-destructive/15 text-destructive",
};

export function StatutBadge({ s }: { s: Statut }) {
  return <span className={`rounded-full px-3 py-1 text-xs font-semibold capitalize ${statutStyle[s]}`}>{s}</span>;
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border bg-card p-4 shadow-card ${className}`}>{children}</div>;
}

export function meta(title: string, description: string) {
  return {
    meta: [
      { title: `${title} — Dahira App` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} — Dahira App` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  };
}
