const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
let LocalStorage = require("node-localstorage").LocalStorage;
let localStorage = new LocalStorage("./localStorage");
const cors = require("cors");
let player = require("./model/player");
const subtitleRouter = require("./routes/subtitle");
const torrentsRouter = require("./routes/torrents");

const port = process.env.PORT || 3001;
const port2 = process.env.PORT || 3002;

const app = express();
const app2 = express();

app.set("json spaces", 2);
app.use(express.json());
app.use(cors());
app.use("/subtitle", subtitleRouter);
app.use("/torrents", torrentsRouter);

const server = http.createServer(app);
const server2 = http.createServer(app2);

// ----------------------------------------------------------------------------

const io = require("socket.io")(server2, {
  cors: {
    origin: "*",
  },
});

let interval;

io.on("connection", (socket) => {
  console.log("New player connected");
  if (interval) {
    clearInterval(interval);
  }

  interval = setInterval(() => sendDataPlayer(socket), 0);

  socket.on("playerTime", function (playerTime) {
    console.log(playerTime);

    //     let id = req.query.id,
    //       time = parseInt(req.query.time);
    //     localStorage.setItem(id, time);
  });

  socket.on("disconnect", () => {
    console.log("Player disconnected");
    clearInterval(interval);
  });
});

const sendDataPlayer = (socket) => {
  let date = new Date();
  let response = {
    id: player.id,
    playing: player.playing,
    time: date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
    subtitle: player.subtitle,
  };

  // let time = await localStorage.getItem(id);

  socket.emit("FromAPI", response);
};

// ----------------------------------------------------------------------------

const magnetUri = require("magnet-uri");
const mime = require("mime");
const pump = require("pump");
const rangeParser = require("range-parser");
const streamMeter = require("stream-meter");
const torrentStream = require("torrent-stream");

let PRELOAD_RATIO = 0.005;
let inactivityPauseTimeout = 2;
let inactivityRemoveTimeout = 3;
let keep = true;

let torrents = {};
let torrentRefs;

app.get("/", function (req, res) {
  let result = [];
  for (let infoHash in torrents) result.push(torrents[infoHash].getInfo());
  res.json(result);
});

app.post("/start", async function (req, res) {
  try {
    console.log("Magnet set");
    player.id = req.body.id;
    player.magnet = req.body.magnet;
    player.play();

    res.json("Magnet set");
  } catch (err) {
    res.json(err.message);
  }
});

app.post("/setSubtitle", async function (req, res) {
  try {
    console.log("Subtitle set");
    player.subtitle = req.body.subtitle;

    res.json("Magnet set");
  } catch (err) {
    res.json(err.message);
  }
});

app.get("/stop", async function (req, res) {
  try {
    player.stop();
    torrentRefs.removeConnection();
    res.json("Magnet remove");
  } catch (err) {
    res.json(err.message);
  }
});

app.get("/getInfo", function (req, res) {
  if (torrentRefs) {
    res.json(torrentRefs.getInfo());
  } else {
    res.json("Magnet not set");
  }
});

app.get("/video", function (req, res) {
  try {
    const torrent = addTorrent(player.magnet, req.query.download_dir || ".");

    torrentRefs = torrent;
    torrent.addConnection();

    // req.on("close", function () {
    //   torrent.removeConnection();
    // });

    // req.on("end", function () {
    //   torrent.removeConnection();
    // });

    switch (torrent.state) {
      case "downloading":
      case "finished":
        res.setHeader("Accept-Ranges", "bytes");
        res.setHeader(
          "Content-Type",
          mime.lookup.bind(mime)(torrent.mainFile.name)
        );
        res.setHeader("transferMode.dlna.org", "Streaming");
        res.setHeader(
          "contentFeatures.dlna.org",
          "DLNA.ORG_OP=01;DLNA.ORG_CI=0;DLNA.ORG_FLAGS=017000 00000000000000000000000000"
        );

        let range = req.headers.range;
        range = range && rangeParser(torrent.mainFile.length, range)[0];

        torrent.meter = streamMeter();
        torrent.meterInterval = setInterval(function () {
          if (torrent.meter.bytes > 10 * 1024 * 1024) {
            clearInterval(torrent.meterInterval);
            if (!torrent.serving) {
              torrent.serving = true;
              console.log("[scrapmagnet] " + torrent.dn + ": SERVING");
            }
          }
        }, 1000);

        if (!range) {
          res.setHeader("Content-Length", torrent.mainFile.length);
          pump(torrent.mainFile.createReadStream(), torrent.meter, res);
        } else {
          res.status(206);
          res.setHeader("Content-Length", range.end - range.start + 1);
          res.setHeader(
            "Content-Range",
            "bytes " +
              range.start +
              "-" +
              range.end +
              "/" +
              torrent.mainFile.length
          );
          pump(torrent.mainFile.createReadStream(range), torrent.meter, res);
        }

        break;
      case "failed":
        res.sendStatus(404);
        break;
      case "metadata":
        setTimeout(function () {
          res.redirect(307, req.url);
        }, 1000);
        break;
    }
  } catch (err) {
    res.json(err.message);
  }
});

