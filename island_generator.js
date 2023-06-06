import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function getIslands() {
    const enviromentIslands = 1;
    const activeIslands = 0;

    const islands = [];
    for(let i = 0; i < enviromentIslands; i++) {
        const loader = new GLTFLoader();
        loader.load(`models/islands/env_${i}.gltf`, function(gltf) {
            islands.push(gltf);
        }, undefined, function(error) {
            console.log(error);
        });
    }
    for(let i = 0; i < activeIslands; i++) {
        const loader = new GLTFLoader();
        loader.load(`models/islands/act_${i}.gltf`, function(gltf) {
            islands.push(gltf);
        }, undefined, function(error) {
            console.log(error);
        });
    }
    return islands;
}
export { getIslands }