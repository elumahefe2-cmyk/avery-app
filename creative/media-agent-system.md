# OpenTXT Media Agent System (v0.1)

_Last updated: 2026-03-30 UTC_

## Goal
Build a repeatable content engine for OpenTXT that turns market research into production-ready short-form video briefs, then hands those briefs to n8n for automated video generation.

The system should support multiple videos targeting specific customer segments and personas rather than only broad market creative.

This system is designed to help OpenTXT grow by producing a high volume of relevant, high-conviction marketing videos informed by real market behavior rather than generic AI brainstorming.

---

## Operating Model

### 1. Growth Research Agent
Responsible for finding what is working in the market and supporting broader research/planning needs across OpenTXT.

#### Core responsibilities
- Research direct competitors, adjacent competitors, and strong operators in lead-gen / follow-up / CRM automation / revenue recovery.
- Support broader business research and planning, not just video ideation. This includes go-to-market analysis, messaging research, vertical research, offer research, channel discovery, positioning work, campaign planning, and market intelligence for strategic decisions.
- Search public web results across:
  - X / Twitter posts indexed on the web
  - Instagram pages/posts/reels indexed on the web
  - Google/web search results
  - competitor websites / landing pages / product pages
  - ad/video pages or public content where available
- Identify:
  - hooks
  - recurring pain points
  - promises / claims
  - CTA patterns
  - video / ad styles
  - audience targeting patterns
  - posting / campaign patterns
  - offer positioning
- Analyze whether a discovered video/ad angle can be adapted for OpenTXT.

#### Output
The Growth Research Agent must output a structured **Research Packet** rather than loose notes. Depending on the task, the packet may support media creation, growth planning, offer strategy, market mapping, or campaign planning.

---

### 2. Media Agent
Responsible for turning research into production-ready video concepts.

#### Core responsibilities
- Receive a Research Packet from the Growth Research Agent.
- Select the strongest opportunities based on OpenTXT relevance and likely conversion impact.
- Generate 40–80 second short-form video ideas.
- Create multiple targeted concepts aimed at specific customer segments, personas, or pain profiles when requested.
- Organize each idea into a production-ready creative brief.
- Send the selected brief to n8n through webhook once approved for testing/production.
- Receive generated outputs back from the automation pipeline for review and next-step handling.

#### Output
The Media Agent must output a structured **Media Brief** that can be consumed by automation.

---

## Improvement Rules

### A. Structured handoff only
The Research Agent must never hand off unstructured blobs of text. All research must be normalized into a fixed schema.

### B. Opportunity scoring required
Every researched angle should be scored before entering production.

### C. Production-grade briefs only
The Media Agent should produce execution-ready briefs, not vague ideas.

### D. Approval gate first
At the start, the system should use a human-in-the-loop review before automated generation and publishing.

### E. Content memory required
Every created concept should be logged to reduce repetition and build institutional memory.

### F. Split research types
The Research Agent should separate:
- direct competitor research
- adjacent market research
- platform trend research
- pain-point conversation research

---

## Research Packet Schema

```json
{
  "researchId": "uuid-or-slug",
  "createdAt": "ISO-8601",
  "brand": "OpenTXT",
  "objective": "generate short-form video opportunities",
  "marketSegments": ["MCA", "Insurance", "Real Estate"],
  "researchScope": {
    "competitors": [],
    "adjacentPlayers": [],
    "platforms": ["web", "x", "instagram"],
    "keywords": []
  },
  "findings": [
    {
      "sourceType": "competitor|adjacent|trend|pain-point",
      "brandOrSource": "string",
      "platform": "web|x|instagram|youtube|other",
      "url": "https://...",
      "contentType": "landing-page|post|video|ad|thread|reel|article",
      "targetPersona": "string",
      "hookPattern": "string",
      "painPoint": "string",
      "promise": "string",
      "ctaStyle": "string",
      "formatStyle": "string",
      "visualStyle": "string",
      "tone": "string",
      "notes": "string",
      "adaptationIdea": "how OpenTXT could adapt this",
      "scores": {
        "relevance": 1,
        "conversionPotential": 1,
        "productionEase": 1,
        "novelty": 1,
        "overall": 1
      }
    }
  ],
  "topOpportunities": [
    {
      "title": "string",
      "whyItMatters": "string",
      "targetPersona": "string",
      "suggestedAngle": "string",
      "score": 1
    }
  ],
  "analystSummary": "string"
}
```

---

## Media Brief Schema

```json
{
  "briefId": "uuid-or-slug",
  "createdAt": "ISO-8601",
  "brand": "OpenTXT",
  "campaignType": "short-form video",
  "durationSeconds": 40,
  "objective": "book demos|drive awareness|reactivate leads|educate market",
  "targetPersona": "string",
  "marketSegment": "MCA|Insurance|Real Estate|Other",
  "platformTarget": ["instagram", "x", "youtube-shorts", "tiktok"],
  "conceptTitle": "string",
  "conceptAngle": "string",
  "hook": "string",
  "coreMessage": "string",
  "cta": "string",
  "tone": "string",
  "styleReference": "string",
  "sourceResearchIds": [],
  "sceneOutline": [
    {
      "scene": 1,
      "durationSeconds": 5,
      "visual": "string",
      "voiceover": "string",
      "onScreenText": "string",
      "purpose": "string"
    }
  ],
  "productionNotes": {
    "visualStyle": "string",
    "editingStyle": "string",
    "musicStyle": "string",
    "captions": true,
    "brandElements": []
  },
  "assetsNeeded": [],
  "riskNotes": [],
  "successHypothesis": "string"
}
```

