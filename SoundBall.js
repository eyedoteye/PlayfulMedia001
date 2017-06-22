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

let globalFirstNote = 4 - 12 * 2;

class LinearFrequencyArea
{
  constructor(stage, canvas)
  {
    this.bbox = {
      x: 0,
      y: 0,
      width: canvas.width,
      height: canvas.height + 30
    }
  
    this.noteBottom = globalFirstNote;
    this.frequencyEnd = getNoteFrequency(440, 4 - 12);
    this.stage = stage;
    this.background = new createjs.Shape();
    this.stage.addChild(this.background);

    this.computeGraphics();
  }

  getFrequencyOfPosition(y)
  {
    let bounds = this.getBounds();

    let frequency = getFrequencyOfPositionInLinearRange(
      getNoteFrequency(440, this.noteBottom), this.frequencyEnd,
      bounds.bottom, bounds.top,
      y); 

    return frequency;
  }
  
  getPositionOfNoteFromBottom(count)
  {
    let position = this.getPositionOfFrequency(getNoteFrequency(440, this.noteBottom + count));
    return position;
  }

  getPositionOfFrequency(frequency)
  {
    let bounds = this.getBounds();

    let position = scale(
      getNoteFrequency(440, this.noteBottom), this.frequencyEnd,
      frequency,
      bounds.bottom, bounds.top);

    return position;
  }

  getBounds()
  {
    let bounds = {
      top: this.bbox.y,
      bottom: this.bbox.y + this.bbox.height,
      left: this.bbox.x,
      right: this.bbox.x + this.bbox.width
    };

    return bounds;
  }

  popBottomNote()
  {
    this.noteBottom++;
    this.computeGraphics();
  }

  popBottomNotes(count)
  {
    for(let i = 0; i < count; ++i)
      this.popBottomNote();
  }

  computeGraphics()
  {
    this.background.graphics.beginLinearGradientFill(
      ["black", "green"], [0.1,1],
      this.bbox.x, this.bbox.height,
      0, 0)
      .drawRect(
        this.bbox.x, this.bbox.y,
        this.bbox.width, this.bbox.height)
    .endFill();
  }
}

class CollapsingNoteLine
{
  constructor(stage, canvas, y)
  {
    this.y = y;
    console.log(y);
    this.state = "Hanging"
    this.background = new createjs.Shape();
    this.stage = stage;
    this.stage.addChild(this.background);
    this.computeGraphics();
    this.triggered = false;
  }

  computeGraphics()
  {
    this.background.graphics.clear();
    this.background.graphics.beginFill("rgba(255,0,0,1)")
      .drawRect(
        0, this.y,
        this.stage.canvas.width, 1)
      .endFill();
  }
}

class PianoRollArea
{
  constructor(stage, canvas)
  {
    this.noteHeight = 40;
    this.noteWidth = this.noteHeight * 2;

    this.bbox = {
      x: 0,
      y: canvas.height,
      width: canvas.width,
      height: 0
    };

    this.noteStart = globalFirstNote;
    this.noteCount = 0;

    this.stage = stage;
    this.background = new createjs.Shape();
    this.stage.addChild(this.background);
    this.computeGraphics();
  }

  getTopNote()
  {
    return this.noteStart + this.noteCount;
  }

  addTopNotes(count)
  {
    for(let i = 0; i < count; ++i)
      this.addTopNote();
  }
  
  addTopNote()
  {
    this.bbox.y -= this.noteHeight;
    this.bbox.height += this.noteHeight;
    ++this.noteCount;

    this.computeGraphics();
  }

  isPointInBounds(x, y)
  {
    let bounds = this.getBounds();
    if(x < bounds.left || x > bounds.right)
      return false;
    if(y < bounds.top || y > bounds.bottom)
      return false;

    return true;
  }

  isPointInNoteBounds(x, y, halfSteps)
  {
    let bounds = this.getBounds();
    let noteY = bounds.top + this.noteHeight / 2 + this.noteHeight * halfSteps;
    
    let noteBounds = {
      left: bounds.right - this.noteWidth,
      top: noteY - this.noteHeight / 2 + 1
    };
    noteBounds.right = bounds.right;
    noteBounds.bottom = noteBounds.top + this.noteHeight - 1;

    if(x < noteBounds.left || x > noteBounds.right)
      return false;
    if(y < noteBounds.top || y > noteBounds.bottom)
      return false;

    return true;
  }

  getNoteFrequencyOfPoint(x, y)
  {
    for(let i = 0; i < this.noteCount; ++i)
    {
      if(this.isPointInNoteBounds(x, y, i))
      {
        let frequency = getNoteFrequency(440, this.noteStart + this.noteCount - i);
        return frequency;
      }
    } 

    return 0;
  } 

  getBounds()
  {
    let bounds = {
      top: this.bbox.y,
      bottom: this.bbox.y + this.bbox.height,
      left: this.bbox.x,
      right: this.bbox.x + this.bbox.width
    };

    return bounds;
  }

