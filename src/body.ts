import { assert } from 'console';
import { mat3, mat4, quat } from 'gl-matrix';
import { QuatUtils } from './math_utils';
import { vec3 } from './vector';

/**
 * Holds the value for energy under which a body will be put to
 * sleep. This is a global value for the whole solution.  By
 * default it is 0.1, which is fine for simulation when gravity is
 * about 20 units per second squared, masses are about one, and
 * other forces are around that of gravity. It may need tweaking
 * if your simulation is drastically different to this.
 */
const sleepEpsilon = 0.3;

/**
 * A rigid body is the basic simulation object in the physics
 * core.
 *
 * It has position and orientation data, along with first
 * derivatives. It can be integrated forward through time, and
 * have forces, torques and impulses (linear or angular) applied
 * to it. The rigid body manages its state and allows access
 * through a set of methods.
 *
 * A ridid body contains 64 words (the size of which is given
 * by the precision: sizeof(real)). It contains no virtual
 * functions, so should take up exactly 64 words in memory. Of
 * this total 15 words are padding, distributed among the
 * Vector3 data members.
 */
export class RigidBody {

    /**
     * Holds the inverse of the mass of the rigid body. It
     * is more useful to hold the inverse mass because
     * integration is simpler, and because in real time
     * simulation it is more useful to have bodies with
     * infinite mass (immovable) than zero mass
     * (completely unstable in numerical simulation).
     */
    public inverseMass = 0;

    /**
     * Holds the inverse of the body's inertia tensor. The
     * inertia tensor provided must not be degenerate
     * (that would mean the body had zero inertia for
     * spinning along one axis). As long as the tensor is
     * finite, it will be invertible. The inverse tensor
     * is used for similar reasons to the use of inverse
     * mass.
     *
     * The inertia tensor, unlike the other variables that
     * define a rigid body, is given in body space.
     *
     * @see inverseMass
     */
    public inverseInertiaTensor = mat3.create();

    /**
     * Holds the amount of damping applied to linear
     * motion.  Damping is required to remove energy added
     * through numerical instability in the integrator.
     */
    public linearDamping = 0.1; // 这里默认值设置为 0.1

    /**
     * Holds the amount of damping applied to angular
     * motion.  Damping is required to remove energy added
     * through numerical instability in the integrator.
     */
    public angularDamping = 0.1; // 这里默认值设置为 0.1

    /**
     * Holds the linear position of the rigid body in
     * world space.
     */
    public position = vec3.create();

    /**
     * Holds the angular orientation of the rigid body in
     * world space.
     */
    public orientation = quat.create();

    /**
     * Holds the linear velocity of the rigid body in
     * world space.
     */
    public velocity = vec3.create();

    /**
     * Holds the angular velocity, or rotation, or the
     * rigid body in world space.
     */
    public rotation = vec3.create();

    /**
     * @name Derived Data
     *
     * These data members hold information that is derived from
     * the other data in the class.
     */
    /*@{*/

    /**
     * Holds the inverse inertia tensor of the body in world
     * space. The inverse inertia tensor member is specified in
     * the body's local space.
     *
     * @see inverseInertiaTensor
     */
    public inverseInertiaTensorWorld = mat3.create();

    /**
     * Holds the amount of motion of the body. This is a recency
     * weighted mean that can be used to put a body to sleap.
     */
    public motion = 0;
    /**
     * A body can be put to sleep to avoid it being updated
     * by the integration functions or affected by collisions
     * with the world.
     */
    public isAwake = false;

    /**
     * Some bodies may never be allowed to fall asleep.
     * User controlled bodies, for example, should be
     * always awake.
     */
    public canSleep = false;

    /**
     * Holds a transform matrix for converting body space into
     * world space and vice versa. This can be achieved by calling
     * the getPointIn*Space functions.
     * 
     * @see getPointInLocalSpace
     * @see getPointInWorldSpace
     * @see getTransform
     */
    public transformMatrix = mat4.create();

    /**
     * @name Force and Torque Accumulators
     *
     * These data members store the current force, torque and
     * acceleration of the rigid body. Forces can be added to the
     * rigid body in any order, and the class decomposes them into
     * their constituents, accumulating them for the next
     * simulation step. At the simulation step, the accelerations
     * are calculated and stored to be applied to the rigid body.
     */
    /*@{*/

    /**
     * Holds the accumulated force to be applied at the next
     * integration step.
     */
    public forceAccum = vec3.create();

    /**
     * Holds the accumulated torque to be applied at the next
     * integration step.
     */
    public torqueAccum = vec3.create();

