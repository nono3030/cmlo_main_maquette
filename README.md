# CLMO — Gestion des stocks médicaux

Outil sur mesure de gestion des stocks des réserves centrales d'un centre médical
(entrées, sorties, péremptions, pertes). Phase 1 : Pharmacie, Consommables, Papeterie.
Statut : avant-projet. Process proposé : une liste par réserve, « + Entrée » / « − Sortie » sur la ligne de l'article,
et un écran de sortie sur tablette devant les armoires (prénom, produit, quantité, pour qui).

- `index.html` : page d'accueil (racine du site Vercel), liens vers la maquette et les versions
- `context.md` : brief du projet
- `workflows.md` : le process (entrées, sorties, règles, mise en place, questions pour l'atelier)
- `prototype/stock-entry-workflows.html` : maquette interactive, dernière version (ouvrir dans un navigateur)
  (ajouter `#sortie` à l'adresse pour ouvrir directement l'écran tablette)
- `versions/` : les versions successives de la maquette (V1 à V11, `index.html` pour la liste) ;
  V1 à V6 = parcours A à D, V7 = 4 méthodes, V8 = une liste par réserve, V9 = V8 + écran de sortie tablette,
  V10 = design system, tableau de bord en page d'accueil, entrées et sorties signées,
  V11 = page Réglages (lieux de stockage, alertes, personnel, destinations)
- `audit/` : `test_v8_liste.js` teste les écrans de l'ordinateur (`node audit/test_v8_liste.js prototype/stock-entry-workflows.html`) ;
  `test_v9_sortie.js` teste l'écran tablette (`node audit/test_v9_sortie.js prototype/stock-entry-workflows.html`) ;
  `test_v10_dashboard.js` teste le tableau de bord (`node audit/test_v10_dashboard.js prototype/stock-entry-workflows.html`) ;
  `test_v11_reglages.js` teste la page Réglages (`node audit/test_v11_reglages.js prototype/stock-entry-workflows.html`) ;
  les quatre demandent Playwright (`NODE_PATH` vers un `node_modules` qui le contient) ;
  `test_v7_methodes.js` teste `versions/v7.html` ; les autres scripts et captures concernent V1 à V6 (audit du 06/11/2026)

Maquette de discussion : données fictives, rien n'est enregistré.
