import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, IdCard, CalendarDays, Headphones, Shield, CheckCircle2, Clock, Sparkles, Megaphone } from "lucide-react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { member } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import { fcfa } from "@/lib/mock";

export const Route = createFileRoute("/accueil")({
  head: () => meta("Tableau de bord", "Votre résumé : cotisations du mois, prochaine activité et dernières annonces."),
  component: Accueil,
});

interface EventItem {
  id: string;
  title: string;
  date_time: string;
  location: string;
  event_attendances?: {
    id: string;
    member_id: string;
    status: string;
  }[];
}

interface AnnonceItem {
  id: string;
  title: string;
  created_at: string;
}

function Accueil() {
  const { profile, user, client } = useAuth();
  const [memberCount, setMemberCount] = useState<number | null>(null);
  const [memberCountLoading, setMemberCountLoading] = useState(true);

  const [remainingDue, setRemainingDue] = useState<number | null>(null);
  const [nextEvent, setNextEvent] = useState<EventItem | null>(null);
  const [annoncesList, setAnnoncesList] = useState<AnnonceItem[]>([]);
  const [isAttending, setIsAttending] = useState(false);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboardData() {
      if (!client) {
        setMemberCountLoading(false);
        return;
      }

      // 1. Nombre de membres
      const { data: countData, error: countErr } = await client.rpc("get_member_count");
      if (!cancelled) {
        if (!countErr && countData !== null) {
          setMemberCount(Number(countData));
        } else {
          setMemberCount(null);
        }
        setMemberCountLoading(false);
      }

      // 2. Cotisations restantes
      if (user) {
        const { data: duesData } = await client
          .from("contribution_dues")
          .select("amount_due, payment_reports(amount, status)")
          .eq("member_id", user.id)
          .eq("status", "open");

        if (!cancelled && duesData) {
          let total = 0;
          for (const due of duesData) {
            const confirmed = (due.payment_reports || [])
              .filter((p: any) => p.status === "confirmed" || p.status === "approved")
              .reduce((sum: number, p: any) => sum + Number(p.amount), 0);
            const remaining = Math.max(0, Number(due.amount_due) - confirmed);
            total += remaining;
          }
          setRemainingDue(total);
        }
      }

      // 3. Prochaine activité
      const now = new Date().toISOString();
      const { data: eventData } = await client
        .from("events")
        .select("id, title, date_time, location, event_attendances(id, member_id, status)")
        .gte("date_time", now)
        .order("date_time", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!cancelled && eventData) {
        const loadedEvent = eventData as unknown as EventItem;
        setNextEvent(loadedEvent);

        if (user) {
          const myAttendance = loadedEvent.event_attendances?.find(
            (a) => a.member_id === user.id && a.status === "present"
          );
          setIsAttending(Boolean(myAttendance));
        }
      }

      // 4. Annonces
      const { data: annData, error: annError } = await client
        .from("annonces")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(2);

      if (!cancelled) {
        if (!annError && annData && annData.length > 0) {
          const formattedAnnonces = annData.map((a: any) => ({
            id: String(a.id),
            title: a.title || a.titre || a.content || "Annonce",
            created_at: a.created_at || a.date || new Date().toISOString(),
          }));
          setAnnoncesList(formattedAnnonces);
        } else {
          setAnnoncesList([]);
        }
      }
    }

    void loadDashboardData();

    return () => {
      cancelled = true;
    };
  }, [client, user]);

  // Logique Compte à Rebours
  useEffect(() => {
    if (!nextEvent?.date_time) {
      setTimeLeft(null);
      return;
    }

    const targetDate = new Date(nextEvent.date_time).getTime();

    const updateCountdown = () => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [nextEvent]);

  async function toggleAttendance(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!client || !user || !nextEvent || attendanceBusy) return;

    setAttendanceBusy(true);

    if (isAttending) {
      await client
        .from("event_attendances")
        .delete()
        .eq("event_id", nextEvent.id)
        .eq("member_id", user.id);
      setIsAttending(false);
    } else {
      await client
        .from("event_attendances")
        .upsert(
          {
            event_id: nextEvent.id,
            member_id: user.id,
            status: "present",
          },
          { onConflict: "event_id,member_id" }
        );
      setIsAttending(true);
    }

    setAttendanceBusy(false);
  }

  const displayName = profile?.full_name || user?.user_metadata?.full_name || `${member.prenom} ${member.nom}`;
  const isStaff = profile && ["admin", "manager", "treasurer"].includes(profile.role);

  const raccourcis = [
    { to: "/cotisations", label: "Cotiser", icon: Wallet },
    { to: "/profil", label: "Ma carte", icon: IdCard },
    { to: "/activites", label: "Activités", icon: CalendarDays },
    { to: "/annonces", label: "Audios", icon: Headphones },
  ] as const;

  return (
    <AppShell>
      {/* BANNIÈRE HÉRO SUPRÊME */}
      <section className="bg-hero pattern -mx-5 rounded-b-[2.5rem] px-6 pb-8 pt-10 text-primary-foreground shadow-2xl relative overflow-hidden">
        {/* Reflet doré décoratif en arrière-plan */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-gold/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between relative z-10">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-85 font-medium text-gold-foreground/80">
              Assalamou alaykoum
            </p>
            <h1 className="text-2xl font-bold tracking-tight mt-0.5">{displayName}</h1>
            <span className="bg-gold-grad mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold-foreground shadow-sm">
              <Sparkles className="h-3 w-3" />
              {profile?.status === "suspended"
                ? "Compte suspendu"
                : profile?.role === "admin"
                ? "Administrateur"
                : profile?.role === "manager"
                ? "Responsable"
                : profile?.role === "treasurer"
                ? "Trésorier"
                : "Membre actif"}
            </span>
          </div>

          {isStaff && (
            <Link
              to="/admin"
              aria-label="Administration"
              className="grid h-12 w-12 place-items-center rounded-2xl bg-primary-foreground/15 border border-primary-foreground/20 backdrop-blur-md hover:bg-primary-foreground/25 transition"
            >
              <Shield className="h-6 w-6 text-gold" />
            </Link>
          )}
        </div>

        {/* CARTE COTISATION EN ATTENTE */}
        <div className="mt-6 rounded-2xl bg-primary-foreground/10 border border-primary-foreground/15 backdrop-blur-md p-4 relative z-10 shadow-inner">
          <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Cotisations en attente</p>
          {remainingDue === null ? (
            <p className="text-lg font-bold mt-1">Chargement...</p>
          ) : remainingDue > 0 ? (
            <>
              <p className="text-3xl font-extrabold text-gold tracking-tight mt-1">{fcfa(remainingDue)}</p>
              <p className="mt-1 text-xs opacity-85">Montant total à déclarer ou à régler.</p>
            </>
          ) : (
            <>
              <p className="text-lg font-bold text-emerald-300 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="h-5 w-5" /> Vous êtes à jour !
              </p>
              <p className="mt-0.5 text-xs opacity-80">Aucune cotisation en souffrance actuellement.</p>
            </>
          )}
        </div>
      </section>

      {/* RACCOURCIS RAPIDES DÉCORÉS */}
      <div className="mt-6 grid grid-cols-4 gap-3 px-1">
        {raccourcis.map(({ to, label, icon: Icon }) => (
          <Link
            key={label}
            to={to}
            className="flex flex-col items-center gap-2 text-xs font-bold text-foreground hover:scale-105 transition transform"
          >
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-card border border-border shadow-card text-primary hover:border-gold/50 transition">
              <Icon className="h-6 w-6 text-primary" />
            </span>
            {label}
          </Link>
        ))}
      </div>

      {/* PROCHAINE ACTIVITÉ */}
      <div className="mt-8 px-1">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight">Prochaine activité</h2>
          <Link to="/activites" className="text-xs font-bold text-primary hover:underline">
            Voir tout →
          </Link>
        </div>

        {nextEvent ? (
          <Card className="border-l-4 border-l-gold shadow-card space-y-3 p-4 bg-card rounded-2xl">
            <Link to="/activites" className="block space-y-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gold/15 text-gold-foreground border border-gold/30">
                📅 {new Date(nextEvent.date_time).toLocaleString("fr-FR")}
              </span>
              <p className="text-base font-bold text-foreground pt-1">{nextEvent.title}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1">📍 {nextEvent.location}</p>
            </Link>

            <button
              onClick={toggleAttendance}
              disabled={attendanceBusy}
              className={`w-full rounded-xl py-2.5 text-xs font-bold transition shadow-sm disabled:opacity-50 ${
                isAttending
                  ? "bg-emerald-500/15 text-emerald-700 border border-emerald-500/30 dark:text-emerald-400"
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              }`}
            >
              {attendanceBusy ? (
                "Mise à jour..."
              ) : isAttending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" /> Présence confirmée (Annuler)
                </span>
              ) : (
                "Je serai présent"
              )}
            </button>
          </Card>
        ) : (
          <Card className="border-l-4 border-l-gold shadow-card p-4 rounded-2xl">
            <p className="text-muted-foreground text-xs">Aucune activité programmée pour le moment.</p>
          </Card>
        )}
      </div>

      {/* CARTE STATISTIQUE & COMPTE À REBOURS */}
      <div className="mt-4 grid grid-cols-2 gap-3 px-1">
        <Card className="shadow-card p-4 rounded-2xl bg-card border border-border">
          <p className="text-3xl font-extrabold text-primary">{memberCountLoading ? "…" : memberCount ?? "—"}</p>
          <p className="text-xs font-medium text-muted-foreground mt-0.5">Membres de la Dahira</p>
        </Card>

        <Card className="shadow-card p-4 rounded-2xl bg-card border border-border flex flex-col justify-center">
          {timeLeft ? (
            <>
              <p className="text-lg font-bold text-primary font-mono tracking-tight">
                {timeLeft.days > 0 && `${timeLeft.days}j `}
                {String(timeLeft.hours).padStart(2, "0")}h {String(timeLeft.minutes).padStart(2, "0")}m {String(timeLeft.seconds).padStart(2, "0")}s
              </p>
              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3.5 w-3.5 text-gold" /> Temps restant
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-muted-foreground">Aucun décompte</p>
              <p className="text-xs text-muted-foreground">Compte à rebours</p>
            </>
          )}
        </Card>
      </div>

      {/* DERNÈRES ANNONCES */}
      <div className="mt-8 px-1 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold tracking-tight flex items-center gap-1.5">
            <Megaphone className="h-5 w-5 text-primary" /> Dernières annonces
          </h2>
        </div>

        <div className="space-y-3">
          {annoncesList.length === 0 ? (
            <Card className="shadow-card p-4 rounded-2xl text-center">
              <p className="text-xs text-muted-foreground">Aucune annonce publiée récemment.</p>
            </Card>
          ) : (
            annoncesList.map((a) => (
              <Card key={a.id} className="shadow-card p-4 rounded-2xl border-l-2 border-l-primary hover:border-l-gold transition">
                <p className="font-bold text-sm text-foreground">{a.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  {isNaN(new Date(a.created_at).getTime())
                    ? a.created_at
                    : new Date(a.created_at).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                </p>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}
