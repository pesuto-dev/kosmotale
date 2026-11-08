import * as THREE from "three";

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = position;
  gl_Position = projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0);
}
`;

/**
 * Eigen stijlhemel. Geen catalogus, geen foto en geen projectie van een sterrenkaart.
 * De stippen hangen aan een vast raster op de kijkrichting en zijn dus niet de 401 sterren.
 */
const SKY_FRAG = /* glsl */ `
uniform float uBright;
varying vec3 vDir;

float hash(vec3 p) {
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}

void main() {
  vec3 d = normalize(vDir);
  vec2 ang = vec2(atan(d.y, d.x), asin(clamp(d.z, -1.0, 1.0)));
  vec2 cell = floor(ang * vec2(48.0, 24.0));
  float h = hash(vec3(cell, 1.0));
  float star = smoothstep(0.965, 0.992, h);
  float tint = hash(vec3(cell, 2.0));
  vec3 col = vec3(0.012, 0.016, 0.034);
  col += star * mix(vec3(0.62, 0.7, 0.9), vec3(1.0, 0.84, 0.68), tint) * (0.35 + 0.65 * hash(vec3(cell, 3.0)));
  gl_FragColor = vec4(col * uBright, 1.0);
  #include <colorspace_fragment>
}
`;

export function skyMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uBright: { value: 0 } },
    vertexShader: SKY_VERT,
    fragmentShader: SKY_FRAG,
    depthTest: false,
    depthWrite: false,
    side: THREE.BackSide,
    toneMapped: false,
  });
}
