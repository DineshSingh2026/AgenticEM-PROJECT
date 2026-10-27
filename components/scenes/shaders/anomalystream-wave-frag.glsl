// AnomalyStream waveform. Prepend noise.glsl (snoise) before this source.
// 3 layered noise lines scroll right→left; copper spikes ride on the main line.
// uSpikes[i] = vec4(scrollX, birthTime, height, severity 0..1). height <= 0 → unused slot.
#define SPIKES 24

uniform float uTime;
uniform float uScroll;
uniform float uWidth;
uniform float uHeight;
uniform float uOpacity;
uniform float uDensity;      // 1 full, 0.4 calm: dims secondary lines
uniform float uLinePx;       // main line thickness in pixels
uniform vec2 uPointer;       // world-space x of pointer, amount
uniform vec3 uSteel;
uniform vec3 uDim;
uniform vec3 uCopper;
uniform vec3 uRed;
uniform vec4 uSpikes[SPIKES];

varying vec2 vUv;

float waveY(float xs, float layer, float amp, float freq) {
  float n = snoise(vec3(xs * freq, layer * 7.31, uTime * 0.12));
  n += 0.45 * snoise(vec3(xs * freq * 2.7, layer * 3.17 + 11.0, uTime * 0.2));
  n += 0.18 * snoise(vec3(xs * freq * 7.5, layer * 1.91 + 29.0, uTime * 0.35));
  return n * amp;
}

// distance from y to curve value ly, slope-corrected, in world units
float lineMask(float y, float ly, float thickPx) {
  float dx = dFdx(vUv.x) * uWidth;
  float slope = dFdx(ly) / max(abs(dx), 1e-6);
  float d = abs(y - ly) / sqrt(1.0 + slope * slope);
  float px = max(fwidth(y), 1e-6);
  return 1.0 - smoothstep(thickPx * 0.5 * px, (thickPx * 0.5 + 1.0) * px, d);
}

void main() {
  float x = (vUv.x - 0.5) * uWidth;
  float y = (vUv.y - 0.5) * uHeight;
  float halfW = uWidth * 0.5;

  // pointer swell
  float swell = 1.0 + uPointer.y * 0.7 * exp(-pow((x - uPointer.x) / 0.6, 2.0));

  // --- spikes on the main line
  float spikeY = 0.0;
  float spikeAmt = 0.0;
  float sev = 0.0;
  float column = 0.0;
  for (int i = 0; i < SPIKES; i++) {
    vec4 s = uSpikes[i];
    if (s.z <= 0.0) continue;
    float age = uTime - s.y;
    float rise = smoothstep(0.0, 0.45, age) * (1.0 - 0.35 * smoothstep(2.0, 9.0, age));
    float dxs = (x + uScroll) - s.x;
    float shape = exp(-abs(dxs) / 0.035) * 0.65 + exp(-dxs * dxs / 0.004) * 0.35;
    float h = s.z * rise * shape;
    spikeY += h;
    float w = shape * rise;
    if (w > spikeAmt) { spikeAmt = w; sev = s.w; }
    // soft vertical glow column under the spike
    column += exp(-dxs * dxs / 0.0025) * rise * s.z * (1.0 - smoothstep(0.0, s.z * rise + 0.02, y)) * step(-0.02, y);
  }

  float l0 = waveY(x + uScroll, 0.0, uHeight * 0.07 * swell, 0.55) + spikeY;
  float l1 = waveY(x + uScroll * 0.78, 1.0, uHeight * 0.11 * swell, 0.38) + uHeight * 0.03;
  float l2 = waveY(x + uScroll * 0.6, 2.0, uHeight * 0.15 * swell, 0.26) - uHeight * 0.04;

  float m0 = lineMask(y, l0, uLinePx);
  float m1 = lineMask(y, l1, uLinePx * 0.75) * 0.55 * uDensity;
  float m2 = lineMask(y, l2, uLinePx * 0.6) * 0.35 * uDensity;

  vec3 spikeCol = mix(uCopper, uRed, sev);
  float sp = clamp(spikeAmt * 3.0, 0.0, 1.0);
  vec3 c0 = mix(uSteel, spikeCol * 2.2, sp); // >1 so bloom catches the spikes

  vec3 rgb = c0 * m0 * 0.95 + uDim * m1 + uSteel * m2 * 0.8;
  rgb += spikeCol * column * 0.35;
  // faint glow halo around the main line
  float halo = exp(-abs(y - l0) / (uHeight * 0.02)) * 0.08;
  rgb += mix(uSteel, spikeCol, sp) * halo;

  // edge fades
  float fx = 1.0 - smoothstep(halfW * 0.82, halfW, abs(x));
  float fy = 1.0 - smoothstep(uHeight * 0.36, uHeight * 0.5, abs(y));
  gl_FragColor = vec4(rgb * fx * fy * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
