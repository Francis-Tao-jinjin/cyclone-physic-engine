import { AmmoEntityInterface } from '.';
import { REGL, REGLLoader, safeProp } from '../gl/regl';

// const vert = `
// precision mediump float;

// attribute vec3 position;
// attribute vec3 normal;

// uniform mat4 model;
// // uniform mat4 modelInverseTranspose;
// uniform mat3 normalMat;
// uniform mat4 view;
// uniform vec3 eye;
// uniform mat4 projection;

// varying vec3 f_position;
// varying vec3 f_color;
// varying vec3 f_normal;
// varying vec3 viewDirection;

// void main() {
//     vec4 m_position = model * vec4(position, 1.0);
//     vec4 t_position = view * m_position;
//     gl_Position = projection * t_position;
//     // f_normal = normalize((modelInverseTranspose * vec4(normal, 0.0)).xyz);
//     f_normal = normalize(normalMat * normal);
//     f_position = m_position.xyz / m_position.w;
//     viewDirection = eye - f_position;
// }
// `

// const frag = `
// precision mediump float;

// uniform vec3 lightDir;
// uniform vec3 ambient;
// uniform vec3 diffuse;
// uniform vec3 specular;
// uniform float specularExponent;
// uniform vec3 color;

// varying vec3 f_position;
// varying vec3 f_normal;
// varying vec3 viewDirection;

// void main() {
//     // vec3 lightDirection = normalize(lightPosition - f_position);
//     vec3 normal = normalize(f_normal);
//     float diffuseIntensity = clamp(dot(normal, lightDir), 0.0, 1.0);
//     gl_FragColor = vec4(color * (ambient + diffuse * diffuseIntensity), 1.0);

//     // vec3 halfView = normalize(lightDirection + normalize(viewDirection));
//     // float specularIntensity = pow(clamp(dot(normal, halfView),0.0,1.0), specularExponent);
//     // gl_FragColor = vec4(color * (ambient + diffuse * diffuseIntensity) + specular * specularIntensity, 1.0);

// }
// `;

// export default function (regl:REGL) {

//     const ammoProp = safeProp<AmmoEntityInterface>(regl);

//     return regl({
//         vert,
//         frag,
//         cull: {
//             enable: true,
//             face: 'back',
//         },
//         attributes: {
//             position: ammoProp('mesh')('vertices').prop,
//             normal: ammoProp('mesh')('faceNormals').prop,
//         },
//         uniforms: {
//             color: ammoProp('color').prop,
//             model: ammoProp('model').prop,
//             normalMat: ammoProp('normalMat').prop,
//             ambient: [0.5, 0.5, 0.5],
//             diffuse: [0.6, 0.6, 0.6],
//             // specular: [0.3, 0.3, 0.3],
//             // specularExponent: 10.0,
//         },
//         primitive: 'triangles',
//         elements: ammoProp('mesh')('faces').prop,
//     });
// }

export function drawMesh(regl:REGL) {
    const ammoProp = safeProp<AmmoEntityInterface>(regl);

    return regl({
        cull: {
            enable: true,
            face: 'back',
        },
        attributes: {
            position: ammoProp('mesh')('vertices').prop,
            normal: ammoProp('mesh')('faceNormals').prop,
        },
        uniforms: {
            color: ammoProp('color').prop,
            model: ammoProp('model').prop,
            normalMat: ammoProp('normalMat').prop,
            ambientLightAmount: 0.3,
            diffuseLightAmount: 0.7,
        },
        primitive: 'triangles',
        elements: ammoProp('mesh')('faces').prop,
    });
}