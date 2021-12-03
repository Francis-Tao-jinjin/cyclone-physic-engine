import { quat, vec3 } from "gl-matrix";

export class QuatUtils {
    static addScaledVector(out:quat, inQuat:quat, vector:vec3, scale:number) {
        const q = quat.fromValues(
                    vector[0] * scale,
                    vector[1] * scale,
                    vector[2] * scale,
                    0,
                );
        quat.mul(q, q, inQuat);
        out[0] = inQuat[0] + q[0] * 0.5;
        out[1] = inQuat[1] + q[1] * 0.5;
        out[2] = inQuat[2] + q[2] * 0.5;
        out[3] = inQuat[3] + q[3] * 0.5;
    }
}