// Instanced line strips. Per-vertex: position.x = t (0..1), position.y = human y, position.z = agent y (world).
// Per-instance: aRank (-1 = the white human line, else 0..1 spread), aSeed (0..1).
attribute float aRank;
attribute float aSeed;
uniform float uSplit;
uniform float uWidth;
uniform float uTime;
uniform float uFracture;   // t where the fracture sits once fully split
varying float vT;
varying float vRank;
varying float vSeed;
varying float vFan;

void main() {
  float t = position.x;
  float yH = position.y;
  float yA = position.z;
  float y = yH;
  float fan = 0.0;
  if (aRank >= 0.0) {
    float f = mix(1.02, uFracture, uSplit);
    fan = smoothstep(f, f + 0.18, t) * uSplit;
    float spread = pow(aRank, 1.6);
    float target = mix(yH, yA, spread);
    float jitter = sin(t * (18.0 + aSeed * 30.0) + aSeed * 40.0 + uTime * (0.6 + aSeed)) * 0.04 * (1.0 + spread * 3.0);
    y = yH + (target - yH + jitter) * fan;
  }
  vT = t;
  vRank = aRank;
  vSeed = aSeed;
  vFan = fan;
  vec3 p = vec3((t - 0.5) * uWidth, y, (aSeed - 0.5) * 0.4 * fan);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
}
