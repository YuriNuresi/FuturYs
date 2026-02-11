<?php
/**
 * 🚀 FUTURY - Add New Nations Script
 * Script per aggiungere le 4 nuove nazioni (IND, JPN, UAE, BRA) al database esistente
 *
 * @version 1.0
 * @usage: Apri questo file nel browser: http://localhost/FuturY/add-nations.php
 */

echo "<h1>🚀 FuturY - Add New Nations</h1>";
echo "<pre style='background:#f0f0f0; padding:20px; border-radius:8px;'>";

try {
    // Include database class
    require_once 'php/config/database.php';

    echo "📋 STEP 1: Connessione database...\n";
    $db = Database::getInstance();
    echo "✅ Connessione stabilita\n\n";

    echo "📋 STEP 2: Verifica nazioni esistenti...\n";
    $existing = $db->select("SELECT code, name FROM nations ORDER BY code");
    echo "📊 Nazioni attualmente nel database:\n";
    foreach ($existing as $nation) {
        echo "   - {$nation['code']}: {$nation['name']}\n";
    }
    echo "\n";

    echo "📋 STEP 3: Aggiunta nuove nazioni...\n\n";

    // Array delle 4 nuove nazioni
    $newNations = [
        [
            'code' => 'IND',
            'name' => 'India',
            'full_name' => 'Indian Space Research Organisation',
            'starting_budget' => 1600000000,
            'starting_science' => 22000,
            'starting_population' => 1500000000,
            'budget_multiplier' => 0.95,
            'science_multiplier' => 1.1,
            'population_growth_rate' => 0.015,
            'specialization' => 'EXPANSION',
            'color_primary' => '#FF9933',
            'color_secondary' => '#138808',
            'description' => 'Emerging superpower with massive population and cost-efficient tech. Excels at habitat systems for large-scale colonization.'
        ],
        [
            'code' => 'JPN',
            'name' => 'Japan',
            'full_name' => 'Japan Aerospace Exploration Agency',
            'starting_budget' => 1400000000,
            'starting_science' => 24000,
            'starting_population' => 120000000,
            'budget_multiplier' => 1.15,
            'science_multiplier' => 1.2,
            'population_growth_rate' => -0.005,
            'specialization' => 'SCIENCE',
            'color_primary' => '#BC002D',
            'color_secondary' => '#FFFFFF',
            'description' => 'Technological leader in robotics and precision engineering. Advanced propulsion systems and automated mining.'
        ],
        [
            'code' => 'UAE',
            'name' => 'United Arab Emirates',
            'full_name' => 'UAE Space Agency',
            'starting_budget' => 1800000000,
            'starting_science' => 16000,
            'starting_population' => 12000000,
            'budget_multiplier' => 1.3,
            'science_multiplier' => 0.9,
            'population_growth_rate' => 0.02,
            'specialization' => 'ECONOMY',
            'color_primary' => '#00732F',
            'color_secondary' => '#FF0000',
            'description' => 'Wealth-driven space program with massive investment capital. Specializes in energy systems and economic efficiency.'
        ],
        [
            'code' => 'BRA',
            'name' => 'Brazil',
            'full_name' => 'Agência Espacial Brasileira / ALCE',
            'starting_budget' => 1100000000,
            'starting_science' => 15000,
            'starting_population' => 250000000,
            'budget_multiplier' => 0.9,
            'science_multiplier' => 0.95,
            'population_growth_rate' => 0.012,
            'specialization' => 'EXPANSION',
            'color_primary' => '#009739',
            'color_secondary' => '#FFDF00',
            'description' => 'Latin American Coalition for Exploration. Rich in natural resources, excels at mining and sustainable colonies.'
        ]
    ];

    $inserted = 0;
    $skipped = 0;

    foreach ($newNations as $nation) {
        // Check if nation already exists
        $exists = $db->selectOne(
            "SELECT code FROM nations WHERE code = ?",
            [$nation['code']]
        );

        if ($exists) {
            echo "⏭️  {$nation['code']} - {$nation['name']}: già presente (skip)\n";
            $skipped++;
            continue;
        }

        // Insert new nation
        $sql = "INSERT INTO nations (
            code, name, full_name,
            starting_budget, starting_science, starting_population,
            budget_multiplier, science_multiplier, population_growth_rate,
            specialization, color_primary, color_secondary, description,
            is_playable
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)";

        $result = $db->insert($sql, [
            $nation['code'],
            $nation['name'],
            $nation['full_name'],
            $nation['starting_budget'],
            $nation['starting_science'],
            $nation['starting_population'],
            $nation['budget_multiplier'],
            $nation['science_multiplier'],
            $nation['population_growth_rate'],
            $nation['specialization'],
            $nation['color_primary'],
            $nation['color_secondary'],
            $nation['description']
        ]);

        if ($result) {
            echo "✅ {$nation['code']} - {$nation['name']}: inserita con successo (ID: $result)\n";
            $inserted++;
        } else {
            echo "❌ {$nation['code']} - {$nation['name']}: errore inserimento\n";
        }
    }

    echo "\n📋 STEP 4: Riepilogo finale...\n";
    $total = $db->selectOne("SELECT COUNT(*) as total FROM nations");
    echo "✅ Nazioni inserite: $inserted\n";
    echo "⏭️  Nazioni già presenti: $skipped\n";
    echo "📊 Totale nazioni nel database: {$total['total']}\n";

    echo "\n🎉 OPERAZIONE COMPLETATA!\n";
    echo "🎮 Torna alla homepage: <a href='index.html'>index.html</a>\n";
    echo "🔧 Test API: <a href='php/api/nations.php'>nations.php</a>\n";

} catch (Exception $e) {
    echo "\n💥 ERRORE: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";

    echo "\n🔧 SOLUZIONI POSSIBILI:\n";
    echo "1. Verifica che il database esista (/database/futury.db)\n";
    echo "2. Controlla che la tabella nations esista\n";
    echo "3. Verifica i permessi del database\n";
}

echo "</pre>";
?>

<!DOCTYPE html>
<html>
<head>
    <title>FuturY - Add Nations</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        h1 { color: #1f4e79; }
        pre { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        a { color: #4fd1c7; text-decoration: none; font-weight: bold; }
        a:hover { text-decoration: underline; }
    </style>
</head>
<body>
    <p><a href="index.html">← Torna alla Homepage</a></p>
    <p><a href="init-db.php">🔄 Re-run Full Init</a></p>
    <p><a href="php/api/nations.php">🌍 Test Nations API</a></p>
</body>
</html>
