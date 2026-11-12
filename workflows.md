# CLMO — Le process : une liste par réserve

> Document de discussion pour l'atelier avec Leila Dizi (arbitrage mi-novembre 2026).
> Maquette interactive associée : `prototype/stock-entry-workflows.html` (données fictives, rien n'est enregistré,
> recharger la page remet tout à zéro). Rien ici n'est décidé : c'est une proposition à tester.

## Pourquoi ce process (8 novembre 2026)

- Le centre n'a aujourd'hui **ni matériel ni process** : stock tenu à la main, inventaire Excel une fois par an.
- Le besoin est de suivre **ce qui entre et ce qui sort**, sans gestion des commandes ni facturation.
- Il faut un process **limpide, sans exception à apprendre**.

Les pistes précédentes sont donc écartées :
- les parcours A à D (`versions/v1` à `v6`) supposaient un lecteur de codes-barres ;
- les 4 méthodes de `versions/v7` (clavier, fiche papier, tablette, douchette) laissaient trop de cas particuliers :
  produits sans code-barres, codes multiples, recherche d'article, création de fiches au fil de l'eau.

Le process retenu reprend la **fiche de stock**, la méthode de référence en logistique médicale (une fiche par article,
où l'on note chaque entrée et chaque sortie), sous forme d'un écran par réserve.

## Le principe

Chaque réserve (Pharmacie, Consommables, Papeterie) a **sa liste d'articles, rangée comme ses étagères** :
une section par étagère (A, B, C…), avec la même étiquette sur l'étagère et à l'écran.
Chaque ligne montre le nom, le format, le stock dans l'unité de comptage (boîte, dose, flacon…), la prochaine péremption,
et deux boutons : **+ Entrée** et **− Sortie**.

Tout ce qui entre ou sort passe par la ligne de l'article : **trois gestes, toujours les mêmes**.

| # | + Entrée (une livraison arrive) | − Sortie (un produit part) |
|---|---|---|
| 1 | Ouvrir la réserve, trouver la ligne (par l'étagère, ou en tapant 2 ou 3 lettres) | Ouvrir la réserve, trouver la ligne |
| 2 | Cliquer **+ Entrée** | Cliquer **− Sortie** |
| 3 | Taper la quantité et, si l'article en a une, la péremption lue sur l'emballage (`06/2027`), choisir son prénom, valider | Taper la quantité, choisir son prénom, le motif (utilisé, périmé, perdu ou cassé) et pour qui c'est, valider |

**Exemple :** 100 vaccins A arrivent → Pharmacie → étagère Frigo → **+ Entrée** → `100`, `06/2027` → Valider.
Le stock passe de 20 à 120 doses, en 15 secondes environ.

À la sortie, l'outil retire **de lui-même ce qui périme le plus tôt**, comme on le fait sur l'étagère : pas de date à choisir.

## La sortie sur tablette (ajout du 11 novembre 2026)

Devant l'armoire, la personne prend la tablette, qui n'affiche **que l'écran de sortie** (`#sortie` dans l'adresse) :

1. **Qui êtes-vous ?** elle touche son prénom ;
2. **Quel produit ?** elle tape 2 ou 3 lettres et touche le produit (recherche dans les trois réserves) ;
3. **Combien ?** boutons − / +, ou saisie directe ;
4. **Pour qui ?** elle touche la destination (par exemple « Dr A ») ;
5. **Valider la sortie.** Un bandeau confirme, avec « Annuler » ; l'écran revient à zéro pour la personne suivante.

La sortie apparaît dans Mouvements avec deux colonnes de plus : **Par** et **Pour**. Elle est notée « Utilisé ».
Sur l'ordinateur, « + Entrée » demande aussi le prénom, et « − Sortie » pose les mêmes questions (prénom, pour qui) ; « Pour qui ? » n'est demandé que pour
le motif « Utilisé », pas pour « Périmé » ni « Perdu, cassé ». Prénom et destination s'y choisissent dans une liste déroulante.
Le motif décide des lots : « Utilisé » ne prend jamais un lot périmé, « Périmé » ne prend que des lots périmés.
La tablette **ne propose jamais un lot périmé** : les périmés se sortent sur l'ordinateur, motif « Périmé ».

Dans la maquette, prénoms et destinations sont fictifs et figés. À valider avec le centre : la liste réelle, qui la tient
à jour, une tablette par armoire ou une seule, et si la tablette doit se limiter aux produits de son armoire.

## Le tableau de bord (ajout du 12 novembre 2026)

Page d'accueil de l'ordinateur : tout le stock d'un coup d'œil, puis on affine.

- **Quatre chiffres :** articles suivis, bientôt périmés, bientôt épuisés, en rupture ou périmés, chacun avec sa part du total.
- **Une barre par réserve :** la proportion d'articles sans alerte, bientôt périmés, bientôt épuisés, en rupture ou périmés.
  Un article n'y est compté qu'une fois, dans son état le plus grave.
- **« À traiter » :** la liste des articles en alerte, les plus graves d'abord.
- **Affiner :** cliquer un chiffre filtre par état, cliquer une réserve filtre par réserve ; cliquer une ligne ouvre la
  réserve, filtrée sur l'article, pour faire l'entrée ou la sortie.

« Bientôt épuisé » = il reste 3 unités ou moins au départ ; le seuil se change dans les Réglages.
Le tableau de bord ne sert qu'à lire : aucune saisie.

## Les réglages (ajout du 12 novembre 2026)

Une page, cinq blocs, volontairement très simple. Chaque changement s'applique tout de suite.

- **Lieux de stockage :** renommer, ajouter, supprimer un lieu vide. Un nouveau lieu naît avec une étagère « A ».
- **Alerte de péremption :** un délai par lieu (1, 2, 3 ou 6 mois avant).
- **Alerte d'épuisement :** un seuil pour tous les articles (3 au départ, 0 = pas d'alerte).
- **Personnel :** les prénoms proposés à chaque entrée et sortie.
- **Destinations :** les réponses à « Pour qui ? ».

