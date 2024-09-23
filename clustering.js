import {NavBar, ServerLoginPane} from "./components.js";
import {MLServer} from "./MLServer.js";


class Clip {
    constructor(model_id, image_id, feature_x, feature_y, label) {
        this.model_id = model_id;
        this.image_id = image_id;
        this.feature_x = feature_x;
        this.feature_y = feature_y;
        this.label = label;
        this.class_id = parseInt(this.label[4]);

    }
}
class ClusterEditor extends HTMLElement {
    constructor() {
        super();
        this.canvas = document.createElement("canvas");
        this.appendChild(this.canvas);
        this.samples = [];

        this.size = 1000;
        this.canvas.height = this.size;
        this.canvas.width = this.size;

        this.point_size = 8;

        this.ctx = this.canvas.getContext("2d");

        this.classList.add('cluster-editor');
        const style = document.createElement('style');
        style.innerHTML = `
            .cluster-editor {
                canvas {
                    display: block;
                    margin-left: auto;
                    margin-right: auto;
                }
            }
        `;
        this.appendChild(style);


    }
    setSamples(new_samples) {
        const xvals = new_samples.map((sample) => sample.feature_x);
        const yvals = new_samples.map((sample) => sample.feature_y);
        const xmin = Math.min(...xvals);
        const xmax = Math.max(...xvals);
        const ymin = Math.min(...yvals);
        const ymax = Math.max(...yvals);

        new_samples.map((sample) => {
            sample.feature_x = (sample.feature_x - xmin)/(xmax - xmin);
            sample.feature_y = (sample.feature_y - ymin)/(ymax - ymin);
        });
        this.samples = new_samples;
        this.color_map = {
            1: "blue",
            2: "red",
            3: "green"
        };
        this.image_set_color_map = {
            chlorella: "green",
            anabaena: "blue",
            "tetraselmis 2022-4-23": "red",
            "cylindrospermum exploded": "yellow"
        };
    }

    draw() {
        for (let sample of this.samples) {
            this.ctx.fillStyle = this.color_map[sample.class_id];
            //this.ctx.fillStyle = this.image_set_color_map[sample.image_set];
            this.ctx.fillRect(
                sample.feature_x * this.size,
                sample.feature_y * this.size,
                this.point_size,
                this.point_size
            );

        }

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


model_select.onchange = (event) => {
    downloadFeatureVectors();
    sessionStorage.setItem('cluster_editor.model_id', model_select.selectedIndex);
};

let prev_selected_index = sessionStorage.getItem('cluster_editor.model_id');
if (prev_selected_index) {
    model_select.selectedIndex = prev_selected_index;
    model_select.dispatchEvent(new Event('change'));
}

const cluster_editor = document.querySelector('cluster-editor');

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

    const samples = await server.getFeatureVectors(model_id);
    console.log(samples);

    cluster_editor.setSamples(samples);
    cluster_editor.draw();


}


