// About page intro: the photos fly out of the folder to their places on the page,
// then the connecting lines draw in and the logos and text fade up. The empty
// folder stays where it is.
//
// Each photo starts exactly where it rests in the folder on the home page
// (same numbers as site.css) and travels on a slightly random arc with its own
// speed and wobble, so it feels tossed by hand rather than choreographed.

(function () {
    const root = document.documentElement;
    if (!root.classList.contains('intro')) return;          // reduced motion: page shows as-is

    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);

    const stage = document.querySelector('.about-hero');
    if (!stage || !stage.animate) { root.classList.remove('intro'); return; }

    // Resting poses in the folder, in viewport px from the bottom-left (see site.css).
    const folderPoses = {
        'polaroid': { left: 182.03, bottom: 72.81,  w: 88.22,  h: 112.18, r: 5 },
        'photo-51': { left: 140.51, bottom: 161.05, w: 127.05, h: 169.9,  r: 2.15 },
        'photo-52': { left: 125.24, bottom: -21.76, w: 161.64, h: 125.21, r: 6 },
        'photo-53': { left: 0,      bottom: 212.57, w: 166,    h: 101.52, r: -1.92 },
        'photo-54': { left: 171.2,  bottom: 159.62, w: 76.02,  h: 76.02,  r: -4 },
        'photo-50': { left: 45.54,  bottom: 180.02, w: 122.55, h: 163.87, r: 5.09 },
        'statue':   { left: 70,     bottom: 110,    w: 130,    h: 175,    r: -4 },  // tucked fully inside
    };

    const bakedTilt = { 'photo-51': -3, 'statue': 3 };          // degrees already in the image
    const rand = (min, max) => min + Math.random() * (max - min);
    const stageBox = stage.getBoundingClientRect();
    const photos = Array.from(stage.querySelectorAll('.about-photo[data-from]'));
    let lastLanding = 0;

    photos.forEach((el) => {
        const pose = folderPoses[el.dataset.from];
        if (!pose) return;
        const cs = getComputedStyle(el);
        const end = { left: parseFloat(cs.left), top: parseFloat(cs.top), w: el.offsetWidth, r: 0 };
        // Exports with a tilt built in start rotated back by that amount, so they
        // leave the folder at the same angle they rest at on the home page.
        const start = {
            left: pose.left - stageBox.left,
            top: window.innerHeight - pose.bottom - pose.h - stageBox.top,
            w: pose.w, r: pose.r - (bakedTilt[el.dataset.from] || 0),
        };
        // Midpoint of the arc: lifted, nudged sideways and over-rotated a little.
        const mid = {
            left: (start.left + end.left) / 2 + rand(-30, 30),
            top: Math.min(start.top, end.top) + (Math.abs(start.top - end.top) * 0.35) - rand(30, 90),
            w: (start.w + end.w) / 2,
            r: end.r + rand(-9, 9),
        };
        const frame = (p, extra = {}) => ({
            left: p.left + 'px', top: p.top + 'px', width: p.w + 'px',   // height follows the image's aspect
            rotate: p.r + 'deg', ...extra,
        });
        const duration = rand(950, 1350);
        const delay = rand(40, 280);
        lastLanding = Math.max(lastLanding, delay + duration);

        el.animate(
            [frame(start), frame(mid, { offset: rand(0.45, 0.6) }), frame(end)],
            { duration, delay, easing: 'cubic-bezier(0.22, 0.75, 0.25, 1)', fill: 'backwards' }
        );

    });


    // Everything else comes in as the photos settle.
    const settle = lastLanding * 0.75;
    const fadeUp = (el, delay, from = 'translate: 0 6px') => {
        const [prop, val] = from.split(': ');
        el.animate(
            [{ opacity: 0, [prop]: val }, { opacity: 1, [prop]: prop === 'scale' ? '1' : '0 0' }],
            { duration: 500, delay, easing: 'ease-out', fill: 'both' }
        );
    };

    stage.querySelectorAll('.about-title, .about-back').forEach((el) => fadeUp(el, 150));

    stage.querySelectorAll('.about-logo').forEach((el) => fadeUp(el, settle + rand(0, 260), 'scale: 0.85'));

    const lines = stage.querySelector('.about-hero__lines');
    if (lines) {
        lines.querySelectorAll('line').forEach((line) => {
            const len = line.getTotalLength();
            line.style.strokeDasharray = len;
            line.animate(
                [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
                { duration: 700, delay: settle + rand(80, 320), easing: 'ease-in-out', fill: 'both' }
            );
        });
    }

    stage.querySelectorAll('.about-copy').forEach((el, i) => fadeUp(el, settle + 200 + i * 150));

    // All start states are in place; reveal the page in the same frame.
    root.classList.remove('intro');
})();
