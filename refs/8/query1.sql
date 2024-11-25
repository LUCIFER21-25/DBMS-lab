DROP INDEX if exists takes_year_idx;
CREATE INDEX takes_year_idx ON takes (year);
EXPLAIN SELECT * FROM takes WHERE year = 2007;