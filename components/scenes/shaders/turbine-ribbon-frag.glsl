// Turbine track light channel: uv.x = arc length 0..1, uv.y = across 0..1.
// Completed path burns gold up to the token head; the path ahead is a dim graphite channel with slow flow dashes.
uniform float uHead;
uniform float uTime;
uniform float uOpacity;
uniform vec3 uGold;
uniform vec3 uPale;
uniform vec3 uDim;
varying vec2 vUv;
varying vec3 vPos;

void main() {
  float s = vUv.x;
  float across = abs(vUv.y - 0.5) * 2.0;
  float done = 1.0 - smoothstep(uHead - 0.003, uHead + 0.003, s);

  float core = exp(-across * across * 816.0);
  float wide = exp(-across * across * 9.0);

  float d = fract(s * 70.0 - uTime * 0.9);
  float dash = smoothstep(0.0, 0.08, d) * (1.0 - smoothstep(0.3, 0.42, d));

  vec3 col = mix(uDim * (0.55 + 0.45 * dash), uGold * (0.9 + 0.7 * dash), done) * core;
  col += uGold * wide * (0.018 + 0.05 * done);

  float tk = 1.0 - smoothstep(0.06, 0.12, fract(s * 56.0));
  float band = smoothstep(0.78, 0.82, across) * (1.0 - smoothstep(0.9, 0.95, across));
  col += mix(uDim * 0.35, uGold * 0.32, done) * tk * band;

  float hd = abs(s - uHead);
  col += uPale * (exp(-hd * 140.0) * core * 2.6 + exp(-hd * 40.0) * wide * 0.16) * step(0.002, uHead);

  float ends = smoothstep(0.0, 0.05, s) * (1.0 - smoothstep(0.95, 1.0, s));
  gl_FragColor = vec4(col * ends * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
