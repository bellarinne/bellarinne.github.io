// Folder hover: photos spill out a little differently every time.
// Each photo has a general direction it tends to slide (dx, dy in px) and how
// much it tends to twist (dr in deg, added to its resting angle); every hover
// jitters those, and picks its own speed, start delay and easing per photo.
(function () {
    const folder = document.querySelector('a.collage');   // only when the folder is a link
    if (!folder) return;

    const tendencies = {
        'collage__photo-53':   { dx: -4, dy: -10, dr: -3.5 },  // blue building: up and a touch left
        'collage__photo-50':   { dx:  3, dy: -15, dr:  4   },  // red balcony: pops up the most
        'collage__photo-51':   { dx: 11, dy:  -7, dr:  3   },  // archway: up and out to the right
        'collage__photo-54':   { dx: 13, dy:   3, dr: -7   },  // horse poster: out right, twists back
        'collage__polaroid':   { dx: 15, dy:  -3, dr:  6   },  // polaroid: slides right, tips over
        'collage__photo-52':   { dx: 12, dy:   6, dr:  5   },  // beach: slips out and down
        'collage__folder-back':{ dx:  2, dy:   1, dr:  0.8 },  // back flap shifts a hair
    };
    const INTENSITY = 0.7;   // overall size of the spill (1 = original, lower = subtler)
    const easings = [
        'cubic-bezier(0.34, 1.56, 0.64, 1)',   // springy overshoot
        'cubic-bezier(0.25, 1.25, 0.5, 1)',    // small overshoot
        'cubic-bezier(0.2, 0.9, 0.3, 1)',      // no overshoot, quick settle
        'cubic-bezier(0.45, 1.5, 0.6, 0.95)',  // a little wobbly
    ];
    const rand = (min, max) => min + Math.random() * (max - min);
    const pick = (list) => list[Math.floor(Math.random() * list.length)];

    const items = Array.from(folder.querySelectorAll('.collage__item'))
        .map((el) => {
            const key = Object.keys(tendencies).find((k) => el.classList.contains(k));
            if (!key) return null;
            const baseR = parseFloat(getComputedStyle(el).getPropertyValue('--r')) || 0;
            return { el, t: tendencies[key], baseR };
        })
        .filter(Boolean);

    function setTiming(el, durMin, durMax, delayMax) {
        el.style.setProperty('--dur', Math.round(rand(durMin, durMax)) + 'ms');
        el.style.setProperty('--delay', Math.round(rand(0, delayMax)) + 'ms');
        el.style.setProperty('--ease', pick(easings));
    }

    function spill() {
        for (const { el, t, baseR } of items) {
            const scale = rand(0.6, 1.35) * INTENSITY;           // some photos go further than others
            el.style.setProperty('--hx', (t.dx * scale + rand(-1.5, 1.5)).toFixed(1) + 'px');
            el.style.setProperty('--hy', (t.dy * scale + rand(-1.5, 1.5)).toFixed(1) + 'px');
            el.style.setProperty('--hr', (baseR + t.dr * rand(0.5, 1.4) * INTENSITY + rand(-1, 1)).toFixed(2) + 'deg');
            setTiming(el, 340, 760, 140);
        }
    }

    function tuckIn() {
        for (const { el } of items) setTiming(el, 380, 650, 90);
    }

    folder.addEventListener('pointerenter', spill);
    folder.addEventListener('focus', spill);
    folder.addEventListener('pointerleave', tuckIn);
    folder.addEventListener('blur', tuckIn);
})();
