var TICK_MS = 2;
var ONE_SECOND_MS = 1000;

// one timer
var one_timer = document.getElementById('one-timer');
var t1_secondsBeforeReset = document.getElementById("one-timer-seconds-before-reset");
var t1_delayInput = document.getElementById("one-timer-delay");
var t1_targetFrameInput = document.getElementById("one-timer-target-frame");
var t1_timeRemaining = document.getElementById("one-timer-time-remaining");
var t1_estimatedTime = document.getElementById("one-timer-estimated-time");
var t1_frameHitInput = document.getElementById("one-timer-frame-hit");
var t1_startButton = document.getElementById("one-timer-start-button");

// two timer
var two_timers = document.getElementById('two-timers');
var t2_secondsBeforeReset = document.getElementById("two-timers-seconds-before-reset");
var t2_delayInput1 = document.getElementById("two-timers-delay-1");
var t2_targetFrameInput1 = document.getElementById("two-timers-target-1-frame");
var t2_delayInput2 = document.getElementById("two-timers-delay-2" );
var t2_targetFrameInput2 = document.getElementById("two-timers-target-2-frame");
var t2_timeRemaining = document.getElementById("two-timers-time-remaining");
var t2_estimatedTime = document.getElementById("two-timers-estimated-time");
var t2_frameHitInput1 = document.getElementById("two-timers-frame-hit-1");
var t2_frameHitInput2 = document.getElementById("two-timers-frame-hit-2");
var t2_startButton = document.getElementById("two-timers-start-button");

var consoleTypeDropdown = document.getElementById("console-type");
var countdownCheckbox = document.getElementById("countdown-checkbox");
var flashCheckbox = document.getElementById("flash-checkbox");
var flash;
var soundTypeDropdown = document.getElementById("sound-type-dropdown");
var numSoundsInput = document.getElementById("num-sounds-input");
var soundsIntervalInput = document.getElementById("sounds-interval-input");

var audios = {
  tick: new Howl({src: ['tick.wav']}),
  beep: new Howl({src: ['beep.wav']}),
  pop: new Howl({src: ['pop.wav']}),
  ding: new Howl({src: ['ding.wav']})
};

function zeroPadNum(num, length){
  var str = num + '';
  return str.length >= length ? str : ('0'.repeat(length) + str).slice(-length);
}

function getFormattedTime(ms){
  return zeroPadNum(Math.floor(ms / ONE_SECOND_MS), 1) + ':' + zeroPadNum(Math.floor(ms % ONE_SECOND_MS), 3);
}

var noop = function(){};

class Timer {
  constructor(opts){
    this.onStart = opts.onStart || noop;
    this.onStop = opts.onStop || noop;
    this.onChange = opts.onChange || noop;
    this._totalTime = opts.totalTime || null;
    this._intervalTimer = null;
    this._timeRemaining = this._totalTime;
  }

  isActive(){
    return this._intervalTimer !== null;
  }

  toggle(){
    if(this.isActive()){
      this.stop();
    } else {
      this.start();
    }
  }

  start(){
    if(!this.isActive()){
      this._stopPoint = performance.now() + this._totalTime;
      this._audioTimers = [];
      if(countdownCheckbox.checked){
        this._audioTimers = [];
        for(var i = 0; i < Number(numSoundsInput.value); i++){
          if(i * soundsIntervalInput.value < this._totalTime){
            this._audioTimers.push(i * soundsIntervalInput.value);
          }
        }
      }
      this._intervalTimer = setInterval(this._tick.bind(this), TICK_MS);
      this._stopTimer = setTimeout(this.stop.bind(this), this._totalTime);
      this.onStart();
      this.onChange();
    }
  }

  stop(){
    if(this.isActive()){
      this._audioTimers = [];
      clearInterval(this._intervalTimer);
      clearTimeout(this._stopTimer);
      this._intervalTimer = null;
      this._timeRemaining = this._totalTime;
      this.onStop();
      this.onChange();
    }
  }

  getTimeRemaining(){
    return this._timeRemaining;
  }

  getTotalTime(){
    return this._totalTime;
  }

  setTotalTime(ms){
    this._totalTime = ms;
    if(!this.isActive()){
      this._timeRemaining = ms;
    }
    this.onChange();
  }

  _tick(){
    if(this._intervalTimer){
      this._timeRemaining = this._stopPoint - performance.now();
      if(Math.floor(this._timeRemaining/8) <= Math.floor(this._audioTimers[this._audioTimers.length-1]/8)){
        audios[soundTypeDropdown.value].play();
        this._audioTimers.pop();
      }
      this.onChange();
    }
  }
}

// Timer process should be:
// 1. Typing in fields updates the timers
// 2. Start button starts the first timer
// 3. The timer causes the prescribed count of beeps at the specified interval before ending
// 4. When the timer ends, it should start the next timer
// 5. When there are no more timers, it should stop counting down

class TimerChain {
  name;
  // Element references
  startButton;
  timeRemaining;
  estimatedTime;

  waitElement;
  delayElements;
  targetElements;
  currentTimer;

