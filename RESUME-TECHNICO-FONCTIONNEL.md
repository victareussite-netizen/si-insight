# SI Insight — Résumé Technico-Fonctionnel

## Qu'est-ce que c'est ?

SI Insight est une plateforme numérique permettant de **prédire l'impact d'une mise à jour sur le SI**. Elle simule un Système d'Information complet côté client, sans backend ni ML.

---

## Comment c'est modélisé ?

Le SI est représenté comme un **graphe orienté** :

- **Nœuds** = les applications (chacune décrite par un objet enrichi : nom, criticité, technologie, SLA, coût, propriétaire…)
- **Arêtes** = les flux qui les relient, **directionnels** (source → cible)

### Les 5 types de flux

| Type | Rôle |
|------|------|
| `api` | Appel synchrone d'API (REST, RFC/BAPI) |
| `data` | Transfert de données (ETL, JDBC, DirectQuery) |
| `auth` | Authentification / provisioning (SAML, LDAP, OAuth, SCIM) |
| `file` | Transfert de fichiers (SFTP) |
| `event` | Notification événementielle (SMTP) |

---

## Comment sont identifiées les dépendances ?

Les applications sont liées entre elles par des flux, ce qui crée des **dépendances directes** (1 hop) mais aussi **en cascade** (N hops).

Pour identifier les processus liés entre eux, un **algorithme BFS (parcours de graphe en largeur)** explore, depuis chaque nœud, tous les nœuds encore non visités qui sont connectés. Cela permet de mesurer :

- **Downstream** (→) : *qui est impacté si ce nœud tombe ?*
- **Upstream** (←) : *de qui ce nœud dépend-il ?*
- **Cascade** (↔) : *quelle est la zone de blast totale ?*

> **Point important** : les flux sont orientés (A → B), c'est l'analyse BFS qui peut être bidirectionnelle, pas les flux eux-mêmes.

---

## Comment l'app simule la prédiction ?

La **criticité** est le premier multiplicateur du moteur de prédiction, organisée en 3 niveaux :

| Niveau | Poids |
|--------|-------|
| **Critique** | 30 pts |
| **Important** | 20 pts |
| **Standard** | 10 pts |

Le moteur calcule un **score d'impact sur 100**, réparti sur **4 axes pondérés** :

| Axe | Ce qu'il mesure | Calcul | Max |
|-----|-----------------|--------|-----|
| **Criticité** | Importance intrinsèque de l'app retirée | critique=30, important=20, standard=10 | 30 |
| **Flux cassés** | Nombre d'intégrations rompues | nb_flux × 4 (plafonné) | 25 |
| **Processus impactés** | Chaînes métier brisées ou dégradées | broken × 8 + degraded × 3 (plafonné) | 25 |
| **Effet cascade** | Propagation dans le graphe (BFS) | nb_apps × 2 + profondeur_max × 5 (plafonné) | 20 |

Puis la **sévérité** en découle :

| Score | Sévérité |
|-------|----------|
| ≥ 75 | **Critical** |
| ≥ 50 | **High** |
| ≥ 25 | **Medium** |
| < 25 | **Low** |

---

## Quand un nœud manque dans un processus

La criticité de l'app manquante détermine la gravité :

- App **critique** manquante OU 2+ apps manquantes → processus **BROKEN**
- 1 seule app non-critique manquante OU flux manquant → processus **DEGRADED**
- Tout présent → processus **OK**

---

## En une phrase

> **Plus un nœud est connecté, critique, et central dans les processus métier, plus son retrait a un score d'impact élevé** — sans aucun ML, uniquement via analyse structurelle du graphe et pondération déterministe.
