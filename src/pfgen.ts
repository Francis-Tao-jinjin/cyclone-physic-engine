import { Particle } from "./particle";
import { vec3 } from './vector';

export interface ParticleForceGenerator {
    /**
     * Overload this in implementations of the interface to calculate
     * and update the force applied to the given particle.
     */
    updateForce(particle:Particle, duration:number) : void;
}

/**
 * A force generator that applies a gravitational force. One instance
 * can be used for multiple particles.
 */
class ParticleGravity implements ParticleForceGenerator {
    
    public gravity = vec3.create();

    /** Creates the generator with the given acceleration. */
    constructor(gravity:vec3|number[]) {
        vec3.copy(this.gravity, gravity as vec3);
    }

    /** Applies the gravitational force to the given particle. */
    public updateForce(particle:Particle, duration:number) {
        if (!particle.hasFiniteMass()) {
            return;
        }
        particle.addForce( vec3.scale(this.gravity, this.gravity, duration));
    }
}

/**
 * A force generator that applies a drag force. One instance
 * can be used for multiple particles.
 */
class ParticleDrag implements ParticleForceGenerator {
    
    public k1:number;
    
    public k2:number;

    /** Creates the generator with the given coefficients. */
    constructor(k1:number, k2:number) {
        this.k1 = k1;
        this.k2 = k2;
    }

    /** Applies the gravitational force to the given particle. */
    public updateForce(particle:Particle, duration:number) {
        
        // 阻力的大小取决于物体的速度 和 接触面的 阻力系数
        const force = vec3.clone(particle.getVelocity());
        
        // Calculate the total drag coefficient
        let dragCoeff = vec3.len(force);
        dragCoeff = this.k1 * dragCoeff + this.k2 * dragCoeff * dragCoeff;

        vec3.normalize(force, force);
        vec3.scale(force, force, -dragCoeff);

        particle.addForce(force);
    }
}

class ParticleSpring implements ParticleForceGenerator {
    
    /** The particle at the other end of the spring. */
    public other:Particle;

    /** Holds the sprint constant. */
    public springConstant = 0;
    
    /** Holds the rest length of the spring. */
    public restLength = 0;

    /** Creates a new spring with the given parameters. */
    constructor(other:Particle, springConstant:number, restLength:number) {
        this.other = other;
        this.springConstant = springConstant;
        this.restLength = restLength;
    }

    // https://www.khanacademy.org/computing/computer-programming/programming-natural-simulations/programming-oscillations/a/spring-forces
    public updateForce(particle:Particle, duration:number) {
        // 弹簧的拉力与弹簧的形变长度有关
        const force = vec3.clone(particle.getPosition());
        vec3.sub(force, force, this.other.getPosition());

        let magnitude = vec3.len(force);
        magnitude = Math.abs(magnitude - this.restLength);
        magnitude *= this.springConstant;

        // Calculate the final force and apply it
        vec3.normalize(force, force);
        vec3.scale(force, force, -magnitude);
        particle.addForce(force); 
    }
}

/**
 * A force generator that applies a Spring force, where
 * one end is attached to a fixed point in space.
 */
class ParticleAnchoredSpring implements ParticleForceGenerator {
    
    /** The location of the anchored end of the spring. */
    public anchor = vec3.create();

    /** Holds the sprint constant. */
    public springConstant = 0;
    
    /** Holds the rest length of the spring. */
    public restLength = 0;

    constructor();
    constructor(anchor:vec3|number[], springConstant:number, restLength:number);
    constructor(anchor?:vec3|number[], springConstant?:number, restLength?:number) {
        if (anchor && typeof springConstant === 'number' && typeof restLength === 'number') {
            this.init(anchor, springConstant, restLength);
        }
    }

    /** Set the spring's properties. */
    public init(anchor:vec3|number[], springConstant:number, restLength:number) {
        vec3.copy(this.anchor, anchor as vec3);
        this.springConstant = springConstant;
        this.restLength = restLength;
    }
    
    public updateForce(particle:Particle, duration:number) {
        // Calculate the vector of the spring
        const force = vec3.create();
        vec3.copy(force, particle.getPosition());
        vec3.sub(force, force, this.anchor);

        // Calculate the magnitude of the force
        let magnitude = vec3.len(force);
        magnitude = (this.restLength - magnitude) * this.springConstant;

        // Calculate the final force and apply it
        vec3.normalize(force, force);
        vec3.scale(force, force, magnitude);
        particle.addForce(force);
    }
}

/**
 * A force generator that applies a buoyancy force (浮力) for a plane of
 * liquid parrallel to XZ plane.
 */
class ParticleBuoyancy implements ParticleForceGenerator {
    /**
     * The maximum submersion depth of the object before
     * it generates its maximum boyancy force.
     */
    public maxDepth:number;
    /**
     * The volume of the object.
     */
    public volume:number;
    /**
     * The height of the water plane above y=0. The plane will be
     * parrallel to the XZ plane.
     */
    public waterHeight:number;
    /**
     * The density of the liquid. Pure water has a density of
     * 1000kg per cubic meter.
     */
    public liquidDensity:number;

    constructor(maxDepth:number, volume:number, waterHeight:number, liquidDensity=1000) {
        this.maxDepth = maxDepth;
        this.volume = volume;
        this.waterHeight = waterHeight;
        this.liquidDensity = liquidDensity;
    }

