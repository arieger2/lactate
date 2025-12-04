# API & Webhook Dokumentation

## Übersicht

Das Lactate Dashboard bietet verschiedene API-Endpoints für die Integration mit externen Systemen und KI-Diensten.

---

## AI-Analyse Webhook

### Endpoint: `/api/ai-analysis`

Dieser Endpoint wird aufgerufen, wenn eine wissenschaftliche Schwellenmethode keine LT1/LT2-Werte berechnen kann. Die KI kann die Testdaten analysieren und alternative Schwellenwerte vorschlagen.

#### POST Request

**URL:** `http://localhost:3000/api/ai-analysis`

**Headers:**
```json
{
  "Content-Type": "application/json"
}
```

**Request Body:**
```json
{
  "method": "dickhuth",
  "unit": "watt",
  "testData": [
    {
      "power": 100,
      "lactate": 1.2,
      "heartRate": 130
    },
    {
      "power": 150,
      "lactate": 1.5,
      "heartRate": 145
    },
    {
      "power": 200,
      "lactate": 2.1,
      "heartRate": 160
    }
  ],
  "sessionId": "uuid-session-id",
  "customerId": "uuid-customer-id",
  "timestamp": "2025-12-01T12:00:00.000Z"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "AI-Analyse wurde empfangen und wird verarbeitet. (Webhook-Integration ausstehend)",
  "data": {
    "method": "dickhuth",
    "unit": "watt",
    "dataPoints": 7,
    "sessionId": "uuid-session-id",
    "customerId": "uuid-customer-id",
    "timestamp": "2025-12-01T12:00:00.000Z",
    "status": "pending_webhook_implementation"
  }
}
```

**Response (Error - Validierung):**
```json
{
  "success": false,
  "message": "Ungültige Anfrage: Methode und Testdaten erforderlich"
}
```

**Response (Error - Server):**
```json
{
  "success": false,
  "message": "Interner Serverfehler bei AI-Analyse"
}
```

#### Wann wird der Webhook ausgelöst?

Der Webhook wird automatisch aufgerufen, wenn:

1. Eine wissenschaftliche Schwellenmethode verwendet wird (z.B. Dickhuth, DMAX, Mader)
2. Die Methode keine LT1 und/oder LT2 berechnen kann
3. Der Benutzer auf den Button **"AI-Analyse anfordern"** klickt

**Beispiel-Szenario:**
```
Dickhuth-Methode: Baseline = 1.3 mmol/L
→ LT2 benötigt: 2.8 mmol/L (Baseline + 1.5)
→ Maximaler Messwert: 2.5 mmol/L
→ ❌ LT2 kann nicht berechnet werden
→ ⚠️ Warnung im Dashboard angezeigt
→ 🤖 "AI-Analyse anfordern" Button verfügbar
```

#### GET Request (Status-Abfrage)

**URL:** `http://localhost:3000/api/ai-analysis?sessionId=uuid-session-id`

**Response:**
```json
{
  "success": true,
  "message": "AI-Analyse Status-Abfrage (noch nicht implementiert)",
  "data": {
    "sessionId": "uuid-session-id",
    "status": "pending_implementation"
  }
}
```

---

## Webhook-Integration Konfiguration

### Environment Variables

Erstellen Sie eine `.env.local` Datei im Root-Verzeichnis:

```env
# AI-Analyse Webhook (z.B. n8n)
AI_ANALYSIS_WEBHOOK_URL=https://your-n8n-instance.com/webhook/ai-analysis
AI_ANALYSIS_WEBHOOK_SECRET=your-secret-key-here
```

### Implementierung in n8n

#### Webhook-Node Setup

1. **Webhook Trigger** erstellen:
   - **Method:** POST
   - **Path:** `/webhook/ai-analysis`
   - **Authentication:** Header Auth
     - **Name:** `Authorization`
     - **Value:** `Bearer ${AI_ANALYSIS_WEBHOOK_SECRET}`

2. **Empfangene Daten:**
   ```javascript
   // $node["Webhook"].json
   {
     "method": "dickhuth",        // Schwellenmethode
     "unit": "watt",              // Einheit (watt/kmh)
     "testData": [...],           // Array mit Messdaten
     "sessionId": "...",          // Session-ID
     "customerId": "...",         // Kunden-ID
     "timestamp": "..."           // ISO-Timestamp
   }
   ```

3. **Verarbeitung:**
   - KI-Modell aufrufen (z.B. OpenAI, Claude, Gemini)
   - Testdaten analysieren
   - Alternative Schwellenwerte vorschlagen
   - Ergebnis zurücksenden oder speichern

4. **Response (optional):**
   ```json
   {
     "success": true,
     "analysis": {
       "lt1": {
         "power": 180,
         "lactate": 2.0,
         "confidence": 0.85
       },
       "lt2": {
         "power": 240,
         "lactate": 3.5,
         "confidence": 0.78
       },
       "recommendation": "Basierend auf der Herzfrequenz-Entwicklung..."
     }
   }
   ```

#### Beispiel n8n Workflow

