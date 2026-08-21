<?php

class PortModel extends BaseModel {
    protected string $table = 'ports';

    public function getActivePorts(): array {
        return $this->query("SELECT * FROM ports WHERE is_active = true ORDER BY country, city, name");
    }

    public function searchPorts(string $search): array {
        return $this->query(
            "SELECT * FROM ports WHERE is_active = true AND (name ILIKE :s OR city ILIKE :s OR country ILIKE :s) ORDER BY name",
            [':s' => "%$search%"]
        );
    }
}
