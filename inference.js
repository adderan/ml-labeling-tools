import {MLServer, ServerLoginPane} from "./MLServer.js";
import "https://cdnjs.cloudflare.com/ajax/libs/onnxruntime-web/1.10.0/ort.min.js";

customElements.define('server-login-pane', ServerLoginPane);

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

let player = document.getElementById('video');

let stream = await navigator.mediaDevices.getUserMedia({video: true});
player.srcObject = stream;
