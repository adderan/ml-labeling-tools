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
        console.log(success, result, content_type);

        let image_sets = idb.flattenToLists(result["_image_set"]);

        return image_sets;

    }

    async get_label_sets() {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_label_sets"]
        );
        let label_sets = idb.flattenToLists(result);
        return label_sets;
    }

    async get_image_labels(label_set, image_id) {

    }

    async get_image(image_set, image_id) {
        console.log(image_id);
        let [success, result, content_type] = await this.execute_get_blob_query(
            [INTERFACE, "get_image"],
            {
                "_image_set": image_set,
                "_image_id": image_id
            }
        )
        //let idbBlob = new idb.Blob();
        //idbBlob.parseFromBlobStructure(result);
        //console.log(idbBlob);
        //let blob = new Blob(idbBlob.v, {type: idbBlob.contentType});

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