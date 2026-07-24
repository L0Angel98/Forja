-- Custom SQL migration file, put your code below! --
-- Continuous aggregates de TimescaleDB para las 3 resoluciones que expone
-- consultar_sensores (spec 15): el LLM nunca genera SQL, solo elige entre
-- este conjunto cerrado de buckets. La agregación real-time (activada por
-- defecto) hace visibles los datos recién insertados sin esperar el
-- refresh policy.
CREATE MATERIALIZED VIEW reading_agg_5m
WITH (timescaledb.continuous) AS
SELECT
	sensor_id,
	time_bucket('5 minutes', ts) AS bucket,
	min(value) AS min_valor,
	max(value) AS max_valor,
	avg(value) AS avg_valor,
	count(value)::integer AS count_valor,
	last(value, ts) AS last_valor
FROM reading
GROUP BY sensor_id, bucket
WITH NO DATA;
--> statement-breakpoint
CREATE MATERIALIZED VIEW reading_agg_1h
WITH (timescaledb.continuous) AS
SELECT
	sensor_id,
	time_bucket('1 hour', ts) AS bucket,
	min(value) AS min_valor,
	max(value) AS max_valor,
	avg(value) AS avg_valor,
	count(value)::integer AS count_valor,
	last(value, ts) AS last_valor
FROM reading
GROUP BY sensor_id, bucket
WITH NO DATA;
--> statement-breakpoint
CREATE MATERIALIZED VIEW reading_agg_1d
WITH (timescaledb.continuous) AS
SELECT
	sensor_id,
	time_bucket('1 day', ts) AS bucket,
	min(value) AS min_valor,
	max(value) AS max_valor,
	avg(value) AS avg_valor,
	count(value)::integer AS count_valor,
	last(value, ts) AS last_valor
FROM reading
GROUP BY sensor_id, bucket
WITH NO DATA;
--> statement-breakpoint
SELECT add_continuous_aggregate_policy('reading_agg_5m',
	start_offset => INTERVAL '1 day',
	end_offset => INTERVAL '5 minutes',
	schedule_interval => INTERVAL '5 minutes');
--> statement-breakpoint
SELECT add_continuous_aggregate_policy('reading_agg_1h',
	start_offset => INTERVAL '7 days',
	end_offset => INTERVAL '1 hour',
	schedule_interval => INTERVAL '1 hour');
--> statement-breakpoint
SELECT add_continuous_aggregate_policy('reading_agg_1d',
	start_offset => INTERVAL '90 days',
	end_offset => INTERVAL '1 day',
	schedule_interval => INTERVAL '1 day');
--> statement-breakpoint
CREATE INDEX reading_agg_5m_sensor_bucket_idx ON reading_agg_5m (sensor_id, bucket);
--> statement-breakpoint
CREATE INDEX reading_agg_1h_sensor_bucket_idx ON reading_agg_1h (sensor_id, bucket);
--> statement-breakpoint
CREATE INDEX reading_agg_1d_sensor_bucket_idx ON reading_agg_1d (sensor_id, bucket);
