import {MLServer} from "./MLServer.js";

/** @type {HTMLButtonElement} */
var goButton = document.getElementById("go")
//goButton.addEventListener('click', go_to_position);

/** @type {HTMLButtonElement} */
var connectButton = document.getElementById('connect');
connectButton.addEventListener('click', connectServer);


var server = null;
if (sessionStorage.getItem('username') != null) {
    server = new MLServer(sessionStorage.getItem('server_url'),  sessionStorage.getItem('database_name'), sessionStorage.getItem('username'), sessionStorage.getItem('password'));
}

/** @type {HTMLCanvasElement} */
var canvas = document.getElementById("canvas")

/** @type {CanvasRenderingContext2D} */
var context = canvas.getContext("2d");

/** @type {HTMLButtonElement} */
var refreshButton = document.getElementById("refresh");
refreshButton.addEventListener('click', refreshInterface);

/** @type {HTMLSelectElement} */
var image_set_selector = document.getElementById("image_set_select");
image_set_selector.addEventListener('change', updateImageSelector);

/** @type {HTMLSelectElement} */
var label_set_selector = document.getElementById("label_set_select");


/** @type {HTMLSelectElement} */
var image_selector = document.getElementById("image_id_select");
image_selector.addEventListener('change', changeCurrentImage);

var current_image_set = null;
var current_image_id = null;
var current_image = new Image();
//width of the image on the screen
var display_width = 400;
//current box the user is drawing
var box_x0, box_y0, box_x1, box_y1;
var current_image_labels = [];

current_image.onload = updateCanvas;
current_image.onerror = function(event) {
    console.log(event);
}

//canvas events
canvas.addEventListener('mousedown', beginDrawBox);

var image_name_to_id = {};

refreshInterface();


async function refreshInterface() {
    setLoginStatus();

    let image_sets = await server.get_image_sets();
    updateSelector("image_set_select", image_sets);

    let label_sets = await server.get_label_sets();
    updateSelector("label_set_select", label_sets);

    updateImageSelector();
}

async function updateCurrentLabels() {

}

function beginDrawBox(event) {
    box_x0 = event.offsetX;
    box_y0 = event.offsetY;
    box_x1 = event.offsetX;
    box_y1 = event.offsetY;
    canvas.addEventListener('mousemove', adjustBox);
    canvas.addEventListener('mouseup', endDrawBox);
}
function adjustBox(event) {
    box_x1 = event.offsetX;
    box_y1 = event.offsetY;
    updateCanvas();
}
function endDrawBox(event) {
    canvas.removeEventListener('mousemove', adjustBox);
    canvas.removeEventListener('mouseup', endDrawBox);
}

function updateCanvas() {

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (current_image != null) {
        let scale = display_width / current_image.width;
        let display_height = scale * current_image.height;

        canvas.width = display_width;
        canvas.height = display_height;
        context.drawImage(current_image, 0, 0, display_width, display_height);
    }

    context.strokeRect(box_x0, box_y0, box_x1-box_x0, box_y1-box_y0);

    for (let label of current_image_labels) {
        let [label_set, classname, x0, y0, x1, y1] = label;
        context.strokeRect(x0, y0, x1-x0, y1-y0);
    }

}


async function changeCurrentImage() {
    current_image_id = image_name_to_id[image_selector.value];
    current_image_set = image_set_selector.value;
    
    let image_blob = await server.get_image(current_image_set, current_image_id);

    let image_url = URL.createObjectURL(image_blob);
    current_image.src = image_url;

    current_image_labels = await server.get_image_labels(current_image_set, current_image_id);

}

async function updateSelector(element_id, new_items) {
    /** @type {HTMLSelectElement} */
    let selector = document.getElementById(element_id);

    for (let i = selector.options.length; i >= 0; i--) {
        selector.options.remove(i);
    }
    new_items = await new_items;

    for (let item of new_items) {
        selector.options.add(new Option(item, item));
    }
    selector.selectedIndex = 0;
    selector.dispatchEvent(new Event('change'));

}

function getImageName(image_id) {
    let image_name = [];
    for (let component of image_id) {
        if (component instanceof Date) {
            image_name.push(component.toISOString());
        }
        else {
            image_name.push(component.toString());
        }
    }
    return image_name.join(' ');
}
async function updateImageSelector() {
    let image_set = image_set_selector.value;
    
    let image_ids = await server.get_image_ids(image_set);
    let image_names = [];
    for (let image_id of image_ids) {
        let image_name = getImageName(image_id);
        image_name_to_id[image_name] = image_id;
        image_names.push(image_name);
    }
    
    updateSelector("image_id_select", image_names);
    
}

async function setLoginStatus() {
    let connection_status = document.getElementById("connection_status");
    let login_button = document.getElementById("login");
    let success = false;
    if (server) {
        success = await server.head();
    }

    console.log(success);

    if (success) {
        connection_status.innerHTML = `Connected to ${server.server_url}`;
        login_button.onclick = logoutServer;
        login_button.innerHTML = 'Logout';
    }
    else {
        if (server) {
            //server exists but couldn't connect
            connection_status.innerHTML = `Login failed with status ${server_status}`;
        }
        connection_status.innerHTML = "Not logged in.";
        login_button.onclick = show_loginpane;
        login_button.innerHTML = "Login";
    }

}

async function connectServer() {
    let server_field = document.getElementById("server_url");
    let user_field = document.getElementById("username");
    let password_field = document.getElementById("password");
    let connection_status = document.getElementById("connection_status");

    server_url = `${server_field.value}/infinitydb/data`
    server = new MLServer(server_url, "ai/labels", user_field.value, password_field.value)

    
    sessionStorage.setItem('server_url', server_url);
    sessionStorage.setItem('username', user_field.value);
    sessionStorage.setItem('password', password_field.value);
    sessionStorage.setItem('database_name', 'ai/labels');
    

    let login_pane = document.getElementById("loginpane")
    login_pane.style.display = "none";

    setLoginStatus();

}


function showLoginpane() {
    document.getElementById('loginpane').style.display='block';
}
function hideLoginpane() {
    document.getElementById('loginpane').style.display='none';
}

function logoutServer() {
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('password');
    sessionStorage.removeItem('server_url');
    server = null;
    let connection_status = document.getElementById("connection_status");
    connection_status.innerHTML = "Not logged in.";

    let login_button = document.getElementById("login");
    login_button.onclick = show_loginpane;
    login_button.innerHTML = "Login";
}

function setDisconnectedStatus() {
    document.getElementById("connection_status").innerHTML = "Must login first."
}


window.onresize = function() {
}
