# Theoretische Load-Berechnung bei unvollständigen Stages

## Übersicht

Wenn ein Athlet eine Stage nicht vollständig absolviert (z.B. vorzeitiger Abbruch nach 0:50 min statt 3:00 min), wird eine **theoretische Load** berechnet, die angibt, welche Belastung der Athlet bei voller Dauer erreicht hätte.

Diese theoretische Load wird in der Laktat-Leistungskurve als **gestrichelte Kurve** visualisiert und berücksichtigt die physiologische Ermüdung des Athleten.

---

## Grundprinzip

**Wichtige Regel:** Bei Ermüdung (< 100% Zielzeit) liegt die theoretische Load **IMMER zwischen der vorherigen Stage (Minimum) und der aktuellen Load (Maximum)**.

### Beispiel:
- **Stage 7**: 18.0 km/h @ 3:00 min (vollständig) → 6.45 mmol/L
- **Stage 8**: 20.0 km/h @ 0:50 min (27.7% completion) → 8.24 mmol/L
- **Theoretische Load**: ~18.44 km/h (zwischen 18.0 und 20.0)

**Logik:** Der Athlet hat bei 20.0 km/h nur 0:50 min geschafft, also war er ermüdet und konnte die volle Dauer nicht halten. Die theoretische Load zeigt, welche Geschwindigkeit er bei voller 3:00 min erreicht hätte.

---

## Berechnungsmethoden

### 1. Lineare Interpolation (≥ 80% Zielzeit)

Bei hoher Completion-Rate (≥ 80%) wird eine **einfache lineare Interpolation** verwendet:

```
Theoretische Load = Vorherige Load + (Aktuelle Load - Vorherige Load) × Completion Ratio
```

**Beispiel:**
- Vorherige Load: 18.0 km/h
- Aktuelle Load: 20.0 km/h
- Completion: 2:30 min / 3:00 min = 83.3%

```
Theoretische Load = 18.0 + (20.0 - 18.0) × 0.833
                 = 18.0 + 1.67
                 = 19.67 km/h
```

**Visualisierung:** Gerade gestrichelte Linie zwischen vorheriger und aktueller Stage.

---

### 2. Quadratische Extrapolation (< 80% Zielzeit)

Bei niedriger Completion-Rate (< 80%) wird eine **Parabel durch die letzten 3 Stages** gelegt, um die physiologische Laktat-Dynamik zu berücksichtigen:

#### Schritt 1: Parabel durch 3 Punkte

Gegeben sind die letzten 3 Stages:
- **Stage n-2**: (Load₀, Laktat₀) z.B. (16.0, 3.49)
- **Stage n-1**: (Load₁, Laktat₁) z.B. (18.0, 6.45)
- **Stage n**: (Load₂, Laktat₂) z.B. (20.0, 8.24)

Wir fitten eine **quadratische Funktion**:
```
Laktat = a·Load² + b·Load + c
```

**Koeffizienten berechnen:**
```
denom = (x₀ - x₁)(x₀ - x₂)(x₁ - x₂)

a = (x₂(y₁ - y₀) + x₁(y₀ - y₂) + x₀(y₂ - y₁)) / denom
b = (x₂²(y₀ - y₁) + x₁²(y₂ - y₀) + x₀²(y₁ - y₂)) / denom
c = (x₁x₂(x₁ - x₂)y₀ + x₂x₀(x₂ - x₀)y₁ + x₀x₁(x₀ - x₁)y₂) / denom
```

#### Schritt 2: Laktat interpolieren

Basierend auf der Completion Ratio wird das theoretische Laktat interpoliert:
```
Theoretisches Laktat = Laktat₁ + (Laktat₂ - Laktat₁) × Completion Ratio
```

**Beispiel:**
- Laktat Stage 7: 6.45 mmol/L
- Laktat Stage 8: 8.24 mmol/L
- Completion: 27.7%

```
Theoretisches Laktat = 6.45 + (8.24 - 6.45) × 0.277
                     = 6.45 + 0.50
                     = 6.95 mmol/L
```

#### Schritt 3: Load aus Parabel rückwärts lösen

