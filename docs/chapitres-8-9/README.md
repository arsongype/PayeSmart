# Repères simples pour les chapitres 8 et 9

Cette fiche aide à retrouver les principaux extraits de code, les pages à montrer et les résultats des vérifications. Elle ne remplace pas les captures d’écran prises dans l’application.

## Chapitre 8 — Développement de l’application

| Partie | Ce qu’on peut expliquer | Extraits à présenter |
|---|---|---|
| 8.1 Base de données | Les comptes, portefeuilles et transactions sont conservés dans PostgreSQL. | [`schema.sql`](../../backend/src/database/schema.sql) · [`run-safe-migration.ts`](../../backend/src/database/run-safe-migration.ts) |
| 8.2 Interface utilisateur | L’utilisateur saisit les informations et suit le résultat dans le navigateur. | [`PaymentsPage.tsx`](../../frontend/src/pages/payments/PaymentsPage.tsx) · [`WalletPage.tsx`](../../frontend/src/pages/profile/WalletPage.tsx) |
| 8.3 API et règles métier | Le backend reçoit la demande, vérifie les règles et enregistre le résultat. | [`payments.controller.ts`](../../backend/src/modules/payments/payments.controller.ts) · [`payments.service.ts`](../../backend/src/modules/payments/payments.service.ts) |
| 8.4 Module IA | Le service évalue un risque à partir de critères de démonstration et explique sa décision. | [`fraud_ml_service.py`](../../ai-service/services/fraud_ml_service.py) · [`fraud_detection_service.py`](../../ai-service/services/fraud_detection_service.py) |
| 8.5 Liaison avec l’application | Le backend appelle le service IA pour demander une analyse. | [`ai.service.ts`](../../backend/src/modules/profiles/services/ai.service.ts) · [`main.py`](../../ai-service/main.py) |

### Captures à préparer

Connectez-vous avec des comptes de démonstration, puis capturez :

1. Le tableau de bord : `http://localhost:5173/dashboard`
2. Le portefeuille : `http://localhost:5173/wallet`
3. Le formulaire de paiement : `http://localhost:5173/payments`
4. La vérification des documents : `http://localhost:5173/kyc`
5. Avec un compte administrateur, les règles de sécurité : `http://localhost:5173/admin/security-rules`

Déposez les images dans `docs/chapitres-8-9/captures/`. Aucune capture n’est incluse pour le moment. Masquez les noms, adresses, documents, codes et autres informations personnelles avant de les présenter.

## Chapitre 9 — Tests et validation

### Résultats des dernières commandes exécutées

| Vérification | Résultat |
|---|---|
| Backend — `npm test` | **Réussi :** 7 fichiers, 37 tests. |
| Backend — `npm run test:e2e` | **Réussi :** 1 test d’intégration. |
| Backend — `npm run build` | **Réussi.** |
| Backend — `npm run lint` | **Terminé sans erreur bloquante ; des avertissements de code restent affichés.** |
| Service IA — `.\venv\Scripts\python.exe -m unittest discover -v` | **Réussi :** 4 tests. |
| Frontend — `npm run lint` | **Réussi sans erreur ni avertissement ESLint.** |
| Frontend — `npm run build` | **Réussi.** |
| Parcours connecté dans le navigateur et tests utilisateurs | **Non vérifiés lors de cette validation.** |
| Performance IA sur des données réelles | **Non mesurée.** |

Le module IA utilise des exemples intégrés pour la démonstration. Sans un jeu de données réel, des résultats de référence et une évaluation indépendante, il ne faut pas présenter de précision, de rappel ou de score F1 comme une performance mesurée.

### Refaire les vérifications

Depuis la racine du dépôt, ouvrez un terminal dans le dossier concerné et lancez les commandes :

```powershell
Set-Location .\backend
npm test
npm run test:e2e
npm run build
npm run lint

Set-Location ..\frontend
npm run lint
npm run build

Set-Location ..\ai-service
.\.venv\Scripts\python.exe -m unittest discover -v
```

Pour un résultat présentable, ajoutez ensuite les captures des parcours réellement exécutés et notez le compte de démonstration utilisé. Ne montrez jamais de secrets ni de vraies données personnelles.
