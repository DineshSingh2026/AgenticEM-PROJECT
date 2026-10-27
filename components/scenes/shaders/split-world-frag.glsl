// SplitWorld: procedural data-centre aisle (left) | warm bokeh field (right), joined by a
// data-noise seam with copper sparks. Kept dark so white text on top stays AA-legible.
uniform float uTime;
uniform float uOpacity;
uniform float uSeam;      // 0..1 seam x
uniform float uAspect;    // width / height
uniform float uDensity;   // 1 full, 0.4 calm
uniform float uLayers;    // bokeh layers (quality)
uniform float uExposure;
uniform vec3 uBg;
uniform vec3 uSteel;
uniform vec3 uBlue;
uniform vec3 uCopper;
uniform vec3 uCopperSoft;
uniform vec3 uGold;

varying vec2 vUv;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1.0, 0.0)), u.x),
             mix(hash12(i + vec2(0.0, 1.0)), hash12(i + vec2(1.0, 1.0)), u.x), u.y);
}

// ---------------------------------------------------------------- left: data-centre aisle
vec3 aisle(vec2 uv) {
  vec2 p = vec2((uv.x - 0.26) * uAspect, uv.y - 0.5);
  const float W = 0.62;   // aisle half-width
  const float H = 0.46;   // aisle half-height
  const float F = 1.0;    // focal length
  float zx = W * F / max(abs(p.x), 1e-4);
  float zy = H * F / max(abs(p.y), 1e-4);
  float travel = uTime * 0.12;
  vec3 col = vec3(0.0);
  float z;

  if (zx < zy) {
    // Side walls: rack cabinets with server rows and LEDs.
    z = zx;
    float side = sign(p.x);
    float y = p.y * z / F;
    float rz = (z + travel) / 1.25;
    float rackId = floor(rz);
    float fz = fract(rz);
    float inRack = smoothstep(0.03, 0.06, fz) * smoothstep(0.97, 0.94, fz);
    float v = (y + H) / (2.0 * H);
    float rows = 24.0;
    float rowId = floor(v * rows);
    float fr = fract(v * rows);
    float face = 0.012 + 0.012 * hash12(vec2(rackId, side * 7.0));
    float slot = 0.55 + 0.45 * smoothstep(0.0, 0.14, fr) * smoothstep(1.0, 0.86, fr);
    col = uSteel * face * slot * inRack;

    // LEDs: a few per server row, blinking at hashed rates.
    float ledCols = 7.0;
    float lid = floor(fz * ledCols);
    vec2 lf = vec2(fract(fz * ledCols), fr);
    vec2 cell = vec2(rackId * ledCols + lid + side * 311.0, rowId);
    float h = hash12(cell);
    float exists = step(h, 0.32 * uDensity) * inRack * step(0.08, v) * step(v, 0.95);
    float rate = 1.5 + 6.0 * hash12(cell + 4.7);
    float blink = mix(1.0, step(0.35, fract(uTime * rate * 0.25 + h * 13.0)), step(0.4, hash12(cell + 9.1)));
    float d = length((lf - vec2(0.5)) * vec2(1.0, 0.7));
    float spot = smoothstep(0.32, 0.0, d);
    // Fade LEDs before they alias in the distance.
    float lodFade = smoothstep(16.0, 5.0, z);
    vec3 ledCol = mix(uBlue, uSteel, step(0.7, hash12(cell + 2.3)));
    col += ledCol * spot * exists * blink * lodFade * 0.9;
  } else {
    z = zy;
    float x = p.x * z / F;
    float zz = z + travel;
    if (p.y < 0.0) {
      // Raised floor tiles with a faint blue reflection down the centre.
      vec2 t = vec2(x * 1.6, zz * 1.6);
      vec2 ft = abs(fract(t) - 0.5);
      float grid = smoothstep(0.47, 0.5, max(ft.x, ft.y)) * smoothstep(9.0, 2.0, z);
      col = uSteel * (0.004 + grid * 0.02);
      col += uBlue * 0.025 * exp(-abs(x) * 3.0) * (0.6 + 0.4 * vnoise(vec2(x * 4.0, zz * 0.8)));
    } else {
      // Ceiling: segmented cable-tray light strips.
      float strip = exp(-abs(abs(x) - 0.28) * 60.0);
      float seg = smoothstep(0.1, 0.2, fract(zz * 0.6)) * smoothstep(0.9, 0.8, fract(zz * 0.6));
      col = uSteel * (0.003 + strip * seg * 0.14);
    }
  }
  // Depth fog + glow at the vanishing point.
  col *= exp(-z * 0.16);
  col += uBlue * 0.05 * exp(-length(p) * 7.0);
  return col;
}

