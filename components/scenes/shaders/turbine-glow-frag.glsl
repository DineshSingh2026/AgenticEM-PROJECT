uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
varying vec2 vUv;

void main() {
  float d = length(vUv - 0.5) * 2.0;
  float g = exp(-d * d * 6.0) * 0.9 + exp(-d * 18.0) * 0.6;
  g *= 1.0 - smoothstep(0.85, 1.0, d);
  gl_FragColor = vec4(uColor * g * uIntensity * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
