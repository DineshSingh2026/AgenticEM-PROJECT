// ECG trace travelling from the hub (u=0) out to the agent node (u=1).
uniform float uTime;
uniform float uOpacity;
uniform float uAspect;   // quad width / quad length
uniform vec3 uColor;
uniform vec3 uDeadColor;
uniform vec3 uFlashColor;

varying vec2 vUv;
varying float vAlive;
varying float vFlash;
varying float vLoad;
varying float vIndex;

float g(float x, float c, float w) { float d = (x - c) / w; return exp(-d * d); }

// P wave, QRS complex, T wave (x in quad-length units, 0 = R peak)
float ecg(float x) {
  return 0.12 * g(x, -0.12, 0.028)
       - 0.16 * g(x, -0.026, 0.009)
       + 1.00 * g(x, 0.0, 0.011)
       - 0.32 * g(x, 0.024, 0.011)
       + 0.22 * g(x, 0.13, 0.042);
}

void main() {
  float phase = fract(uTime + vIndex * 0.137);
  float centre = phase * 1.5 - 0.25;
  float x = vUv.x - centre;
  float amp = (0.36 + vLoad * 0.06) * vAlive;
  float y = 0.5 + ecg(x) * amp;
  float slope = (ecg(x + 0.002) - ecg(x - 0.002)) / 0.004 * amp * uAspect;
  float dist = abs(vUv.y - y) / sqrt(1.0 + slope * slope);
  float px = fwidth(vUv.y);
  float line = 1.0 - smoothstep(px * 0.5, px * 1.6, dist);
  float glow = exp(-dist / max(px * 5.0, 1e-4)) * 0.35;

  // Oscilloscope afterglow: bright at the pulse, decaying behind it.
  float behind = max(centre - vUv.x, 0.0);
  float trail = exp(-behind * 3.5) * step(0.0, centre - vUv.x + 0.06);
  float bright = mix(0.22, 1.0, max(trail, g(x, 0.0, 0.08))) * mix(0.35, 1.0, vAlive) * (1.0 + vLoad * 0.35);

  float ends = smoothstep(0.0, 0.05, vUv.x) * smoothstep(1.0, 0.95, vUv.x);
  vec3 col = mix(uDeadColor, uColor, vAlive);
  col = mix(col, uFlashColor, vFlash);
  bright += vFlash * 0.8;

  float a = (line + glow) * bright * ends * uOpacity;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