// ---------------------------------------------------------------- right: warm bokeh field
vec3 bokeh(vec2 uv) {
  vec2 p = vec2(uv.x * uAspect, uv.y);
  vec3 col = uBg + uCopper * 0.035 * smoothstep(1.1, 0.0, length(p - vec2(0.8 * uAspect, 0.32)));
  col += uCopper * 0.02 * smoothstep(0.55, 0.0, uv.y);
  for (int L = 0; L < 4; L++) {
    float fl = float(L);
    if (fl >= uLayers) break;
    float scale = 10.0 - fl * 2.4;            // far layers: small sharp discs; near: large soft
    vec2 drift = vec2(uTime * 0.012 * (fl + 1.0), uTime * 0.008 * (1.0 + fl * 0.6));
    vec2 q = p * scale + drift + fl * 17.31;
    vec2 id = floor(q);
    vec2 f = fract(q);
    float h = hash12(id + fl * 31.7);
    if (h > 0.5 * uDensity + 0.08) continue;
    vec2 h2 = hash22(id + fl * 7.3);
    float r = 0.16 + 0.24 * hash12(id + 3.1);
    vec2 c = vec2(r) + h2 * (1.0 - 2.0 * r);
    float d = length(f - c);
    float blur = r * (0.12 + fl * 0.12);
    float disc = smoothstep(r, r - blur, d);
    float rim = smoothstep(r - blur * 2.5, r - blur * 0.4, d) * disc;
    float tw = 0.75 + 0.25 * sin(uTime * (0.4 + h2.x) + h * 30.0);
    vec3 tint = mix(uCopper, uGold, h2.y * 0.7);
    tint = mix(tint, uCopperSoft, step(0.82, h2.x) * 0.6);
    float inten = (0.035 + 0.05 * hash12(id + 9.2)) * tw / (1.0 + fl * 0.25);
    col += tint * (disc * 0.65 + rim * 0.5) * inten;
  }
  return col;
}

void main() {
  vec2 uv = vUv;
  float t = uTime;

  float wob = (vnoise(vec2(uv.y * 3.0, t * 0.3)) - 0.5) * 0.025;
  float seamX = uSeam + wob;
  float dx = (uv.x - seamX) * uAspect;           // aspect-corrected distance from seam
  float jag = (vnoise(uv * vec2(5.0, 40.0) + vec2(0.0, t * 0.6)) - 0.5) * 0.05;
  float m = smoothstep(-0.04, 0.04, dx + jag);

  vec3 col;
  if (m <= 0.0) col = aisle(uv);
  else if (m >= 1.0) col = bokeh(uv);
  else col = mix(aisle(uv), bokeh(uv), m);

  // Data-noise band: columns of flickering bits streaming vertically.
  float band = exp(-abs(dx) * 11.0);
  if (band > 0.01) {
    float colW = 110.0;
    float cid = floor(dx * colW);
    float spd = (2.0 + hash12(vec2(cid, 1.0)) * 7.0) * (hash12(vec2(cid, 2.0)) > 0.5 ? 1.0 : -1.0);
    float cy = uv.y * 80.0 + t * spd;
    float bitH = hash12(vec2(cid, floor(cy)));
    float bit = step(1.0 - 0.3 * uDensity, bitH) * step(0.2, fract(cy)) * step(fract(dx * colW), 0.62);
    float flick = 0.6 + 0.4 * step(0.5, fract(t * 3.0 + bitH * 7.0));
    col += mix(uSteel, uBlue, bitH) * bit * band * flick * 0.16;
  }
  // Seam core line.
  col += uCopper * (exp(-abs(dx) * 420.0) * 0.45 + exp(-abs(dx) * 35.0) * 0.05);

  // Copper sparks rising along the seam.
  for (int i = 0; i < 2; i++) {
    float fi = float(i);
    vec2 sq = vec2(dx, uv.y) * (26.0 + fi * 14.0) - vec2(0.0, t * (1.0 + fi * 0.7)) + fi * 5.3;
    vec2 id = floor(sq);
    vec2 f = fract(sq);
    float h = hash12(id + fi * 13.1);
    if (h < 0.2 * uDensity) {
      vec2 c = hash22(id) * 0.6 + 0.2;
      float d = length((f - c) * vec2(1.0, 0.4));
      float life = fract(t * 0.9 + h * 10.0);
      float s = exp(-d * d * 650.0) * smoothstep(0.0, 0.15, life) * smoothstep(1.0, 0.5, life);
      col += mix(uCopperSoft, uGold, hash12(id + 2.0)) * s * exp(-abs(dx) * 7.0) * 1.4;
    }
  }

  // Vignette + centre dim for text legibility.
  vec2 vv = uv - 0.5;
  float vig = clamp(1.0 - dot(vv * vec2(1.25, 1.55), vv * vec2(1.25, 1.55)), 0.0, 1.0);
  col *= mix(0.25, 1.0, vig);
  vec2 cc = vv * vec2(1.7, 2.6);
  col *= 1.0 - 0.3 * exp(-dot(cc, cc));
  col *= uExposure;

  gl_FragColor = vec4(col, uOpacity);
  #include <colorspace_fragment>
}
