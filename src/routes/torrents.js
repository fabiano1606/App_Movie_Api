const TorrentSearchApi = require("torrent-search-api");
const xtorrent = require("xtorrent");
const getmagnet = require("get-magnet");
const { zooqle } = require("zooqle");
const stringSimilarity = require("string-similarity");
const imdbId = require("imdb-id");
const chalk = require("chalk");
const express = require("express");
const router = express.Router();

router.get("/getMovie", async function (req, res) {
  try {
    console.log(chalk.green.bold("Searching for torrents Movie."));

    let movie = req.query.movie;
    let date = req.query.date;
    let torrents = [];
    let torrentsEnd = [];

    // const providers = TorrentSearchApi.getProviders();
    // console.log(providers);
    // Get active providers

    let year = new Date(date).getYear() + 1900;
    let search = movie + " " + year;

    TorrentSearchApi.enableProvider("1337x"); // movie = "All"  "Movies"
    TorrentSearchApi.enableProvider("Rarbg"); //movie = 'All' 'Movies'
    TorrentSearchApi.enableProvider("Eztv"); //movie = 'All'
    TorrentSearchApi.enableProvider("Limetorrents"); // movie = 'All'  'Movies'
    TorrentSearchApi.enableProvider("ThePirateBay"); //movie = 'All'  'Video'
    TorrentSearchApi.enableProvider("Yts"); //movie = 'All'
    TorrentSearchApi.enableProvider("KickassTorrents"); //movie = 'All'  'Movies'
    TorrentSearchApi.enableProvider("Torrent9"); //movie = 'All'  'Movies'

    let Data0 = [];
    let Data1 = [];

    // const activeProviders = TorrentSearchApi.getActiveProviders();
    // console.log(activeProviders);

    // let Data0 = [];
    // await zooqle
    //   .search(search)
    //   .then((response) => {
    //     let data = response.searchResponse.searchResults;
    //     for (let i in data) {
    //       if (data[i].seeders > 10)
    //         Data0.push({
    //           provider: "Zooqle",
    //           title: data[i].title,
    //           seeds: data[i].seeders,
    //           size: data[i].size,
    //           magnet: data[i].magnet,
    //         });
    //     }
    //   })
    //   .catch((error) => {
    //     Data0 = [];
    //   });

    Data0 = await TorrentSearchApi.search(
      [
        "1337x",
        "Eztv",
        "Rarbg",
        "Limetorrents",
        "ThePirateBay",
        "KickassTorrents",
        "Yts",
        "Torrent9",
      ],
      search,
      "All",
      15
    );

    if (Data0.length < 10) {
      Data1 = await TorrentSearchApi.search(
        [
          "1337x",
          "Eztv",
          "Rarbg",
          "Limetorrents",
          "ThePirateBay",
          "KickassTorrents",
          "Yts",
          "Torrent9",
        ],
        search.replace(":", ""),
        "All",
        5
      );
    }

    let DataEnd = [...Data0, ...Data1];

    for (let i in DataEnd) {
      let torrent = DataEnd[i];

      if (torrent.provider === "Zooqle") {
        try {
          torrents.push({
            title: info.title,
            seeds: info.seeders,
            size: info.size,
            magnet: info.download.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "1337x") {
        try {
          let info = await xtorrent.info(torrent.desc);
          torrents.push({
            title: info.title,
            seeds: info.seeders,
            size: info.size,
            magnet: info.download.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "Torrent9") {
        try {
          let info = await getmagnet.get(torrent.desc);
          torrents.push({
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "Limetorrents") {
        try {
          let info = await getmagnet.get(torrent.desc);
          torrents.push({
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "Rarbg") {
        torrents.push({
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "Yts") {
        try {
          let info = await getmagnet.get(torrent.desc);
          torrents.push({
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "ThePirateBay") {
        torrents.push({
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "KickassTorrents") {
        torrents.push({
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "Eztv") {
        torrents.push({
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }
    }

    torrents.forEach((torrent, index) => {
      let title = torrent.title;
      if (title.length > 30) title = title.substring(0, title.length / 2);

      let similarity = stringSimilarity.compareTwoStrings(search, title);

      if (similarity >= 0.25 && parseFloat(torrent.seeds) >= 5) {
        let index = torrentsEnd.findIndex(
          (item) => item.magnet === torrent.magnet
        );
        if (index < 0) {
          torrentsEnd.push({
            title: torrent.title,
            seeds: parseFloat(torrent.seeds),
            size: torrent.size,
            magnet: torrent.magnet,
          });
        }
      }
    });

    torrentsEnd.sort(function (a, b) {
      return a.seeds > b.seeds ? -1 : a.seeds < b.seeds ? 1 : 0;
    });

    const response = {
      torrents: torrentsEnd,
    };

    res.header("Access-Control-Allow-Origin", "*");
    res.status(201).send(response);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

router.get("/getTV", async function (req, res) {
  try {
    TorrentSearchApi.enableProvider("1337x"); // movie = "All"
    TorrentSearchApi.enableProvider("Rarbg"); //movie = 'All'
    TorrentSearchApi.enableProvider("Eztv"); //movie = 'all'
    TorrentSearchApi.enableProvider("Limetorrents"); // movie = 'all'
    TorrentSearchApi.enableProvider("ThePirateBay"); //movie = 'All'
    TorrentSearchApi.enableProvider("Yts"); //movie = 'All'

    console.log(chalk.green.bold("Searching for torrents Serial."));

    let serial = req.query.serial;
    let Seasom = req.query.Seasom;
    let Episode = req.query.Episode;

    let torrents = [];
    let torrentsEnd = [];

    let search =
      serial +
      " S" +
      (Seasom + "").padStart(2, "0") +
      "E" +
      (Episode + "").padStart(2, "0");

    let id = await imdbId(serial);
    let dataHref;

    if (id)
      await zooqle
        .search(id)
        .then((response) => {
          let data = response.showResponse.seasons;

          const index = data.findIndex(
            (item) => item.season === "Season " + Seasom
          );

          dataHref = data[index].episodes[Episode].dataHref;
        })
        .catch(() => {
          console.log("erro zooqle");
        });

    if (dataHref)
      await zooqle
        .getData(dataHref)
        .then((data) => {
          for (let i in data) {
            torrents.push({
              provider: "Zooqle",
              title: data[i].title,
              seeds: data[i].seeders,
              size: data[i].size,
              magnet: data[i].magnet,
            });
          }
        })
        .catch(() => {
          console.log("erro zooqle");
        });

    await zooqle
      .search(search)
      .then((response) => {
        let data = response.searchResponse.searchResults;
        for (let i in data) {
          torrents.push({
            provider: "Zooqle",
            title: data[i].title,
            seeds: data[i].seeders,
            size: data[i].size,
            magnet: data[i].magnet,
          });
        }
      })
      .catch((error) => {
        console.log("erro zooqle");
      });

    let Data1 = await TorrentSearchApi.search(search, "All", 10);
    let Data2 = await TorrentSearchApi.search(search, "TV", 10);
    let Data3 = await TorrentSearchApi.search(search, "Video", 10);

    let Data4 = [...Data1, ...Data2, ...Data3];

    for (let i in Data4) {
      let torrent = Data4[i];

      if (torrent.provider === "ThePirateBay") {
        try {
          torrents.push({
            provider: torrent.provider,
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: torrent.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "1337x") {
        try {
          let info = await xtorrent.info(torrent.desc);
          torrents.push({
            provider: torrent.provider,
            title: info.title,
            seeds: info.seeders,
            size: info.size,
            magnet: info.download.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "Limetorrents") {
        try {
          let info = await getmagnet.get(torrent.desc);
          torrents.push({
            provider: torrent.provider,
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "Rarbg") {
        torrents.push({
          provider: torrent.provider,
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "Yts") {
        try {
          let info = await getmagnet.get(torrent.desc);
          torrents.push({
            provider: torrent.provider,
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "TorrentProject") {
        try {
          let info = await getmagnet.TorrentProject(torrent.desc);
          torrents.push({
            provider: torrent.provider,
            title: torrent.title,
            seeds: torrent.seeds,
            size: torrent.size,
            magnet: info.magnet,
          });
        } catch {}
      }

      if (torrent.provider === "ThePirateBay") {
        torrents.push({
          provider: torrent.provider,
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "KickassTorrents") {
        torrents.push({
          provider: torrent.provider,
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }

      if (torrent.provider === "Eztv") {
        torrents.push({
          provider: torrent.provider,
          title: torrent.title,
          seeds: torrent.seeds,
          size: torrent.size,
          magnet: torrent.magnet,
        });
      }
    }

    torrents.forEach((torrent, index) => {
      var similarity = stringSimilarity.compareTwoStrings(
        search,
        torrent.title.substring(0, torrent.title.length / 1.5)
      );

      if (similarity >= 0.3 && torrent.seeds >= 4) {
        const index = torrentsEnd.findIndex(
          (item) => item.title === torrent.title && item.limk === torrent.limk
        );
        if (index < 0) {
          torrentsEnd.push(torrent);
        }
      }
    });

    torrentsEnd.sort(function (a, b) {
      return a.seeds > b.seeds ? -1 : a.seeds < b.seeds ? 1 : 0;
    });

    const response = {
      torrents: torrentsEnd,
    };

    res.header("Access-Control-Allow-Origin", "*");
    res.status(201).send(response);
  } catch (Erro) {
    const response = {
      message: Erro,
    };
    res.status(500).send(response);
  }
});

module.exports = router;
