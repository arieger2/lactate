# CLAUDE.md — Lactate Dashboard

## Project Purpose

This is a **Next.js lactate analysis dashboard** for sports science — it calculates LT1/LT2 thresholds from lactate step-test data using scientific methods (Dickhuth, DMAX, Mader/OBLA, ModDMAX).

**Claude's primary role in this project**: build and maintain **n8n workflows** on the connected n8n instance that power the dashboard's AI features. You have access to:

1. **n8n MCP server** — direct API access to the n8n instance (list, create, update, activate/deactivate workflows, manage executions)
   - Configured in `~/.claude/mcp.json` as server name `n8n`
   - MCP endpoint: `https://n8n.arieger.net/mcp`
2. **n8n skills** — slash command helpers for scaffolding common workflow patterns

Always prefer the **MCP server** for actual API operations; use skills for scaffolding/reference.

---

## n8n Instance

- **URL**: `https://n8n.arieger.net`
- **Primary workflow**: `Lactate Analytics Router` — ID `ljNATO9oj54uhfzmTM84Z`
- **Webhook entry point**: `POST /webhook/lactate-analytics`

### Payload sent by the dashboard → n8n

```json
{
  "data": {
    "sessionId": "uuid",
    "customerId": "uuid",
    "customerName": "Max Mustermann",
    "unit": "watt",
    "currentMethod": "dmax",
    "lactateData": [
      { "power": 100, "lactate": 1.2, "heartRate": 130 }
    ],
    "currentThresholds": {
      "lt1": { "power": 185, "lactate": 2.1 },
      "lt2": null
    },
    "timestamp": "2026-04-01T12:00:00.000Z"
  }
}
```

Access in n8n expressions via `{{ $json.data.lactateData }}`, `{{ $json.data.currentMethod }}`, etc.

### Expected response from n8n → dashboard

```json
{
  "lt1": { "power": 185, "lactate": 2.1 },
  "lt2": { "power": 265, "lactate": 4.0 },
  "method": "dickhuth",
  "zones": [],
  "reasoning": "Based on the lactate curve shape..."
}
```

If only reasoning is returned (no `lt1`/`lt2`), the dashboard shows it as a text alert.

---

## Workflow Quality Standards

When building n8n workflows, always follow these guidelines:

- **Webhooks**: use `responseMode: responseNode` — never `lastNode`
- **Switch nodes**: always configure the error/fallback output
- **AI agents**: prompts must be **domain-specific** (lactate physiology, threshold science) — not generic templates
- **Model**: use `o1` with `reasoningEffort: high` for all lactate analysis agents
- **Structured output**: all AI agents must return valid JSON matching the response schema above
- **Node naming**: use descriptive names (`Parse Lactate Payload`, not `Set1`)
- **Error handling**: every branch must connect to a `Respond to Webhook` node, including error paths

---

## Dashboard ↔ n8n Integration Points

| File | Role |
|------|------|
| `app/api/ai-analysis/route.ts` | Next.js API route that calls n8n; parses response into `lt1`/`lt2` |
| `app/components/PerformanceCurveOrchestrator.tsx` | `handleAIAdjust()` — triggers the API call, applies result to chart |
| `app/components/performance-curve/ThresholdMethodSelector.tsx` | "AI Anpassung" button that calls `handleAIAdjust` |
| `.env.local` | `N8N_LACTATE_WEBHOOK_URL=https://n8n.arieger.net/webhook/lactate-analytics` |

---

## Threshold Methods (domain knowledge)

| Key | Name | Reference | LT1 | LT2 |
|-----|------|-----------|-----|-----|
| `dickhuth` | Dickhuth IAT | Dickhuth et al. 1999 | baseline + 0.5 mmol/L above rest | individual anaerobic threshold |
| `dmax` | DMAX | Cheng et al. 1992 | — | max distance from line between first/last point |
| `mader` | 4 mmol OBLA | Heck et al. 1985 | 2 mmol/L | 4 mmol/L fixed |
| `moddmax` | ModDMAX | Bishop et al. 1998 | — | modified DMAX on log curve |
| `adjusted` | Manual/AI | — | user-dragged or AI-set | user-dragged or AI-set |

---

## Tech Stack

- **Framework**: Next.js 16 / TypeScript
- **Styling**: Tailwind CSS (dark mode supported)
- **Charts**: ECharts
- **Database**: PostgreSQL — config in `config/app.config.json` (single source of truth)
- **Threshold logic**: `lib/threshold-methods/` (one file per method)
- **Types**: `lib/types.ts`

---

## Key Conventions

- Do not use inline styles when Tailwind classes suffice (existing code has some legacy inline styles — do not add more)
- All `<button>` elements need `type="button"` unless they submit a form
- Database config changes go in `config/app.config.json` only — not `.env.local`
- API routes live in `app/api/`; each folder has a single `route.ts`
