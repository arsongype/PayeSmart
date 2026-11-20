# PayeSmart — interface utilisateur

Ce dossier contient les pages visibles dans le navigateur : connexion, tableau de bord, portefeuille, paiements, notifications, vérification des documents et espaces d’administration.

## Ce que l’on peut faire

- Créer un compte et se connecter.
- Consulter son portefeuille, ses opérations et la date d’expiration de son compte.
- Préparer un paiement par carte de test, QR code ou virement.
- Recevoir et consulter des notifications.
- Envoyer des documents pour une démonstration de vérification KYC/KYB.
- Gérer les règles et les comptes avec un profil administrateur.

> **Important :** PayeSmart est une application de démonstration. Les paiements sont simulés ; aucune banque ni aucun réseau de carte bancaire réel n’est connecté. N’utilisez pas de vraies coordonnées de carte ou de données personnelles pour une démonstration.

## Démarrer l’application

Il faut Node.js 20.19 ou plus récent (ou 22.12 ou plus récent), npm, une base PostgreSQL préparée et le backend PayeSmart démarré. La configuration de la base est expliquée dans le [guide du backend](../backend/README.md). Le service IA est nécessaire pour les fonctions de vérification de documents.

1. Démarrez PostgreSQL et configurez le backend. Depuis la racine du dépôt, installez aussi les dépendances :

   ```powershell
   Set-Location .\backend
   npm ci
   Set-Location ..\frontend
   npm ci
   ```

2. Pour lancer simultanément le backend, le service IA et les ports frontend 5173 à 5178, depuis `frontend` :

   ```powershell
   npm run dev:ports
   ```

   Le service IA doit avoir été préparé une fois selon le [guide du service IA](../ai-service/README.md), avec son environnement `.venv`.

3. Si le backend et le service IA sont déjà lancés, utilisez uniquement les ports frontend :

   ```powershell
   npm run dev:frontend:ports
   ```

4. Ouvrez `http://localhost:5173` (ou l’un des ports 5174 à 5178), puis créez un compte de démonstration.

En mode développement, Vite transmet automatiquement les demandes `/api/v1` et les fichiers `/uploads` au backend local sur le port 3000. Pour utiliser une autre adresse d’API, définissez `VITE_API_BASE_URL` dans un fichier `.env.local` du dossier `frontend`.

## Contrôles disponibles

Depuis `frontend`, exécutez :

```powershell
npm run lint
npm run build
```

Le lint vérifie la qualité du code. Le build vérifie les types TypeScript et prépare les fichiers de l’interface. Aucun script de tests unitaires frontend n’est actuellement configuré.
