const TorrentSearchApi = require("torrent-search-api");
const xtorrent = require("xtorrent");
const getmagnet = require("get-magnet");
const { zooqle } = require("zooqle");
const stringSimilarity = require("string-similarity");
const chalk = require("chalk");
const express = require("express");
const router = express.Router();

router.get("/getMovie", async function (req, res) {
  try {
    console.log(chalk.green.bold("Searching for torrents."));

    let nameBR = req.query.nameBR;
    let nameUS = req.query.nameUS;
    let date = req.query.date;
    let torrents = [];
    let torrentsEnd = [];

    if (!nameBR && !nameUS && !date) {
      const response = {
        message: "Nome nao enviado",
      };
      res.status(401).send(response);
    }

    let year = new Date(date).getYear() + 1900;
    let search = nameUS + " " + year;

    let Data0 = await getMovies(search);
    let Data1 = [];
    let Data2 = [];

    if (Data0.length < 5) Data1 = await getMovies(search.replace(":", ""));

    if (Data0.length < 5) Data2 = await getMovies(nameUS);

    let DataEnd = [...Data0, ...Data1, ...Data2];

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

      if (torrent.provider === "TorrentProject") {
        try {
          let info = await getmagnet.TorrentProject(torrent.desc);
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
      var similarity = stringSimilarity.compareTwoStrings(
        search,
        torrent.title.substring(0, torrent.title.length / 2)
      );

      if (similarity >= 0.2 && torrent.seeds >= 5) {
        const index = torrentsEnd.findIndex(
          (item) => item.magnet === torrent.magnet
        );
        if (index < 0) {
          torrentsEnd.push({
            title: torrent.title,
            seeds: torrent.seeds,
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

    console.log(chalk.green.bold("Searching for torrents."));

    let nameUS = "The Simpsons";
    let season = 1;
    let episode = 1;
    let torrents = [];
    let torrentsEnd = [];

    let search =
      nameUS +
      " S" +
      (season + "").padStart(2, "0") +
      "E" +
      (episode + "").padStart(2, "0");

    let id = await imdbId(nameUS);
    let dataHref;

    if (id)
      await zooqle
        .search(id)
        .then((response) => {
          let data = response.showResponse.seasons;

          const index = data.findIndex(
            (item) => item.season === "Season " + season
          );

          dataHref = data[index].episodes[episode].dataHref;
        })
        .catch(() => {});

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
        .catch(() => {});

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
      .catch((error) => {});

    let Data1 = await TorrentSearchApi.search(search, "All", 5);
    let Data2 = await TorrentSearchApi.search(search, "TV", 5);
    let Data3 = await TorrentSearchApi.search(search, "Video", 5);

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

const getMovies = async (search) => {
  TorrentSearchApi.enableProvider("1337x"); // movie = "All"
  TorrentSearchApi.enableProvider("Rarbg"); //movie = 'All'
  TorrentSearchApi.enableProvider("Eztv"); //movie = 'all'
  TorrentSearchApi.enableProvider("Limetorrents"); // movie = 'all'
  TorrentSearchApi.enableProvider("ThePirateBay"); //movie = 'All'
  TorrentSearchApi.enableProvider("Yts"); //movie = 'All'

  let Data0 = [];
  await zooqle
    .search(search)
    .then((response) => {
      let data = response.searchResponse.searchResults;
      for (let i in data) {
        if (data[i].seeders > 10)
          Data0.push({
            provider: "Zooqle",
            title: data[i].title,
            seeds: data[i].seeders,
            size: data[i].size,
            magnet: data[i].magnet,
          });
      }
    })
    .catch((error) => {
      Data0 = [];
    });

  let Data1 = await TorrentSearchApi.search(search, "All", 2);
  let Data2 = await TorrentSearchApi.search(search, "Movies", 2);
  let Data3 = await TorrentSearchApi.search(search, "Video", 2);

  return [...Data0, ...Data1, ...Data2, ...Data3];
};

module.exports = router;
