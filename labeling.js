import {MLServer} from "./MLServer.js";
import { CheckBoxList } from "./js-ui-elements/CheckboxList.js";


class LabelEditorCanvas {
    constructor(canvas, image, server) {
        this.canvas = canvas;

        /** @type {CanvasRenderingContext2D} */
        this.context = this.canvas.getContext("2d");

        this.server = server;
        this.image = image;
        this.labels = [];
        this.target_label_set = null;
        this.current_image_id = null;
        this.current_image_set = null;

        this.display_width = 400;
        this.box_colors = ["blue", "green", "purple", "red"];
        this.class_color_key = {};

        this.box = null;

        this.box_labels = [];
        this.label_editing_popup = null;

        this.class_input = document.createElement('input');
        this.class_input.style.position = 'absolute';
        this.class_input.style.visibility = 'hidden';
        this.class_input.placeholder = "class name";
        this.class_input.addEventListener('keydown', this);
        this.canvas.parentElement.appendChild(this.class_input);

        this.states = {
            NEUTRAL: Symbol('neutral'),
            DRAWING_BOX: Symbol('drawing_box'),
            STARTING_BOX: Symbol('starting_box'),
            WRITING_LABEL: Symbol('writing_label')
        };
        this.state = this.states.NEUTRAL;

        this.canvas.addEventListener('click', this);
        this.canvas.addEventListener('mouseup', this);
        this.canvas.addEventListener('mousedown', this);
    }

    toCanvasCoordinates(x0, y0) {
        let scale = this.display_width / this.image.width;
        let xp = x0 * scale; 
        let yp = y0 * scale; 
        return [xp, yp];

    }

    fromCanvasCoordinates(xp, yp) {
        let scale = this.display_width / this.image.width;
        let x0 = xp / scale;
        let y0 = yp / scale;
        return [x0, y0];
    }

    handleEvent(event) {
        switch (this.state) {
            case this.states.NEUTRAL:
                this._handleEventNeutral(event);
                break;
            case this.states.STARTING_BOX:
                this._handleEventBoxStart(event);
                break;
            case this.states.DRAWING_BOX:
                this._handleEventBoxDraw(event);
                break;
            case this.states.WRITING_LABEL:
                this._handleEventWritingLabel(event);
                break;
        }

    }

    _handleEventNeutral(event) {
        if (event.type == 'click') {
            if (this.label_editing_popup && event.target != this.label_editing_popup) {
                this.remove_label_editing_popup();
            }
            for (let i = 0; i < this.box_labels.length; i++) {
                let box_label = this.box_labels[i];
                if (event.target == box_label) {
                    this.display_label_editing_popup(event.target.offsetLeft, event.target.offsetTop, i);
                }
            }
        }
    }

    remove_label_editing_popup() {
        this.label_editing_popup.remove();
        this.label_editing_popup = null;
        this.update();

    }

    display_label_editing_popup(x, y, label_index) {
        let label = this.labels[label_index];
        if (this.label_editing_popup != null) return;
        this.label_editing_popup = document.createElement('div');
        this.label_editing_popup.classList.add("label-popup");
        this.label_editing_popup.style.left = `${x}px`;
        this.label_editing_popup.style.top = `${y + 50}px`;

        let text_area = document.createElement("div");
        text_area.classList.add("text");

        let label_class = document.createElement("p");
        label_class.innerHTML = `Class: ${label.classname}`;
        let label_set_name = document.createElement("p");
        label_set_name.innerHTML = `Label Set: ${label.label_set}`;

        let label_coords = document.createElement("p");
        label_coords.innerHTML = `Coords: (${label.xmin}, ${label.ymin}) (${label.xmax}, ${label.ymax})`;

        text_area.appendChild(label_class);
        text_area.appendChild(label_set_name);
        text_area.appendChild(label_coords);


        let buttons_area = document.createElement("div");
        buttons_area.classList.add("buttons");

        /** @type {HTMLButtonElement} */
        let label_save_button = document.createElement("button");
        label_save_button.textContent = "Save";
        label_save_button.onclick = (event) => {
            console.log(this.target_label_set, this.current_image_set, this.current_image_id);
            this.server.setLabel(this.target_label_set, this.current_image_set, this.current_image_id, label);
            this.remove_label_editing_popup();

        };

        /** @type {HTMLButtonElement} */
        let label_delete_button = document.createElement("button");
        label_delete_button.textContent = "Delete";
        label_delete_button.classList.add("dangerous-button");
        label_delete_button.onclick = (event) => {
            //this.labels.splice(label_index, 1);
            if (this.target_label_set == null) {
                alert("Specify target label set.");
                return;
            }
            this.server.deleteLabel(this.target_label_set, this.current_image_set, this.current_image_id, label);
            this.remove_label_editing_popup();
        }

        /** @type {HTMLButtonElement} */
        let label_cancel_button = document.createElement("button");
        label_cancel_button.textContent = "Cancel";
        label_cancel_button.onclick = (event) => {
            this.remove_label_editing_popup();
        }

        buttons_area.appendChild(label_save_button);
        buttons_area.appendChild(label_cancel_button);
        buttons_area.appendChild(label_delete_button);

        this.label_editing_popup.appendChild(text_area);
        this.label_editing_popup.appendChild(buttons_area);
        
        this.canvas.parentElement.appendChild(this.label_editing_popup);

    }

