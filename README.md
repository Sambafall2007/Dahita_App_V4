# Dahira App

Application mobile-first de gestion d'une dahira construite avec React, TypeScript, TanStack Start et Tailwind CSS.

## Mise en route locale

1. Installez Bun si ce n'est pas déjà fait : https://bun.sh
2. Installez les dépendances : `bun install` (cela met aussi à jour `bun.lock` pour la nouvelle dépendance Supabase).
3. Créez un projet Supabase : https://supabase.com/dashboard
4. Copiez `.env.example` vers `.env` puis renseignez `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY` depuis les paramètres API de votre projet Supabase.
5. Dans Supabase > SQL Editor, exécutez le fichier `supabase/migrations/202610090001_profiles_auth_rls.sql` en entier. Vous pouvez aussi utiliser Supabase CLI et `supabase db push` si le projet est initialisé avec la CLI.
6. Dans Supabase > Authentication > URL Configuration, configurez l'URL locale `http://localhost:3000` et l'URL de redirection de production. Ajustez le port selon celui affiché par le serveur de développement.
7. Lancez `bun run dev`.

## Premier administrateur

1. Créez un compte depuis l'application et confirmez l'adresse e-mail si la confirmation est activée dans Supabase.
2. Dans Supabase > Authentication > Users, copiez l'UUID de ce compte.
3. Dans SQL Editor, exécutez en remplaçant l'UUID :

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-DU-COMPTE-VERIFIE';
```

Ne permettez jamais à un utilisateur de choisir son rôle administrateur depuis le formulaire d'inscription. Les nouveaux comptes reçoivent le rôle `member` via un trigger côté base de données. Les fonctions RPC qui changent les rôles et statuts vérifient elles-mêmes le rôle administrateur. Ne placez jamais une clé `service_role` dans le navigateur ni dans une variable `VITE_*`.

## Ce qui est connecté dans cette version

- Inscription par e-mail, connexion, session persistante, réinitialisation du mot de passe et déconnexion via Supabase Auth.
- Création automatique d'un profil membre à l'inscription, avec numéro de carte généré côté base de données.
- Profil personnel chargé depuis PostgreSQL.
- Liste des membres chargée depuis PostgreSQL pour les rôles autorisés.
- Les administrateurs peuvent modifier le rôle ou suspendre/réactiver un autre membre via des fonctions RPC protégées.
- RLS activé sur `public.profiles` : un membre ne peut consulter/modifier que son profil, tandis que les rôles autorisés peuvent consulter les profils nécessaires à leurs fonctions.

## Limites à traiter ensuite

Les cotisations, annonces, activités et finances utilisent encore certaines données de démonstration dans `src/lib/mock.ts`. Les paiements Wave/Orange Money ne sont pas connectés. Avant une utilisation réelle, ajouter les tables et politiques RLS propres à ces modules, tests automatisés d'autorisations, sauvegardes, journal d'audit et tests de déploiement.
