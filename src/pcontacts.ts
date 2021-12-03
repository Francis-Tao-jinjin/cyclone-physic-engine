/**
 * A Contact represents two objects in contact (in this case
 * ParticleContact representing two Particles). Resolving a
 * contact removes their interpenetration, and applies sufficient
 * impulse to keep them apart. Colliding bodies may also rebound.
 *
 * The contact has no callable functions, it just holds the
 * contact details. To resolve a set of contacts, use the particle
 * contact resolver class.
*/

const REAL_MAX = 10000000000;

import { Particle } from "./particle";
import { vec3 } from './vector';

export class ParticleContact {

    /**
     * Holds the particles that are involved in the contact. The
     * second of these can be NULL, for contacts with the scenery.
     */
    public particles:Particle[] = [];  // 长度固定为 0 或 2
    /**
     * Holds the normal restitution coefficient at the contact.
     */
    public restitution;
    /**
     * Holds the direction of the contact in world coordinates.
     */
    public contactNormal:vec3 = vec3.create();

    /**
     * Holds the depth of penetration at the contact.
     */
    // 相交深度兼具尺寸和富豪特征, 负深度值表示两对象没有处于相交状态
    // 0深度值则意味着两对象仅彼此接触
    public penetration;

    /**
     * Holds the amount each particle is moved by during interpenetration
     * resolution.
     */
    public particleMovement:vec3[] = [];  // 长度固定为 0 或 2

    /**
     * Resolves this contact, for both velocity and interpenetration.
     */
    public resolve(duration:number) {
        this.resolveVelocity(duration);
        this.resolveInterpenetration(duration);
    }

    /**
     * Calculates the separating velocity at this contact.
     */
    public calculateSeparatingVelocity() {
        const relativeVelocity = vec3.clone(this.particles[0].getVelocity());
        if (this.particles[1]) {
            vec3.sub(relativeVelocity, relativeVelocity, this.particles[1].getVelocity());
        }
        return vec3.dot(relativeVelocity, this.contactNormal);
    }

    /**
     * Handles the impulse calculations for this collision.
     */
    private resolveVelocity(duration:number) {
        // Find the velocity in the direction of the contact
        const separatingVelocity = this.calculateSeparatingVelocity();

        // Check if it needs to be resolved
        if (separatingVelocity > 0) {
            // The contact is either separating, or stationary - there's
            // no impulse required.
            return;
        }
        // Calculate the new separating velocity
        let newSepVelocity = -separatingVelocity * this.restitution;

        // Check the velocity build-up due to acceleration only
        const accCausedVelocity = vec3.clone(this.particles[0].getAcceleration());
        if (this.particles[1]) {
            vec3.sub(accCausedVelocity, accCausedVelocity, this.particles[1].getAcceleration());
        }
        let accCausedSepVelocity = vec3.dot(accCausedVelocity, this.contactNormal) * duration;

        // If we've got a closing velocity due to acceleration build-up,
        // remove it from the new separating velocity
        if (accCausedSepVelocity < 0) {
            newSepVelocity += this.restitution * accCausedSepVelocity;
            
            // Make sure we haven't removed more than was
            // there to remove.
            if (newSepVelocity < 0) {
                newSepVelocity = 0;
            }
        }
        let deltaVelocity = newSepVelocity - separatingVelocity;

        // We apply the change in velocity to each object in proportion to
        // their inverse mass (i.e. those with lower inverse mass [higher
        // actual mass] get less change in velocity)..
        let totalInverseMass = this.particles[0].getInverseMass();
        if (this.particles[1]) {
            totalInverseMass += this.particles[1].getInverseMass();
        }
        if (totalInverseMass <= 0) {
            return;
        }
        // Calculate the impulse to apply
        let impulse = deltaVelocity / totalInverseMass;
        
        // Find the amount of impulse per unit of inverse mass
        const impulsePerIMass = vec3.scale(vec3.create(), this.contactNormal, impulse);

        // Apply impulses: they are applied in the direction of the contact,
        // and are proportional to the inverse mass.
        const newVelocity =  vec3.scaleAndAdd(vec3.create(), this.particles[0].getVelocity(), impulsePerIMass, this.particles[0].getInverseMass());
        this.particles[0].setVelocity(newVelocity);

        if (this.particles[1]) {
            // Particle 1 goes in the opposite direction
            vec3.scaleAndAdd(newVelocity, this.particles[1].getVelocity(), impulsePerIMass, -this.particles[1].getInverseMass());
            this.particles[1].setVelocity(newVelocity);
        }
    }

