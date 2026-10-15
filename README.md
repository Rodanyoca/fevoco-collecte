# FEVOCO · Collecte club

PWA autonome pour recueillir l’identification des acteurs d’un seul club. Le dépôt est indépendant de `fevoco-cible` et ajouté au fichier `febaco-reference.code-workspace`.

## Démarrer

Node.js 22.12+ ou 24 recommandé.

```powershell
cd C:\Projets\SNDS-HARMONISATION\fevoco-collecte
npm.cmd ci
npm.cmd run build
npm.cmd start
```

Ouvrir **http://127.0.0.1:4174/**. Après la première ouverture en ligne, attendre **Prête hors ligne** avant de couper la connexion. Revenir ensuite à la même adresse, avec le même navigateur et le même profil. L’application peut être installée depuis le navigateur lorsqu’il propose cette fonction.

`npm.cmd run dev` sert au développement ; son cache hors ligne est volontairement désactivé. Utiliser le build de production pour vérifier le fonctionnement hors ligne. Le serveur fourni sert exclusivement les fichiers statiques ; il ne reçoit ni ne stocke aucune fiche. Il écoute uniquement sur la boucle locale.

## Fonctionnalités

- Nom du club renseigné une fois, modifiable pour l’ensemble du registre.
- Liste compacte, recherche insensible aux accents sur nom/téléphone/e-mail et filtre par type.
- Création, consultation, modification, suppression avec confirmation.
- Types : Athlète, Entraîneur, Médecin, Officiel, Arbitre, Autre.
- Obligatoires : nom complet, type et sexe. La date d’affiliation au club est facultative.
- Facultatifs : naissance, adresse, téléphone et e-mail.
- Date d’affiliation initialement vide ; aucune confusion avec une date de création.
- Saisie des dates en chiffres avec formatage JJ/MM/AAAA, validation des dates civiles et années bissextiles. Naissance non future et affiliation non antérieure à une naissance renseignée.
- Téléphone conservé comme texte, préfixes et zéros compris.
- Aucun rattachement territorial, compte, licence ou code fédéral.
- Aperçu Excel et PDF accessible par « Voir les modèles Excel et PDF ».
- Style institutionnel FEVOCO repris : logo local, bleu marine, actions bleues et accent or ; interface adaptée au téléphone.

## Navigation mobile

Quatre onglets restent accessibles en bas : **Accueil** (effectifs, ajout et exports), **Acteurs** (liste et filtre par type), **Recherche** (recherche directe et filtre) et **Param?tres** (nom du club, stockage et installation). Les exports sont regroup?s sur l?accueil. La s?lection export?e reprend les crit?res de l?onglet Recherche ; le filtre de la liste Acteurs reste ind?pendant.

Voir [le rapport de navigation mobile](docs/navigation-mobile.md).

## Stockage et fonctionnement hors ligne

IndexedDB contient deux magasins : `config` pour le nom du club et `people` pour les fiches. La clé interne ne paraît ni dans les interfaces visibles ni dans les exports. Les écritures sont confirmées seulement à la fin de la transaction IndexedDB. Un échec de stockage laisse le formulaire disponible ; aucune sauvegarde en mémoire n’est présentée comme durable.

Le build génère un service worker et un manifeste de **tous** les fichiers de production : HTML, styles, tous les modules JavaScript y compris ceux des exports, polices TTF locales, logo, icônes et manifeste d’installation. Chaque ressource est contrôlée par SHA-256 avant mise en cache et lors de la vérification du statut. Une ressource absente ou une page HTML retournée à sa place interdit le statut « Prête hors ligne ». Un cache corrompu peut être réparé en ligne avec « Préparer à nouveau ».

Les mises à jour sont préparées dans un cache distinct. L’utilisateur choisit leur activation ; une fiche en cours doit d’abord être enregistrée ou annulée. Le service worker ne supprime jamais IndexedDB. Les anciens caches restent disponibles pour les autres onglets encore ouverts.

Le stockage persistant est demandé au navigateur après l’enregistrement du club ; celui-ci peut le refuser. Effacer les données du site, changer de navigateur/profil ou perdre l’appareil peut faire perdre le registre. Exporter régulièrement. Les exports ne sont pas des sauvegardes réimportables automatiquement dans cette version.