---

## Webhook Payload Schema (Media Agent -> n8n)

The Media Agent must send the n8n payload in the **exact webhook envelope shape** expected by n8n test/production webhook executions:
- top-level value must be an **array**
- array must contain **one object**
- object must contain these keys exactly: `headers`, `params`, `query`, `body`
- the actual OpenTXT content payload must live inside `body`

### Canonical envelope

```json
[
  {
    "headers": {
      "host": "n8n.srv992844.hstgr.cloud",
      "user-agent": "avery-media-agent/1.0",
      "content-type": "application/json"
    },
    "params": {},
    "query": {},
    "body": {
      "workflow": "opentxt-content-brief",
      "timestamp": "ISO-8601",
      "source": "avery",
      "briefId": "opentxt-2026-04-07-mca-followup-gap-01",
      "researchBasis": "competitor-first",
      "researchSummary": {
        "competitors": [
          {
            "name": "string",
            "url": "https://...",
            "observations": ["string"]
          }
        ],
        "patterns": ["string"],
        "platformInsights": {
          "instagram": ["string"],
          "x": ["string"]
        }
      },
      "brief": {
        "brand": "OpenTXT",
        "objective": "Create a short-form video ad/content asset for social distribution based on competitor-proven messaging patterns",
        "targetAudience": "string",
        "coreProblem": "string",
        "coreMessage": "string",
        "creativeDirection": {
          "style": "string",
          "avoid": ["string"],
          "emphasize": ["string"]
        },
        "videoStructure": {
          "hook": "string",
          "problem": "string",
          "solution": "string",
          "cta": "string"
        },
        "deliverablesRequested": ["string"],
        "platforms": ["Instagram", "X", "paid social"]
      },
      "webhookUrl": "https://n8n.srv992844.hstgr.cloud/webhook-test/...",
      "executionMode": "test"
    }
  }
]
```

### Hard requirements

- Do **not** send a bare object.
- Do **not** put the brief at the top level.
- Do **not** omit the array wrapper.
- Do **not** duplicate `webhookUrl` or `executionMode` outside `body`.
- Every outbound webhook payload must include a generated `briefId` inside `body`.
- `briefId` should be unique and human-readable enough to trace, ideally using a slug-like pattern such as `opentxt-YYYY-MM-DD-topic-01`.
- `researchBasis` must remain `competitor-first` for content-generation requests.
- Research inputs should be derived from competitor analysis, especially X and Instagram, per operating directive.
- `body.brief` should stay concise, structured, and automation-safe.

### Mapping rule

When the Media Agent produces an internal brief batch, convert the selected brief into the canonical `body.brief` structure above before sending to n8n. Treat the envelope format shown here as the source of truth for webhook delivery, even if internal planning formats differ.


---

## Workflow

### Phase 1 — Research
1. Growth Research Agent gathers market and competitor inputs.
2. It structures findings into a Research Packet.
3. It ranks opportunities.

### Phase 2 — Synthesis
4. Media Agent receives the Research Packet.
5. Media Agent chooses the best content opportunity.
6. Media Agent creates one or more Media Briefs.

### Phase 3 — Approval
7. Human reviews the selected brief.
8. Once approved, Media Agent sends webhook payload to n8n.

### Phase 4 — Production
9. n8n generates the video.
10. n8n returns the generated video URL plus the matching `briefId`.
11. Media Agent matches the returned asset to the originating brief via `briefId`, logs it, and prepares next action (revision, approval, posting prep).

### n8n return contract
The minimal return payload from n8n should be:

```json
{
  "briefId": "opentxt-2026-04-07-mca-followup-gap-01",
  "video_url": "https://.../render.mp4"
}
```

`videoUrl` is also acceptable if n8n is configured that way, but `video_url` is now the observed working return field from the live test.

If n8n returns only a video URL with no `briefId`, the Media Agent cannot reliably determine which brief the asset belongs to when multiple renders are in flight.

---

## Proposed Near-Term Subagent Map

### Existing placeholder/planned subagents
1. Growth research bot
2. Deliverability auditor
3. CRM sync verifier

### New subagent to add
4. Media Agent

---

## Immediate Next Steps
1. Formally define the **Media Agent** as subagent #4 in the control board.
2. Update the manual control board to reflect the new media workflow.
3. Create a reusable prompt/spec for the Growth Research Agent.
4. Create a reusable prompt/spec for the Media Agent.
5. Add automation-ready task templates with strict JSON output requirements.
6. Support multi-video batches targeted at specific customer segments/personas.
7. Test the n8n webhook with a small sample payload when Jacomo is ready.
8. Add a content-log file so every created video concept is tracked.

---

## Notes
- The current webhook URL is a **test** endpoint and must be armed manually before testing.
- Early-stage mode should favor review + approval before full automation.
- This system should optimize for business growth, not content volume alone.
- Live test validated on 2026-04-07: competitor-first MCA brief sent to n8n, `briefId` preserved, and n8n returned a matching `briefId` plus `video_url`, which was then downloaded locally.
