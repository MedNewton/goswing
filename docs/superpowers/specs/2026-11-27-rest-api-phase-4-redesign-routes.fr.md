# GoSwing — Spécifications des routes REST API, Phase 4 (refonte mobile)

**Date :** 2026-11-27
**Statut :** Brouillon — prêt à transmettre à OPTIDEEP
**Applications :** `goswing` (mobile) et `goswing-admin` (tableau de bord partenaires)
**Complète :** `2026-05-21-rest-api-phase-2-routes.md` (routes 1–59) et `rest-api-phase-3-admin-routes.md` (routes 60–127)
**Version anglaise :** `2026-11-27-rest-api-phase-4-redesign-routes.md` (fait foi en cas d'écart)

Ce document spécifie **toutes les évolutions backend nécessaires à la refonte de l'application mobile** pour ses quatre espaces reconstruits — **Carte, Découvrir, Réservations, Profil** — et tout ce qui est accessible depuis eux (page événement, page lieu, page organisateur, page artiste, paiement, billets, avis, favoris, réglages). Il spécifie aussi **les routes et champs côté admin** dont les partenaires ont besoin pour *produire* ces données (horaires d'ouverture, prix promo et prix sur place, line-ups, vote musical, contrôle des entrées, encaissement).

Hors périmètre de la Phase 4 : l'onglet Social (abonnements entre utilisateurs, publications, fil de stories, groupes, messagerie, « à la une »), les espaces partenaires dans l'application mobile, le parcours « Devenir artiste », le portefeuille (solde, recharge, recharge automatique), les notes Tripadvisor et les « heures d'affluence » Google.

Les routes sont numérotées à partir de **128** pour garder un catalogue continu : 1–7 Phase 1, 8–59 Phase 2, 60–127 Phase 3, 128+ Phase 4. Les modifications de routes existantes sont marquées **EXT** avec le numéro de la route d'origine.

---

## Sommaire

- A. Conventions (différences uniquement)
- B. Prérequis — bugs et corrections de données à livrer en premier
- C. Événements et types de billets (extensions)
- D. Lieux pour l'application mobile
- E. Classements Découvrir
- F. Artistes et line-ups
- G. Paiement : blocage de places, paiements, paiement sur place
- H. Réservations (extensions)
- I. Avis (lieux, organisateurs, éligibilité, votes « utile »)
- J. Musique : suggestions, vote en direct, morceaux enregistrés
- K. Profil et compte
- L. Routes et champs admin
- M. Tâches de fond
- N. Questions ouvertes
- O. Ordre de mise en œuvre
- P. Correspondance avec les écrans de la refonte

---

## A. Conventions (différences uniquement)

Toutes les conventions de la Phase 2 § A et de la Phase 3 § A s'appliquent sans changement (clés en camelCase, horodatages ISO-8601 UTC avec millisecondes, montants en **centimes** entiers + `currency`, `null` explicite, `[]` pour les listes vides, même enveloppe d'erreur, `Idempotency-Key` sur les POST). La Phase 4 ajoute :

### A.1 Les routes publiques acceptent un JWT utilisateur

L'application mobile appellera plusieurs routes `/v1/public/*` (lieux, galerie d'événement, éléments similaires). Ces routes doivent **aussi accepter** une requête portant `Authorization: Bearer <clerk_jwt>` ; dans ce cas, les champs propres à l'utilisateur (`isFollowing`, `isSaved`) sont renseignés, sinon ils valent `false`. Aucun autre changement de comportement.

### A.2 Paramètres géographiques

Toute route qui accepte `lat` + `lng` accepte aussi `radiusKm` (flottant, 10 par défaut, 50 max). Quand `lat`/`lng` sont fournis, chaque élément renvoyé porte `distanceKm` (flottant, 1 décimale, distance orthodromique depuis le point donné). Sinon, `distanceKm` vaut `null`.

### A.3 Fenêtres de temps

L'application envoie des fenêtres explicites plutôt que des libellés (« ce soir », « ce week-end »), pour que le serveur n'ait jamais à deviner le fuseau horaire de l'utilisateur :

- `from` / `to` (ISO-8601) — garder les événements dont `[startsAt, endsAt)` **chevauche** `[from, to)`.
- `liveAt` (ISO-8601) — garder les événements où `startsAt <= liveAt < endsAt` (« en ce moment »). En général l'heure actuelle.

### A.4 Pagination par curseur

Les nouvelles routes de liste utilisent le modèle de curseur de la Phase 2 § A.6 : `limit` (20 par défaut, 100 max) + `cursor` opaque ; réponse `{ "items": [...], "nextCursor": "string | null", "hasMore": bool }`.

### A.5 Données quasi temps réel

Le vote en direct (§ J) fonctionne par **interrogation périodique** : l'application recharge toutes les 5 s tant que l'écran est ouvert. Les réponses doivent être légères et porter un `ETag` pour qu'une interrogation sans changement renvoie `304`. SSE/WebSocket pourront venir plus tard (§ N.4).

### A.6 Nouveaux codes d'erreur

| Code                    | HTTP | Quand |
| ----------------------- | ---- | ----- |
| `hold_expired`          | 410  | Un blocage de places ou une réservation non payée a dépassé son échéance |
| `payment_required`      | 402  | L'action exige que les billets soient d'abord payés |
| `payment_failed`        | 422  | Refus du prestataire ; `details.providerCode` porte le code du prestataire |
| `pay_at_venue_disabled` | 422  | `paymentMode: "payAtVenue"` sur un événement qui ne l'autorise pas |
| `max_per_order`         | 422  | Plus que le `maxTicketsPerOrder` de l'événement |
| `review_not_eligible`   | 403  | (existant) réutilisé pour les avis sur les lieux et les organisateurs |
| `voting_locked`         | 403  | L'utilisateur n'a ni billet ni déverrouillage par le QR du lieu (§ J) |
| `voting_closed`         | 409  | La liste de vote n'est pas ouverte |
| `suggestion_limit`      | 422  | Limite de suggestions par utilisateur atteinte |
| `username_taken`        | 409  | Nom d'utilisateur déjà pris |
| `already_checked_in`    | 409  | Scan à l'entrée d'un billet déjà utilisé |
| `wrong_event`           | 422  | Scan à l'entrée d'un billet d'un autre événement |

---

## B. Prérequis — bugs et corrections de données à livrer en premier

Ces points sont déjà ouverts et bloquent la refonte, indépendamment des nouvelles routes.

| # | Élément | Impact |
| - | ------- | ------ |
| B.1 | **Bug B1** — `POST/PATCH /v1/admin/events` (routes 78–79) rejettent `startsAt` au format ISO avec une 400, et renvoient une 500 avec les dates au format Odoo (`docs/specs-backend-B1-B7-fr.md`). | Les partenaires ne peuvent pas créer d'événements, donc l'application n'a rien à afficher. |
| B.2 | **Bug B7** — `GET /v1/admin/tags` (route 73) renvoie une 503 par intermittence. | Sélecteurs de tags vides à la création d'événement. |
| B.3 | **Alimenter les tags.** `GET /v1/tags?type=interest` renvoie `[]` (`noticed_api_issues.txt`). Créer les tags d'intérêts et confirmer les types de tags canoniques (Phase 2 § S.7 contre Phase 3 `party_type / music_style / extra_service` — question ouverte T2). Les filtres de la Phase 4 utilisent les tags `music_style` comme « genres musicaux ». | Intérêts à l'inscription et filtre par genre dans Découvrir. |
| B.4 | **Valeurs d'accès.** Les événements renvoient des valeurs `access[]` comme `"tous-publics"` ; l'application filtre sur `free` / `free_ladies`. Renvoyer les slugs canoniques `free`, `free_ladies`, `paid` (déduits de `isFree` / `freeForLadies` sur les tarifs et le lieu). | Filtre « Accès » de Découvrir. |
| B.5 | **Instance Clerk.** L'API doit faire confiance à la même instance Clerk que les applications (guide § 2.1). | Tous les appels authentifiés. |

---

## C. Événements et types de billets (extensions)

### C.1 EXT route 1 — GET `/v1/events` (recherche, filtres et pagination côté serveur)

Aujourd'hui la route 1 renvoie tous les événements publiés, sans paramètre ; l'application filtre sur le téléphone. La refonte peut continuer ainsi tant que le catalogue est petit, mais a besoin de ces paramètres pour passer à l'échelle. Tous sont optionnels et se combinent en ET.

