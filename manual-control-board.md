# OpenTXT Manual Control Board (v0.1)

_Last updated: 2026-03-17 01:37 UTC_

## 1. Executive Snapshot
- **MRR:** _pending data_
- **Active customers:** _pending data_
- **New customers today:** _pending data_
- **SMS health:** _unknown (need deliverability feed)_
- **Critical alerts:** None reported yet

## 2. Customer & Revenue Pipeline
| Stage | Count | Notes |
|-------|-------|-------|
| Website sign-ups | _pending_ | Pull from opentxt.ai analytics |
| Onboarding in progress | _pending_ | Need admin dashboard data |
| Active paying | _pending_ | Link to billing system |
| Churn risk | _pending_ | Requires health scoring feed |

**Immediate actions**
- [ ] Collect onboarding queue from platform once admin access is granted
- [ ] List upcoming renewals/expansions

## 3. SMS & Campaign Operations
- **Messages sent (24h / 7d):** _pending_
- **Delivery rate:** _pending_
- **Response rate:** _pending_
- **Top live campaigns:** _pending list_
- **Compliance status:** waiting for platform data

**Manual checks queued**
1. Verify carrier/10DLC status inside OpenTXT admin
2. Pull template performance for improvement ideas

## 4. Growth & Marketing
- **Active acquisition channels:** Website (reviewed), others _TBD_
- **Experiments running:** none logged yet
- **Immediate growth to-dos:**
  - Audit current funnel from opentxt.ai to signup (conversion data needed)
  - Identify quick-win channels (partners, referrals) once metrics are available

## 5. Agent & Workstream Tracker
| Agent | Role | Status | Current Task |
|-------|------|--------|--------------|
| Avery (me) | Central operator | ACTIVE | Coordinate agents, strategy, and command center |
| Growth research bot | Market + competitor intelligence | PLANNED | Research X / Instagram / web trends, ad patterns, and competitor messaging |
| Deliverability auditor | SMS performance assurance | PLANNED | Audit deliverability, carrier health, and response bottlenecks |
| CRM sync verifier | Systems reliability | PLANNED | Verify CRM sync health and identify pipeline integrity issues |
| Media Agent | Content strategy + video briefing | PLANNED | Turn research packets into 40–80 second video briefs and trigger n8n renders |

**Next potential sub-agent tasks**
- Build research packet workflow between Growth Research -> Media Agent
- Test n8n webhook handoff for video-generation payloads
- Create content memory/log to track produced concepts and outputs

## 6. Operational Alerts & Requests
- **Credentials pending:** Google profile with auto-logins, OpenTXT admin account
- **Outstanding decisions from Jacomo:** none
- **Blocking issues:** lack of live data feeds (waiting on access)

## 7. Notes & Next Steps
1. Await credentials to pull real metrics into this board
2. Expand this doc into the full Command & Control dashboard plan once data is in
3. After approval, start building the interactive dashboard + agent console
