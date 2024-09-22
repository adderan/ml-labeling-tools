import {idb} from "./infinitydb/src/javascript/infinitydb_access.js";

const INTERFACE = "com.infinitydb.ai";

const INFERENCE = new idb.Class("Inference");

export class MLServer extends idb.Accessor {
    constructor(server_url, username, password) {
        server_url = server_url + "/infinitydb/data";
        super(server_url, "ai/labels", username, password);

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
    async getModel(model_id) {
        let [success, result, content_type] = await this.execute_get_blob_query(
            [INTERFACE, "get_model"],
            {
                "_model_id": model_id
            }
        );
        return result;
    }
    async getFeatureVectorsJson(model_id) {
        const prefix = [INFERENCE, model_id];
        let [success, result, content_type] = await this.get_json(prefix);
        console.log(result);
        let feature_vectors = idb.flattenToLists(result);
        return feature_vectors;
    }
    async getFeatureVectors(model_id) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_feature_vectors"],
            {
                "_model_id": model_id
            }
        );
        const feature_ids = idb.flattenToLists(result["_feature_id"]);
        let features = idb.flattenToLists(result["_features"]);
        features = features.map((feature_str) => feature_str.split(" "));
        return feature_ids, features;
    }
    async getFeatureVector(model_id, image_set, image_id, clip_num) {
        let [success, result, content_type] = await this.execute_query(
            [INTERFACE, "get_feature_vector"],
            {
                "_model_id": model_id,
                "_image_set": image_set,
                "_image_id": image_id,
                "_clip_num": new idb.Long(clip_num)
            }
        )
        //const features = result["_features"];
        //return features;
        return result;

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