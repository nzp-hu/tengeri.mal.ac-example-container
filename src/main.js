/* 
    Quick & dirty JS for the mal.ac overlords.
 */

const TimeFormatter = function(inSeconds) {
    let dayDuration = 60 * 60 * 24
    let hourDuration = 60 * 60

    let days = Math.floor(inSeconds / dayDuration)
    let hours = Math.floor((inSeconds % dayDuration) / hourDuration)
    let minutes = Math.floor((inSeconds % hourDuration) / 60)
    let seconds = inSeconds % 60

    let zeroPad = (n) => `${n < 10 ? '0' : ''}${n}`

    let dayDisplay = `${days ? days + 'd ' : ''}`
    let hourDisplay = `${dayDisplay}${hours ? zeroPad(hours) + ':' : dayDisplay ? '00:' : ''}`

    return `${hourDisplay}${zeroPad(minutes)}:${zeroPad(seconds)}`
}

const playAudioAtEnd = function() {
    let node = document.querySelector('#timerendinput')
    if (!node.files || !node.files.length) return;

    let file = node.files[0]
    let blob = window.URL.createObjectURL(file)

    let player = new window.Audio()
    player.src = blob
    player.play()
}

const decode = function(value) {
    try {
        return decodeURIComponent(value)
    } catch (e) {
        // A stray % cannot be decoded; use the value as it arrived
        return value
    }
}

const setHeader = function() {
    let existingH1 = document.querySelector('h1')
    let h1 = (existingH1) ? existingH1 : document.createElement('h1')
    h1.innerText = decode(location.hash.slice(1))

    document.body.classList.add('txt')
    if (!existingH1) document.querySelector('#txt').prepend(h1)
}

const toast = function(msg) {
    let toastEl = document.createElement('div')
    toastEl.className = 'toast'
    toastEl.innerText = msg
    document.body.appendChild(toastEl)
    setTimeout(() => toastEl.remove(), 2000)
}

/*
    One timer at a time. The display is derived from an anchor instead of being
    counted second by second, so a paused timer and a throttled background tab
    both keep the right value:
      - mode 'countdown': anchor is the moment the timer reaches 0
      - mode 'countup':   anchor is the moment the timer started
 */
let timer = null
let timerInterval = null

const secondsOf = function(t) {
    if (t.paused) return t.frozen

    let delta = Math.floor((Date.now() - t.anchor) / 1000)
    return t.mode === 'countup' ? delta : Math.max(0, -delta)
}

const anchorFor = function(t, seconds) {
    return t.mode === 'countup' ? Date.now() - seconds * 1000 : Date.now() + seconds * 1000
}

const createTimerElement = function() {
    let el = document.createElement('h2')
    el.innerHTML = '<span class="time"></span><span class="state" aria-live="polite"></span>'
    document.querySelector('#txt').appendChild(el)

    return el
}

const renderTimer = function(t) {
    t.el.querySelector('.time').innerText = TimeFormatter(secondsOf(t))
    t.el.querySelector('.state').innerText = t.paused ? 'PAUSED' : ''
    t.el.classList.toggle('paused', t.paused)
}

const startLoop = function(t) {
    if (timerInterval) clearInterval(timerInterval)

    timerInterval = setInterval(function() {
        if (t.paused) return

        renderTimer(t)

        if (t.mode === 'countdown' && secondsOf(t) <= 0) {
            t.ended = true
            playAudioAtEnd()
            clearInterval(timerInterval)
            timerInterval = null
        }
    }, 1000)
}

const createTimer = function(el, mode, anchor) {
    timer = { el, mode, anchor, paused: false, frozen: 0, ended: false }
    renderTimer(timer)
    startLoop(timer)
}

const togglePause = function() {
    if (!timer || timer.ended) return

    let seconds = secondsOf(timer)

    timer.paused = !timer.paused

    if (timer.paused) {
        timer.frozen = seconds
    } else {
        // Continue from the frozen value, not from the original anchor
        timer.anchor = anchorFor(timer, timer.frozen)
    }

    renderTimer(timer)
}

