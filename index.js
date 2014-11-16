
/**
 * Module dependencies
 */

var tpl = require('./template.html')
  , dom = require('domify')
  , events = require('events')
  , emitter = require('emitter')
  , drag = require('drag')
  , raf = require('raf')

var int = parseInt;
var float = parseFloat;

function parseDuration (seconds) {
  var h = int(seconds / (60 * 60));
  var m = int(seconds / 60);
  var s = int((m / 60) || seconds);
  var ms = int(s * 1000);
  return {
    hours: h,
    minutes: m,
    seconds: s,
    milliseconds: ms
  };
}

function formatDuration (duration, format) {
  var h = duration.hours;
  var m = duration.minutes;
  var s = duration.seconds;
  var ms = duration.milliseconds;

  format = format || 'm:s';

  function pad (n) {
    return String(n < 10 ? '0'+n : n);
  }

  h = pad(h);
  m = pad(m);
  s = pad(s);
  ms = pad(ms);

  return format.split(':').map(function (k) {
    switch (k) {
      case 'h': return h;
      case 'm': return m;
      case 's': return s;
      case 'ms': return ms;
      default: return null;
    }
  }).filter(Boolean).join(':');
}

/**
 * `Controls' constructor
 *
 * @api public
 * @param {Frame} frame
 * @param {Object} opts
 */

module.exports = Controls
function Controls (frame, opts) {
  if (!(this instanceof Controls)) {
    return new Controls(frame, opts);
  }

  opts = opts || {};

  var self = this;

  this.frame = frame.render();
  this.el = dom(tpl);
  this.scrubbing = false;
  this.ready = false;
  this.paused = true;
  this.muted = frame.video.muted;
  this.events = events(this.el, this);
  this.events.bind('click', 'onclick');

  // play/pause handles
  this.events.bind('click .playpause .play', 'onplayclick');
  this.events.bind('click .playpause .replay', 'onplayclick');
  this.events.bind('click .playpause .pause', 'onplayclick');

  // track scrubbing
  this.events.bind('click .progress .played', 'onscrubclick');
  this.events.bind('click .progress .loaded', 'onscrubclick');

  // volume control
  this.events.bind('click .volume .control', 'onmuteclick');
  this.events.bind('mouseover .volume', 'onvolumefocus');
  this.events.bind('mouseout .volume', 'onvolumeblur');
  this.events.bind('click .volume .panel', 'onvolumeclick');

  var progress = this.el.querySelector('.progress');
  var played = progress.querySelector('.played');
  var loaded = progress.querySelector('.loaded');
  var scrub = progress.querySelector('.scrub');

  var time = this.el.querySelector('.time');
  var current = time.querySelector('.current');
  var duration = time.querySelector('.duration');

  var volume = this.el.querySelector('.volume');
  var volumeControl = volume.querySelector('.control');
  var volumePanel = volume.querySelector('.panel');
  var volumeSlider = volume.querySelector('.slider');
  var volumeHandle = volume.querySelector('.handle');
  var volumeLevel = volume.querySelector('.level');

  this.vol = drag(volumeHandle, {
    smooth: true,
    range: {x: [0, 100]},
    axis: 'x'
  });

  this.scrub = drag(scrub, {
    smooth: true,
    range: {x: [0, 100]},
    axis: 'x'
  });

  if (opts.separator) {
    time.querySelector('.separator').innerHTML = opts.separator;
  }

  this.scrub.on('dragstart', function (e) {
    self.scrubbing = true;
    self.emit('scrubstart', e);
  });

  this.scrub.on('drag', function (e) {
    self.scrubbing = true;
    self.emit('scrub', e);
  });

  this.vol.on('drag', function (e) {
    var x = self.vol.x;
    var w = float(getComputedStyle(volumeSlider, null).width);
    var p = x / w;
    var v = w * self.frame.video.volume;

    raf(function () {
      volumeLevel.style.width = v +'px';
    });

    self.frame.volume(p);

    self.emit('volume');
  });

  this.scrub.on('dragend', function (e) {
    var x = self.scrub.x;
    var w = float(getComputedStyle(scrub.parentElement, null).width);
    var d = self.frame.video.duration;
    var p = x / w;
    var s = d * p;

    self.scrubbing = false;
    self.seek(s);
    self.emit('scrubend', e);
  });

  this.frame.on('ready', function () {
    var dur = null;

    // format current time
    dur = parseDuration(self.frame.state.time);
    current.innerHTML = formatDuration(dur);

    // format total duration
    dur = parseDuration(self.frame.state.duration);
    duration.innerHTML = formatDuration(dur);

    // update volume handle range
    self.vol.range.x[1] = float(getComputedStyle(volumeSlider).width);

    update();
    self.ready = true;
    self.emit('ready');
  });

  this.frame.on('progress', function (e) {
    var x = 0;

    // update progress bar
    raf(function () {
      loaded.style.width = e.percent + '%';
    });

    // new scrub range
    x = loaded.offsetWidth;

    // update scrub range
    self.scrub.range.x[1] = x;
  });

  this.frame.on('timeupdate', function (e) {
    var replay = self.el.querySelector('.playpause .replay');

    // update played progress bar
    raf(function () {
      played.style.width = e.percent + '%';
    });

    replay.classList.add('hidden');
    update();
  });

  this.frame.on('end', function () {
    var play = self.el.querySelector('.playpause .play');
    var pause = self.el.querySelector('.playpause .pause');
    var replay = self.el.querySelector('.playpause .replay');

    play.classList.add('hidden');
    pause.classList.add('hidden');
    replay.classList.remove('hidden');

    self.paused = true;
  });

  self.frame.on('play', function () {
    self.paused = false;
  });

  self.frame.on('pause', function () {
    self.paused = true;
  });

  function update () {
    var dur = parseDuration(self.frame.state.time);
    var x = 0;

    // update current time
    current.innerHTML = formatDuration(dur);

    // get current x position for scrubber
    x = played.offsetWidth - 2; //

    if (false == self.scrubbing) {
      // update scrub position
      self.scrub.setPosition(x, 0);
    }

    var v = (
      float(getComputedStyle(volumeSlider).width) * self.frame.video.volume
    );

    raf(function () {
      self.vol.setPosition(v, 0);
      volumeLevel.style.width = v +'px';
    });
  }
}

