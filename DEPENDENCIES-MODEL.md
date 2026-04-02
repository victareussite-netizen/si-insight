# MyCarto Preddict — Modélisation des Dépendances

## 1. Vue d'ensemble du modèle

Le SI est modélisé comme un **graphe orienté** où :

- **Les nœuds** = les applications, bases de données, infrastructures
- **Les arêtes** = les flux de données, d'API, d'authentification, de fichiers ou d'événements

Chaque relation entre deux nœuds est **directionnelle** (source → cible), ce qui permet de distinguer les dépendances ascendantes (upstream) et descendantes (downstream).

```
        ┌─────────┐    REST API     ┌─────────┐
        │   CRM   │ ──────────────► │   ERP   │
        └─────────┘                 └────┬────┘
             │                           │
        ETL Batch                    RFC/BAPI
             │                           │
             ▼                           ▼
        ┌─────────┐                 ┌─────────┐
        │   DWH   │                 │  STOCK  │
        └─────────┘                 └─────────┘
```

---

## 2. Relations entre applications

### 2.1 Structure d'une application (nœud)

Chaque application du SI est décrite par un objet enrichi :

| Propriété | Type | Rôle |
|-----------|------|------|
| `id` | `string` | Identifiant unique (ex: `'crm'`, `'erp'`) |
| `name` | `string` | Nom complet affiché |
| `shortName` | `string` | Label court pour le graphe |
| `type` | `enum` | `app` · `database` · `infrastructure` · `external` |
| `category` | `string` | Domaine fonctionnel (Commercial, Finance, RH…) |
| `criticality` | `enum` | `critique` · `important` · `standard` |
| `technology` | `string` | Stack technique (SaaS, On-Premise, COBOL…) |
| `owner` | `string` | Direction métier responsable |
| `users` | `number` | Nombre d'utilisateurs actifs |
| `sla` | `string` | Niveau de service engagé |
| `cost` | `string` | Coût annuel |

### 2.2 Les 13 entités modélisées

```
Applications (type: app)
├── CRM Salesforce          [critique]   — Commercial
├── ERP SAP S/4HANA         [critique]   — Finance & Opérations
├── Module Facturation      [critique]   — Finance
├── Site E-commerce         [critique]   — Ventes en ligne
├── Gestion des Stocks      [important]  — Logistique
├── SIRH Workday            [important]  — Ressources Humaines
├── Messagerie O365         [important]  — Communication
├── BI Power BI             [standard]   — Data & Analytics
└── Mainframe Legacy        [important]  — Historique

Infrastructure (type: infrastructure)
└── Active Directory        [critique]   — Sécurité & IAM

Bases de données (type: database)
├── BDD Oracle ERP          [critique]   — Infrastructure
├── BDD CRM Cloud           [important]  — Infrastructure
└── Data Warehouse          [important]  — Data & Analytics
```

---

## 3. Les Flux — Liens entre applications

### 3.1 Structure d'un flux (arête)

Chaque flux modélise un **échange concret** entre deux applications :

| Propriété | Type | Rôle |
|-----------|------|------|
| `id` | `string` | Identifiant unique du flux |
| `from` | `string` | ID de l'application **source** |
| `to` | `string` | ID de l'application **cible** |
| `label` | `string` | Description métier (ex: "Commandes clients") |
| `type` | `enum` | Nature du flux |
| `protocol` | `string` | Protocole technique réel |
| `frequency` | `string` | Fréquence d'échange |
| `volume` | `string` | Volume de données échangées |

### 3.2 Types de flux

Le modèle distingue **5 natures de flux**, chacune avec un encodage visuel propre :

| Type | Description | Exemples de protocoles | Couleur graphe |
|------|-------------|------------------------|----------------|
| `api` | Appel synchrone d'API | REST API, RFC/BAPI | Violet `#6C63FF` |
| `data` | Transfert de données | ETL Batch, JDBC, DirectQuery, Interne | Bleu `#1E90FF` |
| `auth` | Authentification / provisioning | SAML 2.0, LDAP, OAuth 2.0, SCIM, Azure AD | Rouge `#FF4757` |
| `file` | Transfert de fichiers | SFTP Batch | Orange `#FFA502` |
| `event` | Notification événementielle | SMTP | Vert `#2ED573` |

### 3.3 Cartographie complète des 22 flux

