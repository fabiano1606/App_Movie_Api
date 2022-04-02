module.exports = {
  id: null,
  playing: false,
  subtitle: '',
  magnet: '',

  play: function () {
    this.playing = true;
  },
  stop: function () {
    this.playing = false;
    this.magnet = '';
    this.subtitle = '';
  },
};
