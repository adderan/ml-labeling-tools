export class NavBar extends HTMLElement {

    constructor() {
        super();
        this.innerHTML = `
            <nav>
                <ul>
                    <li><a href="labeling.html">Labeling</a></li>
                    <li><a href="">Clustering</a></li>
                    <li><a href="models.html">Models</a></li>
                    <li><a href="inference.html">Inference</a></li>
                    <li><label id="connection_status">Not logged in.</label></li>
                    <li><button id="credentials-button" class="login-button">Server Credentials</button></li>
                </ul>

            </nav>
        `;
        this.credentials_button = this.querySelector('#credentials-button');

    }
}

customElements.define('my-navbar', NavBar);

export class ServerLoginPane extends HTMLElement {
    constructor() {
        super();
        this.server = null;

        this.content_div = document.createElement('div');
        this.content_div.classList.add('content', 'animate');
        this.appendChild(this.content_div);

        let server_label = document.createElement("label");
        server_label.textContent = "Server:";
        this.server_field = document.createElement('input');
        server_label.appendChild(this.server_field);
        this.content_div.appendChild(server_label);

        let username_label = document.createElement('label');
        username_label.textContent = "Username:";
        this.username_field = document.createElement('input');
        username_label.appendChild(this.username_field);
        this.content_div.appendChild(username_label);

        let password_label = document.createElement('label');
        password_label.textContent = "Password:";
        this.password_field = document.createElement('input');
        password_label.appendChild(this.password_field);
        this.content_div.appendChild(password_label);

        
        let button_area = document.createElement('div');
        button_area.classList.add('button-area');
        this.connect_button = document.createElement('button');
        this.connect_button.textContent = "Connect";

        this.connect_button.onclick = (event) => {
            this.saveCredentials();
            this.hide();
        };
        button_area.appendChild(this.connect_button);

        this.cancel_button = document.createElement('button');
        this.cancel_button.classList.add('cancel-button')
        this.cancel_button.textContent = "Cancel";
        this.cancel_button.onclick = (event) => {
            this.hide();

        };
        button_area.appendChild(this.cancel_button);

        this.content_div.appendChild(button_area);

    }


    saveCredentials() {
        let server_url = this.server_field.value;
        let db = "ai/labels";
        let username = this.username_field.value;
        let password = this.password_field.value;

        sessionStorage.setItem('server_url', server_url);
        sessionStorage.setItem('db', db);
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('password', password);
        if (this.server) {
            this.server.set_credentials(server_url, db, username, password);
        }
        else {
            console.warn("No server attached to login pane, not logging in");
        }
    }
    loadCredentials() {
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
        this.style.display = 'block';
    }
    hide() {
        this.style.display = 'none';
    }
}
customElements.define('server-login-pane', ServerLoginPane);
