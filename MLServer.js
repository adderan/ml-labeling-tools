import {idb} from "./infinitydb/src/javascript/infinitydb_access.js";

const INTERFACE = "com.infinitydb.ai";

export class ServerLoginPane {
    constructor(server) {
        this.server = server;
        this.root_div = document.createElement('div');
        this.root_div.classList.add('modal');

        this.content_div = document.createElement('div');
        this.content_div.classList.add('modal-content', 'animate');
        this.root_div.appendChild(this.content_div);

        let server_label = document.createElement("label");
        server_label.textContent = "Server:";
        this.server_field = document.createElement('input');
        this.server_field.classList.add('modal-input');
        server_label.appendChild(this.server_field);
        this.content_div.appendChild(server_label);

        let username_label = document.createElement('label');
        username_label.textContent = "Username:";
        this.username_field = document.createElement('input');
        this.username_field.classList.add('modal-input');
        username_label.appendChild(this.username_field);
        this.content_div.appendChild(username_label);

        let password_label = document.createElement('label');
        password_label.textContent = "Password:";
        this.password_field = document.createElement('input');
        this.password_field.classList.add('modal-input');
        password_label.appendChild(this.password_field);
        this.content_div.appendChild(password_label);

        
        let button_area = document.createElement('div');
        button_area.classList.add('modal-button-area');
        this.connect_button = document.createElement('button');
        this.connect_button.textContent = "Connect";
        this.connect_button.classList.add('modal-button');

        this.connect_button.onclick = (event) => {
            this.save_credentials();
            this.hide();
        };
        button_area.appendChild(this.connect_button);

        this.cancel_button = document.createElement('button');
        this.cancel_button.textContent = "Cancel";
        this.cancel_button.classList.add('modal-button', 'cancelbtn');
        this.cancel_button.onclick = (event) => {
            this.hide();

        };
        button_area.appendChild(this.cancel_button);

        this.content_div.appendChild(button_area);

        document.body.appendChild(this.root_div);

        this.load_credentials();

    }
    save_credentials() {
        let server_url = this.server_field.value;
        let db = "ai/labels";
        let username = this.username_field.value;
        let password = this.password_field.value;

        sessionStorage.setItem('server_url', server_url);
        sessionStorage.setItem('db', db);
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('password', password);
        this.server.set_credentials(server_url, db, username, password);
    }
    load_credentials() {
        let server_url = sessionStorage.getItem('server_url');
        let db = sessionStorage.getItem('db');
        let username = sessionStorage.getItem('username');
        let password = sessionStorage.getItem('password');
        this.server_field.value = server_url;
        this.username_field.value = username;
        this.password_field.value = password;
        this.server.set_credentials(server_url, db, username, password);
    }
    show() {
        this.root_div.style.display = 'block';
    }
    hide() {
        this.root_div.style.display = 'none';
    }
}
export class MLServer extends idb.Accessor {
    constructor(server_url, db, username, password) {
        super(server_url, db, username, password);

    }

    async getImageSets() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_image_sets"]
        );

        let image_sets = idb.flattenToLists(result["_image_set"]);

        return image_sets;

    }

    async getLabelSets() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_label_sets"]
        );
        let label_sets = idb.flattenToLists(result["_label_set"]);
        return label_sets;
    }
    async getModels() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_model_names"]
        );
        //let model_names = idb.flattenToLists(result);
        let model_names = Object.keys(result["_model_id"]);

        return model_names;
    }
    async getModelMetrics(model_id) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_model_metrics"],
            {
                "_model_id": model_id
            }
        );

        let metrics = {};
        for (let [epoch, epoch_metrics] of Object.entries(result["_Epoch"])) {
            epoch = idb.unQuote(epoch);
            epoch_metrics = epoch_metrics["_metrics"];
            let epoch_metrics_unquoted = {};
            for (let [metric_name, metric] of Object.entries(epoch_metrics)) {
                epoch_metrics_unquoted[idb.unQuote(metric_name)] = metric;
            }
            metrics[epoch] = epoch_metrics_unquoted;
        }
        return metrics;
    }
    async setLabel(label_set, image_set, image_id, label) {
        //image_id = idb.unflattenFromLists(image_id.slice(1));
        console.log(image_set);
        console.log(image_id);
        label = [
            label.classname, 
            Math.round(label.xmin), 
            Math.round(label.ymin), 
            Math.round(label.xmax), 
            Math.round(label.ymax)];
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "set_label"],
            {
                "_label_set": label_set,
                "_image_id": image_id,
                "_image_set": image_set,
                "_label": label
            }
        );
    }
    async deleteLabel(label_set, image_set, image_id, label) {
        label = [label.classname, label.xmin, label.ymin, label.xmax, label.ymax];
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "delete_label"],
            {
                "_label_set": label_set,
                "_image_set": image_set,
                "_image_id": image_id,
                "_label": label
            }
        )
    }

    async getImageLabels(image_set, image_id) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_labels_by_image_id"],
            {
                "_image_set": image_set,
                "_image_id": image_id
            }

        )

        let labels = idb.flattenToLists(result);
        let labels2 = [];
        for (let label of labels) {
            let [label_set, classname, x0, y0, x1, y1] = label;
            let xmin = Math.min(x0, x1);
            let xmax = Math.max(x0, x1);
            let ymin = Math.min(y0, y1);
            let ymax = Math.max(y0, y1);
            labels2.push({
                'label_set': label_set, 
                'classname': classname, 
                'xmin': xmin,
                'ymin': ymin, 
                'xmax': xmax,
                'ymax': ymax
            });
        }
        return labels2;
    }

    async getImage(image_set, image_id) {
        let [success, result, content_type] = await this.execute_get_blob_query(
            [INTERFACE, "get_image"],
            {
                "_image_set": image_set,
                "_image_id": image_id
            }
        )

        return result;
    }
    async getImageIds(image_set) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_image_ids"],
            {"_image_set": image_set}
        )
        let image_ids = result["_image_id"];
        image_ids = idb.flattenToLists(image_ids);

        return image_ids;
    }
}