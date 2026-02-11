<?php
/**
 * 🚀 FUTURY - Database Initialization Tool
 * Script per creare e inizializzare manualmente il database
 * 
 * @version 1.0
 * @usage: Apri questo file nel browser: http://localhost/FuturY/init-db.php
 */

echo "<h1>🚀 FuturY - Database Initialization</h1>";
echo "<pre style='background:#f0f0f0; padding:20px; border-radius:8px;'>";

try {
    // Include database class
    require_once 'php/config/database.php';
    
    echo "📋 STEP 1: Test connessione database...\n";
    $db = Database::getInstance();
    echo "✅ Connessione stabilita\n\n";
    
    echo "📋 STEP 2: Verifica file schema...\n";
    $schema_path = __DIR__ . '/database/schema.sql';
    
    if (file_exists($schema_path)) {
        echo "✅ File schema.sql trovato: $schema_path\n";
        echo "📏 Dimensione file: " . round(filesize($schema_path) / 1024, 2) . " KB\n\n";
    } else {
        echo "❌ File schema.sql NON trovato in: $schema_path\n";
        echo "💡 Copia il file schema.sql nella cartella database/\n\n";
        
        // Crea schema inline come backup
        echo "📋 STEP 3: Creazione schema di emergenza...\n";
        createEmergencySchema($db);
    }
    
    echo "📋 STEP 3: Caricamento schema...\n";
    if (file_exists($schema_path)) {
        $schema_sql = file_get_contents($schema_path);
        
        // Esegui schema
        $db->getConnection()->exec($schema_sql);
        echo "✅ Schema caricato con successo!\n\n";
    }
    
    echo "📋 STEP 4: Verifica tabelle create...\n";
    $info = $db->getDatabaseInfo();
    
    echo "📊 Database Path: " . $info['database_path'] . "\n";
    echo "💾 Database Size: " . $info['database_size'] . "\n";
    echo "📋 Tabelle trovate: " . count($info['tables']) . "\n\n";
    
    if (count($info['tables']) > 0) {
        echo "📋 Lista tabelle:\n";
        foreach ($info['tables'] as $table => $count) {
            echo "   ✅ $table: $count records\n";
        }
    } else {
        echo "❌ Nessuna tabella trovata!\n";
    }
    
    echo "\n📋 STEP 5: Test funzionalità base...\n";
    
    // Test inserimento nazione
    $test_insert = $db->insert(
        "INSERT OR IGNORE INTO nations (code, name, full_name, starting_budget, color_primary) VALUES (?, ?, ?, ?, ?)",
        ['TEST', 'Test Nation', 'Test Nation for Setup', 1000000, '#ff0000']
    );
    
    if ($test_insert) {
        echo "✅ Test inserimento record: OK (ID: $test_insert)\n";
    } else {
        echo "✅ Test inserimento record: OK (già esistente)\n";
    }
    
    // Test query
    $test_select = $db->selectOne("SELECT COUNT(*) as total FROM nations");
    echo "✅ Test query: Trovate " . $test_select['total'] . " nazioni\n";
    
    echo "\n🎉 INIZIALIZZAZIONE COMPLETATA!\n";
    echo "🌟 Il database FuturY è pronto per l'uso!\n";
    echo "🎮 Torna alla homepage: <a href='index.html'>index.html</a>\n";
    
} catch (Exception $e) {
    echo "\n💥 ERRORE: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";
    
    echo "\n🔧 SOLUZIONI POSSIBILI:\n";
    echo "1. Verifica che la cartella database/ esista\n";
    echo "2. Controlla i permessi della cartella\n";
    echo "3. Assicurati che schema.sql sia in database/schema.sql\n";
    echo "4. Controlla che Herd/PHP abbia accesso in scrittura\n";
}

echo "</pre>";

/**
 * Crea schema essenziale se file manca
 */
function createEmergencySchema($db) {
    $emergency_sql = "
        CREATE TABLE IF NOT EXISTS nations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            code VARCHAR(10) UNIQUE NOT NULL,
            name VARCHAR(100) NOT NULL,
            full_name VARCHAR(200) NOT NULL,
            starting_budget BIGINT DEFAULT 1000000,
            starting_science BIGINT DEFAULT 10000,
            starting_population BIGINT DEFAULT 500000000,
            color_primary VARCHAR(7) DEFAULT '#1f4e79',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT OR IGNORE INTO nations (code, name, full_name, starting_budget, color_primary) VALUES
        ('USA', 'USA', 'United States of America', 2000000000, '#1f4e79'),
        ('CHN', 'China', 'People''s Republic of China', 1800000000, '#de2910'),
        ('RUS', 'Russia', 'Russian Federation', 1200000000, '#1c3578'),
        ('ESA', 'ESA', 'European Space Agency', 1500000000, '#003399'),
        ('IND', 'India', 'Indian Space Research Organisation', 1600000000, '#FF9933'),
        ('JPN', 'Japan', 'Japan Aerospace Exploration Agency', 1400000000, '#BC002D'),
        ('UAE', 'United Arab Emirates', 'UAE Space Agency', 1800000000, '#00732F'),
        ('BRA', 'Brazil', 'Agência Espacial Brasileira / ALCE', 1100000000, '#009739');
        
        CREATE TABLE IF NOT EXISTS planets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            distance_from_sun REAL NOT NULL,
            habitability_score INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        
        INSERT OR IGNORE INTO planets (name, distance_from_sun, habitability_score) VALUES
        ('Mercury', 0.39, 0),
        ('Venus', 0.72, 5),
        ('Earth', 1.0, 100),
        ('Mars', 1.52, 25),
        ('Jupiter', 5.20, 0),
        ('Saturn', 9.58, 0),
        ('Uranus', 19.22, 0),
        ('Neptune', 30.05, 0);
    ";
    
    try {
        $db->getConnection()->exec($emergency_sql);
        echo "✅ Schema di emergenza creato con successo!\n";
    } catch (Exception $e) {
        echo "❌ Errore creazione schema emergenza: " . $e->getMessage() . "\n";
    }
}
?>

<!DOCTYPE html>
<html>
<head>
    <title>FuturY - Database Init</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1f4e79; }
        .success { color: green; }
        .error { color: red; }
        .info { color: blue; }
    </style>
</head>
<body>
    <p><a href="index.html">← Torna alla Homepage</a></p>
    <p><a href="database.php">🔧 Test Database</a></p>
    <p><a href="init-db.php">🔄 Re-run Initialization</a></p>
</body>
</html>
