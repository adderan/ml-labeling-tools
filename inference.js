import {MLServer} from "./MLServer.js";
import "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.10.0/ort.min.js";
import { NavBar, ServerLoginPane } from "./components.js";


let server = new MLServer(
    sessionStorage.getItem('server_url'),  
    sessionStorage.getItem('database_name'), 
    sessionStorage.getItem('username'), 
    sessionStorage.getItem('password')
);

let login_pane = document.querySelector('server-login-pane');
login_pane.server = server;
login_pane.loadCredentials();

/** @type {HTMLButtonElement} */
let credentials_button = document.getElementById('credentials-button');
credentials_button.onclick = (event) => {
    login_pane.show();
};

let player = document.getElementById('player');

let stream = await navigator.mediaDevices.getUserMedia({video: true});
player.srcObject = stream;

////** @type {HTMLSelectElement} */
let model_select_box = document.getElementById('model-select');
let model_ids = await server.getModels();
model_ids.map((model_id) => model_select_box.options.add(new Option(model_id, model_id)));
if (sessionStorage.getItem("selected_model")) {
    model_select_box.selectedIndex = sessionStorage.getItem("selected_model");

}
model_select_box.onchange = (evt) => {
    doInference();
};

async function doInference() {
    let model_id = await model_ids[model_select_box.selectedIndex];
    let model_blob = await server.getModel(model_id);
    let model_url = URL.createObjectURL(model_blob);
    inference_session = await ort.InferenceSession.create(model_url, {executionProviders: ['wasm']});
    console.log(inference_session);

}
