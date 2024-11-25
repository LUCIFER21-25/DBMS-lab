const express = require("express");
const pg = require("pg");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const app = express();
const port = 13000;

const bodyParser = require("body-parser")

app.use(bodyParser.urlencoded())
app.use(cookieParser());
app.get("/", (req, res) => {
  return res.send("Hello, World!");
});

app.get("/login.html", (req, res) => {
  return res.sendFile(__dirname + '/login.html');
});


const password_checker = async (data) => {
  const {role, userid, password} = data;
  const client = new pg.Client({
    host: 'localhost',
    port: 11000,
    user: 'postgres',
    password: 'postgres',
    database: 'univ_lab6'
  })
  await client.connect()

  let idname = ''
  if (role == 'student')
    idname = 'stud_id'
  else if (role == 'instructor')
    idname = 'ins_id'
  else if (role == 'admin')
    idname = 'admin_id'
  
  let ans = false;

  try {
    const res = await client.query(`SELECT (password_hash = crypt('${password}', password_hash)) AS pswmatch FROM loginuser WHERE ${idname} = '${userid}' and role = '${role}';`)
    if (res.rowCount > 0 && res.rows[0].pswmatch)
      ans = true;
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
  return ans;
}


app.get('/dashboard.html', async (req, res) => {
  const client = new pg.Client({
    host: 'localhost',
    port: 11000,
    user: 'postgres',
    password: 'postgres',
    database: 'univ_lab6'
  })
  await client.connect()
  const token = req.cookies.jwt;
  const data = jwt.verify(token, "main_nahi_bataunga");
  const q = `
  select distinct course_id, sec_id, (case when T.ID is null then 'Not Registered' else 'Registered' end) as reg_status
  from section as S natural left outer join takes as T
  where S.semester = 'Spring' and S.year = 2024;
  `
  let tableData = '';
  try {
    const query = await client.query(q);
    query.rows.forEach(row => {
      tableData += `<tr><td>${row.course_id}</td><td>${row.sec_id}</td><td>${row.reg_status}</td></tr>`;
    });
  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
  if(data){
    const userid = data.userid;
    const role = data.role;
    const web = `<br>userid = ${userid}<br><br/>role = ${role}<br><br><h1> Course Table </h1><br>
    <table>
      <tr>
        <th> Course ID </th>
        <th> Sec ID </th>
        <th> Registration Status </th>
      </tr>
      ${tableData}
    </table>
    <br><br><h1> Registration Form </h1><br>
    <form action="register.html" method="post">
    <label for="courseid">Course ID:</label>
    <input type="text" id="courseid" name="courseid" required>
    <br><br>
    <label for="secId">Sec ID:</label>
    <input type="text" id="secid" name="secid" required>
    <br><br>
    <button type="register" id="register" value="register">Register</button>
    </form>`
    return res.send(web)
  }
  else{
    return res.send(`User not logged in`)
  }
})

app.post("/logincheck", async (req, res) => {
  if (await password_checker(req.body)){
    const{role, userid, password} = req.body
    const token = jwt.sign({ userid, role }, "main_nahi_bataunga");
    res.cookie("jwt", token, {
      })
    res.send(`<meta http-equiv="refresh" content="10;URL='/dashboard.html'" />
    <body>login success</body>`)
    // res.send("login success")
  }
  else{
    res.send("login failure")
  }
});

app.post("/register.html", async (req, res) => {
  const client = new pg.Pool({
    host: 'localhost',
    port: 11000,
    user: 'postgres',
    password: 'postgres',
    database: 'univ_lab6'
  })
  await client.connect()
  const token = req.cookies.jwt;
  const data = await jwt.verify(token, "main_nahi_bataunga");
  if(data){
    let queryForCourseValidity = `
      select *
      from section
      where semester = 'Spring' and year = '2024' and course_id = '${req.body.courseid}' and sec_id = '${req.body.secid}';
    `;
    try {
      const qFCV = await client.query(queryForCourseValidity);
      if (qFCV.rowCount <= 0){
        return res.send(`Registration failed - no such course and section`);
      }
    } catch (err) {
      console.error(err);
      return res.sendStatus(501);
    }
    let queryForRegCheck = `
      select *
      from takes
      where course_id = '${req.body.courseid}' and ID = '${data.userid}' and ((grade is not null and grade <> 'F') or (semester = 'Spring' and year = 2024));
    `;
    try {
      const qFRC = await client.query(queryForRegCheck);
      if (qFRC.rowCount > 0){
        return res.send(`Registration failed - already registered`);
      }
    } catch (err) {
      console.error(err);
      res.sendStatus(501);
    }
    let queryForPrereqCheck = `
      (select prereq_id from prereq where course_id = '${req.body.courseid}')
      except
      (select course_id from takes where ID = '${data.userid}' and grade is not null and grade <> 'F');
    `
    try {
      const qFPC = await client.query(queryForPrereqCheck);
      if (qFPC.rowCount > 0){
        let output = `Registration failed - prereq incomplete: ${qFPC.rows[0].prereq_id}`;
        for(let i=1; i < qFPC.rows.length; i++){
          output += `, ${qFPC.rows[i].prereq_id}`;
        }
        return res.send(output);
      }
    } catch (err) {
      console.error(err);
    }

    let qRegLim = `(SELECT registration_limit FROM section WHERE sec_id = ${req.body.secid} AND semester = 'Spring' and year = '2024' and course_id = '${req.body.courseid}')
     > (SELECT count(distinct ID) from takes WHERE sec_id = ${req.body.secid} AND semester = 'Spring' and year = '2024' and course_id = '${req.body.courseid}') `

    
     try {
      const q = await client.query(qRegLim);
      if (!q){
        return res.send(`Registration failed - limit exceeded`);
      }
    } catch (err) {
      console.error(err);
    }


     let queryForRegistration = `select pg_sleep(30); INSERT INTO takes VALUES ('${data.userid}', '${req.body.courseid}', '${req.body.secid}', 'Spring', 2024, NULL)`;
    try {
      await client.query(queryForRegistration);
      return res.send(`Course registration successful`);
    } catch (err) {
      console.error(err);
    } finally {
      await client.end();
    }
  }
  else{
    return res.send(`User not logged in`)
  }
})

app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});