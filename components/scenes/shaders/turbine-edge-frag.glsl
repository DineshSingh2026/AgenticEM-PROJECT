// Turbine ledger edges: pixel-constant hairlines that seal gold, plus a hash streak sweeping each face.
uniform vec3 uBase;
uniform vec3 uGold;
uniform vec3 uPale;
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vState;

void main() {
  vec2 fw = max(fwidth(vUv), vec2(1e-5));
  vec2 e = min(vUv, 1.0 - vUv) / fw;
  float d = min(e.x, e.y);
  float line = 1.0 - smoothstep(0.7, 2.0, d);
  float halo = exp(-d / 7.0);
  float g = vState.x;
  float sw = vState.y;
  float band = exp(-(vUv.x - sw) * (vUv.x - sw) * 81.0) * step(0.001, sw) * (1.0 - step(0.999, sw));
  vec3 rgb = uBase * line * 0.6 + uGold * (line * 2.2 + halo * 0.28) * g;
  rgb += uPale * band * (0.28 + line * 2.5);
  gl_FragColor = vec4(rgb * vState.z * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
