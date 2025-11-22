const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

// ⬇️ Se Expo ti ha creato "web-build", cambia "dist" in "web-build"
const publicDir = path.join(__dirname, "dist");

app.use(express.static(publicDir));

// Per SPA: qualsiasi route torna index.html
// ⚠️ Con Express 5 usiamo una REGEX invece di "*"
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(publicDir, "index.html"));
});

app.listen(port, () => {
    console.log("Server in ascolto sulla porta " + port);
});
