import { assert } from 'console';
import { vec3 } from './vector';

export class Particle {

    /**
     * Holds the inverse of the mass of the particle. It
     * is more useful to hold the inverse mass because
     * integration is simpler, and because in real time
     * simulation it is more useful to have objects with
     * infinite mass (immovable) than zero mass
     * (completely unstable in numerical simulation).
     */
    public inverseMass:number = 0;
    /**
     * Holds the amount of damping applied to linear
     * motion. Damping is required to remove energy added
     * through numerical instability in the integrator.
     */
    public damping:number = 0;
    /**
     * Holds the linear position of the particle in
     * world space.
     */
    public position:vec3 = vec3.create();

    /**
     * Holds the linear velocity of the particle in
     * world space.
     */
    public velocity:vec3 = vec3.create();

    /**
     * Holds the accumulated force to be applied at the next
     * simulation iteration only. This value is zeroed at each
     * integration step.
     */
    public forceAccum:vec3 = vec3.create();
    /**
     * Holds the acceleration of the particle.  This value
     * can be used to set acceleration due to gravity (its primary
     * use), or any other constant acceleration.
     */    
    public acceleration:vec3 = vec3.create();
    /**
     * Integrates the particle forward in time by the given amount.
     * This function uses a Newton-Euler integration method, which is a
     * linear approximation to the correct integral. For this reason it
     * may be inaccurate in some cases.
     */
    public integrate(duration:number) {
        assert(duration > 0.0);
        // update linear position
        vec3.scaleAndAdd(this.position, this.position, this.velocity, duration);

        // work out the acceleration from the force
        const resultingAcc = this.acceleration;
        vec3.scaleAndAdd(resultingAcc, resultingAcc, this.forceAccum, this.inverseMass);
        
        // Update linear velocity from the acceleration.
        vec3.scaleAndAdd(this.velocity, this.velocity, resultingAcc, duration);

        // Impose drag
        vec3.scale(this.velocity, this.velocity, Math.pow(this.damping, duration));        
        this.clearAccumulator();
    }

    public setMass(mass:number) {
        assert(mass != 0);
        this.inverseMass = (1.0/mass);
    }

    public getMass() {
        if (this.inverseMass == 0) {
            return Infinity;
        } else {
            return 1.0 / this.inverseMass;
        }
    }

    public setInverseMass(inverseMass:number) {
        this.inverseMass = inverseMass;
    }

    public getInverseMass() {
        return this.inverseMass;
    }

    public hasFiniteMass() {
        return this.inverseMass >= 0;
    }

    public setDamping(damping) {
        this.damping = damping;
    }

    public getDamping() {
        return this.damping;
    }

    public setPosition(x, y, z);
    public setPosition(position:vec3|number[]);
    public setPosition(position:vec3|number[]|number, secondParam?:number, thirdPram?:number) {
        if (typeof position === 'number' && typeof secondParam === 'number' && typeof thirdPram === 'number') {
            vec3.set(this.position, position, secondParam, thirdPram);
        } else if (typeof position !== 'number' && position.length) {
            vec3.copy(this.position, (position as vec3));
        }
    }

    public getPosition() {
        return this.position;
    }

    public setVelocity(x, y, z);
    public setVelocity(velocity:vec3|number[]);
    public setVelocity(velocity:vec3|number[]|number, secondParam?:number, thirdPram?:number) {
        if (typeof velocity === 'number' && typeof secondParam === 'number' && typeof thirdPram === 'number') {
            vec3.set(this.velocity, velocity, secondParam, thirdPram);
        } else if (typeof velocity !== 'number' && velocity.length) {
            vec3.copy(this.velocity, (velocity as vec3));
        }
    }

    public getVelocity() {
        return this.velocity;
    }

    public setAcceleration(x, y, z);
    public setAcceleration(acceleration:vec3|number[]);
    public setAcceleration(acceleration:vec3|number[]|number, secondParam?:number, thirdPram?:number) {
        if (typeof acceleration === 'number' && typeof secondParam === 'number' && typeof thirdPram === 'number') {
            vec3.set(this.acceleration, acceleration, secondParam, thirdPram);
        } else if (typeof acceleration !== 'number' && acceleration.length) {
            vec3.copy(this.acceleration, (acceleration as vec3));
        }
    }

    public getAcceleration() {
        return this.acceleration;
    }

    public clearAccumulator() {
        this.forceAccum[0] = 0;
        this.forceAccum[1] = 0;
        this.forceAccum[2] = 0;
    }

    public addForce(force:vec3) {
        vec3.add(this.forceAccum, this.forceAccum, force);
    }
}

