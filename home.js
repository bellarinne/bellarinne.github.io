// Home page project list — scroll-linked.
//
// The list is pinned to the viewport and the page scroll drives it directly:
// every PITCH pixels of scroll moves the next project to the centre. Each
// card's size and the visibility of its details are worked out from its
// distance to the centre on every frame, so the grow/shrink tracks the scroll
// exactly instead of playing as a timed animation.
//
// The list loops: the scroll track is several "laps" long and we silently jump
// back to the middle lap when you get near either end.

(function () {
    const list = document.querySelector('.project-list');
    if (!list) return;

    const items = Array.from(list.children);
    const N = items.length;
    if (!N) return;

    const PITCH = 340;          // px of scroll per project (higher = less sensitive)
    const EASE = 0.14;          // how quickly the list catches up with the scroll each frame (lower = more resistance)
    const GAP = 32;             // px between cards
    const W_MIN = 354;          // card width at rest
    const W_MAX = 528;          // card width at the centre
    const ASPECT = 2926 / 1732;
    const LAPS = 7;             // laps of the loop in the scroll track
    const LAP = PITCH * N;

    const medias = items.map((el) => el.querySelector('.project__media'));
    const details = items.map((el) => el.querySelector('.project__details'));

    document.body.classList.add('is-scrubbed');

    const track = document.createElement('div');
    track.className = 'scroll-track';
    track.setAttribute('aria-hidden', 'true');
    // Snap points, one per project, so scrolling settles with a card centred.
    for (let i = 0; i < N * LAPS; i++) {
        const stop = document.createElement('div');
        stop.className = 'scroll-track__stop';
        track.appendChild(stop);
    }
    document.body.appendChild(track);

    const smooth = (x) => x * x * (3 - 2 * x);
    const clamp01 = (x) => Math.min(1, Math.max(0, x));
    const growth = (d) => smooth(clamp01(1 - Math.abs(d)));
    const widthAt = (d) => W_MIN + (W_MAX - W_MIN) * growth(d);
    const heightAt = (d) => widthAt(d) / ASPECT;
    const mod = (a, n) => ((a % n) + n) % n;

    function sizeTrack() {
        track.style.setProperty('--pitch', PITCH + 'px');
        track.style.height = LAP * LAPS + window.innerHeight - PITCH + 'px';
    }

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Jump back to the middle lap near either end. The shown position moves by
    // the same amount, so nothing visibly changes.
    function wrap() {
        const y = window.scrollY;
        let jump = 0;
        if (y < LAP) jump = LAP * Math.floor(LAPS / 2);
        else if (y > LAP * (LAPS - 2)) jump = -LAP * Math.floor(LAPS / 2);
        if (jump) {
            window.scrollTo(0, y + jump);
            shown += jump / PITCH;
        }
    }

    let shown = 0;          // project position currently drawn (fractional)
    let frame = 0;
    let last = 0;

    function tick(now) {
        frame = 0;
        wrap();
        const target = window.scrollY / PITCH;
        if (reducedMotion.matches || !last) {
            shown = target;
        } else {
            // Frame-rate independent easing toward the scroll position.
            const dt = Math.min(64, now - last) / 16.67;
            shown += (target - shown) * (1 - Math.pow(1 - EASE, dt));
            if (Math.abs(target - shown) < 0.0005) shown = target;
        }
        last = now;
        render(shown);
        if (shown !== target) frame = requestAnimationFrame(tick);
        else last = 0;
    }

    function render(p) {
        const k = Math.floor(p);
        const frac = p - k;
        const centre = window.innerHeight / 2;

        // Lay out one copy of each project around the centre, from k-2 to k+N-3.
        const first = k - Math.floor((N - 1) / 2);
        const ys = {};
        ys[k] = centre - frac * (heightAt(k - p) / 2 + GAP + heightAt(k + 1 - p) / 2);
        for (let i = k + 1; i < first + N; i++) {
            ys[i] = ys[i - 1] + heightAt(i - 1 - p) / 2 + GAP + heightAt(i - p) / 2;
        }
        for (let i = k - 1; i >= first; i--) {
            ys[i] = ys[i + 1] - heightAt(i + 1 - p) / 2 - GAP - heightAt(i - p) / 2;
        }

        for (let i = first; i < first + N; i++) {
            const idx = mod(i, N);
            const d = i - p;
            const g = growth(d);
            const h = heightAt(d);
            items[idx].style.transform = `translate3d(0, ${(ys[i] - h / 2).toFixed(2)}px, 0)`;
            medias[idx].style.width = widthAt(d).toFixed(2) + 'px';

            const reveal = smooth(clamp01((g - 0.55) / 0.45));
            const det = details[idx];
            det.style.opacity = reveal.toFixed(3);
            det.style.visibility = reveal > 0.01 ? 'visible' : 'hidden';
            items[idx].classList.toggle('is-active', g > 0.5);
        }
    }

    const schedule = () => {
        if (frame) return;
        frame = requestAnimationFrame((now) => {
            if (!last) last = now - 16.67;   // ease from this frame on
            tick(now);
        });
    };
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', () => { sizeTrack(); schedule(); });

    // Start with the first project centred, as in the first Figma frame.
    sizeTrack();
    window.scrollTo(0, LAP * Math.floor(LAPS / 2));
    shown = window.scrollY / PITCH;
    render(shown);
})();

// Folder hover: photos spill out a little differently every time.
// Each photo has a general direction it tends to slide (dx, dy in px) and how
// much it tends to twist (dr in deg, added to its resting angle); every hover
// jitters those, and picks its own speed, start delay and easing per photo.
(function () {
    const folder = document.querySelector('.collage');
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
    const easings = [
        'cubic-bezier(0.34, 1.56, 0.64, 1)',   // springy overshoot
        'cubic-bezier(0.25, 1.25, 0.5, 1)',    // small overshoot
        'cubic-bezier(0.2, 0.9, 0.3, 1)',      // no overshoot, quick settle
        'cubic-bezier(0.45, 1.8, 0.6, 0.9)',   // wobbly
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
            const scale = rand(0.6, 1.35);                       // some photos go further than others
            el.style.setProperty('--hx', (t.dx * scale + rand(-2.5, 2.5)).toFixed(1) + 'px');
            el.style.setProperty('--hy', (t.dy * scale + rand(-2.5, 2.5)).toFixed(1) + 'px');
            el.style.setProperty('--hr', (baseR + t.dr * rand(0.5, 1.4) + rand(-1.5, 1.5)).toFixed(2) + 'deg');
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
