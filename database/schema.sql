-- 🚀 FUTURY - Database Schema SQLite
-- Strategia Galattica di Sopravvivenza dell'Umanità
-- Versione: 1.0
-- Data: 05/02/2026

-- ===========================
-- PLAYERS & GAME SESSIONS
-- ===========================

CREATE TABLE players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nation_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1
);

CREATE TABLE game_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id INTEGER NOT NULL,
    session_name VARCHAR(100) DEFAULT 'New Game',
    game_start_year INTEGER DEFAULT 2100,
    current_game_year INTEGER DEFAULT 2100,
    real_start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_speed_multiplier REAL DEFAULT 365.25, -- 24h reali = 1 anno gioco
    is_paused BOOLEAN DEFAULT 0,
    save_data TEXT, -- JSON con stato completo
    FOREIGN KEY (player_id) REFERENCES players(id)
);

-- ===========================
-- TIME MANAGEMENT
-- ===========================

CREATE TABLE time_tracker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    real_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    game_year REAL NOT NULL, -- Anno.decimali per precisione
    game_day INTEGER DEFAULT 1,
    tick_number INTEGER DEFAULT 0,
    events_processed INTEGER DEFAULT 0,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id)
);

CREATE TABLE scheduled_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    trigger_year REAL NOT NULL, -- Anno di gioco in cui triggerare
    event_type VARCHAR(50) NOT NULL, -- 'TUTORIAL', 'TECH', 'MISSION', 'RANDOM', 'RESOURCE'
    event_data TEXT NOT NULL, -- JSON con dati evento
    is_triggered BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    triggered_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id)
);

CREATE INDEX idx_scheduled_events_session ON scheduled_events(session_id, is_triggered);
CREATE INDEX idx_scheduled_events_trigger ON scheduled_events(trigger_year, is_triggered);

-- ===========================
-- NATIONS & CIVILIZATIONS
-- ===========================

CREATE TABLE nations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(10) UNIQUE NOT NULL, -- USA, CHN, RUS, ESA, IND, JPN
    name VARCHAR(100) NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    is_playable BOOLEAN DEFAULT 1,
    is_ai BOOLEAN DEFAULT 0,
    
    -- Statistiche iniziali (Anno 2100)
    starting_budget BIGINT DEFAULT 1000000,
    starting_science BIGINT DEFAULT 10000,
    starting_population BIGINT DEFAULT 500000000,
    starting_energy INTEGER DEFAULT 1000,
    
    -- Bonus nazionali
    budget_multiplier REAL DEFAULT 1.0,
    science_multiplier REAL DEFAULT 1.0,
    population_growth_rate REAL DEFAULT 0.01,
    energy_efficiency REAL DEFAULT 1.0,
    mission_cost_modifier REAL DEFAULT 1.0,
    mission_speed_modifier REAL DEFAULT 1.0,
    
    -- Specializzazioni
    specialization VARCHAR(50), -- 'SCIENCE', 'ECONOMY', 'EXPANSION', 'MILITARY'
    tech_bonus_category VARCHAR(50), -- 'PROPULSION', 'HABITAT', 'ENERGY', 'MINING'
    
    -- UI & Lore
    flag_url VARCHAR(255),
    color_primary VARCHAR(7), -- HEX color
    color_secondary VARCHAR(7),
    description TEXT,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ===========================
-- PLANETS & CELESTIAL BODIES
-- ===========================

