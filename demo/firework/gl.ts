import { mat4 } from 'gl-matrix';
import { REGL, safeProp } from '../gl/regl';

export function glDepth(regl:REGL) {

    const particlesProp = safeProp<{position, color, count}>(regl);

    return regl({
        vert: `
        precision mediump float;
        attribute vec3 position;
        uniform mat4 lightProjection, lightView, model;
        varying vec3 vPosition;
        void main() {
            vec4 p = lightProjection * lightView * model * vec4(position, 1.0);
            gl_Position = p;
            vPosition = p.xyz;
            gl_PointSize = 1.0 / gl_Position.z;
        }
        `,
        attributes: {
            position: particlesProp('position').prop,
            color: particlesProp('color').prop,
        },
        uniforms: {
            model: mat4.create(),
        },
        primitive: 'points',
        count: particlesProp('count').prop,
    });
}

export function glParticle(regl:REGL) {
    const particlesProp = safeProp<{position, color, count}>(regl);
    
    return regl({
        vert: `
        precision mediump float;
        attribute vec3 position;
        attribute vec3 color;
        uniform mat4 projection, view, model;
        
        varying vec3 vColor;

        void main() {
            vColor = color;
            vec4 worldSpacePosition = model * vec4(position, 1.0);
            gl_Position = projection * view * worldSpacePosition;
            gl_PointSize = 2000.0 / gl_Position.z;
        }
        `,
        frag: `
        precision mediump float;
        varying vec3 vColor;

        void main() {
            gl_FragColor = vec4(vColor, 1.0);
        }
        `,
        attributes: {
            position: particlesProp('position').prop,
            color: particlesProp('color').prop,
        },
        uniforms: {
            model: mat4.create(),
        },
        primitive: 'points',
        count: particlesProp('count').prop,
    });
}