uniform vec3 uColor;
uniform float uOpacity;
varying float vLife;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;
  float core = 1.0 - smoothstep(0.0, 0.5, r);
  float fade = smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.85, 1.0, vLife));
  gl_FragColor = vec4(uColor * 2.0 * core, core * fade * uOpacity);
}
