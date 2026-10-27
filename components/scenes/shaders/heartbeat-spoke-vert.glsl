// One merged geometry holds all 8 spokes; aIndex selects the per-spoke state.
attribute float aIndex;

uniform float uAlive[8];
uniform float uFlash[8];
uniform float uLoad[8];

varying vec2 vUv;
varying float vAlive;
varying float vFlash;
varying float vLoad;
varying float vIndex;

void main() {
  int i = int(aIndex + 0.5);
  vAlive = uAlive[i];
  vFlash = uFlash[i];
  vLoad = uLoad[i];
  vIndex = aIndex;
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
