SHOW TABLES;
DESCRIBE foo_schema;
DESCRIBE foo_transfer;
DESCRIBE foo_schema_etl;
DESCRIBE foo_schema_etl2;

SELECT * FROM foo_schema;
SELECT * FROM foo_transfer;
SELECT * FROM foo_transform;
SELECT * FROM foo_dbtransform;
SELECT * FROM weather_forecast;

DELETE FROM foo_schema;
DELETE FROM foo_transfer;
DELETE FROM foo_transform;
DELETE FROM foo_dbtransform;
DELETE FROM weather_forecast;

DROP TABLE foo_schema;
DROP TABLE foo_transfer;
DROP TABLE foo_transform;
DROP TABLE foo_dbtransform;
DROP TABLE weather_forecast;
DROP TABLE foo_schema_etl;
DROP TABLE foo_schema_etl2;
