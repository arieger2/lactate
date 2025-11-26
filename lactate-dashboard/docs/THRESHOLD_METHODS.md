# Wissenschaftliche Schwellenmethoden zur Laktatdiagnostik

## Übersicht

Dieses Dokument beschreibt die in der Lactate-Dashboard-Anwendung implementierten wissenschaftlichen Methoden zur Bestimmung von Laktatschwellen. Jede Methode basiert auf peer-reviewten wissenschaftlichen Publikationen und verwendet mathematisch fundierte Algorithmen.

---

## Übersichtstabelle der Methoden

| Methode | Originalname | Autoren/Jahr | LT1 (Aerobe Schwelle) | LT2 (Anaerobe Schwelle) | Mathematische Basis |
|---------|--------------|--------------|----------------------|------------------------|---------------------|
| **DMAX** | DMAX | Cheng et al. (1992) | Erster Deflektionspunkt (Steigung +50%) | Max. Distanz zur Baseline | Polynomiale Regression 3. Grades |
| **Dickhuth** | IANS | Dickhuth et al. (1999) | Baseline + 0.5 mmol/L | Baseline + 1.5 mmol/L | Lineare Interpolation |
| **Mader 4mmol** | OBLA | Mader (1976) | 2.0 mmol/L | 4.0 mmol/L | Lineare Interpolation |
| **Log-Log** | Log-Log Breakpoint | Beaver et al. (1985) | Steigungsänderung vor Breakpoint | Breakpoint der Zwei-Linien-Regression | Logarithmische Transformation |
| **+1.0 mmol/L** | LT+1 | Faude et al. (2009) | Laktat-Minimum | Baseline + 1.0 mmol/L | Lineare Interpolation |
| **ModDMAX** | Modified DMAX | Bishop et al. (1998) | Laktat-Minimum | Max. Distanz ab Laktat-Minimum | Polynomiale Regression 3. Grades |
| **Seiler 3-Zone** | Polarized Training | Seiler & Kjerland (2006) | VT1 ≈ Baseline + 0.5 mmol/L | VT2 ≈ Baseline + 2.0 mmol/L | Lineare Interpolation |
| **FatMax/LT** | Crossover Concept | San-Millán & Brooks (2018) | Baseline + 0.5 mmol/L (bei FatMax) | Baseline + 1.5 mmol/L (MLSS) | Kombinierte Analyse |

---

## Detaillierte Methodenbeschreibungen

### 1. DMAX Methode (Cheng et al., 1992)

#### Wissenschaftlicher Hintergrund
Die DMAX-Methode wurde entwickelt, um einen objektiven, mathematisch definierten Punkt auf der Laktat-Leistungskurve zu identifizieren, der das maximale Laktat-Steady-State (MLSS) approximiert. Sie vermeidet die Subjektivität visueller Kurvenanalysen.

#### Physiologische Bedeutung
- **LT2 (DMAX-Punkt)**: Repräsentiert den Punkt maximaler Diskrepanz zwischen aerobem und anaerobem Energiestoffwechsel
- Der Athlet kann bei dieser Intensität noch ein Laktat-Gleichgewicht aufrechterhalten
- Oberhalb steigt die Laktatkonzentration progressiv an (keine Steady-State möglich)

#### Mathematische Implementierung

```
1. Datenpunkte nach Leistung sortieren: P₁ < P₂ < ... < Pₙ

2. Polynomiale Regression 3. Grades fitten:
   Laktat(P) = a₀ + a₁P + a₂P² + a₃P³
   
   Lösung über Normalengleichung: (XᵀX)a = Xᵀy
   mit Gaußscher Elimination und partieller Pivotisierung

3. Baseline-Linie definieren:
   y = m·P + b
   wobei m = (Laktatₑₙₐ - Laktatₛₜₐᵣₜ) / (Pₑₙₐ - Pₛₜₐᵣₜ)

4. Maximale senkrechte Distanz finden:
   d(P) = |Laktatₖᵤᵣᵥₑ(P) - Laktatₗᵢₙᵢₑ(P)| / √(1 + m²)
   
   DMAX = argmax(d(P)) für P ∈ [Pₛₜₐᵣₜ, Pₑₙₐ]

5. LT1 via ersten Deflektionspunkt:
   LT1 = P wo Steigung > 1.5 × Baseline-Steigung
```

#### Literatur
- Cheng, B., Kuipers, H., Snyder, A. C., Keizer, H. A., Jeukendrup, A., & Hesselink, M. (1992). A new approach for the determination of ventilatory and lactate thresholds. *International Journal of Sports Medicine*, 13(7), 518-522.

