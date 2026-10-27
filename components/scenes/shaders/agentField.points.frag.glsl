uniform vec3 uColor;
uniform vec3 uFlashColor;
uniform float uAlpha;
uniform float uOpacity;
varying float vFlash;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float soft = 1.0 - smoothstep(0.25, 0.5, r);
  vec3 col = mix(uColor, uFlashColor * 1.8, vFlash);
  float a = mix(uAlpha, 1.0, vFlash) * soft * uOpacity;
  gl_FragColor = vec4(col, a);
}
