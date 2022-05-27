SET NODE_ENV=development
SET LOG_LEVEL=verbose
CD test
node --inspect --preserve-symlinks storage-node.js
