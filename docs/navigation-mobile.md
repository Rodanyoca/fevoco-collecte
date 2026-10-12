# Navigation mobile — 12 octobre 2026

La navigation inférieure comporte quatre onglets : Accueil, Acteurs, Recherche et Paramètres. L’onglet actif est indiqué par son icône, sa couleur et un attribut accessible. Le menu reste visible pendant le défilement.

- Accueil : nom du club, effectifs, ajout rapide, accès à la recherche, exports Excel/PDF et modèles. Le périmètre d’export indique les critères et le nombre de fiches.
- Acteurs : liste compacte, filtre par type, consultation, modification et suppression.
- Recherche : saisie immédiatement disponible, résultats en direct sur nom/téléphone/e-mail, filtre par type et accès à l’export de cette sélection depuis l’accueil.
- Paramètres : modification du nom du club, informations sur le stockage local et installation lorsqu’elle est proposée par le navigateur.

Les filtres de la liste et de la recherche sont indépendants. Un retour depuis une fiche conserve le contexte de recherche. Quitter un formulaire modifié demande confirmation. Les marges inférieures préservent l’accès aux actions au-dessus du menu fixe ; les zones de sécurité du téléphone sont prises en compte.

## Vérification

Les quatre scénarios Playwright passent : navigation mobile, parcours complet hors ligne avec fermeture/réouverture du navigateur et mise à jour sans perte, refus d’un cache incomplet et réparation d’un cache corrompu. Le scénario de navigation vérifie les largeurs 320, 390, 600 et 1440 pixels, les zones tactiles, le débordement horizontal, les critères conservés et les exports depuis l’accueil.

Les captures Accueil, Acteurs, Recherche, Paramètres et bas du formulaire ont été inspectées. Les six tests unitaires/export restent applicables. Le stockage IndexedDB et les formats d’export ne sont pas modifiés par ce lot.

## Limites

Vérification dans Chromium sous Windows avec dimensions mobiles simulées. Le clavier virtuel, les encoches et l’installation sur téléphone physique, notamment Safari/iOS, restent à vérifier. Les données restent propres au navigateur et à l’appareil.

## Correction avant configuration

Le rendu redirigeait tous les onglets vers les paramètres lorsque le nom du club était vide. Le blocage a été reproduit en développement et couvert par un test navigateur avant correction. Les quatre onglets restent maintenant accessibles. Seul l’ajout d’une fiche demande le club, avec une explication et le focus dans le champ. Le nouveau test passe en développement et en production ; les cinq scénarios navigateur passent, ainsi que les six tests unitaires/export et le lint.
