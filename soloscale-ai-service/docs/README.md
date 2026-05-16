# SoloScale AI Service — Documentation

Developer 1 module for **SoloScale**: AI-powered campaign strategy, flyer images, and voice-overs.

| Document | Description |
| -------- | ----------- |
| [Getting started](./getting-started.md) | Install, configure `.env`, run locally |
| [API reference](./api-reference.md) | All endpoints, request/response shapes, errors |
| [Architecture](./architecture.md) | System design, key pools, storage, HTTP stack |
| [Workflows](./workflows.md) | What happens inside each endpoint step-by-step |
| [Prompts](./prompts.md) | Where prompts live and how they are built |
| [Troubleshooting](./troubleshooting.md) | Quota limits, 429s, network issues on Windows |

**Quick links**

- Dev console UI: `http://localhost:4000/` (when running locally)
- Health check: `GET /health`
- Cross-team JSON contract: `src/schemas/campaign.ts` (`CampaignStrategy`)
