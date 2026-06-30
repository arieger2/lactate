# Lactate Dashboard

Lactate Dashboard is a scientific training-analysis application for endurance sports. It turns blood lactate step-test data into a usable performance curve, compares established threshold methods, and adds AI-assisted threshold proposals so coaches and athletes can evaluate scientific formulas against expert-style interpretation.

## GitHub Description

Turn blood lactate step-test data into plausible performance curves, compare scientific threshold methods, and add AI-assisted threshold interpretation for more reliable training guidance.

## Motivation

Blood lactate testing is widely used to steer endurance training, but the practical workflow is messy. Devices and apps can measure lactate reliably enough, yet the resulting training guidance often becomes inconsistent for two reasons:

1. Raw step-test measurements are noisy, incomplete, or affected by measurement artifacts, which makes the resulting lactate curve harder to interpret.
2. Different scientific threshold models can produce different LT1 and LT2 results for the same athlete, which makes training decisions less consistent.

This project addresses both problems:

- It builds a more plausible lactate-performance curve from measured sensor data using smoothing, interpolation, and scientifically grounded curve handling.
- It combines multiple published threshold methods with AI-assisted analysis so sports-science expertise can be brought into the workflow and compared directly against formula-based results.

## Features

- Interactive lactate curve visualization for step-test analysis
- Multiple scientific threshold methods including DMAX, Dickhuth, Mader, and ModDMAX
- AI-assisted threshold analysis via an n8n workflow integrated with the dashboard API
- Automatic training-zone calculation with support for manual threshold adjustments
- Incomplete-stage interpolation and curve smoothing to stabilize noisy test data
- Customer, session, and test protocol management backed by PostgreSQL

## Documentation

- **[USER_GUIDE.md](./USER_GUIDE.md)** - Complete setup and usage instructions
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Technical architecture and system design
- **[docs/THRESHOLD_METHODS.md](./docs/THRESHOLD_METHODS.md)** - Scientific threshold methods with physiological explanations
- **[docs/API_WEBHOOKS.md](./docs/API_WEBHOOKS.md)** - API endpoints and webhook integration for AI analysis

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- ECharts
- PostgreSQL
- Tailwind CSS

## Getting Started

First, run the development server:

```sh

```
```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
