const async = require("async");
const magnetUri = require("magnet-uri");
const torrentStream = require("torrent-stream");
const express = require("express");
const router = express.Router();
var fs = require("fs");
const pretty = require("prettysize");

const http = require("http");
let PRELOAD_RATIO = 0.005;

const torrents = {};

router.get("/", function (req, res) {
  var result = [];
  http
    .get(
      "http://127.0.0.1:32400/library/sections/4/refresh?X-Plex-Token=qRD3_GXzHRJz4s2cvDPG",
      (resp) => {
        console.log("atualizando");
      }
    )
    .on("error", (err) => {
      console.log("Error: " + err.message);
    });
  for (var infoHash in torrents) result.push(torrents[infoHash].getInfo());
  res.json(result);
});

router.get("/shutdown", function (req, res) {
  shutdown();
});

router.post("/add", function (req, res) {
  // req.body.subtitlesList.forEach(function (file) {
  //   download(file.url, "F:Movies");
  // });

  var torrent = addTorrent(
    req.body.torrent.magnet,
    req.body.download_dir || "F:/Movies/",
    req.body.movie
  );
});

function addTorrent(magnetLink, downloadDir, movie) {
  const magnetData = magnetUri.decode(magnetLink);

  let year = new Date(movie.release_date).getYear() + 1900;
  let dir = downloadDir + movie.title + " " + year;

  //Verifica se não existe
  if (!fs.existsSync(dir)) {
    //Efetua a criação do diretório
    fs.mkdirSync(dir);
  }

  // { path: downloadDir }
  if (!(magnetData.infoHash in torrents)) {
    let torrent = {
      engine: torrentStream(magnetLink),
      dn: magnetData.dn,
      infoHash: magnetData.infoHash,
      state: "metadata",
      connections: 0,
      paused: false,
      pieceMap: [],
    };

    torrent.getInfo = function () {
      var info = {
        dn: this.dn,
        info_hash: this.infoHash,
        state: this.state,
        paused: this.paused,
        downloaded: pretty(this.engine.swarm.downloaded),
        uploaded: pretty(this.engine.swarm.uploaded),
        download_speed: this.engine.swarm.downloadSpeed() / 1024,
        upload_speed: this.engine.swarm.uploadSpeed() / 1024,
        peers: this.engine.swarm.wires.length,
      };

      if (this.state == "downloading" || this.state == "finished") {
        info.files = [];

        var self = this;
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

        for (var i = 0; i < info.piece_map.length; i++) info.piece_map[i] = "";

        for (var i = 0; i < info.pieces; i++)
          info.piece_map[Math.floor(i / 100)] += this.pieceMap[i];

        info.video_ready = this.pieceMap[info.pieces - 1] == "*";
        for (var i = 0; i < info.pieces_preload; i++) {
          if (this.pieceMap[i] != "*") {
            info.video_ready = false;
          }
        }
      }
      console.clear();
      console.log(info.piece_map);
      return info;
    };

    torrent.destroy = function (callback) {
      var self = this;
      this.engine.destroy(function () {
        console.log("[scrapmagnet] " + self.dn + ": REMOVED");
        if (true) {
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

    torrent.engine.on("verify", function (pieceIndex) {
      torrent.pieceMap[pieceIndex] = "*";
    });

    torrent.engine.on("idle", function () {
      if (torrent.state == "downloading" && !torrent.paused) {
        torrent.state = "finished";

        console.log("[scrapmagnet] " + torrent.dn + ": FINISHED");
      }
    });

    torrent.engine.on("ready", function () {
      torrent.state = "downloading";

      // Select main file
      torrent.engine.files.forEach(function (file) {
        if (!torrent.mainFile || torrent.mainFile.length < file.length)
          torrent.mainFile = file;
      });

      var writeStream = fs.createWriteStream(dir + "/" + torrent.mainFile.name);

      torrent.mainFile.select();
      // torrent.engine.select(
      //   0,
      //   Math.round(torrent.engine.torrent.pieces.length * PRELOAD_RATIO),
      //   true
      // );
      // torrent.engine.select(
      //   torrent.engine.torrent.pieces.length - 1,
      //   torrent.engine.torrent.pieces.length - 1,
      //   true
      // );

      var stream = torrent.mainFile.createReadStream();
      stream.pipe(writeStream);

      // Initialize piece map
      for (var i = 0; i < torrent.engine.torrent.pieces.length; i++)
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

function shutdown() {
  async.forEachOf(
    torrents,
    function (value, key, callback) {
      value.destroy(callback);
    },
    function () {
      console.log("[scrapmagnet] Stopping");
      process.exit();
    }
  );
}

module.exports = router;
