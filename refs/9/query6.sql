EXPLAIN
SELECT * from takes JOIN section ON takes.course_id = section.course_id AND takes.sec_id = section.sec_id AND takes.year = section.year and takes.semester = section.semester
ORDER BY takes.year
LIMIT 10;
-- OBSERVATION
-- In query 5, Merge Join is occurring at the start only and the Sorting(Ordering) over the takes.year key is happening after it, But in query 6, due to the LIMIT 10 clause the cost gets reduced and the Sorting over the takes.year key occurs before the Hash Join.