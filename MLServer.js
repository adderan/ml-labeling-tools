import {idb} from "./infinitydb/src/javascript/infinitydb_access.js";

const INTERFACE = "com.infinitydb.ai";

export class MLServer extends idb.Accessor {
    constructor(server_url, db, username, password) {
        super(server_url, db, username, password);

    }

    async get_image_sets() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_image_sets"]
        );

        let image_sets = idb.flattenToLists(result["_image_set"]);

        return image_sets;

    }

    async get_label_sets() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_label_sets"]
        );
        let label_sets = idb.flattenToLists(result["_label_set"]);
        return label_sets;
    }
    async set_label(label_set, image_set, image_id, label) {
        //image_id = idb.unflattenFromLists(image_id.slice(1));
        console.log(image_set);
        console.log(image_id);
        label = [label.classname, label.xmin, label.ymin, label.xmax, label.ymax];
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

    async get_image_labels(image_set, image_id) {
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

    async get_image(image_set, image_id) {
        let [success, result, content_type] = await this.execute_get_blob_query(
            [INTERFACE, "get_image"],
            {
                "_image_set": image_set,
                "_image_id": image_id
            }
        )

        return result;
    }
    async get_image_ids(image_set) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_image_ids"],
            {"_image_set": image_set}
        )
        let image_ids = result["_image_id"];
        image_ids = idb.flattenToLists(image_ids);

        return image_ids;
    }
}