---

### 2. Dickhuth/IANS Methode (Dickhuth et al., 1999)

#### Wissenschaftlicher Hintergrund
Die Individuelle Anaerobe Schwelle (IANS) nach Dickhuth basiert auf der Erkenntnis, dass individuelle Baselinewerte stark variieren können. Statt fixer Schwellen wird die individuelle Baseline als Referenz verwendet.

#### Physiologische Bedeutung
- **Baseline**: Repräsentiert das individuelle Ruhelaktat unter leichter Belastung
- **LT1 (+0.5 mmol/L)**: Beginn der aeroben Energiebereitstellung mit messbarer Laktaterhöhung
- **LT2 (+1.5 mmol/L)**: Übergang zur vorwiegend anaeroben Energiebereitstellung

#### Mathematische Implementierung

```
1. Baseline berechnen (Mittelwert der ersten 2-3 Punkte):
   Baseline = (1/k) × Σᵢ₌₁ᵏ Laktatᵢ, wobei k = min(3, n/3)

2. Ziellaktatwerte definieren:
   LT1_Ziel = Baseline + 0.5 mmol/L
   LT2_Ziel = Baseline + 1.5 mmol/L

3. Lineare Interpolation zwischen Messpunkten:
   Für aufeinanderfolgende Punkte (Pᵢ, Lᵢ) und (Pᵢ₊₁, Lᵢ₊₁):
   
   Wenn Lᵢ ≤ Ziel ≤ Lᵢ₊₁:
   t = (Ziel - Lᵢ) / (Lᵢ₊₁ - Lᵢ)
   P_Schwelle = Pᵢ + t × (Pᵢ₊₁ - Pᵢ)
```

#### Literatur
- Dickhuth, H. H., Yin, L., Niess, A., Röcker, K., Mayer, F., Heitkamp, H. C., & Horstmann, T. (1999). Ventilatory, lactate-derived and catecholamine thresholds during incremental treadmill running: relationship and reproducibility. *International Journal of Sports Medicine*, 20(2), 122-127.

---

### 3. Mader 4 mmol/L Methode (Mader, 1976)

#### Wissenschaftlicher Hintergrund
Die klassische "4 mmol/L Schwelle" oder OBLA (Onset of Blood Lactate Accumulation) ist historisch die am häufigsten verwendete Methode. Sie basiert auf der Beobachtung, dass bei ca. 4 mmol/L eine kritische Schwelle für die Laktatakkumulation erreicht wird.

#### Physiologische Bedeutung
- **2.0 mmol/L (LT1)**: Beginn der signifikanten Laktatproduktion über Ruhewert
- **4.0 mmol/L (LT2/OBLA)**: 
  - Klassische "anaerobe Schwelle"
  - Maximale Dauerleistungsgrenze (ca. 1 Stunde)
  - Grenze des Laktat-Steady-State für die meisten Athleten

#### Einschränkungen
- Ignoriert individuelle Unterschiede in Baseline-Laktatwerten
- Kann bei hochtrainierten Ausdauerathleten zu niedrig sein
- Bei untrainierten Personen oft zu hoch

#### Mathematische Implementierung

```
1. Lineare Interpolation für exakte Leistung bei Ziellaktat:
   
   Finde i sodass Laktatᵢ ≤ Ziel < Laktatᵢ₊₁

2. Interpolationsformel:
   t = (Ziel - Laktatᵢ) / (Laktatᵢ₊₁ - Laktatᵢ)
   P = Pᵢ + t × (Pᵢ₊₁ - Pᵢ)

3. Fallback bei fehlenden Datenpunkten:
   Verwendung der polynomialen Regression mit binärer Suche
```

#### Literatur
- Mader, A., Liesen, H., Heck, H., Philippi, H., Rost, R., Schürch, P., & Hollmann, W. (1976). Zur Beurteilung der sportartspezifischen Ausdauerleistungsfähigkeit im Labor. *Sportarzt und Sportmedizin*, 27, 80-88.

---

### 4. Log-Log Transformation (Beaver et al., 1985)

#### Wissenschaftlicher Hintergrund
Diese Methode nutzt die logarithmische Transformation beider Achsen (Leistung und Laktat), um nichtlineare Beziehungen zu linearisieren. Der Breakpoint in der log-log Darstellung entspricht dem Laktatschwellenpunkt.

#### Physiologische Bedeutung
- Die log-log Transformation verstärkt Änderungen bei niedrigen Werten
- Der Breakpoint markiert den Übergang von aerober zu anaerober Dominanz
- Weniger sensitiv gegenüber Ausreißern als lineare Methoden

