REM Run tasks from launch.json where "program" includes LAUNCH_PROGRAM
REM and "name" includes %1 argument, if defined.
REM tr_launcher is a node.js bin script in @dictadata/storage-junctions project.
SET NODE_ENV=development
SET LOG_LEVEL=verbose
SET LAUNCH_PROGRAM=tr_http_queries
tr_launcher %1
