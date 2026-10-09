// Native desktop campaign timeline. Math and timings are preserved from the reference.
// Only GSAP and ScrollTrigger are required; no React or downloaded application runtime.
(() => {
  const { gsap, ScrollTrigger } = window;
  const root = document.querySelector(".campaign-slideshow");
  if (!root || !gsap || !ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  let ec = ".campaign-slideshow__panel",
    ed = "data-campaign-chrome-logo",
    em = "data-campaign-chrome-burger",
    eu = "data-campaign-chrome-ticker",
    ep = ".campaign-slideshow__ticker";
  function darkColor(e) {
    if (!e || "transparent" === e || "rgba(0, 0, 0, 0)" === e) return null;
    let a = 0,
      t = 0,
      i = 0,
      l = 1;
    if (e.startsWith("#")) {
      let l = e.slice(1),
        n =
          3 === l.length
            ? l
                .split("")
                .map((e) => e + e)
                .join("")
            : l;
      if (n.length < 6) return null;
      ((a = Number.parseInt(n.slice(0, 2), 16)),
        (t = Number.parseInt(n.slice(2, 4), 16)),
        (i = Number.parseInt(n.slice(4, 6), 16)));
    } else {
      let n = e.match(
        /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?/i,
      );
      if (!n) return null;
      ((a = Number(n[1])),
        (t = Number(n[2])),
        (i = Number(n[3])),
        (l = null != n[4] ? Number(n[4]) : 1));
    }
    return l < 0.1 ? null : (0.299 * a + 0.587 * t + 0.114 * i) / 255 <= 0.55;
  }
  function darkSurfaceAt(e, a) {
    for (let t of document.querySelectorAll(
      ".campaign-slideshow__hero-visual, .campaign-slideshow__hero-texture, .campaign-slideshow__hero-portrait, .campaign-slideshow__trans-forest-peek, .campaign-slideshow__trans-forest-bg, .campaign-slideshow__trans-forest-media, .campaign-slideshow__split-lead-photo-bg, .campaign-slideshow__split-lead-photo-bg-image, .campaign-slideshow__split-lead-media, .campaign-slideshow__split-zoom-right-bg, .campaign-slideshow__split-zoom-media, .campaign-slideshow__final-media",
    )) {
      let i = t.getBoundingClientRect();
      if (
        !(i.width <= 0) &&
        !(i.height <= 0) &&
        i.left <= e &&
        i.right > e &&
        i.top <= a &&
        i.bottom > a
      )
        return !0;
    }
    for (let t of document.querySelectorAll(
      ".campaign-slideshow__hero-bg, .campaign-slideshow__split-type-right, .campaign-slideshow__split-zoom-left, .campaign-slideshow__split-lead-right-color, .campaign-up-next, [data-campaign-color-surface]",
    )) {
      let i = t.getBoundingClientRect();
      if (
        !(i.width <= 0) &&
        !(i.height <= 0) &&
        i.left <= e &&
        i.right > e &&
        i.top <= a &&
        i.bottom > a
      ) {
        let e = darkColor(getComputedStyle(t).backgroundColor);
        if (null != e) return e;
        if (t.dataset.campaignBg) {
          let e = darkColor(t.dataset.campaignBg);
          if (null != e) return e;
        }
      }
    }
    for (let t of "function" == typeof document.elementsFromPoint
      ? document.elementsFromPoint(e, a)
      : [document.elementFromPoint(e, a)].filter(Boolean)) {
      if (
        !(t instanceof HTMLElement) ||
        t.closest("[data-campaign-chrome-mark]") ||
        t.classList.contains("campaign-slideshow__color-wash")
      )
        continue;
      let e = darkColor(getComputedStyle(t).backgroundColor);
      if (null != e) return e;
      if (t.dataset.campaignBg) {
        let e = darkColor(t.dataset.campaignBg);
        if (null != e) return e;
      }
    }
    for (let t of document.querySelectorAll("[data-campaign-bg]")) {
      let i = t.getBoundingClientRect();
      if (
        i.left <= e &&
        i.right > e &&
        i.top <= a &&
        i.bottom > a &&
        t.dataset.campaignBg
      )
        return darkColor(t.dataset.campaignBg);
    }
    return null;
  }
  function updateChromeColors() {
    let e = Math.max(0, window.innerWidth - 48),
      a = darkSurfaceAt(100, 28),
      t = darkSurfaceAt(e, 28),
      i = document.documentElement;
    (null != a && i.setAttribute(ed, a ? "light" : "dark"),
      null != t && i.setAttribute(em, t ? "light" : "dark"));
    let l = document.querySelector(ep);
    if (l) {
      let e = l.getBoundingClientRect();
      if (e.width > 0 && e.height > 0) {
        let a = darkSurfaceAt(e.left + e.width / 2, e.top + e.height / 2);
        if (null != a) {
          let e = a ? "light" : "dark";
          (i.setAttribute(eu, e), (l.dataset.campaignChrome = e));
        }
      }
    }
  }
  function stageScale(e) {
    let a = e.querySelector(".campaign-slideshow__design-stage-wrap");
    return (
      (a &&
        Number.parseFloat(
          getComputedStyle(a).getPropertyValue("--campaign-scale"),
        )) ||
      1
    );
  }
  function stageHalfWidth(e) {
    return window.innerWidth / 2 / stageScale(e);
  }
  let ex = { width: 510, height: 684 },
    eb = { width: 722, height: 970 };
  function portraitSize(e, a) {
    let t = stageHalfWidth(e),
      i = Math.min(a.width, 0.85 * t),
      l = i / a.width,
      n = a.height * l;
    return { top: (1080 - n) / 2, width: i, height: n };
  }
  function expandedPortraitSize(e) {
    let a = portraitSize(e, ex),
      t = portraitSize(e, eb),
      i = a.width + (t.width - a.width) * 0.85,
      l = a.height + (t.height - a.height) * 0.85;
    return { top: (1080 - l) / 2, width: i, height: l };
  }
  function portraitLeft(e) {
    let { width: a } = portraitSize(e, ex);
    return Math.max(0, (0.4 * window.innerWidth) / stageScale(e) - 0.8 * a);
  }
  function aboveViewport(e) {
    let a = parseFloat(getComputedStyle(e).top),
      t =
        (e.getBoundingClientRect().height || e.offsetHeight || 200) +
        Math.max(120, 0.2 * window.innerHeight);
    return Number.isFinite(a) && a > 0 ? -a - t : -window.innerHeight - t;
  }
  function leadBottomOffset(e) {
    let a = e.closest(".campaign-slideshow__split-lead-panel");
    if (!a) return -400;
    let t =
        Number.parseFloat(
          getComputedStyle(a).getPropertyValue(
            "--campaign-split-lead-seam-inset",
          ),
        ) || 80,
      i = 0.5 * window.innerWidth + t,
      l = a.getBoundingClientRect(),
      n = e.getBoundingClientRect(),
      s = Number(gsap.getProperty(e, "x")) || 0;
    return i - (n.left - l.left - s);
  }
  function splitTypeOffset(e, a, t) {
    let i =
      a?.querySelector(".campaign-slideshow__split-type-col") ??
      a?.querySelector(".campaign-slideshow__split-type-right-clip");
    return (
      (t / 100) * (i?.getBoundingClientRect().width || 0.5 * window.innerWidth)
    );
  }
  function cssNumber(e, a, t) {
    let i = Number.parseFloat(getComputedStyle(e).getPropertyValue(a));
    return Number.isFinite(i) ? i : t;
  }
  function mediaSize(e) {
    let a = e.clientHeight;
    return { width: (740 * a) / 1080, height: (526 * a) / 1080 };
  }
  function positiveCssNumber(e, a, t) {
    let i = Number.parseFloat(getComputedStyle(e).getPropertyValue(a));
    return Number.isFinite(i) && i > 0 ? i : t;
  }
  function heldMediaSize(e, a) {
    let t = mediaSize(e),
      i = positiveCssNumber(
        a ?? e,
        "--campaign-split-zoom-media-hold-scale",
        0.85,
      );
    return { width: t.width * i, height: t.height * i };
  }
  function finalMediaSize(e) {
    let a = mediaSize(e),
      t = 1.5 * a.width,
      i = 1.5 * a.height,
      l = Math.min(1, (0.92 * e.clientWidth) / t, (0.85 * e.clientHeight) / i);
    return { width: t * l, height: i * l };
  }
  function initialMediaSize(e) {
    let a =
      Number.parseFloat(
        getComputedStyle(e).getPropertyValue(
          "--campaign-split-zoom-media-start-width",
        ),
      ) || 240;
    return { width: a, height: 0.7108108108108108 * a };
  }
  const layouts = gsap.matchMedia();
  layouts.add(
    "(min-width:1025px), (min-width:768px) and (orientation:landscape) and (min-height:600px)",
    () => {
      const stages = [
        ...root.querySelectorAll(".campaign-slideshow__design-stage-wrap"),
      ];
      const previous = stages.map((el) => el.getAttribute("style"));
      function sizeStages() {
        for (const el of stages) {
          const scale = el.clientHeight / 1080;
          el.style.setProperty("--campaign-scale", String(scale));
          el.style.setProperty(
            "--campaign-letterbox-right",
            `${Math.max(0, el.clientWidth - 1680 * scale)}px`,
          );
        }
      }
      sizeStages();
      const resize = new ResizeObserver(sizeStages);
      stages.forEach((el) => resize.observe(el));
      const motion = gsap.matchMedia();
      motion.add("(prefers-reduced-motion: no-preference)", () => {
        const e = root.querySelector(".campaign-slideshow__pin"),
          n = root.querySelector(".campaign-slideshow__track");
        if (!e || !n) return;
        const context = gsap.context(() => {
          let a,
            t = gsap.utils.toArray(ec, e),
            i = e.querySelector(".campaign-slideshow__color-wash"),
            l = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__split-type-panel"),
            ),
            s = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__split-lead-panel"),
            ),
            r = l >= 0 && s >= l ? t.slice(l, s + 1) : [],
            o = r.map((e) => e.dataset.campaignBg?.trim() || "#ffffff"),
            c = [
              ...(i ? [i] : []),
              ...gsap.utils
                .toArray("[data-campaign-color-surface]", e)
                .filter((e) => {
                  let a = e.closest(ec);
                  if (!a || l < 0 || s < l) return !1;
                  let i = t.indexOf(a);
                  return i >= l && i <= s;
                }),
            ],
            d = () => {
              if (!c.length || !r.length) return;
              let a = e.clientWidth || 1;
              if (r[0].getBoundingClientRect().left >= a) return;
              if (r[r.length - 1].getBoundingClientRect().left <= 0)
                return void gsap.set(c, { backgroundColor: o[o.length - 1] });
              let t = o[0];
              for (let e = 0; e < r.length - 1; e++) {
                let i = r[e + 1].getBoundingClientRect().left,
                  l = 1 - gsap.utils.clamp(0, 1, i / a);
                if (l <= 0) {
                  t = o[e];
                  break;
                }
                if (l < 1) {
                  t = gsap.utils.interpolate(o[e], o[e + 1], l);
                  break;
                }
                t = o[e + 1];
              }
              gsap.set(c, { backgroundColor: t });
            },
            m = (e) =>
              t
                .slice(0, Math.max(0, e))
                .reduce((e, a) => e + a.getBoundingClientRect().width, 0),
            u = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__quote-panel"),
            ),
            p = u >= 0 ? t[u] : void 0,
            g = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__split-type-panel"),
            ),
            h = g >= 0 ? t[g] : void 0,
            f = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__split-zoom-panel"),
            ),
            _ = f >= 0 ? t[f] : void 0,
            y = _?.querySelector(".campaign-slideshow__split-zoom-media"),
            x = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__split-lead-panel"),
            ),
            b = x >= 0 ? t[x] : void 0,
            w = t.findIndex((e) =>
              e.classList.contains("campaign-slideshow__final-panel"),
            ),
            j = w >= 0 ? t[w] : void 0,
            N = j?.querySelector(".campaign-slideshow__final-media"),
            v = () =>
              u >= 0
                ? Math.max(
                    1,
                    m(u) -
                      (() => {
                        let a = getComputedStyle(
                          e.closest(".campaign-slideshow") ?? e,
                        )
                          .getPropertyValue("--campaign-hero-grass-width")
                          .trim();
                        if (a.endsWith("vw")) {
                          let t = Number.parseFloat(a);
                          if (Number.isFinite(t))
                            return (t / 100) * e.clientWidth;
                        }
                        if (a.endsWith("px")) {
                          let e = Number.parseFloat(a);
                          if (Number.isFinite(e)) return e;
                        }
                        return 0.5 * e.clientWidth;
                      })(),
                  )
                : 1,
            q = v(),
            k = g >= 0 ? Math.max(q + 1, m(g)) : q,
            T = f >= 0 ? Math.max(k + 1, m(f)) : k,
            S = x >= 0 ? Math.max(T + 1, m(x)) : T,
            C = w >= 0 ? Math.max(S + 1, m(w)) : S,
            A = u >= 0 ? 0.55 * e.clientWidth : 0,
            L = g >= 0 ? 0.55 * e.clientWidth : 0,
            M = x >= 0 ? 0.55 * e.clientWidth : 0,
            R = f >= 0 ? 0.9 * e.clientWidth : 0,
            B = w >= 0 ? 0.9 * e.clientWidth : 0,
            $ = Math.max(+(g >= 0), k - q),
            z = Math.max(+(f >= 0), T - k),
            E = Math.max(+(x >= 0), S - T),
            P = Math.max(+(w >= 0), C - S),
            I = () =>
              t
                .slice(0, -1)
                .reduce((e, a) => e + a.getBoundingClientRect().width, 0) +
              A +
              L +
              M +
              R +
              B,
            F = document.querySelector(ep);
          F &&
            (gsap.set(F, { x: 72, y: 0 }),
            (a = (e) => {
              let a = I(),
                t = e * a,
                i = Math.max(0, window.innerWidth * (1 / 6 - 0.08)),
                l = Math.max(1, Math.min(0.06 * window.innerWidth, 100)),
                n = gsap.utils.clamp(0, 1, (t - i) / l),
                s = a <= i ? 1 : gsap.utils.clamp(0, 1, (t - i) / (a - i));
              gsap.set(F, {
                x: (1 - n) * 72,
                y:
                  s *
                  Math.max(
                    0,
                    window.innerHeight - 64 - 40 - F.offsetHeight - 40,
                  ),
              });
            }));
          let W = gsap.timeline({
            defaults: { ease: "none" },
            scrollTrigger: {
              trigger: e,
              start: "top top",
              end: () => `+=${I()}`,
              scrub: 0.65,
              pin: !0,
              anticipatePin: 1,
              invalidateOnRefresh: !0,
              onUpdate: (e) => {
                (d(), a?.(e.progress), updateChromeColors());
              },
              onRefresh: (e) => {
                (d(), a?.(e.progress), updateChromeColors());
              },
            },
          });
          (W.to(n, { x: () => -v(), duration: q }),
            W.to(n, { x: () => -v(), duration: A }, q));
          let H = e.closest(".campaign-slideshow") ?? e,
            O = (e) =>
              ((p?.getBoundingClientRect().width || 0.6 * window.innerWidth) *
                (e / 100)) /
              Math.max(
                Number.parseFloat(
                  getComputedStyle(H).getPropertyValue("--campaign-scale"),
                ) || window.innerHeight / 1080,
                0.05,
              ),
            Y = (e, a) => {
              let t = Number.parseFloat(
                getComputedStyle(H).getPropertyValue(e),
              );
              return Number.isFinite(t) ? t : a;
            },
            X = p?.querySelector(".campaign-slideshow__trans-quote-block"),
            G =
              e.querySelector(
                ".campaign-slideshow__quote-lead .campaign-slideshow__trans-headline-last",
              ) ?? p?.querySelector(".campaign-slideshow__trans-headline-last"),
            D = q + 0.12 * A,
            K = 0.88 * A;
          (X &&
            (gsap.set(X, {
              x: () => O(Y("--campaign-quote-block-from-x", -20)),
              y: 0,
            }),
            W.fromTo(
              X,
              {
                x: () => O(Y("--campaign-quote-block-from-x", -20)),
                y: 0,
                opacity: 1,
              },
              {
                x: () => O(Y("--campaign-quote-block-x", 0)),
                y: 0,
                opacity: 1,
                duration: K,
                ease: "none",
                immediateRender: !1,
              },
              D,
            )),
            G &&
              (gsap.set(G, {
                x: () => O(Y("--campaign-headline-last-from-x", 32)),
              }),
              W.fromTo(
                G,
                {
                  x: () => O(Y("--campaign-headline-last-from-x", 32)),
                  opacity: 1,
                },
                {
                  x: () => O(Y("--campaign-headline-last-x", 6)),
                  opacity: 1,
                  duration: K,
                  ease: "power2.out",
                  immediateRender: !1,
                },
                D,
              )));
          let Q = q + A;
          (X &&
            W.fromTo(
              X,
              { x: () => O(Y("--campaign-quote-block-x", 0)), opacity: 1 },
              {
                x: () =>
                  O(Y("--campaign-quote-block-x", 0)) +
                  O(Y("--campaign-quote-exit-drift-x", -42)),
                opacity: 0,
                duration: $,
                ease: "none",
                immediateRender: !1,
              },
              Q,
            ),
            G &&
              W.fromTo(
                G,
                { x: () => O(Y("--campaign-headline-last-x", 6)), opacity: 1 },
                {
                  x: () =>
                    O(Y("--campaign-headline-last-x", 6)) +
                    O(Y("--campaign-quote-exit-drift-x", -42)),
                  opacity: 0,
                  duration: $,
                  ease: "none",
                  immediateRender: !1,
                },
                Q,
              ),
            W.to(n, { x: () => (g >= 0 ? -m(g) : -v()), duration: $ }, Q));
          let Z = Q + $;
          W.to(
            n,
            {
              x: () => (g >= 0 ? -m(g) - 0.14 * e.clientWidth : -v()),
              duration: L,
            },
            Z,
          );
          let J = h?.querySelector(
              ".campaign-slideshow__split-type-headline--1[data-drift-from-x]",
            ),
            ee = h?.querySelector(".campaign-slideshow__split-type-media"),
            ea = e.closest(".campaign-slideshow") ?? e,
            et = () =>
              splitTypeOffset(
                ea,
                h,
                cssNumber(ea, "--campaign-split-type-side-from-x", 70),
              ),
            ei = () =>
              splitTypeOffset(
                ea,
                h,
                cssNumber(ea, "--campaign-split-type-side-x", 0),
              ),
            el = Z + L - Q;
          if (
            (J &&
              (gsap.set(J, { x: () => et() }),
              W.fromTo(
                J,
                { x: () => et() },
                {
                  x: () => ei(),
                  duration: el,
                  ease: "power2.out",
                  immediateRender: !1,
                },
                Q,
              )),
            ee)
          ) {
            let a = Number(ee.dataset.fromY ?? "780"),
              t = () =>
                (cssNumber(ea, "--campaign-split-type-media-park-y", -10) /
                  100) *
                window.innerHeight;
            (gsap.set(ee, { x: () => -(0.42 * window.innerWidth), y: a }),
              W.fromTo(
                ee,
                { x: () => -(0.42 * window.innerWidth), y: a },
                {
                  x: 0,
                  y: () => t(),
                  duration: el,
                  ease: "power2.out",
                  immediateRender: !1,
                },
                Q,
              ),
              W.fromTo(
                ee,
                { x: 0, y: () => t() },
                {
                  x: () => -(0.22 * window.innerWidth),
                  y: () => t(),
                  duration: 0.45 * L + Math.max(1, z - 0.14 * e.clientWidth),
                  ease: "power1.inOut",
                  immediateRender: !1,
                },
                Z + 0.55 * L,
              ));
          }
          let en = Z + L,
            es = f >= 0 ? Math.max(1, z - 0.14 * e.clientWidth) : 0;
          if (
            (J &&
              es > 0 &&
              W.fromTo(
                J,
                { x: () => ei(), opacity: 1 },
                {
                  x: () =>
                    ei() +
                    splitTypeOffset(
                      ea,
                      h,
                      cssNumber(ea, "--campaign-split-type-exit-drift-x", -38),
                    ),
                  opacity: 0,
                  duration: es,
                  ease: "none",
                  immediateRender: !1,
                },
                en,
              ),
            W.to(
              n,
              {
                x: () =>
                  f >= 0 ? -m(f) : g >= 0 ? -m(g) - 0.14 * e.clientWidth : -v(),
                duration: es,
              },
              en,
            ),
            y && _)
          ) {
            let a = Math.min(es, 0.5 * e.clientWidth),
              t = Math.max(en, en + es - a);
            (gsap.set(y, {
              width: initialMediaSize(_).width,
              height: initialMediaSize(_).height,
            }),
              W.fromTo(
                y,
                {
                  width: () => initialMediaSize(_).width,
                  height: () => initialMediaSize(_).height,
                },
                {
                  width: () => heldMediaSize(e, _).width,
                  height: () => heldMediaSize(e, _).height,
                  duration: a,
                  immediateRender: !1,
                },
                t,
              ));
          }
          let er = en + es;
          if (
            (W.to(
              n,
              {
                x: () =>
                  f >= 0 ? -m(f) : g >= 0 ? -m(g) - 0.14 * e.clientWidth : -v(),
                duration: R,
              },
              er,
            ),
            y && _)
          ) {
            let a = () => {
                let a, t;
                return (
                  (a = mediaSize(e)),
                  (t = positiveCssNumber(
                    _ ?? e,
                    "--campaign-split-zoom-media-exit-scale",
                    1.55,
                  )),
                  { width: a.width * t, height: a.height * t }
                );
              },
              t = R + Math.max(1, E);
            W.fromTo(
              y,
              {
                width: () => heldMediaSize(e, _).width,
                height: () => heldMediaSize(e, _).height,
              },
              {
                width: () => a().width,
                height: () => a().height,
                duration: t,
                ease: "none",
                immediateRender: !1,
              },
              er,
            );
          }
          let eo = er + R;
          W.to(
            n,
            { x: () => (x >= 0 ? -m(x) : f >= 0 ? -m(f) : -v()), duration: E },
            eo,
          );
          let ed = eo + E;
          W.to(
            n,
            { x: () => (x >= 0 ? -m(x) : f >= 0 ? -m(f) : -v()), duration: M },
            ed,
          );
          let em = b?.querySelector(".campaign-slideshow__split-lead-bottom"),
            eu = eo + 0.75 * E,
            darkColor = Math.max(1, ed + 0.85 * M - eu);
          em &&
            (gsap.set(em, { x: () => leadBottomOffset(em) }),
            W.fromTo(
              em,
              { x: () => leadBottomOffset(em), opacity: 1 },
              {
                x: 0,
                opacity: 1,
                duration: darkColor,
                ease: "power2.out",
                immediateRender: !1,
              },
              eu,
            ));
          let darkSurfaceAt = ed + M,
            eb = darkSurfaceAt + P;
          if (
            (W.to(
              n,
              {
                x: () => (w >= 0 ? -m(w) : x >= 0 ? -m(x) : -v()),
                duration: P,
              },
              darkSurfaceAt,
            ),
            W.to(
              n,
              {
                x: () => (w >= 0 ? -m(w) : x >= 0 ? -m(x) : -v()),
                duration: B,
              },
              eb,
            ),
            j)
          ) {
            let a = Math.min(P, 1.35 * e.clientWidth),
              t = Math.max(darkSurfaceAt, eb - a),
              i = a + 0.7 * B,
              l = j.querySelector(".campaign-slideshow__final-bg"),
              n =
                l?.querySelector(".campaign-slideshow__media-frame") ??
                l?.querySelector("img, picture, video") ??
                l;
            // The old patch removed the foreground card after initialization.
            // Keep the background zoom independent of that now-absent card.
            if (N) {
              gsap.set(N, {
                width: initialMediaSize(j).width,
                height: initialMediaSize(j).height,
              });
              W.fromTo(
                N,
                {
                  width: () => initialMediaSize(j).width,
                  height: () => initialMediaSize(j).height,
                },
                {
                  width: () => finalMediaSize(e).width,
                  height: () => finalMediaSize(e).height,
                  duration: i,
                  immediateRender: false,
                },
                t,
              );
            }
            if (n) {
              gsap.set(n, { scale: 1.22, transformOrigin: "50% 50%" });
              W.fromTo(
                n,
                { scale: 1.22 },
                { scale: 1, duration: i, immediateRender: false },
                t,
              );
            }
          }
          (d(), updateChromeColors());
          let eR = e
            .closest(".campaign-slideshow")
            ?.querySelector(".campaign-up-next");
          (eR &&
            ScrollTrigger.create({
              trigger: eR,
              start: "top bottom",
              end: "bottom top",
              onEnter: updateChromeColors,
              onEnterBack: updateChromeColors,
              onLeave: updateChromeColors,
              onLeaveBack: updateChromeColors,
              onUpdate: updateChromeColors,
            }),
            t.forEach((e, a) => {
              e.querySelectorAll("[data-speed]").forEach((t) => {
                if (
                  t.closest(".campaign-slideshow__trans-quote-block") ||
                  t.closest(".campaign-slideshow__split-lead-bottom") ||
                  t.closest(".campaign-slideshow__split-lead-quote-block") ||
                  t.closest(".campaign-slideshow__split-lead-kicker") ||
                  t.closest("[data-split-type-quote]") ||
                  t.classList.contains("campaign-slideshow__split-lead-last") ||
                  t.classList.contains(
                    "campaign-slideshow__trans-headline-last",
                  ) ||
                  t.closest("[data-drift-x]") ||
                  t.hasAttribute("data-drift-x") ||
                  t.classList.contains(
                    "campaign-slideshow__split-type-media",
                  ) ||
                  t.classList.contains(
                    "campaign-slideshow__split-lead-photo",
                  ) ||
                  t.classList.contains(
                    "campaign-slideshow__split-lead-media",
                  ) ||
                  t.hasAttribute("data-split-zoom-word") ||
                  t.classList.contains("campaign-slideshow__hero-visual") ||
                  t.classList.contains("campaign-slideshow__hero-portrait")
                )
                  return;
                let i = Number(t.dataset.speed ?? "1"),
                  l = Number(t.dataset.fromX ?? "72"),
                  n = Number(t.dataset.fromY ?? "0"),
                  s = Number(t.dataset.fromOpacity ?? "0");
                0 === a
                  ? gsap.fromTo(
                      t,
                      { x: 0.35 * l, y: 0.35 * n, opacity: s },
                      {
                        x: 40,
                        y: 0,
                        opacity: 1,
                        duration: 1.1 + 0.25 * i,
                        delay: 0.08 * i,
                        ease: "power2.out",
                        immediateRender: !1,
                      },
                    )
                  : gsap.fromTo(
                      t,
                      { x: l, y: n, opacity: s },
                      {
                        x: 40,
                        y: 0,
                        opacity: 1,
                        ease: "none",
                        scrollTrigger: {
                          containerAnimation: W,
                          trigger: e,
                          start: "left 90%",
                          end: "left 30%",
                          scrub: i,
                        },
                      },
                    );
              });
            }));
          let eB = e.closest(".campaign-slideshow") ?? e,
            e$ = () => {
              let e;
              return (
                (e = cssNumber(eB, "--campaign-split-type-exit-drift-x", -38)),
                splitTypeOffset(eB, h, e)
              );
            },
            ez = 65 / 150,
            eE = 49 / 150;
          ((h ? gsap.utils.toArray("[data-drift-x]", h) : []).forEach((e) => {
            let a =
                e.classList.contains(
                  "campaign-slideshow__split-type-headline--0",
                ) ||
                e.classList.contains("campaign-slideshow__split-type-eyebrow"),
              t = e.classList.contains(
                "campaign-slideshow__split-type-headline--2",
              ),
              i = a
                ? () => {
                    let e;
                    return (
                      (e = cssNumber(eB, "--campaign-split-type-line0-x", 55)),
                      splitTypeOffset(eB, h, e)
                    );
                  }
                : t
                  ? () => {
                      let e;
                      return (
                        (e = cssNumber(
                          eB,
                          "--campaign-split-type-quests-x",
                          42,
                        )),
                        splitTypeOffset(eB, h, e)
                      );
                    }
                  : null;
            if (!i) return;
            let l = gsap.timeline({
              scrollTrigger: {
                containerAnimation: W,
                trigger: h,
                start: "left 100%",
                end: "left -50%",
                scrub: 0.2,
                invalidateOnRefresh: !0,
              },
            });
            (l.fromTo(
              e,
              { x: 0, opacity: 1 },
              { x: i, opacity: 1, duration: ez, ease: "none" },
              0,
            ),
              l.to(e, { x: i, opacity: 1, duration: eE, ease: "none" }),
              l.to(e, {
                x: () => i() + e$(),
                opacity: 0,
                duration: 0.24,
                ease: "none",
              }));
          }),
            (h ? gsap.utils.toArray("[data-drift-from-x]", h) : []).forEach(
              (e) => {
                if (
                  e.classList.contains(
                    "campaign-slideshow__split-type-headline--1",
                  )
                )
                  return;
                let a = Number(e.dataset.driftFromX);
                if (!Number.isFinite(a) || 0 === a) return;
                let t = e.dataset.driftFromStart ?? "65",
                  i = e.dataset.driftFromEnd ?? "0",
                  l = Number(e.dataset.driftFromScrub ?? "0.35");
                gsap.fromTo(
                  e,
                  { x: () => splitTypeOffset(eB, h, a), opacity: 1 },
                  {
                    x: 0,
                    opacity: 1,
                    ease: "none",
                    immediateRender: !1,
                    scrollTrigger: {
                      containerAnimation: W,
                      trigger: h,
                      start: `left ${t}%`,
                      end: `left ${i}%`,
                      scrub: l,
                      invalidateOnRefresh: !0,
                    },
                  },
                );
              },
            ));
          let eP = h?.querySelector("[data-split-type-quote]");
          if (eP) {
            let e = gsap.timeline({
              scrollTrigger: {
                containerAnimation: W,
                trigger: h,
                start: "left 100%",
                end: "left -50%",
                scrub: 0.35,
                invalidateOnRefresh: !0,
              },
            });
            (e.fromTo(
              eP,
              {
                x: () => {
                  let e;
                  return (
                    (e = cssNumber(
                      eB,
                      "--campaign-split-type-quote-from-x",
                      16,
                    )),
                    splitTypeOffset(eB, h, e)
                  );
                },
                opacity: 1,
              },
              {
                x: () => {
                  let e;
                  return (
                    (e = cssNumber(eB, "--campaign-split-type-quote-x", 0)),
                    splitTypeOffset(eB, h, e)
                  );
                },
                opacity: 1,
                duration: ez,
                ease: "none",
              },
              0,
            ),
              e.to(eP, {
                x: () => {
                  let e;
                  return (
                    (e = cssNumber(eB, "--campaign-split-type-quote-x", 0)),
                    splitTypeOffset(eB, h, e)
                  );
                },
                opacity: 1,
                duration: eE,
                ease: "none",
              }),
              e.to(eP, {
                x: () => {
                  let e;
                  return (
                    (e = cssNumber(eB, "--campaign-split-type-quote-x", 0)),
                    splitTypeOffset(eB, h, e) + e$()
                  );
                },
                opacity: 0,
                duration: 0.24,
                ease: "none",
              }));
          }
          if (b) {
            let e = b.querySelector(".campaign-slideshow__split-lead-kicker"),
              a = b.querySelector(".campaign-slideshow__split-lead-media");
            if (
              (e &&
                (gsap.set(e, { y: () => aboveViewport(e) }),
                gsap.fromTo(
                  e,
                  { y: () => aboveViewport(e), opacity: 1 },
                  {
                    y: 0,
                    opacity: 1,
                    ease: "none",
                    scrollTrigger: {
                      containerAnimation: W,
                      trigger: b,
                      start: "left 92%",
                      end: "left 52%",
                      scrub: 0.8,
                      invalidateOnRefresh: !0,
                    },
                  },
                )),
              a)
            ) {
              let e = t[0],
                i = Number(a.dataset.speed ?? "1.1");
              gsap.fromTo(
                a,
                { x: 50, opacity: 1, scale: 1 },
                {
                  x: 0,
                  opacity: 1,
                  scale: () => {
                    let a, t, i, l;
                    return e
                      ? ((t = {
                          width: (602 * (a = window.innerHeight)) / 1080,
                          height: (808 * a) / 1080,
                        }),
                        ((i = expandedPortraitSize(e)),
                        (l = stageScale(e)),
                        { width: i.width * l, height: i.height * l }).width /
                          t.width)
                      : 1;
                  },
                  ease: "none",
                  immediateRender: !1,
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: b,
                    start: "left 90%",
                    end: "left 15%",
                    scrub: i,
                    invalidateOnRefresh: !0,
                  },
                },
              );
            }
          }
          let eI = (e) =>
              ((p?.getBoundingClientRect().width || 0.6 * window.innerWidth) *
                (e / 100)) /
              Math.max(
                Number.parseFloat(
                  getComputedStyle(eB).getPropertyValue("--campaign-scale"),
                ) || window.innerHeight / 1080,
                0.05,
              ),
            eF = (e, a) => {
              let t = Number.parseFloat(
                getComputedStyle(eB).getPropertyValue(e),
              );
              return Number.isFinite(t) ? t : a;
            },
            eW = 75 / 160,
            eH = 85 / 160;
          gsap.utils
            .toArray(".campaign-slideshow__quote-lead [data-speed]", e)
            .filter(
              (e) =>
                !e.classList.contains(
                  "campaign-slideshow__trans-headline-last",
                ),
            )
            .forEach((e) => {
              let a = Number(e.dataset.speed ?? "1"),
                t = e.classList.contains(
                  "campaign-slideshow__trans-lead-stack",
                ),
                i =
                  t || e.classList.contains("campaign-slideshow__trans-eyebrow")
                    ? 1
                    : Number(e.dataset.fromOpacity ?? "0"),
                l = gsap.timeline({
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: p,
                    start: "left 125%",
                    end: "left -35%",
                    scrub: Math.min(Math.max(a, 0.2), 0.35),
                    invalidateOnRefresh: !0,
                  },
                });
              (l.fromTo(
                e,
                {
                  x: () => eI(eF("--campaign-quote-lead-from-x", -28)),
                  y: 0,
                  opacity: i,
                },
                {
                  x: () => eI(eF("--campaign-quote-lead-x", 10)),
                  y: 0,
                  opacity: 1,
                  duration: eW,
                  ease: "none",
                },
                0,
              ),
                t
                  ? l.to(e, { opacity: 0, duration: eH, ease: "none" })
                  : l.to(e, {
                      x: () =>
                        eI(eF("--campaign-quote-lead-x", 10)) +
                        eI(eF("--campaign-quote-exit-drift-x", -42)),
                      opacity: 0,
                      duration: eH,
                      ease: "none",
                    }));
            });
          let eO = t[0],
            eU = eO?.querySelector(".campaign-slideshow__hero-texture"),
            eV = eO?.querySelector(".campaign-slideshow__hero-portrait"),
            eY = eO?.querySelector(".campaign-slideshow__hero-line-secondary"),
            eX = eO?.querySelectorAll(".campaign-slideshow__hero-line"),
            eG = eO?.querySelectorAll(
              ".campaign-slideshow__hero-body, .campaign-slideshow__hero-scroll",
            ),
            eD = eO?.querySelector(".campaign-slideshow__hero-cards");
          if (
            (eG?.length &&
              gsap.fromTo(
                eG,
                { opacity: 1, x: 40 },
                {
                  opacity: 0,
                  x: -360,
                  ease: "none",
                  immediateRender: !1,
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: eO,
                    start: "left left",
                    end: "left -22%",
                    scrub: 0.18,
                  },
                },
              ),
            eD &&
              gsap.fromTo(
                eD,
                { opacity: 1, x: 40 },
                {
                  opacity: 0,
                  x: -520,
                  ease: "none",
                  immediateRender: !1,
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: eO,
                    start: "left left",
                    end: "left -18%",
                    scrub: 0.15,
                  },
                },
              ),
            eO && eU && eV)
          ) {
            let e = eU.querySelector("img, picture"),
              a = eO.querySelector(".campaign-slideshow__hero-visual");
            (a && gsap.set(a, { x: 0, y: 0, clearProps: "opacity" }),
              e && gsap.set(e, { scale: 1, y: 0 }),
              gsap.set(eV, {
                x: 0,
                left: () => portraitLeft(eO),
                top: () => portraitSize(eO, ex).top,
                width: () => portraitSize(eO, ex).width,
                height: () => portraitSize(eO, ex).height,
              }),
              gsap.fromTo(
                eV,
                { left: () => portraitLeft(eO) },
                {
                  left: () =>
                    (function (e) {
                      let { width: a } = expandedPortraitSize(e);
                      return (stageHalfWidth(e) - a) / 2;
                    })(eO),
                  ease: "none",
                  immediateRender: !1,
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: eO,
                    start: "left left",
                    end: "left -40%",
                    scrub: 0.05,
                    invalidateOnRefresh: !0,
                  },
                },
              ));
          }
          (eY &&
            gsap.fromTo(
              eY,
              { opacity: 1, x: 40 },
              {
                opacity: 0,
                x: -760,
                ease: "none",
                immediateRender: !1,
                scrollTrigger: {
                  containerAnimation: W,
                  trigger: eO,
                  start: "left left",
                  end: "left -40%",
                  scrub: 0.35,
                },
              },
            ),
            eX?.length &&
              gsap.fromTo(
                eX,
                { opacity: 1, x: 40 },
                {
                  opacity: 0,
                  x: -140,
                  ease: "none",
                  immediateRender: !1,
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: eO,
                    start: "left left",
                    end: "left -40%",
                    scrub: 0.35,
                  },
                },
              ));
          let eK = _?.querySelector(
              ".campaign-slideshow__split-zoom-left-clip",
            ),
            eQ = _?.querySelector(".campaign-slideshow__split-zoom-right-clip");
          (eK &&
            gsap.fromTo(
              eK,
              { yPercent: -100 },
              {
                yPercent: 0,
                ease: "none",
                scrollTrigger: {
                  containerAnimation: W,
                  trigger: _,
                  start: "left 120%",
                  end: "left 40%",
                  scrub: 0.65,
                  invalidateOnRefresh: !0,
                },
              },
            ),
            eQ &&
              gsap.fromTo(
                eQ,
                { yPercent: 100 },
                {
                  yPercent: 0,
                  ease: "none",
                  scrollTrigger: {
                    containerAnimation: W,
                    trigger: _,
                    start: "left 120%",
                    end: "left 40%",
                    scrub: 0.65,
                    invalidateOnRefresh: !0,
                  },
                },
              ),
            (_ ? gsap.utils.toArray("[data-split-zoom-word]", _) : []).forEach(
              (e) => {
                let a = Number(e.dataset.fromX ?? "0"),
                  t = Number(e.dataset.enterStart ?? "90"),
                  i = Number(e.dataset.enterEnd ?? "30"),
                  l = Number(e.dataset.enterScrub ?? "0.65"),
                  n = e.hasAttribute("data-from-offscreen"),
                  s = e.hasAttribute("data-from-offscreen-bottom"),
                  r = e.hasAttribute("data-from-page-top"),
                  o = e.classList.contains(
                    "campaign-slideshow__split-zoom-quote-block",
                  ),
                  c = () => {
                    if (s) {
                      let a, t, i;
                      return (
                        (a = parseFloat(getComputedStyle(e).top)),
                        (t =
                          (e.getBoundingClientRect().height ||
                            e.offsetHeight ||
                            200) + Math.max(120, 0.2 * window.innerHeight)),
                        (i = window.innerHeight),
                        Number.isFinite(a) && a >= 0 ? i - a + t : i + t
                      );
                    }
                    if (n) return aboveViewport(e);
                    if (r) {
                      let a;
                      return Number.isFinite(
                        (a = parseFloat(getComputedStyle(e).top)),
                      ) && a > 0
                        ? -a - 40
                        : -window.innerHeight - 40;
                    }
                    return Number(e.dataset.fromY ?? "0");
                  };
                (gsap.set(e, { x: a, y: c }),
                  gsap.fromTo(
                    e,
                    { x: a, y: c, opacity: 1 },
                    {
                      x: 0,
                      y: 0,
                      opacity: 1,
                      ease: o ? "power2.out" : "none",
                      immediateRender: !1,
                      scrollTrigger: {
                        containerAnimation: W,
                        trigger: _,
                        start: `left ${t}%`,
                        end: `left ${i}%`,
                        scrub: l,
                        invalidateOnRefresh: !0,
                      },
                    },
                  ));
              },
            ));
        }, e);
        return () => {
          context.revert();
          for (const attr of [ed, em, eu])
            document.documentElement.removeAttribute(attr);
        };
      });
      return () => {
        motion.revert();
        resize.disconnect();
        stages.forEach((el, i) => {
          if (previous[i] === null) el.removeAttribute("style");
          else el.setAttribute("style", previous[i]);
        });
      };
    },
  );
  // Mobile keeps the original vertical reveal sequence and colour interpolation.
  layouts.add(
    {
      desktop:
        "(min-width:1025px), (min-width:768px) and (orientation:landscape) and (min-height:600px)",
      reduce: "(prefers-reduced-motion: reduce)",
      always: "all",
    },
    (context) => {
      if (context.conditions.desktop) return;
      const e = document.querySelector(".campaign-mobile");
      if (!e) return;
      const D = [
        ".campaign-mobile__section--split-type",
        ".campaign-mobile__split-zoom",
        ".campaign-mobile__section--split-lead",
      ];
      let a = (function (e) {
        let a = e.querySelector(".campaign-mobile__color-wash"),
          t = D.flatMap((a) => gsap.utils.toArray(a, e));
        if (!t.length) return () => {};
        let i = t.map((e) => e.dataset.campaignBg?.trim() || "#ffffff"),
          l = gsap.utils
            .toArray("[data-campaign-color-surface]", e)
            .filter((e) => t.some((a) => a.contains(e)));
        if (!l.length && !a) return () => {};
        let n = t[0]?.querySelector("[data-campaign-color-surface]"),
          s = () => {
            let e = window.innerHeight || 1,
              s =
                n?.getBoundingClientRect().top ??
                t[0].getBoundingClientRect().top,
              r = t[t.length - 1].getBoundingClientRect().top;
            if (s >= e || r <= 0)
              return void (a && gsap.set(a, { backgroundColor: "#ffffff" }));
            let o = i[0];
            for (let a = 0; a < t.length - 1; a++) {
              let l = t[a + 1].getBoundingClientRect().top,
                n = 1 - gsap.utils.clamp(0, 1, l / e);
              if (n <= 0) {
                o = i[a];
                break;
              }
              if (n < 1) {
                o = gsap.utils.interpolate(i[a], i[a + 1], n);
                break;
              }
              o = i[a + 1];
            }
            (gsap.set(l, { backgroundColor: o }),
              a && gsap.set(a, { backgroundColor: o }));
          };
        s();
        let r = ScrollTrigger.create({
          trigger: e,
          start: "top top",
          end: "bottom bottom",
          onUpdate: s,
          invalidateOnRefresh: !0,
        });
        return () => {
          r.kill();
        };
      })(e);
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return () => {
          a();
        };
      gsap.utils
        .toArray(".campaign-slideshow-cta, .campaign-mobile__video-card", e)
        .filter(
          (e) =>
            !e.closest(".campaign-mobile__section--split-type") &&
            !e.closest(".campaign-mobile__quote-band") &&
            !e.closest(".campaign-mobile__split-zoom"),
        )
        .forEach((e, a) => {
          gsap.from(e, {
            y: 28,
            opacity: 0,
            duration: 0.7,
            ease: "power2.out",
            delay: (a % 3) * 0.04,
            scrollTrigger: {
              trigger: e,
              start: "top 88%",
              toggleActions: "play none none none",
            },
          });
        });
      let t = e.querySelector(
          ".campaign-mobile__section--split-type .campaign-mobile__video-card",
        ),
        i = e.querySelector(
          ".campaign-mobile__section--split-type .campaign-mobile__media",
        );
      t &&
        i &&
        gsap.fromTo(
          t,
          { yPercent: 20, y: -36, opacity: 0 },
          {
            yPercent: 20,
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: i,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          },
        );
      let l = e.querySelector(".campaign-mobile__intro-headline"),
        n = gsap.utils.toArray(".campaign-mobile__intro-headline-line", e);
      l &&
        n.length &&
        gsap.from(n, {
          y: 36,
          opacity: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: l,
            start: "top 92%",
            toggleActions: "play none none none",
          },
        });
      let s = e.querySelector(".campaign-mobile__quote-band"),
        r = e.querySelector(".campaign-mobile__quote-band-grass"),
        o = e.querySelector(".campaign-mobile__quote-band-video"),
        c = e.querySelector(".campaign-mobile__quote-band-lead"),
        d = gsap.utils.toArray(
          ".campaign-mobile__quote-band-lead-eyebrow, .campaign-mobile__quote-band-lead-headline",
          e,
        );
      (o &&
        r &&
        gsap.from(o, {
          y: 28,
          opacity: 0,
          duration: 0.7,
          ease: "power2.out",
          scrollTrigger: {
            trigger: r,
            start: "top 55%",
            toggleActions: "play none none none",
          },
        }),
        c &&
          d.length &&
          gsap.from(d, {
            y: 36,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            stagger: 0.12,
            scrollTrigger: {
              trigger: s ?? c,
              start: "top 45%",
              toggleActions: "play none none none",
            },
          }));
      let u = e.querySelector(".campaign-mobile__quote-band-green"),
        p = gsap.utils.toArray(
          ".campaign-mobile__quote-band-quote, .campaign-mobile__quote-band-presence",
          e,
        );
      u &&
        p.length &&
        gsap.from(p, {
          x: -40,
          opacity: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.14,
          scrollTrigger: {
            trigger: u,
            start: "top 65%",
            toggleActions: "play none none none",
          },
        });
      let g = e.querySelector(".campaign-mobile__copy--split-type");
      if (g) {
        let e = g.querySelector(".campaign-mobile__split-type-quote");
        e &&
          gsap.from(e, {
            y: -40,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: {
              trigger: g,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          });
        let a = gsap.utils.toArray(
          ".campaign-mobile__split-type-eyebrow, .campaign-mobile__split-type-line--0",
          g,
        );
        a.length &&
          gsap.from(a, {
            x: -48,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            stagger: 0.08,
            scrollTrigger: {
              trigger: g,
              start: "top 80%",
              toggleActions: "play none none none",
            },
          });
        let t = g.querySelector(".campaign-mobile__split-type-line--side");
        t &&
          gsap.from(t, {
            x: -56,
            opacity: 0,
            duration: 0.85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: g,
              start: "top 78%",
              toggleActions: "play none none none",
            },
          });
        let i = g.querySelector(".campaign-mobile__split-type-line--2");
        i &&
          gsap.from(i, {
            x: 56,
            opacity: 0,
            duration: 0.85,
            ease: "power2.out",
            scrollTrigger: {
              trigger: g,
              start: "top 78%",
              toggleActions: "play none none none",
            },
          });
      }
      let h = e.querySelector(".campaign-mobile__split-zoom-copy"),
        f = gsap.utils.toArray(".campaign-mobile__split-zoom-block", h ?? e);
      h &&
        f.length &&
        gsap.from(f, {
          y: -40,
          opacity: 0,
          duration: 0.75,
          ease: "power2.out",
          stagger: 0.12,
          scrollTrigger: {
            trigger: h,
            start: "top 78%",
            toggleActions: "play none none none",
          },
        });
      let _ = e.querySelector(".campaign-mobile__split-zoom-video"),
        y = e.querySelector(".campaign-mobile__split-zoom-image");
      _ &&
        y &&
        gsap.fromTo(
          _,
          { yPercent: 20, y: -36, opacity: 0 },
          {
            yPercent: 20,
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: y,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          },
        );
      let x = e.querySelector(".campaign-mobile__copy--split-lead");
      if (x) {
        let e = gsap.utils.toArray(".campaign-mobile__split-lead-kicker", x);
        e.length &&
          gsap.from(e, {
            y: -40,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: x,
              start: "top 75%",
              toggleActions: "play none none none",
            },
          });
        let a = x.querySelector(".campaign-mobile__split-lead-from-right");
        a &&
          gsap.from(a, {
            x: 64,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: x,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          });
        let t = x.querySelector(".campaign-mobile__split-lead-from-left");
        t &&
          gsap.from(t, {
            x: -64,
            opacity: 0,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: x,
              start: "top 70%",
              toggleActions: "play none none none",
            },
          });
      }
      let b = e.querySelector(".campaign-slideshow-cta-section"),
        w = b?.querySelector(".campaign-slideshow-cta-section__heading"),
        j = b?.querySelector(".campaign-slideshow-cta-section__heading-up"),
        N = b?.querySelector(".campaign-slideshow-cta-section__heading-next");
      return (
        w &&
          j &&
          N &&
          (gsap.from(j, {
            x: -48,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: {
              trigger: w,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          }),
          gsap.from(N, {
            x: 48,
            opacity: 0,
            duration: 0.75,
            ease: "power2.out",
            scrollTrigger: {
              trigger: w,
              start: "top 85%",
              toggleActions: "play none none none",
            },
          })),
        () => {
          a();
        }
      );
    },
  );
  // Final links reveal after the pinned horizontal sequence ends.
  layouts.add(
    {
      desktop:
        "(min-width:1025px), (min-width:768px) and (orientation:landscape) and (min-height:600px)",
      reduce: "(prefers-reduced-motion: reduce)",
      always: "all",
    },
    (context) => {
      if (!context.conditions.desktop || context.conditions.reduce) return;
      root.querySelectorAll(".campaign-up-next__item").forEach((item) => {
        const inner = item.querySelector(".campaign-up-next__item-inner");
        if (inner)
          gsap.fromTo(
            inner,
            { y: "100%", opacity: 0 },
            {
              y: "0%",
              opacity: 1,
              ease: "none",
              scrollTrigger: {
                trigger: item,
                start: "top 92%",
                end: "top 58%",
                scrub: 0.65,
              },
            },
          );
      });
    },
  );
})();