```
CRM ──► ERP              [api]   REST API          Commandes clients
CRM ──► DWH              [data]  ETL Batch         Données clients
ERP ──► Facturation      [data]  Interne           Données facturation
ERP ──► Stock            [api]   RFC/BAPI          Mouvements stock
ERP ──► DWH              [data]  ETL Batch         Données financières
ERP ──► DB_ERP           [data]  JDBC              Persistance données
Stock ──► E-commerce     [api]   REST API          Disponibilité stock
E-commerce ──► CRM       [api]   REST API          Nouveaux clients web
E-commerce ──► ERP       [api]   REST API          Commandes web
DWH ──► BI               [data]  DirectQuery       Cubes analytiques
AD ──► CRM               [auth]  SAML 2.0          Authentification SSO
AD ──► ERP               [auth]  LDAP              Authentification SSO
AD ──► Email             [auth]  Azure AD          Authentification SSO
AD ──► RH                [auth]  SCIM              Provisioning comptes
AD ──► E-commerce        [auth]  OAuth 2.0         Auth backoffice
AD ──► BI                [auth]  Azure AD          Auth BI
RH ──► ERP               [data]  REST API          Données employés
RH ──► Email             [event] SMTP              Notifications RH
Legacy ──► ERP           [file]  SFTP Batch        Historique compta
Legacy ──► DWH           [file]  ETL Batch         Archives données
Facturation ──► Email    [event] SMTP              Envoi factures PDF
CRM ──► DB_CRM           [data]  Interne           Persistance CRM
```

---

## 4. Dépendances directes vs indirectes

Le moteur d'impact distingue trois niveaux de résolution des dépendances, tous basés sur un **parcours BFS (Breadth-First Search)** du graphe.

### 4.1 Dépendances directes (1 hop)

**Méthode** : `getDirectDependencies(appId)`

Retourne toutes les applications connectées par **exactement 1 flux** (entrant ou sortant).

```
Exemple : dépendances directes de l'ERP

          ┌─── CRM          (flux entrant : Commandes clients)
          ├─── E-commerce    (flux entrant : Commandes web)
          ├─── RH            (flux entrant : Données employés)
          ├─── Legacy        (flux entrant : Historique compta)
  ERP ◄───┤
          ├──► Facturation   (flux sortant : Données facturation)
          ├──► Stock         (flux sortant : Mouvements stock)
          ├──► DWH           (flux sortant : Données financières)
          ├──► DB_ERP        (flux sortant : Persistance)
          └─── AD            (flux entrant : Auth SSO)

→ 9 dépendances directes
```

### 4.2 Dépendances en cascade — bidirectionnelles (N hops)

**Méthode** : `getCascadeDependencies(appId, depth = 10)`

Parcourt le graphe dans **les deux sens** (in + out) pour trouver **toutes les applications atteignables** depuis un nœud donné, avec leur **niveau de cascade**.

```
Exemple : cascade depuis le CRM

Niveau 1 : ERP, DWH, E-commerce, DB_CRM, AD         (directes)
Niveau 2 : Facturation, Stock, BI, Email, RH, DB_ERP (via ERP/DWH/AD)
Niveau 3 : Legacy                                     (via ERP → Legacy)

→ Quasi tout le SI est dans la cascade du CRM
```

**Algorithme** :
```
BFS(appId, maxDepth=10):
    visited = {appId}
    queue = [{id: appId, level: 0}]
    result = []

    tant que queue non vide:
        current = queue.dequeue()
        si current.level >= maxDepth → skip

        pour chaque app connectée (in OU out) à current:
            si app non visitée:
                visited.add(app.id)
                result.push({app, cascadeLevel: current.level + 1})
                queue.push({id: app.id, level: current.level + 1})

    retourner result
```

### 4.3 Dépendances downstream (aval uniquement)

**Méthode** : `getDownstreamDependencies(appId, depth = 10)`

Parcourt uniquement les **flux sortants**. Répond à la question : *"Qui est impacté si cette app tombe ?"*

```
Exemple : downstream de Active Directory

AD ──► CRM ──► ERP ──► Facturation ──► Email
   ──► ERP ──► Stock ──► E-commerce
   ──► Email
   ──► RH
   ──► E-commerce
   ──► BI

→ AD alimente presque tout le SI en authentification
→ Sa panne = impact systémique
```

### 4.4 Dépendances upstream (amont uniquement)

**Méthode** : `getUpstreamDependencies(appId, depth = 10)`

Parcourt uniquement les **flux entrants**. Répond à la question : *"De qui dépend cette app pour fonctionner ?"*

```
Exemple : upstream de BI

BI ◄── DWH ◄── CRM
              ◄── ERP ◄── CRM, E-commerce, RH, Legacy
              ◄── Legacy
BI ◄── AD (auth)

→ Le BI dépend de toute la chaîne data amont
```

