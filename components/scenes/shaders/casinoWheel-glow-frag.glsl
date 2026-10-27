// CasinoWheel backdrop: a faint warm pool of light behind the wheel, plus a breathing pulse on settlements.
uniform vec3 uColor;
uniform float uOpacity;
uniform float uPulse;
varying vec2 vUv;

void main() {
  vec2 p = (vUv - 0.5) * 2.0;
  p.y *= 1.35;
  float d2 = dot(p, p);
  float g = exp(-d2 * 3.2) * (0.085 + uPulse * 0.03) + exp(-d2 * 14.0) * 0.03;
  gl_FragColor = vec4(uColor * g * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
