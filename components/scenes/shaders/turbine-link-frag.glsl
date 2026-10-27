// Turbine compute lattice links: reasoning pulses run along the links while the station is active.
uniform float uTime;
uniform float uLit;
uniform float uActive;
uniform float uOpacity;
uniform vec3 uGold;
uniform vec3 uPale;
uniform vec3 uDim;
varying float vT;
varying float vSeed;

void main() {
  float ph = fract(uTime * (0.45 + vSeed * 0.7) + vSeed * 13.0);
  float dir = step(0.5, fract(vSeed * 7.3));
  float x = mix(vT, 1.0 - vT, dir);
  float pulse = exp(-(x - ph) * (x - ph) * 81.0);
  vec3 col = uDim * 0.5 + uGold * 0.3 * uLit + uPale * pulse * (0.25 * uLit + 2.4 * uActive);
  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
