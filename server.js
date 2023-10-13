const express = require("express");
const cors = require("cors");
const fs = require("fs");
const { promisify } = require("util");
const Busboy = require("busboy");
const path = require("path");

const app = express();
const getFileDetails = promisify(fs.stat);

app.use(express.json());
app.use(cors());

const DirAvailCheck = () => {
  // directory availability check
  const folderName = "uploads";
  if (!fs.existsSync(folderName)) {
    fs.mkdirSync(folderName);
    console.log(`${folderName} folder created.`);
  } else {
    console.log(`${folderName} folder already exists.`);
  }
};

DirAvailCheck();
// express.statics("./uploads");
const uniqueAlphaNumericId = (() => {
  const heyStack = "0123456789abcdefghijklmnopqrstuvwxyz";
  const randomInt = () =>
    Math.floor(Math.random() * Math.floor(heyStack.length));

  return (length = 24) =>
    Array.from({ length }, () => heyStack[randomInt()]).join("");
})();

const getFilePath = (fileName, fileId) =>
  `./uploads/file-${fileId}-${fileName}`;

app.get("/files", (req, res) => {
  fs.readdir("./uploads", (err, files) => {
    if (err) {
      return res.status(500).z({ error: "Unable to read files" });
    }
    return res.json({ files });
  });
});

app.get("/download", (req, res) => {
  console.log({
    req: req,
    resQuery: req.query,
    reqFileName: req.query.fileName,
  });
  if (!req.query && !req.query.fileName) {
    return res
      .status(400)
      .json({ fileName: "File name does not exist in query" });
  }
  const filename = req.query.fileName;
  const filePath = path.join("./uploads", filename);

  res.download(filePath, filename, (err) => {
    if (err) {
      res.status(404).json({ error: "File not found" });
    }
  });
});

app.post("/upload-request", (req, res) => {
  DirAvailCheck();
  if (!req.body || !req.body.fileName) {
    res.status(400).json({ message: 'Missing "fileName"' });
  } else {
    const fileId = uniqueAlphaNumericId();
    fs.createWriteStream(getFilePath(req.body.fileName, fileId), {
      flags: "w",
    });
    res.status(200).json({ fileId });
  }
});

app.get("/upload-status", (req, res) => {
  if (req.query && req.query.fileName && req.query.fileId) {
    getFileDetails(getFilePath(req.query.fileName, req.query.fileId))
      .then((stats) => {
        console.log("*** ---> file details from local uploaded: ", stats);
        res.status(200).json({ totalChunkUploaded: stats.size });
      })
      .catch((err) => {
        console.error("failed to read file", err);
        res.status(400).json({
          message: "No file with such credentials",
          credentials: req.query,
        });
      });
  }
});

app.post("/upload", (req, res) => {
  const contentRange = req.headers["content-range"];
  const fileId = req.headers["x-file-id"];
  //console.log("fileId from x-file-id", fileId);
  if (!contentRange) {
    console.log("Missing Content-Range");
    return res.status(400).json({ message: 'Missing "Content-Range" header' });
  }

  if (!fileId) {
    console.log("Missing File Id");
    return res.status(400).json({ message: 'Missing "X-File-Id" header' });
  }

  const match = contentRange.match(/bytes=(\d+)-(\d+)\/(\d+)/);
  console.log("content rage form header: ", contentRange);
  console.log("content range taken array: ", match);
  if (!match) {
    console.log("Invalid Content-Range Format");
    return res.status(400).json({ message: 'Invalid "Content-Range" Format' });
  }
  const rangeStart = Number(match[1]); // 0
  const rangeEnd = Number(match[2]); // 12
  const fileSize = Number(match[3]); // 12

  if (rangeStart >= fileSize || rangeStart >= rangeEnd || rangeEnd > fileSize) {
    return res
      .status(400)
      .json({ message: 'Invalid "Content-Range" provided' });
  }

  const busboy = Busboy({ headers: req.headers });

  busboy.on("error", (e) => {
    console.log("failed upload", e);
    res.sendStatus(500);
  });

  busboy.on("finish", () => {
    res.sendStatus(200);
  });

  busboy.on("file", (_, file, fileName) => {
    //console.log("****----**** File Name: ", fileName);
    const filePath = getFilePath(fileName.filename, fileId);
    //console.log("This is my file path", filePath);
    getFileDetails(filePath)
      .then((stats) => {
        if (stats.size !== rangeStart) {
          return res.status(400).json({ message: 'Bad "chunk" provided' });
        }

        file
          .pipe(fs.createWriteStream(filePath, { flags: "a" }))
          .on("error", (e) => {
            console.error("failed upload", e);
            res.sendStatus(500);
          });
      })
      .catch((err) => {
        console.log("Fail to read file", err);
        return res.status(400).json({
          message: "no file with provided credentials",
          credentials: {
            fileId,
            fileName,
          },
        });
      });
  });

  req.pipe(busboy);
});

app.get("/", (req, res) => {
  res.send("#it works!!");
});

app.listen(1234);
console.log("--- working on port ", 1234);
