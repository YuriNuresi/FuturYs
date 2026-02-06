<?php
/**
 * _Ykan - Minimal Kanban Board
 * Single-file PHP Kanban for Scrum/Agile projects
 *
 * @version 1.1.0
 * @license MIT
 * @requires PHP 8.2+
 */

declare(strict_types=1);

const DATA_FILE = __DIR__ . '/_Ykan_data.json';
const DEFAULT_DATA = [
    'config' => [
        'gemini_api_key' => '',
        'theme' => 'light',
        'project_name' => 'My Project'
    ],
    'columns' => [
        ['id' => 'col_1', 'name' => 'To Do', 'position' => 0],
        ['id' => 'col_2', 'name' => 'In Progress', 'position' => 1],
        ['id' => 'col_3', 'name' => 'Done', 'position' => 2]
    ],
    'swimlanes' => [
        ['id' => 'lane_1', 'name' => 'Default', 'position' => 0]
    ],
    'cards' => [],
    'labels' => [
        ['id' => 'lbl_1', 'name' => 'Bug', 'color' => '#ef4444'],
        ['id' => 'lbl_2', 'name' => 'Feature', 'color' => '#22c55e'],
        ['id' => 'lbl_3', 'name' => 'Task', 'color' => '#3b82f6'],
        ['id' => 'lbl_4', 'name' => 'Urgent', 'color' => '#f97316']
    ]
];

// === DATA FUNCTIONS ===
function loadData(): array {
    if (!file_exists(DATA_FILE)) {
        saveData(DEFAULT_DATA);
        return DEFAULT_DATA;
    }
    $content = file_get_contents(DATA_FILE);
    return json_decode($content, true) ?? DEFAULT_DATA;
}

function saveData(array $data): bool {
    return file_put_contents(DATA_FILE, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)) !== false;
}

function generateId(string $prefix = 'id'): string {
    return $prefix . '_' . bin2hex(random_bytes(8));
}

// === PROJECT SCANNER ===
function scanProject(string $rootDir, int $maxDepth = 3): array {
    $excludeDirs = ['vendor', 'node_modules', '.git', 'cache', 'storage', 'logs', 'tmp', 'temp', '.idea', '.vscode'];
    $excludeFiles = ['_Ykan.php', '_Ykan_data.json'];
    $keyFiles = ['README.md', 'readme.md', 'README.txt', 'composer.json', 'package.json', '.env.example', 'config.php', 'settings.php'];
    $sourceExts = ['php', 'js', 'ts', 'py', 'rb', 'go', 'java', 'cs'];

    $result = [
        'tree' => [],
        'key_files' => [],
        'entry_points' => [],
        'stats' => ['total_files' => 0, 'total_dirs' => 0, 'by_ext' => []]
    ];

    $totalContent = 0;
    $maxContent = 30000; // ~30KB limite

    // Scan directory tree
    $scanDir = function(string $dir, int $depth = 0, string $prefix = '') use (
        &$scanDir, &$result, &$totalContent, $maxContent, $rootDir,
        $excludeDirs, $excludeFiles, $keyFiles, $sourceExts, $maxDepth
    ) {
        if ($depth > $maxDepth) return;

        $items = @scandir($dir);
        if (!$items) return;

        $items = array_diff($items, ['.', '..']);
        sort($items);

        foreach ($items as $item) {
            $path = $dir . DIRECTORY_SEPARATOR . $item;
            $relativePath = str_replace($rootDir . DIRECTORY_SEPARATOR, '', $path);

            if (is_dir($path)) {
                if (in_array($item, $excludeDirs)) continue;
                $result['stats']['total_dirs']++;
                $result['tree'][] = $prefix . '📁 ' . $item . '/';
                $scanDir($path, $depth + 1, $prefix . '  ');
            } else {
                if (in_array($item, $excludeFiles)) continue;
                $result['stats']['total_files']++;

                // Stats by extension
                $ext = strtolower(pathinfo($item, PATHINFO_EXTENSION));
                $result['stats']['by_ext'][$ext] = ($result['stats']['by_ext'][$ext] ?? 0) + 1;

                $result['tree'][] = $prefix . '📄 ' . $item;

                // Key files content
                if (in_array($item, $keyFiles) && $totalContent < $maxContent) {
                    $content = @file_get_contents($path);
                    if ($content && strlen($content) < 5000) {
                        $result['key_files'][$relativePath] = $content;
                        $totalContent += strlen($content);
                    }
                }

                // Entry points (PHP files in root)
                if ($depth === 0 && $ext === 'php' && $totalContent < $maxContent) {
                    $content = @file_get_contents($path);
                    if ($content) {
                        $lines = array_slice(explode("\n", $content), 0, 50);
                        $preview = implode("\n", $lines);
                        $result['entry_points'][$item] = $preview;
                        $totalContent += strlen($preview);
                    }
                }
            }
        }
    };

    $scanDir($rootDir);

    return $result;
}

