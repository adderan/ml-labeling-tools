import {NavBar, ServerLoginPane} from "./components.js";
import {MLServer} from "./MLServer.js";

class ClusterEditor extends HTMLElement {
    constructor() {
        super();
        this.canvas = document.createElement("canvas");
        this.appendChild(this.canvas);


    }
}

customElements.define("cluster-editor", ClusterEditor);

const server = new MLServer(null, null, null);
const navbar = document.querySelector('my-navbar');
navbar.setServer(server);

const model_select = document.querySelector('#model-select');
const model_ids = await server.getModels();
model_ids.map(
    (model_id) => {
        model_select.options.add(new Option(model_id, model_id));
    }
);
model_select.onchange = (event) => {downloadFeatureVectors()};

/*
let image_ids = [];
const image_sets = await server.getImageSets();
for (let image_set of image_sets) {
    const image_ids_in_set = await server.getImageIds(image_set);
    image_ids = image_ids.concat(image_ids_in_set);
}

console.log(image_ids);
*/

async function downloadFeatureVectors() {
    const model_id = model_select[model_select.selectedIndex].value;

    let image_ids = [];
    const image_sets = await server.getImageSets();
    for (let image_set of image_sets) {
        const image_ids_in_set = await server.getImageIds(image_set);
        for (let image_id of image_ids_in_set) {
            image_id[1] = image_id[1].toISOString();

            const feature_vector = await server.getFeatureVector(model_id, image_set, image_id, 0);
            console.log(feature_vector);
        }
    }
}