    public updateForce(particle:Particle, duration:number) {
        // Calculate the submersion depth
        const depth = particle.getPosition()[1];

        // Check if we're out of the water
        if (depth >= this.waterHeight + this.maxDepth) {
            return;
        }

        const force = vec3.create();

        // Check if we're at maximum depth
        if (depth <= this.waterHeight - this.maxDepth) {

            // 这里并没有乘以 重力加速度
            force[1] = this.liquidDensity * this.volume;
            particle.addForce(force);
            return;
        }

        // Otherwise we are partly submerged
        force[1] = this.liquidDensity * this.volume *
                    (depth - this.maxDepth - this.waterHeight) / (2 * this.maxDepth);
        particle.addForce(force);
    }
}

/**
 * A force generator that applies a spring force only
 * when extended.
 */
class ParticleBungee implements ParticleForceGenerator {
    /** The particle at the other end of the spring. */
    public other:Particle;

    /** Holds the sprint constant. */
    public springConstant = 0;
    
    /** Holds the rest length of the spring. */
    public restLength = 0;

    /** Creates a new spring with the given parameters. */
    constructor(other:Particle, springConstant:number, restLength:number) {
        this.other = other;
        this.springConstant = springConstant;
        this.restLength = restLength;
    }

    public updateForce(particle:Particle, duration:number) {
        // 弹簧的拉力与弹簧的形变长度有关
        const force = vec3.clone(particle.getPosition());
        vec3.sub(force, force, this.other.getPosition());

        // Check if the bungee is compressed
        let magnitude = vec3.len(force);
        if (magnitude <= this.restLength) {
            return;
        }

        // Calculate the magnitude of the force
        magnitude = this.springConstant * (this.restLength - magnitude);

        // Calculate the final force and apply it
        vec3.normalize(force, force);
        vec3.scale(force, force, -magnitude);
        particle.addForce(force); 
    }
}

/**
 * A force generator that fakes a stiff spring force, and where
 * one end is attached to a fixed point in space.
 */
// 仿硬质弹簧
class ParticleFakeSpring implements ParticleForceGenerator {

    public anchor:vec3 = vec3.create();
    public springConstant:number;
    public damping:number;

    constructor(anchor:vec3|number[], springConstant:number, damping:number) {
        vec3.copy(this.anchor, anchor as vec3);
        this.springConstant = springConstant;
        this.damping = damping;
    }

    public updateForce(particle:Particle, duration:number) {
        // Check that we do not have infinite mass
        if (!particle.hasFiniteMass()) {
            return;
        }
        // Calculate the relative position of the particle to the anchor
        const position = vec3.clone(particle.getPosition());
        vec3.sub(position, position, this.anchor);

        // damping 就是 阻尼系数
        // Calculate the constants and check they are in bounds.
        const gamma = 0.5 * Math.sqrt(4 * this.springConstant - this.damping * this.damping);
        if (gamma === 0) {
            return;
        }
        const c = vec3.create();
        const tempVec3 = vec3.create();
        vec3.scale(c, position, this.damping / (2 * gamma));
        vec3.scale(tempVec3, particle.getVelocity(), (1/gamma));
        vec3.add(c, c, tempVec3);

        // Calculate the target position
        const target = vec3.create();
        vec3.scale(target, position, Math.cos(gamma * duration));
        vec3.scale(tempVec3, c, Math.sin(gamma * duration));
        vec3.scale(target, target, Math.exp(-0.5 * duration * this.damping));

        // Calculate the resulting acceleration and therefore the force
        const accel = vec3.sub(vec3.create(), target, position);
        vec3.scale(accel, accel, 1/(duration * duration));
        vec3.scale(tempVec3, particle.getVelocity(), 1/duration);
        vec3.sub(accel, accel, tempVec3);

        particle.addForce(vec3.scale(vec3.create(), accel, particle.getMass()));
    }
}

/**
* A force generator that applies a bungee force, where
* one end is attached to a fixed point in space.
*/
class ParticleAnchoredBungee extends ParticleAnchoredSpring {

    public updateForce(particle:Particle, duration:number) {
        // Calculate the vector of the spring
        const force = vec3.create();
        vec3.copy(force, particle.getPosition());
        vec3.sub(force, force, this.anchor);

        // Calculate the magnitude of the force
        let magnitude = vec3.len(force);
        // the condition is where different from "ParticleAnchoredSpring"
        if (magnitude < this.restLength) {
            return;
        }
        magnitude = magnitude - this.restLength;
        magnitude *= this.springConstant;

        // Calculate the final force and apply it
        vec3.normalize(force, force);
        vec3.scale(force, force, -magnitude);
        particle.addForce(force);
    }
}

//////////

//////////

type ParticleForceRegistration = {
    particle:Particle;
    fg:ParticleForceGenerator;
}

type Registry = ParticleForceRegistration[];

class ParticleForceRegistry {

    public registrations:Registry = [];

    constructor(parameters) {
        
    }

    /**
     * Registers the given force generator to apply to the
     * given particle.
     */
    public add(particle:Particle, fg:ParticleForceGenerator) {
        this.registrations.push({ fg, particle });
    }

    /**
     * Removes the given registered pair from the registry.
     * If the pair is not registered, this method will have
     * no effect.
     */
    public remove(particle:Particle, fg:ParticleForceGenerator) {

    }

    /**
     * Clears all registrations from the registry. This will
     * not delete the particles or the force generators
     * themselves, just the records of their connection.
     */
    public clear() {

    }

    /**
     * Calls all the force generators to update the forces of
     * their corresponding particles.
     */
    public updateForces(duration:number) {
        for (let i = 0; i<this.registrations.length; i++) {
            this.registrations[i].fg.updateForce(this.registrations[i].particle, duration);
        }
    }
}



