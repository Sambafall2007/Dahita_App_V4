import { createFileRoute, Link } from "@tanstack/react-router";
import { meta } from "@/components/AppShell";

export const Route = createFileRoute("/")({
  head: () => meta("Bienvenue", "Gérez vos cotisations, activités et annonces de la dahira depuis votre téléphone."),
  component: Splash,
});

function Splash() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-hero text-primary-foreground">
      <div className="pattern flex flex-1 flex-col items-center justify-center px-8 text-center">
        <div className="bg-gold-grad mb-8 grid h-24 w-24 place-items-center rounded-3xl text-4xl font-bold text-gold-foreground shadow-card" style={{ fontFamily: "var(--font-display)" }}>
          ☪
        </div>
        <h1 className="text-5xl font-semibold">Dahira App</h1>
        <p className="mt-4 text-lg opacity-85">Cotisations, activités et annonces de votre dahira, réunies au même endroit.</p>
      </div>
      <div className="space-y-3 px-6 pb-10">
        <Link to="/connexion" className="bg-gold-grad block rounded-2xl py-4 text-center text-lg font-bold text-gold-foreground">
          Se connecter
        </Link>
        <Link to="/connexion" search={{ mode: "inscription" }} className="block rounded-2xl border border-primary-foreground/40 py-4 text-center text-lg font-semibold">
          Créer un compte
        </Link>
      </div>
    </div>
  );
}
