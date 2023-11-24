'use strict';

var TICK_MS = 10;
var ONE_MINUTE_MS = 60000;
var ONE_SECOND_MS = 1000;
var FPS = 0;

var secondsBeforeReset = document.getElementById("seconds-before-reset");
var delayInput = document.getElementById("delay");
var targetFrameInput = document.getElementById("target-frame");
var timeRemaining = document.getElementById("time-remaining");
var estimatedTime = document.getElementById("estimated-time");
var frameHitInput = document.getElementById("frame-hit");
var startButton = document.getElementById("start-button");
var consoleTypeDropdown = document.getElementById('console-type');
var countdownCheckbox = document.getElementById('countdown-checkbox');
var soundTypeDropdown = document.getElementById('sound-type-dropdown');
var numSoundsInput = document.getElementById('num-sounds-input');
var soundsIntervalInput = document.getElementById('sounds-interval-input');

var audios = {
  tick: new Audio('tick.wav'),
  beep: new Audio('beep.wav'),
  pop: new Audio('pop.wav'),
  ding: new Audio('ding.wav')
};

function zeroPadNum (num, length) {
  var str = num + '';
  return str.length >= length ? str : ('0'.repeat(length) + str).slice(-length);
}

function getFormattedTime (ms) {
  return zeroPadNum(Math.floor(ms / 1000), 2) + ':' + zeroPadNum(Math.floor(ms % 1000 / TICK_MS), 2);
}

var noop = function () {};

class Timer {
  constructor (opts) {
    this.onStart = opts.onStart || noop;
    this.onStop = opts.onStop || noop;
    this.onChange = opts.onChange || noop;
    this._totalTime = opts.totalTime || null;
    this._intervalTimer = null;
    this._timeRemaining = this._totalTime;
  }
  isActive () {
    return this._intervalTimer !== null;
  }
  toggle () {
    if (this.isActive()) {
      this.stop();
    } else {
      this.start();
    }
  }
  start () {
    if (!this.isActive()) {
      this._stopPoint = Date.now() + this._totalTime;
      this._audioTimers = [];
      if (countdownCheckbox.checked) {
        for (var i = 0; i < numSoundsInput.value; i++) {
          this._audioTimers.push(setTimeout(function () {
            audios[soundTypeDropdown.value].play();
          }, this._totalTime - i * soundsIntervalInput.value));
        }
      }
      this._intervalTimer = setInterval(this._tick.bind(this), TICK_MS);
      this._stopTimer = setTimeout(this.stop.bind(this), this._totalTime);
      this.onStart();
      this.onChange();
    }
  }
  stop () {
    if (this.isActive()) {
      this._audioTimers.forEach(clearTimeout);
      this._audioTimers = [];
      clearInterval(this._intervalTimer);
      clearTimeout(this._stopTimer);
      this._intervalTimer = null;
      this._timeRemaining = this._totalTime;
      this.onStop();
      this.onChange();
    }
  }
  getTimeRemaining () {
    return this._timeRemaining;
  }
  getTotalTime () {
    return this._totalTime;
  }
  setTotalTime (ms) {
    this._totalTime = ms;
    if (!this.isActive()) {
      this._timeRemaining = ms;
    }
    this.onChange();
  }
  _tick () {
    if (this._intervalTimer) {
      this._timeRemaining = this._stopPoint - Date.now();
      this.onChange();
    }
  }
}


var beforeResetTimer = new Timer({
  onStart () {
    startButton.innerHTML = 'Stop';
  },
  onStop () {
    beforeTargetTimer.start();
  },
  onChange () {
    if (!beforeTargetTimer.isActive()) {
      timeRemaining.innerHTML = getFormattedTime(this.getTimeRemaining());
      if (!this.isActive()) {
        estimatedTime.innerHTML = estimatedTimeVal;
      }
    }
  },
  totalTime: msToTarget
});

var beforeTargetTimer = new Timer({
  onStart () {
    timeRemaining.innerHTML = getFormattedTime(this.getTotalTime());
  },
  onStop () {
    startButton.innerHTML = 'Start';
    estimatedTime.innerHTML = estimatedTimeVal;
    timeRemaining.innerHTML = getFormattedTime(beforeResetTimer.getTotalTime());
  },
  onChange () {
    if (this.isActive()) {
      timeRemaining.innerHTML = getFormattedTime(this.getTimeRemaining());
    }
  },
  totalTime: msToTarget
});


// eslint-disable-next-line
function toggleTimers () {
  if (beforeResetTimer.isActive() || beforeTargetTimer.isActive()) {
    beforeResetTimer.stop();
    beforeTargetTimer.stop();
  } else {
    beforeResetTimer.start();
  }
}

function calcMsToTarget () {
  var delay = +delayInput.value;
  var targetFrame = +targetFrameInput.value;
  var msToTarget = delay + targetFrame / FPS * ONE_SECOND_MS;
  return msToTarget;
}

// eslint-disable-next-line
function updateTimes () {
  var msToTarget = calcMsToTarget();
  beforeResetTimer.setTotalTime(+secondsBeforeReset.value * ONE_SECOND_MS);
  beforeTargetTimer.setTotalTime(msToTarget);
  estimatedTimeVal = Math.floor((secondsBeforeReset.value * ONE_SECOND_MS + msToTarget) / ONE_MINUTE_MS);
  console.log("secondsBeforeReset: ", secondsBeforeReset.value)
  console.log("msToTarget: ", msToTarget)
  console.log("estimatedTimeVal: ", estimatedTimeVal)
  if (!beforeResetTimer.isActive() && !beforeTargetTimer.isActive()) {
    estimatedTime.innerHTML = estimatedTimeVal;
  }
}

// eslint-disable-next-line
function calibrateDelay () {
  var targetFrame = +targetFrameInput.value;
  var frameHit = +frameHitInput.value;
  var delay = +delayInput.value;

  if (Number.isFinite(targetFrame) && Number.isFinite(frameHit) && frameHit != 0 && Number.isFinite(delay)) {
    delayInput.value = Math.floor(delay + ((targetFrame - frameHit) / FPS) / 2 * ONE_SECOND_MS);
    console.log(Math.floor(delay + ((targetFrame - frameHit) / FPS) / 2 * ONE_SECOND_MS));
    console.log("frameHit: ", frameHit);
  }
  updateTimes();
}

// eslint-disable-next-line
function updateCountdownOptions () {
  var isDisabled = !countdownCheckbox.checked;
  soundTypeDropdown.disabled = isDisabled;
  numSoundsInput.disabled = isDisabled;
  soundsIntervalInput.disabled = isDisabled;
}

function updateFPS () {
  FPS = +consoleTypeDropdown.value;
  updateTimes()
}

updateFPS()
updateTimes()
beforeResetTimer.onChange();
var msToTarget = calcMsToTarget();
var estimatedTimeVal = Math.floor((secondsBeforeReset.value * ONE_SECOND_MS + msToTarget) / ONE_MINUTE_MS);
estimatedTime.innerHTML = estimatedTimeVal;
