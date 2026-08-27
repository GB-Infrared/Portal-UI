import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

/**
 * The Earth · the site overview's picture, ported from the mockups.
 *
 * WHAT REPLACED WHAT. This screen used to draw an orbit: sites spaced evenly
 * around a ring, in the order the backend listed them, with position encoding
 * NOTHING. That was honest about being a picker and dishonest about being a
 * map — an operator looking at a fleet wants to know where a site IS, because
 * it decides which crew goes and how long they are on the road. So the ring is
 * gone and this is the planet, with every site at its own coordinates.
 *
 * IT IS ONE FRAGMENT SHADER. A full-viewport triangle, and for every pixel the
 * shader works out whether it is on the ball, in the air around it, or in open
 * sky, then samples whichever plate answers. No geometry, no mesh, no seams —
 * an orthographic sphere is a circle with a height field, and the height field
 * is one square root.
 *
 * FOUR PLATES, ALL FROM PUBLIC/ rather than inlined. The mockup carries them as
 * base64 because it has to open straight off disk with no server; a bundle has
 * no such excuse, and 1.9 MB of base64 parsed on every page load to draw one
 * picture is a bundle nobody can cache.
 *   earth-day     NASA Blue Marble — the lit face
 *   earth-night   NASA Black Marble — cities, coming up THROUGH dusk
 *   earth-region  the fleet's own ground, cross-faded in on the way down
 *   sky           NASA Deep Star Maps — the actual Milky Way, behind everything
 *
 * NOTHING ON IT IS SIMULATED except the sun, and the sun is not simulated
 * either: subsolar() is the real subsolar point for the viewer's own clock, so
 * the terminator is where it actually is. For a solar fleet that IS the weather.
 *
 * WITH NO WEBGL it renders nothing and says so through `onStatus`, rather than
 * drawing a worse picture that claims to be the same one.
 */

const D2R = Math.PI / 180;

/* the fleet's own ground, west/south/east/north in degrees */
const REGION = [66, 22, 80, 34];

const VERT =
  'attribute vec2 a;' +
  'void main(){ gl_Position=vec4(a,0.0,1.0); }';

/* r is the distance from the centre of the disc in radii, so r<=1 is the ball
   and everything past it is air. z is the height of the sphere above the screen
   at that point — the only piece of 3D in the entire shader. */
