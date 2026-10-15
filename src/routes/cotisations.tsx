import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, ArrowRight, Wallet } from "lucide-react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";
import { fcfa } from "@/lib/mock";

export const Route = createFileRoute("/cotisations")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === "string" ? search.id : "",
  }),
  head: () =>
    meta(
      "Mes Cotisations",
      "Consultez vos échéances et déclarez vos règlements.",
    ),
  component: CotisationsRoute,
});

type Methode = "wave" | "orange_money" | "cash" | "bank_transfer" | "other";

type DueRow = {
  id: string;
  period_start: string;
  period_end: string;
  amount_due: number | string;
  due_date: string;
  status: "open" | "paid" | "cancelled";
  contribution_types: { name: string } | null;
  payment_reports: {
    amount: number | string;
    status: "pending" | "confirmed" | "approved" | "rejected";
  }[];
};

const methodLabels: Record<Methode, string> = {
  wave: "Wave",
  orange_money: "Orange Money",
  cash: "Espèces",
  bank_transfer: "Virement bancaire",
  other: "Autre",
};

function formatDate(value: string) {
  if (!value) return "";
  return new Date(`${value.slice(0, 10)}T12:00:00`).toLocaleDateString("fr-FR");
}

function CotisationsRoute() {
  const { id } = Route.useSearch();

  if (id) {
    return <PaymentForm dueId={id} />;
  }

  return <MyDuesList />;
}

