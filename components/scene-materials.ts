import { publicPath } from "@/lib/public-path";
import * as THREE from "three";
import { RING_TAU_MAX, saturnRingProfile } from "@/lib/rings";

/** Nachtkant: net genoeg licht om de bol te zien liggen. */
const AMBIENT = 0.045;
/** Zonlicht op de dagkant. Geen afname met afstand, anders is Neptunus zwart. */
const SUNLIGHT = 1.35;

type Entry = { tex: THREE.Texture; ready: boolean; waiting: ((tex: THREE.Texture) => void)[] };

const cache = new Map<string, Entry>();
const loader = typeof window === "undefined" ? null : new THREE.TextureLoader();

/**
 * Laadt een textuur uit public/textures zonder de scène te laten wachten.
 * `onReady` draait zodra het beeld er is; bij een fout blijft de effen kleur staan.
 */
export function loadTexture(
  name: string,
  onReady: (tex: THREE.Texture) => void,
  opts: { color?: boolean; mipmaps?: boolean } = {},
) {
  const key = `${name}:${opts.color !== false}:${opts.mipmaps !== false}`;
  const hit = cache.get(key);
  if (hit) {
    if (hit.ready) onReady(hit.tex);
    else hit.waiting.push(onReady);
    return;
  }
  if (!loader) return;
  const entry: Entry = { tex: new THREE.Texture(), ready: false, waiting: [onReady] };
  cache.set(key, entry);
  entry.tex = loader.load(
    publicPath(`/textures/${name}.jpg`),
    (t) => {
      entry.ready = true;
      for (const fn of entry.waiting) fn(t);
      entry.waiting = [];
    },
    undefined,
    () => {
      cache.delete(key);
      console.warn(`Textuur ${name} laadde niet; de effen kleur blijft.`);
    },
  );
  const tex = entry.tex;
  tex.colorSpace = opts.color === false ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (opts.mipmaps === false) {
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
  }
}

const VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vPosV;
varying vec3 vCenterV;
varying vec2 vLocal;
void main() {
  vUv = uv;
  vLocal = position.xy;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vPosV = mv.xyz;
  vCenterV = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vNormalV = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * mv;
  #include <logdepthbuf_vertex>
}
`;

const PLANET_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uColor;
uniform float uSun;
uniform float uAmbient;
uniform float uRegolith;
uniform vec3 uAtmo;
uniform float uAtmoStrength;
#ifdef EARTH
uniform sampler2D uNight;
uniform float uHasNight;
uniform sampler2D uClouds;
uniform float uHasClouds;
#endif
#ifdef RING_SHADOW
uniform sampler2D uRing;
uniform vec3 uRingPole;
uniform vec2 uRingSpan;
#endif
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vPosV;
varying vec3 vCenterV;

void main() {
  #include <logdepthbuf_fragment>
  vec3 sunV = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 N = normalize(vNormalV);
  vec3 L = normalize(sunV - vPosV);
  vec3 V = normalize(-vPosV);
  float nl = dot(N, L);
  float nv = max(dot(N, V), 0.0);
  vec3 albedo = uHasMap > 0.5 ? texture2D(uMap, vUv).rgb : uColor;

  float lambert = max(nl, 0.0);
  float lommel = 2.0 * lambert / (lambert + nv + 1e-4);
  float light = mix(lambert, min(lommel, 1.4), uRegolith);
  // Zachte schemerrand: een atmosfeer of ruwe bodem breekt de grens nooit messcherp.
  light *= smoothstep(-0.04, 0.06, nl);

  #ifdef RING_SHADOW
  vec3 pole = normalize((viewMatrix * vec4(uRingPole, 0.0)).xyz);
  vec3 rel = vPosV - vCenterV;
  float lp = dot(L, pole);
  float t = -dot(rel, pole) / (abs(lp) > 1e-4 ? lp : 1e-4);
  if (t > 0.0) {
    float r = length(rel + L * t);
    float x = (r - uRingSpan.x) / (uRingSpan.y - uRingSpan.x);
    if (x > 0.0 && x < 1.0) {
      float a = texture2D(uRing, vec2(x, 0.5)).a;
      float tau = a * a * ${RING_TAU_MAX.toFixed(1)};
      light *= exp(-tau / max(abs(lp), 0.02));
    }
  }
  #endif

  vec3 col = albedo * (light * uSun + uAmbient);

  #ifdef EARTH
  float cloud = uHasClouds > 0.5 ? texture2D(uClouds, vUv).r : 0.0;
  float ocean = smoothstep(0.02, 0.12, albedo.b - max(albedo.r, albedo.g));
  vec3 surf = mix(albedo, vec3(0.95), cloud * 0.9);
  col = surf * (light * uSun + uAmbient);
  vec3 R = reflect(-L, N);
  col += vec3(1.0, 0.93, 0.8) * pow(max(dot(R, V), 0.0), 60.0) * 0.45 * ocean * (1.0 - cloud) * step(0.0, nl);
  if (uHasNight > 0.5) {
    vec3 night = texture2D(uNight, vUv).rgb;
    float glow = smoothstep(0.06, 0.45, dot(night, vec3(0.3, 0.5, 0.2)));
    float dark = smoothstep(0.08, -0.12, nl);
    col += vec3(1.0, 0.78, 0.5) * glow * dark * (1.0 - cloud * 0.75) * 0.9;
  }
  #endif

  float rim = pow(1.0 - nv, 3.0);
  col += uAtmo * rim * uAtmoStrength * smoothstep(-0.25, 0.35, nl);

  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export type PlanetLook = {
  color: string;
  map?: string;
  regolith?: number;
  atmo?: string;
  atmoStrength?: number;
  earth?: boolean;
  ringShadow?: { pole: THREE.Vector3; innerAu: number; outerAu: number; tex: THREE.Texture };
};

export function planetMaterial(look: PlanetLook) {
  const uniforms: Record<string, THREE.IUniform> = {
    uMap: { value: null },
    uHasMap: { value: 0 },
    uColor: { value: new THREE.Color(look.color) },
    uSun: { value: SUNLIGHT },
    uAmbient: { value: AMBIENT },
    uRegolith: { value: look.regolith ?? 0 },
    uAtmo: { value: new THREE.Color(look.atmo ?? "#000000") },
    uAtmoStrength: { value: look.atmoStrength ?? 0 },
  };
  const defines: Record<string, string> = {};
  if (look.earth) {
    defines.EARTH = "";
    uniforms.uNight = { value: null };
    uniforms.uHasNight = { value: 0 };
    uniforms.uClouds = { value: null };
    uniforms.uHasClouds = { value: 0 };
    loadTexture("aarde-nacht", (t) => {
      uniforms.uNight.value = t;
      uniforms.uHasNight.value = 1;
    });
    loadTexture(
      "aarde-wolken",
      (t) => {
        uniforms.uClouds.value = t;
        uniforms.uHasClouds.value = 1;
      },
      { color: false },
    );
  }
  if (look.ringShadow) {
    defines.RING_SHADOW = "";
    uniforms.uRing = { value: look.ringShadow.tex };
    uniforms.uRingPole = { value: look.ringShadow.pole };
    uniforms.uRingSpan = { value: new THREE.Vector2(look.ringShadow.innerAu, look.ringShadow.outerAu) };
  }
  if (look.map) {
    loadTexture(look.map, (t) => {
      uniforms.uMap.value = t;
      uniforms.uHasMap.value = 1;
    });
  }
  return new THREE.ShaderMaterial({
    uniforms,
    defines,
    vertexShader: VERT,
    fragmentShader: PLANET_FRAG,
    toneMapped: false,
  });
}

const SUN_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uMap;
uniform float uHasMap;
varying vec2 vUv;
varying vec3 vNormalV;
varying vec3 vPosV;
void main() {
  #include <logdepthbuf_fragment>
  vec3 N = normalize(vNormalV);
  vec3 V = normalize(-vPosV);
  float mu = clamp(dot(N, V), 0.0, 1.0);
  // Randverduistering in zichtbaar licht: de rand is ongeveer half zo fel en roder.
  float limb = 1.0 - 0.5 * (1.0 - sqrt(mu));
  float grain = uHasMap > 0.5 ? texture2D(uMap, vUv).r : 0.4;
  vec3 hot = vec3(2.4, 2.1, 1.6);
  vec3 edge = vec3(2.0, 1.05, 0.35);
  vec3 col = mix(edge, hot, smoothstep(0.5, 1.0, limb)) * limb * (0.9 + 0.2 * grain);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`;

