// Injected into MeshStandardMaterial (fragment, after <common>): lathe-brushed steel helpers.
varying vec3 vFwLocal;
uniform float uFwRot;
uniform float uFwSheenAngle;
uniform vec3 uFwSheenColor;

float fwHash(float n) { return fract(sin(n * 127.1) * 43758.5453123); }
float fwNoise(float x) {
  float i = floor(x);
  float f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(fwHash(i), fwHash(i + 1.0), f);
}
