# Validation de la première version

12 octobre 2026.

## Périmètre livré

Dépôt local autonome `fevoco-collecte`, ajouté comme neuvième dossier au fichier `febaco-reference.code-workspace`. Le seul changement dans FEBACO est cette entrée de workspace, explicitement demandée. Aucun code des applications existantes n’a été modifié.

Modules : `src/model.js` (champs, dates, validation et recherche), `src/db.js` (IndexedDB), `src/main.js` (interfaces), `src/exports.js` (Excel/PDF), `src/offline.js` et `src/sw-template.js` (cache et mises à jour), `vite.config.js` (manifeste avec empreintes), serveur statique de vérification, manifeste d’installation et ressources locales.

## Contrôles automatisés

- ESLint : réussi.
- Six tests Node : dates civiles et bissextiles ; affiliation obligatoire et distincte ; recherche/filtre ; export sans clés ; relecture indépendante des cellules XLSX ; PDF multipage avec polices.
- Build Vite de production : réussi ; toutes les ressources locales incluses dans le manifeste du service worker.
- Audit npm après remplacement compatible de uuid transitif d’ExcelJS : zéro vulnérabilité signalée.
- Trois tests Playwright Chromium : réussis.

Le test principal prépare le cache en ligne, coupe le réseau avant toute saisie de personne, valide les champs requis et une date impossible, crée une athlète, consulte sa fiche et modifie son affiliation du 17/08/2024 au 18/08/2024. Il crée un entraîneur avec naissance et e-mail vides, recherche sans accents, combine les filtres, exporte la sélection d’une personne et relit le vrai XLSX.

Il ferme ensuite le processus Chromium, rouvre le même profil avec le réseau désactivé avant la navigation, retrouve les deux personnes et le club, et télécharge Excel et PDF hors ligne. Il renomme le club, vérifie le nom dans la feuille CLUB, reconstruit une version différente du service worker, active la mise à jour et vérifie les clés conservées. Après nouveau rechargement hors ligne, il annule puis confirme une suppression, recharge et exporte encore. La date d’affiliation relue dans le XLSX final reste le 18/08/2024.

Deux tests complémentaires retirent une police avant la première installation et remplacent une police déjà en cache par du HTML. Le premier interdit le statut prêt ; le second retire ce statut, puis le rétablit après réparation vérifiée en ligne.

Aucune donnée réelle n’est utilisée dans ces tests ; les profils sont distincts du navigateur utilisateur. Les exemples de modèles ne sont jamais injectés dans l’application.

## Contrôles visuels et documents

Captures Playwright inspectées : registre ordinateur, registre téléphone, formulaire téléphone. Aucun débordement horizontal de page à 390 px. Consultation, modèles et suppression sont également parcourus pendant le test.

Les fichiers Excel sont relus avec ExcelJS : noms des deux feuilles, en-têtes, dates de naissance et d’affiliation typées Date, format dd/mm/yyyy, téléphones de type String et format texte, cellules facultatives vides, aucune clé interne et texte commençant par « = » conservé comme texte.

Les PDF générés dans les tests hors ligne et les exemples sont relus avec pypdf ; dates saisies, noms accentués, champs attendus, périmètre et absence de clés contrôlés. Les pages des exemples sont rendues avec PyMuPDF et inspectées. En-têtes et numérotation sont contrôlés sur chaque page du modèle multipage. Les lignes qui tiennent sur une page ne sont pas coupées.

## Limites

Chromium sous Windows avec dimensions ordinateur/téléphone ; aucun téléphone physique ni Safari/iOS vérifié. Stockage dépendant du profil/origine et des décisions du navigateur. Aucun import, compte, serveur de données, synchronisation ou restauration automatique depuis Excel/PDF. Anciens caches conservés pour préserver les onglets ouverts. Gros volumes non évalués ; génération en mémoire.

Voir le README pour les commandes, l’hébergement HTTPS, les exemples et le fonctionnement des mises à jour.
