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

const server = new MLServer(
    sessionStorage.getItem('server_url'),  
    "ai/labels",
    sessionStorage.getItem('username'), 
    sessionStorage.getItem('password')
);

const model_select = document.querySelector('#model-select');
const model_ids = await server.getModels();
model_ids.map(
    (model_id) => {
        model_select.options.add(new Option(model_id, model_id));
    }
);


