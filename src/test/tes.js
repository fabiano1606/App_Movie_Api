const imdbId = require("imdb-id");
const OS = require("opensubtitles-api");
(async () => {
  try {
    const language = "pob,por";
    const OpenSubtitles = new OS({
      useragent: "UserAgent",
      username: "FabianoM",
      password: "FabianoM",
      ssl: true,
    });

    OpenSubtitles.login()
      .then((res) => {})
      .catch((err) => {
        console.log(err);
      });

    let listES = await OpenSubtitles.search({
      sublanguageid: language,
      extensions: ["srt", "vtt"],
      limit: "10",
      imdbid: 'tt0487831',
      season: '1',
      episode: '1',
      gzip: false,
    }).catch((err) => {
      console.log(err);
    });

    console.log(listES);
  } catch (e) {
    console.error("Error :", e);
  }
})();
