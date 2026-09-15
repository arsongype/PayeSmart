# Paysmart AI Service

Service IA FastAPI pour l'analyse de documents KYC/KYB et le scoring de confiance.

## Démarrage

```bash
cd ai-service
.\venv\Scripts\python.exe main.py
```

Ou avec reload automatique :
```bash
.\venv\Scripts\python.exe main.py --reload
```

Le service démarre sur `http://localhost:8001`

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
curl -X POST http://localhost:8001/api/v1/kyc/analyze \
  -H "X-API-Key: dev-secret-key-change-in-production" \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "document_type": "CIN", "ocr_text": "..."}'
```
