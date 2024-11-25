const express = require("express");
const bodyParser = require("body-parser");
const pg = require("pg");
const path = require("path");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
const port = 13000;

const client = new pg.Client({
  host: "127.0.0.1",
  port: 11000,
  database: "univ",
  user: "postgres",
  password: "postgres",
});
client.connect();

const id_map = {
  student: "stud_id",
  instructor: "ins_id",
  admin: "admin_id",
};

app.get("/", async (_, res) => {
  const x = await client.query("select * from student;");
  console.log(x.rows);
  return res.json(x.rows);
});

app.get("/login.html", (_, res) => {
  return res.sendFile(path.join(__dirname, "login.html"));
});

app.post("/logincheck", async (req, res) => {
  const { role, userid, password } = req.body;
  const db_role = id_map[role];
  const x = await client.query(
    `SELECT (password_hash = crypt('${password}', password_hash)) AS pwmatch FROM loginuser where ${db_role} = '${userid}' ;`
  );
  const match = Boolean(x.rows[0]?.pwmatch);

  if (match) {
    return res.send(`login success as ${role}`);
  } else {
    return res.send(`login failure as ${role}`);
  }
});

app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`)
);
