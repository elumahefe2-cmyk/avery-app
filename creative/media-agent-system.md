# OpenTXT Media Agent System (v0.1)

_Last updated: 2026-03-30 UTC_

## Goal
Build a repeatable content engine for OpenTXT that turns market research into production-ready short-form video briefs, then hands those briefs to n8n for automated video generation.

This system is designed to help OpenTXT grow by producing a high volume of relevant, high-conviction marketing videos informed by real market behavior rather than generic AI brainstorming.

---

## Operating Model

### 1. Growth Research Agent
Responsible for finding what is working in the market.

#### Core responsibilities
- Research direct competitors, adjacent competitors, and strong operators in lead-gen / follow-up / CRM automation / revenue recovery.
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
The Growth Research Agent must output a structured **Research Packet** rather than loose notes.

---

### 2. Media Agent
Responsible for turning research into production-ready video concepts.

#### Core responsibilities
- Receive a Research Packet from the Growth Research Agent.
- Select the strongest opportunities based on OpenTXT relevance and likely conversion impact.
- Generate 40–80 second short-form video ideas.
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

```json
{
  "event": "generate_marketing_video",
  "environment": "test",
  "brand": "OpenTXT",
  "brief": {
    "briefId": "uuid-or-slug",
    "conceptTitle": "string",
    "durationSeconds": 40,
    "targetPersona": "string",
    "marketSegment": "string",
    "platformTarget": ["instagram", "x"],
    "hook": "string",
    "coreMessage": "string",
    "cta": "string",
    "tone": "string",
    "sceneOutline": [],
    "productionNotes": {},
    "assetsNeeded": []
  },
  "sourceResearchSummary": {
    "researchId": "uuid-or-slug",
    "topInsights": [],
    "competitorsReviewed": [],
    "referenceUrls": []
  },
  "returnInstructions": {
    "deliverBackTo": "media-agent",
    "includeRenderUrl": true,
    "includeProjectFiles": false,
    "includeMetadata": true
  }
}
```

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
10. n8n returns render/output metadata.
11. Media Agent reviews and prepares next action (revision, approval, posting prep).

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
5. Test the n8n webhook with a small sample payload when Jacomo is ready.
6. Add a content-log file so every created video concept is tracked.

---

## Notes
- The current webhook URL is a **test** endpoint and must be armed manually before testing.
- Early-stage mode should favor review + approval before full automation.
- This system should optimize for business growth, not content volume alone.