CREATE TABLE planets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL, -- 'TERRESTRIAL', 'GAS_GIANT', 'ICE_GIANT', 'DWARF'
    parent_body_id INTEGER, -- NULL per pianeti, parent per lune
    
    -- Dati orbitali realistici (scalati)
    distance_from_sun REAL NOT NULL, -- AU
    orbital_period REAL NOT NULL, -- giorni terrestri
    rotation_period REAL NOT NULL, -- ore
    
    -- Caratteristiche fisiche
    radius_km REAL NOT NULL,
    mass_kg REAL NOT NULL,
    gravity_earth_ratio REAL NOT NULL, -- 1.0 = gravità Terra
    
    -- Atmosfera e clima
    has_atmosphere BOOLEAN DEFAULT 0,
    atmosphere_composition TEXT, -- JSON
    surface_temperature_avg REAL, -- Celsius
    surface_temperature_min REAL,
    surface_temperature_max REAL,
    
    -- Abitabilità
    habitability_score INTEGER DEFAULT 0, -- 0-100
    water_present BOOLEAN DEFAULT 0,
    breathable_atmosphere BOOLEAN DEFAULT 0,
    radiation_level VARCHAR(20) DEFAULT 'HIGH', -- LOW, MEDIUM, HIGH, EXTREME
    
    -- Risorse
    mineral_richness INTEGER DEFAULT 50, -- 0-100
    energy_potential INTEGER DEFAULT 50, -- 0-100
    water_availability INTEGER DEFAULT 0, -- 0-100
    
    -- Colonizzazione
    is_colonizable BOOLEAN DEFAULT 0,
    max_population_capacity BIGINT DEFAULT 0,
    terraformation_difficulty INTEGER DEFAULT 100, -- 0-100, 0=facile
    
    -- Visualizzazione 3D
    texture_url VARCHAR(255),
    size_scale REAL DEFAULT 1.0,
    rotation_speed REAL DEFAULT 1.0,
    
    -- Scoperta
    is_discovered BOOLEAN DEFAULT 1, -- Sistema solare già mappato
    discovery_year INTEGER DEFAULT 2100,
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_body_id) REFERENCES planets(id)
);

CREATE TABLE moons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    planet_id INTEGER NOT NULL,
    name VARCHAR(100) NOT NULL,
    
    -- Caratteristiche lunari
    distance_from_planet REAL NOT NULL, -- km
    orbital_period_days REAL NOT NULL,
    radius_km REAL NOT NULL,
    mass_kg REAL,
    
    -- Abitabilità e risorse (simile a pianeti)
    habitability_score INTEGER DEFAULT 0,
    mineral_richness INTEGER DEFAULT 50,
    water_availability INTEGER DEFAULT 0,
    
    is_colonizable BOOLEAN DEFAULT 0,
    max_population_capacity BIGINT DEFAULT 0,
    
    texture_url VARCHAR(255),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (planet_id) REFERENCES planets(id)
);

-- ===========================
-- PLAYER RESOURCES
-- ===========================

CREATE TABLE player_resources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    
    -- Risorse principali
    budget BIGINT DEFAULT 1000000, -- Crediti/dollari
    science_points BIGINT DEFAULT 10000, -- Punti ricerca
    population BIGINT DEFAULT 500000000, -- Abitanti Terra
    energy BIGINT DEFAULT 1000, -- Unità energia
    
    -- Risorse fisiche (per colonie)
    materials BIGINT DEFAULT 0, -- Metalli, costruzioni
    food BIGINT DEFAULT 0, -- Sostentamento
    water BIGINT DEFAULT 0, -- Acqua
    oxygen BIGINT DEFAULT 0, -- Ossigeno per colonie
    
    -- Produzione per tick
    budget_production INTEGER DEFAULT 1000,
    science_production INTEGER DEFAULT 100,
    population_growth INTEGER DEFAULT 1000,
    energy_production INTEGER DEFAULT 10,
    
    -- Storage capacity
    budget_capacity BIGINT DEFAULT 999999999,
    science_capacity BIGINT DEFAULT 999999999,
    materials_capacity BIGINT DEFAULT 100000,
    food_capacity BIGINT DEFAULT 50000,
    water_capacity BIGINT DEFAULT 50000,
    oxygen_capacity BIGINT DEFAULT 50000,
    
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id)
);

-- ===========================
-- SPACE MISSIONS
-- ===========================