export function sunMaterial() {
  const uniforms: Record<string, THREE.IUniform> = {
    uMap: { value: null },
    uHasMap: { value: 0 },
  };
  loadTexture(
    "zon",
    (t) => {
      uniforms.uMap.value = t;
      uniforms.uHasMap.value = 1;
    },
    { color: false },
  );
  return new THREE.ShaderMaterial({
    uniforms,
    vertexShader: VERT,
    fragmentShader: SUN_FRAG,
    toneMapped: false,
  });
}

const RING_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform sampler2D uRing;
uniform vec3 uPole;
uniform vec2 uSpan;
uniform float uPlanetR;
uniform float uFlat;
uniform float uSun;
uniform float uAmbient;
varying vec3 vPosV;
varying vec3 vCenterV;
varying vec2 vLocal;

void main() {
  #include <logdepthbuf_fragment>
  float r = length(vLocal);
  float x = (r - uSpan.x) / (uSpan.y - uSpan.x);
  if (x < 0.0 || x > 1.0) discard;
  vec4 s = texture2D(uRing, vec2(x, 0.5));
  float tau = s.a * s.a * ${RING_TAU_MAX.toFixed(1)};
  if (tau < 1e-4) discard;

  vec3 sunV = (viewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 n = normalize((viewMatrix * vec4(uPole, 0.0)).xyz);
  vec3 L = normalize(sunV - vPosV);
  vec3 V = normalize(-vPosV);
  float ln = dot(L, n);
  float vn = dot(V, n);
  float mu0 = max(abs(ln), 0.01);
  float mu = max(abs(vn), 0.01);

  float alpha = 1.0 - exp(-tau / mu);
  float lit;
  if (ln * vn >= 0.0) {
    // Verlichte kant: enkelvoudige verstrooiing in een deeltjeslaag.
    lit = 2.2 * mu0 / (mu0 + mu) * (1.0 - exp(-tau * (1.0 / mu + 1.0 / mu0)));
  } else {
    // Onderkant: alleen licht dat door de laag heen komt. Dunne delen lichten op.
    float d = mu - mu0;
    float tr = abs(d) < 1e-3
      ? tau / mu * exp(-tau / mu)
      : mu0 / d * (exp(-tau / mu) - exp(-tau / mu0));
    lit = 1.4 * abs(tr);
  }

  // Schaduw van de planeet (afgeplat) op de ringen.
  vec3 rel = vPosV - vCenterV;
  float k = 1.0 / (1.0 - uFlat);
  vec3 p = rel + n * dot(rel, n) * (k - 1.0);
  vec3 dir = normalize(L + n * dot(L, n) * (k - 1.0));
  float b = dot(p, dir);
  float c = dot(p, p) - uPlanetR * uPlanetR;
  float shadow = (b < 0.0 && b * b - c > 0.0) ? 0.0 : 1.0;

  vec3 col = s.rgb * (lit * shadow * uSun + uAmbient * alpha);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`;

let ringTexture: THREE.DataTexture | null = null;

export function saturnRingTexture() {
  if (ringTexture) return ringTexture;
  const data = saturnRingProfile(4096);
  const tex = new THREE.DataTexture(data, 4096, 1, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.needsUpdate = true;
  ringTexture = tex;
  return tex;
}

export function ringMaterial(opts: {
  pole: THREE.Vector3;
  innerAu: number;
  outerAu: number;
  planetAu: number;
  flattening: number;
}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uRing: { value: saturnRingTexture() },
      uPole: { value: opts.pole },
      uSpan: { value: new THREE.Vector2(opts.innerAu, opts.outerAu) },
      uPlanetR: { value: opts.planetAu },
      uFlat: { value: opts.flattening },
      uSun: { value: SUNLIGHT },
      uAmbient: { value: AMBIENT },
    },
    vertexShader: VERT,
    fragmentShader: RING_FRAG,
    transparent: true,
    premultipliedAlpha: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

