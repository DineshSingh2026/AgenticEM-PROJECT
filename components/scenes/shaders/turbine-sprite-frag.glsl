// Turbine glow sprites: soft core + halo, additive.
uniform float uOpacity;
varying vec2 vUv;
varying vec3 vColor;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 5.0) * 0.55 + exp(-d * d * 42.0) * 1.1;
  g *= 1.0 - smoothstep(0.8, 1.0, d);
  gl_FragColor = vec4(vColor * g * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
