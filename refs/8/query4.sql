DROP INDEX if exists id_index;
CREATE INDEX id_index on takes(ID);
EXPLAIN SELECT * FROM takes
NATURAL JOIN student
WHERE ID = '94836';