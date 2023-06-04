import * as THREE from "three";
import { Sky } from "./sky.js";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.addEventListener("change", () => {renderer.render(scene, camera)});
controls.enableZoom = false;
controls.enablePan = false;

let geometry = new THREE.BoxGeometry( 1, 1, 1 );
let material = new THREE.MeshBasicMaterial({color: 0x444444});
let cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function initSky() {
    let sky = new Sky();
    sky.scale.setScalar(450000);
    scene.add(sky);

    let sun = new THREE.Vector3();

    const effectController = {
        turbidity: 10,
        rayleigh: 3,
        mieCoefficient: 0.005,
        mieDirectionalG: 0.7,
        elevation: 2,
        azimuth: 180,
        exposure: renderer.toneMappingExposure
    };
    function guiChanged() {
        const uniforms = sky.material.uniforms;
        uniforms["turbidity"].value = effectController.turbidity;
        uniforms["rayleigh"].value = effectController.rayleigh;
        uniforms["mieCoefficient"].value = effectController.mieCoefficient;
        uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

        const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
        const theta = THREE.MathUtils.degToRad(effectController.azimuth);

        sun.setFromSphericalCoords(1, phi, theta);

        uniforms["sunPosition"].value.copy(sun);

        renderer.toneMappingExposure = effectController.exposure;
        renderer.render(scene, camera);
    }
    guiChanged();
}
initSky();

camera.position.y = 5;
camera.rotateX(Math.PI * 3 / 2);
camera.rotateZ(Math.PI * 3 / 2);

const sqrt2 = Math.sqrt(2);

const movementControls = {
    "w": [1, 0],
    "s": [-1, 0],
    "d": [0, 1],
    "a": [0, -1]
};
const speed = 0.1;
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

function animate() {
	requestAnimationFrame(animate);
    if(moving) {
        let includesW = pressedKeys.includes("w") ? 1 : 0;
        let includesS = pressedKeys.includes("s") ? -1 : 0;
        let includesD = pressedKeys.includes("d") ? 1 : 0;
        let includesA = pressedKeys.includes("a") ? -1 : 0;
        let direction = [includesW + includesS, includesD + includesA];
        if(direction[0] != 0 && direction[1] != 0) {
            direction[0] /= sqrt2;
            direction[1] /= sqrt2;
        }
        cube.position.x += direction[0] * speed;
        cube.position.z += direction[1] * speed;
    }
	renderer.render(scene, camera);
}
animate();