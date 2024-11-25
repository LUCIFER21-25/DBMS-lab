INSERT INTO loginuser (stud_id, role, password_hash)
VALUES ('s0', 'student', crypt('weakpassword', gen_salt('md5')) ), ('s1', 'student', crypt('weakpassword', gen_salt('md5')));