| Paramètre | Type | Notes |
| --------- | ---- | ----- |
| `q` | string | Correspondance insensible à la casse sur le titre, le nom du lieu, le nom de l'organisateur, les noms des artistes du line-up |
| `city` | string | Ville du lieu, insensible à la casse |
| `lat`, `lng`, `radiusKm` | float | § A.2 |
| `from`, `to` | ISO | § A.3, fenêtre de chevauchement |
| `liveAt` | ISO | § A.3 |
| `venueTypes[]` | string (répété) | Slugs de types de lieux (liste § D.1) |
| `musicGenres[]` | string (répété) | Slugs de tags `music_style` |
| `partyTypes[]` | string (répété) | Slugs de tags `party_type` |
| `maxPriceCents` | int | Garder les événements dont `fromPriceCents <= valeur` |
| `isFree` | bool | Événements gratuits uniquement |
| `access[]` | string (répété) | `free`, `free_ladies` (§ B.4) |
| `artistId` | uuid | Événements où l'artiste figure au line-up |
| `sort` | enum | `startsAt` (défaut, croissant) · `popular` (attendeeCount décroissant, puis startsAt) · `distance` (exige lat/lng) |
| `limit`, `cursor` | | § A.4. En leur absence, garder le comportement actuel (liste complète) pour la rétrocompatibilité |

Renvoyer aussi `X-Total-Count` (ou un champ `totalCount`) pour que la feuille de filtres puisse afficher « Voir 24 résultats ».

### C.2 EXT — forme de l'événement (routes 1, 2, 4, 5, 6, 116–118)

Ajouter ces champs à l'objet événement partout où il est renvoyé :

```json
{
  "status": "published",
  "doorsOpenAt": "2026-11-18T21:45:00.000Z",
  "lastEntryAt": "2026-11-19T01:00:00.000Z",
  "minAge": 18,
  "fromPriceCents": 1300,
  "fromRegularPriceCents": 1500,
  "currency": "EUR",
  "isFree": false,
  "payAtVenueEnabled": true,
  "maxTicketsPerOrder": 10,
  "venue": {
    "id": "uuid",
    "name": "Studio Neuf",
    "addressLine1": "9 rue Oberkampf",
    "city": "Paris",
    "venueType": "club",
    "location": { "lat": 48.8649, "lng": 2.3770 }
  },
  "lineupPreview": [ { "artistId": "uuid", "name": "Lina K.", "avatarUrl": "string | null", "isHeadliner": true } ],
  "musicMode": "both",
  "isSaved": false,
  "distanceKm": 1.2
}
```

