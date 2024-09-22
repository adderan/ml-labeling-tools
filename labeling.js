import {MLServer} from "./MLServer.js";
import { CheckBoxList } from "./js-ui-elements/CheckboxList.js";
import {NavBar, ServerLoginPane, ImageUploadPane} from "./components.js";

class LabelEditor {
    constructor(server) {
        this.server = server;

        this.image = new Image();
        this.image.onload = () => {
            this.update();
        }
        this.image_ids = [];
        this.image_sets = [];
        this.target_label_set = null;
        this.labels = [];

        this.label_sets = [];
        this.enabled_label_sets = [];

        /** @type {HTMLCanvasElement} */
        this.canvas = document.getElementById("canvas")

        /** @type {CanvasRenderingContext2D} */
        this.context = this.canvas.getContext("2d");



        /** @type {HTMLButtonElement} */
        this.clear_button = document.getElementById("clear");
        this.clear_button.addEventListener('click', () => this.clear_labels());


        /** @type {HTMLButtonElement} */
        this.draw_box_button = document.getElementById("draw_box");
        this.draw_box_button.addEventListener('click', () => this.enterDrawBoxMode());


        /** @type {HTMLSelectElement} */
        this.image_set_selector = document.getElementById("image_set_select");
        this.image_set_selector.addEventListener('change', (event) => {
            this.updateImageSet();
        });

        this.server.getImageSets().then((image_sets) => {
            this.image_sets = image_sets;
            this.image_sets.map(
                (image_set) => {
                    let option = new Option(image_set, image_set);
                    this.image_set_selector.options.add(option);
                }
            );
        }).then(() => {
            this.image_set_selector.dispatchEvent(new Event('change'));

        });

        /** @type {CheckBoxList} */
        this.source_label_set_selector = document.getElementById('source_label_set_select');
        this.source_label_set_selector.onchange = () => {
            this.enabled_label_sets = this.source_label_set_selector.get_selected_items();
            this.updateLabels();
        };


        this.server.getLabelSets().then((label_sets) => {
            this.label_sets = label_sets;
            this.label_sets.map(
                (label_set) => {
                    this.source_label_set_selector.add_item(label_set);
                }
            );
            this.source_label_set_selector.dispatchEvent(new Event('change'));
        });


        /** @type {HTMLInputElement} */
        this.target_label_set_input = document.getElementById("target_label_set");
        this.target_label_set_input.onchange = (event) => {
            this.target_label_set = this.target_label_set_input.value;
        };
        this.target_label_set_input.dispatchEvent(new Event('change'));

        /** @type {HTMLInputElement} */
        this.class_input = document.getElementById("class_input");

        /** @type {HTMLButtonElement} */
        this.save_button = document.getElementById("save");
        this.save_button.addEventListener('click', this.saveLabels);


        /** @type {ImageSelector} */
        this.image_selector = document.getElementById("image-selector");
        this.image_selector.onchange = () => {
            let selected_index = this.image_selector.selected_index;
            this.image_id = this.image_ids[selected_index];
            this.setImage(this.image_id);

        };


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
        this.canvas.addEventListener('wheel', this);
    }

    async updateImageSet() {
        this.image_set = this.image_sets[this.image_set_selector.selectedIndex];

        this.image_ids = await this.server.getImageIds(this.image_set);
        this.image_selector.set_image_ids(this.image_ids);

    }

