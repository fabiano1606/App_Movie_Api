const OS = require("opensubtitles-api");
const express = require("express");
const chalk = require("chalk");
const imdbId = require("imdb-id");
const router = express.Router();
const stringSimilarity = require("string-similarity");

router.get("/subtitle", async function (req, res) {
  try {
    const language = "pob,por";
    const OpenSubtitles = new OS({
      useragent: "UserAgent",
      username: "FabianoM",
      password: "FabianoM",
      ssl: true,
    });

    let nameBR = req.query.nameBR;
    let nameUS = req.query.nameUS;
    let date = req.query.date;
    let subtitles = [];
    let lista = [];

    if (!nameBR && !nameUS && !date) {
      const response = {
        message: "Nome nao enviado",
      };
      res.status(401).send(response);
    }

    console.log(chalk.green.bold("Searching for subtitles."));

    let year = new Date(date).getYear() + 1900;
    let searchUS = `${nameUS} ${year}`;
    let searchBR = `${nameBR} ${year}`;
    let id = await imdbId(nameUS);

    OpenSubtitles.login()
      .then((res) => {
        // console.log(res.token);
        // console.log(res.userinfo);
      })
      .catch((err) => {
        console.log(err);
      });

    let listES = await OpenSubtitles.search({
      sublanguageid: language,
      extensions: ["srt", "vtt"],
      limit: "10",
      query: searchUS,
      gzip: false,
    }).catch((err) => {
      console.log(err);
    });

    let listBR = await OpenSubtitles.search({
      sublanguageid: language,
      extensions: ["srt", "vtt"],
      limit: "10",
      query: searchBR,
      gzip: false,
    }).catch((err) => {
      console.log(err);
    });

    let listID = await OpenSubtitles.search({
      sublanguageid: language,
      extensions: ["srt", "vtt"],
      limit: "10",
      imdbid: id,
      gzip: false,
    }).catch((err) => {
      console.log(err);
    });

    for (const i in listES) {
      lista.push(listES[i]);
    }

    for (const i in listBR) {
      lista.push(listBR[i]);
    }

    for (const i in listID) {
      lista.push(listID[i]);
    }

    lista.forEach(function (valor) {
      valor.forEach(function (sub) {
        const index = subtitles.findIndex((item) => item.id === sub.id);
        var similarity = stringSimilarity.compareTwoStrings(
          searchUS,
          sub.filename
        );

        if (index < 0 && similarity >= 0.2) {
          subtitles.push({
            id: sub.id,
            filename: sub.filename,
            downloads: sub.downloads,
            language: "pob",
            url: sub.vtt,
            label: sub.langcode,
            score: sub.score,
          });
        }
      });
    });

    subtitles.sort(function (a, b) {
      return a.downloads > b.downloads ? -1 : a.downloads < b.downloads ? 1 : 0;
    });

    const response = {
      subtitles: subtitles,
    };

    res.status(201).send(response);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

module.exports = router;
