# Paysmart AI Service

Service IA FastAPI pour l'analyse de documents KYC/KYB et le scoring de confiance.

## Algorithme de détection de fraude

Le service utilise une régression logistique locale (`logistic-regression-v1`),
sauvegardée et rechargée avec Joblib. Si le fichier est absent ou invalide, le
modèle est réentraîné automatiquement avec les exemples de référence intégrés.
Il utilise le montant, la fréquence des transactions, l'heure, le canal,
l'appareil, l'adresse IP et le portefeuille destinataire. Le score est borné entre
0 et 100 :

- moins de 40 : `APPROVE` ;
- de 40 à 89 : `REQUIRE_2FA` ;
- 90 ou plus : `BLOCK`.

Les raisons et les variables utilisées sont renvoyées dans la réponse afin de
permettre l'audit de chaque décision.

## Démarrage

```bash
cd ai-service
.\venv\Scripts\python.exe main.py
```

Ou avec reload automatique :
```bash
.\venv\Scripts\python.exe main.py --reload
```

Le service démarre sur `http://localhost:8101`

Pour activer l'analyse OCR des images et PDF sous Windows, installez aussi
[Tesseract OCR](https://github.com/UB-Mannheim/tesseract/wiki), puis redémarrez le service.
Le endpoint `/health` expose `ocr_available: true` lorsque le moteur est détecté.

## Endpoints

### Health Check
- `GET /health` - Vérifie que le service est opérationnel

### KYC
- `POST /api/v1/kyc/analyze` - Analyse un document KYC depuis du texte OCR
- `POST /api/v1/kyc/analyze-file` - Analyse un document KYC depuis un fichier image/PDF

### KYB
- `POST /api/v1/kyb/analyze` - Analyse un document KYB depuis du texte OCR
- `POST /api/v1/kyb/analyze-file` - Analyse un document KYB depuis un fichier image/PDF

### Trust Score
- `GET /api/v1/trust-score/{user_id}` - Récupère le score de confiance d'un utilisateur
- `POST /api/v1/trust-score/recalculate/{user_id}` - Recalcule le score de confiance

## Configuration

Les variables d'environnement sont dans `.env` :
- `PORT` : Port du serveur (défaut: 8001)
- `AI_API_KEY` : Clé API pour sécuriser les endpoints (défaut: dev-secret-key-change-in-production)
- `HOST` : Host d'écoute (défaut: 0.0.0.0)

## Sécurité

Tous les endpoints nécessitent un header `X-API-Key` avec la valeur de `AI_API_KEY`.

Exemple avec curl :
```bash
curl -X POST http://localhost:8101/api/v1/kyc/analyze \
  -H "X-API-Key: dev-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "document_type": "CIN", "ocr_text": "..."}'
```
