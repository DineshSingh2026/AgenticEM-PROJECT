// Reroute arcs: aIndex = the dropped node the arc bypasses, aT = 0..1 along the arc.
attribute float aIndex;
attribute float aT;

uniform float uActive[8];

varying float vT;
varying float vActive;

void main() {
  vActive = uActive[int(aIndex + 0.5)];
  vT = aT;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