```
┌──────────────┐
│   Webhook    │ POST /webhook/ai-analysis
│   Trigger    │ 
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Validate    │ Prüfe method, testData
│    Data      │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Format     │ Bereite Prompt für KI vor
│   Prompt     │ "Analysiere folgende Laktatwerte..."
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  OpenAI /    │ AI-Analyse durchführen
│  Claude API  │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│   Parse      │ Extrahiere LT1/LT2 Werte
│  Response    │
└──────┬───────┘
       │
       ↓
┌──────────────┐
│  Save to     │ Optional: Speichere in DB
│  Database    │ oder sende Email/Notification
└──────────────┘
```

---

## Weitere API-Endpoints

### Lactate Webhook
**Endpoint:** `/api/lactate-webhook`

Empfängt Echtzeit-Messdaten von Messgeräten.

```json
POST /api/lactate-webhook
{
  "sessionId": "uuid",
  "customerId": "uuid",
  "measurements": [
    {
      "power": 200,
      "lactate": 2.5,
      "heartRate": 160,
      "timestamp": "2025-12-01T12:00:00Z"
    }
  ]
}
```

### Device Interface
**Endpoint:** `/api/device-interface`

Integration mit Laktat-Messgeräten.

```json
POST /api/device-interface
{
  "deviceId": "lactate-scout",
  "customerId": "uuid",
  "measurement": {
    "power": 200,
    "lactate": 2.5,
    "heartRate": 160
  }
}
```

### Adjusted Thresholds
**Endpoint:** `/api/adjusted-thresholds`

Speichert manuell angepasste Schwellenwerte.

```json
POST /api/adjusted-thresholds
{
  "testId": "uuid",
  "customerId": "uuid",
  "lt1Power": 180,
  "lt1Lactate": 2.0,
  "lt2Power": 240,
  "lt2Lactate": 4.0,
  "method": "adjusted"
}
```

---

## Wissenschaftliche Schwellenmethoden

Das Dashboard unterstützt 8 wissenschaftliche Methoden:

1. **DMAX** - Cheng et al. (1992)
2. **Dickhuth (IANS)** - Dickhuth et al. (1999)
3. **Mader (OBLA)** - Mader et al. (1976)
4. **Log-Log** - Beaver et al. (1985)
5. **+1.0 mmol/L** - Faude et al. (2009)
6. **ModDMAX** - Bishop et al. (1998)
7. **Seiler 3-Zone** - Seiler (2006)
8. **FatMax/LT** - San-Millán (2018)

Jede Methode kann unterschiedliche Anforderungen an die Messdaten haben. Wenn eine Methode keine Schwellen berechnen kann, wird dies im Dashboard angezeigt und die AI-Analyse kann angefordert werden.

---

## Fehlerbehandlung

### Häufige Fehler

1. **"Methode konnte keine Schwellen berechnen"**
   - **Ursache:** Messwerte liegen außerhalb des erforderlichen Bereichs
   - **Lösung:** AI-Analyse anfordern oder andere Methode wählen

2. **"Ungültige Anfrage: Methode und Testdaten erforderlich"**
   - **Ursache:** Fehlende oder ungültige Daten im Request
   - **Lösung:** Alle erforderlichen Felder prüfen

3. **"AI-Analyse-Service nicht konfiguriert"**
   - **Ursache:** `AI_ANALYSIS_WEBHOOK_URL` nicht gesetzt
   - **Lösung:** Environment Variable konfigurieren

### Logging

Alle API-Aufrufe werden in der Console geloggt:

```bash
🤖 AI Analysis Request received: {
  method: 'dickhuth',
  unit: 'watt',
  dataPoints: 7,
  sessionId: '...',
  customerId: '...'
}

📊 AI Analysis data prepared for webhook: {
  method: 'dickhuth',
  dataPoints: 7,
  dataPreview: [...]
}
```

---

## Security Best Practices

1. **Webhook Secret verwenden:** Immer mit `Authorization` Header absichern
2. **HTTPS verwenden:** Keine sensiblen Daten über HTTP senden
3. **Rate Limiting:** Webhook-Aufrufe begrenzen (empfohlen: 10 req/min)
4. **Input Validation:** Alle eingehenden Daten validieren
5. **Error Messages:** Keine sensiblen Informationen in Fehlermeldungen

---

## Roadmap

### Geplante Features

- [ ] **Webhook Retry Logic:** Automatische Wiederholung bei Fehlern
- [ ] **Batch Processing:** Mehrere Analysen gleichzeitig
- [ ] **Result Caching:** Gespeicherte AI-Analysen wiederverwenden
- [ ] **Notification System:** Email/Push bei abgeschlossener Analyse
- [ ] **Analytics Dashboard:** Webhook-Statistiken und Erfolgsraten

---

## Support

Bei Fragen oder Problemen:
- Siehe auch: [THRESHOLD_METHODS.md](./THRESHOLD_METHODS.md) für Details zu den Berechnungsmethoden
- Siehe auch: [USER_GUIDE.md](../USER_GUIDE.md) für Benutzer-Anleitung
- Siehe auch: [ARCHITECTURE.md](../ARCHITECTURE.md) für technische Details
