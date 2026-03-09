<?php
/**
 * Feribot Yönetim Sistemi - Veritabanı Yapılandırması
 * PostgreSQL PDO bağlantısı
 */

class Database {
    private static ?PDO $instance = null;

    private string $host;
    private string $port;
    private string $dbname;
    private string $username;
    private string $password;
    private bool $sslMode;

    public function __construct() {
        $this->parseConnectionString();
    }

    private function parseConnectionString(): void {
        $url = getenv('DATABASE_URL') ?: 'postgresql://feribotuser:SIFRENIZ@localhost:5432/feribot_db';

        $parts = parse_url($url);
        $this->host = $parts['host'] ?? 'localhost';
        $this->port = (string)($parts['port'] ?? '5432');
        $this->dbname = ltrim($parts['path'] ?? '/feribot_db', '/');
        $this->username = $parts['user'] ?? 'feribotuser';
        $this->password = $parts['pass'] ?? '';
        $this->sslMode = filter_var(getenv('DB_SSL') ?: 'false', FILTER_VALIDATE_BOOLEAN);
    }

    public function getConnection(): PDO {
        if (self::$instance === null) {
            $dsn = "pgsql:host={$this->host};port={$this->port};dbname={$this->dbname}";

            if ($this->sslMode) {
                $dsn .= ";sslmode=require";
            }

            $options = [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false,
                PDO::ATTR_STRINGIFY_FETCHES => false,
            ];

            self::$instance = new PDO($dsn, $this->username, $this->password, $options);
            self::$instance->exec("SET timezone = 'Europe/Istanbul'");
        }

        return self::$instance;
    }

    public function testConnection(): array {
        try {
            $pdo = $this->getConnection();
            $stmt = $pdo->query("SELECT version(), now() as server_time");
            $result = $stmt->fetch();
            return [
                'status' => 'connected',
                'version' => $result['version'],
                'server_time' => $result['server_time'],
            ];
        } catch (PDOException $e) {
            return [
                'status' => 'error',
                'message' => $e->getMessage(),
            ];
        }
    }

    public static function reset(): void {
        self::$instance = null;
    }
}