## Export Excel

Véritable `.xlsx` généré localement par ExcelJS :

- feuille **CLUB** : nom du club ;
- feuille **ACTEURS** : Nom du club, Type d’acteur, Nom complet, Sexe, Date de naissance, Date d’affiliation au club, Adresse, Téléphone, E-mail ;
- dates comme cellules de date, affichées `dd/mm/yyyy` ;
- téléphones comme chaînes de texte avec format texte ;
- champs facultatifs absents vides, aucune clé interne ;
- en-tête figé, filtre, renvoi à la ligne et largeur de colonnes définie.

Le périmètre « Toutes les fiches » ou « Sélection filtrée » est affiché dans les boutons, avec le nombre de fiches, et repris dans le nom du fichier.

## Export PDF

Acteurs regroupés par type, puis triés par nom dans chaque catégorie. Les titres de catégorie et les en-têtes sont répétés sur les pages suivantes.

Génération locale par jsPDF et AutoTable, sans service externe. Noto Sans régulier et gras sont embarqués pour les accents.

A3 paysage : nom du club, titre **Registre d’identification des acteurs**, date de génération, périmètre, tableau des huit champs, en-têtes répétés et pagination Page X / Y. Les textes reviennent à la ligne ; une ligne est conservée sur une page lorsqu’elle y tient. Les valeurs absentes restent vides.

## Exemples pour validation

Les exemples sont distincts des données de l’application et ne sont jamais insérés dans IndexedDB.

- [Modèle Excel](output/modeles/exemple-registre.xlsx)
- [Modèle PDF](output/modeles/exemple-registre.pdf)
- [Exemple PDF avec textes longs et plusieurs pages](output/modeles/exemple-multipage.pdf)

Régénération : `npm.cmd run examples`.

## Vérifier

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

Six tests unitaires/export et trois scénarios navigateur. Le parcours principal coupe le réseau, crée/modifie des fiches, ferme le processus navigateur, rouvre son profil hors ligne, exporte les deux formats, renomme le club, applique un nouveau service worker, vérifie les clés et dates conservées, puis supprime une fiche hors ligne avec confirmation. Les autres scénarios refusent un cache incomplet et détectent/réparent un cache dont une police a été remplacée par du HTML.

Les profils de test utilisent `.qa-profile/`, hors données réelles. Le serveur de test est arrêté automatiquement. Voir [le rapport de validation](docs/validation-v1.md).

## Hébergement

Publier le contenu de `dist/` à la racine d’une origine HTTPS dédiée. Servir `sw.js` et `index.html` sans cache HTTP prolongé ; conserver les noms des ressources générés par le build. Une application accessible uniquement en HTTP sur une adresse réseau de téléphone ne peut pas préparer de service worker. HTTPS ou localhost est requis par [l’API Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers).

Aucun hébergement ni dépôt GitHub distant n’a été créé. Le dépôt Git est local. Aucun service tiers n’est nécessaire pendant la collecte ou les exports.

## Limites de la première version

Vérifié avec Chromium sous Windows et des fenêtres de 1440 × 1000 et 390 × 844. Installation sur un téléphone réel, Safari/iOS et autres navigateurs restent à vérifier. L’intégration d’aperçu PDF dépend du lecteur du navigateur ; un lien d’ouverture en plein écran et le téléchargement restent disponibles.

Les données sont propres à une origine, un profil et un appareil ; aucune synchronisation, import, sauvegarde automatique, chiffrement applicatif ou gestion multiutilisateur. Éviter de modifier simultanément la même fiche dans plusieurs onglets : la dernière sauvegarde l’emporte. Les très grands registres ne sont pas dimensionnés dans ce lot ; les exports sont construits en mémoire. Les caches de versions précédentes sont conservés pour les onglets ouverts et peuvent consommer de l’espace au fil des mises à jour.

## Références et licences

[Cache / Service Worker](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching), [ExcelJS](https://github.com/exceljs/exceljs), [jsPDF AutoTable](https://github.com/simonbengtsson/jsPDF-AutoTable).

La licence SIL Open Font License des polices Noto Sans est dans `public/fonts/LICENSE.txt`. Le logo provient de l’application FEVOCO existante. Les bibliothèques gardent leurs licences dans les dépendances installées.