Dans la maquette, rien n'est conservé au rechargement. À valider avec le centre : qui a le droit de modifier les réglages,
et s'il faut un seuil d'épuisement par article plutôt qu'un seul.

## Les seules règles à connaître

- **Date dépassée à l'arrivée :** on ne range pas, on met de côté ; l'outil refuse l'entrée.
- **Plusieurs dates dans le même carton :** une entrée par date.
- **Produit absent de la liste :** on le met de côté et on prévient la responsable, qui ajoute la ligne une fois
  (désignation, format, unité, étagère, péremption oui/non).
- **Erreur de saisie :** « Annuler » juste après, ou dans l'écran Mouvements (le dernier mouvement).
- **On compte toujours dans l'unité affichée** sur la ligne.

## Et avec 100 références ?

La maquette contient **100 articles fictifs en Pharmacie**, répartis sur 9 étagères, pour juger sur pièce :

- **par étagère :** une barre de raccourcis (A Antalgiques, B Antibiotiques… Frigo) amène directement à la bonne section ;
- **par filtre (facultatif) :** taper « vacc » réduit la liste aux 10 vaccins, et `↓` place le curseur sur le premier « + Entrée » ;
- **« À surveiller » :** n'affiche que les articles dont une péremption est proche (3 mois, à valider) ou dépassée.

Une livraison compte en général 5 à 20 références, souvent les mêmes d'une semaine à l'autre.

## Matériel et mise en place

| Quoi | Coût |
|---|---|
| L'ordinateur du centre, avec un navigateur internet | 0 € |
| Une tablette près des armoires, pour noter les sorties | à chiffrer |
| Une étiquette par étagère (A, B, C…), identique à l'écran | quelques € |

**Une fois, à l'inventaire de départ (fin 2026) :** la responsable crée la liste de chaque réserve, étagère par étagère
(à partir de l'ancien inventaire Excel si possible), et compte le stock présent. Les produits déjà périmés ne sont pas saisis.

## Ce que l'outil garde (traçabilité)

- **Chaque mouvement :** heure, réserve, article, quantité, date(s) de péremption concernées, motif de sortie.
- **Le stock de chaque article**, par date de péremption.
- **Écran Mouvements :** tout l'historique, du plus récent au plus ancien.
- **Les sorties « périmé »** donnent la mesure réelle des pertes, à comparer à l'estimation d'environ 15 %
  (sans en faire un indicateur avant d'avoir des chiffres).

## Questions à trancher avec Leila Dizi

1. Où est l'ordinateur par rapport aux trois réserves ?
2. Qui note les entrées et les sorties : une seule personne, ou plusieurs ? Faut-il savoir qui a fait chaque mouvement ?
3. Quand note-t-on une sortie : à chaque prise dans la réserve, ou en une fois (par exemple au réassort d'un cabinet) ?
4. Les trois motifs de sortie (utilisé, périmé, perdu ou cassé) suffisent-ils ?
5. La péremption au mois près (`MM/AAAA`) suffit-elle ?
6. Produit reçu déjà périmé : on le met de côté ; faut-il en garder une trace ?
7. Numéro de lot : absent, facultatif, ou obligatoire pour la pharmacie ?
8. Alerte péremption : 3 mois avant convient-il ? Seulement dans l'outil, ou aussi par e-mail ?
9. Liste de départ : on part de l'ancien inventaire Excel (attendu la semaine du 9 novembre) ? Combien de références par réserve ?
10. Inventaire de départ fin 2026 : qui, quand, avec un prestataire sur place ?

## Hors périmètre

Commandes et facturation · lecteur de codes-barres · cabinets individuels (phase 2) · Mediway (aucun connecteur,
import ni synchronisation) · Odoo · Slack/Teams.

---

## Vérification de la maquette (8 novembre 2026)

`node audit/test_v8_liste.js prototype/stock-entry-workflows.html` (Playwright) : 101 contrôles, tous OK,
à 1440×900 et 390×844.

- **Parcours :** le cas « 100 vaccins A », le filtre sans accents, les raccourcis d'étagère, la sortie qui retire
  la date la plus proche en premier, une sortie supérieure au stock refusée.
- **Contrôles de saisie et corrections :** date dépassée ou illisible refusée, « À surveiller », sortie « périmé »,
  annulation, ajout d'un article, Papeterie sans péremption, écran Mouvements.
- **Qualité :** onglets au clavier, aucune erreur JavaScript, aucun débordement horizontal, chaque champ et bouton nommé,
  identifiants uniques, aucune donnée persistée.

**Écran tablette (11 novembre 2026) :** `node audit/test_v9_sortie.js prototype/stock-entry-workflows.html` : 99 contrôles, tous OK,
à 768×1024, 1024×768 et 390×844 en tactile émulé (parcours complet, refus, annulation, périmés exclus, textes ≥ 18 px,
boutons ≥ 48 px). `test_v8_liste.js` (écrans de l'ordinateur, entrées et sorties signées comprises) : 117 contrôles, tous OK. Non testé sur une vraie tablette.

**Restent des hypothèses** (non vérifiables sans le terrain) : emplacement du poste, nombre réel de références,
moment où les sorties sont notées, durée réelle des saisies.
