// Home page project list.
// - The project nearest the vertical centre of the viewport becomes "active"
//   (bigger card + details).
// - While a card grows or shrinks, the scroll position is corrected every frame
//   so the active project stays put instead of jumping.
// - The list is cloned above and below so it loops; when the active project
//   lands in a clone we jump to the same project in the real set.

(function () {
    const list = document.querySelector('.project-list');
    if (!list) return;

    const originals = Array.from(list.children);
    const setSize = originals.length;

    const makeClone = (el) => {
        const clone = el.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        clone.inert = true;
        return clone;
    };
    list.prepend(...originals.map(makeClone));
    list.append(...originals.map(makeClone));

    const items = Array.from(list.children);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ANCHOR_MS = 600; // a little longer than the CSS transition

    let active = null;
    let anchorEl = null;
    let anchorCenter = 0;
    let anchorUntil = 0;
    let anchorFrame = 0;
    let scrollFrame = 0;

    const docCenter = (el) => {
        const r = el.getBoundingClientRect();
        return r.top + window.scrollY + r.height / 2;
    };

    function anchorTick(now) {
        const c = docCenter(anchorEl);
        const delta = c - anchorCenter;
        if (Math.abs(delta) > 0.1) window.scrollBy(0, delta);
        anchorCenter = c;
        if (now < anchorUntil) {
            anchorFrame = requestAnimationFrame(anchorTick);
        } else {
            anchorFrame = 0;
            recenterIntoMiddleSet();
        }
    }

    function setActive(el, { instant = false } = {}) {
        if (el === active) return;
        anchorEl = el;
        anchorCenter = docCenter(el);
        if (instant) list.classList.add('no-transition');
        if (active) active.classList.remove('is-active');
        el.classList.add('is-active');
        active = el;
        if (instant) {
            const delta = docCenter(el) - anchorCenter;
            window.scrollBy(0, delta);
            void list.offsetHeight;
            list.classList.remove('no-transition');
            return;
        }
        anchorUntil = performance.now() + (reducedMotion.matches ? 0 : ANCHOR_MS);
        if (!anchorFrame) anchorFrame = requestAnimationFrame(anchorTick);
    }

    // Keep the active project inside the middle (real) set so the loop never runs out.
    function recenterIntoMiddleSet() {
        const index = items.indexOf(active);
        if (index >= setSize && index < setSize * 2) return;
        const twin = items[setSize + (index % setSize)];
        const before = docCenter(active);
        list.classList.add('no-transition');
        active.classList.remove('is-active');
        twin.classList.add('is-active');
        active = twin;
        window.scrollBy(0, docCenter(twin) - before);
        void list.offsetHeight;
        list.classList.remove('no-transition');
    }

    function pickActive() {
        scrollFrame = 0;
        const mid = window.innerHeight / 2;
        let best = null;
        let bestDist = Infinity;
        for (const item of items) {
            const r = item.getBoundingClientRect();
            if (r.bottom < 0 || r.top > window.innerHeight) continue;
            const dist = Math.abs(r.top + r.height / 2 - mid);
            if (dist < bestDist) {
                bestDist = dist;
                best = item;
            }
        }
        if (best) setActive(best);
        if (!anchorFrame) recenterIntoMiddleSet();
    }

    window.addEventListener('scroll', () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(pickActive);
    }, { passive: true });

    window.addEventListener('resize', () => {
        if (!scrollFrame) scrollFrame = requestAnimationFrame(pickActive);
    });

    // Start with the first project of the real set centred, as in the first Figma frame.
    const first = items[setSize];
    setActive(first, { instant: true });
    window.scrollTo(0, docCenter(first) - window.innerHeight / 2);
})();
