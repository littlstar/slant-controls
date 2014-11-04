
/**
 * Module dependencies
 */

var tpl = require('./template.html')
  , dom = require('domify')
  , events = require('events')
  , emitter = require('emitter')

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

  this.frame = frame;
  this.el = dom(tpl);
  this.muted = frame.video.muted;
  this.events = events(this.el, this);
  this.events.bind('click .playpause .play', 'onplayclick');
  this.events.bind('click .playpause .pause', 'onplayclick');
  this.events.bind('click .volume .control', 'onvolumeclick');
}

// inherit from emitter
emitter(Controls.prototype);

/**
 * `onplayclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onplayclick = function (e) {
  var play = this.el.querySelector('.play');
  var paused = Boolean(this.frame.video.pause);
  e.preventDefault();

  if (true == paused) {
    play.classList.remove('pause');
  } else {
    play.classList.add('pause');
  }

  this.toggle();
};

/**
 * `onvolumeclick' event handler
 *
 * @api private
 * @param {Event} e
 */

Controls.prototype.onvolumeclick = function (e) {
  if (this.muted) {
    this.muted = false;
  } else {
    this.muted = true;
  }
};

/**
 * Plays the frame. Usually called from
 * the `onplayclick' event handler
 *
 * @api public
 */

Controls.prototype.play = function () {
  this.el.querySelector('.play').classList.add('hidden');
  this.el.querySelector('.pause').classList.remove('hidden');
  this.frame.play();
  this.emit('play');
  return this;
};

/**
 * Pausesthe frame. Usually called from
 * the `onplayclick' event handler
 *
 * @api public

 */
Controls.prototype.pause = function () {
  this.el.querySelector('.pause').classList.add('hidden');
  this.el.querySelector('.play').classList.remove('hidden');
  this.frame.pause();
  this.emit('pause');
  return this;
};

/**
 * Toggles control playback
 *
 * @api public
 */

Controls.prototype.toggle = function () {
  return this.frame.video.paused ? this.play() : this.pause();
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
  return this;
};

/**
 * Unmute video frame
 *
 * @api public
 */

Controls.prototype.unmute = function () {
  this.frame.unmute();
  return this;
};
