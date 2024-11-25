const express = require("express");
const bodyParser = require("body-parser");
const pg = require("pg");
const path = require("path");
const { Pool } = require('pg');
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");

const app = express();
const port = 13000;
app.use(cookieParser());
const currentSemester = 'Spring';
const currentYear = 2024; 

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.urlencoded({extended: true}));

const pool = new Pool({
    user: 'postgres',
    host: '127.0.0.1',
    database: 'univ_lab5',
    password: 'postgres',
    port: 11000, // adjust the port if needed
});

app.use(express.static('public'));
// app.use(express.static(path.join('./')));
// pool.connect()
//     .then(() => console.log('Connected to PostgreSQL database'))
//     .catch(err => console.error('Error connecting to PostgreSQL database', err));

const authorization = (req, res, next) => {
  const token = req.cookies.jwt;
  if(!token){
    return res.status(403).send(`User not logged in`);
  }
  try {
    const data = jwt.verify(token, "secret_key");
    // if(!data)return res.send(`User not logged in`);
    req.userid = data.id;
    req.role = data.role;
    return next();
  }
  catch {
    return res.sendStatus(403);
  }
};

// app.get("/", (req, res) => {
//   return res.send("Hello, World!");
// });

app.get("/", (req, res) => {
  return res.json({ message: "Hello World" });
});

// app.get("/login", (req, res) => {
// //   const token = jwt.sign({id: , role: }, "1234");
//   return res
//   	.cookie("access_token", token, {
//     	httpOnly: true,
//     	secure: process.env.NODE_ENV === "production",
//   })
//   .status(200)
//   .json({ message: "Logged in successfully"});
// });

app.get("/login.html", (req, res) => {
  res.sendFile(__dirname + '/login.html');
});

// app.get('/register.html', authorization, (req, res) => {
//   res.sendFile(__dirname + '/register.html');
// });

app.post("/register.html", authorization, async(req, res)=>{
  // const token = req.cookies.jwt;

  // if (!token) {
  //   return res.status(401).send('Unable to register');
  // }

  // jwt.verify(token, 'secret_key', (err, decoded) => {
  //   if (err) {
  //     return res.status(401).send('User not logged in');
  //   }

    const userid = req.userid;
    // console.log(req.body);

    const courseid = req.body.courseid;
    const secid = req.body.secid;

    // const { userid } = decoded;
    // const { courseid, secid } = req.body;

// Valid course and section in current semester and year
// Whether the student has registered for the course (any section) already
// Whether student has completed pre-requisites (passing grade) for that course
    const query = {
      text: `
      SELECT *
      FROM section
      WHERE section.sec_id = $1 AND section.course_id = $2 AND section.semester = $3 AND section.year = $4;`,
      values: [secid, courseid, currentSemester, currentYear]
    }
    try{
      const result = await pool.query(query);
      if (result.rows.length === 0) {
        // Query returned no rows, indicating invalid course ID and section ID
        return res.status(400).send('Registration failed - no such course and section');
      }
    }
      catch (error) {
        console.error('Error executing query:', error);
        return res.status(500).send('Internal Server Error');
      }      
    
    
    const query1 = {
      text: `
      SELECT *
      FROM takes
      WHERE takes.ID = $1 AND takes.course_id = $2 AND takes.semester = $3 AND takes.year = $4 ;`,
      values: [userid, courseid, currentSemester, currentYear]
    }

    try  
    {
      const result1 = await pool.query(query1);
        
        if(result1.rows.length > 0){
          return res.status(400).send('Registration failed - already registered');
        } 
    }
    catch (error) {
      console.error('Error executing query:', error);
      return res.status(500).send('Internal Server Error');
    }
    
    
    const query2 = {
      text: `
        (SELECT p.prereq_id
        FROM prereq p
        WHERE p.course_id = $1)
        EXCEPT
        (SELECT t.course_id
        FROM takes t
        WHERE t.ID = $2);
      `,
      values: [courseid, userid ]
    }

    try
    {  
      const result2 = await pool.query(query2);
        
        if(result2.rows.length > 0)
        {
          let prereqs = 'Registration failed - prereq incomplete: ';
          result2.rows.forEach((row, index) => {
          if (index > 0) 
          {
              prereqs += ', '; // Add a comma separator if it's not the first prerequisite
          }
          prereqs += row.prereq_id;  
        });
        return res.status(400).send(prereqs);
        }
    }
    catch(error) 
        {
          console.error('Error executing query:', error);
          return res.status(500).send('Internal Server Error');
        }
    
    const query3 = {
      text: `
        INSERT INTO takes
        VALUES ($1, $2, $3, $4, $5);
      `,
      values: [userid, courseid, secid, currentSemester, currentYear]
    }
    try
    {  
      const result3 = await pool.query(query3);
          return res.status(200).send('Course registration successful');
          
    }
    catch(error) {
      console.error('Error executing query:', error);
      return res.status(500).send('Internal Server Error');
    }
  });


