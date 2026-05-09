require('dotenv').config();
const express = require('express');
const app = express();
const router = require('./routes');
const DbConnect = require('./database');
// const cors = require('cors');
// const cookieParser = require('cookie-parser');


// app.use(cookieParser());
const PORT = process.env.PORT || 5500;
DbConnect();
app.use(express.json({ limit: '8mb' }));
app.use(router);


app.use(router);
app.get('/', (req, res) => {
    res.send('Hello from express Js');
});


app.listen(PORT, () => console.log(`Listening on port ${PORT}`));