<?php
/**
 * Temel Model sınıfı - Tüm modeller bu sınıftan türetilir
 */

abstract class BaseModel {
    protected PDO $db;
    protected string $table;
    protected string $primaryKey = 'id';

    public function __construct(PDO $db) {
        $this->db = $db;
    }

    public function findAll(array $where = [], string $orderBy = 'id DESC', int $limit = 100, int $offset = 0): array {
        $sql = "SELECT * FROM {$this->table}";
        $params = [];

        if (!empty($where)) {
            $conditions = [];
            foreach ($where as $key => $value) {
                if ($value === null) {
                    $conditions[] = "$key IS NULL";
                } else {
                    $conditions[] = "$key = :$key";
                    $params[":$key"] = $value;
                }
            }
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $sql .= " ORDER BY $orderBy LIMIT :limit OFFSET :offset";
        $params[':limit'] = $limit;
        $params[':offset'] = $offset;

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function findById(int $id): ?array {
        $stmt = $this->db->prepare("SELECT * FROM {$this->table} WHERE {$this->primaryKey} = :id");
        $stmt->execute([':id' => $id]);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function findOne(array $where): ?array {
        $conditions = [];
        $params = [];
        foreach ($where as $key => $value) {
            $conditions[] = "$key = :$key";
            $params[":$key"] = $value;
        }

        $sql = "SELECT * FROM {$this->table} WHERE " . implode(' AND ', $conditions) . " LIMIT 1";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function count(array $where = []): int {
        $sql = "SELECT COUNT(*) as total FROM {$this->table}";
        $params = [];

        if (!empty($where)) {
            $conditions = [];
            foreach ($where as $key => $value) {
                $conditions[] = "$key = :$key";
                $params[":$key"] = $value;
            }
            $sql .= " WHERE " . implode(' AND ', $conditions);
        }

        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return (int)$stmt->fetch()['total'];
    }

    public function create(array $data): array {
        $columns = implode(', ', array_keys($data));
        $placeholders = ':' . implode(', :', array_keys($data));

        $params = [];
        foreach ($data as $key => $value) {
            $params[":$key"] = is_array($value) ? json_encode($value) : $value;
        }

        $sql = "INSERT INTO {$this->table} ($columns) VALUES ($placeholders) RETURNING *";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetch();
    }

    public function update(int $id, array $data): ?array {
        $sets = [];
        $params = [':id' => $id];

        foreach ($data as $key => $value) {
            $sets[] = "$key = :$key";
            $params[":$key"] = is_array($value) ? json_encode($value) : $value;
        }

        $sql = "UPDATE {$this->table} SET " . implode(', ', $sets) . " WHERE {$this->primaryKey} = :id RETURNING *";
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function delete(int $id): bool {
        $stmt = $this->db->prepare("DELETE FROM {$this->table} WHERE {$this->primaryKey} = :id");
        return $stmt->execute([':id' => $id]);
    }

    public function query(string $sql, array $params = []): array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        return $stmt->fetchAll();
    }

    public function queryOne(string $sql, array $params = []): ?array {
        $stmt = $this->db->prepare($sql);
        $stmt->execute($params);
        $result = $stmt->fetch();
        return $result ?: null;
    }

    public function execute(string $sql, array $params = []): bool {
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
}
