SHOW TABLES;

SELECT * FROM foo_schema;
SELECT * FROM foo_transfer;
SELECT * FROM foo_transfer_3;
SELECT * FROM foo_dbtransform;
SELECT * FROM weather_forecast;

DELETE FROM foo_schema;
DELETE FROM foo_transfer;
DELETE FROM foo_dbtransform;
DELETE FROM weather_forecast;

DROP TABLE foo_schema;
DROP TABLE foo_transfer;
DROP TABLE foo_transfer_3;
DROP TABLE foo_dbtransform;
DROP TABLE weather_forecast;
