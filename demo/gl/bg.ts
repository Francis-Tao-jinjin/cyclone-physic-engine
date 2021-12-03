import { REGL, REGLLoader } from './regl';

const vert = `
// precision mediump float;
precision highp float;
attribute vec2 position;
uniform vec3 eye;
uniform mat4 invProjection, invView;
varying vec3 Pos;

void main () {
  vec4 near = invView * invProjection * vec4(position, 0, 1);
  vec4 far = invView * invProjection * vec4(position, 1, 1);
  vec3 direction = normalize(near.w * far.xyz - far.w * near.xyz);
  Pos = eye + direction;
  gl_Position = vec4(position, 0.9999, 1);
}
`;

const frag = `
// precision mediump float;
precision highp float;
uniform float width, height;
uniform vec3 ColorA, ColorB;// Amp, Freq, Phase ,DCOffset;
uniform vec3 eye;
varying vec3 Pos;

vec2 resolution = vec2(width, height);

float fogFactorExp(float dist, float density) {
  const float LOG2 = -1.442695;
  float d = density * dist;
  return 1.0 - clamp(exp2(d * d * LOG2), 0.0, 1.0);
}

// http://www.iquilezles.org/www/articles/palettes/palettes.htm
// vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
//   return a + b * cos( 6.28318 * (c * t + d) );
// }

float intersectPlane(vec3 ro, vec3 rd, vec3 nor, float dist) {
  // float denom = rd.y;
  float t = -(max(ro.y, 0.) + dist) / rd.y;
  return t;
}

vec3 bg(vec3 ro, vec3 rd) {
  float PI_2 = 3.14159/2.0;
  float PI_3 = 3.14159/3.0;
  float t = rd.y * 0.4 + 0.4;
  // vec3 grad = palette(t
  //   , DCOffset
  //   , Amp
  //   , Freq
  //   , Phase
  // );

  // vec3 a = vec3(64, 117, 140) / 255.0;
  vec3 grad = mix(ColorA, ColorB, abs(.5 + 0.5 *sin(rd.y * 3.1415/2.0)));

  float d = intersectPlane(ro, rd, vec3(0, 1, 0), 0.);
  if (d > 0.0) {
    vec3 p = ro + rd * d;
    float g = (1.0 - pow(abs(sin(p.x * PI_3) * cos(p.z * PI_3 - PI_2)), 0.06125));
    grad += (1.0 - fogFactorExp(d, 0.004)) * vec3(1.7) * g * 0.18;
  }
  return grad;
}

void main() {
  vec2 p = gl_FragCoord.xy / resolution.xy;
  vec3 rayDir = normalize(Pos - eye);
  vec3 color = bg(eye, rayDir);
  gl_FragColor = vec4(color, 1.0);
}
`;

export default function (regl:REGL, loader:REGLLoader) {
  return regl({
    vert,
    frag,
    attributes: {
      position: [
        -1, -1,
        1, -1,
        1, 1,
        1, 1,
        -1, 1,
        -1, -1,
      ],
    },
    uniforms: {
        ColorA: regl.prop<any, 'cA'>('cA'),
        ColorB: regl.prop<any, 'cB'>('cB'),
        height: regl.context('viewportHeight'),
        width: regl.context('viewportWidth'),
    },
    count: 6,
  });
}

const colorPreset = [
  [
    [0.718, 0.72, 0.72],
    [0.238, 0.08, 0.08],
    [0.8, 0.8, 0.8],
    [0, 0.2, 0.5],
  ],
  [
    [0.410, 0.410, 0.410],
    [0.360, 0.360, 0.360],
    [0.333, 0.333, 0.333],
    [0.667, 0.667, 0.667],
  ],
];