const FRAG =
  'precision highp float;' +
  'uniform vec2 uRes; uniform vec2 uC; uniform float uR;' +
  'uniform vec3 uE, uN, uV, uSun;' +
  'uniform sampler2D uDay, uNight, uSky, uRegion;' +
  'uniform vec4 uRegBox;' +
  'uniform float uRegMix, uSkyK, uSkySpin;' +
  'const float PI=3.141592653589793;' +
  'void main(){' +
  '  vec2 p=vec2(gl_FragCoord.x, uRes.y-gl_FragCoord.y);' +
  '  vec2 d=(p-uC)/uR;' +
  '  float r=length(d);' +
  /* one pixel, in radii — the width the limb is feathered over, so it stays
     smooth at every zoom instead of stair-stepping */
  '  float px=1.4/uR;' +
  '  float inside=1.0-smoothstep(1.0-px,1.0+px,r);' +
  '  float z=sqrt(max(0.0,1.0-min(r,1.0)*min(r,1.0)));' +
  '  vec3 P=d.x*uE+(-d.y)*uN+z*uV;' +
  '  float lat=asin(clamp(P.z,-1.0,1.0));' +
  '  float lng=atan(P.y,P.x);' +
  '  vec2 uv=vec2(lng/(2.0*PI)+0.5, 0.5-lat/PI);' +
  '  float cosz=dot(P,uSun);' +
  /* the global plate is one photograph of a whole planet: magnificent at arm's
     length, four hundred metres to the pixel up close. So the fleet's own
     ground rides in a second plate and cross-fades in on the way down, its edge
     feathered rather than cut — a rectangle of sharper ground over a blurrier
     planet is a window, and a window would give the descent away */
  '  vec3 dayC=texture2D(uDay,uv).rgb;' +
  '  vec2 g=vec2(degrees(lng),degrees(lat));' +
  '  vec2 ruv=vec2((g.x-uRegBox.x)/(uRegBox.z-uRegBox.x),' +
  '                (uRegBox.w-g.y)/(uRegBox.w-uRegBox.y));' +
  '  float edge=smoothstep(0.0,0.06,ruv.x)*smoothstep(1.0,0.94,ruv.x)' +
  '            *smoothstep(0.0,0.06,ruv.y)*smoothstep(1.0,0.94,ruv.y);' +
  '  dayC=mix(dayC,texture2D(uRegion,ruv).rgb,clamp(uRegMix,0.0,1.0)*edge);' +
  /* Lambert, gamma-softened so the tropics do not blow out, over an ambient
     floor that keeps the dark side a place rather than a hole */
  '  float lam=max(cosz,0.0);' +
  '  vec3 earth=dayC*(0.055+1.06*pow(lam,0.60));' +
  /* the cities come up THROUGH dusk: a city does not switch on at the
     terminator, it fades in as the sky goes out */
  '  vec3 ntC=texture2D(uNight,uv).rgb;' +
  '  float nAmt=smoothstep(0.12,-0.10,cosz);' +
  '  earth+=ntC*nAmt*1.32;' +
  /* dawn and dusk ON the surface: sunlight through a very long slant of air */
  '  float tw=exp(-(cosz*cosz)/0.0105);' +
  '  earth+=vec3(1.00,0.42,0.15)*tw*0.115;' +
  '  earth*=mix(1.06,0.74,smoothstep(0.62,1.0,r));' +
  /* the air seen edge-on, and only where the sun is on it */
  '  float rimLit=smoothstep(-0.30,0.30,cosz);' +
  '  earth+=vec3(0.40,0.62,0.95)*smoothstep(0.86,1.0,r)*0.55*rimLit;' +
  /* AIRGLOW — the thin luminous band hugging the NIGHT limb, oxygen
     recombining around 90km up. It is in every photograph taken from the
     station, and without it a night limb just stops. */
  '  float ag=smoothstep(0.88,1.0,r)*smoothstep(0.22,-0.18,cosz);' +
  '  earth+=vec3(0.16,0.86,0.60)*ag*0.34;' +
  /* the halo, a crescent because the air is only lit where the sun is */
  '  vec2 dn=d/max(r,1e-4);' +
  '  vec3 Pl=dn.x*uE+(-dn.y)*uN;' +
  '  float cl=dot(Pl,uSun);' +
  '  float atmo=smoothstep(1.30,1.0,r);' +
  '  atmo=atmo*atmo*0.58;' +
  '  atmo*=0.10+0.90*smoothstep(-0.55,0.35,cl);' +
  '  float sunset=exp(-(cl*cl)/0.075);' +
  '  vec3 air=mix(vec3(0.46,0.70,1.0),vec3(1.00,0.50,0.20),sunset*0.60);' +
  /* and behind all of it the real sky. The screen point is turned back into a
     direction on the celestial sphere and uSkySpin carries sidereal time, which
     is what puts the galaxy in the right place for the HOUR rather than merely
     somewhere. */
  '  vec2 sd=(p-uC)/uSkyK;' +
  '  float b=length(sd);' +
  '  vec3 tang=(b>1e-5)?normalize(sd.x*uE+(-sd.y)*uN):uE;' +
  '  vec3 dir=(-uV)*cos(b)+tang*sin(b);' +
  '  float slat=asin(clamp(dir.z,-1.0,1.0));' +
  '  float slng=atan(dir.y,dir.x)+uSkySpin;' +
  '  vec3 skyC=texture2D(uSky,vec2(slng/(2.0*PI)+0.5,0.5-slat/PI)).rgb;' +
  '  float skyA=clamp(max(max(skyC.r,skyC.g),skyC.b)*2.6,0.0,1.0);' +
  /* source-over, bottom up: sky, then air, then ball */
  '  vec3 pre=earth*inside+air*atmo*(1.0-inside);' +
  '  float al=inside+atmo*(1.0-inside);' +
  '  pre+=skyC*skyA*(1.0-al);' +
  '  al+=skyA*(1.0-al);' +
  '  if(al>0.001) pre/=al;' +
  '  gl_FragColor=vec4(pre,al);' +
  '}';

/* ---- where the sun actually is ----
   The subsolar point: the one spot on Earth with the sun straight overhead.
   Standard low-precision solar position — good to a fraction of a degree, which
   at this scale is a fraction of a pixel, and far better than the hour the
   terminator would have to be wrong by before anyone could notice. */
