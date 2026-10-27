uniform float uTime;
uniform float uOpacity;
uniform vec3 uColor;

varying float vT;
varying float vActive;

void main() {
  if (vActive <= 0.001) discard;
  float dash = smoothstep(0.35, 0.5, fract(vT * 9.0 - uTime * 1.6));
  float ends = smoothstep(0.0, 0.08, vT) * smoothstep(1.0, 0.92, vT);
  float a = (0.25 + 0.75 * dash) * ends * vActive * uOpacity;
  gl_FragColor = vec4(uColor, a);
  #include <colorspace_fragment>
}
