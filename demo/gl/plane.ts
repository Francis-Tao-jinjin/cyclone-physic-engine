import { REGL, REGLLoader, safeProp } from './regl';
import { mat4, mat3, vec3 } from 'gl-matrix';
import { calculateNormalMat } from '../utils/calculateNormalMat';

export type PlanePropsType = {
    translate:number[]|vec3,
    color:number[]|vec3,
    scale:number,
}

export default function(regl:REGL, loader:REGLLoader) {
    
    const planeElements:number[][] = [];
    const planePosition:number[][] = [];
    const planeNormal:number[][] = [];

    planePosition.push([-0.5, 0.0, -0.5])
    planePosition.push([+0.5, 0.0, -0.5])
    planePosition.push([-0.5, 0.0, +0.5])
    planePosition.push([+0.5, 0.0, +0.5])

    planeNormal.push([0.0, 1.0, 0.0])
    planeNormal.push([0.0, 1.0, 0.0])
    planeNormal.push([0.0, 1.0, 0.0])
    planeNormal.push([0.0, 1.0, 0.0])

    planeElements.push([3, 1, 0])
    planeElements.push([0, 2, 3])

    const m = mat4.create();
    const normalMat = mat3.create();

    const planeProp = safeProp<PlanePropsType>(regl);

    return regl({
        uniforms: {
            model: (_, props:PlanePropsType, batchId) => {
                mat4.identity(m);
                mat4.translate(m, m, props.translate as vec3)
                var s = props.scale;
                mat4.scale(m, m, [s, s, s])
                return m;
            },
            normalMat: (_, props:PlanePropsType, batchId) => {
                mat4.identity(m);
                mat4.translate(m, m, props.translate as vec3)
                var s = props.scale;
                mat4.scale(m, m, [s, s, s]);
                calculateNormalMat(normalMat, m);
                return normalMat;
            },
            ambientLightAmount: 0.3,
            diffuseLightAmount: 0.7,
            color: planeProp('color').prop,
        },
        attributes: {
            position: planePosition,
            normal: planeNormal,
        },
        elements: planeElements,
        cull: {
            enable: true
        },
    });
}