#### Mathematische Implementierung

```
1. Logarithmische Transformation:
   logP = ln(Leistung)
   logL = ln(Laktat)

2. Zwei-Linien-Regression mit variablem Breakpoint:
   Für jeden möglichen Breakpoint bp ∈ [2, n-2]:
   
   Segment 1: y = m₁x + b₁ für Punkte 1 bis bp
   Segment 2: y = m₂x + b₂ für Punkte bp bis n
   
   Lineare Regression für jedes Segment:
   m = (n·Σxy - Σx·Σy) / (n·Σx² - (Σx)²)
   b = (Σy - m·Σx) / n

3. Optimalen Breakpoint finden:
   bp_optimal = argmin(Σᵢ(yᵢ - ŷᵢ)²)
   
   wobei ŷᵢ = m₁·xᵢ + b₁ für i ≤ bp
         ŷᵢ = m₂·xᵢ + b₂ für i > bp

4. LT2 = Leistung am optimalen Breakpoint
   LT1 = Erster Punkt mit signifikanter Steigungsänderung vor bp
```

#### Literatur
- Beaver, W. L., Wasserman, K., & Whipp, B. J. (1985). Improved detection of lactate threshold during exercise using a log-log transformation. *Journal of Applied Physiology*, 59(6), 1936-1940.

---

### 5. Baseline +1.0 mmol/L (Faude et al., 2009)

#### Wissenschaftlicher Hintergrund
Diese Methode, entwickelt in der deutschen Sportwissenschaft, verwendet den minimalen Laktatwert während des Tests als Referenz und definiert LT2 als +1.0 mmol/L über diesem Minimum.

#### Physiologische Bedeutung
- **Laktat-Minimum**: Repräsentiert den Punkt optimaler aerober Funktion
- **+1.0 mmol/L**: Konservativer Schwellenwert für intensive Dauerbelastungen
- Besonders geeignet für Ausdauerathleten mit niedrigen Baseline-Werten

#### Mathematische Implementierung

```
1. Laktat-Minimum in erster Testhälfte finden:
   Baseline = min(Laktat₁, Laktat₂, ..., Laktatₙ/₂)
   P_min = Leistung bei Baseline

2. LT1 = Leistung am Laktat-Minimum

3. LT2 via Interpolation bei Baseline + 1.0 mmol/L:
   Ziel = Baseline + 1.0
   Lineare Interpolation wie bei Mader-Methode
```

#### Literatur
- Faude, O., Kindermann, W., & Meyer, T. (2009). Lactate threshold concepts: how valid are they? *Sports Medicine*, 39(6), 469-490.

---

### 6. Modified DMAX (Bishop et al., 1998)

#### Wissenschaftlicher Hintergrund
Die modifizierte DMAX-Methode verbessert die ursprüngliche DMAX, indem sie den Startpunkt der Baseline-Linie am Laktat-Minimum statt am ersten Messpunkt setzt. Dies eliminiert den Einfluss von Erwärmungseffekten.

#### Physiologische Bedeutung
- Eliminiert "Warm-up"-Artefakte in den frühen Teststufen
- Der Laktat-Minimum-Punkt repräsentiert die wahre aerobe Baseline
- Genauere MLSS-Schätzung besonders bei stufenförmigen Belastungsprotokollen

#### Mathematische Implementierung

```
1. Laktat-Minimum in erster Testhälfte finden:
   i_min = argmin(Laktatᵢ) für i ≤ n/2
   
2. Relevante Daten = Punkte ab Laktat-Minimum:
   Daten' = [(Pᵢ_min, Lᵢ_min), ..., (Pₙ, Lₙ)]

3. Polynomiale Regression 3. Grades auf Daten':
   Laktat(P) = a₀ + a₁P + a₂P² + a₃P³

4. Baseline-Linie vom Minimum zum Endpunkt:
   m = (Lₙ - Lᵢ_min) / (Pₙ - Pᵢ_min)
   b = Lᵢ_min - m × Pᵢ_min

5. ModDMAX = Maximum der senkrechten Distanz:
   d(P) = |Laktatₖᵤᵣᵥₑ(P) - (m×P + b)| / √(1 + m²)
   
   ModDMAX = argmax(d(P)) für P ∈ [Pᵢ_min, Pₙ]

6. LT1 = Leistung am Laktat-Minimum
   LT2 = ModDMAX Leistung
```

#### Literatur
- Bishop, D., Jenkins, D. G., & Mackinnon, L. T. (1998). The relationship between plasma lactate parameters, Wpeak and 1-h cycling performance in women. *Medicine and Science in Sports and Exercise*, 30(8), 1270-1275.