function subsolar(when) {
  const n = when / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.460 + 0.9856474 * n) * D2R;
  const g = (357.528 + 0.9856003 * n) * D2R;
  const lamS = L + (1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * D2R;
  const eps = (23.439 - 0.0000004 * n) * D2R;
  const dec = Math.asin(Math.sin(eps) * Math.sin(lamS));
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lamS), Math.cos(lamS));
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24;
  let lng = ra / D2R - gmst * 15;
  lng = ((lng + 180) % 360 + 360) % 360 - 180;
  return { lat: dec / D2R, lng };
}
function gmstDeg(when) {
  const d = when / 86400000 + 2440587.5 - 2451545.0;
  return ((((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24) * 15;
}

/* the shortest way round: turning from 179° to -179° is two degrees east, not
   three hundred and fifty-eight west */
const angTo = (a, b) => ((b - a + 540) % 360) - 180;

/**
 * @param {{lng:number,lat:number}} home  where the camera rests and returns to
 * @param {(project:Function)=>void} onFrame  called every frame with a projector
 * @param {(state:{gl:boolean,down:boolean})=>void} [onStatus]
 */
export const Globe = forwardRef(function Globe({ home, onFrame, onStatus, hudTop = 62, hudBottom = 74 }, ref) {
  const glRef = useRef(null);      // the photograph
  const camRef = useRef(null);     // everything that moves, kept out of React

  /* THE CAMERA IS A REF, NOT STATE. It changes sixty times a second while the
     world is turning, and a component that re-rendered on each of those would
     be re-rendering the rail, the card and the summary to move a globe. */
  if (!camRef.current) {
    camRef.current = {
      LAM: home ? home.lng : 0, PHI: home ? home.lat : 0,
      tLAM: home ? home.lng : 0, tPHI: home ? home.lat : 0,
      sinP: Math.sin((home ? home.lat : 0) * D2R),
      cosP: Math.cos((home ? home.lat : 0) * D2R),
      ZOOM: 1, tZOOM: 1, FLY: false, REGMIX: 0, idle: 0, DIVE: null,
      W: 0, H: 0, CX: 0, CY: 0, R0: 200, R: 200, SKYK: 540
    };
  }
  const cam = camRef.current;

  /* DESC_Z is where a fly-down stops: about eight degrees across the frame,
     which is the whole fleet with room around it and the regional plate at very
     nearly its native resolution. Past that you are enlarging pixels. */
  const MAXZ = 34, DESC_Z = 22;

  /* HOW FAR A DEPARTURE GOES, and it is deliberately past the ceiling every
     other motion on this page obeys. MAXZ is the limit on BROWSING - the point
     past which you are enlarging pixels rather than learning anything, which is
     the right limit for somebody looking. Held to it, a departure beginning
     where a descent already parked the camera has 22 to 34 to travel in: about
     one and a half times, spread over a second, which is not a fall. It is a
     still frame with a shutter closing over it. The ground goes soft near the
     bottom, and that is not a defect being tolerated - you are going THROUGH
     it, behind a closing iris, and ground that stayed crisp while it rushed
     past would read as a zoom rather than a descent. */
  const GO_Z = 92;

  useImperativeHandle(ref, () => ({
    /* take me closer to this one */
    descend(p) {
      cam.tLAM = p.lng;
      cam.tPHI = Math.max(-78, Math.min(78, p.lat));
      cam.tZOOM = DESC_Z; cam.FLY = true; cam.idle = -1e9;
    },
    /* and back out — a wordless way up that zoom buttons alone do not give,
       since they zoom in place rather than re-centring on the fleet */
    orbit() {
      cam.tLAM = home ? home.lng : 0;
      cam.tPHI = home ? home.lat : 0;
      cam.tZOOM = 1; cam.FLY = true; cam.idle = 0;
    },
    /* GOING THERE, rather than easing towards it.
       descend() hands the camera a TARGET and lets the frame loop chase it,
       which is right for browsing: it decelerates into place, a drag can
       interrupt it, and it gives up once it arrives. None of that suits a
       departure. This one has to finish, has to finish ON TIME because a
       navigation is timed against it, and above all has to ACCELERATE - an
       exponential approach slows as it lands, which is the feel of arriving,
       and this is the feel of falling. So the camera is ASSIGNED its position
       from a script, and the easing is skipped entirely while it runs.

       THE TWO CURVES ARE THE WHOLE EFFECT, and having them the same way round
       ruins it. A degree of longitude crosses more of the screen the closer the
       camera is, so a pan still running at 30x throws the site clean off the
       side of the frame. The pan is ease-OUT and is done early; the fall is
       ease-IN and has barely begun by then. The camera arrives ABOVE the site,
       and only then goes down. */
    dive(p, ms) {
      cam.DIVE = {
        t: 0, dur: Math.max(0.2, (ms || 1000) / 1000),
        lam0: cam.LAM, dLam: angTo(cam.LAM, p.lng),
        phi0: cam.PHI, phi1: Math.max(-78, Math.min(78, p.lat)),
        lz0: Math.log(cam.ZOOM), lz1: Math.log(GO_Z)
      };
      cam.FLY = false;
      cam.idle = -1e9;   /* and the idle return does not get to interrupt it */
    },
    zoomBy(f) { cam.tZOOM = Math.max(1, Math.min(MAXZ, cam.tZOOM * f)); cam.FLY = false; },
    isDown() { return cam.ZOOM > 2.2; }
  }), [cam, home]);

  useEffect(() => {
    const cv = glRef.current;
    if (!cv) return undefined;
    /* THE CANVAS MEASURES ITS PARENT, not a wrapper of its own. A wrapper is one
       more box that can disagree with the box the CHIPS are positioned in — and
       when it did, the plates were sized to 870x296 while the sites were placed
       in a 900x438 theatre, so the picture and the fleet on it were drawn to two
       different worlds. One box, and it is the one everything else uses. */
    const wrap = cv.parentElement;
    if (!wrap) return undefined;

    const gl = cv.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: false });
    if (!gl) { if (onStatus) onStatus({ gl: false, down: false }); return undefined; }

    let prog = null, texReady = false;
    const uni = {};
    try {
      const sh = (t, src) => {
        const o = gl.createShader(t);
        gl.shaderSource(o, src); gl.compileShader(o);
        if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
        return o;
      };
      prog = gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      /* ONE triangle covering the viewport, not two making a quad: the shared
         diagonal of a quad is a seam the rasteriser has to think about twice */
      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const loc = gl.getAttribLocation(prog, 'a');
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

      ['uRes', 'uC', 'uR', 'uE', 'uN', 'uV', 'uSun', 'uDay', 'uNight', 'uSky',
       'uRegion', 'uRegBox', 'uRegMix', 'uSkyK', 'uSkySpin']
        .forEach(n => { uni[n] = gl.getUniformLocation(prog, n); });

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);

      const upload = (tex, img, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        /* the plate is stored with row 0 at the north pole and the shader's v
           runs the same way, so the image is NOT flipped */
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
        /* REPEAT across longitude so the antimeridian has no seam; CLAMP down
           the poles, where there is nothing to wrap to. Unit 3 is the regional
           inset — a rectangle of ground, not a globe — so it clamps both ways,
           or it would tile its own west edge across the east one the moment a
           descent overshot it. LINEAR without mipmaps: the wrap makes the
           coordinate jump a whole turn at the seam, and a mip level chosen from
           that jump would blur one column to mush. */
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, unit === 3 ? gl.CLAMP_TO_EDGE : gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      };

      /* FOUR plates, and the latch waits for all of them: the shader samples
         every one in the same instruction stream, so a frame drawn with three
         up is a frame with a hole in it. */
      const SRC = ['/earth-day.jpg', '/earth-night.jpg', '/sky.jpg', '/earth-region.jpg'];
      const texes = SRC.map(() => gl.createTexture());
      let up = 0;
      SRC.forEach((src, i) => {
        const im = new Image();
        im.onload = () => {
          upload(texes[i], im, i);
          if (++up < SRC.length) return;
          gl.uniform1i(uni.uDay, 0); gl.uniform1i(uni.uNight, 1);
          gl.uniform1i(uni.uSky, 2); gl.uniform1i(uni.uRegion, 3);
          gl.uniform4f(uni.uRegBox, REGION[0], REGION[1], REGION[2], REGION[3]);
          texReady = true;
          if (onStatus) onStatus({ gl: true, down: false });
        };
        im.src = src;
      });
    } catch (err) {
      prog = null;
      if (onStatus) onStatus({ gl: false, down: false });
    }

    /* ---- the box ----
       The bar and the summary float ON the field rather than cropping it, so
       the canvas is the whole window and these two numbers are the only place
       that knows where the free part of it starts and ends. */
    function size() {
      const r = wrap.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      cam.W = r.width; cam.H = r.height;
      cv.width = Math.round(r.width * dpr); cv.height = Math.round(r.height * dpr);
      cv.style.width = r.width + 'px'; cv.style.height = r.height + 'px';
      cam.CX = cam.W / 2;
      /* centred on what is LEFT, not on the window: a globe centred on the
         window sits low, because the strip at the foot is taller than the bar */
      cam.CY = (hudTop + (cam.H - hudBottom)) / 2;
      /* NOT sized to fill the box. The readouts stand outside it and need a
         clear channel: a card, its margin and enough leader to read as a leader
         is about 300px a side. Sizing the sphere to the box and letting the
         cards fall where they may is how you get a picker with its own numbers
         lying across the world. */
      cam.R0 = Math.max(120, Math.min((cam.W - 600) / 2, (cam.H - hudTop - hudBottom - 120) / 2));
      cam.R = cam.R0 * cam.ZOOM;
      cam.SKYK = Math.hypot(cam.W / 2, cam.H / 2) / (Math.PI / 2);
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(wrap);

    /* ---- turning the world ----
       Drag anywhere on the field. Vertical drag is clamped short of the poles,
       because an orthographic globe tipped past about eighty degrees stops
       reading as a globe and starts reading as a disc with a bent grid on it.

       Letting go does not strand you: after a few idle seconds the camera eases
       back to the fleet. This is a front door, and a front door you can get lost
       on is worse than one that does not turn at all. */
    let drag = null;
    const onDown = e => {
      drag = { x: e.clientX, y: e.clientY, lam: cam.tLAM, phi: cam.tPHI, moved: 0 };
      cam.FLY = false;
      wrap.setPointerCapture && wrap.setPointerCapture(e.pointerId);
    };
    const onMove = e => {
      if (!drag) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved = Math.max(drag.moved, Math.hypot(dx, dy));
      const k = 0.32 / cam.ZOOM;
      cam.tLAM = drag.lam - dx * k;
      cam.tPHI = Math.max(-78, Math.min(78, drag.phi + dy * k));
      cam.idle = 0;
    };
    const onUp = () => { drag = null; };
    const onWheel = e => {
      e.preventDefault();
      cam.tZOOM = Math.max(1, Math.min(MAXZ, cam.tZOOM * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
      cam.FLY = false; cam.idle = 0;
    };
    wrap.addEventListener('pointerdown', onDown);
    wrap.addEventListener('pointermove', onMove);
    wrap.addEventListener('pointerup', onUp);
    wrap.addEventListener('pointercancel', onUp);
    wrap.addEventListener('wheel', onWheel, { passive: false });

    /* the camera basis, built once per frame */
    const basis = () => {
      const cl = Math.cos(cam.LAM * D2R), sl = Math.sin(cam.LAM * D2R);
      return {
        e: [-sl, cl, 0],
        n: [-cam.sinP * cl, -cam.sinP * sl, cam.cosP],
        v: [cam.cosP * cl, cam.cosP * sl, cam.sinP]
      };
    };

    /* ---- the projection ----
       Orthographic: the view from far enough away that the sphere reads as a
       sphere. `c` is the cosine of the angular distance from the centre of the
       view, so it is positive exactly when a point is on the side of the world
       facing us — one number that both projects a point and answers "can this
       be seen from here". */
    const project = (lng, lat) => {
      const dl = (lng - cam.LAM) * D2R, la = lat * D2R;
      const cl = Math.cos(la), sl = Math.sin(la), cd = Math.cos(dl);
      return {
        x: cam.CX + cam.R * cl * Math.sin(dl),
        y: cam.CY - cam.R * (cam.cosP * sl - cam.sinP * cl * cd),
        c: cam.sinP * sl + cam.cosP * cl * cd,
        R: cam.R, CX: cam.CX, CY: cam.CY
      };
    };

    let raf = 0, last = performance.now(), wasDown = false;
    const reduced = typeof matchMedia === 'function' &&
      matchMedia('(prefers-reduced-motion: reduce)').matches;

    function frame(now) {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cam.idle += dt;

      if (cam.DIVE) {
        /* the camera is ASSIGNED its position for this instant of the fall. The
           targets are dragged along behind it so that if a dive were ever
           cancelled mid-air, the easing would resume from where the camera
           actually is rather than snapping back to where it was pointed. */
        const dv = cam.DIVE;
        dv.t += dt;
        const u = Math.min(1, dv.t / dv.dur);
        const pan = 1 - Math.pow(1 - u, 3);   /* over first — ease out */
        const fall = u * u * u;               /* down after — ease in  */
        cam.LAM = dv.lam0 + dv.dLam * pan;
        const ph = dv.phi0 + (dv.phi1 - dv.phi0) * pan;
        cam.PHI = ph;
        cam.sinP = Math.sin(ph * D2R);
        cam.cosP = Math.cos(ph * D2R);
        cam.ZOOM = Math.exp(dv.lz0 + (dv.lz1 - dv.lz0) * fall);
        cam.tLAM = cam.LAM; cam.tPHI = cam.PHI; cam.tZOOM = cam.ZOOM;
      } else {
        /* nobody has touched it for a while, so it goes home */
        if (!drag && cam.idle > 7 && !reduced) {
          cam.tLAM = home ? home.lng : 0;
          cam.tPHI = home ? home.lat : 0;
          cam.tZOOM = 1; cam.FLY = true;
        }

        const e = Math.min(1, dt * (drag ? 20 : (cam.FLY ? 1.7 : 2.8)));
        cam.LAM += angTo(cam.LAM, cam.tLAM) * e;
        const nextPhi = Math.max(-78, Math.min(78, cam.PHI + (cam.tPHI - cam.PHI) * e));
        cam.PHI = nextPhi;
        cam.sinP = Math.sin(nextPhi * D2R);
        cam.cosP = Math.cos(nextPhi * D2R);

        /* zoom eases in LOG space: going 1→34 and 34→1 should feel like the same
           move, and linear interpolation of a ratio does not */
        const lz = Math.log(cam.ZOOM), lt = Math.log(cam.tZOOM);
        cam.ZOOM = Math.exp(lz + (lt - lz) * Math.min(1, dt * (cam.FLY ? 1.55 : 6.5)));
        if (Math.abs(lt - lz) < 0.002 && Math.abs(angTo(cam.LAM, cam.tLAM)) < 0.05) cam.FLY = false;
      }
      cam.R = cam.R0 * cam.ZOOM;
      /* the fleet's own ground fades in over the second half of the descent */
      cam.REGMIX = Math.max(0, Math.min(1, (cam.ZOOM - 6) / 10));

      if (prog && texReady) {
        const dpr = window.devicePixelRatio || 1;
        const b = basis();
        const sub = subsolar(Date.now());
        gl.viewport(0, 0, cv.width, cv.height);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(uni.uRes, cv.width, cv.height);
        gl.uniform2f(uni.uC, cam.CX * dpr, cam.CY * dpr);
        gl.uniform1f(uni.uR, cam.R * dpr);
        gl.uniform3fv(uni.uE, b.e);
        gl.uniform3fv(uni.uN, b.n);
        gl.uniform3fv(uni.uV, b.v);
        /* the sun as a direction in WORLD space, from the same subsolar point
           everything else is drawn from — so the shader's terminator, the site
           dots and the strip can never disagree */
        const sl = sub.lat * D2R, so = sub.lng * D2R, csl = Math.cos(sl);
        gl.uniform3f(uni.uSun, csl * Math.cos(so), csl * Math.sin(so), Math.sin(sl));
        gl.uniform1f(uni.uRegMix, cam.REGMIX);
        gl.uniform1f(uni.uSkyK, cam.SKYK * dpr);
        gl.uniform1f(uni.uSkySpin, gmstDeg(Date.now()) * D2R);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }

      if (onFrame) onFrame(project, drag ? drag.moved : 0);
      const down = cam.ZOOM > 2.2;
      if (down !== wasDown) { wasDown = down; if (onStatus) onStatus({ gl: !!prog, down }); }

      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      wrap.removeEventListener('pointerdown', onDown);
      wrap.removeEventListener('pointermove', onMove);
      wrap.removeEventListener('pointerup', onUp);
      wrap.removeEventListener('pointercancel', onUp);
      wrap.removeEventListener('wheel', onWheel);
    };
    /* mounted once: everything that changes afterwards lives in the ref above,
       and re-running this effect would rebuild the shader and re-fetch 1.4 MB
       of plates to move a camera */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <canvas className="globe" ref={glRef} aria-hidden="true" />;
});