  timers = new Array();
  constructor(opts){
    this.name = opts.name;
    this.mainElement = opts.mainElement;
    this.startButton = opts.startButton;
    this.timeRemaining = opts.timeRemaining;
    this.estimatedTime = opts.estimatedTime;
    this.waitElement = opts.waitElement;
    this.delayElements = opts.delayElements;
    this.targetElements = opts.targetElements;
    this.frameHitElements = opts.frameHitElements;
    console.assert(opts.delayElements.length == opts.targetElements.length && opts.targetElements.length == opts.frameHitElements.length, "You must provide the same amount of delays as timers and frame hit elements");
    this.currentTimer = 0;

    this.addTimer(Number(opts.waitElement.value) * ONE_SECOND_MS);

    for(var i = 0; i < opts.targetElements.length; i++){
      this.addTimer(calcMsToTarget(Number(this.delayElements[i].value), Number(this.targetElements[i].value)));
    }
  }
  isActive(){
    // TODO: Audit for correctness. Unsure whether this gives correct answers all the time (check whether correct between timers).
    if(this.currentTimer < this.timers.length && this.timers[this.currentTimer] != undefined){
      return this.timers[this.currentTimer].isActive();
    } else {
      return false;
    }
  }

  toggle(){
    if(this.isActive()){
      this.stop();
    } else {
      this.start();
    }
  }

  start(){
    this.timers[this.currentTimer].start();
    this.onStart();
  }

  stop(){
    for(var i = 0; i<this.timers.length; i++){
      this.timers[i].stop();
    }
    this.onStop();
  }

  next(){
    this.timers[this.currentTimer].stop();
    this.currentTimer += 1;
    if(this.currentTimer < this.timers.length){
      this.timers[this.currentTimer].start();
    } else{
    this.stop();
    }
  }

  onStart(){
    this.startButton.innerHTML = 'Stop';
  }

  onChange(){
    // We shouldn't show the "wait" time if the timer isn't active. It'll be better to show the first timer value.
    var timeRemainingVal;
    if(!this.timers[this.currentTimer].isActive()){
      timeRemainingVal = this.timers[1].getTimeRemaining();
    } else{
      timeRemainingVal = this.timers[this.currentTimer].getTimeRemaining();
    }
    this.timeRemaining.innerHTML = getFormattedTime(timeRemainingVal);
    if(flash && Math.floor(timeRemainingVal/ONE_SECOND_MS*2) % 2 == 0 && timeRemainingVal / ONE_SECOND_MS < 20){
      this.mainElement.setAttribute("class", "alert");
    } else {
      this.mainElement.setAttribute("class", "");
    }
    if(this.isActive()){
      this.timeRemaining.innerHTML = getFormattedTime(timeRemainingVal);
    }
  }

  onStop(){
    for(var i = 0; i<this.timers.length; i++){
      this.timers[i].stop();
    }
    this.currentTimer = 0;
    this.startButton.innerHTML = 'Start';
    if(this.timers[this.currentTimer].isActive()){
      this.next();
    }
  }

  updateTime(index, time) {
    this.timers[index].setTotalTime(time);
  }

  updateTimes() {
    this.updateTime(0, Number(this.waitElement.value) * ONE_SECOND_MS);
    for(var i = 0; i<this.timers.length-1; i++){
      this.updateTime(i+1, calcMsToTarget(Number(this.delayElements[i].value), Number(this.targetElements[i].value)));
    }
  }

  calibrateDelays() {
    for(let i = 0; i < this.frameHitElements.length; i++){
      if(this.frameHitElements[i].value == ""){continue;}

      let delay = Number(this.delayElements[i].value);
      let target = Number(this.targetElements[i].value);
      let hit = Number(this.frameHitElements[i].value);
      let FPS = Number(consoleTypeDropdown.value)

      this.delayElements[i].value = delay + Math.floor(ONE_SECOND_MS*(target-hit)/FPS);
      this.frameHitElements[i].value = "";
    }
    this.updateTimes()
  }

  oldUpdateTimes(times) {
    if (times.length >= this.timers.length) {
      for(var i = 0; i< this.timers.length; i++){
        this.timers[i].setTotalTime(times[i]);
      }
    }
  }

  addTimer(time) {
    this.timers.push(new Timer({
      startButton: this.startButton,
      next: this.next.bind(this),
      onStart: this.onStart.bind(this),
      onStop: this.next.bind(this),
      onChange: this.onChange.bind(this),
      totalTime: time
    }));
  }

}

function calcMsToTarget(delay, target) {
  return delay + (target / Number(consoleTypeDropdown.value)) * ONE_SECOND_MS;
}

function updateCountdownOptions(){
  var isDisabled = !countdownCheckbox.checked;
  flash = flashCheckbox.checked;

  soundTypeDropdown.disabled = isDisabled;
  numSoundsInput.disabled = isDisabled;
  soundsIntervalInput.disabled = isDisabled;
}

var oneTimer = new TimerChain({
  name: "Timer 1",
  mainElement: one_timer,
  startButton: t1_startButton,
  timeRemaining: t1_timeRemaining,
  estimatedTime: t1_estimatedTime,

  waitElement: t1_secondsBeforeReset,
  delayElements: [t1_delayInput],
  targetElements: [t1_targetFrameInput],
  frameHitElements: [t1_frameHitInput]
});

var twoTimers = new TimerChain({
  name: "Timer 2",
  mainElement: two_timers,
  startButton: t2_startButton,
  timeRemaining: t2_timeRemaining,
  estimatedTime: t2_estimatedTime,

  waitElement: t2_secondsBeforeReset,
  delayElements: [t2_delayInput1, t2_delayInput2],
  targetElements: [t2_targetFrameInput1, t2_targetFrameInput2],
  frameHitElements: [t2_frameHitInput1, t2_frameHitInput2]
});

updateCountdownOptions();
oneTimer.onChange();
twoTimers.onChange();
