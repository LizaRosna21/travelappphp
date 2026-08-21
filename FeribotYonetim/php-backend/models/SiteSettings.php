<?php

class SiteSettingsModel extends BaseModel {
    protected string $table = 'site_settings';

    public function getSettings(): ?array {
        return $this->queryOne("SELECT * FROM site_settings ORDER BY id LIMIT 1");
    }

    public function updateSettings(array $data): ?array {
        $settings = $this->getSettings();
        if ($settings) {
            return $this->update($settings['id'], $data);
        }
        return $this->create($data);
    }
}