// });

app.get("/dashboard.html", authorization, async(req, res) => {
  const token = req.cookies.jwt;
  
  if(!token)
    {
      res.send("User not logged in");
      return;
    }
//   jwt.verify(token, 'secret_key', (err, decoded) => {
//     if (err) {
//       // If JWT verification fails, user is not logged in
//       return res.status(401).send('User not logged in');
//     }

//     // If token is valid, user is authenticated
//     const { userid, role } = decoded;
//     res.status(200).send(`userid=${userid}<br>role=${role}`);
//   });
  try{
    const decoded = jwt.verify(token, 'secret_key');
    if(!decoded)return res.send(`User not logged in`);
    const userid = decoded.id;
    const role = decoded.role;
    // const { userid, role } = decoded;
    const query = {
      text: `
      SELECT distinct course_id, sec_id, (case when T.ID is null then 'Not Registered' else 'Registered' end) as reg_status
      FROM section as S natural left outer join takes as T
      WHERE S.semester = $1 AND S.year = $2;`,
      values: [currentSemester, currentYear]
    };
    
    pool.query(query, (error1, result1) => {
      if (error1) {
        console.error('Error executing query:', error1);
        return res.status(500).send('Internal Server Error');
      }
      let tableRows = '';
	      result1.rows.forEach(row => {
          tableRows += `<tr><td>${row.course_id}</td><td>${row.sec_id}</td><td>${row.reg_status}</td></tr>`;      
  });
       const output = `
    <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dashboard</title>
      </head>
      <body>
        <p>User ID: ${userid}</p>
        <p>User Role: ${role}</p>
        <h1>Course Table</h1>
        <table border="1">
          <thead>
            <tr>
              <th>Course ID</th>
              <th>Section ID</th>
			  <th>Registration Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
		<h2>Registration Form</h2>
			<form action="/register.html" method="post">
              <label for="courseid">Course ID:</label>
              <input type="text" id="courseid" name="courseid"><br><br>
              <label for="secid">Section ID:</label>
              <input type="text" id="secid" name="secid"><br><br>
              <input type="submit" value="Register" id="register">
            </form>
      </body>
    </html>
  `;
		res.send(output);
    });
  }
  catch(error){
    console.error('verification error: ', error);
    return res.send('User not logged in');
  }
});

app.post('/logincheck', async (req, res) => {
    const userid = req.body.userid;
    const password = req.body.password;
    const role = req.body.role;
	const redirectDelay = 10;
        const query = {
        	text: 
      			`SELECT (password_hash = crypt($1, password_hash)) AS pswmatch 
				 FROM loginuser 
				 WHERE (role = $2 AND stud_id = $3) or (role = $2 and ins_id = $3) or (role = $2 and admin_id = $3)`,
        	values: [password, role, userid]
    	};



    try {
        // Execute the PostgreSQL query
        const result = await pool.query(query);

		
      // Check the query result
        if (result.rows[0].pswmatch) {
          	const token = jwt.sign({ id: userid, role: role}, 'secret_key');
          	res.cookie('jwt', token, {httpOnly: true});	
          	 const metaTag = `<meta http-equiv="refresh" content="${redirectDelay};url=/dashboard.html">`;
    res.send(`${metaTag} <p>Login Successful. Redirecting...</p>`);
//           return res
//           		.cookie("access_token", token, {
//       				httpOnly: true,
//       				secure: process.env.NODE_ENV === "production",
//     			})
//     			.status(200)
//     			.json({ message: "Logged in successfully" });
//           		res.set('Content-Type','text/html');	
//           res.send('<meta http-equiv="refresh" content="${redirectDelay};url=/dashboard.html"> login success '+role);
// //             res.send('login success '+role);
//           		res.redirect('/dashboard.html');
        } else {
          	res.status(401).json({error: 'Unauthorized' });
            res.send('login failure');
        }
    } catch (error) {
      	res.send('error');
        res.status(500).json({ error: 'Internal Server Error' });

    }
});

app.get("/protected", authorization, (req, res) => {
  return res.json({ user: { id: req.userid, role: req.userRole } });
});

app.get("/logout", authorization, (req, res) => {
  return res
    .clearCookie("access_token")
    .status(200)
    .json({ message: "Successfully logged out" });
});

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});