import * as THREE from "three";
import { Sky } from "./sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Body } from "./physics.js";
import { Vector3, Clock } from "three";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const ambientLight = new THREE.AmbientLight(0x404040, 7);
scene.add(ambientLight);

const followCamPivot = new THREE.Object3D();
followCamPivot.rotation.order = "YXZ";
const cameraOffset = new Vector3(-10, 4, 0);
followCamPivot.position.copy(cameraOffset);

const gravity = 1;
const thrust = 500;
const terminalVelocity = 10;
const rotationSpeed = 0.1;
const rotationOverlap = 0.1;
const rotationOverlapMultiplier = 0.01;
const maxRotationSpeed = 0.2;
const flipSpeed = 0.1;
const flipOverlap = 0.1;
const flipOverlapMultiplier = 0;
const minFlip = 0.4;
const maxFlip = 2;
const maxFlipSpeed = 0.2;
const resistance = 2;

let rotating = false;
let rotationDirection = [0, 0];
let flipDirection = 0;
let rotationTimer = 0;
let flipping = false;
let flipTimer = 0;
let flipDuration = 0;

let loader = new GLTFLoader();
loader.load("models/plane/plane.gltf", function(gltf) {
    const plane = new THREE.Object3D().copy(gltf.scene);
    scene.add(plane);
    const mixer = new THREE.AnimationMixer(plane);
    const clips = gltf.animations;
    const clip = THREE.AnimationClip.findByName(clips, "Object_12Action");
    const action = mixer.clipAction(clip);
    action.play();
    const planeBody = new Body(plane, 10);

    function initSky() {
        const sky = new Sky();
        sky.scale.setScalar(450000);
        scene.add(sky);
        const sun = new THREE.Vector3();
        const sunLight = new THREE.PointLight(0xf2f2f2, 5);
        scene.add(sunLight);
        const effectController = {
            turbidity: 10,
            rayleigh: 3,
            mieCoefficient: 0.005,
            mieDirectionalG: 0.7,
            elevation: 2,
            azimuth: 180
        };
        const uniforms = sky.material.uniforms;
        uniforms["turbidity"].value = effectController.turbidity;
        uniforms["rayleigh"].value = effectController.rayleigh;
        uniforms["mieCoefficient"].value = effectController.mieCoefficient;
        uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;
        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);
        sun.setFromSphericalCoords(1, phi, theta);
        sunLight.position.x = sun.x;
        sunLight.position.y = sun.y;
        sunLight.position.z = sun.z;
        uniforms["sunPosition"].value.copy(sun);
        renderer.render(scene, camera);
    }
    initSky();
    function initIslands() {
        const enviromentIslands = 1;
        const activeIslands = 0;
        const positions = [[new Vector3(15, 15, 15)], []];
        const sizes = [[8], []];
        for(let i = 0; i < enviromentIslands; i++) {
            let loader = new GLTFLoader();
            loader.load(`models/islands/env_${i}.gltf`, function(gltf) {
                let mesh = gltf.scene;
                mesh.position.x = positions[0][i].x;
                mesh.position.y = positions[0][i].y;
                mesh.position.z = positions[0][i].z;
                mesh.scale.multiplyScalar(sizes[0][i]);
                scene.add(mesh);
            }, undefined, function(error) {
                console.log(error);
            });
        }
        for(let i = 0; i < activeIslands; i++) {
            let loader = new GLTFLoader();
            loader.load(`models/islands/act_${i}.gltf`, function(gltf) {
                let mesh = gltf.scene;
                mesh.position.x = positions[0][i].x;
                mesh.position.y = positions[0][i].y;
                mesh.position.z = positions[0][i].z;
                mesh.scale.multiplyScalar(sizes[0][i]);
                scene.add(mesh);
            }, undefined, function(error) {
                console.log(error);
            });
        }
    }
    initIslands();

    const pressedKeys = [];

    Array.prototype.remove = function(item) {
        let index = this.indexOf(item);
        if(index > -1) {
            this.splice(index, 1);
        }
        return this;
    }

    document.addEventListener("keydown", function(event) {
        if(!pressedKeys.includes(event.key)) {
            pressedKeys.push(event.key);
        }
    });
    document.addEventListener("keyup", function(event) {
        pressedKeys.remove(event.key);
    });

    const clock = new Clock(true);

    function getThrust(multiplier, quaternion) {
        return new Vector3(thrust * multiplier, 0, 0).applyQuaternion(quaternion);
    }
    function getResistance(multiplier, speed, normal) {
        return  new Vector3(
            -resistance * multiplier * speed * speed,
            -resistance * multiplier * speed * speed,
            -resistance * multiplier * speed * speed
        ).multiply(normal.clone().negate());
    }
    plane.add(followCamPivot);
    followCamPivot.position.copy(cameraOffset);

    function animate() {
    	requestAnimationFrame(animate);
        let includesW = pressedKeys.includes("w");
        let includesS = pressedKeys.includes("s");
        let includesD = pressedKeys.includes("d");
        let includesA = pressedKeys.includes("a");
        let verticalDirection = (includesW ? 1 : 0) + (includesS ? -1 : 0);
        let horizontalDirection = (includesD ? 1 : 0) + (includesA ? -1 : 0);
        let includesSpace = pressedKeys.includes(" ");
        let includesShift = pressedKeys.includes("Shift");
        let lMouse = pressedKeys.includes("z") ? 1 : 0;
        let rMouse = pressedKeys.includes("x") ? -1 : 0;
        let delta = clock.getDelta();
        mixer.update(delta);
        if(lMouse + rMouse != 0) {
            flipping = true;
            flipDirection = rMouse == -1 ? 1 : -1;
            let rotSpeed = Math.min(flipSpeed * planeBody.speed * delta, maxFlipSpeed);
            plane.rotateOnAxis(new Vector3(1, 0, 0), rotSpeed * flipDirection);
        } else if(flipping && flipTimer <= flipOverlap && flipDuration > minFlip) {
            if(flipTimer != 0) {
                let rotSpeed = Math.min(flipSpeed * planeBody.speed * delta * flipOverlapMultiplier / flipDuration, maxFlipSpeed);
                plane.rotateOnAxis(new Vector3(1, 0, 0), rotSpeed * flipDirection);
            }
            flipTimer += delta;
        }
        if(flipping && flipTimer > flipOverlap) {
            flipping = false;
            flipTimer = 0;
        }
        planeBody.applyForce(new Vector3(0, -gravity * planeBody.mass, 0));
        let thrustForce = getThrust(includesSpace ? 1 : 0, plane.quaternion);
        planeBody.applyForce(thrustForce);
        let normalThrust = thrustForce.clone().normalize();
        let drag = getResistance(includesShift ? 20 : 1, planeBody.speed, normalThrust);
        planeBody.applyForce(drag);
        planeBody.velocity.x += planeBody.acceleration.x * delta;
        planeBody.velocity.y += planeBody.acceleration.y * delta;
        planeBody.velocity.z += planeBody.acceleration.z * delta;
        planeBody.speed = planeBody.velocity.length();
        if(planeBody.speed > terminalVelocity) {
            planeBody.velocity.normalize().multiplyScalar(terminalVelocity);
            planeBody.speed = terminalVelocity;
        }
        plane.position.x += planeBody.velocity.x * delta;
        plane.position.y += planeBody.velocity.y * delta;
        plane.position.z += planeBody.velocity.z * delta;
        let spd = -rotationSpeed * delta * planeBody.speed;
        plane.rotateOnAxis(new Vector3(0, 0, 1), Math.min(spd, maxRotationSpeed) * verticalDirection);
        plane.rotateOnAxis(new Vector3(0, 1, 0), Math.min(spd, maxRotationSpeed) * horizontalDirection);
        if(verticalDirection != 0 || horizontalDirection != 0) {
            rotationDirection = [horizontalDirection, verticalDirection];
            rotating = true;
        }
        if(rotating && verticalDirection == 0 && horizontalDirection == 0) {
            if(rotationTimer <= rotationOverlap) {
                if(rotationTimer != 0) {
                    let rotSpeed = Math.min(spd * rotationOverlapMultiplier / rotationTimer, maxRotationSpeed);
                    plane.rotateOnAxis(new Vector3(0, 0, 1), rotSpeed * rotationDirection[1]);
                    plane.rotateOnAxis(new Vector3(0, 1, 0), rotSpeed * rotationDirection[0]);
                }
                rotationTimer += delta;
            } else {
                rotationTimer = 0;
                rotating = false;
                rotationDirection = [0, 0];
            }
        }
        let worldPosition = new Vector3();
        followCamPivot.getWorldPosition(worldPosition);
        camera.position.copy(worldPosition);
        camera.lookAt(new Vector3(plane.position.x, followCamPivot.position.y + plane.position.y, plane.position.z));
        planeBody.animate();
    	renderer.render(scene, camera);
    }
    animate();
}, undefined, function(error) {
    console.error(error);
});