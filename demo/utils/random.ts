import { vec3 } from 'gl-matrix';

export function randomReal() : number;
export function randomReal(scale:number) : number;
export function randomReal(min:number, max:number) : number;
export function randomReal(min?:number, max?:number) {
    if (typeof min === 'undefined') {
        return Math.random();
    }
    if (typeof min === 'number' && typeof max === 'undefined') {
        return Math.random() * min;
    }
    let number = (Math.random() * (max as number - min)) + min;
    return number;
}

export function randomBinomial(scale:number) {
    return (randomReal() - randomReal()) * scale;
}

export function randomVector(scale:number) : vec3;
export function randomVector(scale:vec3|number[]) : vec3;
export function randomVector(min:vec3|number[], max:vec3|number[]) : vec3;
export function randomVector(first:number|vec3|number[], second?:vec3|number[]) {
    if (typeof first === 'number') {
        return vec3.fromValues(
            randomBinomial(first),
            randomBinomial(first),
            randomBinomial(first),
        );
    }
    if (typeof first !== 'undefined' && first.length && first.length === 3 && 
        typeof second === 'undefined') {
        return vec3.fromValues(
            randomBinomial(first[0]),
            randomBinomial(first[1]),
            randomBinomial(first[2]),
        );
    }
    return vec3.fromValues(
        randomReal(first[0], (second as vec3)[0]),
        randomReal(first[1], (second as vec3)[1]),
        randomReal(first[2], (second as vec3)[2]),
    );
}
