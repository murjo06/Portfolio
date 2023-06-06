import { Vector3 } from "three";

class Body {
    constructor(body, mass, terminalVelocity) {
        this.body = body;
        this.mass = mass;
        this.forces = new Vector3(0, 0, 0);
        this.acceleration = new Vector3(this.forces.x / mass, this.forces.y / mass, this.forces.z / mass);
        this.velocity = new Vector3(0, 0, 0);
        this.velocityDirection = new Vector3(0, 0, 0);
        this.speed = 0;
    }
    applyForce(force) {
        this.forces = new Vector3(this.forces.x + force.x, this.forces.y + force.y, this.forces.z + force.z);
        this.acceleration = new Vector3(this.forces.x / this.mass, this.forces.y / this.mass, this.forces.z / this.mass);
    }
    animate() {
        this.forces = new Vector3(0, 0, 0);
    }
}
export { Body }