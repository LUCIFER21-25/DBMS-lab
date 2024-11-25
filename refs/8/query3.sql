DROP INDEX if exists takes_year_idx;
DROP INDEX if exists takes_grade_idx;
CREATE INDEX takes_year_idx ON takes (year);
CREATE INDEX takes_grade_idx ON takes (grade);
EXPLAIN SELECT * FROM takes WHERE year = 2007 or grade = 'A+';