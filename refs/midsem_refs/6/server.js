const express = require("express");
const bodyParser = require("body-parser");
const pg = require("pg");
const path = require("path");
const jwt = require("jsonwebtoken");
const cp = require("cookie-parser");

function dashboard(userid, role, data) {
  const rows = data
    .map(
      (x) => `<tr>
    <td>${x.course_id}</td>
    <td>${x.sec_id}</td>
    ${
      x.reg
        ? '<td style="color: green">Registered</td>'
        : "<td>Not Registered</td>"
    }
  </tr>`
    )
    .reduce((x, y) => x + "\n" + y);

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nano-ASC</title>
  </head>
  <body>
    <div>userid = ${userid}</div><br />
    <div>role = ${role}</div>
    <h1>Course Table</h1>
    <table>
      <tr>
        <th>Course ID</th>
        <th>Sec ID</th>
        <th>Registration Status</th>
      </tr>
      ${rows}
    </table>

    <form method="POST" action="register.html">
      <h1>Registration Form</h1>
      <div>
        <label for="courseid">Course ID</label>
        <input name="courseid" id="courseid" />
      </div>
      <br />
      <div>
        <label for="secid">Sec ID</label>
        <input name="secid" id="secid" />
      </div>
      <br />
      <button type="submit" id="register">Register</button>
    </form>
  </body>
  </html>`;
}

const app = express();
app.use(cp());
app.use(bodyParser.urlencoded({ extended: true }));

const port = 13000;
const SKEY = "eaba456fa084ea749286c7af6ab301aeedb15cfd1f6913237564c93fc5478d32";

const client = new pg.Pool({
  host: "127.0.0.1",
  port: 11000,
  database: "univ_lab6",
  user: "postgres",
  password: "postgres",
});
client.connect();

const id_map = {
  student: "stud_id",
  instructor: "ins_id",
  admin: "admin_id",
};

function authorization(req, res, next) {
  try {
    const token = req.cookies.jwt;
    if (!token) throw new Error("");
    req.auth_data = jwt.verify(token, SKEY);
    return next();
  } catch (_) {
    return res.clearCookie("jwt").status(200).send(`User not logged in`);
  }
}

app.get("/", (_, res) => {
  return res.send("Hello, World!");
});

app.get("/login.html", (_, res) => {
  return res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/logincheck", async (req, res) => {
  const { role, userid, password } = req.body;
  const db_role = id_map[role];
  const x = await client.query(
    `SELECT (password_hash = crypt('${password}', password_hash)) AS pwmatch FROM loginuser where ${db_role} = '${userid}';`
  );
  const match = Boolean(x.rows[0]?.pwmatch);

  if (match) {
    const token = jwt.sign({ userid, role }, SKEY);
    res.set("refresh", "10;url=/dashboard.html");
    return res
      .cookie("jwt", token)
      .status(200)
      .send(`login success as ${role}`);
  } else {
    return res.send(`login failure as ${role}`);
  }
});

app.get("/dashboard.html", authorization, async (req, res) => {
  const { userid, role } = req.auth_data;
  if (!(userid && role)) return res.sendStatus(403);

  const x = (
    await client.query(
      `select course_id, sec_id, ( (course_id,sec_id,semester,year) in (select course_id,sec_id,semester,year from takes where ID = '${userid}') ) as reg from section where semester = 'Spring' and year = 2024;`
    )
  ).rows;
  return res.send(dashboard(userid, role, x));
});

app.post("/register.html", authorization, async (req, res) => {
  const { userid, role } = req.auth_data;
  const { courseid, secid } = req.body;
  if (!(userid && role)) return res.sendStatus(403);

  let match = (
    await client.query(
      `select (count(*) > 0) as logic from section where course_id = '${courseid}' and sec_id = '${secid}' and semester = 'Spring' and year = 2024;`
    )
  ).rows[0].logic;
  if (!match)
    return res
      .status(400)
      .send("Registration failed - no such course and section");
  match = (
    await client.query(
      `select (count(*) > 0) as logic from takes where ID = '${userid}' and course_id = '${courseid}' and semester = 'Spring' and year = 2024;`
    )
  ).rows[0].logic;
  if (match)
    return res.status(400).send("Registration failed - already registered");
  match = (
    await client.query(
      `select prereq_id from prereq where course_id = '${courseid}' and prereq_id not in (select course_id from takes where ID = '${userid}' and grade != 'F' and grade is not null);`
    )
  ).rows;
  const incomplete =
    match.length == 1
      ? match[0].prereq_id
      : match.map((x) => x.prereq_id).reduce((x, y) => x + ", " + y, "");
  if (match.length > 0)
    return res
      .status(400)
      .send(`Registration failed - prereq incomplete: ${incomplete}`);
  match = (
    await client.query(
      `select * from section where course_id = '${courseid}' and sec_id = '${secid}' and semester = 'Spring' and year = 2024 and registration_limit > (select count(*) from takes where course_id = '${courseid}' and sec_id = '${secid}' and semester = 'Spring' and year = 2024 and grade is NULL)`
    )
  ).rows;
  if (match.length == 0)
    return res.status(400).send(`Registration failed - limit exceeded`);

  await client.query(
    `select pg_sleep(30); insert into takes (ID, course_id, sec_id, semester, year) values ('${userid}', '${courseid}', '${secid}', 'Spring', 2024);`
  );
  return res.send(`Course registration successful`);
});

app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`)
);
