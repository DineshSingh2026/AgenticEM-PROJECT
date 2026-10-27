uniform vec3 uHuman;
uniform vec3 uCopper;
uniform vec3 uSteel;
uniform float uOpacity;
uniform float uSubAlpha;
uniform float uTime;
varying float vT;
varying float vRank;
varying float vSeed;
varying float vFan;

void main() {
  // Soft fade at both ends of the chart.
  float edge = smoothstep(0.0, 0.04, vT) * (1.0 - smoothstep(0.96, 1.0, vT));
  if (vRank < 0.0) {
    float shimmer = 0.85 + 0.15 * sin(vT * 40.0 - uTime * 2.0);
    gl_FragColor = vec4(uHuman * shimmer, edge * uOpacity);
    return;
  }
  if (vFan < 0.002) discard;
  vec3 col = vSeed < 0.55 ? uCopper : uSteel;
  float pulse = 0.7 + 0.3 * sin(vT * 25.0 - uTime * 3.0 + vSeed * 6.2831);
  gl_FragColor = vec4(col * pulse, uSubAlpha * vFan * edge * uOpacity);
}
