import {MLServer} from "./MLServer.js";
import 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
import {NavBar, ServerLoginPane} from "./components.js";


let server = new MLServer(null, null, null, null);
let login_pane = document.querySelector('#server-login-pane');
login_pane.server = server;
login_pane.loadCredentials();


let navbar = document.querySelector('my-navbar');
navbar.credentials_button.onclick = (event) => {
    login_pane.show();

};

//// ** @type {HTMLCanvasElement} */
let canvas = document.getElementById("chart");
let chart = null;



////** @type {HTMLSelectElement} */
let model_select_box = document.getElementById('model-select');
let model_ids = await server.getModels();
model_ids.map((model_id) => model_select_box.options.add(new Option(model_id, model_id)));
if (sessionStorage.getItem("selected_model")) {
    model_select_box.selectedIndex = sessionStorage.getItem("selected_model");

}
model_select_box.onchange = (event) => {
    plot_metrics();
    sessionStorage.setItem("selected_model", model_select_box.selectedIndex);

};

Chart.defaults.font.size = 20;
model_select_box.dispatchEvent(new Event('change'));

async function plot_metrics() {
    let model_id = model_ids[model_select_box.selectedIndex];
    let metrics = await server.getModelMetrics(model_id);

    let datasets = [];
    for (let metric_name of Object.keys(metrics[0])) {
        let dataset = {};
        dataset.label = metric_name;
        dataset.data = Object.keys(metrics).map((epoch) => metrics[epoch][metric_name]);
        dataset.borderWidth = 4;
        console.log(dataset);
        datasets.push(dataset);
    }
    if (chart) {
        chart.destroy();
    }
    chart = new Chart(canvas, {
        type: 'line',
        data: {
            labels: Object.keys(metrics),
            datasets: datasets
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true
                },
                x: {
                    title: {
                        display: true,
                        text: 'Epoch'
                    }

                }
            }
        }
    });

}

