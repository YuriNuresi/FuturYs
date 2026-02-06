<?php
/**
 * 🚀 FUTURY - Database Configuration
 * Configurazione per SQLite + Herd
 * 
 * @version 1.0
 * @date 2026-02-05
 */

class Database {
    private static $instance = null;
    private $connection;
    private $database_path;
    
    // Configurazione database
    const DB_NAME = 'futury.db';
    const DB_SCHEMA = 'schema.sql';
    
    private function __construct() {
        $this->database_path = __DIR__ . '/../../database/' . self::DB_NAME;
        $this->connect();
    }
    
    /**
     * Singleton pattern per connessione database
     */
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }
    
    /**
     * Connessione SQLite
     */
    private function connect() {
        try {
            // Crea directory database se non esiste
            $db_dir = dirname($this->database_path);
            if (!file_exists($db_dir)) {
                mkdir($db_dir, 0755, true);
            }
            
            // Connessione SQLite
            $this->connection = new PDO(
                'sqlite:' . $this->database_path,
                null,
                null,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false,
                ]
            );
            
            // Abilita foreign keys per SQLite
            $this->connection->exec('PRAGMA foreign_keys = ON');
            
            // Se il database è nuovo, crea lo schema
            $this->initializeSchema();
            
            $this->log('Database connesso con successo: ' . $this->database_path);
            
        } catch (PDOException $e) {
            $this->logError('Errore connessione database: ' . $e->getMessage());
            throw new Exception('Impossibile connettersi al database');
        }
    }
    
    /**
     * Inizializza schema se database è vuoto
     */
    private function initializeSchema() {
        try {
            // Controlla se esistono tabelle
            $stmt = $this->connection->query(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='players'"
            );
            
            if (!$stmt->fetch()) {
                // Database vuoto, carica schema
                $schema_path = __DIR__ . '/../../database/' . self::DB_SCHEMA;
                
                if (file_exists($schema_path)) {
                    $schema_sql = file_get_contents($schema_path);
                    $this->connection->exec($schema_sql);
                    $this->log('Schema database inizializzato');
                } else {
                    $this->logError('File schema.sql non trovato: ' . $schema_path);
                }
            }
            
        } catch (Exception $e) {
            $this->logError('Errore inizializzazione schema: ' . $e->getMessage());
        }
    }
    
    /**
     * Ottieni connessione PDO
     */
    public function getConnection() {
        return $this->connection;
    }
    
    /**
     * Esegui query SELECT
     */
    public function select($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            $this->logError('Errore SELECT: ' . $e->getMessage() . ' | Query: ' . $sql);
            return false;
        }
    }
    
    /**
     * Esegui query SELECT singola riga
     */
    public function selectOne($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt->fetch();
        } catch (PDOException $e) {
            $this->logError('Errore SELECT ONE: ' . $e->getMessage() . ' | Query: ' . $sql);
            return false;
        }
    }
    
    /**
     * Esegui query INSERT
     */
    public function insert($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                return $this->connection->lastInsertId();
            }
            return false;
            
        } catch (PDOException $e) {
            $this->logError('Errore INSERT: ' . $e->getMessage() . ' | Query: ' . $sql);
            return false;
        }
    }
    
    /**
     * Esegui query UPDATE
     */
    public function update($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                return $stmt->rowCount();
            }
            return false;
            
        } catch (PDOException $e) {
            $this->logError('Errore UPDATE: ' . $e->getMessage() . ' | Query: ' . $sql);
            return false;
        }
    }
    
    /**
     * Esegui query DELETE
     */
    public function delete($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $result = $stmt->execute($params);
            
            if ($result) {
                return $stmt->rowCount();
            }
            return false;
            
        } catch (PDOException $e) {
            $this->logError('Errore DELETE: ' . $e->getMessage() . ' | Query: ' . $sql);
            return false;
        }
    }
    
    /**
     * Inizia transazione
     */
    public function beginTransaction() {
        return $this->connection->beginTransaction();
    }
    
    /**
     * Commit transazione
     */
    public function commit() {
        return $this->connection->commit();
    }
    
    /**
     * Rollback transazione
     */
    public function rollback() {
        return $this->connection->rollback();
    }
    
    /**
     * Test connessione database
     */
    public function testConnection() {
        try {
            $result = $this->selectOne("SELECT 'Database FuturY OK!' as test");
            return $result !== false;
        } catch (Exception $e) {
            $this->logError('Test connessione fallito: ' . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Ottieni informazioni database
     */
    public function getDatabaseInfo() {
        try {
            // Info generali
            $info = [
                'database_path' => $this->database_path,
                'database_exists' => file_exists($this->database_path),
                'database_size' => file_exists($this->database_path) ? 
                    round(filesize($this->database_path) / 1024, 2) . ' KB' : '0 KB',
                'connection_status' => 'Connected',
                'tables' => []
            ];
            
            // Lista tabelle
            $tables = $this->select(
                "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
            );
            
            foreach ($tables as $table) {
                $count_result = $this->selectOne(
                    "SELECT COUNT(*) as count FROM " . $table['name']
                );
                $info['tables'][$table['name']] = $count_result['count'] ?? 0;
            }
            
            return $info;
            
        } catch (Exception $e) {
            $this->logError('Errore info database: ' . $e->getMessage());
            return [
                'error' => $e->getMessage(),
                'connection_status' => 'Error'
            ];
        }
    }
    
    /**
     * Logging semplice
     */
    private function log($message) {
        $log_file = __DIR__ . '/../../logs/database.log';
        $log_dir = dirname($log_file);
        
        if (!file_exists($log_dir)) {
            mkdir($log_dir, 0755, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents(
            $log_file, 
            "[$timestamp] INFO: $message\n", 
            FILE_APPEND | LOCK_EX
        );
    }
    
    /**
     * Log errori
     */
    private function logError($message) {
        $log_file = __DIR__ . '/../../logs/database_errors.log';
        $log_dir = dirname($log_file);
        
        if (!file_exists($log_dir)) {
            mkdir($log_dir, 0755, true);
        }
        
        $timestamp = date('Y-m-d H:i:s');
        file_put_contents(
            $log_file, 
            "[$timestamp] ERROR: $message\n", 
            FILE_APPEND | LOCK_EX
        );
    }
}

/**
 * 🎯 Funzione helper per accesso rapido
 */
function getDB() {
    return Database::getInstance();
}

/**
 * 🧪 Test rapido database
 */
function testDatabase() {
    try {
        $db = Database::getInstance();
        $test_result = $db->testConnection();
        
        if ($test_result) {
            echo "✅ Database FuturY: Connessione OK!\n";
            
            $info = $db->getDatabaseInfo();
            echo "📊 Database info:\n";
            echo "   Path: " . $info['database_path'] . "\n";
            echo "   Size: " . $info['database_size'] . "\n";
            echo "   Tables: " . count($info['tables']) . "\n";
            
            foreach ($info['tables'] as $table => $count) {
                echo "   - $table: $count records\n";
            }
            
        } else {
            echo "❌ Database FuturY: Errore connessione!\n";
        }
        
    } catch (Exception $e) {
        echo "💥 Errore test database: " . $e->getMessage() . "\n";
    }
}

// 🧪 Se chiamato direttamente, esegui test
if (basename($_SERVER['PHP_SELF']) === 'database.php') {
    testDatabase();
}
?>