---

### 7. Seiler 3-Zonen Modell (Seiler & Kjerland, 2006)

#### Wissenschaftlicher Hintergrund
Stephen Seiler entwickelte das "Polarized Training" Konzept basierend auf der Beobachtung, dass erfolgreiche Ausdauerathleten den Großteil ihres Trainings entweder mit niedriger Intensität (Zone 1) oder hoher Intensität (Zone 3) absolvieren, mit wenig Zeit in der mittleren Zone 2.

#### Physiologische Bedeutung
- **VT1 (≈ LT1)**: Erste ventilatorische Schwelle
  - Beginn der erhöhten Ventilation pro O₂-Aufnahme
  - Subjektiv: Noch problemlose Unterhaltung möglich
  
- **VT2 (≈ LT2)**: Zweite ventilatorische Schwelle
  - Respiratorische Kompensation der metabolischen Azidose
  - Subjektiv: Nur noch kurze Sätze möglich

#### Die 3 Trainingszonen
1. **Zone 1** (< VT1): Regeneration, Grundlagenausdauer, Fettstoffwechsel
2. **Zone 2** (VT1-VT2): "Graue Zone", oft ineffektiv für Adaptation
3. **Zone 3** (> VT2): Hochintensives Training, VO₂max-Entwicklung

#### Mathematische Implementierung

```
1. Baseline berechnen:
   Baseline = min(Laktat₁, Laktat₂, Laktat₃)

2. VT1-Approximation (Laktat-basiert):
   VT1_Ziel = max(Baseline + 0.5, 1.8 mmol/L)

3. VT2-Approximation (Laktat-basiert):
   VT2_Ziel = max(Baseline + 2.0, 3.5 mmol/L)

4. Lineare Interpolation für exakte Leistungswerte
```

#### Literatur
- Seiler, K. S., & Kjerland, G. Ø. (2006). Quantifying training intensity distribution in elite endurance athletes: is there evidence for an "optimal" distribution? *Scandinavian Journal of Medicine & Science in Sports*, 16(1), 49-56.

---

### 8. FatMax/LT Methode (San-Millán & Brooks, 2018)

#### Wissenschaftlicher Hintergrund
Diese Methode kombiniert die Laktatanalyse mit der Fettoxidationsrate (wenn verfügbar). Sie basiert auf dem "Crossover Concept", das beschreibt, wie die Substratnutzung von Fett zu Kohlenhydraten wechselt.

#### Physiologische Bedeutung
- **FatMax**: 
  - Intensität mit maximaler Fettverbrennung (g/min)
  - Typischerweise bei 60-70% VO₂max
  - Korreliert oft mit LT1
  
- **LT1 (Baseline + 0.5 mmol/L)**:
  - Erste Laktatakkumulation
  - Beginn des Substratshifts
  
- **LT2 (Baseline + 1.5 mmol/L)**:
  - MLSS-Approximation
  - Fettoxidation stark reduziert

#### Das Crossover-Konzept
```
                Energiebeitrag
                     ↑
                     │      Kohlenhydrate
          100% ─────│────────────────────────/
                     │                      /
                     │                    /
           50% ─────│──────────────X────    ← Crossover Point
                     │            /
                     │          /
            0% ─────│────────/────────────── Fette
                     └─────────────────────→ Intensität
                          FatMax    LT1   LT2
```

#### Mathematische Implementierung

```
1. Baseline und Schwellen wie bei Dickhuth-Methode

2. FatMax-Bestimmung (wenn Fettoxidationsdaten vorhanden):
   FatMax = argmax(Fettoxidation(P))
   
3. Verfeinerung von LT1:
   Wenn FatMax verfügbar und valide:
     LT1 ≈ Leistung bei FatMax
   Sonst:
     LT1 = Baseline + 0.5 mmol/L

4. LT2 (MLSS-Approximation):
   LT2 = Baseline + 1.5 mmol/L
```

#### Literatur
- San-Millán, I., & Brooks, G. A. (2018). Assessment of metabolic flexibility by means of measuring blood lactate, fat, and carbohydrate oxidation responses to exercise in professional endurance athletes and less-fit individuals. *Sports Medicine*, 48(2), 467-479.

---

## Mathematische Hilfsfunktionen

### Polynomiale Regression 3. Grades

Die Polynomfunktion $f(P) = a_0 + a_1 P + a_2 P^2 + a_3 P^3$ wird über die Methode der kleinsten Quadrate angepasst.

**Normalengleichung:**
$$
(X^T X) \vec{a} = X^T \vec{y}
$$

