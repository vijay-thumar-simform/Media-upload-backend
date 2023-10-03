const express = require("express");
const cors = require("cors");
const fs = require("fs");
const app = express();
app.use(express.json());
app.use(cors());

const uniqueAlphaNumericId = (() => {
	const heyStack = '0123456789abcdefghijklmnopqrstuvwxyz';
	const randomInt = () => Math.floor(Math.random() * Math.floor(heyStack.length));
	
	return (length = 24) => Array.from({length}, () => heyStack[randomInt()]).join('');
})();

const getFilePath = (fileName, fileId) => `./uploads/file-${fileId}-${fileName}`;

app.post('/upload-request', (req, res) => {
	if (!req.body || !req.body.fileName) {
		res.status(400).json({message: 'Missing "fileName"'});
	} else {
		const fileId = uniqueAlphaNumericId();
		fs.createWriteStream(getFilePath(req.body.fileName, fileId), {flags: 'w'});
		res.status(200).json({fileId});
	}
});
app.post("/upload-status", (req, res) => {
  res.sendStatus(200);
});
app.post("/upload", (req, res) => {
  res.sendStatus(200);
});

app.get("/", (req, res) => {
  res.send("#it works!!");
});

app.listen(1234);
console.log("--- working on port ", 1234);
