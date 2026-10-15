import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { fcfa } from "@/lib/mock";
import { RequireRole } from "@/components/RequireAuth";
import { useAuth, type MemberProfile } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  head: () => meta("Administration", "Gestion des membres, finances et événements de la dahira."),
  component: Admin,
});

const tabs = ["Finances", "Activités", "Membres", "Paramètres"] as const;

interface ContributionType {
  id: string;
  name: string;
  amount: number;
  frequency: string;
  is_active: boolean;
}

interface ContributionDueRow {
  id: string;
  amount_due: number;
  due_date: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string } | null;
  contribution_types?: { name: string } | null;
}

interface PaymentReportWithDetails {
  id: string;
  due_id: string;
  amount: number;
  method: string;
  status: string;
  created_at: string;
  profiles?: { full_name: string } | null;
  contribution_dues?: { id: string; period_start: string; period_end: string; contribution_types?: { name: string } | null } | null;
}

interface EventWithAttendances {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string;
  event_attendances?: {
    id: string;
    status: string;
    profiles?: { full_name: string; phone: string; section: string } | null;
  }[];
}

function Admin() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Finances");
  const { client, profile: currentProfile } = useAuth();
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);

  // Finance states
  const [contributionTypes, setContributionTypes] = useState<ContributionType[]>([]);
  const [contributionDues, setContributionDues] = useState<ContributionDueRow[]>([]);
  const [paymentReports, setPaymentReports] = useState<PaymentReportWithDetails[]>([]);
  const [financesLoading, setFinancesLoading] = useState(false);
  const [financesError, setFinancesError] = useState("");
  const [financesSuccess, setFinancesSuccess] = useState("");

  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [targetScope, setTargetScope] = useState<"all" | "single">("all");
  const [targetMemberId, setTargetMemberId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [updatingReportId, setUpdatingReportId] = useState<string | null>(null);

  // Events states
  const [eventTitle, setEventTitle] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventsList, setEventsList] = useState<EventWithAttendances[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState("");
  const [eventsSuccess, setEventsSuccess] = useState("");
  const [selectedEventAttendees, setSelectedEventAttendees] = useState<any[] | null>(null);
  const [selectedEventTitle, setSelectedEventTitle] = useState("");

  // Members states
  const [membersLoading, setMembersLoading] = useState(false);
  const [membersError, setMembersError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  async function changeMemberStatus(member: MemberProfile) {
    if (!client || currentProfile?.role !== "admin") return;
    const nextStatus = member.status === "active" ? "suspended" : "active";
    setActionBusy(member.id);
    setActionError("");
    const { error } = await client.rpc("admin_set_member_status", { target_user_id: member.id, new_status: nextStatus });
    if (error) setActionError(error.message);
    else setProfiles((old) => old.map((item) => item.id === member.id ? { ...item, status: nextStatus } : item));
    setActionBusy(null);
  }

  async function changeMemberRole(member: MemberProfile, nextRole: string) {
    if (!client || currentProfile?.role !== "admin") return;
    setActionBusy(member.id);
    setActionError("");
    const { error } = await client.rpc("admin_set_member_role", { target_user_id: member.id, new_role: nextRole });
    if (error) setActionError(error.message);
    else setProfiles((old) => old.map((item) => item.id === member.id ? { ...item, role: nextRole as MemberProfile["role"] } : item));
    setActionBusy(null);
  }

  const loadFinanceData = async () => {
    if (!client) return;
    setFinancesLoading(true);
    setFinancesError("");

    const typesRes = await client.from("contribution_types").select("*").eq("is_active", true);
    if (typesRes.error) {
      setFinancesError("Erreur types de cotisations : " + typesRes.error.message);
      setFinancesLoading(false);
      return;
    }
    if (typesRes.data) {
      setContributionTypes(typesRes.data);
      if (typesRes.data.length > 0 && !selectedTypeId) {
        setSelectedTypeId(typesRes.data[0].id);
        setAmountDue(String(typesRes.data[0].amount));
      }
    }

    const profRes = await client.from("profiles").select("id, full_name, phone, section, role, status, member_number, created_at").eq("status", "active");
    if (profRes.data) {
      setProfiles(profRes.data as MemberProfile[]);
    }

    const duesRes = await client
      .from("contribution_dues")
      .select("id, amount_due, due_date, period_start, period_end, status, created_at, profiles:member_id(full_name), contribution_types(name)")
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (duesRes.error) {
      setFinancesError("Erreur chargement échéances : " + duesRes.error.message);
    } else if (duesRes.data) {
      setContributionDues(duesRes.data as unknown as ContributionDueRow[]);
    }

    const reportsRes = await client
      .from("payment_reports")
      .select("id, due_id, amount, method, status, created_at, profiles:member_id(full_name), contribution_dues(id, period_start, period_end, contribution_types(name))")
      .order("created_at", { ascending: false })
      .limit(20);
    
    if (reportsRes.error) {
      setFinancesError("Erreur chargement paiements : " + reportsRes.error.message);
    } else if (reportsRes.data) {
      setPaymentReports(reportsRes.data as unknown as PaymentReportWithDetails[]);
    }

    setFinancesLoading(false);
  };

  const loadEventsData = async () => {
    if (!client) return;
    setEventsLoading(true);
    setEventsError("");
    const { data, error } = await client
      .from("events")
      .select("*, event_attendances(id, status, profiles(full_name, phone, section))")
      .order("date_time", { ascending: true });

    if (error) {
      setEventsError("Erreur chargement événements : " + error.message);
    } else if (data) {
      setEventsList(data as unknown as EventWithAttendances[]);
    }
    setEventsLoading(false);
  };

  useEffect(() => {
    if (tab === "Finances" && client) void loadFinanceData();
    if (tab === "Activités" && client) void loadEventsData();
  }, [tab, client]);

  function handleTypeChange(typeId: string) {
    setSelectedTypeId(typeId);
    const found = contributionTypes.find((t) => t.id === typeId);
    if (found) {
      setAmountDue(String(found.amount));
    }
  }

  async function handleCreateDues(e: React.FormEvent) {
    e.preventDefault();
    if (!client) return;
    setFinancesError("");
    setFinancesSuccess("");

    if (!selectedTypeId || !amountDue || !periodStart || !periodEnd || !dueDate) {
      setFinancesError("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setIsSubmitting(true);

    try {
      const targetProfiles = targetScope === "all" 
        ? profiles.filter((p) => p.status === "active")
        : profiles.filter((p) => p.id === targetMemberId);

      if (targetProfiles.length === 0) {
        setFinancesError("Aucun membre actif trouvé.");
        setIsSubmitting(false);
        return;
      }

      const duesToInsert = targetProfiles.map((member) => ({
        member_id: member.id,
        contribution_type_id: selectedTypeId,
        period_start: periodStart,
        period_end: periodEnd,
        amount_due: parseFloat(amountDue),
        due_date: dueDate,
        status: "open"
      }));

      const { error } = await client.from("contribution_dues").insert(duesToInsert);

      if (error) {
        setFinancesError("Erreur lors de la création : " + error.message);
      } else {
        setFinancesSuccess(`Succès : ${duesToInsert.length} échéance(s) créée(s).`);
        setPeriodStart("");
        setPeriodEnd("");
        setDueDate("");
        void loadFinanceData();
      }
    } catch (err: any) {
      setFinancesError("Erreur : " + (err.message || err));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleUpdatePaymentStatus(reportId: string, dueId: string, newStatus: "confirmed" | "rejected") {
    if (!client) return;
    setUpdatingReportId(reportId);
    setFinancesError("");
    setFinancesSuccess("");

    const { error: updateReportError } = await client
      .from("payment_reports")
      .update({ status: newStatus })
      .eq("id", reportId);

    if (updateReportError) {
      setFinancesError("Erreur lors de la mise à jour du paiement : " + updateReportError.message);
      setUpdatingReportId(null);
      return;
    }

    if (newStatus === "confirmed") {
      const { error: updateDueError } = await client
        .from("contribution_dues")
        .update({ status: "paid" })
        .eq("id", dueId);

      if (updateDueError) {
        console.error("Erreur mise à jour échéance :", updateDueError.message);
      }
    }

    setPaymentReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
    );

    setFinancesSuccess(newStatus === "confirmed" ? "Paiement confirmé avec succès !" : "Paiement rejeté.");
    setUpdatingReportId(null);
    await loadFinanceData();
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    if (!client || !eventTitle || !eventDate || !eventTime || !eventLocation) return;

    setEventsError("");
    setEventsSuccess("");
    const dateTime = new Date(`${eventDate}T${eventTime}:00`).toISOString();

    const { error } = await client.from("events").insert({
      title: eventTitle,
      location: eventLocation,
      description: eventDescription || null,
      date_time: dateTime,
    });

    if (error) {
      setEventsError("Erreur lors de la création de l'événement : " + error.message);
    } else {
      setEventsSuccess("Activité publiée avec succès !");
      setEventTitle("");
      setEventDate("");
      setEventTime("");
      setEventLocation("");
      setEventDescription("");
      await loadEventsData();
    }
  }

  useEffect(() => {
    if (tab !== "Membres" || !client) return;
    let active = true;
    setMembersLoading(true);
    setMembersError("");
    void client.from("profiles")
      .select("id, full_name, phone, section, role, status, member_number, created_at")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setMembersError("Impossible de charger les membres : " + error.message);
        else setProfiles((data ?? []) as MemberProfile[]);
        setMembersLoading(false);
      });
    return () => { active = false; };
  }, [tab, client]);

  return (
    <RequireRole roles={["admin", "manager", "treasurer"]}>
      <AppShell title="Administration" back="/accueil">
        <div className="mb-5 grid grid-cols-4 rounded-2xl bg-muted p-1">
          {tabs.map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`rounded-xl py-2.5 text-xs font-semibold ${tab === t ? "bg-card text-primary shadow-card" : "text-muted-foreground"}`}>{t}</button>
          ))}
        </div>

        {tab === "Finances" && (
          <div className="space-y-5">
            {financesLoading && <p className="text-sm text-muted-foreground">Chargement des données financières...</p>}
            {financesError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{financesError}</p>}
            {financesSuccess && <p className="rounded-xl bg-success/15 p-3 text-sm text-success">{financesSuccess}</p>}

            <Card className="space-y-4">
              <h3 className="font-bold text-primary">Créer une nouvelle cotisation (Échéances)</h3>
              <form onSubmit={handleCreateDues} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Type de cotisation</label>
                  <select 
                    value={selectedTypeId} 
                    onChange={(e) => handleTypeChange(e.target.value)} 
                    className="w-full rounded-xl border bg-card p-2.5 text-sm"
                  >
                    {contributionTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} ({fcfa(t.amount)} - {t.frequency})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Montant par membre (FCFA)</label>
                    <input 
                      type="number" 
                      value={amountDue} 
                      onChange={(e) => setAmountDue(e.target.value)} 
                      className="w-full rounded-xl border bg-card p-2.5 text-sm"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Date limite (Due Date)</label>
                    <input 
                      type="date" 
                      value={dueDate} 
                      onChange={(e) => setDueDate(e.target.value)} 
                      className="w-full rounded-xl border bg-card p-2.5 text-sm"
                      required 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Début de période</label>
                    <input 
                      type="date" 
                      value={periodStart} 
                      onChange={(e) => setPeriodStart(e.target.value)} 
                      className="w-full rounded-xl border bg-card p-2.5 text-sm"
                      required 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Fin de période</label>
                    <input 
                      type="date" 
                      value={periodEnd} 
                      onChange={(e) => setPeriodEnd(e.target.value)} 
                      className="w-full rounded-xl border bg-card p-2.5 text-sm"
                      required 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Membres cibles</label>
                  <select 
                    value={targetScope} 
                    onChange={(e) => setTargetScope(e.target.value as "all" | "single")} 
                    className="w-full rounded-xl border bg-card p-2.5 text-sm"
                  >
                    <option value="all">Tous les membres actifs ({profiles.length} membres)</option>
                    <option value="single">Un seul membre spécifique</option>
                  </select>
                </div>

                {targetScope === "single" && (
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Choisir le membre</label>
                    <select 
                      value={targetMemberId} 
                      onChange={(e) => setTargetMemberId(e.target.value)} 
                      className="w-full rounded-xl border bg-card p-2.5 text-sm"
                      required={targetScope === "single"}
                    >
                      <option value="">-- Sélectionner un membre --</option>
                      {profiles.map((p) => (
                        <option key={p.id} value={p.id}>{p.full_name} ({p.member_number || "Sans n°"})</option>
                      ))}
                    </select>
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="w-full rounded-xl bg-primary py-3 font-bold text-primary-foreground disabled:opacity-50"
                >
                  {isSubmitting ? "Création en cours..." : "Générer les échéances de cotisation"}
                </button>
              </form>
            </Card>

            <Card className="space-y-3">
              <h3 className="font-bold text-primary">Dernières échéances de cotisations générées</h3>
              {contributionDues.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune échéance générée pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {contributionDues.map((due) => (
                    <div key={due.id} className="flex items-center justify-between border-b pb-2 text-sm last:border-0">
                      <div>
                        <p className="font-semibold">{due.profiles?.full_name || "Membre inconnu"}</p>
                        <p className="text-xs text-muted-foreground">
                          {due.contribution_types?.name || "Cotisation"} · {fcfa(due.amount_due)} · Échéance : {due.due_date}
                        </p>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        due.status === "open" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
                      }`}>
                        {due.status === "open" ? "En attente" : due.status === "paid" ? "Payée" : due.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <h3 className="font-bold text-primary">Suivi des paiements récents</h3>
              {paymentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucun paiement déclaré pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {paymentReports.map((report) => (
                    <div key={report.id} className="flex flex-col gap-2 border-b pb-3 text-sm last:border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{report.profiles?.full_name || "Membre inconnu"}</p>
                          <p className="text-xs text-muted-foreground">
                            {report.contribution_dues?.contribution_types?.name || "Cotisation"} · {fcfa(report.amount)} · via <span className="font-semibold uppercase">{report.method}</span>
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          report.status === "confirmed" ? "bg-success/15 text-success" :
                          report.status === "rejected" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"
                        }`}>
                          {report.status === "confirmed" ? "Validé" : report.status === "rejected" ? "Rejeté" : "En attente"}
                        </span>
                      </div>

                      {report.status === "pending" && (
                        <div className="flex gap-2 pt-1">
                          <button
                            disabled={updatingReportId === report.id}
                            onClick={() => void handleUpdatePaymentStatus(report.id, report.due_id, "confirmed")}
                            className="rounded-lg bg-success px-3 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            {updatingReportId === report.id ? "Validation..." : "Valider le paiement"}
                          </button>
                          <button
                            disabled={updatingReportId === report.id}
                            onClick={() => void handleUpdatePaymentStatus(report.id, report.due_id, "rejected")}
                            className="rounded-lg bg-destructive px-3 py-1 text-xs font-bold text-white hover:opacity-90 disabled:opacity-50"
                          >
                            Rejeter
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        )}

        {tab === "Activités" && (
          <div className="space-y-5">
            {eventsLoading && <p className="text-sm text-muted-foreground">Chargement des événements...</p>}
            {eventsError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{eventsError}</p>}
            {eventsSuccess && <p className="rounded-xl bg-success/15 p-3 text-sm text-success">{eventsSuccess}</p>}

            <Card className="space-y-4">
              <h3 className="font-bold text-primary">Créer une nouvelle activité</h3>
              <form onSubmit={handleCreateEvent} className="space-y-3">
                <input 
                  type="text" 
                  placeholder="Titre de l'événement (ex: Journée de Dahira)" 
                  value={eventTitle} 
                  onChange={(e) => setEventTitle(e.target.value)} 
                  className="w-full rounded-xl border bg-card p-2.5 text-sm" 
                  required 
                />
                <div className="grid grid-cols-2 gap-2">
                  <input 
                    type="date" 
                    value={eventDate} 
                    onChange={(e) => setEventDate(e.target.value)} 
                    className="w-full rounded-xl border bg-card p-2.5 text-sm" 
                    required 
                  />
                  <input 
                    type="time" 
                    value={eventTime} 
                    onChange={(e) => setEventTime(e.target.value)} 
                    className="w-full rounded-xl border bg-card p-2.5 text-sm" 
                    required 
                  />
                </div>
                <input 
                  type="text" 
                  placeholder="Lieu (ex: Keur Serigne Touba, Médina)" 
                  value={eventLocation} 
                  onChange={(e) => setEventLocation(e.target.value)} 
                  className="w-full rounded-xl border bg-card p-2.5 text-sm" 
                  required 
                />
                <textarea 
                  placeholder="Description ou programme (facultatif)" 
                  value={eventDescription} 
                  onChange={(e) => setEventDescription(e.target.value)} 
                  className="w-full rounded-xl border bg-card p-2.5 text-sm" 
                  rows={2} 
                />
                <button type="submit" className="w-full rounded-xl bg-primary py-3 font-bold text-white shadow">
                  Publier l'événement
                </button>
              </form>
            </Card>

            <Card className="space-y-3">
              <h3 className="font-bold text-primary">Activités prévues & Suivi des présences</h3>
              {eventsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">Aucune activité enregistrée.</p>
              ) : (
                eventsList.map((evt) => {
                  const confirms = evt.event_attendances?.filter((a) => a.status === "present") || [];
                  return (
                    <div key={evt.id} className="border-b pb-3 last:border-0 pt-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-base">{evt.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(evt.date_time).toLocaleString("fr-FR")} · {evt.location}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-primary">
                            {confirms.length} membre(s) confirmé(s)
                          </p>
                        </div>
                        <button 
                          onClick={() => {
                            setSelectedEventAttendees(confirms);
                            setSelectedEventTitle(evt.title);
                          }} 
                          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                        >
                          Voir la liste
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </Card>

            {selectedEventAttendees && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                <Card className="max-h-[80vh] w-full max-w-md overflow-y-auto space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h3 className="font-bold text-base">{selectedEventTitle} ({selectedEventAttendees.length} présents)</h3>
                    <button onClick={() => setSelectedEventAttendees(null)} className="text-sm font-bold">✕</button>
                  </div>
                  {selectedEventAttendees.length === 0 ? (
                    <p className="py-4 text-center text-sm text-muted-foreground">Aucun membre n'a encore confirmé sa présence.</p>
                  ) : (
                    selectedEventAttendees.map((att) => (
                      <div key={att.id} className="border-b pb-2 last:border-0 text-sm">
                        <p className="font-semibold">{att.profiles?.full_name || "Membre"}</p>
                        <p className="text-xs text-muted-foreground">
                          {att.profiles?.section || "Sans section"} · {att.profiles?.phone || "Sans tél"}
                        </p>
                      </div>
                    ))
                  )}
                </Card>
              </div>
            )}
          </div>
        )}

        {tab === "Membres" && (
          <div className="space-y-3">
            {currentProfile?.role === "admin" && <p className="text-xs text-muted-foreground">Les modifications de rôle et de statut sont réservées aux administrateurs et contrôlées par la base de données.</p>}
            {actionError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{actionError}</p>}
            {membersLoading && <p className="text-sm text-muted-foreground">Chargement des membres…</p>}
            {membersError && <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{membersError}</p>}
            {!membersLoading && !membersError && profiles.length === 0 && <Card>Aucun membre trouvé.</Card>}
            {profiles.map((m) => {
              const roles: Record<string, string> = { member: "Membre", treasurer: "Trésorier", manager: "Responsable", admin: "Administrateur" };
              return <Card key={m.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0"><p className="truncate font-bold">{m.full_name}</p><p className="text-sm text-muted-foreground">{roles[m.role] || m.role} · {m.phone || "Téléphone absent"}</p><p className="text-xs text-muted-foreground">{m.section || "Sans section"} · {m.member_number || "Sans carte"}</p></div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${m.status === "active" ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>{m.status === "active" ? "Actif" : "Suspendu"}</span>
                  {currentProfile?.role === "admin" && m.id !== currentProfile.id && <>
                    <select aria-label={`Rôle de ${m.full_name}`} value={m.role} disabled={actionBusy === m.id} onChange={(e) => void changeMemberRole(m, e.target.value)} className="max-w-32 rounded-lg border bg-card p-1 text-xs">
                      <option value="member">Membre</option><option value="treasurer">Trésorier</option><option value="manager">Responsable</option><option value="admin">Administrateur</option>
                    </select>
                    <button disabled={actionBusy === m.id} onClick={() => void changeMemberStatus(m)} className="text-xs font-semibold text-destructive disabled:opacity-50">{actionBusy === m.id ? "En cours…" : m.status === "active" ? "Suspendre" : "Réactiver"}</button>
                  </>}
                </div>
              </Card>;
            })}
          </div>
        )}

        {tab === "Paramètres" && (
          <Card className="space-y-4">
            {[["Cotisation du vendredi", "1 000 FCFA"], ["Cotisation sociale", "5 000 FCFA / mois"], ["Paiements partiels", "Autorisés"], ["Inscription", "Libre"], ["Langue", "Français"]].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b pb-3 last:border-0 last:pb-0"><span>{k}</span><span className="font-semibold text-primary">{v}</span></div>
            ))}
          </Card>
        )}
      </AppShell>
    </RequireRole>
  );
}
