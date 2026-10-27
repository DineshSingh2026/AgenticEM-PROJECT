uniform vec3 uColor;
uniform vec3 uAccent;
uniform float uAccentMix;
uniform float uOpacity;
varying float vFade;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;
  float a = smoothstep(0.5, 0.0, d) * vFade * 0.55 * uOpacity;
  vec3 col = mix(uColor, uAccent, uAccentMix * vFade);
  gl_FragColor = vec4(col * a, 1.0); // additive
  #include <colorspace_fragment>
}
