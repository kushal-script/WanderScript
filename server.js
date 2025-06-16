const express = require('express');
const app = express();
const port = 5000;
const connection = require('mysql2');
const path = require('path');
// const {v4: uuidv4} = require('uuid');
const methodOverride = require('method-override');

const db = connection.createConnection({
    host: 'localhost',
    user: 'root', 
    password: 'kushal@RVU', 
    database: 'wanderScriptDB'
});

db.connect((err) => {
    if (err) {
        console.error("DB Connection Error:", err);
    } else {
        console.log("Connected to MySQL (justPostDB)");
    }
});

app.use(express.urlencoded({ extended: true }));

app.use(methodOverride('_method'));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));
app.use(express.static(path.join(__dirname, 'public')));



app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
}
);