    /**
     * Holds the acceleration of the rigid body.  This value
     * can be used to set acceleration due to gravity (its primary
     * use), or any other constant acceleration.
     */
    public acceleration = vec3.create();

    /**
     * Holds the linear acceleration of the rigid body, for the
     * previous frame.
     */
    public lastFrameAcceleration = vec3.create();

    /**
     * Calculates internal data from state data. This should be called
     * after the body's state is altered directly (it is called
     * automatically during integration). If you change the body's state
     * and then intend to integrate before querying any data (such as
     * the transform matrix), then you can ommit this step.
     */
    public calculateDerivedData() {
        quat.normalize(this.orientation, this.orientation);
        // Calculate the transform matrix for the body.
        _calculateTransformMatrix(this.transformMatrix, this.position, this.orientation);
        // Calculate the inertiaTensor in world space.
        _transformInertiaTensor(this.inverseInertiaTensorWorld,
            this.orientation,
            this.inverseInertiaTensor,
            this.transformMatrix);
    }

    public integrate(duration:number) {
        if (!this.isAwake) {
            return;
        }
        // Calculate linear acceleration from force inputs.
        vec3.copy(this.lastFrameAcceleration, this.acceleration);
        vec3.scaleAndAdd(this.lastFrameAcceleration, this.lastFrameAcceleration, this.forceAccum, this.inverseMass);

        // Calculate angular acceleration from torque inputs.
        const angularAcceleration = vec3.transformMat3(vec3.create(), this.torqueAccum, this.inverseInertiaTensorWorld);

        // Adjust velocities
        // Update linear velocity from both acceleration and impulse.
        vec3.scaleAndAdd(this.velocity, this.velocity, this.lastFrameAcceleration, duration);

        // Update angular velocity from both acceleration and impulse.
        vec3.scaleAndAdd(this.rotation, this.rotation, angularAcceleration, duration);

        // Impose drag.
        vec3.scale(this.velocity, this.velocity, Math.pow(this.linearDamping, duration));
        vec3.scale(this.rotation, this.rotation, Math.pow(this.angularDamping, duration));
        
        // Adjust positions
        // Update linear position.
        vec3.scaleAndAdd(this.position, this.position, this.velocity, duration);
        
        // Update angular position.
        QuatUtils.addScaledVector(this.orientation, this.orientation, this.rotation, duration);

        // Normalise the orientation, and update the matrices with the new
        // position and orientation
        this.calculateDerivedData();

        // Clear accumulators.
        this.clearAccumulators();

        // Update the kinetic energy store, and possibly put the body to
        // sleep.
        if (this.canSleep) {
            const currentMotion = vec3.dot(this.velocity, this.velocity) +
                vec3.dot(this.rotation, this.rotation);
            const bias = Math.pow(0.5, duration);

            if (this.motion < sleepEpsilon) {
                this.setAwake(false);
            } else if (this.motion > 10 * sleepEpsilon) {
                this.motion = 10 * sleepEpsilon;
            }
        }
    }

    public setMass(mass:number) {
        assert(mass != 0);
        this.inverseMass = 1 / mass;
    }

    public getMass() {
        if (this.inverseMass == 0) {
            return Infinity;
        } else {
            return 1 / this.inverseMass;
        }
    }

    public setInverseMass(inverseMass) {
        this.inverseMass = inverseMass;
    }

    public getInverseMass() {
        return this.inverseMass;
    }

    public hasFiniteMass() {
        return this.inverseMass >= 0.0;
    }

    public setInertiaTensor(inertiaTensor:mat3) {
        mat3.invert(this.inverseInertiaTensor, inertiaTensor);
        _checkInverseInertiaTensor(this.inverseInertiaTensor);
    }

    public getInertiaTensor();
    public getInertiaTensor(inertiaTensor:mat3);
    public getInertiaTensor(out?:mat3) {
        if (out == undefined) {
            const it = mat3.create();
            mat3.invert(it, this.inverseInertiaTensor);
            return it;
        }
        mat3.invert(out, this.inverseInertiaTensor);
        return out;
    }

    public getInertiaTensorWorld();
    public getInertiaTensorWorld(inertiaTensor:mat3);
    public getInertiaTensorWorld(out?:mat3) {
        if (out == undefined) {
            const it = mat3.create();
            mat3.invert(it, this.inverseInertiaTensorWorld);
            return it;
        }
        mat3.invert(out, this.inverseInertiaTensorWorld);
        return out;
    }

    public setInverseInertiaTensor(inverseInertiaTensor:mat3) {
        _checkInverseInertiaTensor(inverseInertiaTensor);
        this.inverseInertiaTensor = inverseInertiaTensor;
    }