// inherit from emitter
emitter(Controls.prototype);

/**
 * `onclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onclick = function (e) {
  e.preventDefault();
  this.scrubbing = false;
};


/**
 * `onplayclick' event handler. Handles toggling play
 * and pause buttons
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onplayclick = function (e) {
  var play = this.el.querySelector('.play');
  var replay = this.el.querySelector('.replay');
  var paused = Boolean(this.frame.video.paused);

  e.preventDefault();

  this.toggle();
  this.paused = Boolean(this.frame.video.paused);

  if (e.target == replay) {
    this.emit('replay');
  }
};

/**
 * `onmuteclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onmuteclick = function (e) {
  var el = this.el.querySelector('.volume .control');
  if (this.muted) {
    el.classList.remove('muted');
    this.muted = false;
  } else {
    el.classList.add('muted');
    this.muted = true;
  }
};

/**
 * `onvolumefocus' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onvolumefocus = function (e) {
};

/**
 * `onvolumeblur' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onvolumeblur = function (e) {
};

/**
 * `onvolumeclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onvolumeclick = function (e) {
  var panel = this.el.querySelector('.volume .panel');
  var style = getComputedStyle(panel, null);
  var x = e.offsetX;
  var w = float(style.width);
  var v = x / w;

  if (panel.querySelector('.handle') == e.target) {
    return false;
  }

  this.volume(v);
};

/**
 * `onscrubclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onscrubclick = function (e) {
  var x = e.offsetX;
  var w = float(getComputedStyle(e.target.parentElement, null).width);
  var d = this.frame.video.duration;
  var p = x / w;
  var s = d * p;

  this.scrubbing = false;
  this.seek(s);
  if (true == this.paused) {
    this.play();
  }
  this.emit('scrubend', e);
};

/**
 * Plays the frame. Usually called from
 * the `onplayclick' event handler
 *
 * @api public
 * @param {Boolean} toggle
 */

