function distance(x1, y1, x2, y2)
{
  var xDiff = x2 - x1;
  var yDiff = y2 - y1;
  return Math.sqrt(xDiff * xDiff + yDiff * yDiff);
}

function scale(minInput, maxInput, curInput, minOutput, maxOutput)
{
  var t = curInput != 0 ? (curInput - minInput)/(maxInput - minInput) : 0;
  t = t < 0 ? 0 : t;
  t = t > 1 ? 1 : t;
  t = t * (maxOutput - minOutput) + minOutput;
  return t;
}

function getFrequencyOfPositionInLinearRange(
  frequencyStart, frequencyEnd,
  rangeStartingPosition, rangeEndingPosition, 
  position)
{
  let frequencyPosition = scale(rangeStartingPosition, rangeEndingPosition, position, frequencyStart, frequencyEnd);
  return frequencyPosition;
}

let _twelfthRootOfTwo = Math.pow(2, 1/12);
function getNoteFrequency(A4Frequency, halfStepsFromA4)
{
  // Formula info: http://www.phy.mtu.edu/~suits/NoteFreqCalcs.html
  let noteFrequency = A4Frequency * Math.pow(_twelfthRootOfTwo, halfStepsFromA4);
  return noteFrequency;
}

function getHalfStepsFromFrequency(A4Frequency, frequency)
{
  if(frequency === 0)
    return 0;

  let halfStepsFromFrequency = Math.log(frequency / A4Frequency) / Math.log(_twelfthRootOfTwo);

  return halfStepsFromFrequency;
}

class LinearFrequencyArea
{
  constructor(stage, canvas)
  {
    this.y = 0;
    this.frequencyStart = 0;
    this.frequencyEnd = 2;
    this.stage = stage;
    this.background = new createjs.Shape();
    this.stage.addChild(this.background);

    this.background.graphics.beginLinearGradientFill(
      ["black", "green"], [0.1,1],
      0, canvas.height,
      0, 0)
      .drawRect(
        0, 0,
        canvas.width, canvas.height)
    .endFill();
  }
}

class Note
{
  constructor(noteAsString, halfStepsFromA4)
  {
    this.noteString = noteString;
    this.frequency = getNoteFrequency(halfStepsFromA4); 
  }

  getPosition()
  {
  }
}

function getViewDimensions()
{
  let dimensions = {
    width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
    height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
  }
  return dimensions;
}

