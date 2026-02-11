<?php
/**
 * 🏗️ FUTURY - Add Base Buildings Script
 * Script per aggiungere i 4 edifici base al database
 *
 * @version 1.0
 * @usage: http://localhost/FuturY/add-buildings.php
 */

echo "<h1>🏗️ FuturY - Add Base Buildings</h1>";
echo "<pre style='background:#f0f0f0; padding:20px; border-radius:8px;'>";

try {
    require_once 'php/config/database.php';

    echo "📋 STEP 1: Connessione database...\n";
    $db = Database::getInstance();
    echo "✅ Connessione stabilita\n\n";

    echo "📋 STEP 2: Verifica edifici esistenti...\n";
    $existing = $db->select("SELECT building_code, name FROM buildings ORDER BY building_code");
    if (count($existing) > 0) {
        echo "📊 Edifici attualmente nel database:\n";
        foreach ($existing as $building) {
            echo "   - {$building['building_code']}: {$building['name']}\n";
        }
    } else {
        echo "⚠️  Nessun edificio trovato nel database\n";
    }
    echo "\n";

    echo "📋 STEP 3: Aggiunta 4 edifici base...\n\n";

    $baseBuildings = [
        [
            'building_code' => 'RESEARCH_CENTER',
            'name' => 'Research Center',
            'category' => 'RESEARCH',
            'budget_cost' => 500000,
            'materials_cost' => 200,
            'energy_cost' => 50,
            'construction_time_years' => 2.0,
            'max_per_planet' => 10,
            'effects_data' => json_encode([
                'science_production' => 50,  // +50 science/tick
                'research_speed_bonus' => 0.1, // +10% research speed
                'max_per_planet' => 10
            ]),
            'description' => 'Advanced research facility. Increases science production and speeds up technology research.'
        ],
        [
            'building_code' => 'SPACE_PORT',
            'name' => 'Space Port',
            'category' => 'SPACEPORT',
            'budget_cost' => 1000000,
            'materials_cost' => 500,
            'energy_cost' => 100,
            'construction_time_years' => 3.0,
            'max_per_planet' => 3,
            'effects_data' => json_encode([
                'mission_cost_reduction' => 0.15, // -15% mission costs
                'mission_capacity' => 2, // +2 simultaneous missions
                'launch_speed_bonus' => 0.1, // -10% travel time
                'max_per_planet' => 3
            ]),
            'description' => 'Orbital launch facility. Reduces mission costs, increases mission capacity, and improves travel efficiency.'
        ],
        [
            'building_code' => 'ENERGY_PLANT',
            'name' => 'Energy Plant',
            'category' => 'PRODUCTION',
            'budget_cost' => 300000,
            'materials_cost' => 300,
            'energy_cost' => 0, // Produces energy, doesn't consume
            'construction_time_years' => 2.0,
            'max_per_planet' => 15,
            'effects_data' => json_encode([
                'energy_production' => 100, // +100 energy/tick
                'efficiency_bonus' => 0.05, // +5% global energy efficiency
                'max_per_planet' => 15
            ]),
            'description' => 'Power generation facility. Produces energy for other buildings and operations.'
        ],
        [
            'building_code' => 'FARM_COMPLEX',
            'name' => 'Farm Complex',
            'category' => 'PRODUCTION',
            'budget_cost' => 150000,
            'materials_cost' => 100,
            'energy_cost' => 30,
            'construction_time_years' => 1.0,
            'max_per_planet' => 20,
            'effects_data' => json_encode([
                'food_production' => 50, // +50 food/tick
                'water_production' => 30, // +30 water/tick
                'population_growth_bonus' => 0.02, // +2% population growth
                'max_per_planet' => 20
            ]),
            'description' => 'Agricultural complex. Produces food and water to sustain population growth.'
        ]
    ];

    $inserted = 0;
    $skipped = 0;

    foreach ($baseBuildings as $building) {
        // Check if building exists
        $exists = $db->selectOne(
            "SELECT building_code FROM buildings WHERE building_code = ?",
            [$building['building_code']]
        );

        if ($exists) {
            echo "⏭️  {$building['building_code']}: già presente (skip)\n";
            $skipped++;
            continue;
        }

        // Insert building
        $sql = "INSERT INTO buildings (
            building_code, name, category,
            budget_cost, materials_cost, energy_cost,
            construction_time_years,
            effects_data, description
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";

        $result = $db->insert($sql, [
            $building['building_code'],
            $building['name'],
            $building['category'],
            $building['budget_cost'],
            $building['materials_cost'],
            $building['energy_cost'],
            $building['construction_time_years'],
            $building['effects_data'],
            $building['description']
        ]);

        if ($result) {
            echo "✅ {$building['building_code']} - {$building['name']}\n";
            echo "   💰 Cost: \${$building['budget_cost']}, 🔩 {$building['materials_cost']} materials\n";
            echo "   ⏱️  Build time: {$building['construction_time_years']} years\n";
            $effects = json_decode($building['effects_data'], true);
            echo "   📊 Effects: " . implode(', ', array_keys($effects)) . "\n\n";
            $inserted++;
        } else {
            echo "❌ {$building['building_code']}: errore inserimento\n\n";
        }
    }

    echo "📋 STEP 4: Riepilogo finale...\n";
    $total = $db->selectOne("SELECT COUNT(*) as total FROM buildings");
    echo "✅ Edifici inseriti: $inserted\n";
    echo "⏭️  Edifici già presenti: $skipped\n";
    echo "📊 Totale edifici nel database: {$total['total']}\n";

    echo "\n🎉 OPERAZIONE COMPLETATA!\n";
    echo "🎮 Vai al gioco: <a href='game.html'>game.html</a>\n";

} catch (Exception $e) {
    echo "\n💥 ERRORE: " . $e->getMessage() . "\n";
    echo "📋 Stack trace:\n" . $e->getTraceAsString() . "\n";
}

echo "</pre>";
?>

<!DOCTYPE html>
<html>
<head>
    <title>FuturY - Add Buildings</title>
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
    <p><a href="game.html">🎮 Vai al Gioco</a></p>
</body>
</html>
