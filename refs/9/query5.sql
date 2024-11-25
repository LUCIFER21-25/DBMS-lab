EXPLAIN
SELECT * from takes JOIN section ON takes.course_id = section.course_id AND takes.sec_id = section.sec_id AND takes.year = section.year and takes.semester = section.semester
ORDER BY takes.year;