    private resolveInterpenetration(duration:number) {
        // If we don't have any penetration, skip this step.
        if (this.penetration <= 0) {
            return;
        }

        // The movement of each object is based on their inverse mass, so
        // total that.
        let totalInverseMass = this.particles[0].getInverseMass();
        if (this.particles[1]) {
            totalInverseMass += this.particles[1].getInverseMass();
        }

        // If all particles have infinite mass, then we do nothing
        if (totalInverseMass <= 0) {
            return;
        }

        // Find the amount of penetration resolution per unit of inverse mass
        const movePerIMass =  vec3.scale(vec3.create(), this.contactNormal, (this.penetration / totalInverseMass));

        // Calculate the the movement amounts
        this.particleMovement[0] = vec3.scale(vec3.create(), movePerIMass, this.particles[0].getInverseMass());
        if (this.particles[1]) {
            this.particleMovement[1] = vec3.scale(vec3.create(), movePerIMass, -this.particles[1].getInverseMass());
        } else {
            vec3.zero(this.particleMovement[1]);
        }
        
        // Apply the penetration resolution
        this.particles[0].setPosition(vec3.add(vec3.create(), this.particles[0].getPosition(), this.particleMovement[0]));
        if (this.particles[1]) {
            this.particles[1].setPosition(vec3.add(vec3.create(), this.particles[1].getPosition(), this.particleMovement[1]));
        }
    }
}


/**
 * The contact resolution routine for particle contacts. One
 * resolver instance can be shared for the whole simulation.
 */
class ParticleContactResolver {
    
    /**
     * Holds the number of iterations allowed.
     */
    public iterations;

    /**
     * This is a performance tracking value - we keep a record
     * of the actual number of iterations used.
     */
    public iterationsUsed;

    constructor(iterations?:number) {
    }

    /**
     * Resolves a set of particle contacts for both penetration
     * and velocity.
     *
     * Contacts that cannot interact with each other should be
     * passed to separate calls to resolveContacts, as the
     * resolution algorithm takes much longer for lots of contacts
     * than it does for the same number of contacts in small sets.
     *
     * @param contactArray Pointer to an array of particle contact
     * objects.
     *
     * @param numContacts The number of contacts in the array to
     * resolve.
     *
     * @param numIterations The number of iterations through the
     * resolution algorithm. This should be at least the number of
     * contacts (otherwise some constraints will not be resolved -
     * although sometimes this is not noticable). If the
     * iterations are not needed they will not be used, so adding
     * more iterations may not make any difference. But in some
     * cases you would need millions of iterations. Think about
     * the number of iterations as a bound: if you specify a large
     * number, sometimes the algorithm WILL use it, and you may
     * drop frames.
     *
     * @param duration The duration of the previous integration step.
     * This is used to compensate for forces applied.
    */
    public resolveContacts(contactArray:ParticleContact[], numContacts:number, duration:number) {
        let i;
        this.iterationsUsed = 0;
        while (this.iterationsUsed < this.iterations) {
            // Find the contact with the largest closing velocity;
            let max = Infinity;
            let maxIndex = numContacts;
            for (i = 0; i < numContacts && i < contactArray.length; i++) {
                const sepVel = contactArray[i].calculateSeparatingVelocity();
                if (sepVel < max && (sepVel < 0 || contactArray[i].penetration > 0)) {
                    max = sepVel;
                    maxIndex = i;
                }
            }

            // Do we have anything worth resolving?
            if (maxIndex == numContacts) {
                break;
            }

            // Resolve this contact
            contactArray[maxIndex].resolve(duration);

            // Update the interpenetrations for all particles
            const move = contactArray[maxIndex].particleMovement;
            for (i = 0; i < numContacts; i++) {
                if (contactArray[i].particles[0] == contactArray[maxIndex].particles[0]) {
                    contactArray[i].penetration -= vec3.dot(move[0], contactArray[i].contactNormal);
                } else if (contactArray[i].particles[0] == contactArray[maxIndex].particles[1]) {
                    contactArray[i].penetration -= vec3.dot(move[1], contactArray[i].contactNormal);
                }
                if (contactArray[i].particles[1]) {
                    if (contactArray[i].particles[1] == contactArray[maxIndex].particles[0]) {
                        contactArray[i].penetration -= vec3.dot(move[0], contactArray[i].contactNormal);
                    } else if (contactArray[i].particles[0] == contactArray[maxIndex].particles[1]) {
                        contactArray[i].penetration -= vec3.dot(move[1], contactArray[i].contactNormal);
                    } 
                    if (contactArray[i].particles[1]) {
                        if (contactArray[i].particles[1] == contactArray[maxIndex].particles[0]) {
                            contactArray[i].penetration += vec3.dot(move[0], contactArray[i].contactNormal);
                        } else if (contactArray[i].particles[1] == contactArray[maxIndex].particles[1]) {
                            contactArray[i].penetration += vec3.dot(move[1], contactArray[i].contactNormal);
                        }
                    }
                }
            }
            this.iterationsUsed++;
        }
    }
}

/**
 * This is the basic polymorphic interface for contact generators
 * applying to particles.
 */
export interface ParticleContactGenerator {
    /**
     * Fills the given contact structure with the generated
     * contact. The contact pointer should point to the first
     * available contact in a contact array, where limit is the
     * maximum number of contacts in the array that can be written
     * to. The method returns the number of contacts that have
     * been written.
     */
    addContact:(contact:ParticleContact[], limit:number) => number;
}