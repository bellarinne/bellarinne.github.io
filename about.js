// About page photo animations.
//
// Intro: the photos fly out of the folder to their places on the page, on a
// slightly random arc each, then the connecting lines draw in and the logos and
// text fade up.
//
// Going back (the Back link or the folder): the lines, logos and text fade out
// and the photos fly neatly back into the folder, then the home page loads.
//
// Every photo starts/ends exactly where it rests in the folder on the home page
// (same numbers as site.css), tucked behind the folder's front.

(function () {
    const root = document.documentElement;
    const stage = document.querySelector('.about-hero');
    if (!stage) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const canAnimate = !!stage.animate;

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
    const photos = Array.from(stage.querySelectorAll('.about-photo[data-from]'));
    const reveals = Array.from(stage.querySelectorAll('.about-title, .about-back, .about-logo, .about-copy'));
    const lines = Array.from(stage.querySelectorAll('.about-hero__lines line'));

    // Where a photo sits on the page, and where it sits in the folder, in stage px.
    function placeOnPage(el) {
        const cs = getComputedStyle(el);
        return { left: parseFloat(cs.left), top: parseFloat(cs.top), w: el.offsetWidth, r: 0 };
    }
    function placeInFolder(el) {
        const pose = folderPoses[el.dataset.from];
        const box = stage.getBoundingClientRect();
        return {
            left: pose.left - box.left,
            top: window.innerHeight - pose.bottom - pose.h - box.top,
            w: pose.w,
            r: pose.r - (bakedTilt[el.dataset.from] || 0),   // so it matches its folder angle
        };
    }
    const frame = (p, extra = {}) => ({
        left: p.left + 'px', top: p.top + 'px', width: p.w + 'px',   // height follows the image's aspect
        rotate: p.r + 'deg', ...extra,
    });

    // ---------------------------------------------------------------- intro

    function intro() {
        if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
        let lastLanding = 0;

        photos.forEach((el) => {
            const start = placeInFolder(el);
            const end = placeOnPage(el);
            // Midpoint of the arc: lifted, nudged sideways and over-rotated a little.
            const mid = {
                left: (start.left + end.left) / 2 + rand(-30, 30),
                top: Math.min(start.top, end.top) + Math.abs(start.top - end.top) * 0.35 - rand(30, 90),
                w: (start.w + end.w) / 2,
                r: end.r + rand(-9, 9),
            };
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
        lines.forEach((line) => {
            const len = line.getTotalLength();
            line.style.strokeDasharray = len;
            line.animate(
                [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
                { duration: 700, delay: settle + rand(80, 320), easing: 'ease-in-out', fill: 'both' }
            );
        });
        stage.querySelectorAll('.about-copy').forEach((el, i) => fadeUp(el, settle + 200 + i * 150));

        // All start states are in place; reveal the page in the same frame.
        root.classList.remove('intro');
    }

    // ------------------------------------------------------------ going back

    let leaving = false;

    function flyBack(href) {
        if (leaving) return;
        leaving = true;

        // Settle anything still running from the intro, so we start from the page layout.
        document.getAnimations().forEach((a) => a.finish());

        // Lines, logos and text go first.
        reveals.forEach((el) => el.animate([{ opacity: 1 }, { opacity: 0 }],
            { duration: 250, easing: 'ease-in', fill: 'forwards' }));
        lines.forEach((line) => line.animate([{ opacity: 1 }, { opacity: 0 }],
            { duration: 250, easing: 'ease-in', fill: 'forwards' }));

        // Then the photos fly home on a gentle arc, a little staggered.
        let lastIn = 0;
        photos.forEach((el, i) => {
            const start = placeOnPage(el);
            const end = placeInFolder(el);
            const mid = {
                left: (start.left + end.left) / 2,
                top: Math.min(start.top, end.top) + Math.abs(start.top - end.top) * 0.4 - 40,
                w: (start.w + end.w) / 2,
                r: (start.r + end.r) / 2,
            };
            const duration = 750;
            const delay = 150 + i * 45;
            lastIn = Math.max(lastIn, delay + duration);
            el.animate(
                [frame(start), frame(mid, { offset: 0.5 }), frame(end)],
                { duration, delay, easing: 'cubic-bezier(0.55, 0, 0.35, 1)', fill: 'forwards' }
            );
        });

        setTimeout(() => { window.location.href = href; }, lastIn + 60);
    }

    document.querySelectorAll('.about-back, .folder-link').forEach((link) => {
        link.addEventListener('click', (event) => {
            // Let new-tab / new-window clicks behave normally.
            if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
            if (reducedMotion.matches || !canAnimate) return;
            event.preventDefault();
            flyBack(link.href);
        });
    });

    // Coming back to this page with the browser's back button can restore it
    // mid-departure; put everything back in place.
    window.addEventListener('pageshow', (event) => {
        if (!event.persisted || !leaving) return;
        leaving = false;
        document.getAnimations().forEach((a) => a.cancel());
        root.classList.remove('intro');
    });

    // ----------------------------------------------------------------- start

    if (root.classList.contains('intro')) {
        if (canAnimate) intro();
        else root.classList.remove('intro');
    }
})();