    public getInverseInertiaTensor();
    public getInverseInertiaTensor(inverseInertiaTensor:mat3);
    public getInverseInertiaTensor(out?:mat3) {
        if (out == undefined) {
            return this.inverseInertiaTensor;
        }
        mat3.copy(out, this.inverseInertiaTensor);
        return out;
    }

    public getInverseInertiaTensorWorld();
    public getInverseInertiaTensorWorld(inverseInertiaTensor:mat3);
    public getInverseInertiaTensorWorld(out?:mat3) {
        if (out == undefined) {
            return this.inverseInertiaTensorWorld;
        }
        mat3.copy(out, this.inverseInertiaTensorWorld);
        return out;
    }

    public setDamping(linearDamping:number, angularDamping:number) {
        this.linearDamping = linearDamping;
        this.angularDamping = angularDamping;
    }

    public setLinearDamping(linearDamping:number) {
        this.linearDamping = linearDamping;
    }

    public getLinearDamping() {
        return this.linearDamping;
    }

    public setAngularDamping(angularDamping:number) {
        this.angularDamping = angularDamping;
    }

    public getAngularDamping() {
        return this.getAngularDamping;
    }

    public addForce(force:vec3) {
        vec3.add(this.forceAccum, this.forceAccum, force);
        this.isAwake = true;
    }

    public setAwake(awake:boolean) {
        if (awake) {
            this.isAwake = true;
            
            // Add a bit of motion to avoid it falling asleep immediately.
            this.motion 
        } else {

        }
    }

    public clearAccumulators() {
        vec3.zero(this.forceAccum);
        vec3.zero(this.torqueAccum);
    }
}

function _calculateTransformMatrix(transformMatrix:mat4, position:vec3, orientation:quat) {
    mat4.fromRotationTranslation(transformMatrix, orientation, position);
    return transformMatrix;
}

/**
 * Internal function that checks the validity of an inverse inertia tensor.
 */
function _checkInverseInertiaTensor(iitWorld:mat3) {
    // TODO: Perform a validity check in an assert.
}

/**
 * Internal function to do an intertia tensor transform by a quaternion.
 * Note that the implementation of this function was created by an
 * automated code-generator and optimizer.
 */
function _transformInertiaTensor(iitWorld:mat3, q:quat, iitBody:mat3, rotmat:mat4) {
    const t4 = rotmat[0] * iitBody[0] + rotmat[1] * iitBody[3] + rotmat[2] * iitBody[6];
    const t9 = rotmat[0] * iitBody[1] + rotmat[1] * iitBody[4] + rotmat[2] * iitBody[7];
    const t14 = rotmat[0] * iitBody[2] + rotmat[1] * iitBody[5] + rotmat[2] * iitBody[8];
    const t28 = rotmat[4] * iitBody[0] + rotmat[5] * iitBody[3] + rotmat[6] * iitBody[6];
    const t33 = rotmat[4] * iitBody[1] + rotmat[5] * iitBody[4] + rotmat[6] * iitBody[7];
    const t38 = rotmat[4] * iitBody[2] + rotmat[5] * iitBody[5] + rotmat[6] * iitBody[8];
    const t52 = rotmat[8] * iitBody[0] + rotmat[9] * iitBody[9] + rotmat[10] * iitBody[6];
    const t57 = rotmat[8] * iitBody[1] + rotmat[9] * iitBody[4] + rotmat[10] * iitBody[7];
    const t62 = rotmat[8] * iitBody[2] + rotmat[9] * iitBody[5] + rotmat[10] * iitBody[8];

    iitWorld[0] = t4 * rotmat[0] + t9 * rotmat[1] + t14 * rotmat[2];
    iitWorld[1] = t4 * rotmat[4] + t9 * rotmat[5] + t14 * rotmat[6];
    iitWorld[2] = t4 * rotmat[8] + t9 * rotmat[9] + t14 * rotmat[10];
    iitWorld[3] = t28 * rotmat[0] + t33 * rotmat[1] + t38 * rotmat[2];
    iitWorld[4] = t28 * rotmat[4] + t33 * rotmat[5] + t38 * rotmat[6];
    iitWorld[5] = t28 * rotmat[8] + t33 * rotmat[9] + t38 * rotmat[10];

    iitWorld[6] = t52 * rotmat[0] + t57 * rotmat[1] + t62 * rotmat[2];
    iitWorld[7] = t52 * rotmat[4] + t57 * rotmat[5] + t62 * rotmat[6];
    iitWorld[8] = t52 * rotmat[8] + t57 * rotmat[9] + t62 * rotmat[10];
}