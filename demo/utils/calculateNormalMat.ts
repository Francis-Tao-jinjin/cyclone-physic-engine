export function calculateNormalMat(normalMat, model) {
    const a00 = model[0];
    const a01 = model[1];
    const a02 = model[2];
    const a10 = model[4];
    const a11 = model[5];
    const a12 = model[6];
    const a20 = model[8];
    const a21 = model[9];
    const a22 = model[10];

    normalMat[0] = a11 * a22 - a12 * a21;
    normalMat[1] = a12 * a20 - a10 * a22;
    normalMat[2] = a10 * a21 - a11 * a20;
    normalMat[3] = a02 * a21 - a01 * a22;
    normalMat[4] = a00 * a22 - a02 * a20;
    normalMat[5] = a01 * a20 - a00 * a21;
    normalMat[6] = a01 * a12 - a02 * a11;
    normalMat[7] = a02 * a10 - a00 * a12;
    normalMat[8] = a00 * a11 - a01 * a10;
}