import * as THREE from "three";
import { Sky } from "./sky.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Body } from "./physics.js";
import { Vector3, Clock } from "three";
import { getIslands } from "./island_generator.js";

// boilerplate code
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener("change", () => {renderer.render(scene, camera)});
controls.enableDamping = true;
controls.dampingFactor = 0.2
controls.enablePan = false;
controls.enableZoom = false;
const ambientLight = new THREE.AmbientLight(0x404040, 5);
scene.add(ambientLight);


const cameraOffset = new Vector3(-10, 4, 0);


const gravity = 0;
const thrust = 300;
const terminalVelocity = 50;
const rotationSpeed = 0.1;
const resistance = 2;


let plane = new THREE.Object3D();
let planeBody;

function initPlane() {
    const loader = new GLTFLoader();
    loader.load("models/plane/scene.gltf", function(gltf) {
    	scene.add(gltf.scene);
        plane = gltf.scene;
    }, undefined, function(error) {
    	console.error(error);
    });
}
initPlane();
planeBody = new Body(plane, 10);
planeBody.applyForce(new Vector3(0, gravity * planeBody.mass, 0));


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
    const positions = [[new Vector3(10, 10, 10)], []];
    for(let i = 0; i < enviromentIslands; i++) {
        const loader = new GLTFLoader();
        loader.load(`models/islands/env_${i}.gltf`, function(gltf) {
            let mesh = gltf.scene;
            mesh.position.x = positions[0][i].x;
            mesh.position.y = positions[0][i].y;
            mesh.position.z = positions[0][i].z;
            scene.add(mesh);
            console.log(mesh.position);
        }, undefined, function(error) {
            console.log(error);
        });
    }
    for(let i = 0; i < activeIslands; i++) {
        const loader = new GLTFLoader();
        loader.load(`models/islands/act_${i}.gltf`, function(gltf) {
            let mesh = gltf.scene;
            mesh.position.set(positions[1][i]);
            scene.add(mesh);
        }, undefined, function(error) {
            console.log(error);
        });
    }
}
initIslands();

const sqrt2 = Math.sqrt(2);

const movementControls = {
    "w": [1, 0],
    "s": [-1, 0],
    "d": [0, 1],
    "a": [0, -1]
};
let moving = false;

let pressedKeys = [];

function arrayRemove(array, item) {
    return array.filter(function(value) {
        return value != item;
    });
}

document.addEventListener("keydown", function(event) {
    pressedKeys.push(event.key);
    if(Object.keys(movementControls).includes(event.key)) {
        moving = true;
    }
});
document.addEventListener("keyup", function(event) {
    pressedKeys = arrayRemove(pressedKeys, event.key);
    for(let i = 0; i < pressedKeys.length; i++) {
        if(Object.keys(movementControls).includes(event.key)) {
            moving = true;
            break;
        } else {
            moving = false;
        }
    }
});

const clock = new Clock(true);

function getThrust(multiplier) {
    return new Vector3(
        thrust * (Math.sin(plane.rotation._y) + Math.cos(plane.rotation._z)) * multiplier,
        thrust * (Math.sin(plane.rotation._z) + Math.cos(plane.rotation._x) - 1) * multiplier,
        thrust * (Math.sin(plane.rotation._x) + Math.cos(plane.rotation._y) - 1) * multiplier
    );
}
function getResistance(multiplier, speed) {
    return  new Vector3(
        -resistance * planeBody.velocityDirection.x * multiplier * speed * speed,
        -resistance * planeBody.velocityDirection.y * multiplier * speed * speed,
        -resistance * planeBody.velocityDirection.z * multiplier * speed * speed
    );
}

let thrustForces = new Vector3(0, 0, 0);
let dragForces = new Vector3(0, 0, 0);

camera.position.copy(cameraOffset);
camera.lookAt(new Vector3(0, cameraOffset.y, 0).add(plane.position));

function animate() {
	requestAnimationFrame(animate);
    let includesW = pressedKeys.includes("w");
    let includesS = pressedKeys.includes("s");
    let includesD = pressedKeys.includes("d");
    let includesA = pressedKeys.includes("a");
    let includesSpace = pressedKeys.includes(" ");
    let includesShift = pressedKeys.includes("Shift");
    if(planeBody == undefined) {
        planeBody = new Body(plane, 10, 10);
    }
    let oldDirection = new Vector3().copy(planeBody.velocityDirection);
    let thrustForce = getThrust(includesSpace ? 1 : 0);
    thrustForces.x += thrustForce.x;
    thrustForces.y += thrustForce.y;
    thrustForces.z += thrustForce.z;
    planeBody.applyForce(thrustForce);
    planeBody.speed = planeBody.velocity.length();
    let drag = getResistance(includesShift ? 20 : 1, planeBody.speed);
    planeBody.applyForce(drag);
    dragForces.x += drag.x;
    dragForces.y += drag.y;
    dragForces.z += drag.z;
    let delta = clock.getDelta();
    planeBody.velocity.x += planeBody.acceleration.x * delta;
    planeBody.velocity.y += planeBody.acceleration.y * delta;
    planeBody.velocity.z += planeBody.acceleration.z * delta;
    planeBody.velocityDirection.copy(planeBody.velocity).normalize();
    planeBody.speed = planeBody.velocity.length();
    if(planeBody.speed > terminalVelocity) {
        let k = terminalVelocity / planeBody.speed;
        planeBody.velocity.x = planeBody.velocity.x * k;
        planeBody.velocity.y = planeBody.velocity.y * k;
        planeBody.velocity.z = planeBody.velocity.z * k;
    }
    plane.position.x += planeBody.velocity.x * delta;
    plane.position.y += planeBody.velocity.y * delta;
    plane.position.z += planeBody.velocity.z * delta;
    //camera.position.copy(plane.position).add(cameraOffset);
    planeBody.animate();
	renderer.render(scene, camera);
}
animate();