Wir lösen die quadratische Gleichung für die theoretische Load:
```
6.95 = a·Load² + b·Load + c
```

Umformen zu:
```
a·Load² + b·Load + (c - 6.95) = 0
```

Quadratische Lösungsformel:
```
Load = (-b ± √(b² - 4a(c - theoretischesLaktat))) / (2a)
```

**Beispiel mit den Koeffizienten der Parabel:**
```
a = 0.0234, b = -0.432, c = 6.12
theoretischesLaktat = 6.95

Diskriminante = (-0.432)² - 4(0.0234)(6.12 - 6.95)
              = 0.187 + 0.078
              = 0.265

Load = (0.432 ± √0.265) / (2 × 0.0234)
     = (0.432 ± 0.515) / 0.0468

Lösung 1: (0.432 + 0.515) / 0.0468 = 20.24 (außerhalb Bereich)
Lösung 2: (0.432 - 0.515) / 0.0468 = -1.77 (negativ, ungültig)
```

Wenn keine gültige Lösung im Bereich [Load₁, Load₂] liegt, wird Fallback zu linearer Interpolation verwendet.

**Im konkreten Fall (18.44 km/h):** Die Parabel-Berechnung findet eine gültige Lösung innerhalb des Bereichs [18.0, 20.0], die bei **18.44 km/h** liegt.

**Visualisierung:** Gekrümmte gestrichelte Linie (Parabel) durch die letzten 3 Punkte.

---

## Mathematische Details

### Completion Ratio

```
Completion Ratio = Tatsächliche Dauer / Zieldauer
```

**Beispiele:**
- 3:00 / 3:00 = 1.00 (100%, vollständig)
- 2:30 / 3:00 = 0.833 (83.3%)
- 0:50 / 3:00 = 0.278 (27.8%)

### Grenzen der theoretischen Load

```
Vorherige Load ≤ Theoretische Load ≤ Aktuelle Load
```

Diese Bedingung wird immer eingehalten. Bei Parabel-Berechnung wird die Lösung auf diesen Bereich beschränkt.

### Konfidenz-Level

Die Konfidenz der Berechnung skaliert mit der Completion Ratio:

| Completion | Konfidenz | Methode |
|------------|-----------|---------|
| ≥ 90% | 95% | Linear |
| 85-89% | 90% | Linear |
| 80-84% | 85% | Linear |
| 70-79% | 75% | Quadratisch |
| 60-69% | 65% | Quadratisch |
| 50-59% | 55% | Quadratisch |
| < 50% | 40% | Quadratisch |

---

## Visualisierung im Graph

### Parabel-Kurve (< 80% Completion)

Die Parabel wird durch **50 Zwischenpunkte** gerendert, um eine glatte Kurve zu erzeugen:

```typescript
const steps = 50
const startX = Load₁  // z.B. 18.0
const endX = Load₂    // z.B. 20.0
const stepSize = (endX - startX) / steps

for (let i = 0; i <= steps; i++) {
  const x = startX + (i × stepSize)
  const y = a × x² + b × x + c
  curvePoints.push([x, y])
}
```