Controls.prototype.play = function (toggle) {
  this.el.querySelector('.play').classList.add('hidden');
  this.el.querySelector('.replay').classList.add('hidden');
  this.el.querySelector('.pause').classList.remove('hidden');
  if (true != toggle) {
    this.frame.play();
    this.emit('play');
  }
  return this;
};

/**
 * Pausesthe frame. Usually called from
 * the `onplayclick' event handler
 *
 * @api public
 * @param {Boolean} toggle
 */
Controls.prototype.pause = function (toggle) {
  this.el.querySelector('.pause').classList.add('hidden');
  this.el.querySelector('.play').classList.remove('hidden');
  if (true != toggle) {
    this.frame.pause();
    this.emit('pause');
  }
  return this;
};

/**
 * Toggles control playback
 *
 * @api public
 */

Controls.prototype.toggle = function (toggle) {
  return (
    this.frame.video.paused ?
    this.play(toggle) : this.pause(toggle)
  );
};

/**
 * Show frame controls
 *
 * @api public
 */

Controls.prototype.show = function () {
  this.el.style.display = 'block';
  return this;
};

/*
 * Hide frame controls
 *
 * @api public
 */

Controls.prototype.hide = function () {
  this.el.style.display = 'none';
  return this;
};

/**
 * Set volume for video frame
 *
 * @api public
 * @param {Number} vol
 */

Controls.prototype.volume = function (vol) {
  this.frame.volume(vol);
  return this;
};

/**
 * Mute video frame
 *
 * @api public
 */

Controls.prototype.mute = function () {
  this.frame.mute();
  this.emit('mute');
  return this;
};

/**
 * Unmute video frame
 *
 * @api public
 */

Controls.prototype.unmute = function () {
  this.frame.unmute();
  this.emit('unmute');
  return this;
};

/**
 * Seek frame in seconds
 *
 * @api public
 * @param {Number} seconds
 */

Controls.prototype.seek = function (seconds) {
  this.emit('beforeseek', seconds);
  this.frame.seek(seconds);
  if (false == this.paused) {
    this.play();
  }
  this.emit('seek', seconds);
  return this;
};

/**
 * Fast forward frame in seconds
 *
 * @api public
 * @param {Number} seconds
 */

Controls.prototype.forward = function (seconds) {
  this.frame.forward(seconds);
  return this;
};

/**
 * Rewind frame in seconds
 *
 * @api public
 * @param {Number} seconds
 */

Controls.prototype.rewind = function (seconds) {
  this.frame.rewind(seconds);
  return this;
};

/**
 * Installs plugin
 *
 * @api public
 * @param {Function} fn
 */

Controls.prototype.use = function (fn) {
  if (this.ready) {
    fn(this);
  } else {
    this.on('ready', function () {
      fn(this);
    });
  }
  return this;
};

/**
 * Show controls
 *
 * @api public
 */

Controls.prototype.show = function () {
  var self = this;
  raf(function () {
    self.el.classList.remove('hidden');
    self.el.classList.add('fadeIn');
    self.el.classList.remove('fadeOut');
    self.emit('show');
  });
  return this;
};

/**
 * Hide controls
 *
 * @api public
 */

Controls.prototype.hide = function () {
  var self = this;
  raf(function () {
    self.el.classList.remove('fadeIn');
    self.el.classList.add('fadeOut');

    // defer hiding visiblity for animations
    setTimeout(function () {
      self.el.classList.add('hidden');
      self.emit('hide');
    });
  });
  return this;
};
