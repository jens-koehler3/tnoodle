var TimerDisplay = new Class({
	decimalPlaces: 2,//TODO need an option for times table digits!
	frequency: 0.01,
	CHAR_AR: 1/2, 
	INSPECTION: 0,
	HTML5_FULLSCREEN: true,
	initialize: function(parent, server, scrambleStuff, shortcutManager) {
		var that = this;

		this.parent = parent;
		this.server = server;
		this.scrambleStuff = scrambleStuff;

		this.config = server.configuration;

		this.timers = [];
		for(var i = 0; i < TimerDisplay.timerClasses.length; i++) {
			this.timers[i] = new TimerDisplay.timerClasses[i](this, this.config, shortcutManager);
		}
		
		this.display = new Element('div');
		this.display.id = 'time';
		this.display.inject(parent);
		this.display.setStyle('position', 'relative'); //this lets us manually center the text with js
		
		this.fullscreenBG = new Element('div', { 'class': 'fullscreenTimerBg' });
		this.fullscreenBG.hide();
		this.fullscreenBG.inject(document.body);
		
		function shownCallback() { }
		function hiddenCallback() { }
		function canHide() {
			return document.activeElement != updateFrequency && document.activeElement != inspectionSeconds;
		}
		var options = tnoodle.tnt.createOptions(shownCallback, hiddenCallback, canHide);
		var optionsDiv = options.div;
		var optionsButton = options.button;
		optionsButton.setStyles({
			position: 'absolute',
			top: 2,
			right: 5
		});
		optionsButton.inject(parent);
		
		var updateFrequency = new Element('input', {type: 'text', 'name': 'timer.frequency', size: 3});
		var frequencyChanged = function(e) {
			if(!updateFrequency.value.match(/^\d+(\.\d*)?|\.\d+$/)) {
				updateFrequency.value = "0.01";
			}
			
			if(updateFrequency.value.indexOf('.') < 0) {
				this.decimalPlaces = 0;
			} else {
				this.decimalPlaces = updateFrequency.value.length - updateFrequency.value.indexOf('.') - 1;
			}
			
			server.configuration.set('timer.frequency', updateFrequency.value);
			this.frequency = updateFrequency.value.toFloat();
		}.bind(this);
		updateFrequency.addEvent('change', frequencyChanged);
		updateFrequency.value = this.config.get('timer.frequency', "0.01");
		frequencyChanged();
		
		var frequencyDiv = new Element('div');
		frequencyDiv.adopt(updateFrequency);
		frequencyDiv.adopt(new Element('label', { 'for': 'timer.frequency', html: 'Update frequency (seconds)' }));
		optionsDiv.adopt(frequencyDiv);
		
		var inspectionDiv = new Element('div');
		var inspectionChanged = function(e) {
			var str = inspectionSeconds.value;
			if(!str.match(/^\d+$/)) {
				str = '0'; //TODO so sleepy...
				inspectionSeconds.value = str;
			}
			this.INSPECTION = str.toInt(10);
			server.configuration.set('timer.inspectionSeconds', this.INSPECTION);
		}.bind(this);
		var inspectionSeconds = document.createElement('input');
        inspectionSeconds.setAttribute('type', 'number');
        inspectionSeconds.setProperties({'type': 'number', 'name': 'timer.inspectionSeconds', 'min': "0"});
        inspectionSeconds.setStyle('width', 52);
        inspectionSeconds.setStyle('margin-left', 2);
		inspectionDiv.adopt(inspectionSeconds);
		inspectionDiv.adopt(new Element('label', { 'for': 'timer.inspectionSeconds', html: 'second WCA inspection' }));
		inspectionSeconds.addEvent('change', inspectionChanged);
		optionsDiv.adopt(inspectionDiv);
		inspectionSeconds.value = "" + this.config.get('timer.inspectionSeconds', '');
		inspectionChanged();

		optionsDiv.adopt(tnoodle.tnt.createOptionBox(server.configuration, 'timer.fullscreenWhileTiming', 'Fullscreen while timing', false));
		
		var availTimersFieldset = document.createElement('fieldset');
		var availTimersMap = {};
		this.enabledTimer = null;
		for(i = 0; i < this.timers.length; i++) {
			var timer = this.timers[i];
			var name = timer.stringy();

			var timerRadioSpan = document.createElement('div');
			var radio = document.createElement('input');
			timer.radio = radio;
			radio.name = 'availTimers';
			radio.id = name;
			radio.type = 'radio';


			if(name == this.config.get('timer.enabledTimer', null)) {
				this.enabledTimer = timer;
			} else {
				timer.setEnabled(false);
			}
			availTimersMap[name] = timer;

			var label = document.createElement('label');
			label.appendText(radio.id);
			label.setAttribute('for', radio.id);

			timerRadioSpan.appendChild(radio);
			timerRadioSpan.appendChild(label);
			if(timer.timerSpecificConfigSpan) {
				timerRadioSpan.appendChild(timer.timerSpecificConfigSpan);
			}
			availTimersFieldset.appendChild(timerRadioSpan);
			
			var timerOptions = timer.getOptions();
			for(var j = 0; j < timerOptions.length; j++) {
				var option = timerOptions[j];
				optionsDiv.adopt(option);
			}
		}
		if(!this.enabledTimer) {
			this.enabledTimer = this.timers[0];
		}
		this.enabledTimer.setEnabled(true);
		this.enabledTimer.radio.checked = true;

		var availTimersForm = document.createElement('form');
		availTimersForm.appendChild(availTimersFieldset);
		optionsDiv.adopt(availTimersForm);

		availTimersFieldset.addEvent('change', function(e) {
			for(var timerName in availTimersMap) {
				if(availTimersMap.hasOwnProperty(timerName)) {
					var newEnabledTimer = availTimersMap[timerName];
					if(newEnabledTimer.radio.checked) {
						this.enabledTimer.setEnabled(false);
						this.enabledTimer = newEnabledTimer;
						this.enabledTimer.setEnabled(true);
						this.config.set('timer.enabledTimer', this.enabledTimer.stringy());
					}
				}
			}
		}.bind(this));

		this.reset(); //this will update the display
		
		function fullscreenChanged(fullscreen) {
			if(!fullscreen) {
				// Pressing esc while in fullscreen mode will exit fullscreen mode
				// without firing a keypress. We treat this as a reset timer request,
				// even if esc isn't programmed to be the reset key. Note that this
				// behavior also applies to the fullscreen key (f11 on chrome).
				if(that.timing) {
					that.resetTimerAndScramble();
				}
			}
		}
		document.addEventListener("webkitfullscreenchange",function(e) {
			fullscreenChanged(document.webkitIsFullScreen);
		}, false);
		document.addEventListener("mozfullscreenchange",function(e) {
			fullscreenChanged(document.mozFullScreenElement !== null);
		}, false);

		this.windowFocused = true;
		document.addEvent('mousedown', function(e) {
			this.windowFocused = true;
			// We may be in the process of losing focus, this will let any
			// events in the queue drain out
			setTimeout(this.redraw.bind(this), 0);
		}.bind(this));
		document.addEvent('mouseup', function(e) {
			this.windowFocused = true;
			// We may be in the process of losing focus, this will let any
			// events in the queue drain out
			setTimeout(this.redraw.bind(this), 0);
		}.bind(this));
		window.addEvent('blur', function(e) {
			this.windowFocused = false;
			this.redraw();
		}.bind(this));
		// TODO - the page may be out of focus when it loads!
		window.addEvent('focus', function(e) {
			this.windowFocused = true;
			this.redraw();
		}.bind(this));
	},
	startInspection: function() {
		assert(!this.inspecting);

		this.inspectionStart = new Date().getTime();
		this.inspecting = true;
		this.lastTime = null;

		this.startRender();
	},
	cancelInspectionIfInspecting: function() {
		if(this.inspecting) {
			this.inspecting = false;
			this.inspectionStart = null;
		}
	},
	startTimer: function(elapsedUnits, unitsPerSecond) {
			// TODO - update tnt to support arbitrary precision!
		if(!elapsedUnits) {
			elapsedUnits = 0;
		}
		if(!this.timing) {
			// The stackmat will call startTimer repeatedly without stopping the timer.
			this.scramble = this.scrambleStuff.getScramble();
			this.importInfo = this.scrambleStuff.getImportInfo();
			this.scrambleStuff.scramble();
			this.lastTime = null;
			this.inspecting = false;
			this.timing = true;
			this.startRender();
			if(this.HTML5_FULLSCREEN && this.isFullscreenWhileTiming()) {
				// Note that we don't enable fullscreen for inspection.
				// We request full screen here rather than in redraw because
				// the call will only work if it is in response to a user action,
				// such as releasing a key.
				this.fullscreenBG.reqFullScreen();
			}
		}

		var unitsPerMillisecond = (state.unitsPerSecond * (1.0 / 1000));
		var elapsedMillis = Math.floor(elapsedUnits / unitsPerMillisecond);
		this.timerStart = new Date().getTime() - elapsedMillis;
	},
	stopTimer: function(elapsedUnits, unitsPerSecond) {
		if(!elapsedUnits) {
			this.timerStop = new Date().getTime();
		} else {
			var unitsPerMillisecond = (state.unitsPerSecond * (1.0 / 1000));
			var elapsedMillis = Math.floor(elapsedUnits / unitsPerMillisecond);
			this.timerStop = this.timerStart + elapsedMillis;
		}
		// Note that we don't assert this.timing. This is because we want to pick
		// up a new time when a stopped stackmat is plugged in.
		this.timing = false;

		var fireNewTime = function() {
			this.stopRender(); // this will cause a redraw()
			this.fireNewTime();
		}.bind(this);
		if(this.HTML5_FULLSCREEN && this.isFullscreenWhileTiming()) {
			document.cancelFullScreen();
			// Apparently the page is still resizing when we fire the new time
			// right after cancelling fullscreen. This screws up scrollling to the
			// bottom of the times table, unless we wait for a moment first.
			setTimeout(fireNewTime, 100);
		} else {
			fireNewTime();
		}
	},
	createNewTime: function() {
		var time = new tnoodle.Time(this.getTimeCentis(), this.scramble);
		var penalty = this.getPenalty();
		if(penalty) {
			time.setPenalty(penalty);
		}
		time.importInfo = this.importInfo;
		return time;
	},
	lastTime: null,
	fireNewTime: function() {
		var time = this.createNewTime();
		this.lastTime = time;
		var addTime = function() {
			this.fireEvent('newTime', [ time ]);
		}.bind(this);
		//the timer lags if we don't queue up the addition of the time like this
		setTimeout(addTime, 0);
	},
	getTimeUnits: function() {
		var end = (this.timing ? new Date().getTime() : this.timerStop);
		return end - this.timerStart;
	},
	getTimeUnitsPerSecond: function() {
		return 1000;
	},
	getInspectionElapsedSeconds: function() {
		var time = this.inspecting ? new Date().getTime() : this.timerStart;
		return ((time - this.inspectionStart)/1000).toInt();
	},
	getPenalty: function() {
		if(this.INSPECTION === 0 || this.inspectionStart === null) {
			return null;
		}
		var secondsLeft = this.INSPECTION-this.getInspectionElapsedSeconds();
		if(secondsLeft <= -2) {
			return "DNF";
		} else if(secondsLeft <= 0) {
			return "+2";
		}
		return null;
	},
	//mootools doesn't like having a toString method? wtf?!
	stringy: function() {
		if(!this.enabledTimer.isOn()) {
			return "Timer off";
		}
		if(this.enabledTimer.isArmed() && !this.inspecting) {
			// We want people to see the amount of time they will have for
			// inspection when the timer is armed, rather than a silly
			// 0:00.00.
			if(this.INSPECTION && this.enabledTimer.stringy() != 'Stackmat') {
				// We don't show the amount of inspection time if using a stackmat,
				// because inspection isn't started by the stackmat pads.
				return ""+this.INSPECTION;
			} else {
				return this.server.formatTime(0, this.decimalPlaces);
			}
		}

		if(this.inspecting) {
			var penalty = this.getPenalty();
			return penalty ? penalty : (this.INSPECTION-this.getInspectionElapsedSeconds()).toString();
		} else {
			if(this.lastTime) {
				// This little tricky bit lets the user see penalties they've applied to the
				// most recent solve.
				// Note: A time's session is set to null when deleted
				if(this.lastTime.getSession() !== null) {
					return this.lastTime.format();
				}
			}

			var units = this.getTimeUnits();
			var decimalPlaces = Math.log(this.getTimeUnitsPerSecond(), 10);
			/*<<< TODO - do something with this.frequency!
			   if(this.timing) {
				if(this.frequency === 0) {
					return "...";
				}
				centis = (this.frequency*100)*(Math.round(centis / (this.frequency*100)));
				decimalPlaces = this.decimalPlaces;
			}*/
			return this.server.formatTime(units, unitsPerSecond, decimalPlaces);
		}
	},
	timerId: null,
	fireRedraw: function() {
		this.redraw();
		setTimeout(function() {
			if(this.timerId === null) {
				// This means stopRender was called,
				// so we don't want to continue the animation.
				return;
			}
			this.timerId = requestAnimFrame(this.fireRedraw.bind(this), this.display);
		}.bind(this), this.frequency*1000);
	},
	startRender: function() {
		if(this.timerId === null) {
			this.timerId = requestAnimFrame(this.fireRedraw.bind(this), this.display);
		}
	},
	stopRender: function() {
		if(this.timerId !== null) {
			cancelRequestAnimFrame(this.timerId);
			this.timerId = null;
			this.redraw();
		}
	},
	reset: function() {
		this.timing = false;
		this.timerStart = 0;
		this.timerStop = 0;
		this.inspecting = false;
		this.inspectionStart = null;
		this.lastTime = null;
		
		this.stopRender();
	},
	isReset: function() {
		return !this.timing && this.timerStart === 0 && this.timerStop === 0;
	},
	isFocused: function() {
		// This is kinda weird, we want to avoid activating the timer 
		// if we're in a textarea or input field.
		return !tnoodle.tnt.isTextEditing() && !tnoodle.tnt.isSelecting() && !tnoodle.tnt.isGrayedOut() && this.windowFocused;
	},
	resetTimerAndScramble: function() {
		var cancelledTime = this.createNewTime();
		if(this.timing || this.inspecting) {
			// We only want to reset the timer to any previous
			// import info when we're actually resetting a running
			// timer.
			this.scrambleStuff.unscramble(cancelledTime);
		}
		this.reset();
	},
	isFullscreenWhileTiming: function() {
		return this.config.get('timer.fullscreenWhileTiming');
	},
	redraw: function() {
		var string = this.stringy();
		var colorClass = null;
		if(!this.isFocused()) {
			colorClass = 'unfocused';
		} else if(this.enabledTimer.isArmed()) {
			colorClass = 'keysDown';
		} else if(this.inspecting) {
			colorClass = 'inspecting';
		} else {
			colorClass = '';
		}

		this.display.set('html', string);
		this.display.erase('class');
		this.display.addClass(colorClass);
		this.display.setStyle('width', '');
		this.display.setStyle('height', '');
		
		var parent;
		if(this.isFullscreenWhileTiming() && this.timing) {
			parent = this.fullscreenBG;
			this.display.addClass('fullscreenTimer');
			this.fullscreenBG.show();
		} else {
			parent = this.parent;
			this.fullscreenBG.hide();
		}

		if(this.display.getParent() != parent) {
			// We inject the display as the first child of the new parent,
			// this way the options drop down doesn't get covered by the display.
			this.display.inject(parent, 'top');
		}
		
		var maxSize = parent.getSize();
		var fontSize = Math.min(maxSize.y, maxSize.x/(this.CHAR_AR*string.length));
		this.display.setStyle('font-size', fontSize);
		
		//now that we've computed its font size, we center the time vertically
		var offset = (maxSize.y - this.display.getSize().y)/2;
		this.display.setStyle('top', offset);
		this.display.setStyle('width', maxSize.x);
		this.display.setStyle('height', maxSize.y-offset); //hack hackity hack hack
	}
});
TimerDisplay.implement(new Events());


Element.implement({
	reqFullScreen: function(){
		if(this.requestFullScreen) {
			this.requestFullScreen();
		} else if(this.mozRequestFullScreen) {
			this.mozRequestFullScreen();
		} else if(this.webkitRequestFullScreen) {
			this.webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	}
});

TimerDisplay.timerClasses = [];

document.cancelFullScreen = document.cancelFullScreen || document.mozCancelFullScreen || document.webkitCancelFullScreen;
