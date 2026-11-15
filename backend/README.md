# PayeSmart — services et données

Le backend reçoit les demandes de l’interface, vérifie les règles, lit et enregistre les données et renvoie les résultats. Il contient notamment les fonctions de compte, portefeuille, paiements simulés, notifications, sécurité, administration et rapports.

## Ce qu’il faut avant de commencer

- Node.js 20 ou plus récent et npm.
- PostgreSQL en fonctionnement.
- Une base de données locale créée pour PayeSmart.
- Le service IA si vous souhaitez tester l’analyse de documents.

Les paiements transactionnels restent simulés. L’inscription peut toutefois enregistrer une carte via Stripe SetupIntent ; cette étape ne débite pas la carte et les données de carte sont saisies dans Stripe Elements.

## Préparer la base de données

1. Dans PostgreSQL, créez une base locale dédiée à PayeSmart.
2. Dans `backend`, utilisez `.env.example` comme liste des paramètres, puis créez votre propre fichier `.env`. Renseignez au minimum les paramètres `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD` et `DB_NAME`. Remplacez tous les exemples de secrets par des valeurs aléatoires d’au moins 32 caractères ; `AI_API_KEY` doit être identique dans le backend et le service IA. Le backend refuse de démarrer en production si ces valeurs sont absentes ou ressemblent à des placeholders. Ne partagez jamais le fichier `.env`.
3. Pour une **base neuve et vide**, le fichier [`schema.sql`](src/database/schema.sql) fournit la structure initiale. Dans pgAdmin, sélectionnez cette base, ouvrez **Query Tool**, chargez ce fichier et exécutez-le. **Attention : il supprime et recrée certaines tables. Ne l’exécutez jamais sur une base contenant des données à conserver.**
4. Pour une base déjà créée qui doit recevoir les champs récents, la commande `npm run migration:safe` applique la mise à jour prévue. Faites une sauvegarde avant toute migration et vérifiez que les tables de base existent déjà.

## Installer et lancer

Dans un terminal ouvert dans `backend` :

```powershell
npm ci
npm run start:dev
```

Le serveur écoute normalement sur `http://localhost:3000`. Les routes API commencent par `/api/v1`. Par exemple, l’adresse de base est `http://localhost:3000/api/v1`. L’interface frontend déjà configurée utilise un proxy local vers ce serveur.

Pour que les fonctions KYC/KYB communiquent avec l’IA, configurez `AI_SERVICE_URL` et `AI_API_KEY` dans le fichier `.env` du backend. La clé doit être la même dans le service IA. L’envoi de courriels nécessite également une configuration SMTP valide.

Pour permettre l’ajout d’une Visa pendant l’inscription, configurez `STRIPE_SECRET_KEY` et `STRIPE_PUBLISHABLE_KEY` avec les clés de votre compte Stripe (utilisez des clés de test en développement). Aucune transaction n’est créée : Stripe confirme la carte et PayeSmart ne reçoit que l’identifiant SetupIntent. Appliquez `npm run migration:safe` sur une base existante pour ajouter les références Stripe des moyens de paiement.

Pour la détection de fraude, les seuils par défaut sont de 30/100 et 70/100. Les seuils de la règle active `AI_THRESHOLDS` en base remplacent ces valeurs et sont transmis au service IA ; le backend vérifie que sa décision correspond à celle du service. Les règles de pays surveillés et la 2FA obligatoire pour certains moyens de paiement restent des protections supplémentaires.

## Suppression d’un compte

Depuis **Paramètres**, l’utilisateur confirme sa demande avec son mot de passe et, si la 2FA est activée, son code OTP. La vérification bloque la demande lorsqu’une alerte de fraude est ouverte, qu’une transaction est en attente/en cours ou qu’une transaction possède déjà un score IA élevé. Les administrateurs reçoivent une notification avec le résultat et peuvent examiner le compte dans la page de gestion des utilisateurs.

Si la demande passe les contrôles, le compte et ses sessions sont bloqués immédiatement. Avant l’échéance exacte de 30 jours, l’utilisateur peut récupérer son compte depuis l’écran de connexion avec son email, son mot de passe et son code 2FA le cas échéant. Un traitement automatique vérifie les échéances chaque minute. À l’expiration, les données personnelles et pièces d’identité sont anonymisées/supprimées, les clients Stripe liés sont supprimés, tandis que les portefeuilles, transactions et écritures comptables sont conservés sans identité personnelle afin de préserver les références financières. Cette dernière étape est irréversible.

L’API utilise `DELETE /api/v1/profiles/account/deletion` pour demander la suppression et `POST /api/v1/auth/account-deletion/cancel` pour la récupération. Les administrateurs peuvent traiter une alerte dans **Fraude** ; une alerte résolue ne bloque plus une nouvelle demande. Sur une base existante, appliquez la migration additive avec `npm run migration:safe` après sauvegarde. N’exécutez pas `schema.sql` sur une base qui contient des données à conserver.

## Comment les parties communiquent

1. L’utilisateur effectue une action dans le navigateur.
2. L’interface envoie une demande HTTP à l’API du backend.
3. Le backend vérifie la session, les données et les règles applicables, puis enregistre les opérations dans PostgreSQL.
4. Pour une analyse de document ou de risque, le backend peut appeler le service IA.
5. Le résultat revient à l’interface sous forme de confirmation, d’état ou de message d’erreur.

La plupart des routes de consultation ou de gestion de compte, ainsi que les paiements, nécessitent une connexion. La connexion et la création de compte sont les exceptions. Les demandes invalides doivent être corrigées à partir du message affiché dans l’interface.

## Vérifier le backend

Depuis `backend` :

```powershell
npm test
npm run test:e2e
npm run build
npm run lint
```

- `npm test` lance les tests unitaires.
- `npm run test:e2e` vérifie un parcours d’intégration.
- `npm run build` compile le serveur.
- `npm run lint` vérifie le code. Les avertissements éventuels sont affichés dans le terminal.

## Fichiers utiles

- [`schema.sql`](src/database/schema.sql) : structure initiale de la base ; destructif si des tables existent déjà.
- [`run-safe-migration.ts`](src/database/run-safe-migration.ts) : mise à jour destinée à une base déjà structurée.
- [`payments.controller.ts`](src/modules/payments/payments.controller.ts) : routes API des paiements.
- [`payments.service.ts`](src/modules/payments/payments.service.ts) : règles métier des paiements.
- [Guide du service IA](../ai-service/README.md) : démarrage, accès et limites de l’analyse automatisée.
