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

Le serveur démarre normalement sur `http://localhost:8101`. En développement local, le backend et le service IA partagent cette clé de démonstration par défaut. En production, configurez la **même clé aléatoire d’au moins 32 caractères** dans les deux services ; le service refuse de démarrer sans cette configuration.

La page `http://localhost:8101/health` permet de vérifier que le serveur répond. Elle indique aussi si le moteur OCR est disponible.

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
| `GET /api/v1/metrics` | Renvoie les compteurs d’analyse et, si configurées, des métriques du modèle. |

Le backend contacte ces routes automatiquement lorsque l’utilisateur demande une vérification depuis l’application.

## Analyse de risque : limites à connaître

Le modèle local de régression logistique est initialisé à partir de quelques exemples intégrés au code lorsqu’aucun modèle sauvegardé n’est disponible. Le score produit sert à illustrer un parcours de décision. Les seuils par défaut sont alignés sur ceux du backend ; lors d’un paiement, le backend transmet ses seuils actifs au service IA :

- score inférieur à 30 : `APPROVE` ;
- score de 30 à moins de 70 : `REQUIRE_2FA` ;
- score de 70 ou plus : `BLOCK`.

Ces seuils et ces exemples ne constituent pas une évaluation sur des opérations réelles. Aucune précision, aucun rappel ni score F1 n’est disponible sans jeu de données étiqueté et test indépendant. Le service ne doit donc pas servir seul à autoriser ou refuser de vrais paiements. Le score de confiance renvoyé est également une démonstration, pas une décision financière certifiée.

## Reconnaissance de documents

L’analyse d’un fichier image nécessite Tesseract OCR. Pour extraire le texte d’un PDF, un outil complémentaire de conversion des pages peut aussi être nécessaire. Sans moteur OCR opérationnel, le service peut répondre sans texte extrait ; pour une démonstration prévisible, vérifiez `ocr_available` sur `/health` ou envoyez directement le texte à une route `/analyze`.

## Tests

Depuis `ai-service`, exécutez :

```powershell
.\.venv\Scripts\python.exe -m unittest discover -v
```

Les tests vérifient les décisions prévues sur quelques scénarios de démonstration. Ils ne mesurent pas la performance du modèle sur des fraudes réelles.
