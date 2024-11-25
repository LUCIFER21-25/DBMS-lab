EXPLAIN 
SELECT count(year) AS c FROM takes NATURAL JOIN section
GROUP BY takes.ID
ORDER BY takes.ID;