function init()
{
  let osc = new Tone.Oscillator(0, "sine").toMaster().start();
  osc.volume.value = -15;

  let canvas = document.createElement("canvas");
  canvas.width = 360;
  canvas.height = 640;
  resizeCanvas = () =>
  {
    let viewDimensions = getViewDimensions();
    canvas.style.height = String(viewDimensions.height) + 'px';
    canvas.style.width = String(viewDimensions.height / canvas.height * canvas.width) + 'px';
  };
  window.addEventListener("resize", () =>
  {
    resizeCanvas();
  });
  resizeCanvas();
  let wrapper = document.createElement("div");
  wrapper.id = "canvas-wrapper"
  wrapper.appendChild(canvas);
  document.body.appendChild(wrapper);

  let stage = new createjs.Stage(canvas);
  stage.height = 640;
  createjs.Touch.enable(stage, true, true);

  linearFrequencyArea = new LinearFrequencyArea(stage, canvas);

  var frequencyBall = new createjs.Shape();
  frequencyBall.gripOffset = {
    xDir: 0,
    yDir: 0,
    radialRatio: 0
  };
  frequencyBall.minRadius = 30;
  frequencyBall.maxRadius = 80;
  frequencyBall.x = canvas.width / 2;
  frequencyBall.y = frequencyBall.maxRadius + 30;
  frequencyBall.xVelocity = 0;
  frequencyBall.yVelocity = 0;
  stage.addChild(frequencyBall);

  let mouseDelta = {
    x: 0,
    y: 0,
    _xPrev: 0,
    _yPrev: 0,
    _reset: true
  };

  stage.on("stagemousedown", function() {
    let localMouseCoords = frequencyBall.globalToLocal(stage.mouseX, stage.mouseY);
    if(frequencyBall.hitTest(localMouseCoords.x, localMouseCoords.y))
    {
      stage.pullMode = "frequencyBall";

      let distance = Math.sqrt(localMouseCoords.x * localMouseCoords.x + localMouseCoords.y * localMouseCoords.y);

      frequencyBall.gripOffset = {
        xDir: -localMouseCoords.x / distance,
        yDir: -localMouseCoords.y / distance,
        radialRatio: distance/frequencyBall.radius
      } 
    }
  });

  let mouseMoving = false;
  let mouseIdleTimer = 0;
  stage.on("stagemousemove", function(e) {
    if(mouseDelta._reset)
    {
      mouseDelta.x = 0;
      mouseDelta.y = 0;
    }
    else
    {
      mouseDelta.x = e.stageX - mouseDelta._xPrev;
      mouseDelta.y = e.stageY - mouseDelta._yPrev;
    }

    mouseDelta._xPrev = e.stageX;
    mouseDelta._yPrev = e.stageY;

    mouseDelta._reset = false;

    // Removes stylus quivering noise.
    if(Math.sqrt(mouseDelta.x * mouseDelta.x + mouseDelta.y * mouseDelta.y) > .05)
      mouseIdleTimer = 0;

    if(stage.pullMode == "frequencyBall")
    {
      frequencyBall.yVelocity = 0;

      let x = stage.mouseX - frequencyBall.x;
      let y = stage.mouseY - frequencyBall.y;
      let distance = Math.sqrt(x * x + y * y);

      if(distance == 0)
      {
        distance = .001;
      }

      let forceToMouse = {
        xDir: x / distance,
        yDir: y / distance,
        force: distance
      }

      frequencyBall.x += forceToMouse.xDir * forceToMouse.force;
      frequencyBall.y += forceToMouse.yDir * forceToMouse.force;

      let gripOffset = frequencyBall.gripOffset;
      if(distance < frequencyBall.minRadius * 1.2 || distance < frequencyBall.radius * .8) // grip tighten threshold
      {

        let modifier = .1; // Tighten grip to center at  X% the rate of mouse movement.

        let currentRadialOffset = gripOffset.radialRatio * frequencyBall.radius;
        
        let mouseDeltaDistance = Math.sqrt(mouseDelta.x * mouseDelta.x + mouseDelta.y * mouseDelta.y);
        gripOffset.radialRatio = (currentRadialOffset - mouseDeltaDistance * modifier) / frequencyBall.radius;

        if(gripOffset.radialRatio < 0)
          gripOffset.radialRatio = 0;
        frequencyBall.gripOffset = gripOffset;
      }              

      frequencyBall.x += gripOffset.xDir * gripOffset.radialRatio * frequencyBall.radius;
      frequencyBall.y += gripOffset.yDir * gripOffset.radialRatio * frequencyBall.radius;

      frequencyBall.updateRadius();
      frequencyBall.limitToBounds();
      frequencyBall.updateRadius();
      frequencyBall.setRender();
    }

    stage.update();
  });

  stage.on("stagemouseup", function(e) {
    mouseDelta._reset = true;
    stage.pullMode = "";
  });

  frequencyBall.limitToBounds = () =>
  {
    if(frequencyBall.y > canvas.height - frequencyBall.minRadius)
    {
      frequencyBall.y = canvas.height - frequencyBall.minRadius;
    }
    else if(frequencyBall.y - frequencyBall.radius < 0)
    {
      frequencyBall.y = frequencyBall.radius;
    }
    
    if(frequencyBall.x - frequencyBall.radius < 0)
    {
      frequencyBall.x = frequencyBall.radius; 
    }
    else if(frequencyBall.x + frequencyBall.radius > canvas.width)
    {
      frequencyBall.x = canvas.width - frequencyBall.radius;
    }
  }
     
  frequencyBall.updateRadius = () =>
  {
    let radius = scale(
      0, canvas.height - frequencyBall.minRadius,
      frequencyBall.y,
      frequencyBall.maxRadius, frequencyBall.minRadius); 
    frequencyBall.radius = radius; 
    console.log(canvas.height - frequencyBall.minRadius, frequencyBall.y, radius);
  };

  frequencyBall.setRender = () =>
  {
    frequencyBall.graphics.clear();
    frequencyBall.graphics.beginFill("Green").drawCircle(0, 0, frequencyBall.radius);
  };

  frequencyBall.gripIsLost = () =>
  {
    let localMouseCoords = frequencyBall.globalToLocal(stage.mouseX, stage.mouseY);

    return !frequencyBall.hitTest(localMouseCoords.x, localMouseCoords.y);
  }; 

  frequencyBall.updateGripOffset = () =>
  {
    let localMouseCoords = frequencyBall.globalToLocal(stage.mouseX, stage.mouseY);
    let distance = Math.sqrt(localMouseCoords.x * localMouseCoords.x + localMouseCoords.y * localMouseCoords.y);

    frequencyBall.gripOffset = {
      xDir: -localMouseCoords.x / distance,
      yDir: -localMouseCoords.y / distance,
      radialRatio: distance/frequencyBall.radius
    } 
  }

  frequencyBall.isOnGround = () =>
  {
    return frequencyBall.y >= canvas.height - frequencyBall.minRadius; 
  }

  frequencyBall.update = (dT) =>
  {
    if(mouseIdleTimer > 0 && stage.pullMode == "frequencyBall")
    {
      if(frequencyBall.gripIsLost())
      {
        stage.pullMode = "";
        frequencyBall.gripOffset = {
          xDir: 0,
          yDir: 0,
          radialRatio: 0
        };
      }
      else if(frequencyBall.radius > 55 || frequencyBall.slippingAway) // Heaviness Threshold
      {
        frequencyBall.slippingAway = true;
        let gripOffset = frequencyBall.gripOffset;

        frequencyBall.x -= gripOffset.xDir * gripOffset.radialRatio * frequencyBall.radius;
        frequencyBall.y -= gripOffset.yDir * gripOffset.radialRatio * frequencyBall.radius;

        gripOffset.xDir *= gripOffset.radialRatio * frequencyBall.radius;
        gripOffset.yDir *= gripOffset.radialRatio * frequencyBall.radius; 

        gripOffset.yDir += 10 * dT; 

        let distance = Math.sqrt(gripOffset.xDir * gripOffset.xDir + gripOffset.yDir * gripOffset.yDir); 
        gripOffset.xDir /= distance;
        gripOffset.yDir /= distance;
        gripOffset.radialRatio = distance / frequencyBall.radius;

        frequencyBall.x += gripOffset.xDir * gripOffset.radialRatio * frequencyBall.radius;
        frequencyBall.y += gripOffset.yDir * gripOffset.radialRatio * frequencyBall.radius;

        frequencyBall.updateRadius();
        frequencyBall.limitToBounds();
        frequencyBall.setRender();
        frequencyBall.updateGripOffset();

        gripOffset = frequencyBall.gripOffset;
        if(gripOffset.radialRatio * frequencyBall.radius < 24) //Same as in stagemousemove
          frequencyBall.slippingAway = false;

        worthUpdating = true;
      }
    }

    if(stage.pullMode == "" && !frequencyBall.isOnGround()) // Distinct because the last piece of code can switch states.
    {

      let oldY = frequencyBall.y;

      frequencyBall.yVelocity += 20 * dT;
      frequencyBall.y += frequencyBall.yVelocity;

      frequencyBall.updateRadius();
      frequencyBall.limitToBounds();
      frequencyBall.setRender();

      if(oldY != frequencyBall.y)
        worthUpdating = true;
    }

    mouseIdleTimer += dT;
  };

  frequencyBall.updateRadius();
  frequencyBall.setRender();
  stage.update();


  let C2Frequency = getNoteFrequency(440, 4 - 12 * 2);
  let C4Frequency = getNoteFrequency(440, 4 - 12);
  console.log(C2Frequency);
  console.log(C4Frequency);
  let currentFrequency = 0; 

  let getFrequencyAtHeight = () => getFrequencyOfPositionInLinearRange(
    C2Frequency, C4Frequency,
    canvas.height, -canvas.height,
    frequencyBall.y);

  let worthUpdating = false;
  function update(e)
  {
    if(!stage.mouseInBounds)
      stage.pullMode = "";

    worthUpdating = false;

    let dT = e.delta / 1000;
    frequencyBall.update(dT);

    let newCurrentFrequency = getFrequencyAtHeight();
    if(newCurrentFrequency != currentFrequency)
     console.log(newCurrentFrequency);

    currentFrequency = newCurrentFrequency; 
    osc.frequency.value = newCurrentFrequency;

    if(frequencyBall.isOnGround())
      osc.volume.value = -Infinity;
    else
      osc.volume.value = -20;
    
    if(worthUpdating)
      stage.update();
  }

//  createjs.Ticker.useRAF = true;
  createjs.Ticker.setFPS(60);
  createjs.Ticker.addEventListener("tick", update);

//     for(let i = 0; i < 12 * 8; i++)
//     {
//       constantFrequencyNote = createNote(i, freqMax, canvas.width);
//       constantNotewidthNote = createNoteWithConstantWidth(i, freqMax, noteWidth);
//
//       noteRight = scale(0, 1, t, constantFrequencyNote.position, constantNotewidthNote.right);
//
//       background.graphics.beginStroke("white")
//                            .moveTo(noteRight, 0).lineTo(noteRight, canvas.height)
//                            .endStroke();
//     }
//   };
//
//   circle.on("pressmove", function(e) {
//     e.target.x = e.stageX;
//     e.target.y = e.stageY;
//     osc.frequency.value = getFrequencyFromPositionAndT(frequencyModeToggle.t, e.stageX, halfNoteStart, noteWidth);
//     text.text = getFrequencyFromPositionAndT(frequencyModeToggle.t, circle.x, halfNoteStart, noteWidth);
//     // osc.volume.value = scale(0, canvas.height, e.stageY, 0, -40);
//   });
//   
//   stage.mouseMoveOutside = true;
//   stage.on("stagemousemove", function(e) {
//     var localMouseCoords = circle.globalToLocal(e.rawX, e.rawY);
//     circle.alpha = scale(0, canvas.width * .85, distance(0,0,localMouseCoords.x, localMouseCoords.y), 1, 0);
//   });
//
//   function update(e)
//   { 
//     stage.update();
//   }
//   
//   var halfNoteStart = 12 * 0;
//   setBackground(background, frequencyModeToggle.t);
//   setFrequencyMode(frequencyModeToggle.t);
//
//   createjs.Ticker.setFPS(60);
//   createjs.Ticker.addEventListener("tick", update);
}
