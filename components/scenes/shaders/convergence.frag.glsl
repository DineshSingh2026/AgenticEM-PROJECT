uniform float uTime;
uniform float uOpacity;
uniform float uDashCount;
uniform float uDashSpeed;
uniform float uBundleGain[3];
uniform vec3 uChaos;     // left strands (white)
uniform vec3 uOrder;     // right bundles (steel)
uniform vec3 uDash;      // flowing light (copper)
varying float vU;
varying float vBundle;
varying float vSeed;
varying vec3 vWorld;

void main() {
  float right = smoothstep(0.42, 0.62, vU);
  int b = int(vBundle + 0.5);
  float gain = b == 0 ? uBundleGain[0] : (b == 1 ? uBundleGain[1] : uBundleGain[2]);
  gain = mix(1.0, gain, right);

  // Dash flow: short bright packets travelling left → right.
  float ph = fract(vU * uDashCount - uTime * uDashSpeed * (0.7 + 0.6 * vSeed) + vSeed * 7.0);
  float dash = smoothstep(0.0, 0.04, ph) * (1.0 - smoothstep(0.08, 0.16, ph));

  vec3 base = mix(uChaos * 0.55, uOrder * 0.7, right);
  vec3 col = base * 0.35 + uDash * dash * (0.6 + 1.2 * right);
  float a = (0.18 + 0.55 * dash) * gain;
  // Fade at the very ends; dip inside the cube.
  float ends = smoothstep(0.0, 0.06, vU) * (1.0 - smoothstep(0.94, 1.0, vU));
  float cube = 1.0 - 0.7 * (1.0 - smoothstep(0.0, 0.9, abs(vWorld.x)));
  gl_FragColor = vec4(col * gain, a * ends * cube * uOpacity);
}