    _handleEventWritingLabel(event) {
        if (event.key == 'Escape') {
            this.class_input.style.visibility = 'hidden';
            this.class_input.blur();
            this.state = this.states.NEUTRAL;
        }
        else if (event.key == 'Enter') {
            let classname = this.class_input.value;
            let [x0, y0] = this.fromCanvasCoordinates(this.box[0], this.box[1]);
            let [x1, y1] = this.fromCanvasCoordinates(this.box[2], this.box[3]);
            let new_label = {
                label_set: `${this.target_label_set} -- unsaved`,
                classname: classname, 
                xmin: x0, 
                ymin: y0,
                xmax: x1, 
                ymax: y1
            };


            this.labels.push(new_label);
            this.state = this.states.NEUTRAL;
            this.class_input.style.visibility = "hidden";
            this.class_input.blur();
            this.update();
        }
    }
    _handleEventBoxStart(event) {
        if (event.type == 'mousedown') {
            this.state = this.states.DRAWING_BOX;
            this.box = [event.offsetX, event.offsetY, event.offsetX, event.offsetY];
            this.canvas.addEventListener('mousemove', this);
        }
    }
    _handleEventBoxDraw(event) {
        if (event.type == 'mousemove') {
            this.box[2]= event.offsetX;
            this.box[3] = event.offsetY;
            this.update();
        }
        else if (event.type == 'mouseup') {
            this.class_input.style.left = `${(this.box[0] + this.box[2])/2}px`;
            this.class_input.style.top = `${(this.box[1] + this.box[3])/2}px`;
            this.class_input.style.visibility = "visible";
            this.class_input.focus();

            this.canvas.style.cursor = 'auto';
            this.state = this.states.WRITING_LABEL;
            this.canvas.removeEventListener('mousemove', this);
            this.update();

        }
        else {
            this.state = this.states.NEUTRAL;
            this.canvas.style.cursor = 'auto';
            this.canvas.removeEventListener('mousemove', this);
            this.update();

        }
    }
    enterDrawBoxMode() {
        this.state = this.states.STARTING_BOX;
        this.canvas.style.cursor = 'se-resize';
    }

    set_labels(labels) {
        this.labels = labels;
    }
    clear_labels() {
        this.labels = [];
        this.update();

    }

    get_labels() {
        return this.labels;
    }

    update() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (this.label_editing_popup) {
            this.remove_label_editing_popup();
        }

        for (let box_label of this.box_labels) {
            box_label.remove();
        }
        this.box_labels = [];

        let scale = this.display_width / this.image.width;
        this.display_height = scale * this.image.height;

        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = Math.max(this.display_height, window.innerHeight);
        this.context.drawImage(this.image, 0, 0, this.display_width, this.display_height);

        if (this.state == this.states.DRAWING_BOX || this.state == this.states.WRITING_LABEL) {
            this.context.lineWidth = 2;
            this.context.setLineDash([5, 5]);

            let box_width = this.box[2] - this.box[0];
            let box_height = this.box[3] - this.box[1];
            this.context.strokeRect(this.box[0], this.box[1], box_width, box_height);
            this.context.setLineDash([]);
        }


        //Prevent the lines from crossing by drawing the highest boxes first
        this.labels.sort((a, b) => (a.ymin > b.ymin));


        let text_offset = 50;
        
        for (let label_index = 0; label_index < this.labels.length; label_index++) {
            let label = this.labels[label_index];
            if (!(label.classname in this.class_color_key)) {
                this.class_color_key[label.classname] = this.box_colors.pop();
            }

            this.context.lineWidth = 2;
            this.context.setLineDash([]);
            this.context.strokeStyle = this.class_color_key[label.classname];
            let [xmin_canvas, ymin_canvas] = this.toCanvasCoordinates(label.xmin, label.ymin);
            let [xmax_canvas, ymax_canvas] = this.toCanvasCoordinates(label.xmax, label.ymax);
            this.context.strokeRect(xmin_canvas, ymin_canvas, xmax_canvas-xmin_canvas, ymax_canvas-ymin_canvas);

            this.context.moveTo(xmax_canvas, ymin_canvas);
            this.context.lineTo(this.display_width + 40, text_offset);
            this.context.setLineDash([5, 5]);
            //this.context.strokeStyle = this.class_color_key[classname];

            let text_xmin = this.display_width + 40;
            let text_ymin = text_offset + 5;

            this.context.stroke();
            this.context.setLineDash([]);

            let box_label = document.createElement("label");
            box_label.classList.add('box-label');
            box_label.style.position = 'absolute';
            box_label.innerHTML = `${label.classname} (${label.label_set})`;
            box_label.style.left = `${text_xmin}px`;
            box_label.style.top = `${text_ymin}px`;
            box_label.addEventListener('click', this);
            this.canvas.parentElement.appendChild(box_label);
            this.box_labels.push(box_label);

            text_offset += 50;
        }

    }
        
}

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