CREATE TABLE missions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    nation_id INTEGER NOT NULL,
    
    -- Dettagli missione
    mission_name VARCHAR(200) NOT NULL,
    mission_type VARCHAR(50) NOT NULL, -- 'PROBE', 'COLONY', 'MINING', 'RESEARCH'
    target_planet_id INTEGER NOT NULL,
    target_moon_id INTEGER, -- Opzionale
    
    -- Timing
    launch_year REAL NOT NULL,
    travel_time_years REAL NOT NULL, -- Calcolato realisticamente
    arrival_year REAL NOT NULL,
    
    -- Stato missione
    status VARCHAR(20) DEFAULT 'PREPARING', -- PREPARING, TRAVELING, ARRIVED, COMPLETED, FAILED
    progress_percentage REAL DEFAULT 0.0,
    
    -- Costi
    budget_cost BIGINT NOT NULL,
    science_cost BIGINT DEFAULT 0,
    energy_cost BIGINT DEFAULT 0,
    materials_cost BIGINT DEFAULT 0,
    
    -- Risultati (quando arriva)
    success_chance REAL DEFAULT 0.9,
    actual_result VARCHAR(20), -- 'SUCCESS', 'PARTIAL', 'FAILURE'
    rewards_data TEXT, -- JSON con ricompense
    
    -- Metadata
    description TEXT,
    mission_data TEXT, -- JSON con dettagli specifici
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    
    FOREIGN KEY (session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (nation_id) REFERENCES nations(id),
    FOREIGN KEY (target_planet_id) REFERENCES planets(id),
    FOREIGN KEY (target_moon_id) REFERENCES moons(id)
);

-- ===========================
-- TECHNOLOGY TREE
-- ===========================

CREATE TABLE technologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tech_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'PROPULSION', 'HABITAT', 'ENERGY', 'MINING', 'COMMUNICATION'
    tier INTEGER NOT NULL DEFAULT 1, -- Livello tecnologico
    
    -- Requisiti
    prerequisite_tech_ids TEXT, -- JSON array di tech_id necessari
    science_cost BIGINT NOT NULL,
    research_time_years REAL NOT NULL,
    
    -- Effetti
    effects_data TEXT NOT NULL, -- JSON con tutti gli effetti
    
    -- Metadata
    description TEXT,
    flavor_text TEXT,
    icon_url VARCHAR(255),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE player_technologies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    technology_id INTEGER NOT NULL,
    
    -- Stato ricerca
    status VARCHAR(20) DEFAULT 'LOCKED', -- LOCKED, AVAILABLE, RESEARCHING, COMPLETED
    research_progress REAL DEFAULT 0.0,
    research_start_year REAL,
    research_completion_year REAL,
    
    -- Costi sostenuti
    science_invested BIGINT DEFAULT 0,
    
    unlocked_at DATETIME,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (technology_id) REFERENCES technologies(id),
    UNIQUE(session_id, technology_id)
);

-- ===========================
-- COLONIES & BUILDINGS
-- ===========================

CREATE TABLE colonies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    nation_id INTEGER NOT NULL,
    planet_id INTEGER,
    moon_id INTEGER,
    
    -- Informazioni colonia
    colony_name VARCHAR(200) NOT NULL,
    founded_year REAL NOT NULL,
    
    -- Popolazione e crescita
    population BIGINT DEFAULT 0,
    population_capacity BIGINT DEFAULT 1000,
    growth_rate REAL DEFAULT 0.01,
    happiness REAL DEFAULT 0.5, -- 0.0 - 1.0
    
    -- Risorse locali
    local_budget_production INTEGER DEFAULT 0,
    local_science_production INTEGER DEFAULT 0,
    local_materials_production INTEGER DEFAULT 0,
    local_food_production INTEGER DEFAULT 0,
    local_energy_production INTEGER DEFAULT 0,
    
    -- Posizione sulla mappa planetaria
    map_position_x REAL,
    map_position_y REAL,
    
    -- Metadata
    description TEXT,
    colony_data TEXT, -- JSON con dati specifici
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (nation_id) REFERENCES nations(id),
    FOREIGN KEY (planet_id) REFERENCES planets(id),
    FOREIGN KEY (moon_id) REFERENCES moons(id)
);

