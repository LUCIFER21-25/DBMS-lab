SELECT (password_hash = crypt('wrong_password', password_hash)) AS pswmatch
FROM loginuser
WHERE role= 'admin' AND admin_id = 'a0';
