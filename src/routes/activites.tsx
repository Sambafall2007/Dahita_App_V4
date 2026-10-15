import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Calendar, MapPin, Loader2, CheckCircle2 } from "lucide-react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/activites")({
  head: () => meta("Activités", "Consultez les événements de la dahira et confirmez votre présence."),
  component: ActivitesRoute,
});

interface EventItem {
  id: string;
  title: string;
  description: string | null;
  date_time: string;
  location: string;
  event_attendances?: {
    id: string;
    member_id: string;
    status: string;
  }[];
}

function ActivitesRoute() {
  const { client, user } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);

  async function loadEvents() {
    if (!client) return;
    setLoading(true);
    setError(null);

    const { data, error: queryError } = await client
      .from("events")
      .select("id, title, description, date_time, location, event_attendances(id, member_id, status)")
      .order("date_time", { ascending: true });

    if (queryError) {
      setError("Impossible de charger les activités.");
      console.error(queryError.message);
    } else if (data) {
      setEvents(data as unknown as EventItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    void loadEvents();
  }, [client]);

  async function handleToggleAttendance(eventId: string, isCurrentlyPresent: boolean) {
    if (!client || !user) return;
    setBusyEventId(eventId);

    if (isCurrentlyPresent) {
      await client
        .from("event_attendances")
        .delete()
        .eq("event_id", eventId)
        .eq("member_id", user.id);
    } else {
      await client
        .from("event_attendances")
        .upsert({
          event_id: eventId,
          member_id: user.id,
          status: "present",
        }, { onConflict: "event_id,member_id" });
    }

    setBusyEventId(null);
    await loadEvents();
  }

  return (
    <AppShell title="Activités & Événements" back="/accueil">
      <div className="space-y-4">
        <Card className="bg-primary/5 border-primary/20">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-primary" />
            <div>
              <h2 className="font-bold text-primary">Agenda de la Dahira</h2>
              <p className="text-xs text-muted-foreground">
                Confirmez votre présence aux différents événements pour aider le bureau dans l'organisation.
              </p>
            </div>
          </div>
        </Card>

        {loading && (
          <div className="py-10 text-center">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">Chargement des activités...</p>
          </div>
        )}

        {error && (
          <Card className="bg-destructive/10 border-destructive/20">
            <p className="text-sm text-destructive">{error}</p>
          </Card>
        )}

        {!loading && !error && events.length === 0 && (
          <Card className="text-center py-8">
            <p className="font-semibold">Aucune activité programmée</p>
            <p className="text-xs text-muted-foreground mt-1">Revenez un peu plus tard.</p>
          </Card>
        )}

        {!loading && events.map((evt) => {
          const myAttendance = evt.event_attendances?.find(
            (a) => a.member_id === user?.id && a.status === "present"
          );
          const isPresent = Boolean(myAttendance);
          const totalConfirmed = evt.event_attendances?.filter((a) => a.status === "present").length || 0;
          const isBusy = busyEventId === evt.id;

          return (
            <Card key={evt.id} className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-base">{evt.title}</h3>
                  {evt.description && (
                    <p className="text-xs text-muted-foreground mt-1">{evt.description}</p>
                  )}
                </div>
                <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {totalConfirmed} participant{totalConfirmed > 1 ? "s" : ""}
                </span>
              </div>

              <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span>{new Date(evt.date_time).toLocaleString("fr-FR")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>{evt.location}</span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  disabled={isBusy}
                  onClick={() => void handleToggleAttendance(evt.id, isPresent)}
                  className={`w-full rounded-xl py-3 text-sm font-bold shadow transition disabled:opacity-50 ${
                    isPresent
                      ? "bg-success/15 text-success border border-success/30"
                      : "bg-primary text-primary-foreground"
                  }`}
                >
                  {isBusy ? (
                    "Mise à jour..."
                  ) : isPresent ? (
                    <span className="flex items-center justify-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Présence confirmée (Cliquer pour annuler)
                    </span>
                  ) : (
                    "Je serai présent"
                  )}
                </button>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
