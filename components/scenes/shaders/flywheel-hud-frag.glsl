// FlywheelScene HUD: instrument rings around the engine.
//  A (outer 0.965): fine ticks, slow counter-rotation.
//  B (0.925): four stage arcs between the nodes; the arc being travelled fills with lap progress.
//  C (inner 0.30): rotating dotted ring around the open core.
#define TAU 6.28318530718
uniform float uOpacity;
uniform vec3 uRot;
uniform float uStage;      // 0..4 lap phase (clockwise from node 0)
uniform float uVol;        // 0..1 compounding volume
uniform float uPulse[4];
uniform vec3 uGold;
uniform vec3 uPale;
uniform vec3 uDeep;
varying vec2 vPos;

float line(float d, float w) {
  float aa = fwidth(d);
  return 1.0 - smoothstep(w - aa, w + aa, abs(d));
}
float ticks(float u, float count, float r, float width) {
  float d = (abs(fract(u * count + 0.5) - 0.5) / count) * TAU * r;
  return line(d, width);
}

void main() {
  float r = length(vPos);
  float a = atan(vPos.y, vPos.x);
  vec3 col = vec3(0.0);

  // Ring A
  float uA = fract((a - uRot.x) / TAU);
  col += uGold * line(r - 0.965, 0.0018) * 0.45;
  col += uGold * ticks(uA, 180.0, r, 0.0018) * step(0.948, r) * step(r, 0.962) * 0.4;
  col += uPale * ticks(uA, 36.0, r, 0.0026) * step(0.94, r) * step(r, 0.962) * 0.55;
  col += uGold * line(r - 0.992, 0.0012) * 0.22;

  // Ring B: stage arcs. s = clockwise fraction from node 0 (at 135 deg).
  float s = fract((2.35619449 - a) / TAU) * 4.0; // 0..4
  float k = floor(s);
  float f = fract(s);
  float gap = 0.2;
  float inArc = step(gap, f) * step(f, 1.0 - gap);
  float band = 1.0 - smoothstep(0.006, 0.0095, abs(r - 0.925));
  float fa = (f - gap) / (1.0 - 2.0 * gap);
  float cur = floor(uStage);
  float done = step(k, cur - 0.5);
  float isCur = 1.0 - step(0.5, abs(k - cur));
  float fill = done + isCur * step(fa, (fract(uStage) - gap) / (1.0 - 2.0 * gap));
  float pulse = 0.0;
  for (int i = 0; i < 4; i++) pulse += uPulse[i] * (1.0 - step(0.5, abs(k - float(i))));
  vec3 arcCol = mix(uDeep * 0.5, uGold * (1.0 + uVol * 0.8), clamp(fill, 0.0, 1.0)) + uPale * pulse * 0.6;
  col += arcCol * band * inArc;
  // lead marker on the arc
  float lead = exp(-pow((s - uStage) * 22.0, 2.0)) * (1.0 - smoothstep(0.0, 0.02, abs(r - 0.925)));
  col += uPale * lead * 2.4;

  // Ring C: dotted core ring
  float uC = fract((a - uRot.z) / TAU);
  col += uGold * ticks(uC, 72.0, r, 0.0035) * line(r - 0.305, 0.0035) * 0.7;
  col += uGold * line(r - 0.275, 0.0012) * 0.3;
  // stage pointers outward toward the step cards
  float node = abs(fract(s + 0.5) - 0.5); // 0 at node angles
  col += uPale * line(node * TAU * r * 0.25, 0.0025) * step(0.975, r) * step(r, 1.04) * 0.8;

  gl_FragColor = vec4(col * uOpacity, 1.0); // additive
  #include <colorspace_fragment>
}
