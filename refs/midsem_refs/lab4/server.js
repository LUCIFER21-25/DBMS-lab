const express = require("express");
const bodyParser = require("body-parser");
const pg = require("pg");
const path = require("path");
const { Pool } = require('pg');

const app = express();
const port = 13000;

app.get("/", (req, res) => {
  return res.send("Hello, World!");
});


app.use(bodyParser.urlencoded({extended: true}));

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'univ',
    password: 'postgres',
    port: 11000, // adjust the port if needed
});

app.use(express.static(path.join('./')));
pool.connect()
    .then(() => console.log('Connected to PostgreSQL database'))
    .catch(err => console.error('Error connecting to PostgreSQL database', err));

app.post('/logincheck', async (req, res) => {
    const userid = req.body.userid;
    const password = req.body.password;
    const role = req.body.role;
// 	if( role === 'student')
//       {
        const query = {
        	text: 
      			`SELECT (password_hash = crypt($1, password_hash)) AS pswmatch 
				 FROM loginuser 
				 WHERE (role = $2 AND stud_id = $3) or (role = $2 and ins_id = $3) or (role = $2 and admin_id = $3)`,
        	values: [password, role, userid]
    	};
//       }
//   	if( role === 'instructor')
//       {
//         const query = {
//         	text: 
//       			`SELECT (password_hash = crypt($1, password_hash)) AS pswmatch FROM loginuser WHERE role = $2 AND ins_id = $3`,
//         	values: [password, role, userid]
//     	};
//       }
//   	if( role === 'admin')
//       {
//         const query = {
//         	text: 
//       			`SELECT (password_hash = crypt($1, password_hash)) AS pswmatch FROM loginuser WHERE role = $2 AND admin_id = $3`,
//         	values: [password, role, userid]
//     	};
//       }
  
    // Construct the PostgreSQL query
//     const query = {
//         text: 
//       		'SELECT (password_hash = crypt($1, password_hash)) AS pswmatch FROM loginuser WHERE role = $2 AND ${role}_id = $3',
//         values: [password, role, userid],
//     };

    try {
        // Execute the PostgreSQL query
        const result = await pool.query(query);
        // Check the query result
        if (result.rows[0].pswmatch) {
            res.send('login success '+role);
        } else {
            res.send('login failure');
        }
    } catch (error) {
//         console.error('Error executing PostgreSQL query', error);
        res.send('error');
    }
});



// var server = app.listen(13000, () {
//    var host = server.address().address
//    var port = server.address().port
   
//    console.log("Example app listening at http://%s:%s", host, port)
// })


app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});