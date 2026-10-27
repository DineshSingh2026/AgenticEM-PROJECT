uniform float uOpacity;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  if (d > 1.0 || vAlpha <= 0.001) discard;
  float core = smoothstep(0.36, 0.26, d);
  float ring = smoothstep(0.07, 0.0, abs(d - 0.52)) * 0.45;
  float halo = exp(-d * d * 6.0) * 0.5;
  float a = clamp(core + ring + halo, 0.0, 1.0) * vAlpha * uOpacity;
  vec3 col = mix(vColor, vec3(1.0), core * 0.25);
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}
