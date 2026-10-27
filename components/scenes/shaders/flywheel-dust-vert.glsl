// FlywheelScene dust: slow orbit around the engine with twinkle.
attribute float aSeed;
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
varying float vAlpha;
void main() {
  vec3 p = position;
  float ang = uTime * (0.03 + aSeed * 0.04);
  float c = cos(-ang), s = sin(-ang);
  p.xy = mat2(c, -s, s, c) * p.xy;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  float tw = 0.5 + 0.5 * sin(uTime * (0.6 + aSeed * 1.7) + aSeed * 90.0);
  vAlpha = 0.2 + 0.8 * tw * tw;
  gl_PointSize = uSize * (0.6 + aSeed * 0.9) * uPixelRatio * (8.0 / -mv.z);
}
