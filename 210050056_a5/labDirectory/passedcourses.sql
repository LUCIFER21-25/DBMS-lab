SELECT DISTINCT course_id
FROM takes
WHERE ID = 's00000'  -- Replace 's00000' with the student ID
AND grade IS NOT NULL
AND grade <> 'F';