function MyDuesList() {
  const { client, user } = useAuth();
  const [dues, setDues] = useState<DueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMyDues() {
      if (!client || !user) {
        setError("Connecte-toi pour voir tes cotisations.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: queryError } = await client
        .from("contribution_dues")
        .select(
          "id, period_start, period_end, amount_due, due_date, status, contribution_types(name), payment_reports(amount, status)",
        )
        .eq("member_id", user.id)
        .eq("status", "open")
        .order("due_date", { ascending: true });

      if (cancelled) return;

      if (queryError) {
        console.error("Erreur chargement cotisations", queryError.message);
        setError("Impossible de charger tes cotisations.");
      } else if (data) {
        setDues(data as unknown as DueRow[]);
      }

      setLoading(false);
    }

    void loadMyDues();

    return () => {
      cancelled = true;
    };
  }, [client, user]);

  const activeDues = dues.filter((due) => {
    const confirmed = due.payment_reports
      .filter((p) => p.status === "confirmed" || p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    return Math.max(0, Number(due.amount_due) - confirmed) > 0;
  });

  return (
    <AppShell title="Mes Cotisations" back="/accueil">
      <div className="space-y-4">
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Wallet className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-bold text-primary">Gestion des cotisations</h2>
              <p className="text-xs text-muted-foreground">
                Retrouvez ci-dessous vos échéances en attente de règlement.
              </p>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="text-center py-10">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Chargement de vos cotisations...</p>
          </div>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && activeDues.length === 0 && (
          <Card className="text-center py-8">
            <CheckCircle2 className="mx-auto h-12 w-12 text-success mb-2" />
            <p className="font-semibold">Aucune échéance en attente</p>
            <p className="text-xs text-muted-foreground mt-1">
              Vous êtes à jour dans vos cotisations. Bravo !
            </p>
          </Card>
        )}

        {!loading && activeDues.map((due) => {
          const confirmed = due.payment_reports
            .filter((p) => p.status === "confirmed" || p.status === "approved")
            .reduce((sum, p) => sum + Number(p.amount), 0);

          const remaining = Math.max(0, Number(due.amount_due) - confirmed);
          const hasPending = due.payment_reports.some((p) => p.status === "pending");

          return (
            <Card key={due.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base">
                    {due.contribution_types?.name ?? "Cotisation"}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Période : {formatDate(due.period_start)} au {formatDate(due.period_end)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Date limite : <span className="font-semibold">{formatDate(due.due_date)}</span>
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  hasPending ? "bg-warning/15 text-warning" : "bg-primary/10 text-primary"
                }`}>
                  {hasPending ? "Paiement en attente de validation" : "À régler"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <span className="text-xs text-muted-foreground block">Reste à payer</span>
                  <span className="text-xl font-bold text-primary">{fcfa(remaining)}</span>
                </div>
                {!hasPending && remaining > 0 && (
                  <Link
                    to="/cotisations"
                    search={{ id: due.id }}
                    className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground shadow"
                  >
                    Déclarer un paiement
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}

function PaymentForm({ dueId }: { dueId: string }) {
  const { client, user } = useAuth();

  const [due, setDue] = useState<DueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [method, setMethod] = useState<Methode>("wave");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDue() {
      if (!client || !user) {
        setError("Tu dois être connecté pour déclarer un paiement.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: queryError } = await client
        .from("contribution_dues")
        .select(
          "id, period_start, period_end, amount_due, due_date, status, contribution_types(name), payment_reports(amount, status)",
        )
        .eq("id", dueId)
        .eq("member_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (queryError || !data) {
        setError("Impossible de charger cette cotisation.");
        setLoading(false);
        return;
      }

      const loadedDue = data as unknown as DueRow;
      const confirmed = loadedDue.payment_reports
        .filter((p) => p.status === "confirmed" || p.status === "approved")
        .reduce((sum, p) => sum + Number(p.amount), 0);

      const remaining = Math.max(0, Number(loadedDue.amount_due) - confirmed);

      setDue(loadedDue);
      setAmount(String(remaining));

      if (loadedDue.payment_reports.some((p) => p.status === "pending")) {
        setError("Une déclaration de paiement est déjà en attente de validation pour cette cotisation.");
      } else if (remaining <= 0) {
        setError("Cette cotisation est déjà entièrement réglée.");
      }

      setLoading(false);
    }

    void loadDue();

    return () => {
      cancelled = true;
    };
  }, [client, user, dueId]);

  const confirmedAmount =
    due?.payment_reports
      .filter((p) => p.status === "confirmed" || p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;

  const remaining = due ? Math.max(0, Number(due.amount_due) - confirmedAmount) : 0;
  const hasPending = Boolean(due?.payment_reports.some((p) => p.status === "pending"));

  async function submitPayment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!client || !user || !due) return;

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0 || numericAmount > remaining) {
      setError("Montant invalide.");
      return;
    }

    setSubmitting(true);

    const { error: insertError } = await client.from("payment_reports").insert({
      due_id: due.id,
      member_id: user.id,
      amount: numericAmount,
      method,
      note: note.trim() || null,
      status: "pending",
    });

    setSubmitting(false);

    if (insertError) {
      console.error("Erreur insertion payment_report:", insertError.message);
      setError("Erreur lors de l'enregistrement de la déclaration : " + insertError.message);
      return;
    }

    setSubmitted(true);
  }

  if (loading) {
    return (
      <AppShell title="Déclaration de paiement" back="/cotisations">
        <Card className="text-center py-10">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
          <p className="mt-3 text-muted-foreground">Chargement...</p>
        </Card>
      </AppShell>
    );
  }

  if (submitted) {
    return (
      <AppShell title="Déclaration enregistrée">
        <Card className="text-center py-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-success" />
          <h2 className="mt-3 text-2xl font-bold">Déclaration transmise</h2>
          <p className="mt-3 text-muted-foreground">
            Votre règlement de {fcfa(Number(amount))} par {methodLabels[method]} a été transmis au trésorier.
          </p>
        </Card>
        <Link
          to="/cotisations"
          className="mt-5 block rounded-2xl bg-primary py-4 text-center font-bold text-primary-foreground"
        >
          Retour à mes cotisations
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell title="Déclaration de paiement" back="/cotisations">
      {due && (
        <Card className="mb-4">
          <p className="text-sm text-muted-foreground">Cotisation</p>
          <h2 className="text-lg font-bold">{due.contribution_types?.name ?? "Cotisation"}</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Reste à régler : <span className="font-bold text-primary text-base">{fcfa(remaining)}</span>
          </p>
        </Card>
      )}

      {error && (
        <Card className="mb-4 bg-destructive/10 border-destructive/20">
          <p className="text-sm text-destructive">{error}</p>
        </Card>
      )}

      {due && !hasPending && remaining > 0 && (
        <form onSubmit={submitPayment} className="space-y-4">
          <Card className="space-y-4">
            <div>
              <label htmlFor="amount" className="block text-xs font-semibold text-muted-foreground mb-1">
                Montant réglé (FCFA)
              </label>
              <input
                id="amount"
                type="number"
                min="1"
                max={remaining}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm"
              />
            </div>

            <div>
              <label htmlFor="method" className="block text-xs font-semibold text-muted-foreground mb-1">
                Moyen de paiement
              </label>
              <select
                id="method"
                value={method}
                onChange={(e) => setMethod(e.target.value as Methode)}
                className="w-full rounded-xl border border-border bg-card p-3 text-sm"
              >
                {Object.entries(methodLabels).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="note" className="block text-xs font-semibold text-muted-foreground mb-1">
                Note (facultatif)
              </label>
              <textarea
                id="note"
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Informations pour le trésorier"
                className="w-full rounded-xl border border-border bg-card p-3 text-sm"
              />
            </div>
          </Card>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-primary py-4 font-bold text-primary-foreground shadow disabled:opacity-50"
          >
            {submitting ? "Envoi en cours..." : "Confirmer la déclaration"}
          </button>
        </form>
      )}
    </AppShell>
  );
}
