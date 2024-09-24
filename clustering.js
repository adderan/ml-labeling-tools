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

class ClipPreviewBox extends HTMLElement {
    constructor() {
        super();
        this.server = null;
        this.clip = null;
        this.x = 0;
        this.y = 0;
    }

    connectedCallback() {
        if (this.clip == null) return;
        this.dialog = document.createElement("dialog");
        this.appendChild(this.dialog);

        this.image = document.createElement("img");
        this.dialog.appendChild(this.image);

        this.info = document.createElement("p");
        this.info.innerHTML = `
            <p>Image set: ${this.clip.image_set}</p>
            <p>Class ID: ${this.clip.class_id}</p>
        `;
        this.dialog.appendChild(this.info);



        this.classList.add("clip-preview-box");
        const style = document.createElement("style");
        style.innerHTML = `
            .clip-preview-box {
                position: absolute;
                left: ${this.x}px;
                top: ${this.y}px;

                dialog {
                    width: 20rem;
                }
                img {
                    width: 18rem;
                }
            }
        `;
        this.appendChild(style);
        this.dialog.show();

        let image_data_ = server.getImage(this.clip.image_set, this.clip.image_id);
        image_data_.then(
            (image_data) => {
                const image_url = URL.createObjectURL(image_data);
                this.image.src = image_url;
            }
        );

    }

}
customElements.define("clip-preview-box", ClipPreviewBox);
class ClusterEditor extends HTMLElement {
    constructor() {
        super();
        this.canvas = document.createElement("canvas");
        this.appendChild(this.canvas);
        this.samples = [];

        this.size = 1000;
        this.canvas.height = this.size;
        this.canvas.width = this.size;

        this.point_size = 4;

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

        this.canvas.addEventListener('click', this);
        this.preview_box = null;

    }
    handleEvent(event) {
        if (event.type == 'click') {
            if (this.preview_box) {
                this.preview_box.remove();
                this.preview_box = null;
            }
            const pixel = this.ctx.getImageData(event.offsetX, event.offsetY, 1, 1).data;
            console.log("Clicked at ", event.offsetX, event.offsetY);

            //if the pixel is (0,0,0), don't display anything
            if (!pixel.some((p_i) => p_i > 0)) return;

            const clip = this.findNearestAnnotation(event.offsetX, event.offsetY);
            this.preview_box = document.createElement("clip-preview-box");
            this.preview_box.server = server;
            this.preview_box.clip = clip;
            this.preview_box.x = this.canvas.offsetLeft + event.offsetX;
            this.preview_box.y = this.canvas.offsetTop + event.offsetY;
            this.appendChild(this.preview_box);
        }
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
            3: "green",
            4: "yellow",
            5: "orange"
        };
        this.image_set_color_map = {
            chlorella: "green",
            anabaena: "blue",
            "tetraselmis 2022-4-23": "red",
            "cylindrospermum exploded": "yellow"
        };
    }

    encodePixel(x, y) {
        return `${x} ${y}`;
    }

    //dfs to find the nearest annotation to pixel (x, y)
    findNearestAnnotation(start_x, start_y) {
        
        const stack = [];
        const seen = new Set();
        stack.push([start_x, start_y]);
        seen.add(this.encodePixel(start_x, start_y));
        let x, y;
        while (stack.length > 0) {
            if (stack.length > 1000) break;
            const pixel = stack.shift();
            [x,y] = pixel;

            const xy_str = this.encodePixel(x, y);
            if (xy_str in this.annotations) {
                return this.annotations[xy_str];
            }

            const adj = [[x-1,y], [x+1,y], [x,y-1], [x,y+1]];

            for (let [adj_x, adj_y] of adj) {
                if ((adj_x < 0) || (adj_x > this.canvas.width) || (adj_y < 0) || (adj_y > this.canvas.height)) {
                    continue;
                }
                const adj_str = this.encodePixel(adj_x, adj_y);
                if (adj_str in seen) continue;
                stack.push([adj_x, adj_y]);
                seen.add(adj_str);
            }

        }
        return null;

    }

    draw() {
        this.annotations = {};
        for (let sample of this.samples) {
            this.ctx.fillStyle = this.color_map[sample.class_id];
            //this.ctx.fillStyle = this.image_set_color_map[sample.image_set];
            const center_x = Math.round(sample.feature_x * this.size);
            const center_y = Math.round(sample.feature_y * this.size);
            this.ctx.beginPath();
            this.ctx.arc(
                center_x,
                center_y,
                this.point_size,
                0,
                Math.PI * 2
            );
            this.ctx.fill();

            this.annotations[this.encodePixel(center_x, center_y)] = sample;

        }
        //this.image_data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        //console.log(this.image_data);

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