const startTimer = function() {
    if (!window.location.search) return;

    let match = window.location.search.match(/timer=(\d+)/)
    if (!match) return;

    let minutes = parseInt(match[1], 10)

    let el = createTimerElement()

    if (minutes === 0) return createTimer(el, 'countup', Date.now())

    createTimer(el, 'countdown', Date.now() + minutes * 60 * 1000)
}

const extendTimer = function(seconds) {
    if (!timer || (timer.ended && seconds <= 0)) return;

    timer.frozen = Math.max(0, secondsOf(timer) + seconds)
    timer.anchor = anchorFor(timer, timer.frozen)

    renderTimer(timer);

    if (!timerInterval && timer.frozen > 0) {
        timer.ended = false
        startLoop(timer)
    }

    toast(seconds > 0 ? `+${seconds} s` : `-${Math.abs(seconds)} s`);
}

const startCountdown = function() {
    if (!window.location.search) return;

    let match = window.location.search.match(/countdown=([^&]+)/)
    if (!match || !match.length) return;

    let dateStr = decode(match[1])
    let d = new Date(dateStr)

    if (Number.isNaN(d.getTime())) return;
    
    let el = createTimerElement()
    
    let remainingSeconds = Math.floor((d.getTime() - Date.now()) / 1000)

    // Countdown date is in the past
    if (remainingSeconds < 0) {
        let d;
        if (!Intl || !Intl.RelativeTimeFormat) {
            d = (remainingSeconds * -1) + ' seconds ago'
        }
        else {
            let rtf = new Intl.RelativeTimeFormat(window.navigator.language)
            d = rtf.format(remainingSeconds, "second")
        }

        return el.querySelector('.time').innerText = `${d} 🐹`
    }

    function tick() {
        el.querySelector('.time').innerText = TimeFormatter(remainingSeconds)
    }

    let interval = setInterval(function() {
        if (remainingSeconds <= 0) {
            playAudioAtEnd()
            return clearInterval(interval)
        }

        remainingSeconds--
        tick()
    }, 1000)

    tick()
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.location.hash) setHeader();
    window.addEventListener("hashchange", setHeader);

    if (window.location.search.indexOf('timer=') !== -1) {
        startTimer()
    }
    else if (window.location.search.indexOf('countdown=') !== -1) {
        startCountdown()
    }

    // Help "dialog" events
    let helpNode = document.querySelector('#help');

    // Keys should not be captured while a form control has focus
    const isFormField = function(el) {
        return el.matches && el.matches('input, select, textarea, button')
    }

    document.addEventListener("keyup", (e) => {
        if (e.key == "?") helpNode.classList.toggle('show')
        if (e.key == "Escape") helpNode.classList.remove('show')
        if ((e.key == "p" || e.key == " ") && timer && !isFormField(e.target)) {
            e.preventDefault()
            togglePause()
        }
        if ((e.key == "+" || e.key == "=") && timer) {
            e.preventDefault()
            extendTimer(10)
        }
        if (e.key == "-" && timer) {
            e.preventDefault()
            extendTimer(-10)
        }
    })

    document.querySelector('#help').addEventListener("click", (e) => {
        if (e.target == helpNode) helpNode.classList.remove('show')
    })

    // Help button atfer a while, for a while
    const helpButton = document.querySelector('#helpbutton');
    let hideTimer = null;
    
    setTimeout(() => {
        helpButton.classList.add('visible');
    }, 10000);
    
    const resetButtonTimer = function() {
        clearTimeout(hideTimer);
        hideTimer = setTimeout(() => {
            helpButton.classList.remove('visible');
        }, 30000);
    };
    
    resetButtonTimer();
    
    document.querySelector('#helpbutton').addEventListener("click", (e) => {
        e.stopPropagation();
        helpNode.classList.toggle('show')
        if (helpNode.classList.contains('show')) {
            resetButtonTimer();
        }
    });
})