wobei $X$ die Vandermonde-Matrix ist:
$$
X = \begin{bmatrix}
1 & p_1 & p_1^2 & p_1^3 \\
1 & p_2 & p_2^2 & p_2^3 \\
\vdots & \vdots & \vdots & \vdots \\
1 & p_n & p_n^2 & p_n^3
\end{bmatrix}
$$

**Normalisierung für numerische Stabilität:**
$$
p_{norm} = \frac{P - P_{min}}{P_{max} - P_{min}}
$$

### Lineare Interpolation

Für Punkte $(P_i, L_i)$ und $(P_{i+1}, L_{i+1})$ mit Ziellaktat $L_{target}$:

$$
t = \frac{L_{target} - L_i}{L_{i+1} - L_i}
$$

$$
P_{target} = P_i + t \cdot (P_{i+1} - P_i)
$$

### Senkrechte Distanz zur Linie

Für Punkt $(P, L_{curve})$ und Linie $L = mP + b$:

$$
d = \frac{|L_{curve} - (mP + b)|}{\sqrt{1 + m^2}}
$$

---

## Methodenvergleich und Empfehlungen

### Wann welche Methode verwenden?

| Athletenprofil | Empfohlene Methode(n) | Begründung |
|----------------|----------------------|-------------|
| **Hochtrainiert** | DMAX, ModDMAX | Berücksichtigt individuelle Kurvenform |
| **Ausdauerathleten** | Dickhuth, +1.0 mmol/L | Baseline-basiert, niedrigere absolute Werte |
| **Untrainierte** | Mader 4mmol | Konservativ, breite Validierung |
| **Polarisiertes Training** | Seiler 3-Zone | Direkt anwendbare Trainingszonen |
| **Metabolische Analyse** | FatMax/LT | Integration von Fettoxidationsdaten |
| **Wissenschaftliche Studien** | Log-Log, DMAX | Mathematisch objektiv, reproduzierbar |

### Typische LT2-Werte nach Trainingsstand

| Trainingsstand | LT2 (% VO₂max) | LT2 Laktat (mmol/L) |
|----------------|----------------|---------------------|
| Untrainiert | 50-60% | 3.0-4.5 |
| Freizeitsportler | 60-70% | 3.5-4.5 |
| Leistungssportler | 70-80% | 3.0-4.0 |
| Elite-Ausdauer | 80-90% | 2.5-3.5 |

---

## Literaturverzeichnis

1. Beaver, W. L., Wasserman, K., & Whipp, B. J. (1985). Improved detection of lactate threshold during exercise using a log-log transformation. *Journal of Applied Physiology*, 59(6), 1936-1940.

2. Bishop, D., Jenkins, D. G., & Mackinnon, L. T. (1998). The relationship between plasma lactate parameters, Wpeak and 1-h cycling performance in women. *Medicine and Science in Sports and Exercise*, 30(8), 1270-1275.

3. Cheng, B., Kuipers, H., Snyder, A. C., Keizer, H. A., Jeukendrup, A., & Hesselink, M. (1992). A new approach for the determination of ventilatory and lactate thresholds. *International Journal of Sports Medicine*, 13(7), 518-522.

4. Dickhuth, H. H., Yin, L., Niess, A., Röcker, K., Mayer, F., Heitkamp, H. C., & Horstmann, T. (1999). Ventilatory, lactate-derived and catecholamine thresholds during incremental treadmill running: relationship and reproducibility. *International Journal of Sports Medicine*, 20(2), 122-127.

5. Faude, O., Kindermann, W., & Meyer, T. (2009). Lactate threshold concepts: how valid are they? *Sports Medicine*, 39(6), 469-490.

6. Mader, A., Liesen, H., Heck, H., Philippi, H., Rost, R., Schürch, P., & Hollmann, W. (1976). Zur Beurteilung der sportartspezifischen Ausdauerleistungsfähigkeit im Labor. *Sportarzt und Sportmedizin*, 27, 80-88.

7. San-Millán, I., & Brooks, G. A. (2018). Assessment of metabolic flexibility by means of measuring blood lactate, fat, and carbohydrate oxidation responses to exercise in professional endurance athletes and less-fit individuals. *Sports Medicine*, 48(2), 467-479.

8. Seiler, K. S., & Kjerland, G. Ø. (2006). Quantifying training intensity distribution in elite endurance athletes: is there evidence for an "optimal" distribution? *Scandinavian Journal of Medicine & Science in Sports*, 16(1), 49-56.

---

*Dokumentation erstellt: November 2025*
*Version: 1.0*
*Lactate Dashboard - Wissenschaftliche Schwellenanalyse*
