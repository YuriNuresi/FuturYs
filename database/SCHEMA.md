# FuturY - Database Schema Documentation

> SQLite database schema for FuturY galactic strategy game.
> **Version:** 1.0 | **Engine:** SQLite 3 | **File:** `database/futury.db`

---

## Entity Relationship Overview

```
players ──1:N──► game_sessions ──1:1──► player_resources
    │                  │
    │                  ├──1:N──► missions
    │                  ├──1:N──► colonies ──1:N──► colony_buildings
    │                  ├──1:N──► player_technologies
    │                  ├──1:N──► time_tracker
    │                  ├──1:N──► scheduled_events
    │                  ├──1:N──► session_events
    │                  └──1:N──► nation_relations
    │
    └──► nations ◄──────────────┘

planets ──1:N──► moons
    │
    ├──◄── missions (target)
    └──◄── colonies (location)

technologies ──◄── player_technologies
buildings ──◄── colony_buildings
game_events ──◄── session_events
```

---

## Tables

### Core Game

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `players` | User accounts | username, email, nation_id |
| `game_sessions` | Save slots per player | player_id, current_game_year, save_data (JSON) |
| `time_tracker` | Time sync snapshots | session_id, game_year, real_timestamp |
| `scheduled_events` | Timed game triggers | session_id, trigger_year, event_type, event_data |

### World

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `nations` | Playable factions (8 total) | code, starting_*, multipliers, specialization |
| `planets` | Solar system bodies (8 planets) | distance_from_sun, habitability_score, is_colonizable |
| `moons` | Planetary satellites | planet_id, habitability_score, is_colonizable |

### Player State

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `player_resources` | 8 resource types per session | budget, science, population, energy, materials, food, water, oxygen |
| `player_technologies` | Research progress per session | technology_id, status (LOCKED→AVAILABLE→RESEARCHING→COMPLETED) |
| `missions` | Space missions | target_planet_id, status (PREPARING→TRAVELING→ARRIVED→COMPLETED) |
| `colonies` | Planetary colonies | planet_id/moon_id, population, local_*_production |
| `colony_buildings` | Buildings in colonies | colony_id, building_id, status, construction_progress |

### Game Systems

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `technologies` | Tech tree definitions | tech_code, category, tier, prerequisite_tech_ids, science_cost |
| `buildings` | Building type definitions | building_code, category, budget_cost, effects_data |
| `game_events` | Random event definitions | trigger_conditions, trigger_chance, effects_data |
| `session_events` | Events triggered in a session | game_event_id, triggered_year, player_choice |
| `nation_relations` | Diplomacy between nations | relationship_type, trust_level, trade_agreement |

---

## Key Indexes

| Index | Table | Columns | Purpose |
|-------|-------|---------|---------|
| idx_missions_arrival | missions | arrival_year | Fast mission completion check |
| idx_missions_status | missions | status | Filter active missions |
| idx_scheduled_events_trigger | scheduled_events | trigger_year, is_triggered | Time-based event processing |
| idx_player_resources_session | player_resources | session_id | Resource lookups |
| idx_session_events_year | session_events | triggered_year | Event history |

---

## Views

| View | Purpose |
|------|---------|
| `v_player_status` | Complete player state: resources, colonies count, active missions |
| `v_active_missions` | Active missions with target planet names, nation, years remaining |

---

## Triggers

| Trigger | Table | Purpose |
|---------|-------|---------|
| `tr_update_player_resources_timestamp` | player_resources | Auto-update `last_updated` on resource changes |
| `tr_update_game_session_timestamp` | game_sessions | Auto-update `last_update` on session changes |

---

## Seed Data

### Nations (8 playable)

| Code | Name | Specialization | Budget Multi | Science Multi |
|------|------|---------------|-------------|--------------|
| USA | United States | SCIENCE | 1.2x | 1.0x |
| CHN | China | EXPANSION | 1.0x | 1.0x |
| RUS | Russia | ENERGY | 1.0x | 1.1x |
| ESA | European Space Agency | SCIENCE | 1.05x | 1.05x |
| IND | India | EXPANSION | 0.95x | 1.1x |
| JPN | Japan | SCIENCE | 1.15x | 1.2x |
| UAE | United Arab Emirates | ECONOMY | 1.3x | 0.9x |
| BRA | Brazil | EXPANSION | 0.9x | 0.95x |

### Resource Types

1. **Budget** - Currency/credits
2. **Science** - Research points
3. **Population** - Inhabitants
4. **Energy** - Power units
5. **Materials** - Construction metals
6. **Food** - Sustenance
7. **Water** - H2O supply
8. **Oxygen** - Breathable air (colonies)

---

## Notes

- `*.db` files are **gitignored** (runtime-only, not in repo)
- Schema is in `database/schema.sql`
- JSON columns (`save_data`, `effects_data`, `event_data`, etc.) store flexible game data
- Time system: `game_year` is stored as REAL for sub-year precision (e.g., 2100.5 = mid-2100)
- All foreign keys reference parent tables with CASCADE implied by application logic
