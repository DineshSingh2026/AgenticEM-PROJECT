// Turbine compute lattice links: aT runs 0 -> 1 along each segment, aSeed is per segment.
attribute float aT;
attribute float aSeed;
varying float vT;
varying float vSeed;

void main() {
  vT = aT;
  vSeed = aSeed;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
