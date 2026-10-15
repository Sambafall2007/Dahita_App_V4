import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { cotisations, member, fcfa } from "@/lib/mock";

export const Route = createFileRoute("/paiement")({
  validateSearch: (s: Record<string, unknown>) => ({ id: typeof s["id"] === "string" ? s["id"] : "c1" }),
  head: () => meta("Paiement", "Réglez votre cotisation par Wave ou Orange Money et recevez votre reçu."),
  component: Paiement,
});

type Etape = "choix" | "confirmer" | "attente" | "recu";

function Paiement() {
  const { id } = Route.useSearch();
  const c = cotisations.find((x) => x.id === id) ?? cotisations[0]!;
  const [mode, setMode] = useState<"Wave" | "Orange Money">("Wave");
  const [etape, setEtape] = useState<Etape>("choix");

  const lancer = () => { setEtape("attente"); setTimeout(() => setEtape("recu"), 2200); };

  if (etape === "recu")
    return (
      <AppShell title="Reçu">
        <Card className="text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <p className="mt-3 text-2xl font-bold">Paiement réussi</p>
          <p className="text-muted-foreground">Confirmé par {mode}</p>
          <dl className="mt-6 space-y-3 border-t border-dashed pt-5 text-left">
            {[["Référence", "RC-24612"], ["Date", "09/10/2026 17:30"], ["Membre", `${member.prenom} ${member.nom}`], ["Cotisation", c.type], ["Moyen", mode], ["Montant", fcfa(c.montant)]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4"><dt className="text-muted-foreground">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>
            ))}
          </dl>
        </Card>
        <p className="mt-3 text-center text-xs text-muted-foreground">Prototype : paiement simulé, aucun débit réel.</p>
        <Link to="/cotisations" className="mt-6 block rounded-2xl bg-primary py-4 text-center text-lg font-bold text-primary-foreground">Retour aux cotisations</Link>
      </AppShell>
    );

  return (
    <AppShell title="Paiement" back="/cotisations">
      <Card>
        <p className="text-muted-foreground">{c.type} · {c.periode}</p>
        <p className="text-3xl font-bold text-primary">{fcfa(c.montant)}</p>
      </Card>
      {etape === "attente" ? (
        <div className="mt-10 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-lg font-semibold">En attente de confirmation {mode}…</p>
          <p className="text-muted-foreground">Validez le paiement sur votre téléphone.</p>
        </div>
      ) : (
        <>
          <h2 className="mb-3 mt-6 text-xl font-semibold">Moyen de paiement</h2>
          <div className="space-y-3">
            {(["Wave", "Orange Money"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`flex w-full items-center justify-between rounded-2xl border-2 bg-card p-5 text-lg font-bold ${mode === m ? "border-primary" : "border-border"}`}>
                {m}<span className={`h-6 w-6 rounded-full border-2 ${mode === m ? "border-primary bg-primary" : "border-border"}`} />
              </button>
            ))}
          </div>
          {etape === "confirmer" ? (
            <Card className="mt-6 border-gold">
              <p className="text-lg font-semibold">Confirmer le paiement de {fcfa(c.montant)} par {mode} ?</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={() => setEtape("choix")} className="rounded-xl bg-muted py-3 font-semibold">Annuler</button>
                <button onClick={lancer} className="rounded-xl bg-primary py-3 font-bold text-primary-foreground">Confirmer</button>
              </div>
            </Card>
          ) : (
            <button onClick={() => setEtape("confirmer")} className="bg-gold-grad mt-6 w-full rounded-2xl py-4 text-lg font-bold text-gold-foreground">Payer {fcfa(c.montant)}</button>
          )}
        </>
      )}
    </AppShell>
  );
}
