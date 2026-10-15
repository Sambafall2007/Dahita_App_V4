export const member = {
  prenom: "Moussa",
  nom: "Diop",
  telephone: "77 123 45 67",
  email: "moussa.diop@exemple.sn",
  section: "Section Médina",
  statut: "Membre actif",
  numeroCarte: "DA-2026-0147",
  depuis: "Mars 2021",
};

export const stats = { membres: 312, cartes: 287 };

export type Statut = "payé" | "en attente" | "à payer" | "échoué";

export const cotisations = [
  { id: "c1", type: "Cotisation du vendredi", montant: 1000, periode: "Vendredi 9 oct.", echeance: "09/10/2026", statut: "à payer" as Statut },
  { id: "c2", type: "Cotisation sociale mensuelle", montant: 5000, periode: "Octobre 2026", echeance: "31/10/2026", statut: "en attente" as Statut },
  { id: "c3", type: "Contribution Magal", montant: 10000, periode: "Événement", echeance: "15/11/2026", statut: "à payer" as Statut },
];

export const historique = [
  { ref: "RC-24581", date: "02/10/2026", type: "Cotisation du vendredi", montant: 1000, mode: "Wave", statut: "payé" as Statut },
  { ref: "RC-24410", date: "30/09/2026", type: "Cotisation sociale mensuelle", montant: 5000, mode: "Orange Money", statut: "payé" as Statut },
  { ref: "RC-24302", date: "25/09/2026", type: "Cotisation du vendredi", montant: 1000, mode: "Espèces", statut: "payé" as Statut },
  { ref: "RC-24190", date: "18/09/2026", type: "Cotisation du vendredi", montant: 1000, mode: "Wave", statut: "échoué" as Statut },
];

export const activites = [
  { id: "a1", titre: "Journée de dahira", date: "Dim. 11 oct.", heure: "16h00", lieu: "Keur Serigne, Médina", responsable: "Serigne Fall", description: "Récital de khassaides, causerie et repas partagé. Merci d'arriver 15 minutes avant.", aVenir: true },
  { id: "a2", titre: "Préparatifs du Magal", date: "Sam. 24 oct.", heure: "10h00", lieu: "Siège de la dahira", responsable: "Awa Ndiaye", description: "Réunion d'organisation : logistique, transport et répartition des tâches.", aVenir: true },
  { id: "a3", titre: "Kourel hebdomadaire", date: "Jeu. 1 oct.", heure: "20h30", lieu: "Mosquée du quartier", responsable: "Ibrahima Sarr", description: "Séance de chant religieux.", aVenir: false },
];

export const annonces = [
  { id: "n1", titre: "Ouverture des contributions pour le Magal", date: "Il y a 2 jours", texte: "Les contributions pour le Grand Magal sont ouvertes. Montant suggéré : 10 000 FCFA." },
  { id: "n2", titre: "Nouvelle salle disponible", date: "Il y a 5 jours", texte: "La salle de réunion rénovée peut être réservée auprès du responsable d'activité." },
  { id: "n3", titre: "Rappel cotisation sociale", date: "Il y a 1 semaine", texte: "Pensez à régler la cotisation sociale d'octobre avant la fin du mois." },
];

export const finances = { recettes: 1_845_000, depenses: 1_120_000, periode: "Octobre 2026" };

export const membres = [
  { nom: "Moussa Diop", tel: "77 123 45 67", role: "Membre", statut: "Actif" },
  { nom: "Awa Ndiaye", tel: "76 555 12 90", role: "Responsable d'activité", statut: "Actif" },
  { nom: "Cheikh Ba", tel: "78 402 33 11", role: "Trésorier", statut: "Actif" },
  { nom: "Fatou Sow", tel: "77 908 76 54", role: "Membre", statut: "Suspendu" },
];

export const fcfa = (n: number) => `${n.toLocaleString("fr-FR")} FCFA`;