CREATE TABLE buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    building_code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'PRODUCTION', 'RESEARCH', 'HABITAT', 'DEFENSE', 'SPACEPORT'
    
    -- Costi costruzione
    budget_cost BIGINT NOT NULL,
    materials_cost BIGINT DEFAULT 0,
    energy_cost BIGINT DEFAULT 0,
    construction_time_years REAL DEFAULT 1.0,
    
    -- Requisiti
    required_tech_ids TEXT, -- JSON array
    required_planet_conditions TEXT, -- JSON con condizioni
    
    -- Effetti
    effects_data TEXT NOT NULL, -- JSON con tutti gli effetti produttivi
    
    -- Metadata
    description TEXT,
    icon_url VARCHAR(255),
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE colony_buildings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    colony_id INTEGER NOT NULL,
    building_id INTEGER NOT NULL,
    
    -- Stato costruzione
    status VARCHAR(20) DEFAULT 'PLANNED', -- PLANNED, BUILDING, COMPLETED, DISABLED
    construction_start_year REAL,
    construction_completion_year REAL,
    construction_progress REAL DEFAULT 0.0,
    
    -- Posizione nella colonia
    grid_x INTEGER,
    grid_y INTEGER,
    
    -- Stato operativo
    is_active BOOLEAN DEFAULT 1,
    efficiency REAL DEFAULT 1.0,
    
    built_at DATETIME,
    FOREIGN KEY (colony_id) REFERENCES colonies(id),
    FOREIGN KEY (building_id) REFERENCES buildings(id)
);

-- ===========================
-- DIPLOMACY & AI NATIONS
-- ===========================

CREATE TABLE nation_relations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    nation_a_id INTEGER NOT NULL,
    nation_b_id INTEGER NOT NULL,
    
    -- Stato relazioni
    relationship_type VARCHAR(50) DEFAULT 'NEUTRAL', -- ALLY, NEUTRAL, RIVAL, ENEMY
    trust_level REAL DEFAULT 0.5, -- 0.0 - 1.0
    trade_agreement BOOLEAN DEFAULT 0,
    research_cooperation BOOLEAN DEFAULT 0,
    non_aggression_pact BOOLEAN DEFAULT 0,
    
    -- Storia diplomatica
    last_interaction_year REAL,
    interaction_history TEXT, -- JSON con storia
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (nation_a_id) REFERENCES nations(id),
    FOREIGN KEY (nation_b_id) REFERENCES nations(id),
    UNIQUE(session_id, nation_a_id, nation_b_id)
);

-- ===========================
-- EVENTS & RANDOM OCCURRENCES
-- ===========================

CREATE TABLE game_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_code VARCHAR(50) NOT NULL,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'DISCOVERY', 'DISASTER', 'POLITICAL', 'SCIENTIFIC'
    
    -- Triggering
    trigger_conditions TEXT, -- JSON con condizioni
    trigger_chance REAL DEFAULT 0.01, -- Probabilità per tick
    
    -- Effetti
    effects_data TEXT NOT NULL, -- JSON con effetti
    
    -- UI
    description TEXT,
    flavor_text TEXT,
    choices_data TEXT, -- JSON con scelte del giocatore
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE session_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id INTEGER NOT NULL,
    game_event_id INTEGER NOT NULL,
    
    -- Timing
    triggered_year REAL NOT NULL,
    resolved_year REAL,
    
    -- Stato
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, EXPIRED
    player_choice VARCHAR(100), -- Scelta fatta dal giocatore
    
    -- Risultati
    effects_applied TEXT, -- JSON con effetti applicati
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES game_sessions(id),
    FOREIGN KEY (game_event_id) REFERENCES game_events(id)
);

-- ===========================
-- INDEXES per Performance
-- ===========================