  computeGraphics()
  {
    let bounds = this.getBounds();

    this.background.graphics.beginFill("black")
      .drawRect(
        this.bbox.x, this.bbox.y + this.noteHeight / 2,
        this.bbox.width, this.bbox.height)
      .endFill();
  
    for(let i = 0; i < this.noteCount; ++i)
    {
      let noteY = bounds.top + this.noteHeight / 2 + this.noteHeight * i; 

      this.background.graphics.beginFill("white")
        .drawRect(
          this.bbox.x, noteY,
          this.bbox.width, 1)
        .endFill();
      
      this.background.graphics.beginFill("white")
        .drawRect(
          bounds.right - this.noteWidth, noteY - this.noteHeight / 2 + 1,
          this.noteWidth, this.noteHeight - 1)
        .endFill();
    } 
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
  let pianoosc = new Tone.PolySynth(6, Tone.Synth, {
        "oscillator" : {
                  "partials" : [0, 2, 3, 4],
                }
      }).toMaster();

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
  wrapper.id = "canvas-wrapper";
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

  pianoRollArea = new PianoRollArea(stage, canvas);

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

    if(pianoRollArea.isPointInBounds(stage.mouseX, stage.mouseY))
    {
      let pianoTopBound = pianoRollArea.getBounds().top + pianoRollArea.noteHeight / 2; 

      if(stage.mouseY > pianoTopBound)
        stage.pullMode = "";
      
      let frequency = pianoRollArea.getNoteFrequencyOfPoint(stage.mouseX, stage.mouseY);
      if(frequency > 0)
        pianoosc.triggerAttackRelease(frequency, "8n");
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

    if(pianoRollArea.isPointInBounds(stage.mouseX, stage.mouseY)) 
    {
      let pianoTopBound = pianoRollArea.getBounds().top + pianoRollArea.noteHeight / 2; 
      if(stage.mouseY > pianoTopBound)
        stage.pullMode = "";
    }

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

      frequencyBall.limitToBounds();
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
    let bounds = linearFrequencyArea.getBounds();
    let pianoTopBound = pianoRollArea.getBounds().top + pianoRollArea.noteHeight / 2;

    if(frequencyBall.y > pianoTopBound)
    {
      frequencyBall.y = pianoTopBound;
    }
    else if(frequencyBall.y - frequencyBall.radius < bounds.top)
    {
      frequencyBall.y = frequencyBall.radius;
    }
    
    if(frequencyBall.x - frequencyBall.radius < bounds.left)
    {
      frequencyBall.x = frequencyBall.radius; 
    }
    else if(frequencyBall.x + frequencyBall.radius > bounds.right)
    {
      frequencyBall.x = bounds.right - frequencyBall.radius;
    }
  }

  frequencyBall.isOnGround = () =>
  {
    //Note: Find a better way to sync this.
    let pianoTopBound = pianoRollArea.getBounds().top + pianoRollArea.noteHeight / 2;
    return frequencyBall.y >= pianoTopBound; 
  }
     
  frequencyBall.updateRadius = () =>
  {
    let radius = scale(
      0, canvas.height - frequencyBall.minRadius,
      frequencyBall.y,
      frequencyBall.maxRadius, frequencyBall.minRadius); 
    frequencyBall.radius = radius; 
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

  let C2Frequency = getNoteFrequency(440, 4 - 12 * 2);
  let C4Frequency = getNoteFrequency(440, 4 - 12);
  let currentFrequency = 0; 

  let getFrequencyAtHeight = () => linearFrequencyArea.getFrequencyOfPosition(frequencyBall.y);

  let worthUpdating = false;
  function update(e)
  {
    if(!stage.mouseInBounds)
      stage.pullMode = "";

    worthUpdating = false;

    let dT = e.delta / 1000;
    frequencyBall.update(dT);
    if(!collapsingNoteLine.triggered)
    {
      if(frequencyBall.y < collapsingNoteLine.y)
        collapsingNoteLine.triggered = true;
    }
    else
    {
      if(frequencyBall.y > collapsingNoteLine.y)
      {
        collapsingNoteLine.y = frequencyBall.y;
        collapsingNoteLine.computeGraphics();
      }

      let pianoTopBound = pianoRollArea.bbox.y;
      let nextPianoTopBound = pianoTopBound - pianoRollArea.noteHeight / 2;
      console.log(nextPianoTopBound);
      if(collapsingNoteLine.y >= nextPianoTopBound)
      {
        collapsingNoteLine.y = nextPianoTopBound;
        frequencyBall.y = nextPianoTopBound;
        shiftAreasByNotes(1);
        collapsingNoteLine.y = 0;
        collapsingNoteLine.triggered = false;
        collapsingNoteLine.computeGraphics();
        
      }
    }


    let newCurrentFrequency = getFrequencyAtHeight();

    currentFrequency = newCurrentFrequency; 
    osc.frequency.value = newCurrentFrequency;

    if(frequencyBall.isOnGround() && stage.pullMode == "")
      osc.volume.value = -Infinity;
    else
      osc.volume.value = -20;
    
    if(worthUpdating)
      stage.update();
  }

  createjs.Ticker.setFPS(60);
  createjs.Ticker.addEventListener("tick", update);

  var shiftAreasByNotes = (count) => {
    pianoRollArea.addTopNotes(count);
    linearFrequencyArea.popBottomNotes(count);
  };
  shiftAreasByNotes(6);

  let pianoTopBound = pianoRollArea.getBounds().top;
  let topNotePosition = pianoTopBound + pianoRollArea.noteHeight / 2;
  let nextNoteFrequency = getNoteFrequency(440, pianoRollArea.getTopNote() + 1);

  let nextNotePosition = scale(
    getNoteFrequency(440, linearFrequencyArea.noteBottom), linearFrequencyArea.frequencyEnd,
    nextNoteFrequency,
    pianoTopBound, 0);

  var collapsingNoteLine = new CollapsingNoteLine(
    stage, canvas, 80 
  );

  frequencyBall.updateRadius();
  frequencyBall.setRender();
  stage.update();

}
