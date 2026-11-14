# PayeSmart — service d’analyse IA

Ce service accompagne le backend pour les démonstrations d’analyse de documents KYC/KYB, de score de confiance et d’évaluation du risque d’une transaction. Il ne remplace ni une vérification humaine ni un système antifraude de production.

## Installer et démarrer sous Windows

Il faut Python 3 installé. Depuis un terminal ouvert dans `ai-service` :

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
$env:AI_API_KEY = "local-development-ai-key"
.\.venv\Scripts\python.exe main.py
```

Le serveur démarre normalement sur `http://localhost:8120` (port choisi hors des plages réservées courantes de Windows). En développement local, le backend et le service IA partagent cette clé de démonstration par défaut. En production, configurez la **même clé aléatoire d’au moins 32 caractères** dans les deux services ; le service refuse de démarrer sans cette configuration.

La page `http://localhost:8120/health` permet de vérifier que le serveur répond. Elle indique aussi si le moteur OCR est disponible.

## Fonctions et adresses

Les routes, sauf `/health`, nécessitent l’en-tête `X-API-Key` :

| Adresse | Utilité |
|---|---|
| `GET /health` | Vérifie que le service répond et indique la disponibilité de l’OCR. |
| `POST /api/v1/kyc/analyze` | Analyse les informations textuelles d’un document individuel. |
| `POST /api/v1/kyc/analyze-file` | Tente d’extraire puis d’analyser le texte d’un fichier. |
| `POST /api/v1/kyb/analyze` | Analyse les informations textuelles d’un document d’entreprise. |
| `POST /api/v1/kyb/analyze-file` | Tente d’extraire puis d’analyser le texte d’un fichier d’entreprise. |
| `GET /api/v1/trust-score/{user_id}` | Renvoie un score de confiance de démonstration. |
| `POST /api/v1/trust-score/recalculate/{user_id}` | Recalcule ce score de démonstration. |
| `POST /api/v1/fraud-detection/predict` | Renvoie un score de risque, une décision et les raisons associées. |
| `GET /api/v1/metrics` | Renvoie les compteurs et les métriques calculées sur un jeu d’évaluation labellisé. |

Le backend contacte ces routes automatiquement lorsque l’utilisateur demande une vérification depuis l’application.

## Configuration des métriques

Aucun jeu de données synthétique n’est chargé automatiquement. Sans `AI_EVALUATION_DATASET`, `/api/v1/metrics` renvoie des métriques nulles avec `metricSource: "unconfigured"`.

Le tableau de bord calcule les métriques par payeur et l’administrateur voit l’agrégat global. Un verdict de revue enregistré par un administrateur est prioritaire. Pour les transactions sans verdict, le mode proxy choisi par l’application traite `COMPLETED` comme non-fraude et `FAILED` comme fraude; cette approximation peut compter à tort un refus bancaire ou un incident technique comme fraude. La source de métriques est affichée dans le tableau de bord. Le seuil de prédiction fraude est 40/100. Les transactions non signalées peuvent être incluses dans l’écran « Alertes fraude » afin que les faux négatifs puissent aussi être identifiés.

Pour évaluer séparément le modèle sur un jeu labellisé, définissez `AI_EVALUATION_DATASET` dans `ai-service/.env`. Les chemins relatifs sont résolus depuis le dossier `ai-service`. Les formats CSV, JSON (tableau d’objets) et JSONL sont acceptés. Chaque ligne doit fournir `is_fraud` (booléen), `amount` et `channel`; les autres variables du modèle sont facultatives. Le jeu doit contenir au moins un exemple frauduleux et un exemple non frauduleux.

## Analyse de risque : limites à connaître

Le modèle local de régression logistique est initialisé à partir de quelques exemples intégrés au code lorsqu’aucun modèle sauvegardé n’est disponible. Le score produit sert à illustrer un parcours de décision. Les seuils par défaut sont alignés sur ceux du backend ; lors d’un paiement, le backend transmet ses seuils actifs au service IA :

- score inférieur à 30 : `APPROVE` ;
- score de 30 à moins de 70 : `REQUIRE_2FA` ;
- score de 70 ou plus : `BLOCK`.

Les données de démonstration ne constituent pas une évaluation sur des opérations réelles. Les métriques d’un jeu de démonstration sont uniquement illustratives; les performances réelles exigent un jeu indépendant, représentatif et labellisé. Le service ne doit donc pas servir seul à autoriser ou refuser de vrais paiements. Le score de confiance renvoyé est également une démonstration, pas une décision financière certifiée.

## Reconnaissance de documents

L’analyse d’un fichier image nécessite Tesseract OCR. Pour extraire le texte d’un PDF, un outil complémentaire de conversion des pages peut aussi être nécessaire. Sans moteur OCR opérationnel, le service peut répondre sans texte extrait ; pour une démonstration prévisible, vérifiez `ocr_available` sur `/health` ou envoyez directement le texte à une route `/analyze`.

## Tests

Depuis `ai-service`, exécutez :

```powershell
.\.venv\Scripts\python.exe -m unittest discover -v
```

Les tests vérifient les décisions prévues sur quelques scénarios de démonstration. Ils ne mesurent pas la performance du modèle sur des fraudes réelles.