    async setImage(image_id) {
        this.image_id = image_id;
        let image_blob = await this.server.getImage(this.image_set, this.image_id);
        let image_url = URL.createObjectURL(image_blob);
        this.image.src = image_url;
        this.updateLabels();
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

    setNeutralState() {
        this.state = this.states.NEUTRAL;
        this.canvas.style.cursor = 'auto';
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
                    this.display_label_editing_popup(event, i);
                }
            }
        }
    
        else if (event.type == 'wheel') {
            let new_display_width = this.display_width + event.wheelDeltaY;
            event.preventDefault();
            this.zoom(new_display_width);

        }
    }

    zoom(new_display_width, animation_length=300.0) {
        let start = Date.now();
        let step = (new_display_width - this.display_width)/animation_length;
        let zoom_fn = (t1) => {
            let t2 = Date.now();
            if (t2 < start + animation_length) {
                this.display_width += step * (t2 - t1);
                this.update();
                window.requestAnimationFrame(() => {zoom_fn(t2)});
            }
        }

        window.requestAnimationFrame(() => {zoom_fn(start);});
    }

    remove_label_editing_popup() {
        this.label_editing_popup.remove();
        this.label_editing_popup = null;
        this.update();

    }

    display_label_editing_popup(event, label_index) {
        let x = event.offsetX + event.target.offsetLeft;
        let y = event.offsetY + event.target.offsetTop;
        console.log(x, y);
        let label = this.labels[label_index];
        if (this.label_editing_popup != null) return;
        this.label_editing_popup = document.createElement('dialog');
        this.label_editing_popup.innerHTML = `
            <div class='text'>
                <p>Class: ${label.classname}</p>
                <p>Label Set: ${label.label_set}</p>
                <p>Coords: ${label.xmin}, ${label.ymin} -- ${label.xmax},${label.ymax}</p>
            </div>
            <div class='buttons'>
                <button id='save'>Save</button>
                <button id='cancel'>Cancel</button>
                <button id='delete' class='dangerous-button'>Delete</button>
            </div>

        `;
        this.label_editing_popup.classList.add("label-popup");
        this.label_editing_popup.style.left = `${x-400}px`;
        this.label_editing_popup.style.top = `${y+20}px`;

        let label_save_button = this.label_editing_popup.querySelector('#save');
        let label_cancel_button = this.label_editing_popup.querySelector('#cancel');
        let label_delete_button = this.label_editing_popup.querySelector('#delete');

        label_save_button.onclick = (event) => {
            this.server.setLabel(this.target_label_set, this.image_set, this.image_id, label);
            this.remove_label_editing_popup();
            this.updateLabels();

        };

        label_delete_button.onclick = (event) => {
            if (this.target_label_set == null) {
                alert("Specify target label set.");
                return;
            }
            this.server.deleteLabel(this.target_label_set, this.image_set, this.image_id, label);
            this.remove_label_editing_popup();
            this.updateLabels();
        }

        label_cancel_button.onclick = (event) => {
            this.remove_label_editing_popup();
        }

        this.canvas.parentElement.appendChild(this.label_editing_popup);
        this.label_editing_popup.show();

    }

    _handleEventWritingLabel(event) {
        if (event.key == 'Escape') {
            this.class_input.style.visibility = 'hidden';
            this.class_input.blur();
            this.setNeutralState();
        }
        else if (event.key == 'Enter') {
            let classname = this.class_input.value;
            let [x0, y0] = this.fromCanvasCoordinates(this.box[0], this.box[1]);
            let [x1, y1] = this.fromCanvasCoordinates(this.box[2], this.box[3]);
            let new_label = {
                label_set: `${this.target_label_set} -- unsaved`,
                classname: classname, 
                xmin: Math.round(x0), 
                ymin: Math.round(y0),
                xmax: Math.round(x1), 
                ymax: Math.round(y1)
            };


            this.labels.push(new_label);
            this.setNeutralState();
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
            this.canvas.removeEventListener('mousemove', this);
            this.update();

        }
    }
    enterDrawBoxMode() {
        this.state = this.states.STARTING_BOX;
        this.canvas.style.cursor = 'se-resize';
    }

    async updateLabels() {
        this.labels = await this.server.getImageLabels(this.image_set, this.image_id);
        console.log(this.enabled_label_sets);
        this.labels = this.labels.filter((label) => this.enabled_label_sets.includes(label.label_set));
        this.update();
    }

    clearLabels() {
        this.labels = [];
        this.update();

    }

    async saveLabels() {
        for (let label of this.labels) {
            if (this.target_label_set == '') {
                alert('Enter a target label set');
                return;
            }

            label.label_set = this.target_label_set;
            server.setLabel(this.target_label_set, this.image_set, this.image_id, label);
        }

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

        let scale = Math.round(this.display_width) / this.image.width;
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

class ImageSelector extends HTMLElement {
    constructor() {
        super();

        this.image_id_list = document.createElement("ol");

        this.image_id_list.style.overflow_y = "scroll";
        this.appendChild(this.image_id_list);

        this.selected_index = null;
        this.image_ids = [];
        this.image_names = [];

        this.image_id_list.addEventListener('click', this);
        this.image_id_list.addEventListener('focusout', this);
        this.image_id_list.addEventListener('keydown', this);
        this.image_id_list.setAttribute('tabindex', -1);

    }

    get_image_name(image_id) {
        let date = image_id[1];
        let image_num = image_id.slice(2);
        let image_name = `${date.toLocaleString()} ${image_num}`;
        return image_name;

    }

    set_image_ids(image_ids) {

        this.image_ids = image_ids;

        this.items = [];
        this.selected_item = 0;
        this.image_id_list.innerHTML = '';

        for (let index = 0; index < image_ids.length; index++) { 
            let image_name = this.get_image_name(image_ids[index]);
            let item = document.createElement("li");
            item.textContent = `Image ${index} - ${image_name}`;
            item.setAttribute('list_index', index);

            this.image_id_list.appendChild(item);
            this.items.push(item);
        }
        if (this.items.length > 0) {
            this.set_selected_index(0);
        }
    }

    set_selected_index(index) {
        if (this.selected_index != null && this.items[this.selected_index]) {
            this.items[this.selected_index].removeAttribute('selected');
        }
        this.selected_index = index;
        this.items[index].setAttribute('selected', 'selected');
        this.dispatchEvent(new Event('change'));
        //this.items[this.selected_index].scrollIntoView({behavior: "smooth", block: "center"});
        //window.scrollTo(0,0);

    }
    handleEvent(event) {
        if (event.type == 'click') {
            let item = event.target;
            let index = parseInt(item.getAttribute('list_index'));
            this.set_selected_index(index);

        }
        else if (event.type == 'focusout') {

        }
        else if (event.type == 'keydown') {
            if (event.key == 'ArrowUp') {
                if (this.selected_index <= 0) return;
                this.set_selected_index(this.selected_index - 1);
            }
            else if (event.key == 'ArrowDown') {
                if (this.selected_index >= this.items.length) return;
                this.set_selected_index(this.selected_index + 1);

            }
        }

    }
    get_selected_image() {
        return this.image_ids[this.selected_index];
    }

}

customElements.define('image-selector', ImageSelector);


let server = new MLServer(null, null, null);


///** @type {ServerLoginPane} */
//let login_pane = document.querySelector('#server-login-pane');
//login_pane.server = server;
//login_pane.loadCredentials();

/** @type {NavBar} */
const navbar = document.querySelector('my-navbar');
navbar.setServer(server);


let label_editor = new LabelEditor(server);

const image_upload_button = document.querySelector('#upload_image');
image_upload_button.addEventListener('click', 
    () => {
        const upload_pane = document.createElement('dialog', {is: 'image-upload-pane'});
        document.body.appendChild(upload_pane);
        upload_pane.showModal();

    }
);




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