// === API HANDLER ===
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_GET['api'])) {
    header('Content-Type: application/json');
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $data = loadData();
    $action = $_GET['api'];

    try {
        $result = match($action) {
            // Config
            'save_config' => (function() use (&$data, $input) {
                $data['config'] = array_merge($data['config'], $input);
                saveData($data);
                return ['success' => true];
            })(),

            // Columns
            'add_column' => (function() use (&$data, $input) {
                $col = [
                    'id' => generateId('col'),
                    'name' => $input['name'] ?? 'New Column',
                    'position' => count($data['columns'])
                ];
                $data['columns'][] = $col;
                saveData($data);
                return ['success' => true, 'column' => $col];
            })(),

            'update_column' => (function() use (&$data, $input) {
                foreach ($data['columns'] as &$col) {
                    if ($col['id'] === $input['id']) {
                        $col['name'] = $input['name'] ?? $col['name'];
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'delete_column' => (function() use (&$data, $input) {
                $data['columns'] = array_values(array_filter($data['columns'], fn($c) => $c['id'] !== $input['id']));
                $data['cards'] = array_values(array_filter($data['cards'], fn($c) => $c['column_id'] !== $input['id']));
                saveData($data);
                return ['success' => true];
            })(),

            'reorder_columns' => (function() use (&$data, $input) {
                $order = $input['order'] ?? [];
                foreach ($data['columns'] as &$col) {
                    $pos = array_search($col['id'], $order);
                    if ($pos !== false) $col['position'] = $pos;
                }
                usort($data['columns'], fn($a, $b) => $a['position'] <=> $b['position']);
                saveData($data);
                return ['success' => true];
            })(),

            // Swimlanes
            'add_swimlane' => (function() use (&$data, $input) {
                $lane = [
                    'id' => generateId('lane'),
                    'name' => $input['name'] ?? 'New Swimlane',
                    'position' => count($data['swimlanes'])
                ];
                $data['swimlanes'][] = $lane;
                saveData($data);
                return ['success' => true, 'swimlane' => $lane];
            })(),

            'update_swimlane' => (function() use (&$data, $input) {
                foreach ($data['swimlanes'] as &$lane) {
                    if ($lane['id'] === $input['id']) {
                        $lane['name'] = $input['name'] ?? $lane['name'];
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'delete_swimlane' => (function() use (&$data, $input) {
                if (count($data['swimlanes']) <= 1) {
                    return ['success' => false, 'error' => 'Cannot delete last swimlane'];
                }
                $firstLane = $data['swimlanes'][0]['id'];
                foreach ($data['cards'] as &$card) {
                    if ($card['swimlane_id'] === $input['id']) {
                        $card['swimlane_id'] = $firstLane;
                    }
                }
                $data['swimlanes'] = array_values(array_filter($data['swimlanes'], fn($l) => $l['id'] !== $input['id']));
                saveData($data);
                return ['success' => true];
            })(),

            // Cards
            'add_card' => (function() use (&$data, $input) {
                $card = [
                    'id' => generateId('card'),
                    'title' => $input['title'] ?? 'New Card',
                    'description' => $input['description'] ?? '',
                    'priority' => $input['priority'] ?? 'medium',
                    'due_date' => $input['due_date'] ?? null,
                    'next_check' => $input['next_check'] ?? null,
                    'label_id' => $input['label_id'] ?? null,
                    'column_id' => $input['column_id'] ?? $data['columns'][0]['id'],
                    'swimlane_id' => $input['swimlane_id'] ?? $data['swimlanes'][0]['id'],
                    'archived' => false,
                    'position' => count(array_filter($data['cards'], fn($c) =>
                        $c['column_id'] === ($input['column_id'] ?? $data['columns'][0]['id']) &&
                        $c['swimlane_id'] === ($input['swimlane_id'] ?? $data['swimlanes'][0]['id'])
                    )),
                    'created_at' => date('Y-m-d H:i:s')
                ];
                $data['cards'][] = $card;
                saveData($data);
                return ['success' => true, 'card' => $card];
            })(),

            'update_card' => (function() use (&$data, $input) {
                foreach ($data['cards'] as &$card) {
                    if ($card['id'] === $input['id']) {
                        $card = array_merge($card, array_filter($input, fn($k) => $k !== 'id', ARRAY_FILTER_USE_KEY));
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'move_card' => (function() use (&$data, $input) {
                foreach ($data['cards'] as &$card) {
                    if ($card['id'] === $input['id']) {
                        $card['column_id'] = $input['column_id'];
                        $card['swimlane_id'] = $input['swimlane_id'];
                        $card['position'] = $input['position'] ?? 0;
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'archive_card' => (function() use (&$data, $input) {
                foreach ($data['cards'] as &$card) {
                    if ($card['id'] === $input['id']) {
                        $card['archived'] = true;
                        $card['archived_at'] = date('Y-m-d H:i:s');
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'restore_card' => (function() use (&$data, $input) {
                foreach ($data['cards'] as &$card) {
                    if ($card['id'] === $input['id']) {
                        $card['archived'] = false;
                        unset($card['archived_at']);
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'delete_card' => (function() use (&$data, $input) {
                $data['cards'] = array_values(array_filter($data['cards'], fn($c) => $c['id'] !== $input['id']));
                saveData($data);
                return ['success' => true];
            })(),

            // Labels
            'add_label' => (function() use (&$data, $input) {
                $label = [
                    'id' => generateId('lbl'),
                    'name' => $input['name'] ?? 'New Label',
                    'color' => $input['color'] ?? '#6b7280'
                ];
                $data['labels'][] = $label;
                saveData($data);
                return ['success' => true, 'label' => $label];
            })(),

            'update_label' => (function() use (&$data, $input) {
                foreach ($data['labels'] as &$label) {
                    if ($label['id'] === $input['id']) {
                        if (isset($input['name'])) $label['name'] = $input['name'];
                        if (isset($input['color'])) $label['color'] = $input['color'];
                        break;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            'delete_label' => (function() use (&$data, $input) {
                $data['labels'] = array_values(array_filter($data['labels'], fn($l) => $l['id'] !== $input['id']));
                foreach ($data['cards'] as &$card) {
                    if ($card['label_id'] === $input['id']) {
                        $card['label_id'] = null;
                    }
                }
                saveData($data);
                return ['success' => true];
            })(),

            // Get all data
            'get_data' => (function() use ($data) {
                return ['success' => true, 'data' => $data];
            })(),

            // Gemini
            'gemini_analyze' => (function() use ($data, $input) {
                $apiKey = $data['config']['gemini_api_key'] ?? '';
                if (empty($apiKey)) {
                    return ['success' => false, 'error' => 'API Key Gemini non configurata'];
                }

                $activeCards = array_filter($data['cards'], fn($c) => !$c['archived']);
                $prompt = $input['prompt'] ?? 'analyze';

                $boardSummary = "Kanban Board: " . ($data['config']['project_name'] ?? 'Project') . "\n\n";
                $boardSummary .= "Colonne: " . implode(', ', array_column($data['columns'], 'name')) . "\n";
                $boardSummary .= "Swimlanes: " . implode(', ', array_column($data['swimlanes'], 'name')) . "\n\n";
                $boardSummary .= "Cards attive:\n";

                foreach ($activeCards as $card) {
                    $col = array_values(array_filter($data['columns'], fn($c) => $c['id'] === $card['column_id']))[0]['name'] ?? 'N/A';
                    $lane = array_values(array_filter($data['swimlanes'], fn($l) => $l['id'] === $card['swimlane_id']))[0]['name'] ?? 'N/A';
                    $boardSummary .= "- [{$card['priority']}] {$card['title']} (Colonna: {$col}, Swimlane: {$lane})";
                    if ($card['due_date']) $boardSummary .= " - Scadenza: {$card['due_date']}";
                    $boardSummary .= "\n";
                    if ($card['description']) $boardSummary .= "  Desc: {$card['description']}\n";
                }

                $systemPrompt = match($prompt) {
                    'suggest_tasks' => "Sei un esperto project manager Agile. Analizza la board Kanban e suggerisci nuovi task utili per il progetto. Rispondi in italiano, in modo conciso.",
                    'analyze' => "Sei un esperto project manager Agile. Analizza la board Kanban e suggerisci con quale task procedere, eventuali priorità da rivedere e tempistiche stimate. Rispondi in italiano, in modo conciso e pratico.",
                    'estimate' => "Sei un esperto project manager Agile. Analizza i task e fornisci stime di tempo realistiche per completarli. Rispondi in italiano.",
                    default => "Sei un assistente per project management Agile. Rispondi in italiano."
                };

                $payload = [
                    'contents' => [
                        ['parts' => [['text' => $boardSummary . "\n\nRichiesta: " . ($input['custom_prompt'] ?? $prompt)]]]
                    ],
                    'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
                    'generationConfig' => ['temperature' => 0.7, 'maxOutputTokens' => 1024]
                ];

                $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}");
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS => json_encode($payload),
                    CURLOPT_TIMEOUT => 30
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode !== 200) {
                    $errorMsg = match($httpCode) {
                        429 => 'Rate limit raggiunto. Attendi 1-2 minuti e riprova.',
                        401, 403 => 'API Key non valida o senza permessi.',
                        500, 502, 503 => 'Servizio Gemini temporaneamente non disponibile.',
                        default => 'Errore API Gemini: ' . $httpCode
                    };
                    return ['success' => false, 'error' => $errorMsg];
                }

                $result = json_decode($response, true);
                $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? 'Nessuna risposta';

                return ['success' => true, 'response' => $text];
            })(),

            // Analyze Project
            'analyze_project' => (function() use ($data) {
                $apiKey = $data['config']['gemini_api_key'] ?? '';
                if (empty($apiKey)) {
                    return ['success' => false, 'error' => 'API Key Gemini non configurata'];
                }

                // Scan project
                $projectData = scanProject(__DIR__);

                // Build context
                $context = "=== ANALISI PROGETTO ===\n\n";
                $context .= "Progetto: " . ($data['config']['project_name'] ?? 'N/A') . "\n\n";

                // Stats
                $context .= "📊 STATISTICHE:\n";
                $context .= "- File totali: {$projectData['stats']['total_files']}\n";
                $context .= "- Cartelle: {$projectData['stats']['total_dirs']}\n";
                if (!empty($projectData['stats']['by_ext'])) {
                    arsort($projectData['stats']['by_ext']);
                    $topExts = array_slice($projectData['stats']['by_ext'], 0, 5, true);
                    $context .= "- Tipi file: " . implode(', ', array_map(fn($k, $v) => "$k($v)", array_keys($topExts), $topExts)) . "\n";
                }
                $context .= "\n";

                // Tree
                $context .= "📁 STRUTTURA:\n";
                $context .= implode("\n", array_slice($projectData['tree'], 0, 100)) . "\n\n";

                // Key files
                if (!empty($projectData['key_files'])) {
                    $context .= "📄 FILE CHIAVE:\n";
                    foreach ($projectData['key_files'] as $file => $content) {
                        $context .= "--- {$file} ---\n{$content}\n\n";
                    }
                }

                // Entry points
                if (!empty($projectData['entry_points'])) {
                    $context .= "🚀 ENTRY POINTS (primi 50 righe):\n";
                    foreach ($projectData['entry_points'] as $file => $content) {
                        $context .= "--- {$file} ---\n{$content}\n\n";
                    }
                }

                // Current board state
                $activeCards = array_filter($data['cards'], fn($c) => !$c['archived']);
                if (!empty($activeCards)) {
                    $context .= "📋 TASK ATTUALI NEL KANBAN:\n";
                    foreach ($activeCards as $card) {
                        $col = array_values(array_filter($data['columns'], fn($c) => $c['id'] === $card['column_id']))[0]['name'] ?? 'N/A';
                        $context .= "- [{$card['priority']}] {$card['title']} ({$col})\n";
                    }
                }

                $systemPrompt = <<<PROMPT
Analizza il progetto e rispondi SOLO con questo JSON (niente altro testo):

{"analysis":{"overview":"Max 2 frasi","tech_stack":["max 5 tech"],"architecture":"una riga","strengths":["max 3"],"concerns":["max 3"]},"suggested_tasks":[{"title":"breve","description":"max 1 frase","priority":"high|medium|low","category":"bug|feature|refactor|security|docs|test"}]}

REGOLE IMPORTANTI:
- JSON puro, NO markdown, NO ```
- Max 5 task suggeriti
- Testi BREVI e concisi
- In italiano
PROMPT;

                $payload = [
                    'contents' => [['parts' => [['text' => $context]]]],
                    'systemInstruction' => ['parts' => [['text' => $systemPrompt]]],
                    'generationConfig' => ['temperature' => 0.3, 'maxOutputTokens' => 4096]
                ];

                $ch = curl_init("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={$apiKey}");
                curl_setopt_array($ch, [
                    CURLOPT_RETURNTRANSFER => true,
                    CURLOPT_POST => true,
                    CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
                    CURLOPT_POSTFIELDS => json_encode($payload),
                    CURLOPT_TIMEOUT => 60
                ]);

                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                curl_close($ch);

                if ($httpCode !== 200) {
                    $errorMsg = match($httpCode) {
                        429 => 'Rate limit raggiunto. Attendi 1-2 minuti e riprova.',
                        401, 403 => 'API Key non valida o senza permessi.',
                        500, 502, 503 => 'Servizio Gemini temporaneamente non disponibile.',
                        default => 'Errore API Gemini: ' . $httpCode
                    };
                    return ['success' => false, 'error' => $errorMsg];
                }

                $result = json_decode($response, true);
                $text = $result['candidates'][0]['content']['parts'][0]['text'] ?? '';

                // Clean JSON from markdown code blocks (more robust)
                $text = trim($text);
                $text = preg_replace('/^```json\s*/i', '', $text);
                $text = preg_replace('/^```\s*/i', '', $text);
                $text = preg_replace('/```\s*$/i', '', $text);
                $text = trim($text);

                // Try to extract JSON if there's extra text
                if (preg_match('/\{[\s\S]*\}/m', $text, $matches)) {
                    $text = $matches[0];
                }

                $parsed = json_decode($text, true);
                if (!$parsed || json_last_error() !== JSON_ERROR_NONE) {
                    // Return raw for debug
                    return [
                        'success' => false,
                        'error' => 'Risposta non valida da Gemini. Riprova.',
                        'debug' => substr($result['candidates'][0]['content']['parts'][0]['text'] ?? 'empty', 0, 500)
                    ];
                }

                return ['success' => true, 'result' => $parsed];
            })(),

            default => ['success' => false, 'error' => 'Unknown action']
        };

        echo json_encode($result);
    } catch (Throwable $e) {
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

// === LOAD DATA FOR HTML ===
$data = loadData();
$dataJson = json_encode($data);
?>
<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>_Ykan - <?= htmlspecialchars($data['config']['project_name'] ?? 'Kanban') ?></title>
    <style>
        :root {
            --bg: #f8fafc; --bg2: #e2e8f0; --bg3: #fff; --text: #1e293b; --text2: #64748b;
            --border: #cbd5e1; --accent: #3b82f6; --accent2: #2563eb;
            --high: #ef4444; --medium: #f59e0b; --low: #22c55e;
            --shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .dark {
            --bg: #0f172a; --bg2: #1e293b; --bg3: #334155; --text: #f1f5f9; --text2: #94a3b8;
            --border: #475569; --shadow: 0 1px 3px rgba(0,0,0,0.3);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: system-ui, -apple-system, sans-serif; background: var(--bg); color: var(--text); min-height: 100vh; }

        /* Header */
        .header { display: flex; align-items: center; gap: 12px; padding: 12px 20px; background: var(--bg2); border-bottom: 1px solid var(--border); }
        .header h1 { font-size: 18px; font-weight: 600; cursor: pointer; }
        .header h1:hover { color: var(--accent); }
        .header-actions { display: flex; gap: 8px; margin-left: auto; }

        /* Buttons */
        .btn { padding: 6px 12px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg3); color: var(--text); cursor: pointer; font-size: 13px; transition: all 0.15s; }
        .btn:hover { border-color: var(--accent); color: var(--accent); }
        .btn-icon { padding: 6px 8px; }
        .btn-primary { background: var(--accent); color: white; border-color: var(--accent); }
        .btn-primary:hover { background: var(--accent2); }
        .btn-danger { color: var(--high); }
        .btn-danger:hover { background: var(--high); color: white; border-color: var(--high); }

        /* Board */
        .board-container { padding: 16px; overflow-x: auto; }
        .board { display: flex; flex-direction: column; gap: 0; min-width: fit-content; }

        /* Swimlane */
        .swimlane { border: 1px solid var(--border); border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
        .swimlane-header { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg2); border-bottom: 1px solid var(--border); }
        .swimlane-name { font-weight: 600; font-size: 14px; background: transparent; border: none; color: var(--text); }
        .swimlane-name:focus { outline: 1px solid var(--accent); border-radius: 4px; }
        .swimlane-actions { margin-left: auto; display: flex; gap: 4px; opacity: 0; transition: opacity 0.15s; }
        .swimlane:hover .swimlane-actions { opacity: 1; }

        /* Columns */
        .columns-row { display: flex; }
        .column-header-row { display: flex; background: var(--bg2); border-bottom: 1px solid var(--border); }
        .column-header { flex: 1; min-width: 280px; padding: 10px 12px; display: flex; align-items: center; gap: 8px; border-right: 1px solid var(--border); }
        .column-header:last-child { border-right: none; }
        .column-name { font-weight: 500; font-size: 13px; background: transparent; border: none; color: var(--text); flex: 1; }
        .column-name:focus { outline: 1px solid var(--accent); border-radius: 4px; }
        .column-count { font-size: 11px; background: var(--bg); padding: 2px 6px; border-radius: 10px; color: var(--text2); }
        .column-actions { display: flex; gap: 2px; opacity: 0; transition: opacity 0.15s; }
        .column-header:hover .column-actions { opacity: 1; }

        /* Cells */
        .cells-row { display: flex; }
        .cell { flex: 1; min-width: 280px; min-height: 120px; padding: 8px; border-right: 1px solid var(--border); background: var(--bg); }
        .cell:last-child { border-right: none; }
        .cell.drag-over { background: var(--bg2); }

        /* Cards */
        .card { background: var(--bg3); border: 1px solid var(--border); border-radius: 6px; padding: 10px; margin-bottom: 8px; cursor: grab; box-shadow: var(--shadow); transition: all 0.15s; }
        .card:hover { border-color: var(--accent); }
        .card.dragging { opacity: 0.5; transform: rotate(2deg); }
        .card-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
        .card-title { font-weight: 500; font-size: 13px; flex: 1; word-break: break-word; }
        .card-priority { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 4px; }
        .card-priority.high { background: var(--high); }
        .card-priority.medium { background: var(--medium); }
        .card-priority.low { background: var(--low); }
        .card-label { font-size: 10px; padding: 2px 6px; border-radius: 4px; color: white; display: inline-block; margin-bottom: 6px; }
        .card-desc { font-size: 12px; color: var(--text2); margin-bottom: 6px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .card-meta { display: flex; gap: 8px; font-size: 11px; color: var(--text2); }
        .card-meta span { display: flex; align-items: center; gap: 2px; }
        .card-overdue { color: var(--high) !important; }

        /* Add buttons */
        .add-card-btn { width: 100%; padding: 8px; border: 1px dashed var(--border); border-radius: 6px; background: transparent; color: var(--text2); cursor: pointer; font-size: 12px; }
        .add-card-btn:hover { border-color: var(--accent); color: var(--accent); }
        .add-column-btn, .add-swimlane-btn { padding: 8px 16px; border: 1px dashed var(--border); border-radius: 6px; background: transparent; color: var(--text2); cursor: pointer; font-size: 12px; margin: 8px; }
        .add-column-btn:hover, .add-swimlane-btn:hover { border-color: var(--accent); color: var(--accent); }

        /* Modal */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 1000; }
        .modal-overlay.active { display: flex; }
        .modal { background: var(--bg3); border-radius: 12px; padding: 20px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
        .modal h2 { font-size: 16px; margin-bottom: 16px; }
        .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 16px; }

        /* Form */
        .form-group { margin-bottom: 12px; }
        .form-group label { display: block; font-size: 12px; font-weight: 500; margin-bottom: 4px; color: var(--text2); }
        .form-group input, .form-group textarea, .form-group select { width: 100%; padding: 8px 10px; border: 1px solid var(--border); border-radius: 6px; background: var(--bg); color: var(--text); font-size: 13px; }
        .form-group input:focus, .form-group textarea:focus, .form-group select:focus { outline: none; border-color: var(--accent); }
        .form-group textarea { resize: vertical; min-height: 60px; }

        /* Toast */
        .toast-container { position: fixed; bottom: 20px; right: 20px; z-index: 2000; }
        .toast { padding: 12px 16px; border-radius: 8px; margin-top: 8px; font-size: 13px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); animation: slideIn 0.3s ease; }
        .toast.success { background: var(--low); color: white; }
        .toast.error { background: var(--high); color: white; }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }

        /* Archive Panel */
        .archive-panel { position: fixed; right: 0; top: 0; bottom: 0; width: 350px; background: var(--bg3); border-left: 1px solid var(--border); transform: translateX(100%); transition: transform 0.3s; z-index: 500; overflow-y: auto; }
        .archive-panel.open { transform: translateX(0); }
        .archive-header { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .archive-list { padding: 12px; }
        .archive-card { opacity: 0.7; }

        /* Gemini Panel */
        .gemini-panel { position: fixed; left: 0; top: 0; bottom: 0; width: 400px; background: var(--bg3); border-right: 1px solid var(--border); transform: translateX(-100%); transition: transform 0.3s; z-index: 500; display: flex; flex-direction: column; }
        .gemini-panel.open { transform: translateX(0); }
        .gemini-header { padding: 16px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
        .gemini-content { flex: 1; padding: 16px; overflow-y: auto; }
        .gemini-actions { padding: 12px 16px; border-top: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px; }
        .gemini-response { white-space: pre-wrap; font-size: 13px; line-height: 1.6; }
        .gemini-loading { text-align: center; padding: 20px; color: var(--text2); }

        /* Project Analysis */
        .analysis-section { margin-bottom: 16px; }
        .analysis-section h4 { font-size: 13px; font-weight: 600; margin-bottom: 8px; color: var(--accent); }
        .analysis-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 8px; }
        .analysis-tag { font-size: 11px; padding: 2px 8px; background: var(--bg2); border-radius: 12px; color: var(--text2); }
        .analysis-list { font-size: 12px; color: var(--text2); padding-left: 16px; }
        .analysis-list li { margin-bottom: 4px; }

        /* Suggested Tasks */
        .suggested-task { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 12px; margin-bottom: 8px; }
        .suggested-task:hover { border-color: var(--accent); }
        .suggested-task-header { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 6px; }
        .suggested-task-title { font-weight: 500; font-size: 13px; flex: 1; }
        .suggested-task-priority { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; }
        .suggested-task-priority.high { background: var(--high); }
        .suggested-task-priority.medium { background: var(--medium); }
        .suggested-task-priority.low { background: var(--low); }
        .suggested-task-desc { font-size: 12px; color: var(--text2); margin-bottom: 8px; }
        .suggested-task-footer { display: flex; align-items: center; justify-content: space-between; }
        .suggested-task-category { font-size: 10px; padding: 2px 6px; background: var(--bg2); border-radius: 4px; color: var(--text2); }
        .suggested-task-add { padding: 4px 10px; font-size: 11px; background: var(--accent); color: white; border: none; border-radius: 4px; cursor: pointer; }
        .suggested-task-add:hover { background: var(--accent2); }
        .suggested-task.added { opacity: 0.5; pointer-events: none; }
        .suggested-task.added .suggested-task-add { background: var(--low); }

        /* Responsive */
        @media (max-width: 768px) {
            .column-header, .cell { min-width: 240px; }
            .gemini-panel, .archive-panel { width: 100%; }
        }
    </style>
</head>
<body class="<?= $data['config']['theme'] === 'dark' ? 'dark' : '' ?>">
    <!-- Header -->
    <header class="header">
        <h1 id="projectName" onclick="openConfigModal()"><?= htmlspecialchars($data['config']['project_name'] ?? 'My Project') ?></h1>
        <div class="header-actions">
            <button class="btn btn-icon" onclick="toggleGemini()" title="Gemini AI">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
            </button>
            <button class="btn btn-icon" onclick="toggleArchive()" title="Archivio">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8v13H3V8M1 3h22v5H1zM10 12h4"/></svg>
            </button>
            <button class="btn btn-icon" onclick="toggleTheme()" title="Tema">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            <button class="btn btn-icon" onclick="openConfigModal()" title="Impostazioni">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            </button>
        </div>
    </header>

    <!-- Board -->
    <div class="board-container">
        <div id="board" class="board"></div>
        <button class="add-swimlane-btn" onclick="addSwimlane()">+ Aggiungi Swimlane</button>
    </div>

    <!-- Gemini Panel -->
    <div id="geminiPanel" class="gemini-panel">
        <div class="gemini-header">
            <h3>Gemini AI</h3>
            <button class="btn btn-icon" onclick="toggleGemini()">&times;</button>
        </div>
        <div id="geminiContent" class="gemini-content">
            <p style="color: var(--text2)">Usa i pulsanti qui sotto per analizzare la board con Gemini AI.</p>
        </div>
        <div class="gemini-actions">
            <button class="btn btn-primary" onclick="analyzeProject()" style="background:linear-gradient(135deg,#667eea,#764ba2);border:none">
                🔍 Analizza Progetto
            </button>
            <hr style="border:none;border-top:1px solid var(--border);margin:8px 0">
            <button class="btn" onclick="askGemini('analyze')">Analizza Board</button>
            <button class="btn" onclick="askGemini('suggest_tasks')">Suggerisci Task</button>
            <button class="btn" onclick="askGemini('estimate')">Stima Tempistiche</button>
            <div class="form-group" style="margin:0">
                <input type="text" id="geminiCustom" placeholder="Domanda personalizzata...">
            </div>
            <button class="btn btn-primary" onclick="askGeminiCustom()">Chiedi</button>
        </div>
    </div>

    <!-- Archive Panel -->
    <div id="archivePanel" class="archive-panel">
        <div class="archive-header">
            <h3>Archivio</h3>
            <button class="btn btn-icon" onclick="toggleArchive()">&times;</button>
        </div>
        <div id="archiveList" class="archive-list"></div>
    </div>

    <!-- Card Modal -->
    <div id="cardModal" class="modal-overlay">
        <div class="modal">
            <h2 id="cardModalTitle">Nuova Card</h2>
            <form id="cardForm">
                <input type="hidden" id="cardId">
                <input type="hidden" id="cardColumnId">
                <input type="hidden" id="cardSwimlaneId">
                <div class="form-group">
                    <label>Titolo</label>
                    <input type="text" id="cardTitleInput" required>
                </div>
                <div class="form-group">
                    <label>Descrizione</label>
                    <textarea id="cardDescInput"></textarea>
                </div>
                <div class="form-group">
                    <label>Priorità</label>
                    <select id="cardPriorityInput">
                        <option value="low">Bassa</option>
                        <option value="medium" selected>Media</option>
                        <option value="high">Alta</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Label</label>
                    <select id="cardLabelInput">
                        <option value="">Nessuna</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data Scadenza</label>
                    <input type="date" id="cardDueInput">
                </div>
                <div class="form-group">
                    <label>Data Next Check</label>
                    <input type="date" id="cardNextCheckInput">
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-danger" id="deleteCardBtn" onclick="deleteCard()" style="margin-right:auto;display:none">Elimina</button>
                    <button type="button" class="btn" onclick="closeCardModal()">Annulla</button>
                    <button type="submit" class="btn btn-primary">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Config Modal -->
    <div id="configModal" class="modal-overlay">
        <div class="modal">
            <h2>Impostazioni</h2>
            <form id="configForm">
                <div class="form-group">
                    <label>Nome Progetto</label>
                    <input type="text" id="configProjectName">
                </div>
                <div class="form-group">
                    <label>Gemini API Key</label>
                    <input type="password" id="configGeminiKey" placeholder="Inserisci la tua API key...">
                </div>
                <div class="form-group">
                    <label>Labels</label>
                    <div id="labelsManager"></div>
                    <button type="button" class="btn" onclick="addLabel()" style="margin-top:8px">+ Aggiungi Label</button>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn" onclick="closeConfigModal()">Annulla</button>
                    <button type="submit" class="btn btn-primary">Salva</button>
                </div>
            </form>
        </div>
    </div>

    <!-- Toast Container -->
    <div id="toastContainer" class="toast-container"></div>

    <script>
    // === STATE ===
    let boardData = <?= $dataJson ?>;
    let draggedCard = null;

    // === API ===
    async function api(action, data = {}) {
        try {
            const res = await fetch(`?api=${action}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.success) {
                if (action !== 'get_data' && action !== 'gemini_analyze') {
                    toast('Salvato', 'success');
                }
            } else {
                toast(result.error || 'Errore', 'error');
            }
            return result;
        } catch (e) {
            toast('Errore: ' + e.message, 'error');
            return { success: false, error: e.message };
        }
    }

    // === TOAST ===
    function toast(msg, type = 'success') {
        const container = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast ${type}`;
        t.textContent = msg;
        container.appendChild(t);
        setTimeout(() => t.remove(), 3000);
    }

    // === RENDER ===
    function render() {
        const board = document.getElementById('board');
        const activeCards = boardData.cards.filter(c => !c.archived);

        board.innerHTML = boardData.swimlanes
            .sort((a, b) => a.position - b.position)
            .map(lane => `
                <div class="swimlane" data-lane-id="${lane.id}">
                    <div class="swimlane-header">
                        <input class="swimlane-name" value="${escHtml(lane.name)}" onchange="updateSwimlane('${lane.id}', this.value)">
                        <div class="swimlane-actions">
                            <button class="btn btn-icon btn-danger" onclick="deleteSwimlane('${lane.id}')" title="Elimina">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                            </button>
                        </div>
                    </div>
                    <div class="column-header-row">
                        ${boardData.columns.sort((a, b) => a.position - b.position).map(col => {
                            const count = activeCards.filter(c => c.column_id === col.id && c.swimlane_id === lane.id).length;
                            return `
                                <div class="column-header" data-col-id="${col.id}">
                                    <input class="column-name" value="${escHtml(col.name)}" onchange="updateColumn('${col.id}', this.value)">
                                    <span class="column-count">${count}</span>
                                    <div class="column-actions">
                                        <button class="btn btn-icon btn-danger" onclick="deleteColumn('${col.id}')" title="Elimina">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                                        </button>
                                    </div>
                                </div>
                            `;
                        }).join('')}
                        <button class="add-column-btn" onclick="addColumn()">+</button>
                    </div>
                    <div class="cells-row">
                        ${boardData.columns.sort((a, b) => a.position - b.position).map(col => `
                            <div class="cell" data-col-id="${col.id}" data-lane-id="${lane.id}"
                                ondragover="onDragOver(event)" ondragleave="onDragLeave(event)" ondrop="onDrop(event)">
                                ${activeCards
                                    .filter(c => c.column_id === col.id && c.swimlane_id === lane.id)
                                    .sort((a, b) => a.position - b.position)
                                    .map(card => renderCard(card)).join('')}
                                <button class="add-card-btn" onclick="openCardModal(null, '${col.id}', '${lane.id}')">+ Aggiungi Card</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('');

        renderArchive();
    }

    function renderCard(card) {
        const label = boardData.labels.find(l => l.id === card.label_id);
        const isOverdue = card.due_date && new Date(card.due_date) < new Date();
        return `
            <div class="card" draggable="true" data-card-id="${card.id}"
                ondragstart="onDragStart(event)" ondragend="onDragEnd(event)"
                onclick="openCardModal('${card.id}')">
                <div class="card-header">
                    <div class="card-priority ${card.priority}"></div>
                    <div class="card-title">${escHtml(card.title)}</div>
                </div>
                ${label ? `<span class="card-label" style="background:${label.color}">${escHtml(label.name)}</span>` : ''}
                ${card.description ? `<div class="card-desc">${escHtml(card.description)}</div>` : ''}
                <div class="card-meta">
                    ${card.due_date ? `<span class="${isOverdue ? 'card-overdue' : ''}">📅 ${card.due_date}</span>` : ''}
                    ${card.next_check ? `<span>🔔 ${card.next_check}</span>` : ''}
                </div>
            </div>
        `;
    }

    function renderArchive() {
        const archived = boardData.cards.filter(c => c.archived);
        document.getElementById('archiveList').innerHTML = archived.length
            ? archived.map(card => `
                <div class="card archive-card">
                    <div class="card-header">
                        <div class="card-priority ${card.priority}"></div>
                        <div class="card-title">${escHtml(card.title)}</div>
                    </div>
                    <div class="card-meta">
                        <span>Archiviata: ${card.archived_at || 'N/A'}</span>
                    </div>
                    <div style="margin-top:8px;display:flex;gap:4px">
                        <button class="btn" onclick="restoreCard('${card.id}')">Ripristina</button>
                        <button class="btn btn-danger" onclick="permanentDeleteCard('${card.id}')">Elimina</button>
                    </div>
                </div>
            `).join('')
            : '<p style="color:var(--text2);text-align:center">Nessuna card archiviata</p>';
    }

    function renderLabelsManager() {
        document.getElementById('labelsManager').innerHTML = boardData.labels.map(l => `
            <div style="display:flex;gap:8px;align-items:center;margin-bottom:4px">
                <input type="color" value="${l.color}" onchange="updateLabelColor('${l.id}', this.value)" style="width:30px;height:24px;border:none;cursor:pointer">
                <input type="text" value="${escHtml(l.name)}" onchange="updateLabelName('${l.id}', this.value)" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:4px;background:var(--bg);color:var(--text)">
                <button type="button" class="btn btn-icon btn-danger" onclick="deleteLabel('${l.id}')">&times;</button>
            </div>
        `).join('');
    }

    // === DRAG & DROP ===
    function onDragStart(e) {
        draggedCard = e.target;
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    }

    function onDragEnd(e) {
        e.target.classList.remove('dragging');
        draggedCard = null;
        document.querySelectorAll('.cell').forEach(c => c.classList.remove('drag-over'));
    }

    function onDragOver(e) {
        e.preventDefault();
        e.currentTarget.classList.add('drag-over');
    }

    function onDragLeave(e) {
        e.currentTarget.classList.remove('drag-over');
    }

    async function onDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        if (!draggedCard) return;

        const cardId = draggedCard.dataset.cardId;
        const newColId = e.currentTarget.dataset.colId;
        const newLaneId = e.currentTarget.dataset.laneId;

        const card = boardData.cards.find(c => c.id === cardId);
        if (card) {
            card.column_id = newColId;
            card.swimlane_id = newLaneId;
            render();
            await api('move_card', { id: cardId, column_id: newColId, swimlane_id: newLaneId });
        }
    }

    // === COLUMNS ===
    async function addColumn() {
        const result = await api('add_column', { name: 'Nuova Colonna' });
        if (result.success) {
            boardData.columns.push(result.column);
            render();
        }
    }

    async function updateColumn(id, name) {
        const col = boardData.columns.find(c => c.id === id);
        if (col) col.name = name;
        await api('update_column', { id, name });
    }

    async function deleteColumn(id) {
        if (boardData.columns.length <= 1) {
            toast('Non puoi eliminare l\'ultima colonna', 'error');
            return;
        }
        if (!confirm('Eliminare questa colonna e tutte le sue card?')) return;
        boardData.columns = boardData.columns.filter(c => c.id !== id);
        boardData.cards = boardData.cards.filter(c => c.column_id !== id);
        render();
        await api('delete_column', { id });
    }

    // === SWIMLANES ===
    async function addSwimlane() {
        const result = await api('add_swimlane', { name: 'Nuova Swimlane' });
        if (result.success) {
            boardData.swimlanes.push(result.swimlane);
            render();
        }
    }

    async function updateSwimlane(id, name) {
        const lane = boardData.swimlanes.find(l => l.id === id);
        if (lane) lane.name = name;
        await api('update_swimlane', { id, name });
    }

    async function deleteSwimlane(id) {
        if (boardData.swimlanes.length <= 1) {
            toast('Non puoi eliminare l\'ultima swimlane', 'error');
            return;
        }
        if (!confirm('Eliminare questa swimlane? Le card verranno spostate.')) return;
        const firstLane = boardData.swimlanes[0].id;
        boardData.cards.forEach(c => { if (c.swimlane_id === id) c.swimlane_id = firstLane; });
        boardData.swimlanes = boardData.swimlanes.filter(l => l.id !== id);
        render();
        await api('delete_swimlane', { id });
    }

    // === CARDS ===
    function openCardModal(cardId = null, colId = null, laneId = null) {
        const modal = document.getElementById('cardModal');
        const form = document.getElementById('cardForm');
        const deleteBtn = document.getElementById('deleteCardBtn');

        // Populate labels dropdown
        const labelSelect = document.getElementById('cardLabelInput');
        labelSelect.innerHTML = '<option value="">Nessuna</option>' +
            boardData.labels.map(l => `<option value="${l.id}">${escHtml(l.name)}</option>`).join('');

        if (cardId) {
            const card = boardData.cards.find(c => c.id === cardId);
            if (!card) return;
            document.getElementById('cardModalTitle').textContent = 'Modifica Card';
            document.getElementById('cardId').value = card.id;
            document.getElementById('cardColumnId').value = card.column_id;
            document.getElementById('cardSwimlaneId').value = card.swimlane_id;
            document.getElementById('cardTitleInput').value = card.title;
            document.getElementById('cardDescInput').value = card.description || '';
            document.getElementById('cardPriorityInput').value = card.priority;
            document.getElementById('cardLabelInput').value = card.label_id || '';
            document.getElementById('cardDueInput').value = card.due_date || '';
            document.getElementById('cardNextCheckInput').value = card.next_check || '';
            deleteBtn.style.display = 'block';
        } else {
            document.getElementById('cardModalTitle').textContent = 'Nuova Card';
            form.reset();
            document.getElementById('cardId').value = '';
            document.getElementById('cardColumnId').value = colId;
            document.getElementById('cardSwimlaneId').value = laneId;
            deleteBtn.style.display = 'none';
        }

        modal.classList.add('active');
    }

    function closeCardModal() {
        document.getElementById('cardModal').classList.remove('active');
    }

    document.getElementById('cardForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('cardId').value;
        const cardData = {
            title: document.getElementById('cardTitleInput').value,
            description: document.getElementById('cardDescInput').value,
            priority: document.getElementById('cardPriorityInput').value,
            label_id: document.getElementById('cardLabelInput').value || null,
            due_date: document.getElementById('cardDueInput').value || null,
            next_check: document.getElementById('cardNextCheckInput').value || null
        };

        if (id) {
            cardData.id = id;
            const card = boardData.cards.find(c => c.id === id);
            if (card) Object.assign(card, cardData);
            await api('update_card', cardData);
        } else {
            cardData.column_id = document.getElementById('cardColumnId').value;
            cardData.swimlane_id = document.getElementById('cardSwimlaneId').value;
            const result = await api('add_card', cardData);
            if (result.success) boardData.cards.push(result.card);
        }

        closeCardModal();
        render();
    });

    async function deleteCard() {
        const id = document.getElementById('cardId').value;
        if (!id || !confirm('Archiviare questa card?')) return;
        const card = boardData.cards.find(c => c.id === id);
        if (card) {
            card.archived = true;
            card.archived_at = new Date().toISOString().split('T')[0];
        }
        closeCardModal();
        render();
        await api('archive_card', { id });
    }

    async function restoreCard(id) {
        const card = boardData.cards.find(c => c.id === id);
        if (card) {
            card.archived = false;
            delete card.archived_at;
        }
        render();
        await api('restore_card', { id });
    }

    async function permanentDeleteCard(id) {
        if (!confirm('Eliminare definitivamente questa card?')) return;
        boardData.cards = boardData.cards.filter(c => c.id !== id);
        render();
        await api('delete_card', { id });
    }

    // === CONFIG ===
    function openConfigModal() {
        document.getElementById('configProjectName').value = boardData.config.project_name || '';
        document.getElementById('configGeminiKey').value = boardData.config.gemini_api_key || '';
        renderLabelsManager();
        document.getElementById('configModal').classList.add('active');
    }

    function closeConfigModal() {
        document.getElementById('configModal').classList.remove('active');
    }

    document.getElementById('configForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const config = {
            project_name: document.getElementById('configProjectName').value,
            gemini_api_key: document.getElementById('configGeminiKey').value,
            theme: boardData.config.theme
        };
        boardData.config = config;
        document.getElementById('projectName').textContent = config.project_name;
        document.title = `_Ykan - ${config.project_name}`;
        closeConfigModal();
        await api('save_config', config);
    });

    // === LABELS ===
    async function addLabel() {
        const result = await api('add_label', { name: 'Nuova Label', color: '#6b7280' });
        if (result.success) {
            boardData.labels.push(result.label);
            renderLabelsManager();
        }
    }

    async function updateLabelName(id, name) {
        const label = boardData.labels.find(l => l.id === id);
        if (label) label.name = name;
        await api('update_label', { id, name });
    }

    async function updateLabelColor(id, color) {
        const label = boardData.labels.find(l => l.id === id);
        if (label) label.color = color;
        await api('update_label', { id, color });
    }

    async function deleteLabel(id) {
        boardData.labels = boardData.labels.filter(l => l.id !== id);
        renderLabelsManager();
        await api('delete_label', { id });
    }

    // === THEME ===
    function toggleTheme() {
        const isDark = document.body.classList.toggle('dark');
        boardData.config.theme = isDark ? 'dark' : 'light';
        api('save_config', boardData.config);
    }

    // === PANELS ===
    function toggleArchive() {
        document.getElementById('archivePanel').classList.toggle('open');
        document.getElementById('geminiPanel').classList.remove('open');
    }

    function toggleGemini() {
        document.getElementById('geminiPanel').classList.toggle('open');
        document.getElementById('archivePanel').classList.remove('open');
    }

    // === GEMINI ===
    async function askGemini(prompt) {
        if (!boardData.config.gemini_api_key) {
            toast('Configura prima la API Key di Gemini', 'error');
            openConfigModal();
            return;
        }

        const content = document.getElementById('geminiContent');
        content.innerHTML = '<div class="gemini-loading">Analisi in corso...</div>';

        const result = await api('gemini_analyze', { prompt });
        if (result.success) {
            content.innerHTML = `<div class="gemini-response">${escHtml(result.response)}</div>`;
        } else {
            content.innerHTML = `<div class="gemini-response" style="color:var(--high)">${escHtml(result.error)}</div>`;
        }
    }

    async function askGeminiCustom() {
        const input = document.getElementById('geminiCustom');
        const question = input.value.trim();
        if (!question) return;

        if (!boardData.config.gemini_api_key) {
            toast('Configura prima la API Key di Gemini', 'error');
            openConfigModal();
            return;
        }

        const content = document.getElementById('geminiContent');
        content.innerHTML = '<div class="gemini-loading">Analisi in corso...</div>';
        input.value = '';

        const result = await api('gemini_analyze', { prompt: 'custom', custom_prompt: question });
        if (result.success) {
            content.innerHTML = `<div class="gemini-response">${escHtml(result.response)}</div>`;
        } else {
            content.innerHTML = `<div class="gemini-response" style="color:var(--high)">${escHtml(result.error)}</div>`;
        }
    }

    // === PROJECT ANALYSIS ===
    async function analyzeProject() {
        if (!boardData.config.gemini_api_key) {
            toast('Configura prima la API Key di Gemini', 'error');
            openConfigModal();
            return;
        }

        const content = document.getElementById('geminiContent');
        content.innerHTML = '<div class="gemini-loading">🔍 Scansione progetto in corso...<br><small>Analisi struttura, file chiave e entry points</small></div>';

        const result = await api('analyze_project');
        if (!result.success) {
            let errorHtml = `<div class="gemini-response" style="color:var(--high)">${escHtml(result.error)}</div>`;
            if (result.debug) {
                errorHtml += `<details style="margin-top:12px;font-size:11px"><summary style="cursor:pointer;color:var(--text2)">Debug response</summary><pre style="margin-top:8px;padding:8px;background:var(--bg);border-radius:4px;overflow:auto;max-height:200px">${escHtml(result.debug)}</pre></details>`;
            }
            content.innerHTML = errorHtml;
            return;
        }

        const data = result.result;
        const analysis = data.analysis || {};
        const tasks = data.suggested_tasks || [];

        let html = '';

        // Analysis Section
        html += '<div class="analysis-section">';
        html += '<h4>📊 Panoramica</h4>';
        html += `<p style="font-size:12px;color:var(--text2);margin-bottom:8px">${escHtml(analysis.overview || 'N/A')}</p>`;

        if (analysis.tech_stack?.length) {
            html += '<div class="analysis-tags">';
            analysis.tech_stack.forEach(t => html += `<span class="analysis-tag">${escHtml(t)}</span>`);
            html += '</div>';
        }

        if (analysis.architecture) {
            html += `<p style="font-size:11px;color:var(--text2)"><strong>Architettura:</strong> ${escHtml(analysis.architecture)}</p>`;
        }
        html += '</div>';

        // Strengths
        if (analysis.strengths?.length) {
            html += '<div class="analysis-section">';
            html += '<h4>✅ Punti di forza</h4>';
            html += '<ul class="analysis-list">';
            analysis.strengths.forEach(s => html += `<li>${escHtml(s)}</li>`);
            html += '</ul></div>';
        }

        // Concerns
        if (analysis.concerns?.length) {
            html += '<div class="analysis-section">';
            html += '<h4>⚠️ Attenzione</h4>';
            html += '<ul class="analysis-list">';
            analysis.concerns.forEach(c => html += `<li>${escHtml(c)}</li>`);
            html += '</ul></div>';
        }

        // Suggested Tasks
        if (tasks.length) {
            html += '<div class="analysis-section">';
            html += '<h4>📋 Task Suggeriti</h4>';
            tasks.forEach((task, i) => {
                const taskJson = JSON.stringify(task).replace(/'/g, "\\'").replace(/"/g, '&quot;');
                html += `
                    <div class="suggested-task" id="suggested-task-${i}">
                        <div class="suggested-task-header">
                            <div class="suggested-task-priority ${task.priority || 'medium'}"></div>
                            <div class="suggested-task-title">${escHtml(task.title)}</div>
                        </div>
                        <div class="suggested-task-desc">${escHtml(task.description || '')}</div>
                        <div class="suggested-task-footer">
                            <span class="suggested-task-category">${escHtml(task.category || 'task')}</span>
                            <button class="suggested-task-add" onclick="addSuggestedTask(${i}, '${taskJson}')">+ Aggiungi</button>
                        </div>
                    </div>
                `;
            });
            html += '</div>';
        }

        content.innerHTML = html;
    }

    async function addSuggestedTask(index, taskJson) {
        const task = JSON.parse(taskJson.replace(/&quot;/g, '"'));
        const taskEl = document.getElementById(`suggested-task-${index}`);

        // Map category to label
        const categoryToLabel = {
            'bug': boardData.labels.find(l => l.name.toLowerCase().includes('bug'))?.id,
            'feature': boardData.labels.find(l => l.name.toLowerCase().includes('feature'))?.id,
            'security': boardData.labels.find(l => l.name.toLowerCase().includes('urgent'))?.id,
            'refactor': boardData.labels.find(l => l.name.toLowerCase().includes('task'))?.id
        };

        const cardData = {
            title: task.title,
            description: task.description || '',
            priority: task.priority || 'medium',
            label_id: categoryToLabel[task.category] || null,
            column_id: boardData.columns[0]?.id, // First column (To Do)
            swimlane_id: boardData.swimlanes[0]?.id
        };

        const result = await api('add_card', cardData);
        if (result.success) {
            boardData.cards.push(result.card);
            render();
            taskEl.classList.add('added');
            taskEl.querySelector('.suggested-task-add').textContent = '✓ Aggiunto';
            toast(`Task "${task.title}" aggiunto!`, 'success');
        }
    }

    // === UTILS ===
    function escHtml(str) {
        if (!str) return '';
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // === INIT ===
    render();

    // Enter key for Gemini custom input
    document.getElementById('geminiCustom').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') askGeminiCustom();
    });

    // Check if first run
    if (!boardData.config.gemini_api_key && boardData.cards.length === 0) {
        setTimeout(openConfigModal, 500);
    }
    </script>
</body>
</html>
