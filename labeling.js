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

/** @type {HTMLButtonElement} */
var draw_box_button = document.getElementById("draw_box");
draw_box_button.addEventListener('click', enterDrawBoxMode);


/** @type {HTMLSelectElement} */
var image_set_selector = document.getElementById("image_set_select");
image_set_selector.addEventListener('change', updateImageSelector);

/** @type {HTMLSelectElement} */
var source_label_set_selector = document.getElementById("source_label_set_select");
/** @type {HTMLSelectElement} */
var target_label_set_selector = document.getElementById("target_label_set_select");


/** @type {HTMLSelectElement} */
var image_selector = document.getElementById("image_id_select");
image_selector.addEventListener('change', changeCurrentImage);

var current_image_set = null;
var current_image_id = null;
var current_image = new Image();
current_image.onload = updateCanvas;
//width of the image on the screen
var display_width = 400;
var display_height = null;
//current box the user is drawing
var drawing_box = false;
var box_x0, box_y0, box_x1, box_y1;

var current_image_labels = [];

var box_colors = ["blue", "green", "purple", "red"];
var class_color_key = {};


//canvas events

var image_name_to_id = {};

await refreshInterface();


async function refreshInterface() {
    await setLoginStatus();

    let image_sets = await server.get_image_sets();
    updateSelector(image_set_selector, image_sets);

    let label_sets = await server.get_label_sets();
    updateSelector(source_label_set_selector, label_sets);


    updateImageSelector();
}

async function updateCurrentLabels() {

}



//------- Drawing Boxes -------------------------

function enterDrawBoxMode(event) {
    canvas.addEventListener('mousedown', beginDrawBox);
    canvas.style.cursor = 'se-resize';
    canvas.addEventListener('click', exitDrawBoxMode);
}
function exitDrawBoxMode(event) {
    canvas.removeEventListener('click', beginDrawBox);
    canvas.style.cursor = 'auto';
}

function beginDrawBox(event) {
    drawing_box = true;
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

//--------------------------------

function updateCanvas() {

    context.clearRect(0, 0, canvas.width, canvas.height);
    if (current_image != null) {
        let scale = display_width / current_image.width;
        display_height = scale * current_image.height;

        canvas.width = canvas.parentElement.clientWidth;
        canvas.height = display_height + 10;
        context.drawImage(current_image, 0, 0, display_width, display_height);
    }

    context.lineWidth = 2;
    context.setLineDash([5, 5]);
    if (drawing_box) {
        context.strokeRect(box_x0, box_y0, box_x1-box_x0, box_y1-box_y0);
    }

    let textOffset = 100;

    for (let label of current_image_labels) {
        let [label_set, classname, xmin, ymin, xmax, ymax] = label;
        if (!(classname in class_color_key)) {
            class_color_key[classname] = box_colors.pop();
        }
        context.lineWidth = 2;
        context.setLineDash([]);
        context.strokeStyle = class_color_key[classname];
        [xmin, ymin] = toCanvasCoordinates(current_image, xmin, ymin);
        [xmax, ymax] = toCanvasCoordinates(current_image, xmax, ymax);
        context.strokeRect(xmin, ymin, xmax-xmin, ymax-ymin);

        context.moveTo(xmax, ymin);
        context.lineTo(display_width + 40, textOffset);
        context.setLineDash([5, 5]);
        context.strokeStyle = class_color_key[classname];

        context.stroke();
        context.setLineDash([]);
        context.font = "30px serif";
        context.fillText(`${classname}`, display_width + 40, textOffset + 5);
        textOffset += 100;
    }

}

function toCanvasCoordinates(image, x0, y0) {
    let xp = x0 * display_width / image.width;
    let yp = y0 * display_height / image.height;
    return [xp, yp];

}


async function changeCurrentImage() {
    current_image_id = image_name_to_id[image_selector.value];
    current_image_set = image_set_selector.value;
    
    let image_blob = await server.get_image(current_image_set, current_image_id);

    let image_url = URL.createObjectURL(image_blob);
    current_image.src = image_url;

    current_image_labels = await server.get_image_labels(current_image_set, current_image_id);
    drawing_box = false;

    updateCanvas();

}

function updateSelector(selector, new_items) {
    for (let i = selector.options.length; i >= 0; i--) {
        selector.options.remove(i);
    }

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
    
    updateSelector(image_selector, image_names);
    
}

async function setLoginStatus() {
    let connection_status = document.getElementById("connection_status");
    let login_button = document.getElementById("login");
    let success = false;
    if (server) {
        success = await server.head();
    }

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