function addTorrent(magnetLink, downloadDir) {
  const magnetData = magnetUri.decode(magnetLink);

  if (!(magnetData.infoHash in torrents)) {
    let torrent = {
      engine: torrentStream(magnetLink, { path: downloadDir }),
      dn: magnetData.dn,
      infoHash: magnetData.infoHash,
      state: "metadata",
      connections: 0,
      paused: false,
      pieceMap: [],
    };

    torrent.addConnection = function () {
      this.connections++;
      // console.log('[scrapmagnet] ' + this.dn + ': CONNECTION ADDED: ' + this.connections);

      if (this.mainFile && this.paused) {
        this.mainFile.select();
        this.paused = false;
        console.log("[scrapmagnet] " + this.dn + ": RESUMED");
      }

      clearTimeout(this.pauseTimeout);
      clearTimeout(this.removeTimeout);
    };

    torrent.removeConnection = function () {
      this.connections--;
      // console.log('[scrapmagnet] ' + this.dn + ': CONNECTION REMOVED: ' + this.connections);

      //if (this.connections == 0) {
      let self = this;
      this.pauseTimeout = setTimeout(function () {
        if (self.mainFile && !self.paused) {
          self.mainFile.deselect();
          self.paused = true;
          console.log("[scrapmagnet] " + self.dn + ": PAUSED");
        }
        self.removeTimeout = setTimeout(function () {
          self.destroy();
        }, inactivityRemoveTimeout * 1000);
      }, inactivityPauseTimeout * 1000);
      //}

      clearTimeout(this.servingTimeout);
    };

    torrent.getInfo = function () {
      let info = {
        dn: this.dn,
        info_hash: this.infoHash,
        state: this.state,
        paused: this.paused,
        downloaded: this.engine.swarm.downloaded,
        uploaded: this.engine.swarm.uploaded,
        download_speed: this.engine.swarm.downloadSpeed() / 1024,
        upload_speed: this.engine.swarm.uploadSpeed() / 1024,
        peers: this.engine.swarm.wires.length,
      };

      if (this.state == "downloading" || this.state == "finished") {
        info.files = [];

        let self = this;
        this.engine.files.forEach(function (file) {
          info.files.push({
            path: file.path,
            size: file.length,
            main: file.path == self.mainFile.path,
          });
        });

        info.pieces = this.engine.torrent.pieces.length;
        info.pieces_preload = Math.round(info.pieces * PRELOAD_RATIO);
        info.piece_length = this.engine.torrent.pieceLength;
        info.piece_map = Array(Math.ceil(info.pieces / 100));

        for (let i = 0; i < info.piece_map.length; i++) info.piece_map[i] = "";

        for (let i = 0; i < info.pieces; i++)
          info.piece_map[Math.floor(i / 100)] += this.pieceMap[i];

        info.video_ready = this.pieceMap[info.pieces - 1] == "*";
        for (let i = 0; i < info.pieces_preload; i++) {
          if (this.pieceMap[i] != "*") {
            info.video_ready = false;
          }
        }
      }

      return info;
    };

    torrent.engine.on("verify", function (pieceIndex) {
      torrent.pieceMap[pieceIndex] = "*";
    });

    torrent.engine.on("idle", function () {
      if (torrent.state == "downloading" && !torrent.paused) {
        torrent.state = "finished";

        console.log("[scrapmagnet] " + torrent.dn + ": FINISHED");
      }
    });

    torrent.destroy = function (callback) {
      let self = this;
      this.engine.destroy(function () {
        console.log("[scrapmagnet] " + self.dn + ": REMOVED");

        if (!keep) {
          self.engine.remove(function () {
            console.log("[scrapmagnet] " + self.dn + ": DELETED");
            delete torrents[self.infoHash];
            if (callback) callback();
          });
        } else {
          delete torrents[self.infoHash];
          if (callback) callback();
        }
      });
    };

    torrent.engine.on("ready", function () {
      torrent.state = "downloading";

      // Select main file
      torrent.engine.files.forEach(function (file) {
        if (!torrent.mainFile || torrent.mainFile.length < file.length)
          torrent.mainFile = file;
      });
      torrent.mainFile.select();
      torrent.engine.select(
        0,
        Math.round(torrent.engine.torrent.pieces.length * PRELOAD_RATIO),
        true
      );
      torrent.engine.select(
        torrent.engine.torrent.pieces.length - 1,
        torrent.engine.torrent.pieces.length - 1,
        true
      );

      // Initialize piece map
      for (let i = 0; i < torrent.engine.torrent.pieces.length; i++)
        if (!torrent.pieceMap[i]) torrent.pieceMap[i] = ".";

      clearTimeout(torrent.metadataTimeout);
      console.log("[scrapmagnet] " + torrent.dn + ": METADATA RECEIVED");
    });

    torrent.metadataTimeout = setTimeout(function () {
      torrent.state = "failed";
      console.log("[scrapmagnet] " + torrent.dn + ": METADATA FAILED");
    }, 20000);

    torrents[torrent.infoHash] = torrent;

    console.log("[scrapmagnet] " + torrent.dn + ": ADDED");
  }

  return torrents[magnetData.infoHash];
}

// ----------------------------------------------------------------------------

server.listen(port, () => console.log(`Listening on port ${port}`));
server2.listen(port2, () => console.log(`Listening on port ${port2}`));