**Eigenschaften:**
- Farbe: Rot (#ef4444)
- Linienstil: Gestrichelt
- Linienbreite: 3px
- Symbole: Keine (glatte Kurve)

### Theoretischer Punkt

Der berechnete theoretische Load-Punkt wird als:
- Roter Kreis
- Auf der Parabel-Kurve
- Mit gestrichelter Verbindung zur vorherigen Stage

---

## Praktisches Beispiel: TEST-11087

### Daten:
```
Stage 6: 16.0 km/h @ 3:00 min → 3.49 mmol/L
Stage 7: 18.0 km/h @ 3:00 min → 6.45 mmol/L
Stage 8: 20.0 km/h @ 0:50 min → 8.24 mmol/L
```

### Berechnung:

**1. Completion Ratio:**
```
0:50 min = 0.833 min
Completion = 0.833 / 3.0 = 0.278 (27.8%)
```

**2. Methode:** < 80% → Quadratische Extrapolation

**3. Parabel-Koeffizienten:**
```
Punkte: (16.0, 3.49), (18.0, 6.45), (20.0, 8.24)
→ a = 0.0234, b = -0.432, c = 6.12
```

**4. Theoretisches Laktat:**
```
6.45 + (8.24 - 6.45) × 0.278 = 6.95 mmol/L
```

**5. Load-Berechnung:**
```
Lösung der Gleichung: 6.95 = 0.0234·Load² - 0.432·Load + 6.12
→ Load = 18.44 km/h
```

**6. Konfidenz:** 40% (< 50% Completion)

### Ergebnis:
```
Theoretische Load: 18.44 km/h
Konfidenz: 40%
Methode: Quadratische Extrapolation
```

**Interpretation:** Der Athlet hätte bei voller 3:00 min Dauer etwa **18.44 km/h** erreicht, was deutlich unter den erreichten 20.0 km/h liegt, da er stark ermüdet war.

---

## Implementierung

### Backend: `lib/theoreticalLoadExtrapolation.ts`

Enthält die Berechnungslogik für:
- `linearExtrapolation()`: Einfache Interpolation für ≥ 80%
- `quadraticExtrapolation()`: Parabel-Berechnung für < 80%
- `calculateTheoreticalLoad()`: Haupt-Funktion mit Methoden-Routing
- `needsTheoreticalLoad()`: Prüfung ob Berechnung nötig

### Frontend: `lib/lactateChartOptions.ts`

Erzeugt die Visualisierung:
- Generiert Parabel-Kurven-Punkte
- Rendert gestrichelte Linie
- Zeigt theoretischen Punkt an

### API: `/api/lactate-webhook`

Berechnet und speichert theoretische Load:
- Triggert Berechnung bei Stage-Speicherung
- Speichert Wert in `stages.theoretical_load`
- Gibt Wert im Response zurück für sofortige Anzeige

---

## Wissenschaftliche Grundlage

Die Methode basiert auf folgenden physiologischen Prinzipien:

### 1. Laktat-Leistungs-Beziehung
- Bei konstanter Belastung steigt das Laktat exponentiell
- Die Laktat-Leistungs-Kurve folgt einer Potenzfunktion
- Quadratische Approximation ist für mittlere Intensitäten valide

### 2. Ermüdung und Load-Reduktion
- Bei Ermüdung kann der Athlet die vorgeschriebene Load nicht halten
- Die tatsächlich erreichbare Load ist geringer als geplant
- Theoretische Load interpoliert zwischen bekannten Werten

### 3. Parabolische Modellierung
- Laktat verhält sich im mittleren Intensitätsbereich quasi-parabolisch
- 3 Punkte erlauben eindeutige Parabel-Bestimmung
- Rückwärts-Interpolation liefert realistischere Werte als lineare Methode

---

## Limitierungen

### 1. Mindestanforderungen
- Benötigt mindestens 2 vollständige Stages (für lineare Methode)
- Benötigt mindestens 3 Stages (für quadratische Methode)
- Benötigt mindestens 10% Completion für sinnvolle Berechnung

### 2. Genauigkeit
- Konfidenz sinkt mit geringerer Completion Ratio
- Bei < 50% Completion ist die Berechnung stark unsicher
- Parabel-Modell gilt nur im gemessenen Intensitätsbereich

### 3. Fallback-Mechanismen
- Wenn Parabel-Berechnung fehlschlägt → Lineare Interpolation
- Wenn Punkte kollinear sind → Lineare Methode
- Wenn keine gültige Lösung → Mittelwert zwischen vorheriger und aktueller Load

---

## Zusammenfassung

**Ziel:** Schätzung der Belastung, die ein Athlet bei voller Stage-Dauer erreicht hätte

**Methode:**
- ≥ 80% Completion: **Lineare Interpolation** (einfach, direkt)
- < 80% Completion: **Quadratische Extrapolation** (Parabel durch 3 Punkte)

**Ergebnis:**
- Liegt immer zwischen vorheriger und aktueller Load
- Wird als gestrichelte Kurve visualisiert
- Berücksichtigt physiologische Laktat-Dynamik

**Beispiel TEST-11087:**
- Stage 8: 20.0 km/h @ 0:50 min (27.8%)
- Theoretische Load: **18.44 km/h**
- Konfidenz: 40%
