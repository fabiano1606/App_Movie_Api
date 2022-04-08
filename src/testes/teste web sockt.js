// ----------------------------------------------------------------------------
// const port2 = process.env.PORT || 3002;
// const app2 = express();
// const server2 = http.createServer(app2);

// const io = require("socket.io")(server2, {
//   cors: {
//     origin: "*",
//   },
// });

// let interval;

// io.on("connection", (socket) => {
//   console.log("New player connected");
//   if (interval) {
//     clearInterval(interval);
//   }

//   interval = setInterval(() => sendDataPlayer(socket), 0);

//   socket.on("playerTime", function (playerTime) {
//     console.log(playerTime);
//   });

//   socket.on("disconnect", () => {
//     console.log("Player disconnected");
//     clearInterval(interval);
//   });
// });

// const sendDataPlayer = (socket) => {
//   let date = new Date();
//   let response = {
//     id: player.id,
//     playing: player.playing,
//     time: date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds(),
//     subtitle: player.subtitle,
//   };

//   socket.emit("FromAPI", response);
// };

server2.listen(port2, () => console.log(`Listening on port ${port2}`));
// ----------------------------------------------------------------------------