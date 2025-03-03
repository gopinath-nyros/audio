const express = require('express');
const { audiolink } = require('./audio.js');  // This works with CommonJS

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

app.post('/download', audiolink);

app.get('/', (req, res) => {
    res.send('Hello World!');
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
