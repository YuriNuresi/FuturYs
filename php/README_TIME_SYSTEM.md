# ⏰ FuturY - Time Management System

Sistema completo di gestione del tempo di gioco con sincronizzazione client-server, calcolo offline e eventi temporali.

## 📋 Componenti

### 1. Backend PHP

#### `php/core/TimeManager.php`
Gestione tempo lato server con calcolo offline.

**Funzionalità:**
- ✅ Aggiornamento tempo di gioco (24h reali = 1 anno gioco)
- ✅ Calcolo tempo offline automatico
- ✅ Creazione e gestione sessioni
- ✅ Pausa/Resume sessioni
- ✅ Logging nel time_tracker

**Metodi principali:**
```php
$timeManager->updateGameTime($sessionId);         // Aggiorna e ritorna tempo corrente
$timeManager->createSession($playerId, $name);    // Crea nuova sessione
$timeManager->togglePause($sessionId, $pause);    // Pausa/Resume
TimeManager::formatGameYear($gameYear);           // Formatta anno per display
```

#### `php/core/TimeEventSystem.php`
Sistema eventi basati sul tempo.

**Funzionalità:**
- ✅ Registrazione eventi programmati
- ✅ Trigger automatico al raggiungimento anno target
- ✅ Supporto tipi evento: TUTORIAL, TECH, MISSION, RANDOM, RESOURCE
- ✅ Eventi sample predefiniti

**Metodi principali:**
```php
$eventSystem->registerEvent($sessionId, $year, $type, $data);  // Registra evento
$eventSystem->processEvents($sessionId, $currentYear);         // Processa eventi
$eventSystem->createSampleEvents($sessionId, $startYear);      // Crea eventi demo
```

#### `php/api/time.php`
API REST per sincronizzazione tempo client-server.

**Endpoints:**

**GET** `/php/api/time.php?session_id=1`
```json
{
  "success": true,
  "data": {
    "game_year": 2100.5,
    "is_paused": false,
    "offline_years_elapsed": 0.12,
    "offline_hours": 2.88,
    "formatted": { "year": 2100, "day": 183 },
    "time_scale": { "real_hours": 24, "game_years": 1 }
  }
}
```

**POST** `/php/api/time.php`
```json
{
  "player_id": 1,
  "session_name": "My Game",
  "start_year": 2100
}
```

**PUT** `/php/api/time.php`
```json
{
  "session_id": 1,
  "action": "pause"  // o "resume"
}
```

#### `php/cron/time-advancement.php`
Cron job per aggiornamento automatico sessioni attive.

**Uso:**
```bash
# Esecuzione manuale
php php/cron/time-advancement.php

# Cron ogni minuto
* * * * * cd /path/to/FuturYs && php php/cron/time-advancement.php >> logs/cron.log 2>&1
```

### 2. Frontend JavaScript

#### `js/core/TimeManager.js`
Client-side time manager con sincronizzazione.

**Funzionalità:**
- ✅ Calcolo tempo locale (24h = 1 anno)
- ✅ Sincronizzazione con server
- ✅ Pausa/Resume
- ✅ Conversioni tempo reale ↔ tempo gioco
- ✅ Formattazione date

**Uso:**
```javascript
const timeManager = new TimeManager();
timeManager.init(2100, 2100);

// Nel game loop
timeManager.update();
const year = timeManager.getCurrentYear();
const date = timeManager.getCurrentDate();

// Pausa
timeManager.pause();
timeManager.resume();
```

### 3. Database

#### Tabella `game_sessions`
```sql
- game_start_year: Anno iniziale (default: 2100)
- current_game_year: Anno corrente (float con decimali)
- real_start_time: Timestamp inizio sessione
- last_update: Ultimo aggiornamento (per calcolo offline)
- is_paused: Sessione in pausa
- game_speed_multiplier: Moltiplicatore velocità (default: 365.25)
```

#### Tabella `time_tracker`
```sql
- session_id: FK a game_sessions
- real_timestamp: Momento dell'update
- game_year: Anno di gioco al momento
- game_day: Giorno dell'anno (1-365)
- events_processed: Contatore eventi processati
```

#### Tabella `scheduled_events`
```sql
- session_id: FK a game_sessions
- trigger_year: Anno di trigger (float)
- event_type: Tipo evento (TUTORIAL|TECH|MISSION|RANDOM|RESOURCE)
- event_data: JSON con dati evento
- is_triggered: Bool se già triggerato
```

## 🚀 Setup

### 1. Configurazione Database
Il database viene inizializzato automaticamente al primo avvio tramite `schema.sql`.

### 2. Configurazione Cron (Opzionale)
Per aggiornamento automatico:

```bash
# Apri crontab
crontab -e

# Aggiungi riga (ogni minuto)
* * * * * cd /path/to/FuturYs && php php/cron/time-advancement.php >> logs/cron.log 2>&1
```

### 3. Frontend Integration

In `game.html`:
```javascript
import { TimeManager } from './js/core/TimeManager.js';

const timeManager = new TimeManager();
timeManager.init(2100, 2100);

function animate() {
    timeManager.update();
    const year = timeManager.getCurrentYearPrecise();
    // Usa year per aggiornare renderer, UI, ecc.
    renderer.setGameYear(year);
    requestAnimationFrame(animate);
}
```

## 📊 Time Scale

**24 ore reali = 1 anno di gioco = 365.25 giorni**

| Tempo Reale | Tempo Gioco |
|-------------|-------------|
| 1 secondo   | ~4.22 ore   |
| 1 minuto    | ~10.5 giorni|
| 1 ora       | ~15.2 giorni|
| 6 ore       | ~91 giorni  |
| 12 ore      | ~6 mesi     |
| 24 ore      | 1 anno      |

## 🎯 Esempi d'Uso

### Creare nuova sessione
```php
$timeManager = new TimeManager();
$sessionId = $timeManager->createSession($playerId, "My First Game", 2100);
```

### Aggiornare tempo con calcolo offline
```php
$result = $timeManager->updateGameTime($sessionId);
// $result['offline_years_elapsed'] contiene anni trascorsi offline
```

### Registrare evento temporale
```php
$eventSystem = new TimeEventSystem();
$eventSystem->registerEvent(
    $sessionId,
    2105.5,  // Trigger a metà 2105
    'TECH',
    json_encode([
        'title' => 'New Technology',
        'tech_id' => 'WARP_DRIVE'
    ])
);
```

### API Client-Side Sync
```javascript
// Fetch current time from server
const response = await fetch('/php/api/time.php?session_id=1');
const data = await response.json();
console.log('Current game year:', data.data.game_year);

// Pause game
await fetch('/php/api/time.php', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: 1, action: 'pause' })
});
```

## 📝 Testing

```bash
# Test database connection
php php/config/database.php

# Test time manager
php php/core/TimeManager.php

# Run cron manually
php php/cron/time-advancement.php
```

## 🔧 Maintenance

### Logs
- `logs/database.log` - Query database
- `logs/database_errors.log` - Errori database
- `logs/time-advancement.log` - Cron job output

### Pulizia vecchi log
```bash
# Rotazione log automatica (aggiungere a cron)
find logs/ -name "*.log" -mtime +30 -delete
```

## ✨ Features Completate

✅ Task 201 - Backend time advancement system
✅ Task 202 - Time calculation (24h = 1 year)
✅ Task 203 - Time sync API endpoint
✅ Task 204 - UI year display
✅ Task 205 - Offline time calculation
✅ Task 206 - Time-based event system

**Epic 3 - Time Management: 6/6 completati (100%)**

---

*FuturY Time System v1.0.0 - 2026-02-11*
