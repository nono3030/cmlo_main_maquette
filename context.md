# Brief — clmo (gestion des stocks médicaux)

> Modifiable depuis Telegram : « Ajoute au contexte du projet clmo : … »
> Source : call du 5 novembre 2026, 16:46 CET, résumé fourni par Elie (informations déclarées, non vérifiées indépendamment).

## Qui
- **Client :** centre médical CLMO. **Responsable opérationnelle :** Leila Dizi (c'est elle qui tranche le processus).
- **Prestataires :** Arnaud Lavesque, Étienne Lavigne, Élie Bannes.
- **Identité enregistrée par hypothèse :** type `client-whitelabel`, `brand: none` ; ni site, ni repo, ni charte fournis.

## Situation actuelle
- Stock géré à la main, inventaire Excel une fois par an.
- Pertes estimées par le client à **environ 15 % par péremption** : estimation à mesurer/valider, jamais présentée comme un KPI.

## Périmètre
- **Phase 1 : réserves centrales.** Pharmacie (médicaments/vaccins, approvisionnement 1 à 2 fois par semaine),
  Consommables (hebdomadaire), Papeterie (commandes ponctuelles, plus volumineuses).
- **Phase 2 :** cabinets individuels.
- **Poste fixe** préféré ; tablette/mobile non prioritaires.
- **Exclus :** Odoo (rejeté, trop complexe), Mediway (exclu en phase 1 : aucun connecteur, import ou synchro), Slack/Teams.
  Alertes : visuelles dans l'outil et/ou e-mail, à étudier.

## Priorités de conception
- Saisie extrêmement simple, peu de champs ; traçabilité des entrées/sorties, des péremptions et des pertes.
- **Article (référence) :** désignation/marque + format/dosage (ex. seringue 3 ml / 5 ml). Rien d'autre d'obligatoire.
- **À la réception :** quantité + date d'entrée (préremplie) + péremption si applicable + pièce.
- **Numéro de lot :** non confirmé ; seulement proposé comme champ facultatif à valider.
- **Alerte péremption :** proposition de 3 mois avant pour médicaments/vaccins, réglable ; ce n'est pas une règle réglementaire.
  Consommables/papeterie peuvent ne pas avoir de péremption.
- **Aucun matériel ni process d'entrée en place** (précisé par Elie le 8 novembre 2026) : pas de lecteur de codes-barres.
  Le besoin : suivre ce qui entre et ce qui sort, **sans gestion des commandes ni facturation**, avec un process limpide.
  Proposition retenue le 8 novembre 2026 : **une liste par réserve, rangée comme les étagères** ; sur la ligne de l'article,
  « + Entrée » (quantité + péremption) ou « − Sortie » (quantité + motif). Matériel : l'ordinateur du centre (voir `workflows.md`).

- **Écran de sortie sur tablette** (ajouté à la maquette le 11 novembre 2026, à la demande d'Arnaud) : devant l'armoire,
  prénom + produit + quantité + destination (« Dr A »), valider. Cela nuance « tablette non prioritaire » ci-dessus :
  l'ordinateur reste le poste principal, la tablette ne sert qu'aux sorties. À valider avec Leila Dizi.

## Initialisation
- Pendant l'inventaire annuel fin 2026 : **ne pas saisir les produits déjà périmés** ; ensuite, chaque livraison est saisie dès réception.
- Visite sur site envisagée pour l'inventaire initial.

## Démarche et échéances (issues du call)
- Livrer 2 à 3 workflows à discuter avant devis/cahier des charges ; jusqu'à 3 allers-retours.
- Semaine du 9 novembre 2026 : réception de l'ancien inventaire (Excel) ; envoi des propositions de workflows.
- Mi-novembre 2026 : arbitrage du processus.
- Courant novembre 2026 : devis / cahier des charges. Fin novembre 2026 : signature.
- **Mise en service avant le 31 décembre 2026.**

## Livrables
- `projects/clmo/workflows.md` : le process « une liste par réserve » (entrées, sorties, règles, mise en place, questions pour l'atelier).
  Pistes écartées le 8 novembre 2026 : parcours A à D (lecteur USB, `versions/v1` à `v6`) et 4 méthodes (`versions/v7`).
- `projects/clmo/prototype/stock-entry-workflows.html` : maquette de discussion interactive (données fictives, rien d'enregistré) ;
  V11 depuis le 12 novembre 2026 : design system, tableau de bord en page d'accueil, page Réglages (lieux de stockage,
  délai d'alerte de péremption par lieu, seuil « bientôt épuisé » à 3 unités au départ, personnel, destinations), écran de sortie tablette via `#sortie`, entrées et sorties signées (prénom, destination).
