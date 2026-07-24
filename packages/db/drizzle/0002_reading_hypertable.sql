SELECT create_hypertable('reading', by_range('ts'), if_not_exists => true, migrate_data => true);