CREATE INDEX idx_game_sessions_player ON game_sessions(player_id);
CREATE INDEX idx_time_tracker_session ON time_tracker(session_id);
CREATE INDEX idx_missions_session ON missions(session_id);
CREATE INDEX idx_missions_status ON missions(status);
CREATE INDEX idx_missions_arrival ON missions(arrival_year);
CREATE INDEX idx_player_resources_session ON player_resources(session_id);
CREATE INDEX idx_player_technologies_session ON player_technologies(session_id);
CREATE INDEX idx_colonies_session ON colonies(session_id);
CREATE INDEX idx_colony_buildings_colony ON colony_buildings(colony_id);
CREATE INDEX idx_nation_relations_session ON nation_relations(session_id);
CREATE INDEX idx_session_events_session ON session_events(session_id);
CREATE INDEX idx_session_events_year ON session_events(triggered_year);

-- ===========================
-- VIEWS per Query Comuni
-- ===========================

-- Vista completa stato giocatore
CREATE VIEW v_player_status AS
SELECT 
    p.username,
    gs.session_name,
    gs.current_game_year,
    n.name as nation_name,
    pr.budget,
    pr.science_points,
    pr.population,
    pr.energy,
    COUNT(DISTINCT c.id) as total_colonies,
    COUNT(DISTINCT m.id) as active_missions
FROM players p
JOIN game_sessions gs ON p.id = gs.player_id
JOIN nations n ON p.nation_id = n.id
JOIN player_resources pr ON gs.id = pr.session_id
LEFT JOIN colonies c ON gs.id = c.session_id
LEFT JOIN missions m ON gs.id = m.session_id AND m.status IN ('PREPARING', 'TRAVELING')
GROUP BY p.id, gs.id;

-- Vista missioni attive
CREATE VIEW v_active_missions AS
SELECT 
    m.*,
    p_target.name as target_planet_name,
    moon.name as target_moon_name,
    n.name as nation_name,
    (m.arrival_year - gs.current_game_year) as years_remaining
FROM missions m
JOIN planets p_target ON m.target_planet_id = p_target.id
LEFT JOIN moons moon ON m.target_moon_id = moon.id
JOIN nations n ON m.nation_id = n.id
JOIN game_sessions gs ON m.session_id = gs.id
WHERE m.status IN ('PREPARING', 'TRAVELING');

-- ===========================
-- TRIGGERS per Automazioni
-- ===========================

-- Trigger: Aggiorna last_update quando cambiano le risorse
CREATE TRIGGER tr_update_player_resources_timestamp
AFTER UPDATE ON player_resources
BEGIN
    UPDATE player_resources 
    SET last_updated = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- Trigger: Aggiorna game_session last_update
CREATE TRIGGER tr_update_game_session_timestamp
AFTER UPDATE ON game_sessions
BEGIN
    UPDATE game_sessions 
    SET last_update = CURRENT_TIMESTAMP 
    WHERE id = NEW.id;
END;

-- ===========================
-- FINE SCHEMA
-- ===========================

-- Schema creato con successo!
-- Prossimi step:
-- 1. Inserire dati seed (nazioni, pianeti, tecnologie base)
-- 2. Testare connessione PHP
-- 3. Creare prime API

INSERT INTO nations (code, name, full_name, starting_budget, starting_science, starting_population, specialization, color_primary) VALUES
('USA', 'USA', 'United States of America', 2000000000, 25000, 350000000, 'SCIENCE', '#1f4e79'),
('CHN', 'China', 'People''s Republic of China', 1800000000, 20000, 1400000000, 'EXPANSION', '#de2910'),
('RUS', 'Russia', 'Russian Federation', 1200000000, 18000, 145000000, 'ENERGY', '#1c3578'), 
('ESA', 'ESA', 'European Space Agency', 1500000000, 30000, 450000000, 'SCIENCE', '#003399');

-- Test query
SELECT 'Schema FuturY creato con successo!' as status;