### 4.5 Résumé comparatif

| Méthode | Direction | Question métier | Profondeur |
|---------|-----------|-----------------|------------|
| `getDirectDependencies` | ↔ bidirectionnel | "Qui est connecté ?" | 1 hop |
| `getCascadeDependencies` | ↔ bidirectionnel | "Qui est dans la zone de blast ?" | N hops |
| `getDownstreamDependencies` | → sortant | "Qui est impacté si ça tombe ?" | N hops |
| `getUpstreamDependencies` | ← entrant | "De qui je dépends ?" | N hops |

---

## 5. Notion de Criticité

La criticité est le premier multiplicateur du moteur de prédiction. Elle intervient à **trois niveaux distincts** :

### 5.1 Criticité des applications

Trois niveaux définis statiquement dans le modèle de données :

| Niveau | Couleur | Poids dans le score | Applications |
|--------|---------|---------------------|--------------|
| **Critique** | 🔴 `#FF4757` | **30 points** | CRM, ERP, Facturation, E-commerce, AD, DB_ERP |
| **Important** | 🟠 `#FFA502` | **20 points** | DWH, Stock, SIRH, Email, Legacy, DB_CRM |
| **Standard** | 🟢 `#2ED573` | **10 points** | BI |

### 5.2 Criticité des processus métier

Chaque processus métier a aussi une criticité propre :

| Processus | Criticité | Chaîne |
|-----------|-----------|--------|
| Vente en ligne (Order-to-Cash) | **critique** | E-com → CRM → ERP → Stock → Fact → Email |
| Vente B2B (Quote-to-Cash) | **critique** | CRM → ERP → Stock → Fact → Email |
| Gestion des stocks | **critique** | ERP → Stock → E-com |
| Authentification globale | **critique** | AD → CRM, ERP, Email, RH, BI, E-com |
| Reporting décisionnel | important | CRM, ERP, Legacy → DWH → BI |
| Onboarding employé | important | RH → AD → Email → ERP |
| Clôture comptable mensuelle | important | Legacy → ERP → Fact → DWH → BI |

### 5.3 Impact de la criticité sur la détection de rupture

Quand un nœud manque dans la chaîne d'un processus, la criticité de l'app manquante détermine la gravité :

```
Si app manquante est "critique" OU si 2+ apps manquantes
    → processus = BROKEN (cassé)

Si 1 seule app non-critique manquante OU flux manquant entre maillons
    → processus = DEGRADED (dégradé)

Si tous les maillons et flux présents
    → processus = OK
```

### 5.4 Impact de la criticité sur le rendu graphe

| Aspect visuel | Critique | Important | Standard |
|---------------|----------|-----------|----------|
| Couleur nœud | Rouge | Orange | Vert |
| Taille police | 14px | 12px | 12px |
| Masse physique | 3 (inertie forte) | 2 (moyenne) | 1 (légère) |

La **masse** influe sur le layout force-directed : les nœuds critiques bougent moins et attirent plus fortement les nœuds connectés, créant naturellement un **placement central** pour les éléments les plus importants du SI.

---

## 6. Synthèse : De la dépendance à la prédiction

Le chemin complet de la modélisation des dépendances jusqu'à la prédiction d'impact :

```
                    ┌──────────────┐
                    │  SI-DATA     │  ← Modèle statique (apps, flux, processus)
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  GRAPHE      │  ← Construction du graphe orienté
                    │  ORIENTÉ     │     (nœuds + arêtes directionnelles)
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
       ┌──────▼──────┐ ┌──▼──────┐ ┌───▼───────┐
       │ Dépendances │ │ Flux    │ │ Processus │
       │ BFS         │ │ cassés  │ │ impactés  │
       │ (cascade)   │ │         │ │           │
       └──────┬──────┘ └──┬──────┘ └───┬───────┘
              │            │            │
              └────────────┼────────────┘
                           │
                    ┌──────▼───────┐
                    │   SCORING    │  ← Formule pondérée 4 axes
                    │   (0-100)    │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │  SÉVÉRITÉ    │  ← critical / high / medium / low
                    │  + SANTÉ SI  │  ← opérationnel / dégradé / critique
                    └──────────────┘
```

La prédiction repose sur le principe : **plus un nœud est connecté, critique, et central dans les processus métier, plus son retrait a un score d'impact élevé** — sans aucun ML, uniquement via analyse structurelle du graphe et pondération déterministe.
