const pause_time = 10;
const game_time = 30;

var running = false;
var start_flag = true;
var timer = 0;

const express = require("express");
const { set } = require("express/lib/application");
const Matter = require("matter-js");

const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

const frameRate = 1000 / 60;
const canvas = {width: 1000, height: 480};
const wallThickness = 20;
const ballSize = 15;
const maxBalls = 10;
var left = 0, right = 0;
const mid_x = canvas.width / 2;
const mid_y = canvas.height / 2;
const jar_width = 70;
const jar_height = 130;
const jar_x_offset = 130;
const jar_y = 390;

Matter.Common.setDecomp(require('poly-decomp'));

const triangle = Matter.Vertices.fromPath('-100 100 0 0 100 100');
const jar_left = Matter.Bodies.rectangle(mid_x - jar_width - jar_x_offset - 25, jar_y - jar_height / 2 + 30, 50, jar_height * 2, {isStatic: true});
const jar_right = Matter.Bodies.rectangle(mid_x + jar_width - jar_x_offset + 25, jar_y - jar_height / 2 + 30, 50, jar_height * 2, {isStatic: true});
const jar_bottom = Matter.Bodies.rectangle(mid_x - jar_x_offset, jar_y + jar_height / 2, jar_width * 2, 100, {isStatic: true});
const jar_bottom_left = Matter.Bodies.fromVertices(
  mid_x - jar_x_offset - jar_width + 20, jar_y + 60,
  Matter.Vertices.fromPath('0 0 40 10 40 100 0 100'),
  {isStatic: true} 
);
const jar_bottom_right = Matter.Bodies.fromVertices(
  mid_x - jar_x_offset + jar_width - 20, jar_y + 60,
  Matter.Vertices.fromPath('0 10 40 0 40 100 0 100'),
  {isStatic: true}
);
const jar_left_red = Matter.Bodies.rectangle(mid_x - jar_width + jar_x_offset - 25, jar_y - jar_height / 2 + 30, 50, jar_height * 2, {isStatic: true});
const jar_right_red = Matter.Bodies.rectangle(mid_x + jar_width + jar_x_offset + 25, jar_y - jar_height / 2 + 30, 50, jar_height * 2, {isStatic: true});
const jar_bottom_red = Matter.Bodies.rectangle(mid_x + jar_x_offset, jar_y + jar_height / 2, jar_width * 2, 100, {isStatic: true});
const jar_bottom_left_red = Matter.Bodies.fromVertices(
  mid_x + jar_x_offset - jar_width + 20, jar_y + 60,
  Matter.Vertices.fromPath('0 0 40 10 40 100 0 100'),
  {isStatic: true} 
);
const jar_bottom_right_red = Matter.Bodies.fromVertices(
  mid_x + jar_x_offset + jar_width - 20, jar_y + 60,
  Matter.Vertices.fromPath('0 10 40 0 40 100 0 100'),
  {isStatic: true}
);

const entities = {
  balls: [],
  jar_red: [
    jar_left,
    jar_bottom_left,
    jar_bottom,
    jar_bottom_right,
    jar_right,
  ],
  jar_blue: [
    jar_left_red,
    jar_bottom_left_red,
    jar_bottom_red,
    jar_bottom_right_red,
    jar_right_red,
  ],
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

setInterval(() => {
  timer += 1;
}, 1000);

function spawn_ball() {
    if (!running) {
      setTimeout(reset, game_time * 1000);
      running = true;
      timer = 0;
    }
    current_ball = Matter.Bodies.circle(canvas.width / 2 + (Math.random() * 5 - 2.5), 50, ballSize);
    entities.balls.push(current_ball);
    Matter.Composite.add(engine.world, current_ball);
}

function game_update() {
    if (current_ball == null) return;
    if (current_ball.position.y > 250) {
        if (current_ball.position.x < 400) left += 1;
        else right += 1;
        spawn_ball();
    }
}

function reset() {
    engine = Matter.Engine.create();
    entities.balls = [];
    left = 0;
    right = 0;
    Matter.Composite.add(engine.world, Object.values(entities).flat());
    running = false;
    timer = 0;
    setTimeout(spawn_ball, pause_time * 1000);
}

setInterval(() => {
  Matter.Engine.update(engine, frameRate);
  let time = (running ? game_time - timer : pause_time - timer);
  let b = [];
  for (let i = 0; i < entities.balls.length; i++) {
    b.push(serializeCircle(entities.balls[i]));
  }
  io.emit("update state", {
    balls: b,
    jars: {
      red: entities.jar_red.map(toVertices),
      blue: entities.jar_blue.map(toVertices)
    }, 
    walls: entities.walls.map(toVertices),
    score: { left, right },
    running: running,
    time: time
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
