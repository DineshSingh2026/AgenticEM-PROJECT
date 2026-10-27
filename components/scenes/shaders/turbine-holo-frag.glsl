// Turbine insight hologram: framed live sparkline with a gradient fill, drawn in left to right by uReveal.
uniform float uData[24];
uniform float uReveal;
uniform float uLit;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uGold;
uniform vec3 uPale;
uniform vec3 uDim;
varying vec2 vUv;
varying vec3 vPos;

float sampleData(float x) {
  float f = clamp(x, 0.0, 1.0) * 23.0;
  int i = int(min(floor(f), 22.0));
  return mix(uData[i], uData[i + 1], fract(f)) * 0.62 + 0.16;
}

void main() {
  vec2 uv = vUv;
  vec2 fw = max(fwidth(uv), vec2(1e-5));
  vec2 e = min(uv, 1.0 - uv) / fw;
  float frame = 1.0 - smoothstep(0.6, 1.8, min(e.x, e.y));
  vec2 c = min(uv, 1.0 - uv);
  float corner = frame * step(max(c.x, c.y * 1.8), 0.12);

  float gy = abs(fract(uv.y * 4.0) - 0.5) / (fw.y * 4.0);
  float grid = (1.0 - smoothstep(0.0, 1.0, gy)) * 0.5;

  float v = sampleData(uv.x);
  float v2 = sampleData(uv.x + fw.x);
  float slope = (v2 - v) / fw.y;
  float dist = abs(uv.y - v) / fw.y / sqrt(1.0 + slope * slope);
  float line = 1.0 - smoothstep(0.8, 2.2, dist);
  float glow = exp(-dist / 6.0);
  float shown = 1.0 - smoothstep(uReveal - 0.01, uReveal, uv.x);
  float fill = step(uv.y, v) * (uv.y / v) * 0.16;

  float scan = exp(-(fract(uTime * 0.18) - uv.y) * (fract(uTime * 0.18) - uv.y) * 484.0) * 0.05;
  float head = exp(-length((uv - vec2(uReveal, sampleData(uReveal))) / fw) / 4.0) * step(0.01, uReveal) * step(uReveal, 0.995);

  vec3 col = uDim * (frame * 0.6 + grid * 0.25) + uGold * (corner * 0.9 + grid * 0.1) * (0.3 + 0.7 * uLit);
  col += uGold * (line * 1.6 + glow * 0.22 + fill) * shown * uLit;
  col += uPale * (scan * uLit + head * 2.4 * uLit);
  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
