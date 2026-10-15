import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Megaphone, Send, Loader2 } from "lucide-react";
import { AppShell, Card, meta } from "@/components/AppShell";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/annonces")({
  head: () =>
    meta(
      "Annonces",
      "Consultez les annonces officielles de la dahira.",
    ),
  component: Annonces,
});

type Announcement = {
  id: string;
  title: string;
  body: string;
  created_at: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function Annonces() {
  const { client, user, profile } = useAuth();

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin =
    profile?.role === "admin" && profile?.status === "active";

  useEffect(() => {
    let cancelled = false;

    async function loadAnnouncements() {
      if (!client || !user) {
        setError("Connecte-toi pour consulter les annonces.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error: queryError } = await client
        .from("announcements")
        .select("id, title, body, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });

      if (cancelled) return;

      if (queryError) {
        console.error(
          "Erreur de chargement des annonces :",
          queryError.message,
        );
        setError(
          "Impossible de charger les annonces. Vérifie la connexion et les permissions Supabase.",
        );
      } else {
        setAnnouncements((data ?? []) as Announcement[]);
      }

      setLoading(false);
    }

    void loadAnnouncements();

    return () => {
      cancelled = true;
    };
  }, [client, user]);

  async function publishAnnouncement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!client || !user || !isAdmin) {
      setError("Seul un administrateur actif peut publier une annonce.");
      return;
    }

    const cleanTitle = title.trim();
    const cleanBody = body.trim();

    if (!cleanTitle || !cleanBody) {
      setError("Remplis le titre et le contenu de l'annonce.");
      return;
    }

    setPublishing(true);

    const { data, error: insertError } = await client
      .from("announcements")
      .insert({
        title: cleanTitle,
        body: cleanBody,
        created_by: user.id,
        is_published: true,
      })
      .select("id, title, body, created_at")
      .single();

    setPublishing(false);

    if (insertError) {
      console.error(
        "Erreur de publication :",
        insertError.message,
      );
      setError(
        "La publication a échoué. Vérifie les permissions Supabase et réessaie.",
      );
      return;
    }

    setAnnouncements((current) => [
      data as Announcement,
      ...current,
    ]);
    setTitle("");
    setBody("");
    setSuccess("L'annonce a été publiée avec succès.");
  }

  return (
    <AppShell title="Annonces">
      {isAdmin && (
        <Card className="mb-5">
          <div className="mb-4 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-bold">Publier une annonce</h2>
          </div>

          <form onSubmit={publishAnnouncement} className="space-y-3">
            <label className="block text-sm font-medium">
              Titre
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                maxLength={150}
                required
                placeholder="Ex. : Réunion de la dahira"
                className="mt-1 w-full rounded-xl border bg-background px-3 py-3"
              />
            </label>

            <label className="block text-sm font-medium">
              Contenu
              <textarea
                value={body}
                onChange={(event) => setBody(event.target.value)}
                maxLength={10000}
                required
                rows={5}
                placeholder="Écris le message à transmettre aux membres..."
                className="mt-1 w-full resize-y rounded-xl border bg-background px-3 py-3"
              />
            </label>

            <button
              type="submit"
              disabled={publishing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-60"
            >
              {publishing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {publishing ? "Publication..." : "Publier"}
            </button>
          </form>
        </Card>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm"
        >
          {error}
        </div>
      )}

      {success && (
        <div
          role="status"
          className="mb-4 rounded-xl border border-success/30 bg-success/10 p-3 text-sm"
        >
          {success}
        </div>
      )}

      <h2 className="mb-3 text-lg font-semibold">
        Annonces officielles
      </h2>

      {loading ? (
        <Card>
          <p className="text-sm text-muted-foreground">
            Chargement des annonces...
          </p>
        </Card>
      ) : announcements.length === 0 && !error ? (
        <Card>
          <Megaphone className="mb-2 h-8 w-8 text-muted-foreground" />
          <p className="font-semibold">Aucune annonce publiée</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Les prochaines communications officielles apparaîtront ici.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <p className="text-sm text-muted-foreground">
                {formatDate(announcement.created_at)}
              </p>
              <h3 className="mt-1 text-lg font-bold">
                {announcement.title}
              </h3>
              <p className="mt-2 whitespace-pre-wrap">
                {announcement.body}
              </p>
            </Card>
          ))}
        </div>
      )}

      <h2 className="mb-3 mt-8 text-xl font-semibold">Audios</h2>
      <Card>
        <p className="font-semibold">Audios bientôt disponibles</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Les enregistrements seront ajoutés lorsqu'un véritable fichier
          audio et son lecteur seront configurés.
        </p>
      </Card>
    </AppShell>
  );
}
