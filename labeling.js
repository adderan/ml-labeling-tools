import {IdbAccessor, flatten_to_list, unflatten_from_lists} from "./intelliwaterai/infinitydb/access.js"
const INTERFACE = "com.boilerbay.genomics"


var server = null;


window.onload = function() {

}

function show_loginpane() {
    document.getElementById('loginpane').style.display='block';
}
function hide_loginpane() {
    document.getElementById('loginpane').style.display='none';
}

function logout_server() {
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

function set_disconnected_status() {
    document.getElementById("connection_status").innerHTML = "Must login first."
}


async function get_transcripts_in_range(genome, chromosome, start, end) {
    let response = await server.do_query([INTERFACE, "get_transcripts_in_range"],
        {
            "_genome": genome,
            "_chromosome": chromosome,
            "_start": start, 
            "_end": end
        }
    );

    if (response == null || response.status != 200) {
        return null;
    }
    response = await response.json();
    let transcript_ids = flatten_to_list(response);
    console.log(transcript_ids);
    return transcript_ids;
    
}


window.onload = function() {
    let goButton = document.getElementById("go")
    goButton.addEventListener('click', go_to_position);

    let connectButton = document.getElementById('connect');
    connectButton.addEventListener('click', connect_server);

    let zoomInButton = document.getElementById("zoom_in");
    zoomInButton.addEventListener('click', zoom_in);
    let zoomOutButton = document.getElementById("zoom_out");
    zoomOutButton.addEventListener('click', zoom_out);

    if (sessionStorage.getItem('username') != null) {
        server = new IdbAccessor(sessionStorage.getItem('server_url'), 'boilerbay/genomics', sessionStorage.getItem('username'), sessionStorage.getItem('password'));
    }
    set_login_status();

    /** @type {HTMLCanvasElement} */
    var canvas = document.getElementById("canvas")

    browser = new Browser(canvas);
    browser.refresh_canvas();

    let refreshButton = document.getElementById("refresh");
    refreshButton.addEventListener('click', refresh_browser);

    let gene_sets = ['Ensembl', 'refGene'];
    let gene_sets_div = document.getElementById('gene_sets');
    browser.active_gene_set_boxes = {};
    for (let gene_set of gene_sets) {
        let gene_set_div = document.createElement('div');
        gene_set_div.style = 'display:inline; margin:10px;';
        let box = document.createElement('input');
        box.id = `${gene_set}_box`;
        box.setAttribute('type', 'checkbox');
        let box_label = document.createElement('label');
        box_label.htmlFor = `${gene_set}_box`;
        box_label.innerHTML = gene_set;
        box_label.style = "padding:8px;"
        box.checked = true;
        box.addEventListener('click', () => browser.refresh_canvas());
        gene_set_div.append(box_label);
        gene_set_div.append(box);
        gene_sets_div.append(gene_set_div);

        browser.active_gene_set_boxes[gene_set] = box;
    }


}


//Window Listeners

window.onresize = function() {
}


function roundRect(context, x, y, w, h, radius) {
    var r = x + w;
    var b = y + h;
    context.beginPath();
    context.strokeStyle="green";
    context.lineWidth="4";
    context.moveTo(x+radius, y);
    context.lineTo(r-radius, y);
    context.quadraticCurveTo(r, y, r, y+radius);
    context.lineTo(r, y+h-radius);
    context.quadraticCurveTo(r, b, r-radius, b);
    context.lineTo(x+radius, b);
    context.quadraticCurveTo(x, b, x, b-radius);
    context.lineTo(x, y+radius);
    context.quadraticCurveTo(x, y, x+radius, y);
    context.fill();
}