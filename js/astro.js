/* ===== The Witch Atelier — the actual sky =====

   The horoscope used to hand out fixed sign dates copied from a table, which is
   wrong by a day or so most years, because the Sun does not enter Virgo at the
   same clock time every August. This computes the positions instead.

   Standard low precision formulae (Meeus, Astronomical Algorithms):
     Sun    : about 0.01 degrees, which is far better than we need
     Moon   : about 0.3 degrees in longitude, good enough to name the sign and
              the phase, and honest about not being an ephemeris

   Everything is tropical longitude, measured from the vernal equinox, which is
   the frame western astrology actually uses. No network, no tables to go stale,
   and it works for any date the visitor's clock reports. */
(function () {
  const RAD = Math.PI / 180;
  const norm = a => ((a % 360) + 360) % 360;
  const sin = a => Math.sin(a * RAD);
  const cos = a => Math.cos(a * RAD);

  /* Julian Day from a JS Date, which is already UTC underneath */
  const jd = d => d.getTime() / 86400000 + 2440587.5;
  const days = d => jd(d) - 2451545.0;          // days from J2000.0

  /* Sun: mean longitude, mean anomaly, then the equation of centre */
  function sunLon(d) {
    const n = days(d);
    const L = 280.460 + 0.9856474 * n;
    const g = 357.528 + 0.9856003 * n;
    return norm(L + 1.915 * sin(g) + 0.020 * sin(2 * g));
  }

  /* Moon: the four largest periodic terms, which is what fits in a page like
     this. Enough to place it in a sign and to say how lit it is. */
  function moonLon(d) {
    const n = days(d);
    const Lp = 218.316 + 13.176396 * n;         // mean longitude
    const M  = 134.963 + 13.064993 * n;         // mean anomaly
    const Mp = 357.529 + 0.98560028 * n;        // sun's mean anomaly
    const D  = 297.850 + 12.190749 * n;         // mean elongation
    const F  =  93.272 + 13.229350 * n;         // argument of latitude
    return norm(Lp
      + 6.289 * sin(M)
      - 1.274 * sin(M - 2 * D)
      + 0.658 * sin(2 * D)
      - 0.186 * sin(Mp)
      - 0.059 * sin(2 * M - 2 * D)
      - 0.057 * sin(M - 2 * D + Mp)
      + 0.053 * sin(M + 2 * D)
      + 0.046 * sin(2 * D - Mp)
      + 0.041 * sin(M - Mp)
      - 0.035 * sin(D)
      - 0.031 * sin(M + Mp)
      - 0.015 * sin(2 * F - 2 * D)
      + 0.011 * sin(M - 4 * D));
  }

  const SIGN_IDS = ['aries', 'tauro', 'geminis', 'cancer', 'leo', 'virgo',
                    'libra', 'escorpio', 'sagitario', 'capricornio', 'acuario', 'piscis'];

  /* a longitude, split into the sign it falls in and the degree within it */
  function place(lon) {
    const i = Math.floor(norm(lon) / 30);
    return { id: SIGN_IDS[i], index: i, degree: norm(lon) - i * 30 };
  }

  /* The eight phases everyone recognises, from the Moon's elongation from the
     Sun. Illumination is the standard (1 - cos) / 2. */
  const PHASES = ['new', 'waxing_crescent', 'first_quarter', 'waxing_gibbous',
                  'full', 'waning_gibbous', 'last_quarter', 'waning_crescent'];
  function moonPhase(d) {
    const e = norm(moonLon(d) - sunLon(d));
    /* The four principal phases get a narrow window of their own, about a day
       and a half wide, and the crescents and gibbous moons fill the rest. An
       even eight way split would call a 158 degree moon "full", which nobody
       looking up at it would. */
    let phase;
    if (e < 7.5 || e > 352.5) phase = 'new';
    else if (e < 82.5) phase = 'waxing_crescent';
    else if (e < 97.5) phase = 'first_quarter';
    else if (e < 172.5) phase = 'waxing_gibbous';
    else if (e < 187.5) phase = 'full';
    else if (e < 262.5) phase = 'waning_gibbous';
    else if (e < 277.5) phase = 'last_quarter';
    else phase = 'waning_crescent';
    return { elongation: e, phase, illumination: (1 - cos(e)) / 2, waxing: e < 180 };
  }

  /* The moment the Sun crosses into a sign, found by bisection on longitude.
     Called twelve times a year at most, so a plain search is the right tool. */
  function ingress(year, signIndex) {
    const idx = t => place(sunLon(new Date(t))).index;
    const start = Date.UTC(year, 0, 1);
    /* walk the year a day at a time to find the day the sign changes, then
       bisect inside that day. Every sign is entered exactly once per year, so
       one scan finds it without any guessing about where to start. */
    let lo = null;
    for (let i = 1; i <= 366; i++) {
      const a = start + (i - 1) * 86400000, b = start + i * 86400000;
      if (idx(a) !== signIndex && idx(b) === signIndex) { lo = a; break; }
    }
    if (lo === null) return new Date(start);
    let hi = lo + 86400000;
    for (let i = 0; i < 40; i++) {
      const mid = (lo + hi) / 2;
      if (idx(mid) === signIndex) hi = mid; else lo = mid;
    }
    return new Date(hi);
  }

  /* The dates this sign actually runs between, for the year in question */
  function signDates(signIndex, year) {
    const start = ingress(year, signIndex);
    const nextIdx = (signIndex + 1) % 12;
    /* the next sign may be entered in this calendar year or the following one:
       take whichever ingress actually comes after this one */
    let next = ingress(year, nextIdx);
    if (next <= start) next = ingress(year + 1, nextIdx);
    return { start, end: new Date(next.getTime() - 86400000) };
  }

  /* Which sign a birth date falls in, computed rather than looked up. Noon is
     used because we do not ask for a birth time, and noon is the least wrong
     guess: it halves the worst case error on a cusp day. */
  function signOfDate(y, m, day) {
    return place(sunLon(new Date(Date.UTC(y, m - 1, day, 12))));
  }

  /* ---------- the ephemeris ----------

     Everything below is the Sun and the Moon and nothing else, which is a
     deliberate limit. The two of them can be had to a couple of arcminutes from
     the series already above; the planets would need their own orbital elements
     and would be a different order of both code and of being wrong.

     Nothing here needs to know where the reader is. Sunrise and moonrise do,
     and this site does not ask, so they are not here.                        */

  /* The next moment the Moon reaches a given elongation from the Sun: 0 for a
     new moon, 180 for a full one. Walked in six hour steps to find the bracket,
     then bisected, because elongation runs forward at about twelve degrees a
     day and never doubles back. */
  function nextPhase(from, wanted) {
    const at = t => norm(moonLon(new Date(t)) - sunLon(new Date(t)) - wanted);
    let lo = from.getTime();
    const STEP = 6 * 3600000;
    for (let i = 0; i < 4 * 40; i++) {
      const hi = lo + STEP;
      /* the wrap from 359 back to 0 is the crossing we are looking for */
      if (at(lo) > 270 && at(hi) < 90) {
        for (let k = 0; k < 40; k++) {
          const mid = (lo + hi) / 2;
          if (at(mid) > 270) lo = mid; else return new Date(mid);
        }
        return new Date(hi);
      }
      lo = hi;
    }
    return null;
  }

  /* When the Moon leaves the sign it is in. It moves about half a degree an
     hour, so a sign lasts two and a bit days and the search is short. */
  function moonIngress(from) {
    const here = place(moonLon(from)).index;
    let lo = from.getTime();
    const STEP = 3600000;
    for (let i = 0; i < 24 * 4; i++) {
      let hi = lo + STEP;
      if (place(moonLon(new Date(hi))).index !== here) {
        for (let k = 0; k < 30; k++) {
          const mid = (lo + hi) / 2;
          if (place(moonLon(new Date(mid))).index === here) lo = mid; else hi = mid;
        }
        return { at: new Date(hi), into: place(moonLon(new Date(hi))).index };
      }
      lo = hi;
    }
    return null;
  }

  /* The twenty eight lunar mansions, the older division of the Moon's path that
     the almanacs used before the twelve signs took over. The names are the
     Arabic ones, which is how they reached Europe. */
  const MANSIONS = [
    'Al Sharatain', 'Al Butain', 'Al Thurayya', 'Al Dabaran', 'Al Haqa', 'Al Hana',
    'Al Dhira', 'Al Nathra', 'Al Tarf', 'Al Jabha', 'Al Zubra', 'Al Sarfa',
    'Al Awwa', 'Al Simak', 'Al Ghafr', 'Al Zubana', 'Iklil al Jabha', 'Al Qalb',
    'Al Shaula', 'Al Naaim', 'Al Balda', 'Sad al Dhabih', 'Sad Bula', 'Sad al Suud',
    'Sad al Akhbiya', 'Al Fargh al Mukdim', 'Al Fargh al Mukhir', 'Batn al Hut',
  ];
  function mansion(d) {
    const i = Math.floor(norm(moonLon(d)) / (360 / 28));
    return { index: i, number: i + 1, name: MANSIONS[i] };
  }

  /* The planet that rules the day, in the Chaldean order the week is named
     from. Sunday is the Sun and it runs from there. */
  const RULERS = ['sun', 'moon', 'mars', 'mercury', 'jupiter', 'venus', 'saturn'];
  const dayRuler = d => RULERS[(d || new Date()).getDay()];

  /* degrees as a reader expects to see them, whole degrees and arcminutes */
  function dms(deg) {
    const w = Math.floor(deg);
    return { deg: w, min: Math.round((deg - w) * 60) };
  }

  function sky(date) {
    const d = date || new Date();
    const s = place(sunLon(d));
    const m = place(moonLon(d));
    return { date: d, sun: s, moon: m, phase: moonPhase(d) };
  }

  /* The whole day's reading, in one call, for the panel that shows it. */
  function ephemeris(date) {
    const d = date || new Date();
    const s = place(sunLon(d));
    const m = place(moonLon(d));
    const ph = moonPhase(d);
    /* the Sun's next sign, and the day it enters it */
    const nextSign = (s.index + 1) % 12;
    const y = d.getUTCFullYear();
    let sunEnters = ingress(y, nextSign);
    if (sunEnters <= d) sunEnters = ingress(y + 1, nextSign);
    return {
      date: d,
      sun: { ...s, ...dms(s.degree), enters: { sign: SIGN_IDS[nextSign], at: sunEnters } },
      moon: { ...m, ...dms(m.degree), leaves: moonIngress(d) },
      phase: ph,
      newMoon: nextPhase(d, 0),
      fullMoon: nextPhase(d, 180),
      mansion: mansion(d),
      ruler: dayRuler(d),
    };
  }

  window.ASTRO = {
    SIGN_IDS, MANSIONS, RULERS,
    sunLon, moonLon, moonPhase, place, ingress, signDates, signOfDate, sky, jd,
    nextPhase, moonIngress, mansion, dayRuler, dms, ephemeris,
  };
})();
