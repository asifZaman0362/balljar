const express = require("express");
const Matter = require("matter-js");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

const frameRate = 1000 / 30;
const canvas = {width: 800, height: 480};
const wallThickness = 20;
const ballSize = 15;
const maxBalls = 15;
var left = 0, right = 0;

const triangle = Matter.Vertices.fromPath('-100 100 0 0 100 100');

const entities = {
  balls: [],
  walls: [
    Matter.Bodies.fromVertices(canvas.width / 2, 200, triangle, {isStatic: true}),
    Matter.Bodies.rectangle(
      canvas.width / 2, 0, 
      canvas.width, 
      wallThickness, 
      {isStatic: true}
    ),
    Matter.Bodies.rectangle(
      0, canvas.height / 2, 
      wallThickness, 
      canvas.height, 
      {isStatic: true}
    ),
    Matter.Bodies.rectangle(
      canvas.width, 
      canvas.width / 2, 
      wallThickness, 
      canvas.width, 
      {isStatic: true}
    ),
    Matter.Bodies.rectangle(
      canvas.width / 2, 
      canvas.height, 
      canvas.width, 
      wallThickness, 
      {isStatic: true}
    ),
  ]
};

var engine = Matter.Engine.create();
Matter.Composite.add(engine.world, Object.values(entities).flat());
const toVertices = e => e.vertices.map(({x, y}) => ({x, y}));
const serializeCircle = e => {
  return {
    x: e.position.x,
    y: e.position.y,
    angle: e.angle,
    radius: ballSize
  }
}

var current_ball = null;

spawn_ball();

function spawn_ball() {
    current_ball = Matter.Bodies.circle(canvas.width / 2 + (Math.random() * 10 - 5), 50, ballSize);
    entities.balls.push(current_ball);
    Matter.Composite.add(engine.world, current_ball);
}

function game_update() {
    if (current_ball == null) return;
    if (current_ball.position.y > 250) {
        if (current_ball.position.x < 400) left += 1;
        else right += 1;
        spawn_ball();
        console.log('left: ' + left + '\nright: ' + right);
    }
}

function reset() {
    engine = Matter.Engine.create();
    entities.balls = [];
    Matter.Composite.add(engine, Object.values(entities).flat());
}

setInterval(() => {
  Matter.Engine.update(engine, frameRate);
  let b = [];
  for (let i = 0; i < entities.balls.length; i++) {
    b.push(serializeCircle(entities.balls[i]));
  }
  io.emit("update state", {
    balls: b,
    walls: entities.walls.map(toVertices),
    score: { left, right }
  });
  game_update();
}, frameRate);

setInterval(() => {
    reset, 30000
})

io.on("connection", socket => {
  socket.on("register", cb => cb({canvas}));
});


server.listen(3000, () =>
  console.log("server listening on " + 3000)
);
