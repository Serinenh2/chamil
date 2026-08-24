# CHAMIL — شـامل

Plateforme bilingue (français / arabe) de gestion des **achats, ventes, stocks,
fournisseurs, clients, documents et paiements**, adaptée aux entreprises
algériennes de bureautique, informatique, réseaux et équipements professionnels.

Le cœur fonctionnel est la chaîne :

```
FOURNISSEUR → ACHAT → RÉCEPTION → STOCK → PRODUIT → VENTE → CLIENT
            → LIVRAISON → FACTURE → PAIEMENT → RENTABILITÉ
```

---

## Sommaire

- [Architecture](#architecture)
- [Démarrage rapide](#démarrage-rapide)
- [Backend](#backend)
- [Frontend](#frontend)
- [Page profil](#page-profil)
- [Design system](#design-system)
- [Bilinguisme et RTL](#bilinguisme-et-rtl)
- [Tâches de fond](#tâches-de-fond)
- [Tests](#tests)
- [Mise en production](#mise-en-production)

---

## Architecture

```
chamil/
├── backend/                 Django 5 + Django REST Framework
│   ├── config/              Réglages, routeur API v1, Celery, WSGI/ASGI
│   ├── apps/
│   │   ├── core/            Modèles de base, numérotation, totaux, permissions
│   │   ├── accounts/        Utilisateurs, rôles, JWT
│   │   ├── company/         Profil dirigeant, entreprise, paramètres (section 39)
│   │   ├── partners/        Fournisseurs, clients, contacts, prospects
│   │   ├── catalog/         Produits, catégories, marques, prix fournisseurs
│   │   ├── stock/           Dépôts, mouvements, numéros de série, garanties
│   │   ├── purchasing/      Demandes, offres, commandes, réceptions
│   │   ├── sales/           Devis, commandes, livraisons
│   │   ├── billing/         Factures clients/fournisseurs, avoirs, règlements
│   │   ├── documents/       Génération PDF bilingue, envoi e-mail
│   │   ├── alerts/          Centre d'alertes (section 30)
│   │   ├── audit/           Journal complet des actions (section 35)
│   │   └── dashboard/       Tableaux de bord achats, ventes, global, rentabilité
│   └── templates/documents/ Modèles PDF (FR / AR / bilingue)
└── frontend/                React 18 + Vite + TailwindCSS
    └── src/
        ├── components/ui/   Bibliothèque de composants du design system
        ├── components/layout/ Barre latérale, barre supérieure, mise en page
        ├── features/        Écrans par domaine métier
        ├── services/api.js  Axios + JWT + rafraîchissement automatique
        ├── hooks/           React Query, formatage montants et dates
        ├── context/         Authentification, thème, langue
        └── i18n/            Dictionnaires fr.json et ar.json
```

**Pile technique**

| Couche | Technologies |
|---|---|
| Backend | Python, Django, Django REST Framework, JWT (SimpleJWT) |
| Tâches de fond | Celery + Redis, Celery Beat |
| Base de données | PostgreSQL (SQLite en développement) |
| Documents | WeasyPrint (support arabe et RTL natif) |
| Frontend | React.js, Vite, Axios, TailwindCSS, React Router, React Query, Recharts |
| i18n | react-i18next (FR / AR), direction RTL dynamique |

---

## Démarrage rapide

### 1. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate          # Windows
# source .venv/bin/activate     # macOS / Linux

pip install -r requirements.txt
copy .env.example .env          # puis ajuster les valeurs

python manage.py migrate
python manage.py seed_demo      # jeu de démonstration complet
python manage.py runserver
```

API disponible sur `http://localhost:8000/api/v1/`,
administration sur `http://localhost:8000/admin/`.

Compte de démonstration : **admin / Chamil2026!** (rôle propriétaire).
Autres comptes : `commercial01`, `acheteur01`, `magasin01`, `compta01`
(même mot de passe, rôles restreints).

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

Interface disponible sur `http://localhost:5173`.
Vite proxifie `/api` vers `http://localhost:8000` — aucune configuration CORS
supplémentaire n'est nécessaire en développement.

### 3. Celery (optionnel en développement)

```bash
cd backend
celery -A config worker -l info
celery -A config beat -l info
```

---

## Backend

### Conventions API

Toutes les routes sont préfixées par `/api/v1/` et exigent un jeton JWT.

| Domaine | Points d'entrée principaux |
|---|---|
| Authentification | `auth/login/`, `auth/refresh/`, `auth/verify/`, `users/logout/` |
| Profil | `profile/owner/me/`, `profile/company/current/`, `profile/settings/current/`, `profile/owner/logins/` |
| Fournisseurs | `suppliers/`, `suppliers/{id}/products/`, `suppliers/{id}/statement/` |
| Clients | `customers/`, `customers/{id}/overview/` (fiche 360°) |
| Produits | `products/`, `products/{id}/compare_suppliers/`, `products/{id}/traceability/` |
| Achats | `purchase-requests/`, `supplier-quotes/comparison/`, `purchase-orders/late/`, `goods-receipts/{id}/apply_stock/` |
| Ventes | `quotes/{id}/to_order/`, `sales-orders/{id}/to_invoice/`, `deliveries/{id}/apply_stock/` |
| Facturation | `customer-invoices/receivables/`, `supplier-invoices/debts/`, `payments/` |
| Stock | `stock-items/alerts/`, `stock-items/valuation/`, `serial-numbers/expiring_warranties/` |
| Tableaux de bord | `dashboard/global/`, `dashboard/purchasing/`, `dashboard/sales/`, `dashboard/trend/`, `dashboard/profitability/` |
| Transverse | `search/?q=`, `alerts/summary/`, `audit-logs/` |
| Documents | `documents/{kind}/{id}/pdf/?lang=fr|ar|both`, `documents/{kind}/{id}/email/` |

Toutes les listes acceptent `?search=`, `?ordering=`, `?page=`, `?page_size=`
ainsi que les filtres déclarés sur chaque vue.

### Règles métier automatiques

- **Numérotation** — `PREFIXE-ANNÉE-COMPTEUR` (`FA-2026-0001`), générée sous
  verrou de transaction, préfixes configurables depuis le profil.
- **Totaux** — chaque ligne calcule HT / TVA / TTC à l'enregistrement ;
  `document.recompute()` agrège les lignes.
- **Stock** — la validation d'une réception crée les mouvements d'entrée, celle
  d'une livraison les mouvements de sortie ; la commande d'origine passe
  automatiquement en « partiel » ou « terminé ».
- **Soldes** — `Total facturé – Total payé` donne la dette fournisseur et la
  créance client ; le statut de facture est recalculé à chaque règlement.
- **Créances** — classement par ancienneté : non échue, 1–30, 31–60, 61–90, +90 jours.
- **Traçabilité** — chaque écriture API est journalisée (utilisateur, action,
  objet, IP, appareil).

### Rôles et permissions

`owner` (tous droits) · `admin` · `sales` · `buyer` · `stock` · `accountant` ·
`tech` · `viewer` (lecture seule).

Les données personnelles du dirigeant ne sont accessibles qu'aux rôles
`owner` et `admin` — les autres reçoivent un **403**.

---

## Frontend

- **Axios** intercepte les 401, rafraîchit le jeton et rejoue la requête ; les
  appels concurrents sont mis en file pendant le rafraîchissement.
- **React Query** gère cache, invalidation et états de chargement.
- **React Router** protège chaque route par authentification et par rôle.
- **Recharts** alimente les graphiques des tableaux de bord.
- La bibliothèque de composants (`src/components/ui/`) couvre boutons, badges
  d'état et d'urgence, cartes KPI, tableaux, onglets, indicateur d'étapes,
  alertes, champs, interrupteurs, états vides et squelettes.

---

## Page profil

Route `/profil` — implémente la section 39 du cahier des charges.

| Onglet | Contenu |
|---|---|
| Profil personnel | État civil, NIN masqué, pièce d'identité, qualité, prise de fonction, part du capital, coordonnées privées, signature numérisée |
| Entreprise | Raison sociale FR/AR, forme juridique, capital, RC, NIF, NIS, article d'imposition, CNAS/CASNOS, siège, banque et RIB, logo, cachet |
| Paramètres commerciaux | Devise, TVA, timbre fiscal, conditions de paiement, plafond de crédit, préfixes de numérotation, mentions légales, langue des documents |
| Sécurité | Mot de passe, 2FA, alerte de connexion inhabituelle, historique des connexions (date, IP, appareil) |
| Journal d'activité | Toutes les actions de l'utilisateur, en lecture seule |

**Confidentialité** — le NIN n'est jamais renvoyé en clair dans les listes
(`masked_nin()`), les données personnelles ne figurent sur aucun document
commercial (seuls le cachet et la signature sont repris), et chaque accès est
journalisé conformément à la loi 18-07.

---

## Design system

Les jetons sont hérités de **MRAFIQ** sans modification ; seule la sémantique
des états devient commerciale.

- **Encre** `#081C33` / `#0B2545` — **Primaire** `#14498F` / `#1B5CB4` / `#2E74D6`
  — **Laiton** `#B08A3C`, réservé à la marque.
- **États** : validé/payé/livré (vert), en attente/partiel (orange),
  impayé/en retard/rupture (rouge), brouillon/annulé (gris), à valider (violet).
- **Urgences** : critique, élevée, moyenne, faible — rectangle plein, jamais
  confondu avec une pastille d'état.
- **Typographie** : IBM Plex Sans (FR), IBM Plex Sans Arabic (AR),
  IBM Plex Mono (montants, codes, références, dates).
- **Fondations** : rayons 6/10/14/999, grille de 8 px, focus visible de 2 px,
  transition `cubic-bezier(.22,.8,.36,1)`.

Les jetons sont déclarés une seule fois dans `src/styles/tokens.css` (variables
CSS, mode clair et sombre) et exposés à Tailwind via `tailwind.config.js`.
Changer une couleur dans le fichier CSS la propage à toute l'application.

---

## Bilinguisme et RTL

- Interface complète en français et en arabe, bascule instantanée sans
  rechargement (`react-i18next` + attribut `dir` sur `<html>`).
- Mise en page en **propriétés logiques uniquement** (`ms-`, `me-`, `start`,
  `end`) : la barre latérale passe à droite en arabe, les icônes directionnelles
  s'inversent.
- Les montants, quantités, dates et références restent en IBM Plex Mono et en
  direction gauche → droite même en mode arabe (classe `.data`).
- Documents PDF générables en arabe, en français ou en bilingue
  (`?lang=ar|fr|both`).

---

## Tâches de fond

| Tâche | Planification |
|---|---|
| `alerts.generate_all_alerts` | tous les jours à 7 h |
| `alerts.send_receivable_reminders` | tous les lundis à 8 h |
| `partners.recompute_supplier_scores` | tous les jours à 2 h 30 |
| `documents.email_document` | à la demande (envoi de devis, factures, BL) |

---

## Tests

```bash
cd backend
python manage.py test
```

La suite couvre l'authentification JWT, le cloisonnement des rôles, la
confidentialité du profil dirigeant, les tableaux de bord, la numérotation
séquentielle et la chaîne complète achat → stock → vente → facture → paiement.

---

## Mise en production

1. Renseigner `DJANGO_SECRET_KEY`, `DJANGO_DEBUG=False`, `DJANGO_ALLOWED_HOSTS`
   et les identifiants PostgreSQL dans `.env`.
2. `python manage.py collectstatic`
3. Servir avec Gunicorn derrière Nginx ; activer HTTPS (HSTS, cookies sécurisés
   et redirection SSL s'activent automatiquement hors `DEBUG`).
4. Lancer un worker Celery et un service Celery Beat.
5. `npm run build` puis servir `frontend/dist/` en statique.
6. Planifier les sauvegardes de la base et du dossier `media/`
   (logos, cachets, signatures, pièces jointes).