- `status` ∈ `published | live | completed | cancelled`. L'application calcule « En ce moment » à partir de `startsAt`/`endsAt`, mais `cancelled` doit être visible pour afficher un bandeau.
- `doorsOpenAt`, `lastEntryAt` peuvent être null. `lastEntryAt` pilote aussi la libération des places en paiement sur place (§ G.6).
- `minAge` : entier ou null (`null` = tout public).
- `fromPriceCents` = prix **effectif** le plus bas parmi les tarifs en vente (prix promo s'il existe, sinon prix normal). `fromRegularPriceCents` = prix normal de ce tarif **uniquement s'il est remisé**, sinon `null` (permet à la carte d'afficher ~~15 €~~ 13 €). Remplace la chaîne `priceLabel` pour la nouvelle interface (garder `priceLabel` pour les anciennes versions).
- L'objet `venue` remplace les champs séparés `venue` / `venueId` / `location` pour les nouvelles versions (garder aussi les anciens).
- `lineupPreview` = jusqu'à 3 artistes, têtes d'affiche en premier (§ F).
- `musicMode` provient des réglages musicaux de l'événement (§ J.1).
- `isSaved` reflète les favoris côté serveur (aujourd'hui `favorite` vaut toujours `false` et l'application superpose `/favorites/ids`).

### C.3 EXT route 3 — GET `/v1/events/:id/ticket-types` (et les tarifs de la route 118)

```json
{
  "id": "uuid",
  "name": "Early entry",
  "description": "Entry before 00:30",
  "priceCents": 1500,
  "salePriceCents": 1300,
  "doorPriceCents": 2000,
  "currency": "EUR",
  "isFree": false,
  "freeForLadies": false,
  "benefits": ["Welcome drink"],
  "seatsMax": 200,
  "seatsAvailable": 14,
  "salesStartAt": "2026-11-01T00:00:00.000Z",
  "salesEndAt": "2026-11-19T01:00:00.000Z",
  "isOnSale": true
}
```

- `salePriceCents` peut être null ; s'il est renseigné il doit être `< priceCents`, et c'est le prix facturé. L'application affiche la remise en `round((prix − promo) / prix × 100)` %.
- `doorPriceCents` peut être null : ce que coûte la même entrée sur place, sans GoSwing. Alimente la ligne « 13 € · 20 € sur place sans GoSwing » et le montant économisé (§ H.2).
- `seatsAvailable` doit tenir compte des blocages actifs (§ G.1), pour que « Plus que N places » soit exact.
- `isOnSale` = maintenant dans la fenêtre de vente et `seatsAvailable > 0`.

### C.4 Galerie d'événement pour le mobile

Réutiliser la route 119 (`GET /v1/public/events/:id/gallery`) selon § A.1. Chaque élément a besoin de `mediaType` (`image | video`), `url`, `thumbnailUrl` (obligatoire pour les vidéos), `durationSec` (vidéo, nullable).

### C.5 EXT routes 5 et 6 — similaires / à venir par lieu

Accepter `lat`, `lng` et renvoyer `distanceKm` (rangée « Événements similaires à proximité »). La route 6 a aussi besoin de `from` pour que la page événement affiche « Plus à {lieu} » à partir d'aujourd'hui seulement.

---

## D. Lieux pour l'application mobile

L'application mobile n'a aujourd'hui aucune route de lieux (elle affiche les lieux à proximité depuis OpenStreetMap). La refonte affiche les lieux GoSwing sur la carte, dans Découvrir et sur une page lieu complète. Les lieux **absents** de GoSwing sont récupérés depuis Google par notre propre proxy (document compagnon) et ne concernent pas Odoo.

### D.1 Forme partagée — `Venue` (étend `PublicVenue` de la Phase 3)

```json
{
  "id": "uuid",
  "name": "Studio Neuf",
  "venueType": "club",
  "addressLine1": "9 rue Oberkampf",
  "area": "Oberkampf",
  "city": "Paris",
  "postalCode": "75011",
  "countryCode": "FR",
  "location": { "lat": 48.8649, "lng": 2.3770 },
  "timezone": "Europe/Paris",
  "description": "string | null",
  "coverImageUrl": "string | null",
  "logoUrl": "string | null",
  "priceLevel": 2,
  "phone": "+33 1 23 45 67 89",
  "websiteUrl": "https://studioneuf.fr",
  "instagramHandle": "studioneuf",
  "amenities": ["cloakroom", "terrace", "accessible", "card_payment"],
  "openingHours": [
    { "day": 4, "opens": "23:00", "closes": "05:00" },
    { "day": 5, "opens": "23:00", "closes": "06:00" }
  ],
  "openingHoursNote": "string | null",
  "openNow": true,
  "closesAt": "2026-11-19T05:00:00.000Z",
  "rating": { "average": 4.6, "count": 312 },
  "followerCount": 6800,
  "eventsThisMonth": 9,
  "hasEventNow": true,
  "partyTypes": ["Clubbing"],
  "musicStyles": ["Deep house", "Techno"],
  "organizerId": "uuid | null",
  "googlePlaceId": "ChIJ… | null",
  "isFollowing": false,
  "distanceKm": 1.2
}
```

- `venueType` ∈ `club | bar | pub | restaurant | rooftop | concert_hall | festival_ground | lounge | cafe | other` (aligner sur `src/lib/venueTypes.ts` de l'application admin ; les filtres de la carte sont Clubs, Bars, Pubs, Restaurants, Concerts, Festivals, Rooftops).
- `priceLevel` ∈ `1 | 2 | 3 | null` (€, €€, €€€).
- `amenities[]` issus d'une liste fermée (§ N.9).
- `openingHours` : `day` 0 = lundi … 6 = dimanche, `HH:MM` dans le fuseau du lieu ; `closes < opens` signifie après minuit. Plusieurs entrées par jour autorisées (horaires coupés). Tableau vide = inconnu.
- `openNow` / `closesAt` calculés côté serveur dans le fuseau du lieu (`closesAt` null si fermé ou inconnu). L'application affiche « Ouvert · ferme à 05:00 » / « Ferme bientôt » (< 60 min).
- `rating` = avis GoSwing sur le lieu uniquement (§ I). `null` sans avis.
- `hasEventNow` = un événement en cours dans ce lieu (`startsAt <= maintenant < endsAt`) ; les épingles affichent alors une flamme « en direct ».
- `googlePlaceId` nullable ; permet à notre proxy d'ajouter la note Google, et d'éviter d'afficher sur la carte un doublon Google d'un lieu GoSwing.

### D.2 Route 128 — GET `/v1/venues`

Épingles de la carte, « Tous les lieux » de Découvrir, recherche sur la carte.

| Paramètre | Notes |
| --------- | ----- |
| `lat`, `lng`, `radiusKm` | § A.2 |
| `bbox` | `minLng,minLat,maxLng,maxLat` — alternative au rayon pour la zone visible de la carte |
| `city`, `q` | `q` porte sur le nom, le quartier, les styles musicaux |
| `venueTypes[]` | Valeurs § D.1 |
| `musicGenres[]` | Slugs `music_style` |
| `openAt` | ISO — garder les lieux ouverts à cette heure |
| `hasEventNow` | bool |
| `sort` | `distance` (exige lat/lng) · `rating` · `name` |
| `view` | `pin` → uniquement `id, name, venueType, location, hasEventNow, priceLevel` (charge légère pour la carte) |
| `limit`, `cursor` | § A.4 ; avec `view=pin`, `limit` jusqu'à 500 |

**Réponse 200 :** `{ "items": [ Venue ], "nextCursor": …, "hasMore": … }`

### D.3 Route 129 — GET `/v1/venues/:id`

**Réponse 200 :** un `Venue`.

**Erreurs :** `404 not_found`.

### D.4 Route 130 — GET `/v1/venues/:id/events`

Onglet « À venir » de la page lieu. Paramètres `from` (défaut : maintenant), `when=upcoming|past`, `limit`, `cursor`. Les éléments suivent la forme d'événement du § C.2. (Mêmes données que la route publique 123 avec le comportement § A.1 ; l'un ou l'autre chemin convient.)

### D.5 Route 131 — GET `/v1/venues/:id/similar`

« Lieux similaires à proximité ». Paramètres `limit` (6 par défaut), `lat`, `lng`. Même type de lieu ou mêmes styles musicaux, les plus proches d'abord. Éléments : `Venue` (les champs de `view=pin` + `coverImageUrl`, `rating`, `priceLevel`, `openNow`, `distanceKm` suffisent).

### D.6 Route 132 — GET `/v1/venues/:id/media`

Photos et vidéos de la fiche et de la page lieu. Même forme d'élément qu'au § C.4. Source : la galerie de l'organisateur du lieu (routes 68–70) plus les éléments de galerie des événements passés dans ce lieu, du plus récent au plus ancien. Pagination par curseur.

### D.7 Routes 133–135 — suivre un lieu

- **133** PUT `/v1/me/followed-venues/:venueId` → `{ "venueId", "isFollowing": true, "followerCount", "notifyNewEvents": true }`. Corps optionnel `{ "notifyNewEvents": bool }` (l'icône cloche de la page lieu).
- **134** DELETE `/v1/me/followed-venues/:venueId` → `{ "venueId", "isFollowing": false, "followerCount" }`.
- **135** GET `/v1/me/followed-venues` → liste par curseur de `Venue` (champs de `view=pin` + `coverImageUrl`).

Idempotentes comme les routes de suivi d'organisateur (J.1–J.3). Si OPTIDEEP préfère implémenter le suivi d'un lieu comme le suivi de son organisateur, le contrat ci-dessus reste valable (§ N.6).

Aussi **EXT** suivi d'organisateur (route J.1) : accepter `{ "notifyNewEvents": bool }` et le renvoyer.

---

## E. Classements Découvrir

L'onglet Découvrir affiche des rangées classées. « Top événements de la semaine » utilise la route 1 avec `sort=popular` et une fenêtre d'une semaine, donc aucune nouvelle route. Les lieux et les artistes ont besoin d'un score calculé côté serveur.

### E.1 Route 136 — GET `/v1/discover/places`

« Meilleurs lieux de la semaine » (classés n° 1, n° 2…).

| Paramètre | Notes |
| --------- | ----- |
| `city` ou `lat`/`lng`/`radiusKm` | Obligatoire (l'un des deux) |
| `period` | `week` (défaut) · `month` |
| `venueTypes[]` | optionnel |
| `limit` | 10 par défaut, 30 max |

**Réponse 200 :** `{ "items": [ { "rank": 1, "score": 0.93, "venue": Venue } ], "period": { "from": ISO, "to": ISO } }`

Proposition de score (à ajuster librement, mais à documenter) : réservations sur la période aux événements du lieu + nouveaux abonnés + nombre d'avis × note moyenne, normalisé par ville.

### E.2 Route 137 — GET `/v1/discover/artists`

« Meilleurs artistes du mois » et « Tous les artistes du mois ».

| Paramètre | Notes |
| --------- | ----- |
| `city` ou `lat`/`lng`/`radiusKm` | Obligatoire |
| `period` | `month` (défaut) · `week` |
| `musicGenres[]` | optionnel |
| `sort` | `rank` (défaut) · `name` |
| `limit`, `cursor` | § A.4 |

**Réponse 200 :** `{ "items": [ { "rank": 1, "artist": ArtistCard, "gigsInPeriod": 6, "nextGig": GigSummary | null } ], "nextCursor", "hasMore" }` (formes au § F).

Seuls les artistes ayant au moins une date publiée sur la période et dans la zone sont renvoyés.

---

## F. Artistes et line-ups

Nouvelle entité. Un artiste est un interprète (DJ, groupe, live) que les organisateurs associent à leurs événements. En Phase 4, les artistes sont **créés par les organisateurs** depuis l'application admin (rechercher-ou-créer, comme les tags, § L.4) ; un parcours « revendiquer son profil d'artiste » viendra plus tard (§ N.3).

### F.1 Formes partagées

**`ArtistCard`**

```json
{
  "id": "uuid",
  "slug": "lina-k",
  "name": "Lina K.",
  "kind": "dj",
  "avatarUrl": "string | null",
  "genres": ["Deep house", "Minimal"],
  "city": "Paris",
  "followerCount": 22000,
  "isVerified": true,
  "isFollowing": false
}
```

`kind` ∈ `dj | band | live_act | singer | other`. `genres` sont des libellés de tags `music_style` (5 max).

**`Artist`** = `ArtistCard` plus :

```json
{
  "bio": "string | null",
  "coverImageUrl": "string | null",
  "gigsThisMonth": 6,
  "links": {
    "spotifyUrl": "string | null",
    "appleMusicUrl": "string | null",
    "soundcloudUrl": "string | null",
    "youtubeUrl": "string | null",
    "instagramHandle": "string | null",
    "websiteUrl": "string | null"
  },
  "spotifyArtistId": "string | null",
  "playsWith": [
    { "type": "venue", "id": "uuid", "name": "Studio Neuf" },
    { "type": "organizer", "id": "uuid", "name": "Nuit Blanche Collective" }
  ]
}
```

- `playsWith` = lieux/organisateurs distincts des dates de l'artiste sur les 12 derniers mois, 6 max.
- Les titres populaires et les sorties (onglet Musique) ne sont **pas** stockés dans Odoo : nous les récupérons de notre côté depuis Spotify grâce à `spotifyArtistId` (document compagnon). Odoo stocke seulement l'identifiant et les liens.

**`GigSummary`**

```json
{
  "eventId": "uuid",
  "eventTitle": "Deep House Session",
  "venueName": "Studio Neuf",
  "startsAt": "2026-11-18T23:00:00.000Z",
  "setStartsAt": "2026-11-19T02:00:00.000Z",
  "setEndsAt": "2026-11-19T04:00:00.000Z",
  "isHeadliner": true
}
```

### F.2 Route 138 — GET `/v1/artists`

Recherche pour la barre de recherche de Découvrir et l'onglet Artistes. Paramètres `q`, `city`, `musicGenres[]`, `limit`, `cursor`. Éléments : `ArtistCard`.

### F.3 Route 139 — GET `/v1/artists/:id`

Accepte un uuid ou le `slug`. **Réponse 200 :** `Artist`. **Erreurs :** `404`.

### F.4 Route 140 — GET `/v1/artists/:id/gigs`

Onglet Dates. Paramètres `when=upcoming|past` (défaut upcoming), `limit`, `cursor`. Éléments : `GigSummary`.

### F.5 Route 141 — GET `/v1/events/:id/lineup`

Section line-up de la page événement.

```json
{
  "items": [
    {
      "artist": "ArtistCard",
      "role": "Closing set",
      "setStartsAt": "2026-11-19T02:00:00.000Z",
      "setEndsAt": "2026-11-19T04:00:00.000Z",
      "isHeadliner": true,
      "sortOrder": 0
    }
  ]
}
```

Trié par `sortOrder`, puis `setStartsAt`. `role` et les horaires de passage peuvent être null.

### F.6 Routes 142–144 — suivre un artiste

- **142** PUT `/v1/me/followed-artists/:artistId` — corps optionnel `{ "notifyGigs": bool }` (la cloche « alertes de dates ») → `{ "artistId", "isFollowing": true, "followerCount", "notifyGigs" }`.
- **143** DELETE `/v1/me/followed-artists/:artistId` → `{ "artistId", "isFollowing": false, "followerCount" }`.
- **144** GET `/v1/me/followed-artists` → liste par curseur d'`ArtistCard`.

---

## G. Paiement : blocage de places, paiements, paiement sur place

Aujourd'hui `POST /v1/reservations` crée une réservation et **rien n'est débité**. La refonte a besoin de vrais paiements, avec deux modes par réservation :

- **Payer maintenant** — paiement dans l'application (Apple Pay, Google Pay, carte enregistrée, nouvelle carte, 3-D Secure). Les billets sont valables immédiatement.
- **Payer sur place** — les billets sont réservés maintenant et payés à l'entrée. Les billets non payés sont **libérés à `lastEntryAt`** (ou au début de l'événement + 2 h si `lastEntryAt` est null). L'utilisateur peut aussi payer plus tard depuis l'application n'importe quel billet non payé (« Payer X maintenant ») : c'est ainsi qu'une réservation devient **partiellement payée**.

Le statut de paiement est donc porté par **chaque billet**, et le statut de la réservation est déduit de ses billets.

### G.1 Route 145 — POST `/v1/reservation-holds`

Appelée à l'ouverture de la fenêtre de réservation et à chaque changement de quantité. Bloque les places pendant **10 minutes** pour qu'elles ne soient pas vendues entre-temps.

**Requête**

```json
{ "eventId": "uuid-or-slug", "quantities": { "ticket-type-uuid": 2 } }
```

**Réponse 201**

```json
{
  "holdId": "uuid",
  "expiresAt": "2026-11-18T20:10:00.000Z",
  "quantities": { "ticket-type-uuid": 2 },
  "pricing": {
    "lines": [
      { "ticketTypeId": "uuid", "quantity": 2, "unitPriceCents": 1300, "regularUnitPriceCents": 1500, "doorUnitPriceCents": 2000, "lineTotalCents": 2600 }
    ],
    "subtotalCents": 2600,
    "serviceFeeCents": 0,
    "totalCents": 2600,
    "savingsCents": 1400,
    "currency": "EUR"
  }
}
```

- `savingsCents` = Σ (prix sur place, ou prix normal à défaut de prix sur place, − prix facturé) × quantité. Affiché comme « Vous économisez ».
- **Erreurs :** `422 unprocessable` (`sold_out`, `outside_sales_window`), `422 max_per_order`, `404`.

### G.2 Route 146 — PATCH `/v1/reservation-holds/:holdId`

Corps `{ "quantities": {…} }`. Recalcule les prix et **prolonge** `expiresAt` à maintenant + 10 min. Même réponse qu'au § G.1. **Erreurs :** `410 hold_expired`, `422 sold_out`.

### G.3 Route 147 — DELETE `/v1/reservation-holds/:holdId`

L'utilisateur a fermé la fenêtre. **204.** Idempotente.

### G.4 EXT route L.1 — POST `/v1/reservations`

Nouveaux champs de requête :

```json
{
  "holdId": "uuid",
  "paymentMode": "payNow",
  "showOnProfile": false,
  "eventId": "…", "quantities": { … }, "attendees": [ … ], "billing": { … }
}
```

- `holdId` optionnel mais attendu des nouvelles versions ; la réservation consomme les places bloquées. Blocage expiré → `410 hold_expired`.
- `paymentMode` ∈ `payNow | payAtVenue` (défaut `payNow`). `payAtVenue` sur un événement avec `payAtVenueEnabled = false` → `422 pay_at_venue_disabled`. Les billets gratuits ignorent le mode.
- `showOnProfile` est stocké pour le futur profil Social ; aucun comportement en Phase 4.
- `attendees[0]` est l'acheteur (« Vous »). L'e-mail de chaque invité reçoit son propre QR dès que son billet est valable (payé, gratuit, ou réservé en paiement sur place) — l'envoi des e-mails est à la charge d'Odoo.
- Nombre maximal de billets par commande = `maxTicketsPerOrder` (10 par défaut).

**État obtenu**

| Mode | `status` de la réservation | `paymentStatus` des billets | Places |
| ---- | -------------------------- | --------------------------- | ------ |
| `payNow` (tarifs payants) | `awaitingPayment` | `unpaid` | bloquées jusqu'à `paymentDueAt` = maintenant + 10 min ; puis `expired` et libérées |
| `payAtVenue` | `confirmed` (ou `pending` en validation manuelle) | `unpaid` | bloquées jusqu'à l'heure de libération (§ G.6) |
| tous les billets gratuits | `confirmed` / `pending` | `free` | prises |

La **réponse 201** ajoute `paymentMode`, `paymentStatus`, `paymentDueAt` (nullable) et `savingsCents` à la réponse de la Phase 2.

Les valeurs de **statut de réservation** deviennent : `awaitingPayment | pending | confirmed | checkedIn | expired | cancelled | refunded`.

### G.5 Route 148 — POST `/v1/reservations/:id/payments`

Lance le paiement de tout ou partie des billets non payés d'une réservation (« Payer maintenant » au paiement, et « Payer X maintenant » sur une réservation payable sur place).

**Requête**

```json
{
  "ticketIds": ["uuid", "uuid"],
  "method": "apple_pay",
  "paymentMethodId": "uuid | null",
  "savePaymentMethod": false,
  "returnUrl": "goswing://payments/return"
}
```

- `ticketIds` absent = tous les billets non payés. Ils doivent appartenir à la réservation de l'appelant et être `unpaid`.
- `method` ∈ `apple_pay | google_pay | card | saved_card`. `saved_card` exige `paymentMethodId` (identifiant Phase 2 § F).
- Montant = Σ des prix facturés des billets (calculé côté serveur à partir de l'instantané de la réservation, jamais à partir du client).

**Réponse 201**

```json
{
  "paymentId": "uuid",
  "status": "requires_confirmation",
  "provider": "stripe",
  "clientSecret": "pi_…_secret_…",
  "amountCents": 2600,
  "currency": "EUR",
  "providerCustomerId": "cus_… | null",
  "ephemeralKey": "ek_… | null"
}
```

L'application transmet `clientSecret` au SDK du prestataire, qui gère Apple/Google Pay ou la saisie de carte et le 3-D Secure. Odoo ne considère **pas** le paiement comme réussi sur la parole de l'application — uniquement sur le webhook du prestataire (§ G.8).

`status` ∈ `requires_confirmation | processing | succeeded | failed | cancelled`.

**Erreurs :** `404`, `403`, `409 conflict` (un billet n'est pas `unpaid`), `410 hold_expired` (réservation « payer maintenant » expirée).

### G.6 Règle de libération du paiement sur place

À l'heure de libération (`lastEntryAt`, sinon début de l'événement + 2 h — § N.2), tout billet encore `unpaid` d'une réservation `payAtVenue` passe en `released` et sa place retourne en stock. Les titulaires reçoivent une notification 2 h et 30 min avant la libération (envoi assuré par le service de notifications existant, Phase 2 § S.4). Le paiement à l'entrée (§ L.9) marque les billets comme payés avant cette échéance.

### G.7 Route 149 — GET `/v1/payments/:paymentId`

L'application interroge cette route après le retour du SDK, jusqu'à `succeeded` ou `failed` (latence du webhook). **Réponse 200 :** `{ "paymentId", "status", "amountCents", "currency", "reservationId", "ticketIds", "failureMessage": "string | null" }`.

### G.8 Route 150 — POST `/v1/webhooks/payments/:provider` (prestataire → Odoo)

Non appelée par nos applications. Sur un événement de succès vérifié, Odoo, en une seule transaction : passe le paiement en `succeeded`, met les billets concernés en `paymentStatus = paid` + `paidAt`, fait passer une réservation `awaitingPayment` en `confirmed` (ou `pending` en validation manuelle), et envoie les e-mails de billets. Les événements d'échec/expiration passent le paiement en `failed`. Doit être idempotente sur l'identifiant d'événement du prestataire.

### G.9 Route 151 — POST `/v1/me/payment-methods/setup`

« Ajouter une carte » dans Profil → Moyens de paiement (aujourd'hui une simple alerte). Renvoie un secret de configuration du prestataire ; l'application saisit la carte avec le SDK du prestataire ; le webhook du prestataire (ou l'application appelant Phase 2 F.2 avec le `providerPaymentMethodId` obtenu) enregistre la carte.

**Réponse 201 :** `{ "provider": "stripe", "setupClientSecret": "seti_…", "providerCustomerId": "cus_…", "ephemeralKey": "ek_…" }`

### G.10 Route 152 — GET `/v1/me/payments`

« Transactions récentes » sur l'écran Moyens de paiement (le portefeuille est hors périmètre ; il s'agit uniquement de l'historique des paiements). Liste par curseur :

```json
{ "items": [ {
  "paymentId": "uuid",
  "label": "Deep House Session · 2 tickets",
  "reservationId": "uuid",
  "method": "apple_pay",
  "cardLastFour": "4242 | null",
  "amountCents": 2600,
  "currency": "EUR",
  "kind": "payment",
  "status": "succeeded",
  "createdAt": "ISO"
} ], "nextCursor": null, "hasMore": false }
```

`kind` ∈ `payment | refund` ; les remboursements s'affichent en négatif dans l'interface.

---

## H. Réservations (extensions)

### H.1 EXT routes L.2 / L.3 — formes des réservations

Ajouter à chaque réservation (liste et détail) :

```json
{
  "bookingRef": "GS-AFR4X9",
  "paymentMode": "payAtVenue",
  "paymentStatus": "partlyPaid",
  "paidCents": 1300,
  "dueCents": 1300,
  "releaseAt": "2026-11-19T01:00:00.000Z",
  "savingsCents": 1400,
  "showOnProfile": false,
  "event": { "…": "existing fields", "imageUrl": "string | null", "addressLine1": "string | null", "location": { "lat": 0, "lng": 0 } }
}
```

et à chaque billet :

```json
{
  "paymentStatus": "paid",
  "paidAt": "ISO | null",
  "chargedPriceCents": 1300,
  "qrValue": "GSV1:…",
  "checkedInAt": "ISO | null"
}
```

- `bookingRef` : code court lisible affiché sur les billets.
- `paymentStatus` de la réservation ∈ `paid | partlyPaid | unpaid | free | refunded`, déduit des billets.
- `paymentStatus` du billet ∈ `paid | unpaid | free | released | refunded`.
- `releaseAt` renseigné uniquement s'il reste des billets non payés en paiement sur place.
- L'application affiche **Utilisé** quand tous les billets ont un `checkedInAt`, **Terminé** pour les événements passés ; aucun champ nécessaire.
- Les QR sont renvoyés aussi pour les billets non payés en paiement sur place (l'entrée encaisse au moment du scan).

### H.2 EXT route L.2 — résumé pour l'en-tête Réservations

```json
"summary": { "totalSavingsCents": 7700, "currency": "EUR", "bookingsCount": 5, "ticketsCount": 11, "activeCount": 3 }
```

Calculé sur **toutes** les réservations de l'utilisateur (pas seulement la page en cours). En cas de plusieurs devises : renvoyer la devise la plus utilisée par l'utilisateur, sans conversion — ne sommer que cette devise (§ N.8).

### H.3 EXT route L.4 — annulation

La route Phase 2 L.4 (`POST /v1/reservations/:id/cancel`) n'est toujours pas développée. La Phase 4 en a besoin **uniquement pour les réservations en paiement sur place sans aucun billet payé** (l'utilisateur libère des places qu'il n'utilisera pas). Les billets payés restent non remboursables selon la politique de l'événement. **Erreurs :** `409 conflict` dans les autres cas.

### H.4 Route 153 — PATCH `/v1/reservations/:id`

`{ "showOnProfile": bool }`. Stocké uniquement (futur Social). **200** avec la réservation.

---

## I. Avis (lieux, organisateurs, éligibilité, votes « utile »)

Aujourd'hui les utilisateurs ne peuvent noter que les **événements** ; les avis sur les lieux existent côté admin (réponse/like) mais les utilisateurs ne peuvent pas en écrire, et rien n'indique à l'application ce que l'utilisateur a le droit de noter.

### I.1 Route 154 — GET `/v1/me/review-eligibility`

Alimente « En attente de votre avis » dans Mes avis et l'état du bouton « Écrire un avis ».

**Paramètres :** `targetType` (`event | venue | organizer`, optionnel), `targetId` (optionnel).

```json
{ "items": [ {
  "targetType": "venue",
  "targetId": "uuid",
  "targetName": "Studio Neuf",
  "imageUrl": "string | null",
  "reservationId": "uuid",
  "visitDate": "2026-11-14T22:00:00.000Z",
  "eventTitle": "Deep House Session",
  "reviewed": false
} ] }
```

Règle : un utilisateur peut noter un événement, son lieu et son organisateur **une fois par réservation passée** ayant au moins un billet scanné à l'entrée (ou, tant que le scan à l'entrée n'est pas généralisé, une réservation `confirmed` dont l'événement est terminé — § N.7). Avec `targetId`, une liste vide signifie « Seuls les clients ayant réservé peuvent laisser un avis » ; une liste dont tous les éléments sont `reviewed: true` signifie « Vous avez noté toutes vos visites ».

### I.2 Route 155 — POST `/v1/venues/:id/reviews`

```json
{ "reservationId": "uuid", "rating": 5, "comment": "string | null" }
```

`rating` 1..5, `comment` ≤ 500 caractères. Un avis par (utilisateur, lieu, réservation). **201** avec l'avis. **Erreurs :** `403 review_not_eligible`, `409 conflict`.

### I.3 Route 156 — POST `/v1/organizers/:id/reviews`

Même contrat qu'au § I.2, pour les organisateurs (les avis sur les organisateurs sont déjà lisibles via Phase 2 I.4).

### I.4 Route 157 — GET `/v1/venues/:id/reviews`

Onglet Avis de la page lieu.

```json
{
  "summary": { "average": 4.6, "count": 312, "breakdown": { "5": 210, "4": 70, "3": 20, "2": 8, "1": 4 } },
  "items": [ { "id": "uuid", "rating": 5, "comment": "…", "createdAt": "ISO", "author": { "displayName": "Inès R.", "avatarUrl": null }, "helpfulCount": 4, "isHelpfulByMe": false, "adminReply": "string | null" } ],
  "nextCursor": null, "hasMore": false
}
```

Aussi **EXT** Phase 2 I.4 (avis organisateur) pour inclure le même bloc `summary`, et ajouter `GET /v1/events/:id/reviews` (**route 158**) avec la même forme pour la page événement.

### I.5 Route 159 — PUT / DELETE `/v1/reviews/:id/helpful`

Bascule « Utile » sur n'importe quel avis (événement, lieu, organisateur). Réponse `{ "helpfulCount", "isHelpfulByMe" }`. Un utilisateur ne peut pas marquer son propre avis.

### I.6 EXT Phase 2 N.3 / N.4 — mes avis

- `GET /v1/me/reviews` accepte `type=event|venue|organizer` et renvoie sur chaque élément un `targetType` + `target { id, name, imageUrl }`, plus `stats { count, averageGiven, helpfulReceived }`. `helpfulCount` doit être réel (toujours 0 aujourd'hui).
- `PATCH /v1/reviews/:id` et `DELETE /v1/reviews/:id` doivent aussi fonctionner pour les avis sur les lieux et les organisateurs.

---

## J. Musique : suggestions, vote en direct, morceaux enregistrés

Deux étapes par événement, configurées par l'organisateur (§ L.6) :

- **Avant l'événement — suggestions :** les détenteurs de billets proposent des morceaux jusqu'à une heure limite, dans la limite d'un nombre par utilisateur (existe déjà : Phase 2 § O, morceaux Deezer).
- **Pendant l'événement — vote :** le DJ/l'organisateur ouvre une **liste de vote** (morceaux choisis parmi les suggestions ou ajoutés directement) ; les participants votent quasiment en temps réel. Le vote est débloqué par la détention d'un billet **ou** par le scan du QR code du lieu sur place, qui ne fonctionne qu'une fois l'événement commencé.

### J.1 Réglages musicaux de l'événement (stockés sur l'événement, écrits au § L.6)

```json
{
  "musicMode": "both",
  "suggestionsCloseAt": "2026-11-18T22:00:00.000Z",
  "suggestionsPerUser": 3,
  "votingRequiresTicket": false
}
```

`musicMode` ∈ `both | suggest | vote | none`. `votingRequiresTicket: false` autorise le déverrouillage par le QR du lieu pour les personnes venues sans billet.

### J.2 Route 160 — GET `/v1/events/:id/music`

Un seul appel qui indique à la page événement ce qu'il faut afficher.

```json
{
  "musicMode": "both",
  "phase": "before",
  "suggestions": { "open": true, "closesAt": "ISO", "perUserLimit": 3, "mineCount": 1, "canSuggest": true, "reason": null },
  "voting": { "open": false, "activeVoteListId": null, "canVote": false, "unlockedBy": null, "reason": "not_started" }
}
```

- `phase` ∈ `before | live | ended` (d'après les horaires de l'événement).
- Codes `reason` quand l'action n'est pas permise : `no_ticket`, `closed`, `limit_reached`, `not_started`, `locked`, `mode_disabled`.
- `unlockedBy` ∈ `ticket | venue_code | null`.

### J.3 EXT Phase 2 O.1 — POST `/v1/events/:id/song-suggestions`

Appliquer `suggestionsCloseAt` (`409 conflict`, `details.reason: "suggestions_closed"`), `musicMode` (`422 unprocessable`, `details.reason: "mode_disabled"`) et `suggestionsPerUser` (`422 suggestion_limit`). Conserver le format Deezer ; accepter en plus un `previewUrl` optionnel (extrait de 30 s) et `durationSec`. Voir § N.5 pour Spotify/Apple Music.

### J.4 Route 161 — POST `/v1/events/:id/music/unlock`

L'utilisateur a scanné le QR du lieu.

```json
{ "venueCode": "GSVENUE:evt=uuid;c=7Q2K9X" }
```

Valable uniquement quand `startsAt <= maintenant < endsAt` et si le code correspond au code tournant actuel de l'événement (§ L.8). Le déverrouillage est enregistré par (utilisateur, événement). **200** `{ "unlocked": true }`. **Erreurs :** `422 unprocessable` (`details.reason` : `invalid_code | not_started | ended`).

### J.5 Route 162 — GET `/v1/events/:id/vote-list`

La liste de vote ouverte (interrogée toutes les 5 s avec `ETag`, § A.5).

```json
{
  "voteListId": "uuid",
  "title": "Next up",
  "open": true,
  "closesAt": "ISO | null",
  "votesPerUser": 3,
  "myVotesLeft": 2,
  "items": [
    { "trackId": "uuid", "title": "Velvet Hours", "artistName": "Lina K.", "artworkUrl": "…", "previewUrl": "… | null", "durationSec": 402, "voteCount": 128, "votedByMe": true }
  ]
}
```

Triée par `voteCount` décroissant. `404` si aucune liste n'est ouverte.

### J.6 Routes 163–164 — voter

- **163** PUT `/v1/vote-lists/:voteListId/tracks/:trackId/vote` → `{ "voteCount", "votedByMe": true, "myVotesLeft" }`
- **164** DELETE même chemin → `{ "voteCount", "votedByMe": false, "myVotesLeft" }`

**Erreurs :** `403 voting_locked`, `409 voting_closed`, `422 unprocessable` (`details.reason: "no_votes_left"`).

### J.7 Routes 165–167 — morceaux enregistrés

« Enregistrer le morceau » depuis une liste de vote ou les suggestions ; affiché dans Profil → Favoris → Morceaux.

- **165** GET `/v1/me/saved-songs` → liste par curseur `{ id, provider: "deezer", providerTrackId, title, artistName, artworkUrl, durationSec, previewUrl, externalUrl, fromEvent { id, title } | null, savedAt }`
- **166** PUT `/v1/me/saved-songs` corps `{ provider, providerTrackId, title, artistName, artworkUrl, durationSec, previewUrl, externalUrl, eventId }` → **201** ; idempotente sur (utilisateur, provider, providerTrackId).
- **167** DELETE `/v1/me/saved-songs/:id` → **204**.

---

## K. Profil et compte

Les parties sociales du profil (publications, abonnés, « à la une ») sont reportées. L'onglet Profil affiche un en-tête de compte : photo, nom, @nom_d'utilisateur, ville, et les statistiques existantes (événements suivis / enregistrés / avis).

### K.1 EXT Phase 2 C.1 / C.3 — champs du profil

Ajouter à `GET`/`PATCH /v1/me/profile` :

```json
{
  "username": "mehdi.lj",
  "bio": "string | null",
  "dateOfBirth": "1996-04-12",
  "emailVerified": true
}
```

- `username` : 3 à 24 caractères, `^[a-z0-9._]+$`, pas de point au début ni à la fin, unique sans tenir compte de la casse, mots réservés bloqués (`admin`, `goswing`, `support`…). `409 username_taken` en cas de conflit. Nullable pour les utilisateurs existants ; les nouveaux utilisateurs en reçoivent un généré à l'initialisation (§ C.2), modifiable ensuite.
- `bio` ≤ 150 caractères. `dateOfBirth` date ISO ; l'utilisateur doit avoir au moins 16 ans (§ N.10).
- L'e-mail et le téléphone restent gérés par Clerk (modifications et vérifications se font dans Clerk). L'API continue de les synchroniser depuis Clerk comme aujourd'hui.

### K.2 Route 168 — GET `/v1/usernames/:username/availability`

Vérification en direct pendant la saisie dans Modifier le profil. **200** `{ "username": "mehdi.lj", "available": true, "reason": null }` avec `reason` ∈ `taken | reserved | invalid | null`. Limiter le débit par utilisateur (par ex. 30/min). Le nom d'utilisateur actuel de l'appelant renvoie `available: true`.

### K.3 Route 169 — POST `/v1/me/avatar` (multipart)

Aujourd'hui, Modifier le profil envoie en PATCH le chemin du fichier local du téléphone comme `avatarUrl` (un bug). Champ `file` (JPEG/PNG/HEIC/WebP, ≤ 10 Mo). Le serveur le stocke, le redimensionne (par ex. 512 px) et met à jour le profil. **201** `{ "avatarUrl": "https://…" }`. `DELETE /v1/me/avatar` → **204** (supprimer la photo).

### K.4 EXT Phase 2 C.6 — suppression avec délai de grâce de 30 jours

`POST /v1/me/profile/delete` passe `accountStatus = "pendingDeletion"` et `scheduledDeletionAt = maintenant + 30 jours` au lieu de supprimer immédiatement ; les billets futurs en paiement sur place sont libérés et les blocages non payés abandonnés tout de suite. Ajouter la **route 170** `POST /v1/me/profile/cancel-deletion` → retour à `active`. Une tâche effectue la suppression de la Phase 2 C.6 à l'échéance (§ M).

### K.5 Route 171 — POST `/v1/me/data-export`

« Télécharger mes données ». **202** `{ "requestId": "uuid", "estimatedReadyAt": "ISO" }`. Odoo envoie par e-mail un lien de téléchargement sous 48 h (profil, réservations, billets, paiements, avis, suggestions, favoris, abonnements). Une seule demande ouverte à la fois (`409 conflict`).

### K.6 Favoris

Événements enregistrés (Phase 2 § K), organisateurs suivis (J), lieux suivis (§ D.7), artistes suivis (§ F.6) et morceaux enregistrés (§ J.7) couvrent ensemble l'écran Favoris. Aucune autre route nécessaire. Les **publications** enregistrées relèvent du Social (reporté).

### K.7 Réglages déjà couverts

Réglages (D), préférences de notification (E — les heures de silence existent déjà), moyens de paiement (F + § G.9), historique de connexion (G), centres d'intérêt (H). Le nouveau réglage rapide « Langue EN/FR » utilise le champ `language` existant de `/v1/me/settings` ; confirmer qu'il existe (§ N.11).

---

## L. Routes et champs admin

Ce dont les partenaires ont besoin dans `goswing-admin` pour produire les données ci-dessus. Toutes les règles `/v1/admin/*` de la Phase 3 s'appliquent (périmètre par organisateur, rôles).

### L.1 EXT routes 78–79 — création / modification d'événement

Nouveaux champs du corps :

```json
{
  "doorsOpenAt": "ISO | null",
  "lastEntryAt": "ISO | null",
  "minAge": 18,
  "payAtVenueEnabled": true,
  "maxTicketsPerOrder": 10,
  "musicSettings": { "musicMode": "both", "suggestionsCloseAt": "ISO | null", "suggestionsPerUser": 3, "votingRequiresTicket": false },
  "lineup": [ { "artistId": "uuid", "role": "string | null", "setStartsAt": "ISO | null", "setEndsAt": "ISO | null", "isHeadliner": true } ],
  "ticketTiers": [ {
    "name": "Early entry", "description": "string | null",
    "priceCents": 1500, "salePriceCents": 1300, "doorPriceCents": 2000,
    "currency": "EUR", "capacity": 200, "isFree": false, "freeForLadies": false,
    "benefits": ["Welcome drink"],
    "salesStartAt": "ISO | null", "salesEndAt": "ISO | null"
  } ]
}
```

- Validation : `doorsOpenAt <= startsAt` ; `startsAt <= lastEntryAt <= endsAt` ; `salePriceCents < priceCents` ; `maxTicketsPerOrder` entre 1 et 20 ; `suggestionsPerUser` entre 1 et 10.
- `benefits` et les fenêtres de vente manquaient déjà dans l'entrée d'écriture des tarifs de la Phase 3 — à ajouter.
- Les mêmes champs apparaissent dans les réponses de la route 76 (détail de l'événement).

### L.2 EXT routes 82 / 84 / 81 / 83 — création / modification / lecture de lieu

Ajouter `area`, `priceLevel`, `phone`, `websiteUrl`, `instagramHandle`, `amenities[]`, `openingHours[]`, `openingHoursNote`, `googlePlaceId`, `logoUrl` (définitions au § D.1). Valider les entrées `openingHours` (`day` 0..6, `HH:MM`).

### L.3 Médias du lieu

Réutiliser la galerie de l'organisateur (routes 68–70) comme photos et vidéos du lieu ; ajouter la prise en charge de `mediaType: "video"` avec `thumbnailUrl` (l'upload de la route 115 a besoin de `kind: "organizerVideo"`, 100 Mo max, mp4/mov).

### L.4 Routes 172–174 — artistes (admin)

- **172** GET `/v1/admin/artists?q=` — recherche parmi tous les artistes (global, pas limité à l'organisateur) pour le sélecteur de line-up. Éléments : `ArtistCard` + `createdByOrganizerId`.
- **173** POST `/v1/admin/artists` — rechercher-ou-créer par nom normalisé : `{ "name", "kind", "genres": [tagId], "city", "avatarUrl", "links": { … }, "spotifyArtistId" }` → **201** `{ "artistId", "created": true }` (ou 200 avec `created: false` si trouvé).
- **174** PATCH `/v1/admin/artists/:id` — seul l'organisateur créateur peut modifier, et seulement tant que l'artiste n'est pas revendiqué (§ N.3). **403** sinon.

### L.5 Route 175 — PUT `/v1/admin/events/:id/lineup`

Remplace l'intégralité du line-up (même tableau que `lineup` au § L.1). **200** avec la réponse du § F.5. Permet de modifier le line-up sans renvoyer l'événement.

### L.6 Réglages musicaux

Inclus dans le § L.1. Le rôle `dj` doit pouvoir modifier en PATCH `musicSettings` et le line-up des événements de l'organisateur (et rien d'autre sur l'événement).

### L.7 Routes 176–179 — listes de vote (rôles `admin`, `dj`)

- **176** GET `/v1/admin/events/:id/vote-lists` → `{ "items": [ { "voteListId", "title", "status": "draft|open|closed", "opensAt", "closesAt", "votesPerUser", "items": [ { "trackId", "title", "artistName", "artworkUrl", "voteCount", "fromSuggestionId": "uuid | null" } ] } ] }`
- **177** POST `/v1/admin/events/:id/vote-lists` — `{ "title", "votesPerUser": 3, "trackIds"?: [], "fromSuggestionIds"?: [], "tracks"?: [ format Deezer ], "opensAt"?: ISO, "closesAt"?: ISO }` → **201**.
- **178** PATCH `/v1/admin/vote-lists/:id` — modifier titre/limites/morceaux, ou `{ "status": "open" | "closed" }`. Au plus **une liste ouverte** par événement (`409 conflict`).
- **179** DELETE `/v1/admin/vote-lists/:id` — brouillon uniquement. **204**.

Aussi **EXT** route 108 (suggestions de morceaux) pour renvoyer `suggestionCount` par morceau (combien d'utilisateurs l'ont proposé), afin d'aider les DJ à choisir.

### L.8 Route 180 — GET `/v1/admin/events/:id/venue-code`

Le QR affiché par le lieu pour débloquer le vote en direct (§ J.4). **200** `{ "venueCode": "GSVENUE:evt=uuid;c=7Q2K9X", "rotatesAt": "ISO" }`. Le code change toutes les 24 h (ou à la demande avec `POST …/venue-code/rotate`, **route 181**), pour qu'une photo du code de la semaine précédente soit inutilisable.

### L.9 Routes 182–185 — contrôle des entrées et encaissement (rôles `admin`, `entrance_manager`)

Aucune route de scan n'existe aujourd'hui (seule la route 92 passe une commande entière en `checkedIn`). Le paiement sur place en a besoin.

- **182** POST `/v1/admin/checkins` — `{ "eventId", "qrValue" }` ou `{ "eventId", "ticketCode" }` (saisie manuelle). Valide le billet et, s'il est payé/gratuit, l'enregistre comme entré. **200** :

```json
{
  "result": "checked_in",
  "ticket": { "id", "ticketCode", "ticketTypeName", "holderName", "paymentStatus": "paid", "chargedPriceCents": 1300, "checkedInAt": "ISO" },
  "reservation": { "id", "bookingRef", "ticketsTotal": 4, "ticketsCheckedIn": 2 },
  "checkinId": "uuid"
}
```

`result` ∈ `checked_in | payment_due`. `payment_due` = billet non payé en paiement sur place : pas encore entré ; l'entrée encaisse (route 184) puis rescanne (ou passe `"checkInAfterPayment": true` sur la 184). **Erreurs :** `409 already_checked_in` (avec le `checkedInAt` précédent), `422 wrong_event` (avec le titre de l'événement du billet), `404` code inconnu, `410` billet libéré.

- **183** DELETE `/v1/admin/checkins/:checkinId` — annuler un scan erroné. **204**.
- **184** POST `/v1/admin/tickets/:ticketId/collect-payment` — `{ "method": "cash | card_terminal", "amountCents", "checkInAfterPayment": true }` → billet `paid` (`paidVia: "door"`), enregistré comme transaction à l'entrée dans les finances. **200** avec la forme de billet du § L.9.
- **185** GET `/v1/admin/events/:id/guests?q=&status=` — recherche dans la liste des invités à l'entrée : nom du titulaire, ticketCode, type de billet, `paymentStatus`, `checkedInAt`. Liste par curseur.

Utiliser la table existante `ticket_checkins` pour les passages à l'entrée, afin que `checkedInAt` soit une vraie heure de scan (Phase 3 T7/T8).

### L.10 EXT routes 90–94, 95 — commandes, participants, finances

- Les commandes et les participants gagnent `paymentMode`, `paymentStatus`, `paidCents`, `dueCents`, et `paymentStatus` par billet. Filtre `paymentStatus=`.
- Les transactions financières incluent les paiements à l'entrée (`provider: "door"`, `method: cash | card_terminal`) et les paiements dans l'application avec le vrai prestataire.
- Le résumé des entrées (route 94) gagne `unpaidCount` et `releasedCount`.

---

## M. Tâches de fond

| Tâche | Fréquence | Effet |
| ----- | --------- | ----- |
| Expiration des blocages | chaque minute | Blocages expirés (§ G.1) et réservations `awaitingPayment` au-delà de `paymentDueAt` → places libérées, réservation `expired` |
| Libération du paiement sur place | chaque minute | § G.6 |
| Rappels avant libération | toutes les 5 min | Notifier les titulaires 2 h et 30 min avant la libération |
| Statut des événements | chaque minute | `published → live → completed` d'après les horaires |
| `openNow` des lieux | à la lecture ou toutes les 5 min | § D.1 |
| Classements | chaque heure | Scores du § E par ville et par période |
| Agrégats de notes | à l'écriture d'un avis | `rating` des lieux / organisateurs, `summary` des avis |
| Suppression de compte | chaque jour | § K.4 |
| Export de données | en file d'attente | § K.5 |
| Rotation du code du lieu | toutes les 24 h | § L.8 |

---

## N. Questions ouvertes pour OPTIDEEP

1. **Prestataire de paiement.** La spec suppose Stripe (la Phase 2 F stocke déjà `provider: "stripe"`), via le module de prestataires de paiement d'Odoo s'il convient. Les données de staging sont en **MAD** (Tanger) alors que la maquette est en **EUR** (Paris) : Stripe n'accepte pas les marchands marocains. Quel(s) prestataire(s) par pays — Stripe pour l'EUR, CMI (ou autre) pour le MAD ? Les routes du § G sont indépendantes du prestataire (`provider` + `clientSecret`) ; indiquez-nous ce dont le SDK a besoin.
2. **Heure de libération** quand `lastEntryAt` est null : nous proposons début de l'événement + 2 h. À confirmer, ou proposez une autre valeur par défaut.
3. **Propriété des artistes.** En Phase 4, les artistes sont créés par les organisateurs. Plus tard, les artistes revendiqueront leur profil (parcours « Devenir artiste »). Qui fusionne les doublons, et souhaitez-vous un champ `claimedByUserId` dès maintenant ?
4. **Vote en temps réel.** L'interrogation toutes les 5 s avec ETag vous convient-elle pour la v1 ? Si Odoo peut servir du SSE (`GET /v1/events/:id/vote-list/stream`) à moindre coût, dites-le-nous.
5. **Fournisseur musical.** Les suggestions utilisent Deezer aujourd'hui (recherche gratuite + extraits de 30 s). Nous prévoyons de garder Deezer pour les suggestions et le vote en v1, et d'utiliser Spotify uniquement pour les pages artistes (de notre côté). Confirmez que le modèle de suggestion reste étiqueté par fournisseur (`provider: "deezer"`) pour pouvoir ajouter Spotify/Apple Music plus tard.
6. **Suivi de lieu ou d'organisateur.** Les lieux ont un `organizer_id` unique ; une table `venue_follows` séparée vous convient-elle, ou préférez-vous rattacher le suivi d'un lieu à celui de son organisateur ?
7. **Éligibilité aux avis** tant que le scan à l'entrée n'est pas utilisé partout : accepter les réservations `confirmed` dont l'événement est terminé ?
8. **Économies multi-devises** (§ H.2) : d'accord pour ne sommer que la devise dominante ?
9. **Liste des équipements** (§ D.1) : proposition `cloakroom, terrace, smoking_area, accessible, card_payment, parking, vip_area, dance_floor, live_music, food, wifi`. Ajoutez ou renommez librement ; c'est une liste fermée.
10. **Âge minimum** pour créer un compte (nous proposons 16 ans), et faut-il faire respecter le `minAge` des événements au paiement (ce qui exige `dateOfBirth`) ?
11. **Langue.** Confirmez que `/v1/me/settings` a un champ `language` (`en | fr`) et que les e-mails (billets, reçus) l'utilisent.
12. **Volume de la carte.** `GET /v1/venues?view=pin&bbox=` avec jusqu'à 500 éléments est-il assez rapide, ou faut-il un regroupement (clustering) côté serveur ?

---

## O. Ordre de mise en œuvre (recommandé)

| Lot | Contenu | Débloque |
| --- | ------- | -------- |
| **P4-0** | Prérequis du § B | Tout (les partenaires peuvent de nouveau créer des événements) |
| **P4-A** | Champs événement et billets § C.2–C.3 + champs d'écriture événement/tarifs § L.1 | Page événement, cartes, prix promo et prix sur place, « Plus que N places » |
| **P4-B** | Lieux § D + champs de lieu § L.2–L.3 | Épingles de lieux, fiche lieu, page lieu |
| **P4-C** | Blocages + paiements + paiement sur place § G, champs de réservation § H, contrôle des entrées § L.9–L.10 | Vrai paiement, statuts des réservations, opérations à l'entrée. **Le lot le plus lourd ; trancher dès maintenant la question du prestataire (§ N.1).** |
| **P4-D** | Profil § K (nom d'utilisateur, upload de la photo, délai de suppression, export) | Modifier le profil, réglages du compte |
| **P4-E** | Avis § I | Avis sur les lieux/organisateurs, Mes avis |
| **P4-F** | Artistes § F + § L.4–L.5 + § E.2 | Onglet Artistes, page artiste, line-ups |
| **P4-G** | Vote musical § J + morceaux enregistrés + § L.6–L.8 | Vote en direct, Favoris → Morceaux |
| **P4-H** | Filtres serveur § C.1, classements § E.1, `bbox` § D.2 | Passage à l'échelle : Découvrir et Carte sur de gros catalogues |

L'application mobile peut livrer l'interface Carte/Découvrir/Réservations sur les données actuelles pendant que P4-A à C arrivent ; les fonctionnalités s'activent au fil des lots.

---

## P. Correspondance avec les écrans de la refonte

| Écran | Utilise |
| ----- | ------- |
| **Carte** — épingles d'événements, prix, flamme « en direct », carrousel | Route 1 (+ § C.1/C.2) |
| Carte — épingles de lieux, filtres par catégorie, recherche | 128 (`view=pin`, `bbox`, `q`) |
| Carte — fiche événement | 2, 3, routes organisateur (Phase 2 I) |
| Carte — fiche lieu | 129, 131, 132, 133/134, 157 (+ note Google via notre proxy) |
| **Découvrir** — rangées d'événements, filtres, recherche | 1 (+ § C.1) |
| Découvrir — rangées de lieux | 136, 128 |
| Découvrir — rangées d'artistes | 137, 138, 142/143 |
| **Page événement** | 2, 3, 119 (galerie), 141 (line-up), 158 (avis), 5, 6, 160–167 (musique), Phase 2 K (favori) |
| **Page lieu** | 129–135, 157, 155 |
| **Page organisateur** | Phase 2 I.1–I.5 (+ résumé des avis), 156 |
| **Page artiste** | 139, 140, 142–144 |
| **Paiement** | 145–148, 149, Phase 2 L.1 (+ § G.4), Phase 2 F (cartes enregistrées) |
| **Réservations** liste + billets | Phase 2 L.2/L.3 (+ § H), 148 (« Payer X maintenant »), 153, annulation L.4 |
| **Profil** en-tête + vue d'ensemble | Phase 2 C.1 (+ § K.1) |
| Modifier le profil | C.3, 168, 169 |
| Réglages du compte | Clerk (de notre côté) + 170, 171, Phase 2 G |
| Moyens de paiement | Phase 2 F, 151, 152 |
| Notifications | Phase 2 E |
| Favoris | Phase 2 K, J.3, 135, 144, 165–167 |
| Mes avis | Phase 2 N.3 (+ § I.6), 154, 155, 156, 159 |
| **Admin** — formulaire événement | 78/79 (+ § L.1), 172–175 |
| Admin — formulaire lieu | 82/84 (+ § L.2) |
| Admin — musique | 108 (+ ext), 176–181 |
| Admin — entrée / participants / commandes / finances | 182–185, 90–95 (+ § L.10) |

---

## Liste de vérification (pour l'équipe API)

- [ ] Prérequis du § B planifiés en premier
- [ ] Chaque nouveau champ a un emplacement de stockage dans les modèles Odoo (lieu, événement, type de billet, billet, réservation, paiement, artiste, line-up, liste de vote, morceau enregistré, suivi de lieu, suivi d'artiste, avis lieu/organisateur, vote « utile »)
- [ ] Prestataire de paiement choisi par devise (§ N.1) et route de webhook joignable par le prestataire
- [ ] La disponibilité des places tient compte des blocages, des paiements « maintenant » en attente et des réservations payables sur place
- [ ] Les tâches de libération et d'expiration sont idempotentes
- [ ] Les routes publiques acceptent un JWT optionnel (§ A.1)
- [ ] Réponses écrites aux questions ouvertes du § N