var current_image = new Image();
//current_image.addEventListener('load', () => label_editor_canvas.update());


/** @type {HTMLCanvasElement} */
var canvas = document.getElementById("canvas")

var label_editor_canvas = new LabelEditorCanvas(canvas, current_image, server);

/** @type {HTMLButtonElement} */
var refreshButton = document.getElementById("refresh");
refreshButton.addEventListener('click', () => refreshCurrentImage);

/** @type {HTMLButtonElement} */
var clear_button = document.getElementById("clear");
clear_button.addEventListener('click', () => label_editor_canvas.clear_labels());


/** @type {HTMLButtonElement} */
var draw_box_button = document.getElementById("draw_box");
draw_box_button.addEventListener('click', () => label_editor_canvas.enterDrawBoxMode());


/** @type {HTMLSelectElement} */
var image_set_selector = document.getElementById("image_set_select");
image_set_selector.addEventListener('change', updateImageSelector);

///** @type {HTMLSelectElement} */
//var source_label_set_selector = document.getElementById("source_label_set_select");
var source_label_set_selector = new CheckBoxList(document.getElementById("source_label_set_select"),
    "Source Label Sets", refreshCurrentImage, true);
var source_label_sets = [];

/** @type {HTMLInputElement} */
var target_label_set_input = document.getElementById("target_label_set");
target_label_set_input.onchange = (event) => {
    label_editor_canvas.target_label_set = target_label_set_input.value;
};

/** @type {HTMLInputElement} */
var class_input = document.getElementById("class_input");

/** @type {HTMLButtonElement} */
var save_button = document.getElementById("save");
save_button.addEventListener('click', saveLabels);


/** @type {HTMLSelectElement} */
var image_selector = document.getElementById("image_id_select");
image_selector.addEventListener('change', refreshCurrentImage);

var displayed_image_ids = [];
var current_image_set = null;
var current_image_id = null;

var current_image_labels = [];
var labels_buffer = [];



await refreshInterface();

if (sessionStorage.getItem('image_set') != null) {
    image_set_selector.value = sessionStorage.getItem('image_set');

}



async function refreshInterface() {
    await setLoginStatus();

    let image_sets = await server.getImageSets();
    updateSelector(image_set_selector, image_sets);

    let label_sets = await server.getLabelSets();
    for (let label_set of label_sets) {
        if (source_label_set_selector.has_item(label_set)) continue;
        source_label_set_selector.add_item(label_set);
    }

    updateImageSelector();
    refreshCurrentImage();
    label_editor_canvas.update();
}

async function saveLabel(label) {
    server.setLabel(target_label_set_input.value, current_image_set, current_image_id, label);
}

async function saveLabels() {
    let new_labels = label_editor_canvas.get_labels();
    for (let label of new_labels) {
        if (target_label_set_input.value == '') {
            alert('Enter a target label set');
            return;
        }

        label.label_set = target_label_set_input.value;
        server.setLabel(target_label_set_input.value, current_image_set, current_image_id, label);
    }

}




async function refreshCurrentImage() {
    current_image_id = displayed_image_ids[image_selector.selectedIndex];
    current_image_set = image_set_selector.value;

    //un-highlight the previously selected image Id, and highlight the new one
    let old_option = image_selector.querySelector("option[selected]");
    if (old_option) {
        old_option.removeAttribute("selected");
    }
    let new_option = image_selector.options[image_selector.selectedIndex];
    if (new_option != null) {
        new_option.setAttribute("selected", "true");
    }
    
    let image_blob = await server.getImage(current_image_set, current_image_id);

    let image_url = URL.createObjectURL(image_blob);
    current_image.src = image_url;

    let labels = await server.getImageLabels(current_image_set, current_image_id);

    labels = labels.filter((label) => source_label_set_selector.item_selected(label.label_set));

    label_editor_canvas.set_labels(labels);
    label_editor_canvas.current_image_id = current_image_id;
    label_editor_canvas.current_image_set = current_image_set;
    label_editor_canvas.target_label_set = target_label_set_input.value;
    label_editor_canvas.update();

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
    sessionStorage.setItem('image_set', image_set);
    
    displayed_image_ids = await server.getImageIds(image_set);
    let image_names = [];
    for (let i = 0; i < displayed_image_ids.length; i++) {
        let image_id = displayed_image_ids[i];
        let date = image_id[1];
        let image_num = image_id.slice(2);
        let image_name = `${i} ${date.toLocaleString()} ${image_num}`;
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
